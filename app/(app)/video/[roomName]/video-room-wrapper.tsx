"use client";

import { useRouter } from "next/navigation";
import { VideoRoom } from "@/components/video/video-room";

interface VideoRoomWrapperProps {
  token: string;
  serverUrl: string;
  roomName: string;
  roomTitle?: string;
}

export function VideoRoomWrapper({
  token,
  serverUrl,
  roomName,
  roomTitle,
}: VideoRoomWrapperProps) {
  const router = useRouter();

  const handleLeave = () => {
    // Navigate back to messages
    router.push("/messages");
  };

  return (
    <VideoRoom
      token={token}
      serverUrl={serverUrl}
      roomName={roomName}
      roomTitle={roomTitle}
      onLeave={handleLeave}
    />
  );
}
