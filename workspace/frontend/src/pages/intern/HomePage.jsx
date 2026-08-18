import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { MessagesSquare, FolderKanban, ArrowRight, CalendarOff, ClipboardList } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../features/auth/authSlice";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import { useGetGroupsQuery, useGetProjectsQuery } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import Avatar from "../../components/ui/Avatar";
import NoticesFeed from "../../components/NoticesFeed";

const DashboardAnalytics = lazy(() => import("../../components/DashboardAnalytics")); // pulls in recharts

export default function HomePage() {
  const user = useSelector(selectCurrentUser);
  const { workspace, isLoading } = useMyWorkspace();
  const { data: groupsData } = useGetGroupsQuery({ workspaceId: workspace?.id, limit: 4 }, { skip: !workspace });
  const { data: projectsData } = useGetProjectsQuery({ workspaceId: workspace?.id, limit: 4 }, { skip: !workspace });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Avatar name={user?.name} size={46} />
        <div>
          <p className="text-sm text-neutral-500">Welcome back,</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{user?.name}</p>
        </div>
      </div>

      {workspace ? (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white mb-6">
          <p className="text-xs opacity-80">{workspace.company?.name}</p>
          <p className="text-xl font-bold">{workspace.name}</p>
        </div>
      ) : (
        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-5 text-center text-sm text-neutral-500 mb-6">
          You haven't been added to a batch yet. Contact your admin.
        </div>
      )}

      {workspace && (
        <Suspense fallback={null}>
          <DashboardAnalytics workspaceId={workspace.id} />
        </Suspense>
      )}

      <NoticesFeed workspaceId={workspace?.id} />

      <div className="grid grid-cols-2 gap-3 mb-6 sm:hidden">
        <Link to="/app/leave" className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3">
          <CalendarOff size={18} className="text-indigo-600" />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Leave</span>
        </Link>
        <Link to="/app/standup" className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3">
          <ClipboardList size={18} className="text-indigo-600" />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Standup</span>
        </Link>
      </div>

      <SectionHeader title="Your Groups" to="/app/groups" />
      <div className="space-y-2 mb-6">
        {groupsData?.data?.slice(0, 4).map((g) => (
          <Link
            key={g.id}
            to={`/app/groups/${g.id}`}
            className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3"
          >
            <div>
              <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100">{g.name}</p>
              <p className="text-xs text-neutral-400">{g._count?.members} members</p>
            </div>
            <MessagesSquare size={16} className="text-neutral-300" />
          </Link>
        ))}
        {groupsData?.data?.length === 0 && <p className="text-sm text-neutral-400">You're not in any group yet.</p>}
      </div>

      <SectionHeader title="Your Projects" to="/app/projects" />
      <div className="space-y-2">
        {projectsData?.data?.slice(0, 4).map((p) => (
          <Link
            key={p.id}
            to={`/app/projects/${p.id}`}
            className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3"
          >
            <div>
              <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100">{p.name}</p>
              <p className="text-xs text-neutral-400">{p.status?.replace("_", " ")}</p>
            </div>
            <FolderKanban size={16} className="text-neutral-300" />
          </Link>
        ))}
        {projectsData?.data?.length === 0 && <p className="text-sm text-neutral-400">No projects assigned to your group yet.</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, to }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-neutral-500">{title}</p>
      <Link to={to} className="text-xs text-indigo-600 flex items-center gap-0.5">
        See all <ArrowRight size={12} />
      </Link>
    </div>
  );
}
