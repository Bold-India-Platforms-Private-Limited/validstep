import { useState } from "react";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateTaskMutation } from "../../api/apiSlice";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

const CATEGORIES = [
  { value: "TASK", label: "Task" },
  { value: "FEATURE", label: "Feature" },
  { value: "BUG", label: "Bug" },
  { value: "IMPROVEMENT", label: "Improvement" },
];

export default function CreateTaskModal({ open, onClose, projectId, projectGroups = [] }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", category: "TASK", dueDate: "" });
  const [groupIds, setGroupIds] = useState([]);
  const [createTask, { isLoading }] = useCreateTaskMutation();

  function toggleGroup(id) {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allGroupIds = projectGroups.map((pg) => pg.groupId);
  const allSelected = allGroupIds.length > 0 && groupIds.length === allGroupIds.length;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createTask({ projectId, ...form, groupIds }).unwrap();
      toast.success("Task created");
      setForm({ title: "", description: "", priority: "MEDIUM", category: "TASK", dueDate: "" });
      setGroupIds([]);
      onClose();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to create task");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
          <input
            autoFocus
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Due date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {projectGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Narrow to specific group(s) <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setGroupIds(allSelected ? [] : allGroupIds)}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                {allSelected ? "Clear all" : "Select all groups"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectGroups.map((pg) => {
                const isSelected = groupIds.includes(pg.groupId);
                return (
                  <button
                    type="button"
                    key={pg.groupId}
                    onClick={() => toggleGroup(pg.groupId)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {pg.group?.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button type="submit" loading={isLoading} className="w-full">
          Create Task
        </Button>
      </form>
    </Modal>
  );
}
