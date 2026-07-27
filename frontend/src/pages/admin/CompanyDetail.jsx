import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  useGetAdminCompanyQuery, useUpdateCompanyStatusMutation,
  useCreateAdminCompanyProgramMutation, useCreateAdminCompanyBatchMutation,
  useDeleteAdminCompanyMutation, useDeleteAdminCompanyBatchMutation, useResendCompanyPasswordMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { ArrowLeft, Building2, Mail, Phone, Globe, Layers, CheckCircle, XCircle, ToggleLeft, ToggleRight, Plus, KeyRound, Trash2 } from 'lucide-react'

const PROGRAM_TYPES = ['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']

const programSchema = z.object({
  name: z.string().min(2, 'Name required'),
  type: z.enum(PROGRAM_TYPES),
  description: z.string().optional(),
})

const batchSchema = z.object({
  program_id: z.string().uuid('Select a program'),
  name: z.string().min(2, 'Batch name required'),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),
  certificate_delivery_date: z.string().optional(),
  description: z.string().optional(),
  role: z.string().optional(),
  id_prefix: z.string().min(2).max(10).optional().or(z.literal('')),
  certificate_price: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valid price required'),
  currency: z.string().default('INR'),
})

function NewProgramModal({ open, onClose, companyId }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(programSchema) })
  const [createProgram, { isLoading }] = useCreateAdminCompanyProgramMutation()

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data) => {
    try {
      await createProgram({ companyId, ...data }).unwrap()
      toast.success('Program created')
      handleClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create program')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Program">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Program Name" required error={errors.name?.message} {...register('name')} />
        <Select label="Type" required error={errors.type?.message} {...register('type')}>
          {PROGRAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Textarea label="Description" rows={3} placeholder="Optional description" {...register('description')} />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

function NewBatchModal({ open, onClose, companyId, programs }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(batchSchema) })
  const [createBatch, { isLoading }] = useCreateAdminCompanyBatchMutation()

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (data) => {
    try {
      await createBatch({ companyId, ...data, certificate_price: parseFloat(data.certificate_price) }).unwrap()
      toast.success('Batch created')
      handleClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create batch')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Batch" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Program" required error={errors.program_id?.message} {...register('program_id')}>
          <option value="">Select a program</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
        </Select>
        <Input label="Batch Name" placeholder="e.g. Summer Internship 2025" required error={errors.name?.message} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start Date" type="date" required error={errors.start_date?.message} {...register('start_date')} />
          <Input label="End Date" type="date" required error={errors.end_date?.message} {...register('end_date')} />
        </div>
        <Input label="Certificate Delivery Date" type="date" error={errors.certificate_delivery_date?.message} {...register('certificate_delivery_date')} />
        <Textarea label="Description" rows={2} placeholder="Optional description" {...register('description')} />
        <Input label="Role / Designation" placeholder="e.g. Software Engineer Intern" {...register('role')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="ID Prefix" placeholder="CERT" {...register('id_prefix')} />
          <Input label="Certificate Price (₹)" type="number" step="0.01" required error={errors.certificate_price?.message} {...register('certificate_price')} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteBatchModal({ batch, companyId, onClose }) {
  const [deleteBatch, { isLoading }] = useDeleteAdminCompanyBatchMutation()

  const handleConfirm = async () => {
    try {
      await deleteBatch({ companyId, id: batch.id }).unwrap()
      toast.success(`${batch.name} deleted`)
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete batch')
    }
  }

  return (
    <Modal open={!!batch} onClose={onClose} title="Delete Batch" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Permanently delete <strong>{batch?.name}</strong>? This only works if the batch has no orders or certificates on record — otherwise it's blocked to protect that history.
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

function DeleteCompanyModal({ company, onClose, onDeleted }) {
  const [deleteCompany, { isLoading }] = useDeleteAdminCompanyMutation()

  const handleConfirm = async () => {
    try {
      await deleteCompany(company.id).unwrap()
      toast.success(`${company.name} deleted`)
      onDeleted()
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

export default function AdminCompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useGetAdminCompanyQuery(id)
  const [updateStatus, { isLoading: updating }] = useUpdateCompanyStatusMutation()
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [showNewBatch, setShowNewBatch] = useState(false)
  const [showDeleteCompany, setShowDeleteCompany] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null)

  if (isLoading) return <PageSpinner />
  if (!data) return <p className="p-6 text-slate-500">Organization not found</p>

  // Backend returns programs[].batches[] — flatten to a single batches array
  const company = data
  const programs = data.programs || []
  const batches = programs.flatMap((p) =>
    (p.batches || []).map((b) => ({ ...b, program: { name: p.name, type: p.type } }))
  )

  const handleVerify = async (is_verified) => {
    try {
      await updateStatus({ id, is_verified }).unwrap()
      toast.success(is_verified ? 'Organization verified' : 'Verification revoked')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed')
    }
  }

  const handleToggleActive = async () => {
    try {
      await updateStatus({ id, is_active: !company.is_active }).unwrap()
      toast.success(company.is_active ? 'Organization deactivated' : 'Organization activated')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/companies" className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">Organization details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50">
                  <Building2 className="h-8 w-8 text-primary-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{company.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${company.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {company.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${company.is_active ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {company.email}
              </div>
              {company.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {company.phone}
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline truncate">{company.website}</a>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500">
                <Layers className="h-4 w-4 text-slate-400" />
                {batches.length} batches
              </div>
            </div>

            {company.description && (
              <p className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4">{company.description}</p>
            )}

            <div className="mt-4 space-y-2">
              {!company.is_verified ? (
                <button
                  onClick={() => handleVerify(true)}
                  disabled={updating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Verify Organization
                </button>
              ) : (
                <button
                  onClick={() => handleVerify(false)}
                  disabled={updating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Revoke Verification
                </button>
              )}
              <button
                onClick={handleToggleActive}
                disabled={updating}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium disabled:opacity-50 transition-colors ${
                  company.is_active
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {company.is_active
                  ? <><ToggleRight className="h-4 w-4" /> Deactivate</>
                  : <><ToggleLeft className="h-4 w-4" /> Activate</>
                }
              </button>
              <button
                onClick={() => setShowResetPassword(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                Reset Login Password
              </button>
              <button
                onClick={() => setShowDeleteCompany(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Organization
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">Joined {formatDate(company.created_at)}</p>
          </div>
        </div>

        {/* Batches */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Batches</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowNewProgram(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>New Program</Button>
              <Button size="sm" onClick={() => setShowNewBatch(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>New Batch</Button>
            </div>
          </div>
          {batches.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-400">No batches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{b.name}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{b.program?.name} · {b.program?.type}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(b.start_date)} — {formatDate(b.end_date)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link to={`/admin/batches/${b.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        View
                      </Link>
                      <button
                        onClick={() => setDeleteBatchTarget(b)}
                        title="Delete batch"
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span>{formatCurrency(b.certificate_price)} per cert</span>
                    <span>{b._count?.orders || 0} orders</span>
                    <span>{b._count?.certificates || 0} certs issued</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewProgramModal open={showNewProgram} onClose={() => setShowNewProgram(false)} companyId={id} />
      <NewBatchModal open={showNewBatch} onClose={() => setShowNewBatch(false)} companyId={id} programs={programs} />
      <ResetPasswordModal company={showResetPassword ? company : null} onClose={() => setShowResetPassword(false)} />
      <DeleteCompanyModal
        company={showDeleteCompany ? company : null}
        onClose={() => setShowDeleteCompany(false)}
        onDeleted={() => navigate('/admin/companies')}
      />
      <DeleteBatchModal batch={deleteBatchTarget} companyId={id} onClose={() => setDeleteBatchTarget(null)} />
    </div>
  )
}
