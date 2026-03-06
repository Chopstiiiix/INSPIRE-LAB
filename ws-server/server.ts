import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "http";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as lib0 from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT = parseInt(process.env.WS_PORT || "1234");

// In-memory doc store
const docs = new Map<string, { doc: Y.Doc; awareness: awarenessProtocol.Awareness }>();

function getDoc(name: string) {
        if (!docs.has(name)) {
                  const doc = new Y.Doc();
                  const awareness = new awarenessProtocol.Awareness(doc);
                  docs.set(name, { doc, awareness });
        }
        return docs.get(name)!;
}

const messageSync = 0;
const messageAwareness = 1;

function send(conn: WebSocket, message: Uint8Array) {
        if (conn.readyState === WebSocket.OPEN) {
                  conn.send(message, (err) => {
                              if (err) console.error("send error", err);
                  });
        }
}

function setupWSConnection(conn: WebSocket, req: IncomingMessage) {
        const url = new URL(req.url || "/", `http://localhost:${PORT}`);
        const docName = url.pathname.slice(1) || "default";
        const { doc, awareness } = getDoc(docName);

  // Send sync step 1
  const encoder = lib0.createEncoder();
        lib0.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, doc);
        send(conn, lib0.toUint8Array(encoder));

  // Send awareness states
  const awarenessStates = awareness.getStates();
        if (awarenessStates.size > 0) {
                  const enc2 = lib0.createEncoder();
                  lib0.writeVarUint(enc2, messageAwareness);
                  lib0.writeVarUint8Array(enc2, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())));
                  send(conn, lib0.toUint8Array(enc2));
        }

  // Listen for doc updates
  const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
            if (origin !== conn) {
                        const enc = lib0.createEncoder();
                        lib0.writeVarUint(enc, messageSync);
                        syncProtocol.writeUpdate(enc, update);
                        send(conn, lib0.toUint8Array(enc));
            }
  };

  // Listen for awareness updates
  const awarenessUpdateHandler = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
            if (origin !== conn) {
                        const changedClients = added.concat(updated, removed);
                        const enc = lib0.createEncoder();
                        lib0.writeVarUint(enc, messageAwareness);
                        lib0.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
                        send(conn, lib0.toUint8Array(enc));
            }
  };

  doc.on("update", docUpdateHandler);
        awareness.on("update", awarenessUpdateHandler);

  conn.on("message", (message: Buffer) => {
            const decoder = decoding.createDecoder(new Uint8Array(message));
            const messageType = decoding.readVarUint(decoder);

              if (messageType === messageSync) {
                          const enc = lib0.createEncoder();
                          lib0.writeVarUint(enc, messageSync);
                          const syncMessageType = syncProtocol.readSyncMessage(decoder, enc, doc, conn);
                          if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
                                        send(conn, lib0.toUint8Array(enc));
                          }
              } else if (messageType === messageAwareness) {
                          awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), conn);
              }
  });

  conn.on("close", () => {
            doc.off("update", docUpdateHandler);
            awareness.off("update", awarenessUpdateHandler);
            const states = awareness.getStates();
            const connClientId = [...states.keys()].find((id) => states.get(id)?._conn === conn);
            if (connClientId !== undefined) {
                        awarenessProtocol.removeAwarenessStates(awareness, [connClientId], null);
            }
  });
}

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", setupWSConnection);

server.listen(PORT, () => {
        console.log(`✅ INSPIRE LAB WebSocket server running on ws://localhost:${PORT}`);
});
