import { io } from "socket.io-client";

let socket = null;
let keepAliveCount = 0; // chat rooms + presence joins currently active
let hiddenTimer = null;

// websocket-only: skips the HTTP long-polling handshake/fallback entirely, which is the
// single biggest source of ambient bandwidth for many idle/reconnecting clients at scale.
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      // Nested under /workspace/ in production (nginx proxies /workspace/socket.io/ to
      // this backend's default /socket.io/ path) — defaults to socket.io's own "/socket.io"
      // in dev, where the backend is hit directly with no path prefix.
      path: import.meta.env.VITE_SOCKET_PATH || "/socket.io",
    });
  }
  return socket;
}

function acquire() {
  const s = getSocket();
  if (!s.connected) s.connect();
  keepAliveCount += 1;
  return s;
}

// Fully disconnects once nothing (no open chat, no presence tracking) needs the socket,
// rather than leaving an idle persistent connection (with its periodic heartbeats) running.
function release() {
  keepAliveCount = Math.max(0, keepAliveCount - 1);
  if (keepAliveCount === 0 && socket?.connected) socket.disconnect();
}

export function joinGroupRoom(groupId, token) {
  const s = acquire();
  s.emit("join_group", { groupId, token });
}

export function leaveGroupRoom(groupId) {
  const s = getSocket();
  s.emit("leave_group", { groupId });
  release();
}

// "Online now" presence — call once per app session for the user's current workspace.
export function joinPresence(workspaceId, token, onUpdate) {
  const s = acquire();
  const doJoin = () => s.emit("presence_join", { workspaceId, token });
  doJoin();
  s.on("connect", doJoin); // rejoin after an idle-hidden disconnect/reconnect cycle
  s.on("presence_update", onUpdate);

  return () => {
    s.off("connect", doJoin);
    s.off("presence_update", onUpdate);
    s.emit("presence_leave");
    release();
  };
}

// Drop the connection while the tab is backgrounded for a while; callers reconnect
// themselves (via their own "connect" listener) as soon as it's visible again.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenTimer = setTimeout(() => {
        if (socket?.connected) socket.disconnect();
      }, 60000);
    } else if (hiddenTimer) {
      clearTimeout(hiddenTimer);
      hiddenTimer = null;
    }
  });
}
