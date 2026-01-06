"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X, CheckCircle2 } from "lucide-react";

const onboardingSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Handle can only contain letters, numbers, hyphens, and underscores"
    ),
  roleTitle: z.string().min(1, "Role title is required").max(100),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  avatar: z.string().optional(),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        url: z.string().url(),
      })
    )
    .optional(),
  skillIds: z.array(z.string()).min(3, "Select at least 3 skills"),
  toolIds: z.array(z.string()).optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

interface SkillTag {
  id: string;
  name: string;
  category: string;
}

interface ToolTag {
  id: string;
  name: string;
  category: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  handle: string | null;
}

interface OnboardingFormClientProps {
  user: User;
  skillTags: SkillTag[];
  toolTags: ToolTag[];
}

export function OnboardingFormClient({
  user,
  skillTags,
  toolTags,
}: OnboardingFormClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      handle: user.handle || "",
      links: [],
      skillIds: [],
      toolIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "links",
  });

  // Group tags by category
  const groupedSkills = skillTags.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillTag[]>);

  const groupedTools = toolTags.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolTag[]>);

  // Filter skills by search
  const filteredGroupedSkills = Object.entries(groupedSkills).reduce(
    (acc, [category, skills]) => {
      const filtered = skills.filter((skill) =>
        skill.name.toLowerCase().includes(skillSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, SkillTag[]>
  );

  // Filter tools by search
  const filteredGroupedTools = Object.entries(groupedTools).reduce(
    (acc, [category, tools]) => {
      const filtered = tools.filter((tool) =>
        tool.name.toLowerCase().includes(toolSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, ToolTag[]>
  );

  const toggleSkill = (skillId: string) => {
    const newSelected = selectedSkillIds.includes(skillId)
      ? selectedSkillIds.filter((id) => id !== skillId)
      : [...selectedSkillIds, skillId];
    setSelectedSkillIds(newSelected);
    setValue("skillIds", newSelected);
  };

  const toggleTool = (toolId: string) => {
    const newSelected = selectedToolIds.includes(toolId)
      ? selectedToolIds.filter((id) => id !== toolId)
      : [...selectedToolIds, toolId];
    setSelectedToolIds(newSelected);
    setValue("toolIds", newSelected);
  };

  const onSubmit = async (data: OnboardingForm) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await completeOnboarding(data);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Redirect to discover page
      router.push("/discover");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Info Section */}
      <div className="border border-border p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Basic Information</h2>

        <div className="space-y-2">
          <Label htmlFor="handle">
            Handle <span className="text-destructive">*</span>
          </Label>
          <Input
            id="handle"
            type="text"
            placeholder="your-handle"
            {...register("handle")}
            disabled={isLoading}
          />
          {errors.handle && (
            <p className="text-sm text-destructive">{errors.handle.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Your unique username (e.g., john-doe)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleTitle">
            Role Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="roleTitle"
            type="text"
            placeholder="e.g., Full-Stack Developer"
            {...register("roleTitle")}
            disabled={isLoading}
          />
          {errors.roleTitle && (
            <p className="text-sm text-destructive">
              {errors.roleTitle.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself..."
            {...register("bio")}
            disabled={isLoading}
            rows={4}
          />
          {errors.bio && (
            <p className="text-sm text-destructive">{errors.bio.message}</p>
          )}
          <p className="text-xs text-muted-foreground">Max 500 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            type="text"
            placeholder="e.g., San Francisco, CA"
            {...register("location")}
            disabled={isLoading}
          />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://yourwebsite.com"
            {...register("website")}
            disabled={isLoading}
          />
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </div>
      </div>

      {/* Links Section */}
      <div className="border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Social Links</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ label: "", url: "" })}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add links to your social profiles, portfolio, etc.
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-start">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`links.${index}.label`}>Label</Label>
              <Input
                id={`links.${index}.label`}
                type="text"
                placeholder="e.g., GitHub"
                {...register(`links.${index}.label` as const)}
                disabled={isLoading}
              />
              {errors.links?.[index]?.label && (
                <p className="text-sm text-destructive">
                  {errors.links[index]?.label?.message}
                </p>
              )}
            </div>
            <div className="flex-[2] space-y-2">
              <Label htmlFor={`links.${index}.url`}>URL</Label>
              <Input
                id={`links.${index}.url`}
                type="url"
                placeholder="https://github.com/username"
                {...register(`links.${index}.url` as const)}
                disabled={isLoading}
              />
              {errors.links?.[index]?.url && (
                <p className="text-sm text-destructive">
                  {errors.links[index]?.url?.message}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={isLoading}
              className="mt-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Skills Section */}
      <div className="border border-border p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Skills <span className="text-destructive">*</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select at least 3 skills (selected: {selectedSkillIds.length})
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skillSearch">Search Skills</Label>
          <Input
            id="skillSearch"
            type="text"
            placeholder="Search for skills..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(filteredGroupedSkills).map(([category, skills]) => (
            <div key={category}>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${
                      selectedSkillIds.includes(skill.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {skill.name}
                    {selectedSkillIds.includes(skill.id) && (
                      <CheckCircle2 className="inline-block ml-1 h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {errors.skillIds && (
          <p className="text-sm text-destructive">{errors.skillIds.message}</p>
        )}
      </div>

      {/* Tools Section */}
      <div className="border border-border p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Tools & Technologies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Optional - Select tools you're familiar with (selected:{" "}
            {selectedToolIds.length})
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toolSearch">Search Tools</Label>
          <Input
            id="toolSearch"
            type="text"
            placeholder="Search for tools..."
            value={toolSearch}
            onChange={(e) => setToolSearch(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(filteredGroupedTools).map(([category, tools]) => (
            <div key={category}>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${
                      selectedToolIds.includes(tool.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {tool.name}
                    {selectedToolIds.includes(tool.id) && (
                      <CheckCircle2 className="inline-block ml-1 h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 border border-destructive bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || selectedSkillIds.length < 3}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Completing profile...
          </>
        ) : (
          "Complete Profile"
        )}
      </Button>
    </form>
  );
}
