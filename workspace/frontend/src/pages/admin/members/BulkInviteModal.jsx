import { useState } from "react";
import toast from "react-hot-toast";
import { useBulkInviteMembersMutation } from "../../../api/apiSlice";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";

function parseLines(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split(",").map((s) => s.trim());
      if (b) return { name: a, email: b };
      return { name: a.split("@")[0], email: a };
    })
    .filter((m) => m.email.includes("@"));
}

export default function BulkInviteModal({ open, onClose, workspaceId }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);
  const [bulkInvite, { isLoading }] = useBulkInviteMembersMutation();

  const members = parseLines(text);

  async function handleSubmit() {
    if (members.length === 0) return toast.error("Add at least one valid email");
    try {
      const res = await bulkInvite({ workspaceId, members }).unwrap();
      setResults(res.data);
      toast.success(`${res.data.length} members added`);
    } catch (err) {
      toast.error(err?.data?.error || "Bulk invite failed");
    }
  }

  function handleClose() {
    setText("");
    setResults(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Add Members" maxWidth="max-w-xl">
      {!results ? (
        <>
          <p className="text-sm text-neutral-500 mb-2">
            Paste one intern per line: <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">Name, email@domain.com</code> (name
            optional).
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"Ravi Kumar, ravi@example.com\npriya@example.com"}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-neutral-900 dark:text-white"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-neutral-500">{members.length} valid rows detected</span>
            <Button onClick={handleSubmit} loading={isLoading} disabled={members.length === 0}>
              Add {members.length || ""} Members
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-500 mb-3">
            Login credentials are being emailed to each new member now. These are the same passwords, in case an
            email bounces or you'd rather share them directly.
          </p>
          <div className="max-h-80 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-neutral-500">Email</th>
                  <th className="text-left px-3 py-2 font-medium text-neutral-500">Temp Password</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.userId} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2 text-neutral-700 dark:text-neutral-200">{r.email}</td>
                    <td className="px-3 py-2 font-mono text-neutral-900 dark:text-white">{r.tempPassword || "(unchanged)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="secondary"
            className="w-full mt-3"
            onClick={() => {
              const csv = results.map((r) => `${r.email},${r.tempPassword || ""}`).join("\n");
              navigator.clipboard.writeText(csv);
              toast.success("Copied to clipboard");
            }}
          >
            Copy as CSV
          </Button>
          <Button className="w-full mt-2" onClick={handleClose}>
            Done
          </Button>
        </>
      )}
    </Modal>
  );
}
