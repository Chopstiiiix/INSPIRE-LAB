import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VideoRoomWrapper } from "./video-room-wrapper";

interface Props {
  params: Promise<{
    roomName: string;
  }>;
  searchParams: Promise<{
    token?: string;
    serverUrl?: string;
    title?: string;
  }>;
}

export default async function VideoCallPage({ params, searchParams }: Props) {
  const { roomName } = await params;
  const { token, serverUrl, title } = await searchParams;

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

  // Validate required params
  if (!token || !serverUrl) {
    redirect("/messages");
  }

  return (
    <div className="h-screen bg-black">
      <VideoRoomWrapper
        token={token}
        serverUrl={serverUrl}
        roomName={roomName}
        roomTitle={title}
      />
    </div>
  );
}
