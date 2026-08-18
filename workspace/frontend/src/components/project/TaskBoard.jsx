import { useState } from "react";
import { useGetTasksQuery, useUpdateTaskMutation, useDeleteTaskMutation } from "../../api/apiSlice";
import { PageSpinner } from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import Avatar from "../ui/Avatar";
import { CheckSquare, Trash2, MessageCircle } from "lucide-react";
import TaskDetailModal from "./TaskDetailModal";
import { CATEGORY_META } from "../../utils/taskCategory";

const COLUMNS = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
];

export default function TaskBoard({ projectId, workspaceId, canManage }) {
  const { data, isLoading } = useGetTasksQuery(projectId);
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [openTaskId, setOpenTaskId] = useState(null);

  if (isLoading) return <PageSpinner />;
  const tasks = data?.data || [];
  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} title="No tasks yet" subtitle="Break this project down into tasks for the team." />;
  }

  function handleStatusChange(taskId, status, e) {
    e.stopPropagation();
    updateTask({ taskId, projectId, status });
  }

  const openTask = tasks.find((t) => t.id === openTaskId);

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div key={col.key}>
          <p className="text-sm font-semibold text-neutral-500 mb-2 flex items-center justify-between">
            {col.label}
            <span className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">
              {tasks.filter((t) => t.status === col.key).length}
            </span>
          </p>
          <div className="space-y-2">
            {tasks
              .filter((t) => t.status === col.key)
              .map((task) => (
                <div
                  key={task.id}
                  onClick={() => setOpenTaskId(task.id)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1 ${CATEGORY_META[task.category || "TASK"].className}`}>
                        {CATEGORY_META[task.category || "TASK"].label}
                      </span>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{task.title}</p>
                    </div>
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask({ taskId: task.id, projectId });
                        }}
                        className="text-neutral-300 hover:text-red-500 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {task.groups?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {task.groups.map((tg) => (
                        <span key={tg.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
                          {tg.group?.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {task.assignees?.slice(0, 3).map((a) => (
                          <Avatar key={a.id} name={a.user?.name} size={20} className="ring-2 ring-white dark:ring-neutral-900" />
                        ))}
                      </div>
                      {task._count?.comments > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
                          <MessageCircle size={12} /> {task._count.comments}
                        </span>
                      )}
                    </div>
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(task.id, e.target.value, e)}
                      className="text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg px-1.5 py-1 bg-transparent text-neutral-600 dark:text-neutral-300"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          projectId={projectId}
          workspaceId={workspaceId}
          canManage={canManage}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
