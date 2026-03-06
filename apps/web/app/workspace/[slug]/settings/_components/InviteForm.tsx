"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, UserPlus } from "lucide-react";

export default function InviteForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/workspaces/${slug}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ text: data.error, error: true });
      return;
    }

    setMessage({ text: `Invited ${email} as ${role}`, error: false });
    setEmail("");
    router.refresh();
  };

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold">Invite Collaborator</h3>
      </div>

      <form onSubmit={handleInvite} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Email address</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="teammate@example.com"
              className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("EDITOR")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                role === "EDITOR"
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-gray-400 hover:bg-white/15"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setRole("VIEWER")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                role === "VIEWER"
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-gray-400 hover:bg-white/15"
              }`}
            >
              Viewer
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Inviting..." : "Send Invite"}
        </button>

        {message && (
          <p className={`text-xs ${message.error ? "text-red-400" : "text-green-400"}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
