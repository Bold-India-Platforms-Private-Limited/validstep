import { useState } from "react";
import { useParams } from "react-router-dom";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { useGetAllLeavesQuery, useReviewLeaveMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/ui/Avatar";
import Pagination from "../../components/ui/Pagination";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};
const TYPE_LABELS = { LEAVE: "Leave", WORK_FROM_HOME: "WFH", HALF_DAY: "Half Day" };

export default function LeavePage() {
  const { workspaceId } = useParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, isLoading } = useGetAllLeavesQuery({ workspaceId, page, status: status || undefined });
  const [reviewLeave] = useReviewLeaveMutation();

  async function handleReview(leaveId, reviewStatus) {
    try {
      await reviewLeave({ workspaceId, leaveId, status: reviewStatus }).unwrap();
      toast.success(reviewStatus === "APPROVED" ? "Approved" : "Rejected");
    } catch (err) {
      toast.error(err?.data?.error || "Failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Leave Requests</h2>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm text-neutral-900 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState title="No leave requests" />
      ) : (
        <div className="space-y-2">
          {data?.data?.map((l) => (
            <div key={l.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Avatar name={l.user?.name} size={34} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{l.user?.name}</p>
                    <p className="text-xs text-neutral-400">
                      {TYPE_LABELS[l.type]} · {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-neutral-500 mt-1">{l.reason}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[l.status]}`}>{l.status}</span>
              </div>
              {l.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleReview(l.id, "APPROVED")}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => handleReview(l.id, "REJECTED")}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600"
                  >
                    <X size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
