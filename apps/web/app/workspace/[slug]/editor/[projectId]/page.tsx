import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@inspire-lab/db";
import EditorClient from "./_components/EditorClient";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user) redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { files: true, workspace: true },
  });
  if (!project) redirect("/dashboard");

  return (
    <EditorClient
      project={project}
      user={user}
      wsUrl={process.env.NEXT_PUBLIC_WS_URL!}
    />
  );
}
