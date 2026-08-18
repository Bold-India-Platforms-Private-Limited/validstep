import { useState } from "react";
import { Send, MessageSquareText } from "lucide-react";
import toast from "react-hot-toast";
import { useGetMyProjectMessagesQuery, useSendProjectMessageMutation } from "../../api/apiSlice";

export default function MessagePMSection({ projectId }) {
  const { data } = useGetMyProjectMessagesQuery(projectId);
  const [sendMessage, { isLoading }] = useSendProjectMessageMutation();
  const [text, setText] = useState("");

  async function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    try {
      await sendMessage({ projectId, content }).unwrap();
      setText("");
      toast.success("Sent to the project admin");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to send");
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
      <p className="text-sm font-semibold text-neutral-500 mb-1 flex items-center gap-1.5">
        <MessageSquareText size={14} /> Message PM
      </p>
      <p className="text-xs text-neutral-400 mb-3">Have a question or blocker about this project? Send a note directly to your admin.</p>

      <form onSubmit={handleSend} className="flex items-center gap-2 mb-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question…"
          className="flex-1 px-3.5 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>

      {data?.data?.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.data.map((m) => (
            <div key={m.id} className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl px-3 py-2">
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{m.content}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{new Date(m.createdAt).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
