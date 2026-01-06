import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/components/profile-edit-form";

async function getCurrentUserProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      links: { orderBy: { order: "asc" } },
      skills: { orderBy: { order: "asc" } },
      tools: { orderBy: { order: "asc" } },
      projects: { orderBy: { order: "asc" } },
      qualifications: { orderBy: { order: "asc" } },
    },
  });

  return user;
}

export default async function EditProfilePage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
      <ProfileEditForm user={user} />
    </div>
  );
}
