import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@inspire-lab/db";
import SettingsClient from "./_components/SettingsClient";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user) redirect("/dashboard");

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: { include: { user: true } },
      owner: true,
    },
  });
  if (!workspace) redirect("/dashboard");

  return <SettingsClient workspace={workspace} currentUser={user} />;
}
