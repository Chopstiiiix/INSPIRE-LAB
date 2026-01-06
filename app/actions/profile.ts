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
          orderBy: { issuedAt: "desc" },
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
      if (project.visibility === "MEMBERS" && viewerUserId) return true;
      if (project.visibility === "FOLLOWERS" && isFollowing) return true;
      return false;
    });

    // Filter qualifications based on visibility
    const filteredQualifications = user.qualifications.filter((qual) => {
      if (viewerUserId === user.id) return true; // Owner sees all
      if (qual.visibility === "PUBLIC") return true;
      if (qual.visibility === "MEMBERS" && viewerUserId) return true;
      if (qual.visibility === "FOLLOWERS" && isFollowing) return true;
      return false;
    });

    return {
      success: true,
      user: {
        ...user,
        projects: filteredProjects,
        qualifications: filteredQualifications,
      },
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
  visibility: z.enum(["PUBLIC", "MEMBERS", "FOLLOWERS"]).default("PUBLIC"),
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
  visibility: z.enum(["PUBLIC", "MEMBERS", "FOLLOWERS"]).default("PUBLIC"),
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
