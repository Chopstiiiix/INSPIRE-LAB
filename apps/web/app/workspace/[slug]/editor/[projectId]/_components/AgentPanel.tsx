"use client";
import { useState } from "react";
import { Send, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AgentPanel({ agentType, projectContext, onClose }: any) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hi! I'm your ${agentType} agent. How can I help with your code?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMsg],
        agentType,
        context: projectContext,
      }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: "assistant", content: data.content }]);
    setLoading(false);
  };

  return (
    <div className="w-80 border-l border-white/10 flex flex-col bg-[#0d0d14]">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm font-medium">🤖 {agentType} Agent</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[90%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap text-left ${
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-gray-200"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="inline-block px-3 py-2 bg-white/10 rounded-lg text-sm text-gray-400">
            Thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask your agent..."
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={send}
          disabled={loading}
          className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
