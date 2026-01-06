"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { completeOnboarding } from "@/app/actions/onboarding";

const onboardingSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Handle can only contain letters, numbers, hyphens, and underscores"),
  roleTitle: z.string().min(1, "Role title is required").max(100),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    handle: string | null;
  };
}

export function OnboardingForm({ user }: OnboardingFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      handle: user.handle || "",
      roleTitle: "",
    },
  });

  const onSubmit = async (data: OnboardingForm) => {
    setError(null);
    setIsLoading(true);

    const result = await completeOnboarding(data);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push("/app/discover");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Set up your handle and role to activate your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={user.name || user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="handle">Handle *</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                id="handle"
                {...register("handle")}
                placeholder="username"
                disabled={isLoading}
              />
            </div>
            {errors.handle && (
              <p className="text-sm text-destructive">{errors.handle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleTitle">Role Title *</Label>
            <Input
              id="roleTitle"
              {...register("roleTitle")}
              placeholder="e.g., Senior Software Engineer"
              disabled={isLoading}
            />
            {errors.roleTitle && (
              <p className="text-sm text-destructive">{errors.roleTitle.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Activating..." : "Activate Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
