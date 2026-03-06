import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";

const PORT = parseInt(process.env.WS_PORT || "1234");

const wss = new WebSocketServer({ port: PORT });

// Track active rooms and users for presence
const rooms = new Map<string, Set<string>>();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const room = url.pathname.slice(1); // e.g. "project-abc123"
  const userId = url.searchParams.get("userId") || "anonymous";

  // Track presence
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(userId);

  // Broadcast presence to room
  broadcastPresence(room, wss);

  // Setup Yjs CRDT sync
  setupWSConnection(ws, req, { docName: room });

  ws.on("close", () => {
    rooms.get(room)?.delete(userId);
    broadcastPresence(room, wss);
  });
});

function broadcastPresence(room: string, wss: WebSocketServer) {
  const users = Array.from(rooms.get(room) || []);
  const msg = JSON.stringify({ type: "presence", users, room });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

console.log(`✅ INSPIRE LAB WebSocket server running on ws://localhost:${PORT}`);
