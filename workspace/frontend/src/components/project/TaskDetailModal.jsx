import { useState } from "react";
import { Send, Trash2, UserPlus, BellRing } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useUpdateTaskMutation,
  useNotifyTaskAssigneesMutation,
} from "../../api/apiSlice";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../features/auth/authSlice";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import { PageSpinner } from "../ui/Spinner";
import MemberPicker from "../../pages/admin/members/MemberPicker";
import { CATEGORY_META } from "../../utils/taskCategory";

export default function TaskDetailModal({ task, projectId, workspaceId, canManage, onClose }) {
  const user = useSelector(selectCurrentUser);
  const { data, isLoading } = useGetCommentsQuery(task.id);
  const [addComment, { isLoading: sending }] = useAddCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [notifyAssignees, { isLoading: notifying }] = useNotifyTaskAssigneesMutation();
  const [text, setText] = useState("");
  const [editingAssignees, setEditingAssignees] = useState(false);

  async function handleNotify() {
    try {
      const { recipientCount } = await notifyAssignees(task.id).unwrap();
      toast.success(recipientCount === 0 ? "No assignees to notify" : `Emailing ${recipientCount} assignee(s)…`);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to send");
    }
  }

  const assigneeIds = task.assignees?.map((a) => a.userId) || [];

  async function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    try {
      await addComment({ taskId: task.id, content }).unwrap();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to add comment");
    }
  }

  function toggleAssignee(userId) {
    const next = assigneeIds.includes(userId) ? assigneeIds.filter((id) => id !== userId) : [...assigneeIds, userId];
    updateTask({ taskId: task.id, projectId, assigneeIds: next });
  }

  return (
    <Modal open onClose={onClose} title={task.title} maxWidth="max-w-xl">
      {task.description && <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{task.description}</p>}

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_META[task.category || "TASK"].className}`}>
          {CATEGORY_META[task.category || "TASK"].label}
        </span>
        {task.groups?.map((tg) => (
          <span key={tg.id} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
            {tg.group?.name}
          </span>
        ))}
        {task.dueDate && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {canManage && (
          <button
            onClick={handleNotify}
            disabled={notifying}
            className="ml-auto flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-40"
          >
            <BellRing size={11} /> Notify assignees
          </button>
        )}
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Assignees</p>
          {canManage && (
            <button
              onClick={() => setEditingAssignees((v) => !v)}
              className="text-xs text-indigo-600 flex items-center gap-1"
            >
              <UserPlus size={13} /> {editingAssignees ? "Done" : "Edit"}
            </button>
          )}
        </div>
        {!editingAssignees ? (
          <div className="flex flex-wrap gap-2">
            {task.assignees?.length === 0 && <p className="text-xs text-neutral-400">Unassigned</p>}
            {task.assignees?.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full pl-1 pr-2.5 py-1">
                <Avatar name={a.user?.name} size={20} />
                <span className="text-xs text-neutral-700 dark:text-neutral-200">{a.user?.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <MemberPicker workspaceId={workspaceId} selected={assigneeIds} onToggle={toggleAssignee} />
        )}
      </div>

      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Comments</p>
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-3 max-h-56 overflow-y-auto mb-3 pr-1">
          {data?.data?.length === 0 && <p className="text-xs text-neutral-400">No comments yet</p>}
          {data?.data?.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <Avatar name={c.user?.name} size={26} />
              <div className="flex-1 min-w-0">
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{c.user?.name}</p>
                  <p className="text-sm text-neutral-800 dark:text-neutral-100">{c.content}</p>
                </div>
              </div>
              {(canManage || c.userId === user?.id) && (
                <button
                  onClick={() => deleteComment({ taskId: task.id, commentId: c.id })}
                  className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 mt-1.5"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          className="flex-1 px-3.5 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </Modal>
  );
}
