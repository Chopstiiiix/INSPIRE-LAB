"use client";

import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  GridLayout,
  ParticipantTile,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface VideoRoomProps {
  token: string;
  serverUrl: string;
  roomName: string;
  roomTitle?: string;
  onLeave?: () => void;
}

export function VideoRoom({
  token,
  serverUrl,
  roomName,
  roomTitle,
  onLeave,
}: VideoRoomProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnected = () => {
    setIsConnected(false);
    if (onLeave) {
      onLeave();
    } else {
      router.back();
    }
  };

  const handleError = (err: Error) => {
    console.error("LiveKit error:", err);
    setError(err.message);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black p-8 text-center">
        <p className="text-red-400 mb-4">Failed to connect to video call</p>
        <p className="text-gray-500 mb-4 text-sm">{error}</p>
        <Button onClick={() => router.back()}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onConnected={() => setIsConnected(true)}
        onDisconnected={handleDisconnected}
        onError={handleError}
        data-lk-theme="default"
        style={{ height: "100%", width: "100%" }}
      >
        {/* Room header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">
              {roomTitle || "Video Call"}
            </h2>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnected}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>

        {/* Video conference UI */}
        <VideoConference />

        {/* Audio renderer for remote participants */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/**
 * Simple video room with custom layout
 */
export function SimpleVideoRoom({
  token,
  serverUrl,
  roomName,
  roomTitle,
  onLeave,
}: VideoRoomProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleDisconnected = () => {
    if (onLeave) {
      onLeave();
    } else {
      router.back();
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black p-8 text-center">
        <p className="text-red-400 mb-4">Failed to connect to video call</p>
        <p className="text-gray-500 mb-4 text-sm">{error}</p>
        <Button onClick={() => router.back()}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black flex flex-col">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnected}
        onError={(err) => setError(err.message)}
        data-lk-theme="default"
        className="flex-1"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">
              {roomTitle || "Video Call"}
            </h2>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnected}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave Call
            </Button>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4">
            <VideoGrid />
          </div>

          {/* Controls */}
          <div className="p-4 border-t border-neutral-800">
            <ControlBar variation="minimal" />
          </div>
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function VideoGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "100%" }}
    >
      <ParticipantTile />
    </GridLayout>
  );
}
