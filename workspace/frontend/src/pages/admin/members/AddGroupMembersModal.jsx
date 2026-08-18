import { useState } from "react";
import toast from "react-hot-toast";
import { useUpdateGroupMembersMutation } from "../../../api/apiSlice";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import MemberPicker from "./MemberPicker";

export default function AddGroupMembersModal({ open, onClose, workspaceId, group }) {
  const [selected, setSelected] = useState([]);
  const [updateMembers, { isLoading }] = useUpdateGroupMembersMutation();

  function toggle(userId) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit() {
    if (selected.length === 0) return;
    await updateMembers({ groupId: group.id, addUserIds: selected });
    toast.success("Members added");
    setSelected([]);
    onClose();
  }

  if (!group) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Add members to "${group.name}"`}>
      <MemberPicker
        workspaceId={workspaceId}
        selected={selected}
        onToggle={toggle}
        excludeUserIds={group.members?.map((m) => m.userId) || []}
      />
      <Button className="w-full mt-4" onClick={handleSubmit} loading={isLoading} disabled={selected.length === 0}>
        Add {selected.length || ""} Members
      </Button>
    </Modal>
  );
}
