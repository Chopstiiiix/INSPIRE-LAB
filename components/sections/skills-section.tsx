"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { skillSchema } from "@/lib/validations";
import { addSkill, deleteSkill } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useRouter } from "next/navigation";
import { z } from "zod";

type SkillForm = z.infer<typeof skillSchema>;

export function SkillsSection({ skills }: { skills: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SkillForm>({
    resolver: zodResolver(skillSchema),
  });

  const onSubmit = async (data: SkillForm) => {
    setError(null);
    const result = await addSkill(data);

    if (result.error) {
      setError(result.error);
    } else {
      reset();
      setIsAdding(false);
      router.refresh();
    }
  };

  const handleDelete = async (skillId: string) => {
    await deleteSkill(skillId);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <h2 className="text-2xl font-bold mb-6">Skills</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {skills.map((skill) => (
          <div key={skill.id} className="border border-white px-3 py-1 flex items-center gap-2">
            <span>{skill.name}</span>
            <button onClick={() => handleDelete(skill.id)} className="text-error">
              ×
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Skill Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {error && <div className="p-3 border border-error text-error text-sm">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit">Add Skill</Button>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setIsAdding(true)}>
          Add Skill
        </Button>
      )}
    </div>
  );
}
