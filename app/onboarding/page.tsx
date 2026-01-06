import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingFormClient } from "@/components/onboarding-form-client";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      handle: true,
      status: true,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  if (user.status === "ACTIVE") {
    redirect("/app");
  }

  // Load skill and tool tags
  const [skillTags, toolTags] = await Promise.all([
    prisma.skillTag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.toolTag.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Welcome to INSPIRE-LAB!</h1>
          <p className="text-muted-foreground mt-2">
            Complete your profile to activate your account
          </p>
        </div>

        <OnboardingFormClient
          user={user}
          skillTags={skillTags}
          toolTags={toolTags}
        />
      </div>
    </div>
  );
}
