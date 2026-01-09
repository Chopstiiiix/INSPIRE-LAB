"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ==================== USER PROFILE ====================

export async function getUserProfile(handle: string, viewerUserId?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { handle, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        roleTitle: true,
        bio: true,
        location: true,
        website: true,
        avatar: true,
        createdAt: true,
        userSkills: {
          include: {
            skillTag: true,
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        },
        userTools: {
          include: {
            toolTag: true,
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        },
        links: {
          orderBy: { order: "asc" },
        },
        projects: {
          orderBy: { createdAt: "desc" },
        },
        qualifications: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Check if viewer follows this user
    let isFollowing = false;
    if (viewerUserId && viewerUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Filter projects based on visibility
    const filteredProjects = user.projects.filter((project) => {
      if (viewerUserId === user.id) return true; // Owner sees all
      if (project.visibility === "PUBLIC") return true;
      if (project.visibility === "CONNECTIONS_ONLY" && isFollowing) return true;
      // PRIVATE is only visible to owner (handled above)
      return false;
    });

    // Filter qualifications based on visibility
    const filteredQualifications = user.qualifications.filter((qual) => {
      if (viewerUserId === user.id) return true; // Owner sees all
      if (qual.visibility === "PUBLIC") return true;
      if (qual.visibility === "CONNECTIONS_ONLY" && isFollowing) return true;
      // PRIVATE is only visible to owner (handled above)
      return false;
    });

    // Create the full user object preserving all properties
    const fullUser = {
      id: user.id,
      name: user.name,
      handle: user.handle,
      email: user.email,
      roleTitle: user.roleTitle,
      bio: user.bio,
      location: user.location,
      website: user.website,
      avatar: user.avatar,
      createdAt: user.createdAt,
      userSkills: user.userSkills,
      userTools: user.userTools,
      links: user.links,
      projects: filteredProjects,
      qualifications: filteredQualifications,
      _count: user._count,
    };

    return {
      success: true,
      user: fullUser,
      isFollowing,
      isOwner: viewerUserId === user.id,
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    return { error: "Failed to load profile" };
  }
}

// ==================== SKILLS ====================

const addSkillSchema = z.object({
  skillTagId: z.string(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).default("INTERMEDIATE"),
  yearsOfExp: z.number().min(0).optional(),
});

export async function addSkill(data: z.infer<typeof addSkillSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = addSkillSchema.parse(data);

    // Check if already exists
    const existing = await prisma.userSkill.findUnique({
      where: {
        userId_skillTagId: {
          userId: session.user.id,
          skillTagId: validated.skillTagId,
        },
      },
    });

    if (existing) {
      return { error: "Skill already added" };
    }

    const userSkill = await prisma.userSkill.create({
      data: {
        userId: session.user.id,
        skillTagId: validated.skillTagId,
        level: validated.level,
        yearsOfExp: validated.yearsOfExp,
        featured: false,
      },
      include: {
        skillTag: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, userSkill };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Add skill error:", error);
    return { error: "Failed to add skill" };
  }
}

export async function removeSkill(userSkillId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.userSkill.delete({
      where: {
        id: userSkillId,
        userId: session.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true };
  } catch (error) {
    console.error("Remove skill error:", error);
    return { error: "Failed to remove skill" };
  }
}

export async function toggleSkillFeatured(userSkillId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const userSkill = await prisma.userSkill.findUnique({
      where: { id: userSkillId, userId: session.user.id },
    });

    if (!userSkill) {
      return { error: "Skill not found" };
    }

    const updated = await prisma.userSkill.update({
      where: { id: userSkillId },
      data: { featured: !userSkill.featured },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, featured: updated.featured };
  } catch (error) {
    console.error("Toggle skill featured error:", error);
    return { error: "Failed to update skill" };
  }
}

// ==================== TOOLS ====================

const addToolSchema = z.object({
  toolTagId: z.string(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).default("INTERMEDIATE"),
  yearsOfExp: z.number().min(0).optional(),
});

export async function addTool(data: z.infer<typeof addToolSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = addToolSchema.parse(data);

    const existing = await prisma.userTool.findUnique({
      where: {
        userId_toolTagId: {
          userId: session.user.id,
          toolTagId: validated.toolTagId,
        },
      },
    });

    if (existing) {
      return { error: "Tool already added" };
    }

    const userTool = await prisma.userTool.create({
      data: {
        userId: session.user.id,
        toolTagId: validated.toolTagId,
        level: validated.level,
        yearsOfExp: validated.yearsOfExp,
        featured: false,
      },
      include: {
        toolTag: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, userTool };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Add tool error:", error);
    return { error: "Failed to add tool" };
  }
}

export async function removeTool(userToolId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.userTool.delete({
      where: {
        id: userToolId,
        userId: session.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true };
  } catch (error) {
    console.error("Remove tool error:", error);
    return { error: "Failed to remove tool" };
  }
}

export async function toggleToolFeatured(userToolId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const userTool = await prisma.userTool.findUnique({
      where: { id: userToolId, userId: session.user.id },
    });

    if (!userTool) {
      return { error: "Tool not found" };
    }

    const updated = await prisma.userTool.update({
      where: { id: userToolId },
      data: { featured: !userTool.featured },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, featured: updated.featured };
  } catch (error) {
    console.error("Toggle tool featured error:", error);
    return { error: "Failed to update tool" };
  }
}

// ==================== PROJECTS ====================

const projectSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).default("ACTIVE"),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CONNECTIONS_ONLY"]).default("PUBLIC"),
  initializeChat: z.boolean().optional(), // Optionally create Matrix room immediately
});

export async function createProject(data: z.infer<typeof projectSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = projectSchema.parse(data);

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        title: validated.title,
        description: validated.description || null,
        url: validated.url || null,
        status: validated.status,
        visibility: validated.visibility,
      },
    });

    // Optionally initialize Matrix room for the project
    if (validated.initializeChat) {
      try {
        const { ensureProjectRoom } = await import("@/server/chatProvisioning");
        await ensureProjectRoom(project.id, session.user.id);
      } catch (chatError) {
        console.error("[CreateProject] Chat initialization failed:", chatError);
        // Don't fail project creation
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, project };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create project error:", error);
    return { error: "Failed to create project" };
  }
}

export async function updateProject(projectId: string, data: z.infer<typeof projectSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = projectSchema.parse(data);

    // Get existing project to compare
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId, userId: session.user.id },
      select: { title: true, description: true, matrixRoomId: true },
    });

    if (!existingProject) {
      return { error: "Project not found" };
    }

    const project = await prisma.project.update({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      data: {
        title: validated.title,
        description: validated.description || null,
        url: validated.url || null,
        status: validated.status,
        visibility: validated.visibility,
      },
    });

    // Update Matrix room details if room exists and title/description changed
    if (existingProject.matrixRoomId) {
      const titleChanged = existingProject.title !== validated.title;
      const descChanged = existingProject.description !== validated.description;

      if (titleChanged || descChanged) {
        try {
          const { updateProjectRoomDetails } = await import("@/server/chatProvisioning");
          await updateProjectRoomDetails(
            projectId,
            {
              name: titleChanged ? validated.title : undefined,
              topic: descChanged ? (validated.description || "") : undefined,
            },
            session.user.id
          );
        } catch (chatError) {
          console.error("[UpdateProject] Chat update failed:", chatError);
          // Don't fail project update
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, project };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Update project error:", error);
    return { error: "Failed to update project" };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.project.delete({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true };
  } catch (error) {
    console.error("Delete project error:", error);
    return { error: "Failed to delete project" };
  }
}

// ==================== QUALIFICATIONS ====================

const qualificationSchema = z.object({
  title: z.string().min(1).max(200),
  institution: z.string().max(200).optional(),
  year: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "CONNECTIONS_ONLY"]).default("PUBLIC"),
});

export async function createQualification(data: z.infer<typeof qualificationSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = qualificationSchema.parse(data);

    const qualification = await prisma.qualification.create({
      data: {
        userId: session.user.id,
        title: validated.title,
        institution: validated.institution,
        year: validated.year,
        description: validated.description,
        visibility: validated.visibility,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, qualification };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create qualification error:", error);
    return { error: "Failed to create qualification" };
  }
}

export async function updateQualification(
  qualificationId: string,
  data: z.infer<typeof qualificationSchema>
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = qualificationSchema.parse(data);

    const qualification = await prisma.qualification.update({
      where: {
        id: qualificationId,
        userId: session.user.id,
      },
      data: {
        title: validated.title,
        institution: validated.institution,
        year: validated.year,
        description: validated.description,
        visibility: validated.visibility,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, qualification };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Update qualification error:", error);
    return { error: "Failed to update qualification" };
  }
}

export async function deleteQualification(qualificationId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.qualification.delete({
      where: {
        id: qualificationId,
        userId: session.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true };
  } catch (error) {
    console.error("Delete qualification error:", error);
    return { error: "Failed to delete qualification" };
  }
}

// ==================== GET ALL TAGS ====================

export async function getAllSkillTags() {
  try {
    const tags = await prisma.skillTag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return { success: true, tags };
  } catch (error) {
    console.error("Get skill tags error:", error);
    return { error: "Failed to load skill tags", tags: [] };
  }
}

export async function getAllToolTags() {
  try {
    const tags = await prisma.toolTag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return { success: true, tags };
  } catch (error) {
    console.error("Get tool tags error:", error);
    return { error: "Failed to load tool tags", tags: [] };
  }
}

// ==================== LINKS ====================

const linkSchema = z.object({
  label: z.string().min(1).max(50),
  url: z.string().url(),
});

export async function addLink(data: z.infer<typeof linkSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = linkSchema.parse(data);

    // Get the highest order to add new link at the end
    const lastLink = await prisma.link.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: "desc" },
    });

    const link = await prisma.link.create({
      data: {
        userId: session.user.id,
        label: validated.label,
        url: validated.url,
        order: (lastLink?.order ?? -1) + 1,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true, link };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Add link error:", error);
    return { error: "Failed to add link" };
  }
}

export async function deleteLink(linkId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.link.delete({
      where: {
        id: linkId,
        userId: session.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });
    revalidatePath(`/u/${user?.handle}`);
    revalidatePath("/me/settings");

    return { success: true };
  } catch (error) {
    console.error("Delete link error:", error);
    return { error: "Failed to delete link" };
  }
}

// ==================== UPDATE PROFILE ====================

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/),
  roleTitle: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  avatar: z.string().url().optional().or(z.literal("")),
});

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = updateProfileSchema.parse(data);

    // Check if handle is taken by another user
    if (validated.handle) {
      const existingUser = await prisma.user.findFirst({
        where: {
          handle: validated.handle,
          id: { not: session.user.id },
        },
      });

      if (existingUser) {
        return { error: "Handle is already taken" };
      }
    }

    const oldUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validated.name,
        handle: validated.handle,
        roleTitle: validated.roleTitle || null,
        bio: validated.bio || null,
        location: validated.location || null,
        avatar: validated.avatar || null,
      },
    });

    // Revalidate both old and new handle paths
    if (oldUser?.handle) {
      revalidatePath(`/u/${oldUser.handle}`);
    }
    revalidatePath(`/u/${user.handle}`);
    revalidatePath("/me/settings");

    return { success: true, user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Update profile error:", error);
    return { error: "Failed to update profile" };
  }
}
