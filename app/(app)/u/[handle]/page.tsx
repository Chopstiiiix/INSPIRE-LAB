import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions/profile";
import { ProfileView } from "@/components/profile-view";

interface ProfilePageProps {
  params: Promise<{
    handle: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { handle } = await params;
  const result = await getUserProfile(handle, session.user.id);

  if (result.error || !result.user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-muted-foreground">{result.error || "User does not exist"}</p>
      </div>
    );
  }

  return (
    <ProfileView
      user={result.user}
      isOwner={result.isOwner || false}
      isFollowing={result.isFollowing || false}
      viewerId={session.user.id}
    />
  );
}
