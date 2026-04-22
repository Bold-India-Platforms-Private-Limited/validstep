import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import { useResetPasswordMutation } from '../../store/api/authApi'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password }) => {
    try {
      await resetPassword({ token, password }).unwrap()
      toast.success('Password reset successfully!')
      navigate('/auth/company/login')
    } catch (err) {
      toast.error(err?.data?.message || 'Reset failed')
    }
  }

  if (!token) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Invalid reset link. <Link to="/auth/forgot-password" className="text-primary-600 hover:underline">Request a new one</Link></p>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="New Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message} required {...register('password')} />
            <Input label="Confirm Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message} required {...register('confirmPassword')} />
            <Button type="submit" className="w-full" isLoading={isLoading}>Reset Password</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
