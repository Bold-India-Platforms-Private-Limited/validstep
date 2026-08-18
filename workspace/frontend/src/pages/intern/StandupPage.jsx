import { useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import { useGetMyStandupsQuery, useSubmitStandupMutation, useDeleteStandupMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { localDateKey } from "../../utils/date";

const TYPES = ["SOFTWARE_DEV", "DATA_ANALYSIS", "BRAINSTORM", "DESIGN", "TESTING", "DOCUMENTATION", "MEETING", "OTHER"];

export default function StandupPage() {
  const { workspace, isLoading: wsLoading } = useMyWorkspace();
  const { data, isLoading } = useGetMyStandupsQuery({ workspaceId: workspace?.id }, { skip: !workspace });
  const [submitStandup, { isLoading: submitting }] = useSubmitStandupMutation();
  const [deleteStandup] = useDeleteStandupMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "SOFTWARE_DEV", description: "" });

  const hasToday = data?.data?.some((s) => localDateKey(new Date(s.date)) === localDateKey());

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await submitStandup({ workspaceId: workspace.id, ...form, date: localDateKey() }).unwrap();
      toast.success("Standup logged");
      setForm({ title: "", type: "SOFTWARE_DEV", description: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to submit");
    }
  }

  if (wsLoading || isLoading) return <PageSpinner />;

  return (
    <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Standup</h1>
        {!hasToday && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Log Today
          </Button>
        )}
      </div>

      {data?.data?.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No standup entries yet" subtitle="Log what you worked on each day." />
      ) : (
        <div className="space-y-2">
          {data?.data?.map((s) => (
            <div key={s.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-neutral-400">
                    {s.type.replace(/_/g, " ")} · {new Date(s.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{s.description}</p>
                </div>
                {localDateKey(new Date(s.date)) === localDateKey() && (
                  <button onClick={() => deleteStandup({ workspaceId: workspace.id, standupId: s.id })} className="text-xs text-red-500 shrink-0">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log Today's Standup">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
            <input
              autoFocus
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">What did you work on?</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <Button type="submit" loading={submitting} className="w-full">
            Submit
          </Button>
        </form>
      </Modal>
    </div>
  );
}
