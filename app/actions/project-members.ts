"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { membershipRateLimiter } from "@/lib/rate-limit";
import {
  inviteMemberToProjectRoom,
  removeMemberFromProjectRoom,
  ensureProjectRoom,
  syncProjectMembers,
} from "@/server/chatProvisioning";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Verify user is authenticated and ACTIVE
 */
async function verifyActiveUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, status: true },
  });

  if (!user) {
    return { error: "User not found" };
  }

  if (user.status !== "ACTIVE") {
    return { error: "Your account must be active to perform this action" };
  }

  return { userId: session.user.id };
}

/**
 * Check rate limit for membership operations
 */
function checkMembershipRateLimit(userId: string) {
  const result = membershipRateLimiter.check(`membership:${userId}`);
  if (!result.success) {
    return {
      error: `Rate limit exceeded. Try again in ${result.retryAfterSeconds} seconds.`,
    };
  }
  return { success: true };
}

// =============================================================================
// Schemas
// =============================================================================

const addMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

const updateMemberRoleSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

// =============================================================================
// Actions
// =============================================================================

/**
 * Add a member to a project.
 * Also invites them to the project's Matrix chat room if it exists.
 */
export async function addProjectMember(data: z.infer<typeof addMemberSchema>) {
  try {
    // Verify caller is authenticated and ACTIVE
    const authResult = await verifyActiveUser();
    if ("error" in authResult) {
      return authResult;
    }
    const { userId: callerId } = authResult;

    // Check rate limit
    const rateLimitResult = checkMembershipRateLimit(callerId);
    if ("error" in rateLimitResult) {
      return rateLimitResult;
    }

    const validated = addMemberSchema.parse(data);

    // Verify project ownership or admin role
    const project = await prisma.project.findUnique({
      where: { id: validated.projectId },
      include: {
        members: {
          where: { userId: callerId },
          select: { role: true },
        },
        user: { select: { handle: true } },
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    const isOwner = project.userId === callerId;
    const isAdmin = project.members.some((m) => m.role === "ADMIN");

    if (!isOwner && !isAdmin) {
      return { error: "You don't have permission to add members" };
    }

    // Verify target user exists and is ACTIVE
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, status: true },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    if (targetUser.status !== "ACTIVE") {
      return { error: "User account is not active" };
    }

    // Check if already a member
    const existingMember = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId: validated.projectId,
          userId: validated.userId,
        },
      },
    });

    if (existingMember) {
      return { error: "User is already a member of this project" };
    }

    // Add member
    const membership = await prisma.projectMembership.create({
      data: {
        projectId: validated.projectId,
        userId: validated.userId,
        role: validated.role,
      },
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
    });

    // Invite to Matrix room (non-blocking)
    try {
      await inviteMemberToProjectRoom(
        validated.projectId,
        validated.userId,
        callerId
      );
    } catch (chatError) {
      console.error("[AddMember] Chat invite failed:", chatError);
      // Don't fail the membership - chat is secondary
    }

    revalidatePath(`/u/${project.user.handle}`);

    return { success: true, membership };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Add project member error:", error);
    return { error: "Failed to add member" };
  }
}

/**
 * Remove a member from a project.
 * Also kicks them from the project's Matrix chat room.
 */
export async function removeProjectMember(projectId: string, userId: string) {
  try {
    // Verify caller is authenticated and ACTIVE
    const authResult = await verifyActiveUser();
    if ("error" in authResult) {
      return authResult;
    }
    const { userId: callerId } = authResult;

    // Check rate limit
    const rateLimitResult = checkMembershipRateLimit(callerId);
    if ("error" in rateLimitResult) {
      return rateLimitResult;
    }

    // Verify project ownership or admin role
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: callerId },
          select: { role: true },
        },
        user: { select: { handle: true } },
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    const isOwner = project.userId === callerId;
    const isAdmin = project.members.some((m) => m.role === "ADMIN");
    const isSelf = callerId === userId;

    // Can remove if: owner, admin, or removing self
    if (!isOwner && !isAdmin && !isSelf) {
      return { error: "You don't have permission to remove members" };
    }

    // Can't remove the owner
    if (project.userId === userId) {
      return { error: "Cannot remove the project owner" };
    }

    // Remove from Matrix room first (non-blocking)
    try {
      await removeMemberFromProjectRoom(projectId, userId, callerId);
    } catch (chatError) {
      console.error("[RemoveMember] Chat kick failed:", chatError);
      // Continue with removal
    }

    // Remove membership
    await prisma.projectMembership.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    revalidatePath(`/u/${project.user.handle}`);

    return { success: true };
  } catch (error) {
    console.error("Remove project member error:", error);
    return { error: "Failed to remove member" };
  }
}

/**
 * Update a member's role in a project.
 */
export async function updateMemberRole(data: z.infer<typeof updateMemberRoleSchema>) {
  try {
    // Verify caller is authenticated and ACTIVE
    const authResult = await verifyActiveUser();
    if ("error" in authResult) {
      return authResult;
    }
    const { userId: callerId } = authResult;

    // Check rate limit
    const rateLimitResult = checkMembershipRateLimit(callerId);
    if ("error" in rateLimitResult) {
      return rateLimitResult;
    }

    const validated = updateMemberRoleSchema.parse(data);

    // Verify project ownership (only owner can change roles)
    const project = await prisma.project.findUnique({
      where: { id: validated.projectId },
      select: { userId: true },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    if (project.userId !== callerId) {
      return { error: "Only the project owner can change member roles" };
    }

    // Update role
    const membership = await prisma.projectMembership.update({
      where: {
        projectId_userId: {
          projectId: validated.projectId,
          userId: validated.userId,
        },
      },
      data: {
        role: validated.role,
      },
    });

    return { success: true, membership };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Update member role error:", error);
    return { error: "Failed to update role" };
  }
}

/**
 * Get all members of a project.
 */
export async function getProjectMembers(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatar: true,
            roleTitle: true,
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
                roleTitle: true,
              },
            },
          },
          orderBy: [
            { role: "asc" }, // OWNER, ADMIN, MEMBER, VIEWER
            { joinedAt: "asc" },
          ],
        },
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    // Check if user has access
    const isOwner = project.userId === session.user.id;
    const isMember = project.members.some((m) => m.userId === session.user.id);
    const isPublic = project.visibility === "PUBLIC";

    if (!isOwner && !isMember && !isPublic) {
      return { error: "You don't have access to this project" };
    }

    return {
      success: true,
      owner: {
        ...project.user,
        role: "OWNER" as const,
      },
      members: project.members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  } catch (error) {
    console.error("Get project members error:", error);
    return { error: "Failed to load members" };
  }
}

/**
 * Initialize or sync the project's chat room.
 * Creates the room if it doesn't exist and syncs members.
 */
export async function initializeProjectChat(projectId: string) {
  try {
    // Verify caller is authenticated and ACTIVE
    const authResult = await verifyActiveUser();
    if ("error" in authResult) {
      return authResult;
    }
    const { userId: callerId } = authResult;

    // Check rate limit
    const rateLimitResult = checkMembershipRateLimit(callerId);
    if ("error" in rateLimitResult) {
      return rateLimitResult;
    }

    // Verify access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: callerId },
          select: { role: true },
        },
      },
    });

    if (!project) {
      return { error: "Project not found" };
    }

    const isOwner = project.userId === callerId;
    const isMember = project.members.length > 0;

    if (!isOwner && !isMember) {
      return { error: "You don't have access to this project" };
    }

    // Ensure room exists
    const ensureResult = await ensureProjectRoom(projectId, callerId);

    if (!ensureResult.success) {
      return { error: ensureResult.error || "Failed to initialize chat" };
    }

    // Sync members
    const syncResult = await syncProjectMembers(projectId, callerId);

    return {
      success: true,
      matrixRoomId: ensureResult.matrixRoomId,
      sync: syncResult,
    };
  } catch (error) {
    console.error("Initialize project chat error:", error);
    return { error: "Failed to initialize chat" };
  }
}
