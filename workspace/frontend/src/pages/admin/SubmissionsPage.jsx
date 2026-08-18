import { useState } from "react";
import { useParams } from "react-router-dom";
import { FileUp, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useGetAllSubmissionsQuery, useGiveSubmissionFeedbackMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/ui/Avatar";
import Pagination from "../../components/ui/Pagination";

export default function SubmissionsPage() {
  const { workspaceId } = useParams();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetAllSubmissionsQuery({ workspaceId, page });
  const [giveFeedback] = useGiveSubmissionFeedbackMutation();
  const [drafts, setDrafts] = useState({});

  async function handleSave(submissionId) {
    const adminFeedback = drafts[submissionId];
    if (adminFeedback === undefined) return;
    try {
      await giveFeedback({ workspaceId, submissionId, adminFeedback }).unwrap();
      toast.success("Feedback saved");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to save");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Submissions</h2>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={FileUp} title="No submissions yet" />
      ) : (
        <div className="space-y-3">
          {data?.data?.map((s) => (
            <div key={s.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Avatar name={s.user?.name} size={28} />
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{s.user?.name}</p>
                  <p className="text-xs text-neutral-400">{new Date(s.createdAt).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <a href={s.driveLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                {s.driveLink}
              </a>
              {s.note && <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1.5">{s.note}</p>}

              <div className="flex items-center gap-2 mt-3">
                <input
                  defaultValue={s.adminFeedback || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                  placeholder="Add feedback…"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                />
                <button
                  onClick={() => handleSave(s.id)}
                  className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                >
                  <Check size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
