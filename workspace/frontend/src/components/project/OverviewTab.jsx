import { Calendar, User, Flag, Layers } from "lucide-react";
import { useGetTasksQuery } from "../../api/apiSlice";
import Avatar from "../ui/Avatar";
import MessagePMSection from "./MessagePMSection";

const STATUS_LABELS = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function OverviewTab({ project, isAdmin }) {
  const { data } = useGetTasksQuery(project.id);
  const tasks = data?.data || [];
  const done = tasks.filter((t) => t.status === "DONE").length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-neutral-500 mb-2">Description</p>
          <p className="text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap">
            {project.description || "No description added yet."}
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-neutral-500">Task completion</p>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{percent}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {done} of {tasks.length} task{tasks.length === 1 ? "" : "s"} done
          </p>
        </div>

        {!isAdmin && <MessagePMSection projectId={project.id} />}
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 h-fit">
        <InfoRow icon={Layers} label="Status" value={STATUS_LABELS[project.status]} />
        <InfoRow icon={Flag} label="Priority" value={project.priority} />
        <InfoRow
          icon={User}
          label="Team lead"
          value={
            project.teamLead ? (
              <span className="flex items-center gap-1.5">
                <Avatar name={project.teamLead.name} size={18} /> {project.teamLead.name}
              </span>
            ) : (
              "Unassigned"
            )
          }
        />
        <InfoRow
          icon={Calendar}
          label="Timeline"
          value={
            project.startDate || project.endDate
              ? `${project.startDate ? new Date(project.startDate).toLocaleDateString() : "…"} → ${
                  project.endDate ? new Date(project.endDate).toLocaleDateString() : "…"
                }`
              : "No dates set"
          }
        />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
        <Icon size={12} /> {label}
      </p>
      <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{value}</div>
    </div>
  );
}
