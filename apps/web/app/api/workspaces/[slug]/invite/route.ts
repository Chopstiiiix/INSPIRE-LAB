import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@inspire-lab/db";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role = "EDITOR" } = await req.json();

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 });

  const member = await prisma.member.upsert({
    where: { userId_workspaceId: { userId: invitedUser.id, workspaceId: workspace.id } },
    update: { role },
    create: { userId: invitedUser.id, workspaceId: workspace.id, role },
  });

  return NextResponse.json(member);
}
