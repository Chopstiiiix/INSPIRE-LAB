import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProjectToken, getLiveKitUrl } from "@/lib/livekit/server";
import { videoCallRateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = videoCallRateLimiter.check(`livekit:${session.user.id}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify user is ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        status: true,
        name: true,
        handle: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "User must be active to join calls" },
        { status: 403 }
      );
    }

    // Verify user is a project member (owner or collaborator)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        title: true,
        members: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = project.userId === session.user.id;
    const isMember = project.members.length > 0;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "You must be a project member to join the call" },
        { status: 403 }
      );
    }

    // Generate LiveKit token
    const displayName = user.name || user.handle || "Anonymous";
    const identity = user.handle || user.id;

    const { token, roomName } = await generateProjectToken(
      projectId,
      identity,
      displayName,
      { isHost: isOwner }
    );

    return NextResponse.json({
      token,
      url: getLiveKitUrl(),
      roomName,
      projectTitle: project.title,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
