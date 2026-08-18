import { Link } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import { useGetProjectsQuery } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import ProjectCard from "../../components/project/ProjectCard";

export default function ProjectsListPage() {
  const { workspace, isLoading: wsLoading } = useMyWorkspace();
  const { data, isLoading } = useGetProjectsQuery({ workspaceId: workspace?.id }, { skip: !workspace });

  if (wsLoading || isLoading) return <PageSpinner />;

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Projects</h1>
      {data?.data?.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" subtitle="Projects assigned to your group will show up here." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data?.data?.map((p) => (
            <Link key={p.id} to={`/app/projects/${p.id}`}>
              <ProjectCard project={p} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
