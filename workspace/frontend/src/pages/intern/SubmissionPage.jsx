import { useState } from "react";
import { Plus, FileUp } from "lucide-react";
import toast from "react-hot-toast";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import { useGetMySubmissionsQuery, useCreateSubmissionMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function SubmissionPage() {
  const { workspace, isLoading: wsLoading } = useMyWorkspace();
  const { data, isLoading } = useGetMySubmissionsQuery(workspace?.id, { skip: !workspace });
  const [createSubmission, { isLoading: submitting }] = useCreateSubmissionMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ driveLink: "", note: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createSubmission({ workspaceId: workspace.id, ...form }).unwrap();
      toast.success("Submission sent");
      setForm({ driveLink: "", note: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to submit");
    }
  }

  if (wsLoading || isLoading) return <PageSpinner />;

  return (
    <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Submission</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New Submission
        </Button>
      </div>

      {data?.data?.length === 0 ? (
        <EmptyState icon={FileUp} title="No submissions yet" subtitle="Share a Google Drive link with your work for review." />
      ) : (
        <div className="space-y-3">
          {data?.data?.map((s) => (
            <div key={s.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400 mb-1">{new Date(s.createdAt).toLocaleString("en-IN")}</p>
              <a href={s.driveLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                {s.driveLink}
              </a>
              {s.note && <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{s.note}</p>}
              {s.adminFeedback && (
                <div className="mt-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">Admin feedback</p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">{s.adminFeedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Submission">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Google Drive link</label>
            <input
              autoFocus
              required
              type="url"
              value={form.driveLink}
              onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
              placeholder="https://drive.google.com/…"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Note (optional)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
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
