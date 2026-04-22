import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Mail, Lock, Shield } from 'lucide-react'
import { useAdminLoginMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default function AdminLogin() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [login, { isLoading }] = useAdminLoginMutation()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      const result = await login(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: { ...result.admin, role: 'SUPERADMIN' } }))
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          <p className="mt-1 text-sm text-slate-500">Super admin access only</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message} {...register('password')} />
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" isLoading={isLoading}>
              Sign In as Admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
