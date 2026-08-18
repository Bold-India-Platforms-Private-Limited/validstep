import { useState } from "react";
import toast from "react-hot-toast";
import { useCreateProjectMutation } from "../../../api/apiSlice";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import GroupPicker from "./GroupPicker";

export default function CreateProjectModal({ open, onClose, workspaceId }) {
  const [form, setForm] = useState({ name: "", description: "", priority: "MEDIUM", status: "ACTIVE" });
  const [groupIds, setGroupIds] = useState([]);
  const [createProject, { isLoading }] = useCreateProjectMutation();

  function toggleGroup(id) {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createProject({ workspaceId, ...form, groupIds }).unwrap();
      toast.success("Project created");
      setForm({ name: "", description: "", priority: "MEDIUM", status: "ACTIVE" });
      setGroupIds([]);
      onClose();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to create project");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Project" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Project name</label>
          <input
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
        <div className="grid grid-cols-2 gap-3">
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
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
            Assign to groups
          </label>
          <GroupPicker workspaceId={workspaceId} selected={groupIds} onToggle={toggleGroup} onChange={setGroupIds} />
        </div>
        <Button type="submit" loading={isLoading} className="w-full">
          Create Project
        </Button>
      </form>
    </Modal>
  );
}
