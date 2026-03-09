"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Video, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  generateDMVideoToken,
  generateProjectVideoToken,
  isVideoCallActive,
} from "@/app/actions/livekit";

interface VideoCallButtonProps {
  type: "dm" | "project";
  targetId: string; // userId for DM, projectId for project
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function VideoCallButton({
  type,
  targetId,
  size = "default",
  variant = "outline",
  className,
}: VideoCallButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [activeCallInfo, setActiveCallInfo] = useState<{
    isActive: boolean;
    participantCount: number;
  } | null>(null);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // Check if there's an active call
      const callStatus = await isVideoCallActive(type, targetId);

      if (callStatus.error) {
        console.error(callStatus.error);
        setIsLoading(false);
        return;
      }

      if (callStatus.isActive && callStatus.participantCount > 0) {
        // Show dialog to join existing call
        setActiveCallInfo({
          isActive: true,
          participantCount: callStatus.participantCount,
        });
        setShowDialog(true);
        setIsLoading(false);
        return;
      }

      // Start new call
      await startCall();
    } catch (error) {
      console.error("Failed to check call status:", error);
      setIsLoading(false);
    }
  };

  const startCall = async () => {
    setIsLoading(true);
    setShowDialog(false);

    try {
      const result =
        type === "dm"
          ? await generateDMVideoToken(targetId)
          : await generateProjectVideoToken(targetId);

      if (result.error) {
        console.error(result.error);
        setIsLoading(false);
        return;
      }

      // Navigate to video room
      const params = new URLSearchParams({
        token: result.token!,
        serverUrl: result.serverUrl!,
      });

      if ("projectTitle" in result && typeof result.projectTitle === "string") {
        params.set("title", result.projectTitle);
      }

      router.push(`/video/${result.roomName}?${params.toString()}`);
    } catch (error) {
      console.error("Failed to start video call:", error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Video className="h-4 w-4 mr-2" />
            Video Call
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Ongoing Call</DialogTitle>
            <DialogDescription>
              There's an active video call with{" "}
              {activeCallInfo?.participantCount || 0} participant
              {activeCallInfo?.participantCount !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-green-400">
              <Users className="h-5 w-5" />
              <span className="font-medium">
                {activeCallInfo?.participantCount} in call
              </span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startCall} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Video className="h-4 w-4 mr-2" />
              )}
              Join Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Inline video call indicator for showing active calls
 */
export function VideoCallIndicator({
  type,
  targetId,
}: {
  type: "dm" | "project";
  targetId: string;
}) {
  const [isActive, setIsActive] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  // Poll for active call status
  useState(() => {
    const checkStatus = async () => {
      const result = await isVideoCallActive(type, targetId);
      if (!result.error) {
        setIsActive(result.isActive || false);
        setParticipantCount(result.participantCount || 0);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  });

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-1 text-green-400 text-sm animate-pulse">
      <Video className="h-3 w-3" />
      <span>{participantCount} in call</span>
    </div>
  );
}
