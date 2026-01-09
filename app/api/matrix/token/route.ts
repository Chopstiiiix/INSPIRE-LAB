/**
 * POST /api/matrix/token
 *
 * Returns a fresh Matrix access token for the authenticated user.
 *
 * Security measures:
 * - Requires authenticated user session
 * - User must have ACTIVE status
 * - Rate limited: 10 requests per minute per user
 * - Tokens are never logged
 *
 * Response:
 * - 200: { accessToken, userId, homeserverUrl }
 * - 401: Unauthorized
 * - 403: Account not active
 * - 429: Rate limit exceeded
 * - 500: Internal error
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loginAndGetToken } from "@/lib/matrix/provisioning";
import { tokenRateLimiter } from "@/lib/rate-limit";

export async function POST() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Apply rate limiting
    const rateLimitResult = tokenRateLimiter.check(`matrix-token:${userId}`);

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
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          },
        }
      );
    }

    // Generate token
    const result = await loginAndGetToken(userId);

    if (!result.success) {
      // Determine appropriate status code based on error
      const status = result.error?.includes("not active") ? 403 : 500;

      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    // Return token with rate limit headers
    // Note: accessToken is intentionally not logged anywhere
    return NextResponse.json(
      {
        accessToken: result.accessToken,
        userId: result.userId,
        homeserverUrl: result.homeserverUrl,
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          // Prevent caching of sensitive tokens
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error) {
    // Log error without any sensitive data
    console.error("[API/matrix/token] Unexpected error occurred");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
