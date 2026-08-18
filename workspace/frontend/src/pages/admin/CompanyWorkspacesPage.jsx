import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, ArrowLeft, Layers, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useGetCompanyWorkspacesQuery, useCreateWorkspaceMutation } from "../../api/apiSlice";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";

export default function CompanyWorkspacesPage() {
  const { companyId } = useParams();
  const { data, isLoading } = useGetCompanyWorkspacesQuery({ companyId });
  const [createWorkspace, { isLoading: creating }] = useCreateWorkspaceMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createWorkspace({ companyId, ...form }).unwrap();
      toast.success("Batch created");
      setForm({ name: "", description: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to create batch");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-3">
        <ArrowLeft size={15} /> Companies
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Batches / Workspaces</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New Batch
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          subtitle="Create an internship batch/workspace — you'll add groups, interns, and projects inside it."
          action={<Button onClick={() => setOpen(true)}>Create your first batch</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((ws) => (
            <Link
              key={ws.id}
              to={`/admin/w/${ws.id}`}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-neutral-900 dark:text-white">{ws.name}</p>
                <ChevronRight size={16} className="text-neutral-400 group-hover:translate-x-0.5 transition" />
              </div>
              {ws.description && <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{ws.description}</p>}
              <div className="flex gap-4 mt-3 text-xs text-neutral-500">
                <span>{ws._count?.members || 0} members</span>
                <span>{ws._count?.groups || 0} groups</span>
                <span>{ws._count?.projects || 0} projects</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Batch">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Batch name</label>
            <input
              autoFocus
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
              placeholder="e.g. Winter 2026 Internship"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            />
          </div>
          <Button type="submit" loading={creating} className="w-full">
            Create Batch
          </Button>
        </form>
      </Modal>
    </div>
  );
}
