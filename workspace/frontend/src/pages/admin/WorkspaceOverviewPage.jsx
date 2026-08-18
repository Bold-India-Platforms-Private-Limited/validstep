import { useOutletContext, Link, useParams } from "react-router-dom";
import { Users, MessagesSquare, FolderKanban } from "lucide-react";

export default function WorkspaceOverviewPage() {
  const { workspace } = useOutletContext();
  const { workspaceId } = useParams();
  if (!workspace) return null;

  const stats = [
    { label: "Members", value: workspace._count?.members || 0, icon: Users, to: `/admin/w/${workspaceId}/team` },
    { label: "Groups", value: workspace._count?.groups || 0, icon: MessagesSquare, to: `/admin/w/${workspaceId}/team` },
    { label: "Projects", value: workspace._count?.projects || 0, icon: FolderKanban, to: `/admin/w/${workspaceId}/projects` },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <Link
          key={s.label}
          to={s.to}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-neutral-500">{s.label}</p>
            </div>
          </div>
        </Link>
      ))}
      {workspace.description && (
        <div className="sm:col-span-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</p>
          <p className="text-sm text-neutral-500">{workspace.description}</p>
        </div>
      )}
    </div>
  );
}
