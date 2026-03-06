export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  cursor?: { x: number; y: number };
  color: string;
}

export interface CollabPresence {
  userId: string;
  userName: string;
  color: string;
  cursor?: { line: number; col: number };
}

export type AgentType = "CLAUDE" | "GPT4" | "COPILOT" | "CUSTOM";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WSMessage {
  type: "presence" | "doc-update" | "chat" | "cursor";
  payload: unknown;
}
