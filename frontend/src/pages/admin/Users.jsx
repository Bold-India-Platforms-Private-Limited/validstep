import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Users as UsersIcon, Search, Plus, Upload, Trash2 } from 'lucide-react'
import {
  useGetAdminUsersQuery, useCreateAdminUserMutation, useBulkUploadAdminUsersMutation,
  useGetAdminCompaniesQuery, useGetAdminBatchesQuery,
  useDeleteAdminUsersMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const addUserSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  company_id: z.string().uuid('Select an organization'),
  batch_id: z.string().uuid('Select a batch'),
})

function AddUserModal({ open, onClose }) {
  const { data: companiesData } = useGetAdminCompaniesQuery({ limit: 100 })
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ resolver: zodResolver(addUserSchema) })
  const [createUser, { isLoading }] = useCreateAdminUserMutation()

  const companyId = watch('company_id')
  const { data: batchesData } = useGetAdminBatchesQuery({ company_id: companyId, limit: 100 }, { skip: !companyId })

  const onSubmit = async (data) => {
    try {
      await createUser(data).unwrap()
      toast.success('User registered — a set-password email has been sent')
      reset()
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to register user')
    }
  }

  const handleClose = () => { reset(); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Add User">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Phone" {...register('phone')} />
        <Select label="Organization" required error={errors.company_id?.message} {...register('company_id')}>
          <option value="">Select an organization</option>
          {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Batch" required disabled={!companyId} error={errors.batch_id?.message} {...register('batch_id')}>
          <option value="">{companyId ? 'Select a batch' : 'Select an organization first'}</option>
          {(batchesData?.batches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Register</Button>
        </div>
      </form>
    </Modal>
  )
}

function BulkUploadModal({ open, onClose }) {
  const { data: companiesData } = useGetAdminCompaniesQuery({ limit: 100 })
  const [companyId, setCompanyId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const { data: batchesData } = useGetAdminBatchesQuery({ company_id: companyId, limit: 100 }, { skip: !companyId })
  const [bulkUpload, { isLoading }] = useBulkUploadAdminUsersMutation()

  const handleClose = () => { setCompanyId(''); setBatchId(''); setFile(null); setResult(null); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyId || !batchId || !file) { toast.error('Organization, batch, and file are all required'); return }
    const formData = new FormData()
    formData.append('company_id', companyId)
    formData.append('batch_id', batchId)
    formData.append('file', file)
    try {
      const res = await bulkUpload(formData).unwrap()
      setResult(res)
      toast.success(`Processed: ${res.created} created, ${res.enrolled_existing} enrolled, ${res.errors.length} errors`)
    } catch (err) {
      toast.error(err?.data?.message || 'Bulk upload failed')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Upload Users" size="lg">
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Either a clean roster (<strong>Name</strong>, <strong>Email</strong>, optionally <strong>Mobile</strong>) for manual/comp enrollment,
            or a raw <strong>PayU transaction report</strong> export (detected automatically) — captured rows are enrolled as real paid orders with their actual amount, a Payment, and an Invoice.
            Everyone goes into the organization + batch chosen below.
          </p>
          <Select label="Organization" required value={companyId} onChange={(e) => { setCompanyId(e.target.value); setBatchId('') }}>
            <option value="">Select an organization</option>
            {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Batch" required disabled={!companyId} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">{companyId ? 'Select a batch' : 'Select an organization first'}</option>
            {(batchesData?.batches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">File <span className="text-red-500">*</span></label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Upload & Process</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className={`grid gap-3 text-center ${result.skipped_not_captured !== undefined ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
              <p className="text-xs text-emerald-600">New Users</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{result.enrolled_existing}</p>
              <p className="text-xs text-blue-600">Existing Enrolled</p>
            </div>
            {result.skipped_not_captured !== undefined && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-2xl font-bold text-amber-700">{result.skipped_not_captured}</p>
                <p className="text-xs text-amber-600">Not Captured</p>
              </div>
            )}
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Row</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-500">{e.rowNum}</td>
                      <td className="px-3 py-2 text-slate-700">{e.email || '—'}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [selected, setSelected] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data, isLoading } = useGetAdminUsersQuery({
    page, limit,
    ...(search && { search }),
    ...(companyFilter && { company_id: companyFilter }),
    ...(batchFilter && { batch_id: batchFilter }),
  })
  const { data: companiesData } = useGetAdminCompaniesQuery({ limit: 100 })
  const { data: batchesData } = useGetAdminBatchesQuery({ company_id: companyFilter, limit: 100 }, { skip: !companyFilter })
  const [deleteUsers] = useDeleteAdminUsersMutation()

  const users = data?.users || []
  const pagination = data?.pagination || {}

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () => setSelected(selected.length === users.length ? [] : users.map((u) => u.id))

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setDeleting(true)
    try {
      const res = await deleteUsers(selected).unwrap()
      if (res.errors?.length > 0) {
        toast.error(`Deleted ${res.deleted}, skipped ${res.errors.length} (has paid enrollment)`)
      } else {
        toast.success(`Deleted ${res.deleted} user${res.deleted === 1 ? '' : 's'}`)
      }
      setSelected([])
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete users')
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Register or bulk-import participants for any organization's batch</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBulk(true)} leftIcon={<Upload className="h-4 w-4" />}>Bulk Upload</Button>
          <Button onClick={() => setShowAdd(true)} leftIcon={<Plus className="h-4 w-4" />}>Add User</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setBatchFilter(''); setPage(1) }}
          className="rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All organizations</option>
          {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={batchFilter}
          onChange={(e) => { setBatchFilter(e.target.value); setPage(1) }}
          disabled={!companyFilter}
          className="rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">All batches</option>
          {(batchesData?.batches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {selected.length > 0 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="ml-auto flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete {selected.length} selected
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <UsersIcon className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No users found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                  </th>
                  {['Name', 'Email', 'Phone', 'Organization / Batch'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(u.id) ? 'bg-primary-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {(u.orders || []).length === 0 && <span className="text-xs text-slate-400">—</span>}
                        {(u.orders || []).map((o, i) => (
                          <span key={i} className="text-xs">
                            <span className="font-medium text-slate-700">{o.company?.name}</span>
                            <span className="text-slate-400"> · </span>
                            <span className={`inline-block rounded-full px-2 py-0.5 font-medium ${o.is_manual_enrollment ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {o.batch?.name}
                            </span>
                          </span>
                        ))}
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

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} />
      <BulkUploadModal open={showBulk} onClose={() => setShowBulk(false)} />

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete users" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete {selected.length} user{selected.length > 1 ? 's' : ''}? Users with a real paid enrollment are skipped automatically and left untouched.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
