import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./viteServer";

export interface SocketMessage {
  type: string;
  payload: any;
}

export function setupWebSockets(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Map<string, WebSocket>();

  wss.on("connection", (ws, req) => {
    log(`New WS connection from ${req.socket.remoteAddress}`);

    ws.on("message", (data) => {
      try {
        const message: SocketMessage = JSON.parse(data.toString());
        handleMessage(ws, message, clients);
      } catch (err) {
        log(`Failed to parse WS message: ${err}`);
      }
    });

    ws.on("close", () => {
      // Remove client from map
      for (const [id, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(id);
          break;
        }
      }
    });
  });

  return {
    broadcast: (type: string, payload: any) => {
      const message = JSON.stringify({ type, payload });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToUser: (userId: string, type: string, payload: any) => {
      const client = clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, payload }));
      }
    }
  };
}

function handleMessage(ws: WebSocket, message: SocketMessage, clients: Map<string, WebSocket>) {
  switch (message.type) {
    case "auth":
      if (message.payload.userId) {
        clients.set(message.payload.userId, ws);
        log(`User ${message.payload.userId} authenticated via WS`);
      }
      break;
    case "location_update":
      // Handle location update from driver
      break;
  }
}
