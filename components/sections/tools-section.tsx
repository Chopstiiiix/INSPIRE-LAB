"use client";

import { useState } from "react";
import { removeTool } from "@/app/actions/profile";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ToolsSection({ tools }: { tools: any[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (toolId: string) => {
    setIsDeleting(toolId);
    await removeTool(toolId);
    setIsDeleting(null);
    router.refresh();
  };

  return (
    <div className="border border-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tools</h2>
        <Link href="/me/settings">
          <Button variant="secondary" size="sm">
            Manage Tools
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {tools.length === 0 ? (
          <p className="text-muted-foreground">No tools added yet.</p>
        ) : (
          tools.map((tool) => (
            <div key={tool.id} className="border border-white px-3 py-1 flex items-center gap-2">
              <span>{tool.toolTag?.name || tool.name}</span>
              <button
                onClick={() => handleDelete(tool.id)}
                className="text-error"
                disabled={isDeleting === tool.id}
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
