import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { prisma } from "./config/prisma.js";
import { verifyToken } from "./utils/jwt.js";

const app = createApp();
const httpServer = http.createServer(app);

// websocket-only (no HTTP long-polling transport/fallback) + a longer heartbeat interval —
// at 2k+ concurrent users, polling and frequent pings are the dominant source of ambient
// NetworkIn/Out on the instance, not the chat payloads themselves. Requires the reverse proxy
// in front of this app to forward the Upgrade/Connection headers on the socket.io path
// (nginx: proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";)
// — without that, websocket upgrades will fail and clients simply won't connect.
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket"],
  pingInterval: 45000,
  pingTimeout: 20000,
});

app.set("io", io);

// workspaceId -> Map<userId, connectionCount> — counts sockets per user so a user with
// multiple tabs/devices open doesn't flicker offline when only one tab closes.
const presence = new Map();

function presenceMapFor(workspaceId) {
  if (!presence.has(workspaceId)) presence.set(workspaceId, new Map());
  return presence.get(workspaceId);
}

function broadcastPresence(io, workspaceId) {
  const onlineUserIds = [...presenceMapFor(workspaceId).keys()];
  io.to(`presence:${workspaceId}`).emit("presence_update", { onlineUserIds });
}

io.on("connection", (socket) => {
  let presenceCtx = null; // { workspaceId, userId } — set once presence_join succeeds

  // Client calls socket.emit("join_group", { token, groupId }) for each group chat it opens.
  socket.on("join_group", async ({ token, groupId }, ack) => {
    try {
      const decoded = verifyToken(token);
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) return ack?.({ ok: false, error: "Group not found" });

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return ack?.({ ok: false, error: "Unauthorized" });

      if (!user.isSuperAdmin) {
        const membership = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: group.workspaceId, userId: user.id } },
        });
        const isGroupMember = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: user.id } },
        });
        if (!membership || (membership.role !== "ADMIN" && !isGroupMember)) {
          return ack?.({ ok: false, error: "Forbidden" });
        }
      }

      socket.join(`group:${groupId}`);
      ack?.({ ok: true });
    } catch {
      ack?.({ ok: false, error: "Invalid session" });
    }
  });

  socket.on("leave_group", ({ groupId }) => {
    socket.leave(`group:${groupId}`);
  });

  // "Online now" presence for a workspace — joined once per app session (not per chat),
  // dropped on disconnect/leave. A user with N open tabs only leaves the online set once
  // their last socket disconnects.
  socket.on("presence_join", async ({ token, workspaceId }, ack) => {
    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return ack?.({ ok: false });

      if (!user.isSuperAdmin) {
        const membership = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: user.id } },
        });
        if (!membership) return ack?.({ ok: false });
      }

      presenceCtx = { workspaceId, userId: user.id };
      socket.join(`presence:${workspaceId}`);
      const map = presenceMapFor(workspaceId);
      map.set(user.id, (map.get(user.id) || 0) + 1);
      broadcastPresence(io, workspaceId);
      ack?.({ ok: true, onlineUserIds: [...map.keys()] });
    } catch {
      ack?.({ ok: false });
    }
  });

  function leavePresence() {
    if (!presenceCtx) return;
    const { workspaceId, userId } = presenceCtx;
    const map = presenceMapFor(workspaceId);
    const next = (map.get(userId) || 1) - 1;
    if (next <= 0) {
      map.delete(userId);
    } else {
      map.set(userId, next);
    }
    broadcastPresence(io, workspaceId);
    presenceCtx = null;
  }

  socket.on("presence_leave", leavePresence);
  socket.on("disconnect", leavePresence);
});

const PORT = process.env.PORT || 5050;
httpServer.listen(PORT, () => {
  console.log(`pm-backend listening on :${PORT}`);
});
