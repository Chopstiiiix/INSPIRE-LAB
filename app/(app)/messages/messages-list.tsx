"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  matrixRoomId: string;
  otherUser: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
  };
  createdAt: Date;
}

interface MessagesListProps {
  conversations: Conversation[];
  currentUserId: string;
}

export function MessagesList({ conversations, currentUserId }: MessagesListProps) {
  const [search, setSearch] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      conv.otherUser.name?.toLowerCase().includes(searchLower) ||
      conv.otherUser.handle?.toLowerCase().includes(searchLower)
    );
  });

  if (conversations.length === 0) {
    return (
      <Card className="bg-black border-neutral-800 p-8 text-center">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No conversations yet</h3>
        <p className="text-gray-400">
          Visit a user's profile and click "Message" to start a conversation.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-black border-neutral-800 text-white"
        />
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No conversations found matching "{search}"
          </p>
        ) : (
          filteredConversations.map((conv) => (
            <Link key={conv.id} href={`/messages/${conv.id}`}>
              <Card className="bg-black border-neutral-800 p-4 hover:bg-neutral-900 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-neutral-900 text-white">
                      {conv.otherUser.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white truncate">
                        {conv.otherUser.name || "Anonymous"}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(conv.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">@{conv.otherUser.handle}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
