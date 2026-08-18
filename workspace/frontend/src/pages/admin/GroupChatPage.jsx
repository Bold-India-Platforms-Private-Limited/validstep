import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GroupChat from "../../components/chat/GroupChat";

export default function GroupChatPage() {
  const { workspaceId, groupId } = useParams();
  return (
    <div>
      <Link
        to={`/admin/w/${workspaceId}/team`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-3"
      >
        <ArrowLeft size={15} /> Team & Groups
      </Link>
      <GroupChat groupId={groupId} />
    </div>
  );
}
