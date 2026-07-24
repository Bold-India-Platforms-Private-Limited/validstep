import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Users as UsersIcon, Search, Plus, Upload, Download } from 'lucide-react'
import {
  useGetAdminUsersQuery, useCreateAdminUserMutation, useBulkUploadAdminUsersMutation,
  useGetAdminCompaniesQuery, useGetAdminBatchesQuery, useImportPayuTransactionsMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { formatDate } from '../../utils/formatDate'

const addUserSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  company_id: z.string().uuid('Select a company'),
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
        <Select label="Company" required error={errors.company_id?.message} {...register('company_id')}>
          <option value="">Select a company</option>
          {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Batch" required disabled={!companyId} error={errors.batch_id?.message} {...register('batch_id')}>
          <option value="">{companyId ? 'Select a batch' : 'Select a company first'}</option>
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

function ImportTransactionsModal({ open, onClose }) {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [importTransactions, { isLoading }] = useImportPayuTransactionsMutation()

  const handleClose = () => { setFile(null); setResult(null); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Choose a file to upload'); return }
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await importTransactions(formData).unwrap()
      setResult(res)
      toast.success(`Imported ${res.imported} captured transactions, ${res.new_users_created} new user accounts created`)
    } catch (err) {
      toast.error(err?.data?.message || 'Import failed')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import PayU Transactions" size="lg">
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">Upload the transaction report exported from your PayU dashboard. Only <strong>captured</strong> (successful) rows create user accounts — refunded, failed, cancelled, and pending rows are recorded but skipped. Already-imported transactions (matched by PayU Payment ID) are never duplicated.</p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">File <span className="text-red-500">*</span></label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          {isLoading && (
            <p className="text-xs text-amber-700">Processing — large reports (1000+ rows) can take a few minutes since each new account is securely hashed. Don't close this window.</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={handleClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Upload & Process</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            {[
              ['imported', 'Imported', 'bg-emerald-50', 'text-emerald-700', 'text-emerald-600'],
              ['duplicate', 'Duplicate', 'bg-slate-100', 'text-slate-700', 'text-slate-500'],
              ['refunded', 'Refunded', 'bg-amber-50', 'text-amber-700', 'text-amber-600'],
              ['failed', 'Failed', 'bg-red-50', 'text-red-700', 'text-red-600'],
              ['cancelled', 'Cancelled', 'bg-red-50', 'text-red-700', 'text-red-600'],
              ['pending', 'Pending', 'bg-amber-50', 'text-amber-700', 'text-amber-600'],
            ].map(([key, label, bg, valueColor, labelColor]) => (
              <div key={key} className={`rounded-lg ${bg} p-3`}>
                <p className={`text-xl font-bold ${valueColor}`}>{result[key]}</p>
                <p className={`text-xs ${labelColor}`}>{label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-600">
            {result.total_rows} rows processed &middot; <strong>{result.new_users_created}</strong> new user account{result.new_users_created === 1 ? '' : 's'} created
          </p>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
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
    if (!companyId || !batchId || !file) { toast.error('Company, batch, and file are all required'); return }
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
          <p className="text-xs text-slate-500">Excel/CSV needs <strong>Name</strong>, <strong>Email</strong>, and optionally <strong>Mobile</strong> columns. Everyone in the file is enrolled into the company + batch chosen below.</p>
          <Select label="Company" required value={companyId} onChange={(e) => { setCompanyId(e.target.value); setBatchId('') }}>
            <option value="">Select a company</option>
            {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Batch" required disabled={!companyId} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">{companyId ? 'Select a batch' : 'Select a company first'}</option>
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
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
              <p className="text-xs text-emerald-600">New Users</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{result.enrolled_existing}</p>
              <p className="text-xs text-blue-600">Existing Enrolled</p>
            </div>
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
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showImportTxns, setShowImportTxns] = useState(false)
  const { data, isLoading } = useGetAdminUsersQuery({ page, limit, ...(search && { search }) })

  const users = data?.users || []
  const pagination = data?.pagination || {}

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Register or bulk-import participants for any company's batch</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImportTxns(true)} leftIcon={<Download className="h-4 w-4" />}>Import PayU Transactions</Button>
          <Button variant="secondary" onClick={() => setShowBulk(true)} leftIcon={<Upload className="h-4 w-4" />}>Bulk Upload</Button>
          <Button onClick={() => setShowAdd(true)} leftIcon={<Plus className="h-4 w-4" />}>Add User</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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
                  {['Name', 'Email', 'Phone', 'Enrollments', 'Joined'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.orders || []).length === 0 && <span className="text-xs text-slate-400">—</span>}
                        {(u.orders || []).map((o, i) => (
                          <span key={i} className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${o.is_manual_enrollment ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`} title={o.company?.name}>
                            {o.batch?.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(u.created_at)}</td>
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
      <ImportTransactionsModal open={showImportTxns} onClose={() => setShowImportTxns(false)} />
    </div>
  )
}
