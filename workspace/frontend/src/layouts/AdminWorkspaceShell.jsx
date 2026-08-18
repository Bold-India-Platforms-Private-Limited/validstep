import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  FolderKanban,
  LayoutGrid,
  Camera,
  CalendarOff,
  ClipboardList,
  Megaphone,
  MessageSquareText,
  FileUp,
  Settings,
} from "lucide-react";
import { useGetWorkspaceQuery } from "../api/apiSlice";
import { PageSpinner } from "../components/ui/Spinner";

const TABS = [
  { to: "", label: "Overview", icon: LayoutGrid, end: true },
  { to: "team", label: "Team & Groups", icon: Users },
  { to: "projects", label: "Projects", icon: FolderKanban },
  { to: "attendance", label: "Attendance", icon: Camera },
  { to: "leave", label: "Leave", icon: CalendarOff },
  { to: "standup", label: "Standup", icon: ClipboardList },
  { to: "announcements", label: "Announcements", icon: Megaphone },
  { to: "queries", label: "Queries", icon: MessageSquareText },
  { to: "submissions", label: "Submissions", icon: FileUp },
  { to: "settings", label: "Settings", icon: Settings },
];

export default function AdminWorkspaceShell() {
  const { workspaceId } = useParams();
  const { data, isLoading } = useGetWorkspaceQuery(workspaceId);
  const location = useLocation();

  if (isLoading) return <PageSpinner />;
  const workspace = data?.workspace;

  return (
    <div className="flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 h-[calc(100vh-4rem)] sticky top-16 py-5 px-3">
        <Link
          to={workspace ? `/admin/companies/${workspace.companyId}` : "/admin"}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 mb-3"
        >
          <ArrowLeft size={13} /> {workspace?.company?.name}
        </Link>
        <p className="px-2 mb-4 font-semibold text-neutral-900 dark:text-white truncate">{workspace?.name}</p>

        <nav className="space-y-1">
          {TABS.map((tab) => {
            const path = `/admin/w/${workspaceId}${tab.to ? `/${tab.to}` : ""}`;
            const isActive = tab.end ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={tab.label}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                    : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <tab.icon size={17} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile: horizontal scroll tab strip since the sidebar is desktop-only */}
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 sticky top-16 z-20">
          {TABS.map((tab) => {
            const path = `/admin/w/${workspaceId}${tab.to ? `/${tab.to}` : ""}`;
            const isActive = tab.end ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={tab.label}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                  isActive ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600" : "text-neutral-500"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="mb-6 md:hidden">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{workspace?.name}</h1>
            <p className="text-sm text-neutral-500">
              {workspace?._count?.members} members · {workspace?._count?.groups} groups · {workspace?._count?.projects} projects
            </p>
          </div>
          <Outlet context={{ workspace }} />
        </div>
      </div>
    </div>
  );
}
