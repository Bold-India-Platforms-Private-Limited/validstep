import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Building2, ChevronRight, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useGetCompaniesQuery, useCreateCompanyMutation, useDeleteCompanyMutation } from "../../api/apiSlice";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";

export default function CompaniesPage() {
  const { data, isLoading } = useGetCompaniesQuery();
  const [createCompany, { isLoading: creating }] = useCreateCompanyMutation();
  const [deleteCompany] = useDeleteCompanyMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createCompany({ name }).unwrap();
      toast.success("Company created");
      setName("");
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed to create company");
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}" and ALL its batches, groups, and projects? This cannot be undone.`)) return;
    await deleteCompany(id);
    toast.success("Company deleted");
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Companies</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New Company
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          subtitle="Create a company to start setting up internship batches under it."
          action={<Button onClick={() => setOpen(true)}>Create your first company</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((company) => (
            <Link
              key={company.id}
              to={`/admin/companies/${company.id}`}
              className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900 dark:text-white truncate">{company.name}</p>
                  <p className="text-xs text-neutral-500">{company._count?.workspaces || 0} batches</p>
                </div>
                <ChevronRight size={16} className="text-neutral-400 group-hover:translate-x-0.5 transition" />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(company.id, company.name);
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                <Trash2 size={14} />
              </button>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Company">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Company name</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
              placeholder="e.g. Bold Analytics"
            />
          </div>
          <Button type="submit" loading={creating} className="w-full">
            Create Company
          </Button>
        </form>
      </Modal>
    </div>
  );
}
