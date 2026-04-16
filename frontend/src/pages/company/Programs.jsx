import { useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
} from '../../store/api/companyApi'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageSpinner } from '../../components/ui/Spinner'

const programSchema = z.object({
  name: z.string().min(2, 'Program name is required'),
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']),
  description: z.string().optional(),
})

export default function Programs() {
  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const { data: programsData, isLoading } = useGetProgramsQuery()
  const programs = programsData?.programs || (Array.isArray(programsData) ? programsData : [])
  const [createProgram, { isLoading: creating }] = useCreateProgramMutation()
  const [updateProgram, { isLoading: updating }] = useUpdateProgramMutation()
  const [deleteProgram, { isLoading: deleting }] = useDeleteProgramMutation()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(programSchema) })

  const openCreate = () => {
    setEditingProgram(null)
    reset({ name: '', type: 'INTERNSHIP', description: '' })
    setShowModal(true)
  }

  const openEdit = (program) => {
    setEditingProgram(program)
    reset({ name: program.name, type: program.type, description: program.description || '' })
    setShowModal(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editingProgram) {
        await updateProgram({ id: editingProgram.id, ...data }).unwrap()
        toast.success('Program updated successfully')
      } else {
        await createProgram(data).unwrap()
        toast.success('Program created successfully')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProgram(deletingId).unwrap()
      toast.success('Program deleted')
      setDeletingId(null)
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed')
    }
  }

  const typeMap = {
    INTERNSHIP: { label: 'Internship / Fellowship', variant: 'primary' },
    COURSE: { label: 'Course', variant: 'success' },
    PARTICIPATION: { label: 'Participation', variant: 'info' },
    HACKATHON: { label: 'Hackathon', variant: 'warning' },
    OTHER: { label: 'Other', variant: 'default' },
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your certificate programs</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          New Program
        </Button>
      </div>

      <Card>
        {!programs || programs.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title="No programs yet"
              description="Create a program to start issuing certificates for your internships, courses, and events."
              action={
                <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                  Create Program
                </Button>
              }
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-slate-100">
            {programs.map((program) => (
              <div key={program.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                    <BookOpen className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{program.name}</p>
                    {program.description && (
                      <p className="text-sm text-slate-500">{program.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={typeMap[program.type]?.variant || 'default'}>
                    {typeMap[program.type]?.label || program.type}
                  </Badge>
                  <button
                    onClick={() => openEdit(program)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(program.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProgram ? 'Edit Program' : 'Create Program'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <Input
            label="Program Name"
            placeholder="e.g. Web Development Bootcamp"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Select
            label="Program Type"
            error={errors.type?.message}
            required
            {...register('type')}
          >
            <option value="INTERNSHIP">Internship / Fellowship</option>
            <option value="COURSE">Course</option>
            <option value="PARTICIPATION">Participation</option>
            <option value="HACKATHON">Hackathon</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input
            label="Description (optional)"
            placeholder="Brief description of this program"
            {...register('description')}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={creating || updating}>
              {editingProgram ? 'Update Program' : 'Create Program'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Program"
        message="Are you sure you want to delete this program? This action cannot be undone."
        confirmLabel="Delete Program"
        isLoading={deleting}
      />
    </div>
  )
}
