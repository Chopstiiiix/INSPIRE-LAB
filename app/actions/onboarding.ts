"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const onboardingSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Handle can only contain letters, numbers, hyphens, and underscores"),
  roleTitle: z.string().min(1, "Role title is required").max(100),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  avatar: z.string().optional(),
  links: z.array(z.object({
    label: z.string().min(1).max(50),
    url: z.string().url(),
  })).optional(),
  skillIds: z.array(z.string()).min(3, "Select at least 3 skills"),
  toolIds: z.array(z.string()).optional(),
});

export async function completeOnboarding(
  data: z.infer<typeof onboardingSchema>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = onboardingSchema.parse(data);

    // Check if handle is already taken
    const existing = await prisma.user.findUnique({
      where: { handle: validated.handle },
    });

    if (existing && existing.id !== session.user.id) {
      return { error: "Handle is already taken" };
    }

    // Use transaction to ensure atomicity
    const user = await prisma.$transaction(async (tx) => {
      // Update user to ACTIVE status with profile data
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          handle: validated.handle,
          roleTitle: validated.roleTitle,
          bio: validated.bio || null,
          location: validated.location || null,
          website: validated.website || null,
          avatar: validated.avatar || null,
          status: "ACTIVE",
        },
      });

      // Create links if provided
      if (validated.links && validated.links.length > 0) {
        await tx.link.createMany({
          data: validated.links.map((link, index) => ({
            userId: session.user.id,
            label: link.label,
            url: link.url,
            order: index,
          })),
        });
      }

      // Create user skills
      if (validated.skillIds && validated.skillIds.length > 0) {
        await tx.userSkill.createMany({
          data: validated.skillIds.map((skillTagId, index) => ({
            userId: session.user.id,
            skillTagId,
            level: "INTERMEDIATE", // Default level
            featured: index < 3, // First 3 are featured
          })),
        });
      }

      // Create user tools if provided
      if (validated.toolIds && validated.toolIds.length > 0) {
        await tx.userTool.createMany({
          data: validated.toolIds.map((toolTagId) => ({
            userId: session.user.id,
            toolTagId,
            level: "INTERMEDIATE", // Default level
            featured: false,
          })),
        });
      }

      return updatedUser;
    });

    revalidatePath("/app/discover");
    revalidatePath("/onboarding");

    return { success: true, user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Onboarding error:", error);
    return { error: "Failed to complete onboarding" };
  }
}

// Get all available skill tags
export async function getSkillTags() {
  try {
    const tags = await prisma.skillTag.findMany({
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });
    return { success: true, tags };
  } catch (error) {
    console.error("Get skill tags error:", error);
    return { success: false, tags: [] };
  }
}

// Get all available tool tags
export async function getToolTags() {
  try {
    const tags = await prisma.toolTag.findMany({
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });
    return { success: true, tags };
  } catch (error) {
    console.error("Get tool tags error:", error);
    return { success: false, tags: [] };
  }
}
