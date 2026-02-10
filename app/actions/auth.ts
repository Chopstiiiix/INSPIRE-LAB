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

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Create user with PENDING status
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name,
        status: "PENDING", // User must complete onboarding
      },
    });

    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Sign up error:", error);
    return { error: "Failed to create account" };
  }
}
