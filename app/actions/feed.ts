"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface FeedFilters {
  search?: string;
  skillTagIds?: string[];
  toolTagIds?: string[];
  location?: string;
  hasActiveProject?: boolean;
  sortBy?: "newest" | "following" | "relevance";
  cursor?: string;
  limit?: number;
}

export async function getFeed(filters: FeedFilters = {}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const {
      search,
      skillTagIds = [],
      toolTagIds = [],
      location,
      hasActiveProject,
      sortBy = "newest",
      cursor,
      limit = 20,
    } = filters;

    const viewerId = session.user.id;

    // Get viewer's skills and tools for relevance sorting
    const viewerProfile = await prisma.user.findUnique({
      where: { id: viewerId },
      select: {
        userSkills: { select: { skillTagId: true } },
        userTools: { select: { toolTagId: true } },
      },
    });

    const viewerSkillIds = viewerProfile?.userSkills.map((s) => s.skillTagId) || [];
    const viewerToolIds = viewerProfile?.userTools.map((t) => t.toolTagId) || [];

    // Build where clause
    const where: any = {
      status: "ACTIVE", // Only show ACTIVE users (excludes SUSPENDED and PENDING)
      id: { not: viewerId }, // Exclude viewer
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { handle: { contains: search, mode: "insensitive" } },
        { roleTitle: { contains: search, mode: "insensitive" } },
        {
          userSkills: {
            some: {
              skillTag: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
        {
          userTools: {
            some: {
              toolTag: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    // Skill tags filter
    if (skillTagIds.length > 0) {
      where.userSkills = {
        some: {
          skillTagId: { in: skillTagIds },
        },
      };
    }

    // Tool tags filter
    if (toolTagIds.length > 0) {
      where.userTools = {
        some: {
          toolTagId: { in: toolTagIds },
        },
      };
    }

    // Location filter
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }

    // Has active project filter
    if (hasActiveProject) {
      where.projects = {
        some: {
          status: "ACTIVE",
        },
      };
    }

    // Cursor pagination
    if (cursor) {
      where.id = { lt: cursor };
    }

    // Base query for all users
    let users = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        handle: true,
        avatar: true,
        roleTitle: true,
        location: true,
        createdAt: true,
        userSkills: {
          where: { featured: true },
          take: 3,
          select: {
            id: true,
            level: true,
            skillTag: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        userTools: {
          where: { featured: true },
          take: 5,
          select: {
            id: true,
            toolTag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        projects: {
          where: { status: "ACTIVE" },
          take: 1,
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Get viewer's follow relationships for all users in one query
    const userIds = users.map((u) => u.id);
    const followRelationships = await prisma.follow.findMany({
      where: {
        followerId: viewerId,
        followingId: { in: userIds },
      },
      select: {
        followingId: true,
      },
    });

    const followedUserIds = new Set(followRelationships.map((f) => f.followingId));

    // Calculate relevance scores if sorting by relevance
    if (sortBy === "relevance" && (viewerSkillIds.length > 0 || viewerToolIds.length > 0)) {
      users = users.map((user) => {
        const userSkillIds = user.userSkills.map((s) => s.skillTag.id);
        const userToolIds = user.userTools.map((t) => t.toolTag.id);

        const sharedSkills = userSkillIds.filter((id) => viewerSkillIds.includes(id)).length;
        const sharedTools = userToolIds.filter((id) => viewerToolIds.includes(id)).length;

        const relevanceScore = sharedSkills * 2 + sharedTools; // Weight skills 2x more than tools

        return { ...user, _relevanceScore: relevanceScore };
      }) as any;

      users.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);
    }

    // Sort by following first
    if (sortBy === "following") {
      users.sort((a, b) => {
        const aFollowed = followedUserIds.has(a.id) ? 1 : 0;
        const bFollowed = followedUserIds.has(b.id) ? 1 : 0;
        return bFollowed - aFollowed;
      });
    }

    // Map users to feed tiles with viewer state
    const tiles = users.map((user) => ({
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      roleTitle: user.roleTitle,
      location: user.location,
      featuredSkills: user.userSkills.map((us) => ({
        id: us.id,
        name: us.skillTag.name,
        category: us.skillTag.category,
        level: us.level,
      })),
      featuredTools: user.userTools.map((ut) => ({
        id: ut.id,
        name: ut.toolTag.name,
      })),
      activeProject: user.projects[0] || null,
      isFollowing: followedUserIds.has(user.id),
    }));

    const nextCursor = users.length === limit ? users[users.length - 1].id : null;

    return {
      success: true,
      tiles,
      nextCursor,
      hasMore: users.length === limit,
    };
  } catch (error) {
    console.error("Get feed error:", error);
    return { error: "Failed to load feed" };
  }
}

export async function toggleFollow(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const viewerId = session.user.id;

    // Prevent self-follow
    if (viewerId === userId) {
      return { error: "Cannot follow yourself" };
    }

    // Check if target user exists and is active
    const targetUser = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: userId,
        },
      },
    });

    let isFollowing: boolean;

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: userId,
          },
        },
      });
      isFollowing = false;
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: viewerId,
          followingId: userId,
        },
      });
      isFollowing = true;
    }

    // Get updated counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: userId },
      }),
      prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      success: true,
      isFollowing,
      followersCount,
      followingCount,
    };
  } catch (error) {
    console.error("Toggle follow error:", error);
    return { error: "Failed to toggle follow" };
  }
}
