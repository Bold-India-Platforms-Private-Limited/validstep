import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { User, Mail, Phone, Lock } from 'lucide-react'
import { useUserRegisterMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import axiosClient from '../../api/axiosClient'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export default function UserRegister() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const batchSlug = searchParams.get('batch_slug')
  const [userRegister, { isLoading }] = useUserRegisterMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    const { confirmPassword, ...payload } = data
    if (batchSlug) payload.batch_slug = batchSlug

    try {
      const result = await userRegister(payload).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))

      // If we have a batch slug, initiate payment
      if (batchSlug) {
        toast.success('Account created! Redirecting to payment...')
        try {
          const payRes = await axiosClient.post('/payment/initiate', { batch_slug: batchSlug })
          const { payuUrl, formData } = payRes.data

          // Build and submit hidden PayU form
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = payuUrl
          Object.entries(formData).forEach(([key, value]) => {
            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = key
            input.value = value
            form.appendChild(input)
          })
          document.body.appendChild(form)
          form.submit()
        } catch (payErr) {
          toast.error('Could not initiate payment. Please try again from your dashboard.')
          navigate('/dashboard')
        }
      } else {
        toast.success('Account created successfully!')
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
          <p className="mt-1 text-sm text-slate-500">
            {batchSlug
              ? 'Register to get your certificate'
              : 'Create an account to view your certificates'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Full Name"
              placeholder="John Doe"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              required
              {...register('name')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              required
              {...register('email')}
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="+91 98765 43210"
              leftIcon={<Phone className="h-4 w-4" />}
              error={errors.mobile?.message}
              required
              {...register('mobile')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
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
              {batchSlug ? 'Register & Proceed to Payment' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/auth/user/login" className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
