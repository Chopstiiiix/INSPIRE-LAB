import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-4xl text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
              Invite-Only Professional Network
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              A curated community for professionals to connect, collaborate, and showcase their work.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Request Invite
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardHeader>
                <CardTitle>Curated Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Join a selective network of verified professionals through our invite-only system.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rich Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Showcase your skills, projects, and achievements in a comprehensive professional profile.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meaningful Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Follow and connect with professionals who share your interests and expertise.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="mt-16 p-8 border border-border">
            <h3 className="text-2xl font-bold mb-4">Need an invite code?</h3>
            <p className="text-muted-foreground mb-6">
              INSPIRE-LAB is invite-only. Connect with existing members or request access.
            </p>
            <Link href="/sign-up">
              <Button variant="outline">Sign Up with Code</Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 INSPIRE-LAB. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
