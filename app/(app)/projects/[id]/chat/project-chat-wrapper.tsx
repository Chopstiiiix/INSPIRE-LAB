"use client";

import { useRouter } from "next/navigation";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ProjectChat } from "@/components/chat/project-chat";

interface ProjectChatWrapperProps {
  matrixRoomId: string;
  projectId: string;
  projectTitle: string;
  members: Array<{
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
  }>;
}

export function ProjectChatWrapper({
  matrixRoomId,
  projectId,
  projectTitle,
}: ProjectChatWrapperProps) {
  const router = useRouter();

  const handleStartVideoCall = () => {
    // Navigate to the project call page
    router.push(`/projects/${projectId}/call`);
  };

  return (
    <ChatProvider>
      <ProjectChat
        matrixRoomId={matrixRoomId}
        projectId={projectId}
        projectTitle={projectTitle}
        onStartVideoCall={handleStartVideoCall}
      />
    </ChatProvider>
  );
}
