import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  useGetAdminCompaniesQuery, useCreateAdminCompanyMutation,
  useDeleteAdminCompanyMutation, useResendCompanyPasswordMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { formatDate } from '../../utils/formatDate'
import { Building2, Search, ChevronRight, Plus, KeyRound, Trash2 } from 'lucide-react'

const createCompanySchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
})

function NewCompanyModal({ open, onClose }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(createCompanySchema) })
  const [createCompany, { isLoading }] = useCreateAdminCompanyMutation()

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data) => {
    try {
      await createCompany(data).unwrap()
      toast.success('Organization created — a set-password email has been sent')
      handleClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create organization')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Organization">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Organization Name" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Phone" {...register('phone')} />
        <Input label="Website" placeholder="https://" error={errors.website?.message} {...register('website')} />
        <Textarea label="Description" rows={3} {...register('description')} />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ company, onClose }) {
  const [resendPassword, { isLoading }] = useResendCompanyPasswordMutation()

  const handleConfirm = async () => {
    try {
      await resendPassword(company.id).unwrap()
      toast.success(`New login password emailed to ${company.email}`)
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reset password')
    }
  }

  return (
    <Modal open={!!company} onClose={onClose} title="Reset Login Password" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Generate a new login password for <strong>{company?.name}</strong> and email it to {company?.email}? Their current password stops working immediately.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} isLoading={isLoading}>Reset & Send</Button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteCompanyModal({ company, onClose }) {
  const [deleteCompany, { isLoading }] = useDeleteAdminCompanyMutation()

  const handleConfirm = async () => {
    try {
      await deleteCompany(company.id).unwrap()
      toast.success(`${company.name} deleted`)
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete organization')
    }
  }

  return (
    <Modal open={!!company} onClose={onClose} title="Delete Organization" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Permanently delete <strong>{company?.name}</strong>? This only works if the organization has no orders or certificates on record — otherwise it's blocked to protect that history.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminCompanies() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [resetPasswordFor, setResetPasswordFor] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { data, isLoading } = useGetAdminCompaniesQuery({
    page,
    limit,
    ...(search && { search }),
    ...(filter && { is_verified: filter }),
  })

  const companies = data?.companies || []
  const pagination = data?.pagination || {}

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500">Manage all registered organizations</p>
        </div>
        <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="h-4 w-4" />}>New Organization</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Building2 className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No organizations found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Organization', 'Email', 'Status', 'Joined', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                            <Building2 className="h-4 w-4 text-primary-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c._count?.batches || 0} batches</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${c.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                        {!c.is_active && (
                          <span className="w-fit rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/admin/companies/${c.id}`} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => setResetPasswordFor(c)}
                          title="Reset login password"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          title="Delete organization"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1) }}
          />
        </div>
      )}

      <NewCompanyModal open={showNew} onClose={() => setShowNew(false)} />
      <ResetPasswordModal company={resetPasswordFor} onClose={() => setResetPasswordFor(null)} />
      <DeleteCompanyModal company={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  )
}
