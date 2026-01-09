"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Conversation {
  id: string;
  matrixRoomId: string;
  otherUser: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
    roleTitle: string | null;
  };
  createdAt: Date;
}

interface InboxListProps {
  conversations: Conversation[];
  currentUserId: string;
}

export function InboxList({ conversations, currentUserId }: InboxListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.otherUser.name?.toLowerCase().includes(query) ||
      conv.otherUser.handle?.toLowerCase().includes(query)
    );
  });

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
        <p className="text-gray-400 max-w-sm">
          Start a conversation by visiting someone's profile and clicking the
          message button.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/explore")}
        >
          Explore People
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Conversation List */}
      <div className="space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations found
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dm/${conv.matrixRoomId}`}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <Avatar className="h-12 w-12">
                {conv.otherUser.avatar && (
                  <AvatarImage src={conv.otherUser.avatar} />
                )}
                <AvatarFallback className="bg-neutral-800 text-white">
                  {conv.otherUser.name?.[0] || conv.otherUser.handle?.[0] || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white truncate">
                    {conv.otherUser.name || conv.otherUser.handle}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatDistanceToNow(new Date(conv.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">
                  {conv.otherUser.roleTitle || `@${conv.otherUser.handle}`}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
