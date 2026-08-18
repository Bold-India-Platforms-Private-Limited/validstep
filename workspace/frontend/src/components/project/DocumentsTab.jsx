import { useState } from "react";
import { Plus, FileText, ExternalLink, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useGetDocumentsQuery, useAddDocumentMutation, useDeleteDocumentMutation } from "../../api/apiSlice";
import { PageSpinner } from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import Modal from "../ui/Modal";

export default function DocumentsTab({ projectId, canManage }) {
  const { data, isLoading } = useGetDocumentsQuery(projectId);
  const [addDocument, { isLoading: adding }] = useAddDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", driveLink: "", description: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await addDocument({ projectId, ...form }).unwrap();
      toast.success("Document added");
      setForm({ title: "", driveLink: "", description: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to add document");
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Documents</h2>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Add Document
          </Button>
        )}
      </div>

      {data?.data?.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" subtitle="Link shared drives, specs, or resources for this project." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data?.data?.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">{doc.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Added by {doc.addedBy?.name}</p>
                </div>
                {canManage && (
                  <button onClick={() => deleteDocument({ projectId, docId: doc.id })} className="text-neutral-300 hover:text-red-500 shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {doc.description && <p className="text-sm text-neutral-500 mt-2 line-clamp-2">{doc.description}</p>}
              <a
                href={doc.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-indigo-600 mt-3 hover:underline"
              >
                Open link <ExternalLink size={13} />
              </a>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Document">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
            <input
              autoFocus
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Link</label>
            <input
              required
              type="url"
              value={form.driveLink}
              onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
              placeholder="https://drive.google.com/…"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            />
          </div>
          <Button type="submit" loading={adding} className="w-full">
            Add Document
          </Button>
        </form>
      </Modal>
    </div>
  );
}
