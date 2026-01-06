"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toolSchema } from "@/lib/validations";
import { addTool, deleteTool } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useRouter } from "next/navigation";
import { z } from "zod";

type ToolForm = z.infer<typeof toolSchema>;

export function ToolsSection({ tools }: { tools: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ToolForm>({
    resolver: zodResolver(toolSchema),
  });

  const onSubmit = async (data: ToolForm) => {
    setError(null);
    const result = await addTool(data);

    if (result.error) {
      setError(result.error);
    } else {
      reset();
      setIsAdding(false);
      router.refresh();
    }
  };

  const handleDelete = async (toolId: string) => {
    await deleteTool(toolId);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <h2 className="text-2xl font-bold mb-6">Tools</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {tools.map((tool) => (
          <div key={tool.id} className="border border-white px-3 py-1 flex items-center gap-2">
            <span>{tool.name}</span>
            <button onClick={() => handleDelete(tool.id)} className="text-error">
              ×
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Tool Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {error && <div className="p-3 border border-error text-error text-sm">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit">Add Tool</Button>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setIsAdding(true)}>
          Add Tool
        </Button>
      )}
    </div>
  );
}
