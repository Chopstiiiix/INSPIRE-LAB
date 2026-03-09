"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateRoomToken,
  createVideoRoom,
  generateDMRoomName,
  generateProjectRoomName,
  getLiveKitUrl,
  getParticipants,
} from "@/lib/livekit";

/**
 * Generate a token for joining a DM video call
 */
export async function generateDMVideoToken(otherUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify both users are active
  const [currentUser, otherUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, handle: true, status: true },
    }),
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, status: true },
    }),
  ]);

  if (!currentUser || !otherUser) {
    return { error: "User not found" };
  }

  if (currentUser.status !== "ACTIVE" || otherUser.status !== "ACTIVE") {
    return { error: "Both users must be active to start a video call" };
  }

  // Verify DM room exists between users
  const [userAId, userBId] = [session.user.id, otherUserId].sort();
  const dmRoom = await prisma.matrixRoom.findFirst({
    where: {
      roomType: "dm",
      userAId,
      userBId,
    },
  });

  if (!dmRoom) {
    return { error: "You must have an existing conversation to start a video call" };
  }

  const roomName = generateDMRoomName(userAId, userBId);

  try {
    // Create room if it doesn't exist (LiveKit handles this gracefully)
    await createVideoRoom(roomName, { emptyTimeout: 300, maxParticipants: 2 });

    const token = await generateRoomToken(
      roomName,
      currentUser.id,
      currentUser.name || currentUser.handle || "Anonymous",
      {
        canPublish: true,
        canSubscribe: true,
        ttl: 3600, // 1 hour
      }
    );

    return {
      success: true,
      token,
      roomName,
      serverUrl: getLiveKitUrl(),
    };
  } catch (error) {
    console.error("Failed to generate DM video token:", error);
    return { error: "Failed to start video call. Please try again." };
  }
}

/**
 * Generate a token for joining a project video call
 */
export async function generateProjectVideoToken(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  if (!project) {
    return { error: "Project not found" };
  }

  // Check if user is owner or member
  const isOwner = project.userId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);

  if (!isOwner && !isMember) {
    return { error: "You don't have access to this project" };
  }

  // Get current user info
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, handle: true, status: true },
  });

  if (!currentUser) {
    return { error: "User not found" };
  }

  if (currentUser.status !== "ACTIVE") {
    return { error: "Your account must be active to join video calls" };
  }

  const roomName = generateProjectRoomName(projectId);

  try {
    // Create room if it doesn't exist
    await createVideoRoom(roomName, { emptyTimeout: 300, maxParticipants: 50 });

    const token = await generateRoomToken(
      roomName,
      currentUser.id,
      currentUser.name || currentUser.handle || "Anonymous",
      {
        canPublish: true,
        canSubscribe: true,
        ttl: 3600, // 1 hour
      }
    );

    return {
      success: true,
      token,
      roomName,
      serverUrl: getLiveKitUrl(),
      projectTitle: project.title,
    };
  } catch (error) {
    console.error("Failed to generate project video token:", error);
    return { error: "Failed to start video call. Please try again." };
  }
}

/**
 * Get the current participants in a video room
 */
export async function getVideoRoomParticipants(roomType: "dm" | "project", targetId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  let roomName: string;

  if (roomType === "dm") {
    // Verify DM access
    const [userAId, userBId] = [session.user.id, targetId].sort();
    const dmRoom = await prisma.matrixRoom.findFirst({
      where: {
        roomType: "dm",
        userAId,
        userBId,
      },
    });

    if (!dmRoom) {
      return { error: "DM room not found" };
    }

    roomName = generateDMRoomName(userAId, userBId);
  } else {
    // Verify project access
    const project = await prisma.project.findUnique({
      where: { id: targetId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    const isOwner = project.userId === session.user.id;
    const isMember = project.members.some((m) => m.userId === session.user.id);

    if (!isOwner && !isMember) {
      return { error: "You don't have access to this project" };
    }

    roomName = generateProjectRoomName(targetId);
  }

  try {
    const participants = await getParticipants(roomName);

    // Get user info for participants
    const userIds = participants.map((p) => p.identity);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        handle: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedParticipants = participants.map((p) => ({
      ...p,
      user: userMap.get(p.identity) || null,
    }));

    return { success: true, participants: enrichedParticipants };
  } catch (error) {
    // Room might not exist yet, which is fine
    return { success: true, participants: [] };
  }
}

/**
 * Check if a video call is active
 */
export async function isVideoCallActive(roomType: "dm" | "project", targetId: string) {
  const result = await getVideoRoomParticipants(roomType, targetId);

  if (result.error) {
    return { error: result.error };
  }

  return {
    success: true,
    isActive: result.participants && result.participants.length > 0,
    participantCount: result.participants?.length || 0,
  };
}

/**
 * Get LiveKit server URL for client configuration
 */
export async function getLiveKitConfig() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  return {
    success: true,
    serverUrl: getLiveKitUrl(),
  };
}
