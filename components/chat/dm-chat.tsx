"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChatContext } from "./chat-provider";
import * as sdk from "matrix-js-sdk";
import { MsgType } from "matrix-js-sdk/lib/@types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Lock, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface DMChatProps {
  matrixRoomId: string;
  otherUser: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
  };
  onStartVideoCall?: () => void;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

export function DMChat({ matrixRoomId, otherUser, onStartVideoCall }: DMChatProps) {
  const { client, isInitialized, isConnecting, error, initialize } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<sdk.Room | null>(null);

  // Auto-initialize chat on mount
  useEffect(() => {
    if (!isInitialized && !isConnecting) {
      initialize();
    }
  }, [isInitialized, isConnecting, initialize]);

  // Load room and messages
  useEffect(() => {
    if (!client || !isInitialized) return;

    const room = client.getRoom(matrixRoomId);
    if (!room) {
      setIsLoading(false);
      return;
    }

    roomRef.current = room;

    // Check if room is encrypted
    setIsEncrypted(room.hasEncryptionStateEvent());

    // Load existing messages
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    const loadedMessages = events
      .filter((event) => event.getType() === "m.room.message")
      .map((event) => ({
        id: event.getId() || "",
        senderId: event.getSender() || "",
        content: event.getContent().body || "",
        timestamp: new Date(event.getTs()),
        isOwn: event.getSender() === client.getUserId(),
      }));

    setMessages(loadedMessages);
    setIsLoading(false);

    // Mark room as read
    client.sendReadReceipt(events[events.length - 1]);
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

      const newMsg: Message = {
        id: event.getId() || "",
        senderId: event.getSender() || "",
        content: event.getContent().body || "",
        timestamp: new Date(event.getTs()),
        isOwn: event.getSender() === client.getUserId(),
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
      setNewMessage(content); // Restore message on failure
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
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href={`/u/${otherUser.handle}`}>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-neutral-900 text-white">
                {otherUser.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/u/${otherUser.handle}`} className="hover:underline">
              <h2 className="font-semibold text-white">{otherUser.name || "Anonymous"}</h2>
            </Link>
            <p className="text-sm text-gray-400">@{otherUser.handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEncrypted && (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <Lock className="h-4 w-4" />
              <span>Encrypted</span>
            </div>
          )}
          {onStartVideoCall && (
            <Button variant="outline" size="sm" onClick={onStartVideoCall}>
              <Video className="h-4 w-4 mr-2" />
              Video Call
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.isOwn
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-800 text-white"
                }`}
              >
                <p className="break-words">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.isOwn ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex gap-2">
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
  );
}
