import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Send, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetGroupQuery,
  useGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useClearGroupMessagesMutation,
} from "../../api/apiSlice";
import { selectCurrentUser, selectCurrentToken } from "../../features/auth/authSlice";
import { getSocket, joinGroupRoom, leaveGroupRoom } from "../../utils/socket";
import { usePresence } from "../../hooks/usePresence";
import Avatar from "../ui/Avatar";
import { PageSpinner } from "../ui/Spinner";
import GroupMembersPanel from "./GroupMembersPanel";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function GroupChat({ groupId, showMembersToggle = true }) {
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const { data: groupData, isLoading: groupLoading } = useGetGroupQuery(groupId);
  const { data: historyData, isLoading: historyLoading } = useGetGroupMessagesQuery({ groupId });
  const [sendMessage, { isLoading: sending }] = useSendGroupMessageMutation();
  const [clearMessages] = useClearGroupMessagesMutation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef(null);
  const loadedGroupId = useRef(null);

  useEffect(() => {
    if (historyData?.data && loadedGroupId.current !== groupId) {
      setMessages(historyData.data);
      loadedGroupId.current = groupId;
    }
  }, [historyData, groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!groupId || !token) return;
    joinGroupRoom(groupId, token);
    const socket = getSocket();

    const onMessage = (msg) => {
      if (msg.groupId !== groupId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    socket.on("group_message", onMessage);

    // The socket may drop (idle-hidden tab, network blip) while this chat stays mounted —
    // rejoin the room whenever it reconnects, otherwise this view silently stops receiving pushes.
    const onConnect = () => socket.emit("join_group", { groupId, token });
    socket.on("connect", onConnect);

    return () => {
      socket.off("group_message", onMessage);
      socket.off("connect", onConnect);
      leaveGroupRoom(groupId);
    };
  }, [groupId, token]);

  const handleSend = useCallback(
    async (e) => {
      e.preventDefault();
      const content = input.trim();
      if (!content) return;
      setInput("");
      try {
        const { message } = await sendMessage({ groupId, content }).unwrap();
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      } catch (err) {
        toast.error(err?.data?.error || "Failed to send message");
      }
    },
    [groupId, input, sendMessage]
  );

  async function handleClear() {
    if (!confirm("Clear all messages in this group? This cannot be undone.")) return;
    await clearMessages(groupId);
    setMessages([]);
    toast.success("Chat cleared");
  }

  const { onlineUserIds, statuses } = usePresence(groupData?.group?.workspaceId);

  if (groupLoading || historyLoading) return <PageSpinner />;
  const group = groupData?.group;
  const isAdmin = groupData?.isAdmin;
  if (!group) return null;

  let lastSenderId = null;

  return (
    <div className="flex h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-9rem)] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-white truncate">{group.name}</p>
            <p className="text-xs text-neutral-500">{group.members?.length || 0} members</p>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={handleClear}
                title="Clear chat"
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-red-500"
              >
                <Trash2 size={17} />
              </button>
            )}
            {showMembersToggle && (
              <button
                onClick={() => setShowMembers(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <Users size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {messages.length === 0 && (
            <p className="text-center text-sm text-neutral-400 mt-10">No messages yet. Say hello 👋</p>
          )}
          {messages.map((msg) => {
            const mine = msg.userId === user?.id || msg.user?.id === user?.id;
            const showAvatar = lastSenderId !== (msg.userId || msg.user?.id);
            lastSenderId = msg.userId || msg.user?.id;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
                {!mine && (showAvatar ? <Avatar name={msg.user?.name} size={26} /> : <div className="w-[26px]" />)}
                <div className={`max-w-[75%] sm:max-w-[60%]`}>
                  {!mine && showAvatar && (
                    <p className="text-[11px] text-neutral-400 ml-1 mb-0.5">{msg.user?.name}</p>
                  )}
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm break-words ${
                      mine
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className={`text-[10px] text-neutral-400 mt-0.5 ${mine ? "text-right mr-1" : "ml-1"}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-neutral-200 dark:border-neutral-800">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            className="flex-1 px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
          >
            <Send size={17} />
          </button>
        </form>
      </div>

      <div className="hidden lg:block w-64 border-l border-neutral-200 dark:border-neutral-800">
        <GroupMembersPanel group={group} isAdmin={isAdmin} onlineUserIds={onlineUserIds} statuses={statuses} />
      </div>

      {showMembers && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMembers(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-neutral-900 rounded-t-2xl max-h-[75vh] animate-slide-up">
            <GroupMembersPanel
              group={group}
              isAdmin={isAdmin}
              onlineUserIds={onlineUserIds}
              statuses={statuses}
              onClose={() => setShowMembers(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
