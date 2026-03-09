import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReports } from "@/app/actions/reports";
import { AdminReportsView } from "@/components/admin-reports-view";

export default async function AdminReportsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Check if user is admin/moderator
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN" && user?.role !== "MODERATOR") {
    redirect("/app");
  }

  // Load initial reports
  const result = await getReports({ status: "PENDING", limit: 50 });

  if (result.error || !result.reports) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Reports</h1>
        <p className="text-muted-foreground">Failed to load reports</p>
      </div>
    );
  }

  return (
    <AdminReportsView
      initialReports={result.reports}
      nextCursor={result.nextCursor}
      hasMore={result.hasMore || false}
    />
  );
}
