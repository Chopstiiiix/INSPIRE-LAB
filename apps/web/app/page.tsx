import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-3xl">
        {/* Logo */}
        <div className="mb-8 inline-flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-lg" />
          <span className="font-mono text-2xl font-bold tracking-tight">INSPIRE LAB</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-white via-violet-200 to-cyan-400 bg-clip-text text-transparent leading-tight">
          Build together.<br />Ship faster.
        </h1>

        <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto">
          A real-time collaborative workspace for developers — powered by AI agents,
          Monaco editor, and instant multiplayer sync.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-white/20 hover:border-white/40 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Features grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: "⚡", title: "Real-time Collab", desc: "Simultaneous editing with live cursors and presence indicators" },
            { icon: "🤖", title: "AI Agents", desc: "Claude, GPT-4, Copilot — choose your preferred coding assistant" },
            { icon: "🔗", title: "Invite Anyone", desc: "Share workspaces with teammates via link or email invite" },
          ].map((f) => (
            <div key={f.title} className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
