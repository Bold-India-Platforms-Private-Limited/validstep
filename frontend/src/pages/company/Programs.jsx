import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, FolderOpen } from 'lucide-react'
import { useGetProgramsQuery, useCreateProgramMutation, useUpdateProgramMutation, useDeleteProgramMutation } from '../../store/api/companyApi'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageSpinner } from '../../components/ui/Spinner'

const TYPES = ['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']),
  description: z.string().optional(),
})

export default function Programs() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useGetProgramsQuery({})
  const [create, { isLoading: creating }] = useCreateProgramMutation()
  const [update, { isLoading: updating }] = useUpdateProgramMutation()
  const [deleteP] = useDeleteProgramMutation()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const openCreate = () => { setEditing(null); reset({ name: '', type: 'INTERNSHIP', description: '' }); setShowModal(true) }
  const openEdit = (p) => { setEditing(p); reset({ name: p.name, type: p.type, description: p.description || '' }); setShowModal(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) await update({ id: editing.id, ...data }).unwrap()
      else await create(data).unwrap()
      toast.success(editing ? 'Program updated' : 'Program created')
      setShowModal(false)
    } catch (err) { toast.error(err?.data?.message || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this program? All batches will also be deleted.')) return
    try { await deleteP(id).unwrap(); toast.success('Deleted') }
    catch (err) { toast.error(err?.data?.message || 'Cannot delete — batches may exist') }
  }

  if (isLoading) return <PageSpinner />

  const programs = data?.programs || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
          <p className="text-sm text-slate-500">Manage your certificate programs</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>New Program</Button>
      </div>

      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No programs yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first program to start issuing certificates</p>
          <Button onClick={openCreate} className="mt-4" size="sm">Create Program</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">{p.type}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              {p.description && <p className="mt-1 text-sm text-slate-500 truncate-2">{p.description}</p>}
              <p className="mt-3 text-xs text-slate-400">{p._count?.batches || 0} batches</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Program' : 'New Program'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Program Name" required error={errors.name?.message} {...register('name')} />
          <Select label="Type" required {...register('type')}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Textarea label="Description" rows={3} placeholder="Optional description" {...register('description')} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={creating || updating}>{editing ? 'Save Changes' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
