import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProjectDetailBody from "../../components/project/ProjectDetailBody";

export default function ProjectDetailPage() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Link
        to={`/admin/w/${workspaceId}/projects`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-3"
      >
        <ArrowLeft size={15} /> Projects
      </Link>
      <ProjectDetailBody projectId={projectId} onDeleted={() => navigate(`/admin/w/${workspaceId}/projects`)} />
    </div>
  );
}
