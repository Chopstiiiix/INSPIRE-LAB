"use client";

import { useState } from "react";
import { followUser, unfollowUser } from "@/app/actions/follow";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
}

export function FollowButton({ userId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFollow = async () => {
    setIsLoading(true);
    const result = isFollowing ? await unfollowUser(userId) : await followUser(userId);

    if (!result.error) {
      setIsFollowing(!isFollowing);
      router.refresh();
    }

    setIsLoading(false);
  };

  return (
    <Button variant={isFollowing ? "secondary" : "default"} onClick={handleFollow} disabled={isLoading}>
      {isLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}
