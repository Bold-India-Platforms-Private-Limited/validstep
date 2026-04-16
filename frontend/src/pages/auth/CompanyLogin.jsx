import { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Award, Mail, Lock } from 'lucide-react'
import { useCompanyLoginMutation } from '../../store/api/authApi'
import { setCredentials, selectIsAuthenticated } from '../../store/authSlice'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function CompanyLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [companyLogin, { isLoading }] = useCompanyLoginMutation()

  const from = location.state?.from?.pathname || '/company/dashboard'

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
      const result = await companyLogin(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))
      toast.success(`Welcome back, ${result.user.name}!`)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary-600 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Award className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Validstep.com</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight text-white">
            Issue professional<br />certificates with ease
          </h2>
          <p className="mt-4 text-lg text-primary-200">
            Manage your programs, batches, and digital certificates — all in one place.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">55+</p>
            <p className="text-sm text-primary-200">Companies</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div className="text-center">
            <p className="text-3xl font-bold text-white">2K+</p>
            <p className="text-sm text-primary-200">Certificates Issued</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div className="text-center">
            <p className="text-3xl font-bold text-white">100%</p>
            <p className="text-sm text-primary-200">Verifiable</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
              <Award className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Validstep.com</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Company Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your company dashboard
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="company@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/auth/forgot-password?type=company"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/auth/company/register" className="font-medium text-primary-600 hover:text-primary-700">
              Register your company
            </Link>
          </p>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">
              Are you an end user?{' '}
              <Link to="/auth/user/login" className="text-slate-600 hover:text-slate-800 underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
