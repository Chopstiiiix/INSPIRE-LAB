import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessagesList } from "./messages-list";

export default async function MessagesPage() {
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

  // Get all DM conversations for this user
  const conversations = await prisma.matrixRoom.findMany({
    where: {
      roomType: "dm",
      OR: [
        { userAId: session.user.id },
        { userBId: session.user.id },
      ],
    },
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Format conversations with the other user's info
  const formattedConversations = conversations.map((conv) => {
    const otherUser = conv.userAId === session.user.id ? conv.userB : conv.userA;
    return {
      id: conv.id,
      matrixRoomId: conv.matrixRoomId,
      otherUser: otherUser!,
      createdAt: conv.createdAt,
    };
  });

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Messages</h1>
          <p className="text-gray-400">Your private conversations</p>
        </div>

        <MessagesList
          conversations={formattedConversations}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
