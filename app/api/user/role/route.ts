import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ role: "USER" }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    return NextResponse.json({ role: user?.role || "USER" }, { status: 200 });
  } catch (error) {
    console.error("Get user role error:", error);
    return NextResponse.json({ role: "USER" }, { status: 200 });
  }
}
