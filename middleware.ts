import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to auth routes, API routes, and static files
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Get session for protected routes
  const session = await auth();

  // Protect app routes (discover, etc.) - require ACTIVE status
  const protectedRoutes = ["/app", "/discover", "/profile", "/u/", "/me/"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Block non-authenticated users
    if (!session?.user?.id) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    // Check user status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });

    // Block SUSPENDED users - redirect to suspended page
    if (user?.status === "SUSPENDED") {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }

    // Block PENDING users - redirect to onboarding
    if (user?.status === "PENDING") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // User is ACTIVE, allow access
    return NextResponse.next();
  }

  // Protect /onboarding route - only for PENDING users
  if (pathname.startsWith("/onboarding")) {
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });

    // Redirect ACTIVE users away from onboarding
    if (user?.status === "ACTIVE") {
      return NextResponse.redirect(new URL("/discover", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
