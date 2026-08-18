import { Link } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import { useGetGroupsQuery } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Avatar from "../../components/ui/Avatar";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function GroupsListPage() {
  const { workspace, isLoading: wsLoading } = useMyWorkspace();
  const { data, isLoading } = useGetGroupsQuery({ workspaceId: workspace?.id }, { skip: !workspace });

  if (wsLoading || isLoading) return <PageSpinner />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-4 sm:px-6 pt-5 pb-3 sticky top-0 bg-neutral-50 dark:bg-neutral-950 z-10">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Groups</h1>
      </div>

      {data?.data?.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No groups yet" subtitle="Your admin hasn't added you to a group yet." />
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {data?.data?.map((g) => (
            <Link key={g.id} to={`/app/groups/${g.id}`} className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-white dark:hover:bg-neutral-900">
              <Avatar name={g.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">{g.name}</p>
                  {g.lastMessage && <span className="text-xs text-neutral-400 shrink-0">{timeAgo(g.lastMessage.createdAt)}</span>}
                </div>
                <p className="text-sm text-neutral-500 truncate">
                  {g.lastMessage ? `${g.lastMessage.user?.name}: ${g.lastMessage.content}` : `${g._count?.members || 0} members`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
