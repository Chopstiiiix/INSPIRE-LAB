"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { linkSchema } from "@/lib/validations";
import { addLink, deleteLink } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useRouter } from "next/navigation";
import { z } from "zod";

type LinkForm = z.infer<typeof linkSchema>;

export function LinksSection({ links }: { links: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LinkForm>({
    resolver: zodResolver(linkSchema),
  });

  const onSubmit = async (data: LinkForm) => {
    setError(null);
    const result = await addLink(data);

    if (result.error) {
      setError(result.error);
    } else {
      reset();
      setIsAdding(false);
      router.refresh();
    }
  };

  const handleDelete = async (linkId: string) => {
    await deleteLink(linkId);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <h2 className="text-2xl font-bold mb-6">Links</h2>

      <div className="space-y-3 mb-4">
        {links.map((link) => (
          <div key={link.id} className="flex items-center justify-between border border-white p-3">
            <div>
              <p className="font-medium">{link.label}</p>
              <p className="text-sm opacity-75">{link.url}</p>
            </div>
            <Button variant="destructive" onClick={() => handleDelete(link.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" {...register("label")} />
            {errors.label && (
              <p className="text-sm text-destructive">{errors.label.message}</p>
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
            <Button type="submit">Add Link</Button>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setIsAdding(true)}>
          Add Link
        </Button>
      )}
    </div>
  );
}
