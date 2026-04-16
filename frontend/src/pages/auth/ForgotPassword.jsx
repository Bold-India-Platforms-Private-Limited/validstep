import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Award, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useForgotPasswordMutation } from '../../store/api/authApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') === 'user' ? 'user' : 'company'
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await forgotPassword({ email: data.email, type }).unwrap()
    } catch {
      // Always show success — don't reveal if email exists
    } finally {
      setSubmittedEmail(data.email)
      setSent(true)
    }
  }

  const loginPath = type === 'company' ? '/auth/company/login' : '/auth/user/login'
  const typeLabel = type === 'company' ? 'Organization' : 'Participant'

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

          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Check your inbox</h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                If <strong className="text-slate-700">{submittedEmail}</strong> is registered as a{' '}
                {typeLabel.toLowerCase()} account, we've sent a password reset link. It expires in{' '}
                <strong>1 hour</strong>.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Didn't get it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  try again
                </button>
                .
              </p>
              <Link
                to={loginPath}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your {typeLabel.toLowerCase()} email and we'll send a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder={type === 'company' ? 'company@example.com' : 'you@example.com'}
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to={loginPath}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to {typeLabel} Login
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Switch account type */}
        <p className="mt-5 text-center text-xs text-slate-400">
          {type === 'company' ? (
            <>
              Are you a participant?{' '}
              <Link to="/auth/forgot-password?type=user" className="text-slate-600 underline hover:text-slate-800">
                Reset participant password
              </Link>
            </>
          ) : (
            <>
              Are you an organization?{' '}
              <Link to="/auth/forgot-password?type=company" className="text-slate-600 underline hover:text-slate-800">
                Reset organization password
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
