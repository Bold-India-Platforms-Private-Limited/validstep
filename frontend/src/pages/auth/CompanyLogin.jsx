import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Mail, Lock, Award } from 'lucide-react'
import { useCompanyLoginMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
})

export default function CompanyLogin() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [login, { isLoading }] = useCompanyLoginMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      const result = await login(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: { ...result.company, role: 'COMPANY' } }))
      navigate('/company/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600">
            <Award className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Company Login</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your certificates</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message} {...register('password')} />
            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" isLoading={isLoading}>Sign In</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/auth/company/register" className="font-medium text-primary-600 hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
