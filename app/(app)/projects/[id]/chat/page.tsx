import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectChatWrapper } from "./project-chat-wrapper";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectChatPage({ params }: Props) {
  const { id: projectId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Check user status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  if (user?.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (user?.status === "PENDING") {
    redirect("/onboarding");
  }

  // Get project with members
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatar: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              handle: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Check if user has access (owner or member)
  const isOwner = project.userId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);

  if (!isOwner && !isMember) {
    notFound();
  }

  // Check if project has a Matrix room
  if (!project.matrixRoomId) {
    // Redirect to a page to initialize chat
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Chat Not Initialized</h1>
          <p className="text-gray-400 mb-6">
            The chat room for this project hasn't been set up yet.
          </p>
          <InitializeChatButton projectId={projectId} />
        </div>
      </div>
    );
  }

  // Collect all members (owner + collaborators)
  const allMembers = [
    project.user,
    ...project.members.map((m) => m.user),
  ];

  return (
    <div className="h-[calc(100vh-64px)] bg-black">
      <ProjectChatWrapper
        matrixRoomId={project.matrixRoomId}
        projectId={projectId}
        projectTitle={project.title}
        members={allMembers}
      />
    </div>
  );
}

// Client component for initializing chat
import { InitializeChatButton } from "./initialize-chat-button";
