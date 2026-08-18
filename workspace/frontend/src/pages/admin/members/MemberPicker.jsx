import { useState } from "react";
import { Search, Check } from "lucide-react";
import { useGetWorkspaceMembersQuery } from "../../../api/apiSlice";
import Avatar from "../../../components/ui/Avatar";
import Pagination from "../../../components/ui/Pagination";

// Reusable searchable, paginated checkbox list of workspace members.
export default function MemberPicker({ workspaceId, selected, onToggle, groupless = false, excludeUserIds = [] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useGetWorkspaceMembersQuery({
    workspaceId,
    page,
    limit: 10,
    search: search || undefined,
    groupless: groupless || undefined,
  });

  const members = (data?.data || []).filter((m) => !excludeUserIds.includes(m.userId));

  return (
    <div>
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search members…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
        />
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
        {isFetching && <p className="p-4 text-sm text-neutral-400">Loading…</p>}
        {!isFetching && members.length === 0 && <p className="p-4 text-sm text-neutral-400">No members found</p>}
        {members.map((m) => {
          const isSelected = selected.includes(m.userId);
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => onToggle(m.userId)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-left"
            >
              <Avatar name={m.user?.name} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-800 dark:text-neutral-100 truncate">{m.user?.name}</p>
                <p className="text-xs text-neutral-400 truncate">{m.user?.email}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-300 dark:border-neutral-600"
                }`}
              >
                {isSelected && <Check size={13} />}
              </div>
            </button>
          );
        })}
      </div>
      <Pagination pagination={data?.pagination} onPageChange={setPage} />
      <p className="text-xs text-neutral-500 mt-1">{selected.length} selected</p>
    </div>
  );
}
