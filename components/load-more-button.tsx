"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function LoadMoreButton({ cursor }: { cursor: string }) {
  const router = useRouter();

  return (
    <div className="flex justify-center">
      <Button
        variant="secondary"
        onClick={() => {
          router.push(`/?cursor=${cursor}`);
        }}
      >
        Load More
      </Button>
    </div>
  );
}
