import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Search, MessageSquareText } from "lucide-react";
import { useGetCandidateQueriesQuery } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/ui/Avatar";
import Pagination from "../../components/ui/Pagination";

export default function QueriesPage() {
  const { workspaceId } = useParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetCandidateQueriesQuery({ workspaceId, page, search: search || undefined });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Candidate Queries</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or message…"
            className="pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No queries yet" subtitle="Questions interns send from a project's Overview tab show up here." />
      ) : (
        <div className="space-y-2">
          {data?.data?.map((m) => (
            <div key={m.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-start gap-3">
              <Avatar name={m.user?.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{m.user?.name}</p>
                  <p className="text-xs text-neutral-400 shrink-0">{new Date(m.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <Link to={`/admin/w/${workspaceId}/projects/${m.project?.id}`} className="text-xs text-indigo-600 hover:underline">
                  {m.project?.name}
                </Link>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1.5">{m.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}
