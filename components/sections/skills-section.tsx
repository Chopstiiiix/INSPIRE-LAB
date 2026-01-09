"use client";

import { useState } from "react";
import { removeSkill } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SkillsSection({ skills }: { skills: any[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (skillId: string) => {
    setIsDeleting(skillId);
    await removeSkill(skillId);
    setIsDeleting(null);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Skills</h2>
        <Link href="/me/settings">
          <Button variant="secondary" size="sm">
            Manage Skills
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <p className="text-muted-foreground">No skills added yet.</p>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} className="border border-white px-3 py-1 flex items-center gap-2">
              <span>{skill.skillTag?.name || skill.name}</span>
              <button
                onClick={() => handleDelete(skill.id)}
                className="text-error"
                disabled={isDeleting === skill.id}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
