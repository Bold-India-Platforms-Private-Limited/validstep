import { Crown, Users } from "lucide-react";
import { useGetProjectPeopleQuery } from "../../api/apiSlice";
import { PageSpinner } from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import Avatar from "../ui/Avatar";

export default function PeopleTab({ projectId }) {
  const { data, isLoading } = useGetProjectPeopleQuery(projectId);

  if (isLoading) return <PageSpinner />;
  const people = data?.data || [];

  if (people.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No one has access yet"
        subtitle="Assign this project to a group and everyone in it will show up here."
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {people.map((p) => (
        <div key={p.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <Avatar name={p.name} size={38} src={p.image} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
              {p.name}
              {p.isTeamLead && <Crown size={13} className="text-amber-500 shrink-0" />}
            </p>
            <p className="text-xs text-neutral-400 truncate">{p.email}</p>
          </div>
          {p.assignedTaskCount > 0 && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full shrink-0">
              {p.assignedTaskCount} task{p.assignedTaskCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
