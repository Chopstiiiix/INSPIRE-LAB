import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DirectoryFeed } from "@/components/directory-feed";
import { prisma } from "@/lib/prisma";

export default async function AppHomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Check user status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  // Redirect based on status
  if (user?.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (user?.status === "PENDING") {
    redirect("/onboarding");
  }

  // Load all skill and tool tags for filters
  const [skillTags, toolTags] = await Promise.all([
    prisma.skillTag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.toolTag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen">
      <DirectoryFeed skillTags={skillTags} toolTags={toolTags} />
    </div>
  );
}
