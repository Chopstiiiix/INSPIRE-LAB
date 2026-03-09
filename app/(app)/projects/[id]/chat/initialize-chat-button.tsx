"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { initializeProjectChat } from "@/app/actions/project-members";

interface InitializeChatButtonProps {
  projectId: string;
}

export function InitializeChatButton({ projectId }: InitializeChatButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await initializeProjectChat(projectId);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      // Refresh the page to load the chat
      router.refresh();
    } catch (err) {
      setError("Failed to initialize chat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button onClick={handleInitialize} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Initializing...
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4 mr-2" />
            Initialize Chat
          </>
        )}
      </Button>
    </div>
  );
}
