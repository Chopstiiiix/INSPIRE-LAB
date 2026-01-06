import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllSkillTags, getAllToolTags } from "@/app/actions/profile";
import { ProfileSettings } from "@/components/profile-settings";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Load current user profile
  const user = await prisma.user.findUnique({
    where: { id: session.user.id, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      handle: true,
      email: true,
      roleTitle: true,
      bio: true,
      location: true,
      website: true,
      avatar: true,
      userSkills: {
        include: {
          skillTag: true,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      },
      userTools: {
        include: {
          toolTag: true,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      },
      links: {
        orderBy: { order: "asc" },
      },
      projects: {
        orderBy: { createdAt: "desc" },
      },
      qualifications: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Load all available tags for adding new skills/tools
  const [skillTagsResult, toolTagsResult] = await Promise.all([
    getAllSkillTags(),
    getAllToolTags(),
  ]);

  return (
    <ProfileSettings
      user={user}
      skillTags={skillTagsResult.tags || []}
      toolTags={toolTagsResult.tags || []}
    />
  );
}
