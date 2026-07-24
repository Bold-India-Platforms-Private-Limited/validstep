import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Mail, Lock, Award, ArrowLeft } from 'lucide-react'
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
    <div
      className="flex min-h-screen flex-col bg-white md:items-center md:justify-center md:bg-gradient-to-br md:from-slate-50 md:to-primary-50 md:p-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Back arrow — mobile app-bar only */}
      <div className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
        <Link to="/" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 active:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col md:w-full md:max-w-md md:flex-none">
        {/* Header — app icon on mobile, plain text on desktop */}
        <div className="flex flex-col items-center px-6 pb-6 pt-10 md:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-md shadow-primary-200">
            <Award className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Sign In</h1>
          <p className="mt-1 text-sm text-slate-500">Access your certificates</p>
        </div>
        <div className="mb-8 hidden text-center md:block">
          <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
          <p className="mt-1 text-sm text-slate-500">Access your certificates</p>
        </div>

        <div className="flex flex-1 flex-col md:flex-none md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-8 md:shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-6 md:flex-none md:gap-0 md:space-y-4 md:px-0">
            <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message} {...register('password')} />
            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full rounded-full md:rounded-lg" isLoading={isLoading}>Sign In</Button>
          </form>
        </div>

        <p className="px-6 pb-8 pt-6 text-center text-sm text-slate-500 md:mt-4 md:px-0 md:pb-0 md:pt-0">
          <Link to="/" className="font-medium text-primary-600 md:font-normal md:hover:underline">
            <span className="md:hidden">Back to home</span>
            <span className="hidden md:inline">← Back to home</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
