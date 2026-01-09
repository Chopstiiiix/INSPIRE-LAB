"use client";

import { useRouter } from "next/navigation";
import { ChatProvider } from "@/components/chat/chat-provider";
import { DMChat } from "@/components/chat/dm-chat";
import { generateDMVideoToken } from "@/app/actions/livekit";

interface DMChatWrapperProps {
  matrixRoomId: string;
  roomId: string;
  otherUser: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
  };
}

export function DMChatWrapper({ matrixRoomId, roomId, otherUser }: DMChatWrapperProps) {
  const router = useRouter();

  const handleStartVideoCall = async () => {
    const result = await generateDMVideoToken(otherUser.id);

    if (result.error) {
      console.error(result.error);
      return;
    }

    const params = new URLSearchParams({
      token: result.token!,
      serverUrl: result.serverUrl!,
      title: `Call with ${otherUser.name || otherUser.handle}`,
    });

    router.push(`/video/${result.roomName}?${params.toString()}`);
  };

  return (
    <ChatProvider>
      <DMChat
        matrixRoomId={matrixRoomId}
        otherUser={otherUser}
        onStartVideoCall={handleStartVideoCall}
      />
    </ChatProvider>
  );
}
