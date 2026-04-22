import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Mail, CheckCircle2 } from 'lucide-react'
import { useForgotPasswordMutation } from '../../store/api/authApi'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({ email: z.string().email() })

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await forgotPassword(data).unwrap()
      setSent(true)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send reset email')
    }
  }

  if (sent) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
        <p className="mt-2 text-sm text-slate-500">A password reset link has been sent if that email is registered.</p>
        <Link to="/auth/company/login" className="mt-6 inline-block text-sm text-primary-600 hover:underline">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your email to receive a reset link</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message} {...register('email')} />
            <Button type="submit" className="w-full" isLoading={isLoading}>Send Reset Link</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link to="/auth/company/login" className="text-primary-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
