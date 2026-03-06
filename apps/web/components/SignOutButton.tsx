"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={signOut}
      className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
    >
      Sign Out
    </button>
  );
}
