"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { qualificationSchema } from "@/lib/validations";
import { createQualification, deleteQualification } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useRouter } from "next/navigation";
import { z } from "zod";

type QualificationForm = z.infer<typeof qualificationSchema>;

export function QualificationsSection({ qualifications }: { qualifications: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QualificationForm>({
    resolver: zodResolver(qualificationSchema),
  });

  const onSubmit = async (data: QualificationForm) => {
    setError(null);
    const result = await createQualification({ ...data, visibility: "PUBLIC" });

    if (result.error) {
      setError(result.error);
    } else {
      reset();
      setIsAdding(false);
      router.refresh();
    }
  };

  const handleDelete = async (qualificationId: string) => {
    await deleteQualification(qualificationId);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <h2 className="text-2xl font-bold mb-6">Qualifications</h2>

      <div className="space-y-3 mb-4">
        {qualifications.map((qual) => (
          <div key={qual.id} className="border border-white p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold">{qual.title}</h3>
                {qual.institution && <p className="text-sm opacity-75">{qual.institution}</p>}
                {qual.year && <p className="text-sm opacity-75">{qual.year}</p>}
              </div>
              <Button variant="destructive" onClick={() => handleDelete(qual.id)}>
                Delete
              </Button>
            </div>
            {qual.description && <p className="text-sm">{qual.description}</p>}
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
            <Label htmlFor="institution">Institution</Label>
            <Input id="institution" {...register("institution")} />
            {errors.institution && (
              <p className="text-sm text-destructive">{errors.institution.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" {...register("year")} />
            {errors.year && (
              <p className="text-sm text-destructive">{errors.year.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {error && <div className="p-3 border border-error text-error text-sm">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit">Add Qualification</Button>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setIsAdding(true)}>
          Add Qualification
        </Button>
      )}
    </div>
  );
}
