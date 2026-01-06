"use server";

import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function signUp(data: z.infer<typeof signUpSchema>) {
  try {
    const validated = signUpSchema.parse(data);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    // Validate invite code
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: validated.inviteCode },
    });

    if (!inviteCode) {
      return { error: "Invalid invite code" };
    }

    if (!inviteCode.enabled) {
      return { error: "This invite code has been disabled" };
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return { error: "Invite code has expired" };
    }

    if (inviteCode.usesCount >= inviteCode.maxUses) {
      return { error: "Invite code has been fully used" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create user with PENDING status
      const user = await tx.user.create({
        data: {
          email: validated.email,
          password: hashedPassword,
          name: validated.name,
          status: "PENDING", // User must complete onboarding
          invitedById: inviteCode.createdById,
        },
      });

      // Create invite redemption record
      await tx.inviteRedemption.create({
        data: {
          inviteCodeId: inviteCode.id,
          redeemedById: user.id,
        },
      });

      // Increment uses count atomically
      await tx.inviteCode.update({
        where: { id: inviteCode.id },
        data: { usesCount: { increment: 1 } },
      });

      return user;
    });

    return { success: true, user: { id: result.id, email: result.email } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Sign up error:", error);
    return { error: "Failed to create account" };
  }
}

export async function verifyInviteCode(code: string) {
  try {
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code },
    });

    if (!inviteCode) {
      return { valid: false, error: "Invalid invite code" };
    }

    if (!inviteCode.enabled) {
      return { valid: false, error: "This invite code has been disabled" };
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return { valid: false, error: "Invite code has expired" };
    }

    if (inviteCode.usesCount >= inviteCode.maxUses) {
      return { valid: false, error: "Invite code has been fully used" };
    }

    const remaining = inviteCode.maxUses - inviteCode.usesCount;
    return {
      valid: true,
      remainingUses: remaining,
      expiresAt: inviteCode.expiresAt
    };
  } catch (error) {
    console.error("Verify invite code error:", error);
    return { valid: false, error: "Failed to verify invite code" };
  }
}
