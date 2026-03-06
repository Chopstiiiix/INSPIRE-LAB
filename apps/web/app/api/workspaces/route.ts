import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@inspire-lab/db";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();

  // Get or create user
  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {},
    create: {
      supabaseId: authUser.id,
      email: authUser.email || "",
      name: authUser.user_metadata?.full_name,
    },
  });

  // Generate unique slug
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();

  const workspace = await prisma.workspace.create({
    data: { name, description, slug, ownerId: user.id },
  });

  return NextResponse.json(workspace);
}
