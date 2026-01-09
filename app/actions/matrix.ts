"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  createMatrixUser,
  createMatrixRoom,
  inviteToRoom,
  generateMatrixPassword,
  getMatrixHomeserverUrl,
  getMatrixServerName,
} from "@/lib/matrix";

/**
 * Get or create Matrix credentials for the current user
 * Called when user first accesses chat features
 */
export async function getOrCreateMatrixUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Check if user is active
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      handle: true,
      name: true,
      status: true,
      matrixCredentials: true,
    },
  });

  if (!user) {
    return { error: "User not found" };
  }

  if (user.status !== "ACTIVE") {
    return { error: "Account is not active" };
  }

  if (!user.handle) {
    return { error: "User handle is required for chat" };
  }

  // Return existing credentials if available - use on-demand token generation
  if (user.matrixCredentials) {
    // Get fresh token via login
    const password = decrypt(user.matrixCredentials.password);
    try {
      const { loginUser, getClientConfig } = await import("@/lib/matrix/admin");
      const loginResult = await loginUser(user.handle, password);
      return {
        success: true,
        matrixUserId: user.matrixCredentials.matrixUserId,
        accessToken: loginResult.accessToken,
        deviceId: loginResult.deviceId,
        homeserverUrl: getClientConfig().baseUrl,
      };
    } catch (loginError) {
      console.error("Failed to login to Matrix:", loginError);
      return { error: "Failed to authenticate with chat server" };
    }
  }

  // Create new Matrix user (provision on first access)
  const password = generateMatrixPassword();

  try {
    const registration = await createMatrixUser(
      user.handle,
      password,
      user.name || user.handle
    );

    // Store encrypted password (not access token)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { matrixUserId: registration.user_id },
      }),
      prisma.userMatrixCredentials.create({
        data: {
          userId: user.id,
          matrixUserId: registration.user_id,
          password: encrypt(password),
        },
      }),
    ]);

    return {
      success: true,
      matrixUserId: registration.user_id,
      accessToken: registration.access_token,
      deviceId: registration.device_id,
      homeserverUrl: getMatrixHomeserverUrl(),
    };
  } catch (error) {
    console.error("Failed to create Matrix user:", error);
    return { error: "Failed to initialize chat. Please try again." };
  }
}

/**
 * Get or create a DM room between two users
 */
export async function getOrCreateDMRoom(otherUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (session.user.id === otherUserId) {
    return { error: "Cannot create DM with yourself" };
  }

  // Verify both users are active
  const [currentUser, otherUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, status: true, matrixCredentials: true },
    }),
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, handle: true, name: true, status: true, matrixCredentials: true },
    }),
  ]);

  if (!currentUser || !otherUser) {
    return { error: "User not found" };
  }

  if (currentUser.status !== "ACTIVE" || otherUser.status !== "ACTIVE") {
    return { error: "Both users must be active to start a conversation" };
  }

  if (!currentUser.matrixCredentials || !otherUser.matrixCredentials) {
    return { error: "Chat not initialized. Please refresh the page." };
  }

  // Sort user IDs to ensure consistent room lookup
  const [userAId, userBId] = [session.user.id, otherUserId].sort();

  // Check for existing room
  const existingRoom = await prisma.matrixRoom.findFirst({
    where: {
      roomType: "dm",
      userAId,
      userBId,
    },
  });

  if (existingRoom) {
    return {
      success: true,
      roomId: existingRoom.id,
      matrixRoomId: existingRoom.matrixRoomId,
    };
  }

  // Create new Matrix room
  try {
    const matrixRoomId = await createMatrixRoom({
      isDirect: true,
      inviteUserIds: [
        currentUser.matrixCredentials.matrixUserId,
        otherUser.matrixCredentials.matrixUserId,
      ],
      encrypted: true,
    });

    // Invite both users
    await Promise.all([
      inviteToRoom(matrixRoomId, currentUser.matrixCredentials.matrixUserId),
      inviteToRoom(matrixRoomId, otherUser.matrixCredentials.matrixUserId),
    ]);

    // Store room mapping
    const room = await prisma.matrixRoom.create({
      data: {
        matrixRoomId,
        roomType: "dm",
        userAId,
        userBId,
      },
    });

    return {
      success: true,
      roomId: room.id,
      matrixRoomId: room.matrixRoomId,
    };
  } catch (error) {
    console.error("Failed to create DM room:", error);
    return { error: "Failed to create conversation. Please try again." };
  }
}

/**
 * Get or create a project chat room
 */
export async function getOrCreateProjectRoom(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: { id: true, matrixCredentials: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, matrixCredentials: true },
          },
        },
      },
      matrixRoom: true,
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

  // Return existing room if available
  if (project.matrixRoom) {
    return {
      success: true,
      roomId: project.matrixRoom.id,
      matrixRoomId: project.matrixRoom.matrixRoomId,
    };
  }

  // Get current user's Matrix credentials
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { matrixCredentials: true },
  });

  if (!currentUser?.matrixCredentials) {
    return { error: "Chat not initialized. Please refresh the page." };
  }

  // Collect all member Matrix user IDs
  const matrixUserIds: string[] = [];

  if (project.user.matrixCredentials) {
    matrixUserIds.push(project.user.matrixCredentials.matrixUserId);
  }

  for (const member of project.members) {
    if (member.user.matrixCredentials) {
      matrixUserIds.push(member.user.matrixCredentials.matrixUserId);
    }
  }

  // Create new Matrix room
  try {
    const matrixRoomId = await createMatrixRoom({
      name: `${project.title} Chat`,
      topic: project.description || undefined,
      isDirect: false,
      inviteUserIds: matrixUserIds,
      encrypted: true,
    });

    // Invite all members
    await Promise.all(matrixUserIds.map((userId) => inviteToRoom(matrixRoomId, userId)));

    // Store room mapping
    const room = await prisma.matrixRoom.create({
      data: {
        matrixRoomId,
        roomType: "project",
        projectId,
      },
    });

    return {
      success: true,
      roomId: room.id,
      matrixRoomId: room.matrixRoomId,
    };
  } catch (error) {
    console.error("Failed to create project room:", error);
    return { error: "Failed to create project chat. Please try again." };
  }
}

/**
 * Invite a new member to a project's Matrix room
 */
export async function inviteToProjectRoom(projectId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify project and permissions
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      matrixRoom: true,
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return { error: "Project not found" };
  }

  // Check permissions (only owner or admin can invite)
  const isOwner = project.userId === session.user.id;
  const isAdmin = project.members.some((m) => m.role === "ADMIN");

  if (!isOwner && !isAdmin) {
    return { error: "You don't have permission to invite members" };
  }

  if (!project.matrixRoom) {
    return { error: "Project chat room not initialized" };
  }

  // Get user's Matrix credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { matrixCredentials: true },
  });

  if (!user?.matrixCredentials) {
    return { error: "User has not initialized chat" };
  }

  try {
    await inviteToRoom(project.matrixRoom.matrixRoomId, user.matrixCredentials.matrixUserId);
    return { success: true };
  } catch (error) {
    console.error("Failed to invite user to project room:", error);
    return { error: "Failed to invite user to chat" };
  }
}

/**
 * Get list of DM conversations for current user
 */
export async function getDMConversations() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const rooms = await prisma.matrixRoom.findMany({
    where: {
      roomType: "dm",
      OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
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

  // Format response with the other user's info
  const conversations = rooms.map((room) => {
    const otherUser = room.userAId === session.user.id ? room.userB : room.userA;
    return {
      id: room.id,
      matrixRoomId: room.matrixRoomId,
      otherUser,
      createdAt: room.createdAt,
    };
  });

  return { success: true, conversations };
}

/**
 * Get Matrix configuration for client-side SDK
 */
export async function getMatrixConfig() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  return {
    success: true,
    homeserverUrl: getMatrixHomeserverUrl(),
    serverName: getMatrixServerName(),
  };
}
