import { useState } from "react";
import toast from "react-hot-toast";
import { useCreateGroupMutation } from "../../../api/apiSlice";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import MemberPicker from "./MemberPicker";

export default function CreateGroupModal({ open, onClose, workspaceId }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [createGroup, { isLoading }] = useCreateGroupMutation();

  function toggle(userId) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createGroup({ workspaceId, name, memberIds: selected }).unwrap();
      toast.success("Group created");
      setName("");
      setSelected([]);
      onClose();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to create group");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Group name</label>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            placeholder="e.g. Team Alpha"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">Members (optional)</label>
          <MemberPicker workspaceId={workspaceId} selected={selected} onToggle={toggle} />
        </div>
        <Button type="submit" loading={isLoading} className="w-full">
          Create Group
        </Button>
      </form>
    </Modal>
  );
}
