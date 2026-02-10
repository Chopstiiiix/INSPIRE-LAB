"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/validations";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AvatarUpload } from "./avatar-upload";
import { LinksSection } from "./sections/links-section";
import { SkillsSection } from "./sections/skills-section";
import { ToolsSection } from "./sections/tools-section";
import { ProjectsSection } from "./sections/projects-section";
import { QualificationsSection } from "./sections/qualifications-section";
import { z } from "zod";

type ProfileForm = z.infer<typeof profileSchema>;

interface ProfileEditFormProps {
  user: any;
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || "",
      handle: user.handle || "",
      roleTitle: user.roleTitle || "",
      bio: user.bio || "",
      location: user.location || "",
      avatar: user.avatar || "",
      avatarVisibility: user.avatarVisibility || "PUBLIC",
    },
  });

  const avatar = watch("avatar");
  const avatarVisibility = watch("avatarVisibility");

  const onSubmit = async (data: ProfileForm) => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const result = await updateProfile(data);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="border border-white p-6">
        <h2 className="text-2xl font-bold mb-6">Basic Information</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AvatarUpload
            currentAvatar={avatar}
            onUploadComplete={(url) => setValue("avatar", url)}
            currentVisibility={avatarVisibility}
            onVisibilityChange={(vis) => setValue("avatarVisibility", vis as "PUBLIC" | "PRIVATE" | "CONNECTIONS_ONLY")}
          />

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input id="handle" {...register("handle")} />
            {errors.handle && (
              <p className="text-sm text-destructive">{errors.handle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleTitle">Role Title</Label>
            <Input id="roleTitle" {...register("roleTitle")} />
            {errors.roleTitle && (
              <p className="text-sm text-destructive">{errors.roleTitle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={4} {...register("bio")} />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          {error && <div className="p-3 border border-error text-error text-sm">{error}</div>}

          {success && (
            <div className="p-3 border border-success text-success text-sm">
              Profile updated successfully!
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </div>

      <LinksSection links={user.links} />
      <SkillsSection skills={user.userSkills} />
      <ToolsSection tools={user.userTools} />
      <ProjectsSection projects={user.projects} />
      <QualificationsSection qualifications={user.qualifications} />
    </div>
  );
}
