import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Mail, Lock } from 'lucide-react'
import { useUserLoginMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default function UserLogin() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [login, { isLoading }] = useUserLoginMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      const result = await login(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: { ...result.user, role: 'USER' } }))
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
          <p className="mt-1 text-sm text-slate-500">Access your certificates</p>
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
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/" className="text-primary-600 hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
