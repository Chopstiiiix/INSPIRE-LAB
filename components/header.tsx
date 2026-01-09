"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => {
          setIsAdmin(data.role === "ADMIN" || data.role === "MODERATOR");
        })
        .catch(() => setIsAdmin(false));
    }
  }, [session?.user?.id]);

  return (
    <header className="border-b border-white bg-black">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href={session ? "/app" : "/"} className="text-xl font-bold text-white">
          INSPIRE-LAB
        </Link>

        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/app" className="text-white hover:underline">
                Directory
              </Link>
              <Link href="/messages" className="text-white hover:underline flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Messages
              </Link>
              {isAdmin && (
                <Link href="/app/admin/reports" className="text-white hover:underline">
                  Reports
                </Link>
              )}
              <Link href="/me/settings" className="text-white hover:underline">
                Settings
              </Link>
              <Button variant="secondary" onClick={() => signOut()}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="secondary">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="default">Sign Up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
