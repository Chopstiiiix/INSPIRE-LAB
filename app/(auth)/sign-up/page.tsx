"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@/lib/validations";
import { signUp, verifyInviteCode } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { z } from "zod";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get("invite");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCodeStatus, setInviteCodeStatus] = useState<{
    checking: boolean;
    valid: boolean;
    error?: string;
    remainingUses?: number;
  }>({ checking: false, valid: false });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      inviteCode: inviteParam || "",
    },
  });

  const inviteCode = watch("inviteCode");

  // Verify invite code on change
  useEffect(() => {
    const verifyCode = async () => {
      if (!inviteCode || inviteCode.length < 3) {
        setInviteCodeStatus({ checking: false, valid: false });
        return;
      }

      setInviteCodeStatus({ checking: true, valid: false });

      const result = await verifyInviteCode(inviteCode);

      if (result.valid) {
        setInviteCodeStatus({
          checking: false,
          valid: true,
          remainingUses: result.remainingUses,
        });
      } else {
        setInviteCodeStatus({
          checking: false,
          valid: false,
          error: result.error,
        });
      }
    };

    const debounce = setTimeout(verifyCode, 500);
    return () => clearTimeout(debounce);
  }, [inviteCode]);

  const onSubmit = async (data: SignUpForm) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await signUp(data);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Auto sign in after signup
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but sign in failed. Please sign in manually.");
        router.push("/sign-in");
      } else {
        // User is PENDING, will be redirected to onboarding by middleware
        router.push("/onboarding");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md border border-border p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Join INSPIRE-LAB</h1>
          <p className="text-muted-foreground mt-2">
            Create your account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Invite Code */}
          <div className="space-y-2">
            <Label htmlFor="inviteCode">
              Invite Code <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="inviteCode"
                type="text"
                placeholder="Enter your invite code"
                {...register("inviteCode")}
                disabled={isLoading}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {inviteCodeStatus.checking && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                {!inviteCodeStatus.checking && inviteCodeStatus.valid && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {!inviteCodeStatus.checking && inviteCode && !inviteCodeStatus.valid && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>
            {errors.inviteCode && (
              <p className="text-sm text-destructive">{errors.inviteCode.message}</p>
            )}
            {inviteCodeStatus.valid && inviteCodeStatus.remainingUses !== undefined && (
              <p className="text-sm text-green-600">
                Valid code ({inviteCodeStatus.remainingUses} uses remaining)
              </p>
            )}
            {inviteCodeStatus.error && (
              <p className="text-sm text-destructive">{inviteCodeStatus.error}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          {error && (
            <div className="p-3 border border-destructive bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !inviteCodeStatus.valid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary underline hover:no-underline">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Don't have an invite code?{" "}
            <Link href="/" className="text-primary underline hover:no-underline">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
