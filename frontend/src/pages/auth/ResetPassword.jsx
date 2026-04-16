import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Award, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useResetPasswordMutation } from '../../store/api/authApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const type  = searchParams.get('type') === 'user' ? 'user' : 'company'
  const [done, setDone] = useState(false)

  const [resetPassword, { isLoading }] = useResetPasswordMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const loginPath  = type === 'company' ? '/auth/company/login' : '/auth/user/login'
  const typeLabel  = type === 'company' ? 'Organization' : 'Participant'

  // No token in URL
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Invalid reset link</h1>
            <p className="mt-2 text-sm text-slate-500">
              This link is missing required information. Please request a new password reset.
            </p>
            <Link
              to={`/auth/forgot-password?type=${type}`}
              className="mt-6 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Request new reset link →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const onSubmit = async (data) => {
    try {
      await resetPassword({ token, password: data.password, type }).unwrap()
      setDone(true)
      toast.success('Password reset successfully!')
      setTimeout(() => navigate(loginPath), 2500)
    } catch (err) {
      toast.error(err?.data?.message || 'Reset link is invalid or has expired.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <Award className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Validstep.com</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {done ? (
            /* ── Success ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Password updated!</h1>
              <p className="mt-2 text-sm text-slate-500">
                Your password has been reset. Redirecting you to login…
              </p>
              <Link
                to={loginPath}
                className="mt-5 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Go to {typeLabel} Login →
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a strong password for your {typeLabel.toLowerCase()} account.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 8 characters"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat your password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  Reset Password
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to={loginPath}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel — back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
