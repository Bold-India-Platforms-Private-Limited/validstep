import { Suspense, lazy, useState } from "react";
import { LayoutGrid, Users, CheckSquare, FileText, CalendarDays, BarChart3, Settings, Trash2, BellRing } from "lucide-react";
import toast from "react-hot-toast";
import { useGetProjectQuery, useDeleteProjectMutation, useNotifyProjectMembersMutation } from "../../api/apiSlice";
import { PageSpinner } from "../ui/Spinner";
import OverviewTab from "./OverviewTab";
import PeopleTab from "./PeopleTab";
import TasksTab from "./TasksTab";
import DocumentsTab from "./DocumentsTab";
import CalendarTab from "./CalendarTab";
import SettingsTab from "./SettingsTab";

const AnalyticsTab = lazy(() => import("./AnalyticsTab")); // pulls in recharts — only loaded if this tab is opened

const STATUS_STYLES = {
  PLANNING: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  ACTIVE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  ON_HOLD: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  COMPLETED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "people", label: "People", icon: Users },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function ProjectDetailBody({ projectId, onDeleted }) {
  const { data, isLoading } = useGetProjectQuery(projectId);
  const [deleteProject] = useDeleteProjectMutation();
  const [notifyMembers, { isLoading: notifying }] = useNotifyProjectMembersMutation();
  const [tab, setTab] = useState("overview");

  if (isLoading) return <PageSpinner />;
  const project = data?.project;
  const isAdmin = data?.isAdmin;
  if (!project) return null;

  async function handleDelete() {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(projectId);
    toast.success("Project deleted");
    onDeleted?.();
  }

  async function handleNotify() {
    try {
      const { recipientCount } = await notifyMembers(projectId).unwrap();
      toast.success(recipientCount === 0 ? "No one to notify — assign this project to a group first" : `Emailing ${recipientCount} member(s)…`);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to send");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{project.name}</h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status]}`}>
              {project.status?.replace("_", " ")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {project.groups?.map((pg) => (
              <span key={pg.id} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
                {pg.group?.name}
              </span>
            ))}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleNotify}
              disabled={notifying}
              title="Email everyone in this project's groups"
              className="p-2 rounded-lg text-neutral-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-40"
            >
              <BellRing size={17} />
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 mb-6 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab project={project} isAdmin={isAdmin} />}
      {tab === "tasks" && <TasksTab project={project} workspaceId={project.workspaceId} isAdmin={isAdmin} />}
      {tab === "people" && <PeopleTab projectId={projectId} />}
      {tab === "documents" && <DocumentsTab projectId={projectId} canManage={isAdmin} />}
      {tab === "calendar" && <CalendarTab projectId={projectId} />}
      {tab === "analytics" && (
        <Suspense fallback={<PageSpinner />}>
          <AnalyticsTab projectId={projectId} />
        </Suspense>
      )}
      {tab === "settings" && isAdmin && <SettingsTab project={project} onDeleted={onDeleted} />}
    </div>
  );
}
