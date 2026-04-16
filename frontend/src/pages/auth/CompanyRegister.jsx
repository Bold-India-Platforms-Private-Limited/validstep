import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Award, Mail, Lock, Building2, Phone, Globe } from 'lucide-react'
import { useCompanyRegisterMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export default function CompanyRegister() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [companyRegister, { isLoading }] = useCompanyRegisterMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    const { confirmPassword, ...payload } = data
    try {
      const result = await companyRegister(payload).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))
      toast.success('Company registered successfully!')
      navigate('/company/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <Award className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Validstep.com</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Register your Company</h1>
          <p className="mt-1 text-sm text-slate-500">Start issuing professional certificates today</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Company Name"
              placeholder="Acme Corp Pvt. Ltd."
              leftIcon={<Building2 className="h-4 w-4" />}
              error={errors.name?.message}
              required
              {...register('name')}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Email Address"
                type="email"
                placeholder="contact@company.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                required
                {...register('email')}
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="h-4 w-4" />}
                error={errors.phone?.message}
                required
                {...register('phone')}
              />
            </div>
            <Input
              label="Website (optional)"
              type="url"
              placeholder="https://company.com"
              leftIcon={<Globe className="h-4 w-4" />}
              error={errors.website?.message}
              {...register('website')}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                required
                {...register('password')}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.confirmPassword?.message}
                required
                {...register('confirmPassword')}
              />
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
              Create Company Account
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/auth/company/login" className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
