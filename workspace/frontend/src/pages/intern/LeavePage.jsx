import { useState } from "react";
import { Plus, CalendarOff } from "lucide-react";
import toast from "react-hot-toast";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import { useGetMyLeavesQuery, useSubmitLeaveMutation, useCancelLeaveMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

const TYPE_LABELS = { LEAVE: "Leave", WORK_FROM_HOME: "WFH", HALF_DAY: "Half Day" };

export default function LeavePage() {
  const { workspace, isLoading: wsLoading } = useMyWorkspace();
  const { data, isLoading } = useGetMyLeavesQuery(workspace?.id, { skip: !workspace });
  const [submitLeave, { isLoading: submitting }] = useSubmitLeaveMutation();
  const [cancelLeave] = useCancelLeaveMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", type: "LEAVE", reason: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await submitLeave({ workspaceId: workspace.id, ...form }).unwrap();
      toast.success("Leave request submitted");
      setForm({ startDate: "", endDate: "", type: "LEAVE", reason: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to submit");
    }
  }

  if (wsLoading || isLoading) return <PageSpinner />;

  return (
    <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Leave</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Request
        </Button>
      </div>

      {data?.data?.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No leave requests" subtitle="Request leave, WFH, or a half day." />
      ) : (
        <div className="space-y-2">
          {data?.data?.map((l) => (
            <div key={l.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {TYPE_LABELS[l.type]} · {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{l.reason}</p>
                  {l.adminNote && <p className="text-xs text-neutral-400 mt-1">Admin note: {l.adminNote}</p>}
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[l.status]}`}>{l.status}</span>
              </div>
              {l.status === "PENDING" && (
                <button
                  onClick={() => cancelLeave({ workspaceId: workspace.id, leaveId: l.id })}
                  className="text-xs text-red-500 mt-2"
                >
                  Cancel request
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Request Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start date</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">End date</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            >
              <option value="LEAVE">Leave</option>
              <option value="WORK_FROM_HOME">Work From Home</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Reason</label>
            <textarea
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <Button type="submit" loading={submitting} className="w-full">
            Submit Request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
