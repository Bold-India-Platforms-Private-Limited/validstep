import { CheckSquare } from "lucide-react";

const STATUS_STYLES = {
  PLANNING: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  ACTIVE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  ON_HOLD: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  COMPLETED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

const PRIORITY_STYLES = {
  LOW: "text-neutral-400",
  MEDIUM: "text-amber-500",
  HIGH: "text-red-500",
};

export default function ProjectCard({ project }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 h-full hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-neutral-900 dark:text-white line-clamp-1">{project.name}</p>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[project.status]}`}>
          {project.status?.replace("_", " ")}
        </span>
      </div>
      {project.description && <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{project.description}</p>}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {project.groups?.slice(0, 3).map((pg) => (
          <span key={pg.id} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
            {pg.group?.name}
          </span>
        ))}
        {project.groups?.length > 3 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
            +{project.groups.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span className={`font-medium ${PRIORITY_STYLES[project.priority]}`}>{project.priority}</span>
        {project._count && (
          <span className="flex items-center gap-1">
            <CheckSquare size={12} /> {project._count.tasks} tasks
          </span>
        )}
      </div>

      {project.progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${project.progress}%` }} />
        </div>
      )}
    </div>
  );
}
