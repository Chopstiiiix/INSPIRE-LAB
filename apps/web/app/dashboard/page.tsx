import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@inspire-lab/db";
import DashboardClient from "./_components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Sync user to our DB — find by supabaseId first, then fall back to email
  let user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });

  if (!user && authUser.email) {
    // User may exist from a previous signup attempt with a different supabaseId
    user = await prisma.user.findUnique({
      where: { email: authUser.email },
    });
    if (user) {
      // Link existing email-matched user to current supabase account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: authUser.id },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId: authUser.id,
        email: authUser.email || "",
        name: authUser.user_metadata?.full_name || null,
        avatarUrl: authUser.user_metadata?.avatar_url || null,
      },
    });
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: { members: true, projects: true },
    orderBy: { updatedAt: "desc" },
  });

  return <DashboardClient user={user} workspaces={workspaces} />;
}
