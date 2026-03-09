"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function followUser(userId: string) {
  try {
    const currentUserId = await getCurrentUser();

    if (currentUserId === userId) {
      return { error: "You cannot follow yourself" };
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });

    if (existingFollow) {
      return { error: "Already following this user" };
    }

    await prisma.follow.create({
      data: {
        followerId: currentUserId,
        followingId: userId,
      },
    });

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    revalidatePath(`/${targetUser?.handle}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Follow user error:", error);
    return { error: "Failed to follow user" };
  }
}

export async function unfollowUser(userId: string) {
  try {
    const currentUserId = await getCurrentUser();

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });

    if (!existingFollow) {
      return { error: "Not following this user" };
    }

    await prisma.follow.delete({
      where: {
        id: existingFollow.id,
      },
    });

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    revalidatePath(`/${targetUser?.handle}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Unfollow user error:", error);
    return { error: "Failed to unfollow user" };
  }
}

export async function isFollowing(userId: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: userId,
        },
      },
    });

    return !!follow;
  } catch (error) {
    return false;
  }
}
