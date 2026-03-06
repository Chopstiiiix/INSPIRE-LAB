import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@inspire-lab/db";
import DashboardClient from "./_components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Sync user to our DB
  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { email: authUser.email || "" },
    create: {
      supabaseId: authUser.id,
      email: authUser.email || "",
      name: authUser.user_metadata?.full_name || null,
      avatarUrl: authUser.user_metadata?.avatar_url || null,
    },
  });

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
