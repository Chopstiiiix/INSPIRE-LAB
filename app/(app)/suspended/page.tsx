import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function SuspendedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Check if user is actually suspended
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  // If not suspended, redirect to appropriate page
  if (user?.status === "ACTIVE") {
    redirect("/app");
  }

  if (user?.status === "PENDING") {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-zinc-900 border-red-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-white">Account Suspended</CardTitle>
          <CardDescription className="text-gray-400">
            Your account has been suspended by our moderation team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-zinc-800 p-4 rounded-lg">
            <p className="text-sm text-gray-300">
              Your account has been suspended due to a violation of our community guidelines or terms of service.
              While suspended, you cannot:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-gray-400">
              <li>• Access the directory</li>
              <li>• View profiles</li>
              <li>• Interact with other members</li>
            </ul>
          </div>

          <div className="bg-zinc-800 p-4 rounded-lg">
            <p className="text-sm font-medium text-white mb-2">What you can do:</p>
            <p className="text-sm text-gray-400">
              If you believe this suspension was made in error, please contact our support team
              at <a href="mailto:support@inspire-lab.com" className="text-blue-400 hover:underline">support@inspire-lab.com</a> with
              your account details.
            </p>
          </div>

          <div className="pt-4">
            <form action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth");
              await signOut({ redirectTo: "/" });
            }}>
              <Button type="submit" variant="outline" className="w-full">
                Sign Out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
