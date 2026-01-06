"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema } from "@/lib/validations";
import { addProject, deleteProject } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useRouter } from "next/navigation";
import { z } from "zod";

type ProjectForm = z.infer<typeof projectSchema>;

export function ProjectsSection({ projects }: { projects: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = async (data: ProjectForm) => {
    setError(null);
    const result = await addProject(data);

    if (result.error) {
      setError(result.error);
    } else {
      reset();
      setIsAdding(false);
      router.refresh();
    }
  };

  const handleDelete = async (projectId: string) => {
    await deleteProject(projectId);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <h2 className="text-2xl font-bold mb-6">Projects</h2>

      <div className="space-y-3 mb-4">
        {projects.map((project) => (
          <div key={project.id} className="border border-white p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold">{project.title}</h3>
              <Button variant="destructive" onClick={() => handleDelete(project.id)}>
                Delete
              </Button>
            </div>
            {project.description && <p className="text-sm mb-2">{project.description}</p>}
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                {project.url}
              </a>
            )}
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...register("url")} />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
          </div>

          {error && <div className="p-3 border border-error text-error text-sm">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit">Add Project</Button>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setIsAdding(true)}>
          Add Project
        </Button>
      )}
    </div>
  );
}
