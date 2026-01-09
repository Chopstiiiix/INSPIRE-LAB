"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { getOrCreateDMRoom } from "@/app/actions/matrix";

interface MessageButtonProps {
  userId: string;
  userName?: string | null;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
}

export function MessageButton({
  userId,
  userName,
  size = "default",
  variant = "outline",
  className,
}: MessageButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const result = await getOrCreateDMRoom(userId);

      if (result.error) {
        console.error(result.error);
        setIsLoading(false);
        return;
      }

      // Navigate to the DM room
      router.push(`/messages/${result.roomId}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setIsLoading(false);
    }
  };

  return (
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
          <MessageSquare className="h-4 w-4 mr-2" />
          Message
        </>
      )}
    </Button>
  );
}
