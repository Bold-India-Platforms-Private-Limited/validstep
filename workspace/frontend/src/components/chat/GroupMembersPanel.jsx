import { X, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { useUpdateGroupMembersMutation } from "../../api/apiSlice";
import Avatar from "../ui/Avatar";
import { STATUS_META } from "../../utils/presenceStatus";

export default function GroupMembersPanel({ group, isAdmin, onlineUserIds = [], statuses = {}, onClose }) {
  const [updateMembers] = useUpdateGroupMembersMutation();

  async function handleRemove(userId) {
    await updateMembers({ groupId: group.id, removeUserIds: [userId] });
    toast.success("Removed from group");
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <p className="font-semibold text-sm text-neutral-900 dark:text-white">Members ({group.members?.length || 0})</p>
        {onClose && (
          <button onClick={onClose} className="p-1 text-neutral-400">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {group.members?.map((m) => {
          const isOnline = onlineUserIds.includes(m.userId);
          const statusMeta = STATUS_META[statuses[m.userId] || "AVAILABLE"];
          return (
            <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
              <div className="relative shrink-0">
                <Avatar name={m.user?.name} size={30} />
                {isOnline && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusMeta.dot} ring-2 ring-white dark:ring-neutral-900`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{m.user?.name}</p>
                <p className="text-xs text-neutral-400 truncate">{isOnline ? statusMeta.label : m.user?.email}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleRemove(m.userId)}
                  className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  title="Remove from group"
                >
                  <UserMinus size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
