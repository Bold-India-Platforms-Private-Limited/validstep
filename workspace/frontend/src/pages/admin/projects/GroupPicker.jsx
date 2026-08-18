import { useState } from "react";
import { Check } from "lucide-react";
import { useGetGroupsQuery, useGetAllGroupsQuery } from "../../../api/apiSlice";
import Pagination from "../../../components/ui/Pagination";

export default function GroupPicker({ workspaceId, selected, onToggle, onChange }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useGetGroupsQuery({ workspaceId, page, limit: 12 });
  const { data: allGroups } = useGetAllGroupsQuery(workspaceId, { skip: !onChange });

  const allSelected = allGroups?.data?.length > 0 && selected.length === allGroups.data.length;

  return (
    <div>
      {onChange && allGroups?.data?.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-400">{allGroups.data.length} group(s) total</span>
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : allGroups.data.map((g) => g.id))}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            {allSelected ? "Clear all" : "Select all groups"}
          </button>
        </div>
      )}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
        {isFetching && <p className="p-4 text-sm text-neutral-400">Loading…</p>}
        {!isFetching && data?.data?.length === 0 && <p className="p-4 text-sm text-neutral-400">No groups yet</p>}
        {data?.data?.map((g) => {
          const isSelected = selected.includes(g.id);
          return (
            <button
              type="button"
              key={g.id}
              onClick={() => onToggle(g.id)}
              className="w-full flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-left"
            >
              <div>
                <p className="text-sm text-neutral-800 dark:text-neutral-100">{g.name}</p>
                <p className="text-xs text-neutral-400">{g._count?.members || 0} members</p>
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
      <p className="text-xs text-neutral-500 mt-1">{selected.length} group(s) selected</p>
    </div>
  );
}
