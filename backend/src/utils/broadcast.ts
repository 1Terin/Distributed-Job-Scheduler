import { Server as WebSocketServer } from "ws";
import http from "http";

let wss: WebSocketServer | null = null;

export function initWebsocket(server: http.Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));
  });

  return wss;
}

export function broadcast(data: unknown) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocketServer.OPEN) {
      client.send(payload);
    }
  });
}
