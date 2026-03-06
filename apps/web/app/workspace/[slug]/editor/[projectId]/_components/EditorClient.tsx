"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type * as Monaco from "monaco-editor";
import AgentPanel from "./AgentPanel";
import CollaboratorsBar from "./CollaboratorsBar";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];

export default function EditorClient({ project, user, wsUrl }: any) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [agentOpen, setAgentOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(project.files[0] || null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  const userColor = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];

  const handleEditorMount = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    if (!activeFile) return;

    // Setup Yjs document for this file
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      wsUrl,
      `file-${activeFile.id}`,
      ydoc,
      { params: { userId: user.id } }
    );
    providerRef.current = provider;

    // Set user awareness (presence)
    provider.awareness.setLocalStateField("user", {
      name: user.name || user.email,
      color: userColor,
    });

    // Listen for collaborator presence
    provider.awareness.on("change", () => {
      const states = Array.from(provider.awareness.getStates().values());
      const others = states
        .filter((s: any) => s.user && s.user.name !== (user.name || user.email))
        .map((s: any) => s.user);
      setCollaborators(others);
    });

    // Bind Yjs to Monaco
    const yText = ydoc.getText("monaco");
    new MonacoBinding(yText, editor.getModel()!, new Set([editor]), provider.awareness);
  };

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, [activeFile?.id]);

  return (
    <div className="flex h-screen bg-[#0d0d14] text-white overflow-hidden">
      {/* File sidebar */}
      <div className="w-48 border-r border-white/10 flex flex-col">
        <div className="p-3 border-b border-white/10">
          <div className="text-xs font-mono text-gray-400 uppercase tracking-widest">Files</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {project.files.map((file: any) => (
            <button
              key={file.id}
              onClick={() => setActiveFile(file)}
              className={`w-full text-left px-3 py-2 rounded text-sm font-mono truncate transition-colors ${
                activeFile?.id === file.id
                  ? "bg-violet-600/30 text-violet-300"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {file.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-10 border-b border-white/10 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-400">{project.name}</span>
            {activeFile && (
              <>
                <span className="text-gray-600">/</span>
                <span className="font-mono text-sm text-white">{activeFile.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <CollaboratorsBar collaborators={collaborators} currentUser={{ name: user.name, color: userColor }} />
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 rounded text-xs font-medium transition-colors"
            >
              🤖 {project.agentType}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {activeFile ? (
            <MonacoEditor
              height="100%"
              defaultLanguage="typescript"
              defaultValue={activeFile.content || "// Start coding..."}
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: "Space Mono, monospace",
                minimap: { enabled: false },
                padding: { top: 16 },
                lineNumbers: "on",
                cursorBlinking: "smooth",
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No files in this project yet
            </div>
          )}
        </div>
      </div>

      {/* AI Agent Panel */}
      {agentOpen && (
        <AgentPanel
          agentType={project.agentType}
          projectContext={`Project: ${project.name}`}
          onClose={() => setAgentOpen(false)}
        />
      )}
    </div>
  );
}
