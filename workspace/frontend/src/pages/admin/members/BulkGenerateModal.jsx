import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLazyGetBulkGeneratePreviewQuery, useBulkGenerateGroupsMutation } from "../../../api/apiSlice";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";

export default function BulkGenerateModal({ open, onClose, workspaceId }) {
  const [membersPerGroup, setMembersPerGroup] = useState(4);
  const [namePrefix, setNamePrefix] = useState("Group");
  const [fetchPreview, { data: preview, isFetching }] = useLazyGetBulkGeneratePreviewQuery();
  const [generate, { isLoading: generating }] = useBulkGenerateGroupsMutation();

  useEffect(() => {
    if (open) fetchPreview({ workspaceId, membersPerGroup });
  }, [open, membersPerGroup, workspaceId, fetchPreview]);

  async function handleGenerate() {
    try {
      const res = await generate({ workspaceId, membersPerGroup, namePrefix }).unwrap();
      toast.success(`Created ${res.created} groups`);
      onClose();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to generate groups");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate Groups Automatically">
      <p className="text-sm text-neutral-500 mb-4">
        Splits every intern who isn't in a group yet into evenly-sized groups. Run this again later to sweep up
        newly added interns.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Members per group</label>
          <input
            type="number"
            min={1}
            value={membersPerGroup}
            onChange={(e) => setMembersPerGroup(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Name prefix</label>
          <input
            value={namePrefix}
            onChange={(e) => setNamePrefix(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 text-sm space-y-1">
        {isFetching ? (
          <p className="text-neutral-400">Calculating…</p>
        ) : preview ? (
          <>
            <div className="flex justify-between">
              <span className="text-neutral-500">Ungrouped interns</span>
              <span className="font-medium text-neutral-900 dark:text-white">{preview.totalUngrouped}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Groups to create</span>
              <span className="font-medium text-neutral-900 dark:text-white">{preview.groupsNeeded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Full groups of {preview.membersPerGroup}</span>
              <span className="font-medium text-neutral-900 dark:text-white">{preview.fullGroups}</span>
            </div>
            {preview.remainder > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Last group size</span>
                <span className="font-medium text-neutral-900 dark:text-white">{preview.remainder}</span>
              </div>
            )}
          </>
        ) : null}
      </div>

      <Button
        className="w-full mt-4"
        onClick={handleGenerate}
        loading={generating}
        disabled={!preview?.totalUngrouped}
      >
        {preview?.totalUngrouped ? `Generate ${preview.groupsNeeded} Groups` : "No ungrouped members"}
      </Button>
    </Modal>
  );
}
