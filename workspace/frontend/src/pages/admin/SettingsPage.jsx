import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useGetWorkspaceQuery, useUpdateWorkspaceMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { HOLIDAYS_2026 } from "../../utils/holidays";

export default function SettingsPage() {
  const { workspaceId } = useParams();
  const { data, isLoading } = useGetWorkspaceQuery(workspaceId);
  const [updateWorkspace, { isLoading: saving }] = useUpdateWorkspaceMutation();
  const [ndaContent, setNdaContent] = useState("");

  useEffect(() => {
    if (data?.workspace) setNdaContent(data.workspace.ndaContent || "");
  }, [data?.workspace]);

  async function handleSave() {
    try {
      await updateWorkspace({ workspaceId, ndaContent }).unwrap();
      toast.success("NDA saved");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to save");
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">NDA Agreement</p>
        <p className="text-xs text-neutral-500 mb-3">
          Interns must sign this before using the app. Leave empty to skip requiring an NDA for this batch.
        </p>
        <textarea
          value={ndaContent}
          onChange={(e) => setNdaContent(e.target.value)}
          rows={10}
          placeholder="Paste your NDA text here…"
          className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-neutral-900 dark:text-white"
        />
        <Button onClick={handleSave} loading={saving} className="mt-3">
          Save NDA
        </Button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Holiday Calendar (reference)</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {HOLIDAYS_2026.map((h) => (
            <div key={h.date} className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-300">{h.name}</span>
              <span className="text-neutral-400 text-xs">
                {new Date(h.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
