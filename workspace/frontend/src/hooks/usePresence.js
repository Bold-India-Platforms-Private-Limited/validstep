import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentToken } from "../features/auth/authSlice";
import { joinPresence, getSocket } from "../utils/socket";

// Joins the "online now" room for a workspace. Every caller (admin observing, or an
// intern just being present) contributes to the shared socket's keep-alive count, so the
// underlying connection is opened lazily and dropped once nobody needs it anymore.
// Also tracks live Available/Busy/Be-Right-Back status pushed by other members.
export function usePresence(workspaceId) {
  const token = useSelector(selectCurrentToken);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (!workspaceId || !token) return;
    const leave = joinPresence(workspaceId, token, ({ onlineUserIds }) => setOnlineUserIds(onlineUserIds));

    const socket = getSocket();
    const onStatus = ({ userId, status }) => setStatuses((prev) => ({ ...prev, [userId]: status }));
    socket.on("status_update", onStatus);

    return () => {
      socket.off("status_update", onStatus);
      leave();
    };
  }, [workspaceId, token]);

  return { onlineUserIds, statuses };
}
