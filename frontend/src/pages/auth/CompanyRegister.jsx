import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Mail, Lock, Building2, Phone, Award } from 'lucide-react'
import { useCompanyRegisterMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  name: z.string().min(2, 'Company name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone required').optional().or(z.literal('')),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

export default function CompanyRegister() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [register_, { isLoading }] = useCompanyRegisterMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ confirmPassword, ...data }) => {
    try {
      const result = await register_(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: { ...result.company, role: 'COMPANY' } }))
      toast.success('Account created!')
      navigate('/company/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600">
            <Award className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Register Company</h1>
          <p className="mt-1 text-sm text-slate-500">Start issuing digital certificates</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Company Name" leftIcon={<Building2 className="h-4 w-4" />}
              error={errors.name?.message} required {...register('name')} />
            <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message} required {...register('email')} />
            <Input label="Phone" type="tel" leftIcon={<Phone className="h-4 w-4" />}
              error={errors.phone?.message} {...register('phone')} />
            <Input label="Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message} required {...register('password')} />
            <Input label="Confirm Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message} required {...register('confirmPassword')} />
            <Button type="submit" className="w-full" isLoading={isLoading}>Create Account</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/auth/company/login" className="font-medium text-primary-600 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
