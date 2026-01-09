import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VideoRoom } from "./video-room";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectCallPage({ params }: Props) {
  const { id: projectId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Check user status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, name: true, handle: true },
  });

  if (user?.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (user?.status === "PENDING") {
    redirect("/onboarding");
  }

  // Get project and verify access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      userId: true,
      members: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Check if user has access (owner or member)
  const isOwner = project.userId === session.user.id;
  const isMember = project.members.length > 0;

  if (!isOwner && !isMember) {
    notFound();
  }

  return (
    <div className="h-screen bg-black">
      <VideoRoom
        projectId={projectId}
        projectTitle={project.title}
        userName={user?.name || user?.handle || "Anonymous"}
      />
    </div>
  );
}
