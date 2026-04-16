import { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Award, Mail, Lock } from 'lucide-react'
import { useUserLoginMutation } from '../../store/api/authApi'
import { setCredentials, selectIsAuthenticated } from '../../store/authSlice'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function UserLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [userLogin, { isLoading }] = useUserLoginMutation()

  const from = location.state?.from?.pathname || '/dashboard'

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
      const result = await userLogin(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))
      toast.success(`Welcome back, ${result.user.name}!`)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <Award className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ListedIndia Verify</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">My Certificates</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to view and download your certificates</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Sign In
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-slate-500">
            Don't have an account yet?{' '}
            <span className="text-slate-600">
              Use the link from your company to register.
            </span>
          </p>
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4 mt-4">
            Are you a company?{' '}
            <Link to="/auth/company/login" className="text-slate-600 hover:text-slate-800 underline">
              Company Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
