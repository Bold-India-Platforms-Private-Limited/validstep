import { useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import MonthCalendar from "../../components/ui/MonthCalendar";
import EmptyState from "../../components/ui/EmptyState";
import { HOLIDAYS_2026, holidayOn } from "../../utils/holidays";
import { localDateKey } from "../../utils/date";

export default function CalendarPage() {
  const [date, setDate] = useState(localDateKey());
  const markers = useMemo(() => new Set(HOLIDAYS_2026.map((h) => h.date)), []);
  const holiday = holidayOn(date);

  return (
    <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-5">Holiday Calendar</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <MonthCalendar value={date} onChange={setDate} markers={markers} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-3">
            {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {holiday ? (
            <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <PartyPopper size={22} className="text-indigo-500" />
              <p className="font-medium text-neutral-900 dark:text-white">{holiday.name}</p>
            </div>
          ) : (
            <EmptyState title="No holiday on this day" />
          )}

          <p className="text-sm font-semibold text-neutral-500 mt-6 mb-2">Upcoming holidays</p>
          <div className="space-y-2">
            {HOLIDAYS_2026.filter((h) => h.date >= localDateKey()).slice(0, 6).map((h) => (
              <div key={h.date} className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2">
                <span className="text-sm text-neutral-700 dark:text-neutral-200">{h.name}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(h.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
