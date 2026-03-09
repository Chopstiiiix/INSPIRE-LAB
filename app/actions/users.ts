"use server";

import { prisma } from "@/lib/prisma";

export async function getUsers(cursor?: string, limit: number = 12) {
  try {
    const users = await prisma.user.findMany({
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        handle: true,
        avatar: true,
        roleTitle: true,
        bio: true,
        location: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id;
    }

    return {
      users,
      nextCursor,
    };
  } catch (error) {
    console.error("Get users error:", error);
    return { users: [], nextCursor: undefined };
  }
}
