import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useCreateBatchMutation } from '../../store/api/batchApi'
import { useGetProgramsQuery } from '../../store/api/companyApi'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'

const schema = z.object({
  program_id: z.string().uuid('Select a program'),
  name: z.string().min(2, 'Batch name required'),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),
  role: z.string().optional(),
  id_prefix: z.string().min(2).max(10).optional(),
  certificate_price: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Valid price required'),
  currency: z.string().default('INR'),
})

export default function BatchCreate() {
  const navigate = useNavigate()
  const { data: progData, isLoading: progLoading } = useGetProgramsQuery({})
  const [createBatch, { isLoading }] = useCreateBatchMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      const result = await createBatch({
        ...data,
        certificate_price: parseFloat(data.certificate_price),
      }).unwrap()
      toast.success('Batch created!')
      navigate(`/company/batches/${result.id}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create batch')
    }
  }

  if (progLoading) return <PageSpinner />
  const programs = progData?.programs || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Batch</h1>
          <p className="text-sm text-slate-500">Set up a new certificate batch</p>
        </div>
      </div>

      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Select label="Program" required error={errors.program_id?.message} {...register('program_id')}>
            <option value="">Select a program</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
          </Select>
          <Input label="Batch Name" placeholder="e.g. Summer Internship 2025" required error={errors.name?.message} {...register('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start Date" type="date" required error={errors.start_date?.message} {...register('start_date')} />
            <Input label="End Date" type="date" required error={errors.end_date?.message} {...register('end_date')} />
          </div>
          <Input label="Role / Designation" placeholder="e.g. Software Engineer Intern" {...register('role')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Certificate ID Prefix" placeholder="CERT" error={errors.id_prefix?.message} {...register('id_prefix')} />
            <Input label="Certificate Price (₹)" type="number" min="0" step="1" required error={errors.certificate_price?.message} {...register('certificate_price')} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Create Batch</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
