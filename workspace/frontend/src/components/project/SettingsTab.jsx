import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUpdateProjectMutation, useDeleteProjectMutation, useGetProjectPeopleQuery } from "../../api/apiSlice";
import Button from "../ui/Button";
import GroupPicker from "../../pages/admin/projects/GroupPicker";

export default function SettingsTab({ project, onDeleted }) {
  const [updateProject, { isLoading: saving }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();
  const { data: peopleData } = useGetProjectPeopleQuery(project.id);
  const [form, setForm] = useState(null);
  const [groupIds, setGroupIds] = useState([]);

  useEffect(() => {
    setForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
      priority: project.priority,
      teamLeadId: project.teamLeadId || "",
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.slice(0, 10) : "",
    });
    setGroupIds(project.groups?.map((pg) => pg.groupId) || []);
  }, [project]);

  if (!form) return null;

  function toggleGroup(id) {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      await updateProject({
        projectId: project.id,
        ...form,
        groupIds,
        teamLeadId: form.teamLeadId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }).unwrap();
      toast.success("Project updated");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to save");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
    toast.success("Project deleted");
    onDeleted?.();
  }

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={handleSave} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
          <input
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">End date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Team lead</label>
          <select
            value={form.teamLeadId}
            onChange={(e) => setForm({ ...form, teamLeadId: e.target.value })}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
          >
            <option value="">Unassigned</option>
            {peopleData?.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">Assigned groups</label>
          <GroupPicker workspaceId={project.workspaceId} selected={groupIds} onToggle={toggleGroup} onChange={setGroupIds} />
        </div>
        <Button type="submit" loading={saving} className="w-full">
          Save Changes
        </Button>
      </form>

      <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-5">
        <p className="text-sm font-semibold text-red-600 mb-1">Danger zone</p>
        <p className="text-xs text-neutral-500 mb-3">Deletes this project and all its tasks, documents, and messages permanently.</p>
        <Button variant="danger" onClick={handleDelete} loading={deleting}>
          <Trash2 size={15} /> Delete Project
        </Button>
      </div>
    </div>
  );
}
