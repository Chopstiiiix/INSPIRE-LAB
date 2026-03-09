"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  ParticipantTile,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Phone,
  PhoneOff,
  ArrowLeft,
  Users,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface VideoRoomProps {
  projectId: string;
  projectTitle: string;
  userName: string;
}

type ConnectionState = "idle" | "connecting" | "connected" | "error";

export function VideoRoom({ projectId, projectTitle, userName }: VideoRoomProps) {
  const router = useRouter();
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    setConnectionState("connecting");
    setError(null);

    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get token");
      }

      const data = await response.json();
      setToken(data.token);
      setServerUrl(data.url);
      setRoomName(data.roomName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnectionState("error");
    }
  }, [projectId]);

  const handleDisconnect = useCallback(() => {
    setToken(null);
    setServerUrl(null);
    setRoomName(null);
    setConnectionState("idle");
  }, []);

  const handleLeave = useCallback(() => {
    handleDisconnect();
    router.push(`/projects/${projectId}/chat`);
  }, [handleDisconnect, router, projectId]);

  // Pre-join screen
  if (connectionState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">{projectTitle}</h1>
            <p className="text-gray-400">Video Call</p>
          </div>

          <div className="p-6 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="text-gray-300">Ready to join as {userName}</span>
            </div>

            <Button
              onClick={fetchToken}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-5 w-5 mr-2" />
              Join Call
            </Button>
          </div>

          <Link
            href={`/projects/${projectId}/chat`}
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  // Connecting screen
  if (connectionState === "connecting" || !token || !serverUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
        <p className="text-gray-400">Connecting to call...</p>
      </div>
    );
  }

  // Error screen
  if (connectionState === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Connection Failed</h2>
            <p className="text-gray-400">{error}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={fetchToken}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onConnected={() => setConnectionState("connected")}
      onDisconnected={handleDisconnect}
      onError={(err) => {
        console.error("LiveKit error:", err);
        setError(err.message);
        setConnectionState("error");
      }}
      data-lk-theme="default"
      className="h-full"
      style={
        {
          "--lk-bg": "#000",
          "--lk-bg2": "#171717",
          "--lk-border-color": "#262626",
          "--lk-control-bg": "#171717",
          "--lk-control-hover-bg": "#262626",
        } as React.CSSProperties
      }
    >
      <VideoConferenceContent
        projectTitle={projectTitle}
        projectId={projectId}
        onLeave={handleLeave}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

interface VideoConferenceContentProps {
  projectTitle: string;
  projectId: string;
  onLeave: () => void;
}

function VideoConferenceContent({
  projectTitle,
  projectId,
  onLeave,
}: VideoConferenceContentProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/chat`}>
            <Button variant="ghost" size="icon" className="text-gray-400">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="font-semibold text-white">{projectTitle}</h2>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Users className="h-3 w-3" />
              <span>{participants.length} in call</span>
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={onLeave}
          className="bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          Leave
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        {tracks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Waiting for participants...</p>
              <p className="text-sm mt-1">Turn on your camera to get started</p>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-4 h-full ${getGridClass(tracks.length)}`}
          >
            {tracks.map((trackRef) => (
              <ParticipantTile
                key={trackRef.publication?.trackSid || trackRef.participant.sid}
                trackRef={trackRef}
                className="rounded-lg overflow-hidden bg-neutral-900"
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur">
        <ControlBar
          variation="minimal"
          controls={{
            camera: true,
            microphone: true,
            screenShare: true,
            leave: false, // We have our own leave button
            settings: true,
          }}
          className="justify-center"
        />
      </div>
    </div>
  );
}

function getGridClass(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  if (count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3";
}
