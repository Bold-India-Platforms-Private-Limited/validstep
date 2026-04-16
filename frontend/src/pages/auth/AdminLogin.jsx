import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ShieldCheck, Mail, Lock } from 'lucide-react'
import { useAdminLoginMutation } from '../../store/api/authApi'
import { setCredentials, selectIsAuthenticated } from '../../store/authSlice'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password required'),
})

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [adminLogin, { isLoading }] = useAdminLoginMutation()

  const from = location.state?.from?.pathname || '/admin/dashboard'

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      const result = await adminLogin(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))
      toast.success('Welcome, Admin!')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid credentials')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-900/50">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-400">Validstep.com — Super Admin</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  placeholder="admin@validstep.com"
                  className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Sign In to Admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
