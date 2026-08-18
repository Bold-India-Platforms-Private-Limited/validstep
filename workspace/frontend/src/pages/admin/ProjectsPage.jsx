import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, FolderKanban } from "lucide-react";
import { useGetProjectsQuery } from "../../api/apiSlice";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import { PageSpinner } from "../../components/ui/Spinner";
import CreateProjectModal from "./projects/CreateProjectModal";
import ProjectCard from "../../components/project/ProjectCard";

export default function ProjectsPage() {
  const { workspaceId } = useParams();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetProjectsQuery({ workspaceId, page });
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Projects</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New Project
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          subtitle="Create a project and assign it to one or more groups."
          action={<Button onClick={() => setOpen(true)}>Create a project</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((p) => (
            <Link key={p.id} to={`/admin/w/${workspaceId}/projects/${p.id}`}>
              <ProjectCard project={p} />
            </Link>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CreateProjectModal open={open} onClose={() => setOpen(false)} workspaceId={workspaceId} />
    </div>
  );
}
