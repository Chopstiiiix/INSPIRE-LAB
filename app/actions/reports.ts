"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ==================== CREATE REPORT ====================

const createReportSchema = z.object({
  reportedId: z.string(),
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "INAPPROPRIATE_CONTENT",
    "IMPERSONATION",
    "FALSE_INFORMATION",
    "OTHER",
  ]),
  description: z.string().max(1000).optional(),
});

export async function createReport(data: z.infer<typeof createReportSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const validated = createReportSchema.parse(data);

    // Prevent self-reporting
    if (session.user.id === validated.reportedId) {
      return { error: "Cannot report yourself" };
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.reportedId },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reportedId: validated.reportedId,
        reason: validated.reason,
        description: validated.description,
        status: "PENDING",
      },
    });

    return { success: true, report };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create report error:", error);
    return { error: "Failed to create report" };
  }
}

// ==================== GET REPORTS (ADMIN ONLY) ====================

interface GetReportsFilters {
  status?: "PENDING" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  cursor?: string;
  limit?: number;
}

export async function getReports(filters: GetReportsFilters = {}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN" && user?.role !== "MODERATOR") {
      return { error: "Unauthorized - Admin access required" };
    }

    const { status, cursor, limit = 50 } = filters;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (cursor) {
      where.id = { lt: cursor };
    }

    const reports = await prisma.report.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatar: true,
          },
        },
        reported: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    const nextCursor = reports.length === limit ? reports[reports.length - 1].id : null;

    return {
      success: true,
      reports,
      nextCursor,
      hasMore: reports.length === limit,
    };
  } catch (error) {
    console.error("Get reports error:", error);
    return { error: "Failed to load reports" };
  }
}

// ==================== UPDATE REPORT STATUS (ADMIN ONLY) ====================

const updateReportSchema = z.object({
  reportId: z.string(),
  status: z.enum(["PENDING", "INVESTIGATING", "RESOLVED", "DISMISSED"]),
  resolution: z.string().max(500).optional(),
});

export async function updateReportStatus(data: z.infer<typeof updateReportSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN" && user?.role !== "MODERATOR") {
      return { error: "Unauthorized - Admin access required" };
    }

    const validated = updateReportSchema.parse(data);

    const report = await prisma.report.update({
      where: { id: validated.reportId },
      data: {
        status: validated.status,
        resolution: validated.resolution,
        resolvedAt: validated.status === "RESOLVED" || validated.status === "DISMISSED"
          ? new Date()
          : null,
        resolvedBy: validated.status === "RESOLVED" || validated.status === "DISMISSED"
          ? session.user.id
          : null,
      },
    });

    revalidatePath("/app/admin/reports");

    return { success: true, report };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Update report status error:", error);
    return { error: "Failed to update report status" };
  }
}

// ==================== SUSPEND USER (ADMIN ONLY) ====================

export async function suspendUser(userId: string, reason?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN" && adminUser?.role !== "MODERATOR") {
      return { error: "Unauthorized - Admin access required" };
    }

    // Prevent self-suspension
    if (session.user.id === userId) {
      return { error: "Cannot suspend yourself" };
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    // Prevent suspending other admins
    if (targetUser.role === "ADMIN" || targetUser.role === "MODERATOR") {
      return { error: "Cannot suspend admin or moderator users" };
    }

    // Update user status to SUSPENDED
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });

    revalidatePath("/app/admin/reports");
    revalidatePath("/app");

    return { success: true, user };
  } catch (error) {
    console.error("Suspend user error:", error);
    return { error: "Failed to suspend user" };
  }
}

// ==================== UNSUSPEND USER (ADMIN ONLY) ====================

export async function unsuspendUser(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN" && adminUser?.role !== "MODERATOR") {
      return { error: "Unauthorized - Admin access required" };
    }

    // Update user status to ACTIVE
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    revalidatePath("/app/admin/reports");
    revalidatePath("/app");

    return { success: true, user };
  } catch (error) {
    console.error("Unsuspend user error:", error);
    return { error: "Failed to unsuspend user" };
  }
}
