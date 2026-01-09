"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { kickUser } from "@/lib/matrix/admin";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Verify the caller is an admin
 */
async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return { error: "User not found" };
  }

  if (user.role !== "ADMIN") {
    return { error: "Admin access required" };
  }

  return { adminId: session.user.id };
}

// =============================================================================
// Admin Actions
// =============================================================================

/**
 * Disable a user account.
 *
 * This action:
 * 1. Sets user status to SUSPENDED
 * 2. Kicks user from all Matrix rooms they're in
 * 3. Invalidates their Matrix credentials (blocks token issuance)
 *
 * Note: The user will be immediately kicked from any active calls/chats
 * and will be unable to request new tokens.
 */
export async function disableUser(targetUserId: string, reason?: string) {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if ("error" in adminResult) {
      return adminResult;
    }

    // Prevent self-disable
    if (adminResult.adminId === targetUserId) {
      return { error: "Cannot disable your own account" };
    }

    // Get target user with Matrix info
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        matrixCredentials: true,
        projectMemberships: {
          include: {
            project: { select: { matrixRoomId: true } },
          },
        },
      },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    if (targetUser.status === "SUSPENDED") {
      return { error: "User is already suspended" };
    }

    // Collect all Matrix rooms the user is in
    const roomsToKickFrom: string[] = [];

    // Project rooms
    for (const membership of targetUser.projectMemberships) {
      if (membership.project.matrixRoomId) {
        roomsToKickFrom.push(membership.project.matrixRoomId);
      }
    }

    // DM rooms
    const dmRooms = await prisma.matrixRoom.findMany({
      where: {
        roomType: "dm",
        OR: [{ userAId: targetUserId }, { userBId: targetUserId }],
      },
      select: { matrixRoomId: true },
    });

    for (const room of dmRooms) {
      roomsToKickFrom.push(room.matrixRoomId);
    }

    // Kick from all rooms (non-blocking, best effort)
    const kickResults: { room: string; success: boolean; error?: string }[] = [];

    if (targetUser.matrixUserId) {
      for (const roomId of roomsToKickFrom) {
        try {
          await kickUser(roomId, targetUser.matrixUserId, "Account suspended");
          kickResults.push({ room: roomId, success: true });
        } catch (err) {
          kickResults.push({
            room: roomId,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    // Delete Matrix credentials (blocks token issuance)
    if (targetUser.matrixCredentials) {
      await prisma.userMatrixCredentials.delete({
        where: { userId: targetUserId },
      });
    }

    // Remove from all project memberships
    await prisma.projectMembership.deleteMany({
      where: { userId: targetUserId },
    });

    // Update user status to SUSPENDED
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: "SUSPENDED",
        // Clear Matrix user ID since credentials are deleted
        matrixUserId: null,
      },
    });

    // Log the action
    console.log(
      `[Admin] User ${targetUserId} suspended by admin ${adminResult.adminId}. Reason: ${reason || "Not specified"}`
    );

    revalidatePath("/app/admin");

    return {
      success: true,
      kickResults,
      message: `User suspended. Kicked from ${kickResults.filter((r) => r.success).length}/${roomsToKickFrom.length} rooms.`,
    };
  } catch (error) {
    console.error("Disable user error:", error);
    return { error: "Failed to disable user" };
  }
}

/**
 * Re-enable a suspended user account.
 *
 * Note: The user will need to go through onboarding again
 * to get new Matrix credentials.
 */
export async function enableUser(targetUserId: string) {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if ("error" in adminResult) {
      return adminResult;
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    if (targetUser.status !== "SUSPENDED") {
      return { error: "User is not suspended" };
    }

    // Update user status to PENDING (requires re-onboarding)
    await prisma.user.update({
      where: { id: targetUserId },
      data: { status: "PENDING" },
    });

    console.log(
      `[Admin] User ${targetUserId} enabled by admin ${adminResult.adminId}`
    );

    revalidatePath("/app/admin");

    return {
      success: true,
      message: "User enabled. They will need to complete onboarding again.",
    };
  } catch (error) {
    console.error("Enable user error:", error);
    return { error: "Failed to enable user" };
  }
}

/**
 * Get list of suspended users
 */
export async function getSuspendedUsers() {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if ("error" in adminResult) {
      return adminResult;
    }

    const users = await prisma.user.findMany({
      where: { status: "SUSPENDED" },
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Get suspended users error:", error);
    return { error: "Failed to load suspended users" };
  }
}
