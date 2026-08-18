import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGetStandupsByDateQuery } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/ui/Avatar";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function StandupPage() {
  const { workspaceId } = useParams();
  const [date, setDate] = useState(todayISO());
  const { data, isLoading } = useGetStandupsByDateQuery({ workspaceId, date });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Standup</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm text-neutral-900 dark:text-white"
        />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState title="No entries for this date" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data?.data?.map((s) => (
            <div key={s.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Avatar name={s.user?.name} size={28} />
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{s.user?.name}</p>
                  <p className="text-xs text-neutral-400">{s.type.replace(/_/g, " ")}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">{s.title}</p>
              <p className="text-sm text-neutral-500 mt-1">{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
