import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GroupChat from "../../components/chat/GroupChat";

export default function GroupChatPage() {
  const { groupId } = useParams();
  return (
    <div className="px-3 sm:px-6 pt-3">
      <Link to="/app/groups" className="sm:hidden inline-flex items-center gap-1.5 text-sm text-neutral-500 mb-2">
        <ArrowLeft size={15} /> Groups
      </Link>
      <GroupChat groupId={groupId} />
    </div>
  );
}
