"use client";

import { useState, useEffect, useRef } from "react";
import { useChatContext } from "./chat-provider";
import { KeyBackupWarning, EncryptionStatus } from "./key-backup-warning";
import { AttachmentUpload, AttachmentButton } from "./attachment-upload";
import { AttachmentDisplay } from "./attachment-display";
import * as sdk from "matrix-js-sdk";
import { MsgType } from "matrix-js-sdk/lib/@types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Video, Users, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { EncryptedFileInfo } from "@/lib/crypto/file-encryption";

interface ProjectChatProps {
  matrixRoomId: string;
  projectId: string;
  projectTitle: string;
  onStartVideoCall?: () => void;
}

interface EncryptedAttachment {
  url: string;
  info: EncryptedFileInfo;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  attachment?: EncryptedAttachment;
}

interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export function ProjectChat({
  matrixRoomId,
  projectId,
  projectTitle,
  onStartVideoCall,
}: ProjectChatProps) {
  const { client, isInitialized, isConnecting, error, initialize } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to parse attachment info from Matrix message content
  const parseAttachment = (content: sdk.IContent): EncryptedAttachment | undefined => {
    // Check for our custom encrypted attachment format
    if (content.msgtype === "m.file" && content.file?.url && content.file?.encryption) {
      return {
        url: content.file.url,
        info: content.file.encryption as EncryptedFileInfo,
      };
    }
    return undefined;
  };

  // Auto-initialize chat on mount
  useEffect(() => {
    if (!isInitialized && !isConnecting) {
      initialize();
    }
  }, [isInitialized, isConnecting, initialize]);

  // Load room, messages, and members
  useEffect(() => {
    if (!client || !isInitialized) return;

    const room = client.getRoom(matrixRoomId);
    if (!room) {
      setIsLoading(false);
      return;
    }

    // Check if room is encrypted
    setIsEncrypted(room.hasEncryptionStateEvent());

    // Load members
    const roomMembers = room.getJoinedMembers();
    setMembers(
      roomMembers.map((member) => ({
        userId: member.userId,
        displayName: member.name || member.userId,
        avatarUrl: member.getAvatarUrl(
          client.getHomeserverUrl(),
          40,
          40,
          "scale",
          false,
          false
        ),
      }))
    );

    // Load existing messages
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    const loadedMessages = events
      .filter((event) => event.getType() === "m.room.message")
      .map((event) => {
        const content = event.getContent();
        return {
          id: event.getId() || "",
          senderId: event.getSender() || "",
          senderName: room.getMember(event.getSender() || "")?.name || event.getSender() || "",
          content: content.body || "",
          timestamp: new Date(event.getTs()),
          isOwn: event.getSender() === client.getUserId(),
          attachment: parseAttachment(content),
        };
      });

    setMessages(loadedMessages);
    setIsLoading(false);

    // Mark room as read
    if (events.length > 0) {
      client.sendReadReceipt(events[events.length - 1]);
    }
  }, [client, isInitialized, matrixRoomId]);

  // Listen for new messages
  useEffect(() => {
    if (!client || !isInitialized) return;

    const handleTimeline = (
      event: sdk.MatrixEvent,
      room: sdk.Room | undefined,
      toStartOfTimeline?: boolean
    ) => {
      if (room?.roomId !== matrixRoomId) return;
      if (event.getType() !== "m.room.message") return;
      if (toStartOfTimeline) return;

      const content = event.getContent();
      const newMsg: Message = {
        id: event.getId() || "",
        senderId: event.getSender() || "",
        senderName: room.getMember(event.getSender() || "")?.name || event.getSender() || "",
        content: content.body || "",
        timestamp: new Date(event.getTs()),
        isOwn: event.getSender() === client.getUserId(),
        attachment: parseAttachment(content),
      };

      setMessages((prev) => [...prev, newMsg]);

      // Mark as read
      client.sendReadReceipt(event);
    };

    client.on(sdk.RoomEvent.Timeline, handleTimeline);

    return () => {
      client.off(sdk.RoomEvent.Timeline, handleTimeline);
    };
  }, [client, isInitialized, matrixRoomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!client || !newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      await client.sendMessage(matrixRoomId, {
        msgtype: MsgType.Text,
        body: content,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentUpload = async (url: string, info: EncryptedFileInfo) => {
    if (!client) return;

    setIsSending(true);
    setShowAttachmentUpload(false);

    try {
      // Send as m.file message with encrypted attachment info
      // Use a custom content structure that includes our encryption metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any = {
        msgtype: MsgType.File,
        body: info.filename,
        url, // Standard Matrix file URL field
        file: {
          url,
          encryption: info, // Our custom encryption info
        },
        info: {
          mimetype: info.mimetype,
          size: info.size,
        },
      };
      await client.sendMessage(matrixRoomId, content);
    } catch (err) {
      console.error("Failed to send attachment:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={initialize}>Retry Connection</Button>
      </div>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-black">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Link href={`/app`}>
              <Button variant="ghost" size="icon" className="text-gray-400 lg:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="font-semibold text-white">{projectTitle}</h2>
              <p className="text-sm text-gray-400">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EncryptionStatus isEncrypted={isEncrypted} />
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400"
              onClick={() => setShowMembers(!showMembers)}
            >
              <Users className="h-4 w-4" />
            </Button>
            {onStartVideoCall && (
              <Button variant="outline" size="sm" onClick={onStartVideoCall}>
                <Video className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
          </div>
        </div>

        {/* Key Backup Warning */}
        <div className="px-4 pt-4">
          <KeyBackupWarning />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {!message.isOwn && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-neutral-900 text-white text-xs">
                      {message.senderName?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`flex-1 ${message.isOwn ? "flex flex-col items-end" : ""}`}
                >
                  {!message.isOwn && (
                    <p className="text-sm text-gray-400 mb-1">{message.senderName}</p>
                  )}
                  <div className="max-w-[70%] space-y-2">
                    {message.attachment ? (
                      <AttachmentDisplay
                        url={message.attachment.url}
                        info={message.attachment.info}
                        isOwn={message.isOwn}
                      />
                    ) : (
                      <div
                        className={`p-3 rounded-lg ${
                          message.isOwn
                            ? "bg-blue-600 text-white"
                            : "bg-neutral-800 text-white"
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                      </div>
                    )}
                    <p
                      className={`text-xs ${
                        message.isOwn ? "text-right text-blue-200" : "text-gray-500"
                      }`}
                    >
                      {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Upload Panel */}
        {showAttachmentUpload && (
          <div className="p-4 border-t border-neutral-800">
            <AttachmentUpload
              onUploadComplete={handleAttachmentUpload}
              onCancel={() => setShowAttachmentUpload(false)}
              disabled={isSending}
            />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-neutral-800">
          <div className="flex gap-2">
            <AttachmentButton
              onClick={() => setShowAttachmentUpload(!showAttachmentUpload)}
              disabled={isSending}
            />
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-neutral-900 border-neutral-700 text-white"
              disabled={isSending}
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="w-64 border-l border-neutral-800 p-4 overflow-y-auto">
          <h3 className="font-semibold text-white mb-4">Members</h3>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-neutral-900 text-white text-xs">
                    {member.displayName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-300 truncate">
                  {member.displayName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
