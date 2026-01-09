/**
 * Chat Provisioning Service
 *
 * Manages Matrix room provisioning for projects:
 * - Creates private (invite-only) Matrix rooms for projects
 * - Syncs project members with Matrix room membership
 * - Handles member invites and kicks
 * - Logs all actions to audit log
 */

import { prisma } from "@/lib/prisma";
import {
  createGroupRoom,
  inviteUser,
  kickUser,
  setRoomName,
  setRoomTopic,
  getRoomMembers,
  MatrixApiError,
} from "@/lib/matrix/admin";
import type { ChatAuditAction } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export interface ProvisioningResult {
  success: boolean;
  matrixRoomId?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  invited: string[];
  removed: string[];
  errors: string[];
}

// =============================================================================
// Audit Logging
// =============================================================================

/**
 * Log a chat-related action to the audit log
 */
async function logAuditEvent(params: {
  action: ChatAuditAction;
  roomType: "dm" | "project";
  matrixRoomId: string;
  projectId?: string;
  actorUserId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.chatAuditLog.create({
      data: {
        action: params.action,
        roomType: params.roomType,
        matrixRoomId: params.matrixRoomId,
        projectId: params.projectId,
        actorUserId: params.actorUserId,
        targetUserId: params.targetUserId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break main flow
    console.error("[ChatProvisioning] Failed to create audit log:", error);
  }
}

// =============================================================================
// Project Room Provisioning
// =============================================================================

/**
 * Ensure a project has a Matrix room.
 * Creates the room if it doesn't exist.
 *
 * @param projectId - The project ID
 * @param actorUserId - The user performing the action (for audit)
 * @returns The Matrix room ID
 */
export async function ensureProjectRoom(
  projectId: string,
  actorUserId?: string
): Promise<ProvisioningResult> {
  // Get project with owner and members
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: {
          id: true,
          matrixUserId: true,
          matrixCredentials: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              matrixUserId: true,
              matrixCredentials: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // Return existing room if already provisioned
  if (project.matrixRoomId) {
    return { success: true, matrixRoomId: project.matrixRoomId };
  }

  // Collect Matrix user IDs for all members (owner + members)
  const matrixUserIds: string[] = [];

  // Add owner if they have Matrix credentials
  if (project.user.matrixUserId) {
    matrixUserIds.push(project.user.matrixUserId);
  }

  // Add all members who have Matrix credentials
  for (const member of project.members) {
    if (member.user.matrixUserId) {
      matrixUserIds.push(member.user.matrixUserId);
    }
  }

  if (matrixUserIds.length === 0) {
    return {
      success: false,
      error: "No members have chat enabled. At least one member must have chat initialized.",
    };
  }

  try {
    // Create the Matrix room
    const room = await createGroupRoom(
      project.title,
      matrixUserIds,
      project.description || undefined
    );

    // Update project with room ID
    await prisma.project.update({
      where: { id: projectId },
      data: { matrixRoomId: room.roomId },
    });

    // Also create MatrixRoom record for backwards compatibility
    await prisma.matrixRoom.create({
      data: {
        matrixRoomId: room.roomId,
        roomType: "project",
        projectId,
      },
    });

    // Log audit event
    await logAuditEvent({
      action: "ROOM_CREATED",
      roomType: "project",
      matrixRoomId: room.roomId,
      projectId,
      actorUserId,
      metadata: {
        projectTitle: project.title,
        initialMembers: matrixUserIds,
      },
    });

    return { success: true, matrixRoomId: room.roomId };
  } catch (error) {
    console.error("[ChatProvisioning] Failed to create project room:", error);
    return {
      success: false,
      error: "Failed to create chat room. Please try again.",
    };
  }
}

/**
 * Sync project members with Matrix room membership.
 * Invites new members, removes old members.
 *
 * @param projectId - The project ID
 * @param actorUserId - The user performing the sync (for audit)
 */
export async function syncProjectMembers(
  projectId: string,
  actorUserId?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    invited: [],
    removed: [],
    errors: [],
  };

  // Get project with current members
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: {
          id: true,
          matrixUserId: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              matrixUserId: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return { ...result, success: false, errors: ["Project not found"] };
  }

  if (!project.matrixRoomId) {
    // No room yet - ensure it's created first
    const provisionResult = await ensureProjectRoom(projectId, actorUserId);
    if (!provisionResult.success) {
      return { ...result, success: false, errors: [provisionResult.error || "Failed to create room"] };
    }
    // Room just created with all current members, nothing more to sync
    return result;
  }

  // Collect expected Matrix user IDs (owner + all members)
  const expectedMembers = new Set<string>();

  if (project.user.matrixUserId) {
    expectedMembers.add(project.user.matrixUserId);
  }

  for (const member of project.members) {
    if (member.user.matrixUserId) {
      expectedMembers.add(member.user.matrixUserId);
    }
  }

  // Get current Matrix room members
  let currentMembers: Set<string>;
  try {
    const roomMembers = await getRoomMembers(project.matrixRoomId);
    currentMembers = new Set(roomMembers.map((m) => m.userId));
  } catch (error) {
    console.error("[ChatProvisioning] Failed to get room members:", error);
    return { ...result, success: false, errors: ["Failed to get current room members"] };
  }

  // Find members to invite (in expected but not in current)
  const toInvite = [...expectedMembers].filter((id) => !currentMembers.has(id));

  // Find members to remove (in current but not in expected)
  // Exclude admin user from removal
  const adminUserId = process.env.MATRIX_ADMIN_USER_ID;
  const toRemove = [...currentMembers].filter(
    (id) => !expectedMembers.has(id) && id !== adminUserId
  );

  // Invite new members
  for (const matrixUserId of toInvite) {
    try {
      await inviteUser(project.matrixRoomId, matrixUserId);
      result.invited.push(matrixUserId);

      // Find platform user ID for audit
      const platformUser = [project.user, ...project.members.map((m) => m.user)].find(
        (u) => u.matrixUserId === matrixUserId
      );

      await logAuditEvent({
        action: "MEMBER_INVITED",
        roomType: "project",
        matrixRoomId: project.matrixRoomId,
        projectId,
        actorUserId,
        targetUserId: platformUser?.id,
        metadata: { matrixUserId },
      });
    } catch (error) {
      if (error instanceof MatrixApiError && error.isAlreadyJoined) {
        // Already in room, skip
        continue;
      }
      result.errors.push(`Failed to invite ${matrixUserId}`);
      console.error(`[ChatProvisioning] Failed to invite ${matrixUserId}:`, error);
    }
  }

  // Remove old members
  for (const matrixUserId of toRemove) {
    try {
      await kickUser(project.matrixRoomId, matrixUserId, "Removed from project");
      result.removed.push(matrixUserId);

      await logAuditEvent({
        action: "MEMBER_REMOVED",
        roomType: "project",
        matrixRoomId: project.matrixRoomId,
        projectId,
        actorUserId,
        metadata: { matrixUserId },
      });
    } catch (error) {
      result.errors.push(`Failed to remove ${matrixUserId}`);
      console.error(`[ChatProvisioning] Failed to remove ${matrixUserId}:`, error);
    }
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

// =============================================================================
// Individual Member Operations
// =============================================================================

/**
 * Invite a user to a project's Matrix room.
 * Creates the room if it doesn't exist.
 *
 * @param projectId - The project ID
 * @param userId - Platform user ID to invite
 * @param actorUserId - User performing the action (for audit)
 */
export async function inviteMemberToProjectRoom(
  projectId: string,
  userId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  // Get user's Matrix credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, matrixUserId: true },
  });

  if (!user?.matrixUserId) {
    return { success: false, error: "User has not initialized chat" };
  }

  // Ensure room exists
  const ensureResult = await ensureProjectRoom(projectId, actorUserId);
  if (!ensureResult.success || !ensureResult.matrixRoomId) {
    return { success: false, error: ensureResult.error || "Failed to ensure room exists" };
  }

  try {
    await inviteUser(ensureResult.matrixRoomId, user.matrixUserId);

    await logAuditEvent({
      action: "MEMBER_INVITED",
      roomType: "project",
      matrixRoomId: ensureResult.matrixRoomId,
      projectId,
      actorUserId,
      targetUserId: userId,
      metadata: { matrixUserId: user.matrixUserId },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof MatrixApiError && error.isAlreadyJoined) {
      return { success: true }; // Already in room
    }
    console.error("[ChatProvisioning] Failed to invite member:", error);
    return { success: false, error: "Failed to invite user to chat" };
  }
}

/**
 * Remove a user from a project's Matrix room.
 *
 * @param projectId - The project ID
 * @param userId - Platform user ID to remove
 * @param actorUserId - User performing the action (for audit)
 */
export async function removeMemberFromProjectRoom(
  projectId: string,
  userId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  // Get project room ID
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { matrixRoomId: true },
  });

  if (!project?.matrixRoomId) {
    // No room, nothing to remove from
    return { success: true };
  }

  // Get user's Matrix ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, matrixUserId: true },
  });

  if (!user?.matrixUserId) {
    return { success: true }; // User not in chat anyway
  }

  try {
    await kickUser(project.matrixRoomId, user.matrixUserId, "Removed from project");

    await logAuditEvent({
      action: "MEMBER_REMOVED",
      roomType: "project",
      matrixRoomId: project.matrixRoomId,
      projectId,
      actorUserId,
      targetUserId: userId,
      metadata: { matrixUserId: user.matrixUserId },
    });

    return { success: true };
  } catch (error) {
    console.error("[ChatProvisioning] Failed to remove member:", error);
    return { success: false, error: "Failed to remove user from chat" };
  }
}

// =============================================================================
// Room Updates
// =============================================================================

/**
 * Update a project room's name and topic when project details change.
 *
 * @param projectId - The project ID
 * @param updates - New name and/or topic
 */
export async function updateProjectRoomDetails(
  projectId: string,
  updates: { name?: string; topic?: string },
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { matrixRoomId: true },
  });

  if (!project?.matrixRoomId) {
    return { success: true }; // No room to update
  }

  try {
    if (updates.name) {
      await setRoomName(project.matrixRoomId, updates.name);
    }
    if (updates.topic !== undefined) {
      await setRoomTopic(project.matrixRoomId, updates.topic);
    }

    await logAuditEvent({
      action: "ROOM_UPDATED",
      roomType: "project",
      matrixRoomId: project.matrixRoomId,
      projectId,
      actorUserId,
      metadata: updates,
    });

    return { success: true };
  } catch (error) {
    console.error("[ChatProvisioning] Failed to update room details:", error);
    return { success: false, error: "Failed to update chat room" };
  }
}

// =============================================================================
// Exports for use in server actions
// =============================================================================

export {
  logAuditEvent,
};
