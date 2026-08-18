import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useGetTasksQuery } from "../../api/apiSlice";
import { PageSpinner } from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import Avatar from "../ui/Avatar";
import MonthCalendar from "../ui/MonthCalendar";
import { localDateKey } from "../../utils/date";

const PRIORITY_DOT = { LOW: "bg-neutral-300", MEDIUM: "bg-amber-400", HIGH: "bg-red-500" };

export default function CalendarTab({ projectId }) {
  const { data, isLoading } = useGetTasksQuery(projectId);
  const [date, setDate] = useState(localDateKey());

  const tasks = data?.data || [];
  const withDueDate = useMemo(() => tasks.filter((t) => t.dueDate), [tasks]);
  const markers = useMemo(() => new Set(withDueDate.map((t) => localDateKey(new Date(t.dueDate)))), [withDueDate]);
  const dueOnSelected = withDueDate.filter((t) => localDateKey(new Date(t.dueDate)) === date);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <MonthCalendar value={date} onChange={setDate} markers={markers} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-3">
          {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>

        {dueOnSelected.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing due this day" />
        ) : (
          <div className="space-y-2">
            {dueOnSelected.map((t) => (
              <div key={t.id} className="flex items-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{t.title}</p>
                  <p className="text-xs text-neutral-400">{t.status.replace("_", " ")}</p>
                </div>
                <div className="flex -space-x-1.5 shrink-0">
                  {t.assignees?.slice(0, 3).map((a) => (
                    <Avatar key={a.id} name={a.user?.name} size={22} className="ring-2 ring-white dark:ring-neutral-900" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
