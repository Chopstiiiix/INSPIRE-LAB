"use client";
import { useState } from "react";
import { Plus, Users, Zap } from "lucide-react";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import SignOutButton from "@/components/SignOutButton";

export default function DashboardClient({ user, workspaces }: any) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-md" />
          <span className="font-mono font-bold">INSPIRE LAB</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Welcome, {user.name || user.email}</span>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Workspaces</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Workspace
          </button>
        </div>

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/20 rounded-xl">
            <Zap className="mx-auto mb-4 text-violet-400" size={40} />
            <h2 className="text-lg font-semibold mb-2">No workspaces yet</h2>
            <p className="text-gray-400 text-sm mb-6">Create your first workspace to start collaborating</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws: any) => (
              <a
                key={ws.id}
                href={`/workspace/${ws.slug}/editor/${ws.projects[0]?.id || ""}`}
                className="p-5 bg-white/5 border border-white/10 rounded-xl hover:border-violet-500/50 hover:bg-white/8 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-lg flex items-center justify-center text-lg">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500">{ws.projects.length} projects</span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-violet-300 transition-colors">{ws.name}</h3>
                {ws.description && <p className="text-sm text-gray-400 line-clamp-2">{ws.description}</p>}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Users size={12} />
                  <span>{ws.members.length + 1} members</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
