import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProjectDetailBody from "../../components/project/ProjectDetailBody";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto">
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 mb-3">
        <ArrowLeft size={15} /> Projects
      </Link>
      <ProjectDetailBody projectId={projectId} onDeleted={() => navigate("/app/projects")} />
    </div>
  );
}
