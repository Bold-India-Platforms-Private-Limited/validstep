import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCreateBatchMutation, useGetProgramsQuery, useCreateProgramMutation } from '../../store/api/companyApi'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'

const schema = z.object({
  program_id: z.string().min(1, 'Select a program'),
  name: z.string().min(2, 'Batch name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  role: z.string().optional(),
  id_prefix: z.string().min(2, 'ID prefix is required').max(6, 'Max 6 characters').toUpperCase(),
  certificate_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  status: z.enum(['DRAFT', 'ACTIVE']),
}).refine((d) => new Date(d.end_date) > new Date(d.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
})

const newProgramSchema = z.object({
  name: z.string().min(2, 'Required'),
  type: z.enum(['INTERNSHIP', 'COURSE', 'PARTICIPATION', 'HACKATHON', 'OTHER']),
})

export default function BatchCreate() {
  const navigate = useNavigate()
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [selectedType, setSelectedType] = useState('')

  const { data: programsData } = useGetProgramsQuery()
  const programs = programsData?.programs || (Array.isArray(programsData) ? programsData : [])
  const [createBatch, { isLoading }] = useCreateBatchMutation()
  const [createProgram, { isLoading: creatingProgram }] = useCreateProgramMutation()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'DRAFT', certificate_price: 299 },
  })

  const programId = watch('program_id')
  const selectedProgram = programs.find((p) => p.id?.toString() === programId?.toString())

  const newProgramForm = useForm({ resolver: zodResolver(newProgramSchema) })

  const handleNewProgram = async (data) => {
    try {
      const created = await createProgram(data).unwrap()
      setValue('program_id', created.id?.toString())
      setSelectedType(created.type)
      setShowNewProgram(false)
      toast.success('Program created!')
      newProgramForm.reset()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create program')
    }
  }

  const onSubmit = async (data) => {
    try {
      const batch = await createBatch(data).unwrap()
      toast.success('Batch created successfully!')
      navigate(`/company/batches/${batch.id}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create batch')
    }
  }

  const currentType = selectedProgram?.type || selectedType

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/company/batches"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Batch</h1>
        <p className="mt-1 text-sm text-slate-500">Set up a new certificate batch</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Program */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Program <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewProgram(!showNewProgram)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Program
                    </button>
                  </div>

                  {showNewProgram && (
                    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
                      <p className="text-sm font-medium text-primary-800">Create New Program</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          placeholder="Program name"
                          error={newProgramForm.formState.errors.name?.message}
                          {...newProgramForm.register('name')}
                        />
                        <Select {...newProgramForm.register('type')}>
                          <option value="INTERNSHIP">Internship / Fellowship</option>
                          <option value="COURSE">Course</option>
                          <option value="PARTICIPATION">Participation</option>
                          <option value="HACKATHON">Hackathon</option>
                          <option value="OTHER">Other</option>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          isLoading={creatingProgram}
                          onClick={newProgramForm.handleSubmit(handleNewProgram)}
                        >
                          Create
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowNewProgram(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <Select
                    error={errors.program_id?.message}
                    {...register('program_id')}
                    onChange={(e) => {
                      register('program_id').onChange(e)
                      const prog = programs.find((p) => p.id?.toString() === e.target.value)
                      setSelectedType(prog?.type || '')
                    }}
                  >
                    <option value="">Select a program...</option>
                    {programs.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.name} ({prog.type})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Batch name */}
                <Input
                  label="Batch Name"
                  placeholder="e.g. Summer Internship 2026 - Batch A"
                  error={errors.name?.message}
                  required
                  {...register('name')}
                />

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Start Date"
                    type="date"
                    error={errors.start_date?.message}
                    required
                    {...register('start_date')}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    error={errors.end_date?.message}
                    required
                    {...register('end_date')}
                  />
                </div>

                {/* Role (for internship only) */}
                {currentType === 'INTERNSHIP' && (
                  <Input
                    label="Role / Position"
                    placeholder="e.g. Software Development Intern"
                    hint="Displayed on the certificate"
                    error={errors.role?.message}
                    {...register('role')}
                  />
                )}

                {/* ID Prefix */}
                <Input
                  label="Certificate ID Prefix"
                  placeholder="e.g. BLU"
                  hint="Used in certificate serial numbers (e.g. BLU-2026-001)"
                  error={errors.id_prefix?.message}
                  required
                  className="uppercase"
                  {...register('id_prefix')}
                />

                {/* Price + Status */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Certificate Price (₹)"
                    type="number"
                    min="0"
                    step="1"
                    error={errors.certificate_price?.message}
                    required
                    {...register('certificate_price')}
                  />
                  <Select
                    label="Batch Status"
                    error={errors.status?.message}
                    required
                    {...register('status')}
                  >
                    <option value="DRAFT">Draft (not visible)</option>
                    <option value="ACTIVE">Active (enrollment open)</option>
                  </Select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" isLoading={isLoading} size="lg">
                    Create Batch
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate('/company/batches')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Help sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <h3 className="font-semibold text-slate-800 mb-3">Quick Guide</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-primary-100 text-primary-600 text-xs flex items-center justify-center font-bold">1</span>
                  Select or create a program
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-primary-100 text-primary-600 text-xs flex items-center justify-center font-bold">2</span>
                  Set batch dates and details
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-primary-100 text-primary-600 text-xs flex items-center justify-center font-bold">3</span>
                  Set the certificate price
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-primary-100 text-primary-600 text-xs flex items-center justify-center font-bold">4</span>
                  Activate and share the batch link
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h3 className="font-semibold text-slate-800 mb-2">Status Guide</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">Draft</p>
                  <p className="text-slate-500 text-xs">Batch is not visible to users. Use to prepare before going live.</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-700">Active</p>
                  <p className="text-slate-500 text-xs">Enrollment link is live and users can register & pay.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
