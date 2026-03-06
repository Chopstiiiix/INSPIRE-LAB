"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Crown, Mail } from "lucide-react";
import InviteForm from "./InviteForm";

export default function SettingsClient({ workspace, currentUser }: any) {
  const router = useRouter();
  const isOwner = workspace.ownerId === currentUser.id;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-md" />
          <span className="font-mono font-bold">INSPIRE LAB</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">{workspace.name}</h1>
        <p className="text-sm text-gray-400 mb-8">Workspace settings</p>

        {/* Members section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-violet-400" />
            <h2 className="text-lg font-semibold">Members</h2>
          </div>

          <div className="space-y-2 mb-6">
            {/* Owner */}
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
                  {(workspace.owner.name || workspace.owner.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{workspace.owner.name || workspace.owner.email}</p>
                  <p className="text-xs text-gray-500">{workspace.owner.email}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <Crown size={12} />
                OWNER
              </span>
            </div>

            {/* Members */}
            {workspace.members.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-sm font-bold">
                    {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.user.name || member.user.email}</p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">{member.role}</span>
              </div>
            ))}
          </div>

          {/* Invite form — only visible to owner */}
          {isOwner && <InviteForm slug={workspace.slug} />}
        </section>
      </main>
    </div>
  );
}
