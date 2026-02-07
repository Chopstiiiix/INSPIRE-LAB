"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/role")
        .then((res) => res.json())
        .then((data) => {
          setIsAdmin(data.role === "ADMIN" || data.role === "MODERATOR");
          if (data.avatar) setAvatar(data.avatar);
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
              {avatar ? (
                <Image
                  src={avatar}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full border border-white object-cover w-8 h-8"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white bg-white/20 flex items-center justify-center text-white text-sm font-medium">
                  {session.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
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
