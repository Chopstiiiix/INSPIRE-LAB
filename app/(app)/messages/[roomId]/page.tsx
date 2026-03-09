import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DMChatWrapper } from "./dm-chat-wrapper";

interface Props {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function DMChatPage({ params }: Props) {
  const { roomId } = await params;
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

  // Get the room and verify access
  const room = await prisma.matrixRoom.findUnique({
    where: { id: roomId },
    include: {
      userA: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatar: true,
        },
      },
      userB: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatar: true,
        },
      },
    },
  });

  if (!room) {
    notFound();
  }

  // Verify user is part of this conversation
  if (room.userAId !== session.user.id && room.userBId !== session.user.id) {
    notFound();
  }

  // Get the other user
  const otherUser = room.userAId === session.user.id ? room.userB : room.userA;

  if (!otherUser) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-black">
      <DMChatWrapper
        matrixRoomId={room.matrixRoomId}
        otherUser={otherUser}
        roomId={roomId}
      />
    </div>
  );
}
