import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inviteCode: z.string().min(1, "Invite code is required"),
  name: z.string().min(1, "Name is required"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Handle can only contain letters, numbers, hyphens, and underscores"),
  roleTitle: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  avatarVisibility: z.enum(["PUBLIC", "PRIVATE", "CONNECTIONS_ONLY"]).optional(),
});

export const linkSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  url: z.string().url("Invalid URL"),
});

export const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required").max(50),
});

export const toolSchema = z.object({
  name: z.string().min(1, "Tool name is required").max(50),
});

export const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  url: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const qualificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  institution: z.string().max(100).optional(),
  year: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
});
