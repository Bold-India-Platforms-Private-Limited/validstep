import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { localDateKey } from "../../utils/date";

export default function MonthCalendar({ value, onChange, markers }) {
  const selected = value ? new Date(value + "T00:00:00") : new Date();
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  const today = localDateKey();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 w-full max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-neutral-400 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = localDateKey(new Date(year, month, d));
          const isSelected = iso === value;
          const isToday = iso === today;
          const hasMarker = markers?.has(iso);
          return (
            <button
              key={i}
              onClick={() => onChange(iso)}
              className={`relative aspect-square rounded-lg text-sm flex items-center justify-center transition ${
                isSelected
                  ? "bg-indigo-600 text-white font-semibold"
                  : isToday
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-medium"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
              }`}
            >
              {d}
              {hasMarker && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-indigo-500"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
