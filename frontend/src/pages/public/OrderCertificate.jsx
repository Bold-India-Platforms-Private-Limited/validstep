import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Calendar, Award, Building2, Clock, DollarSign, User, Mail, Phone,
  LogIn, CreditCard, CheckCircle2, Loader2,
} from 'lucide-react'
import { useGetBatchBySlugQuery } from '../../store/api/publicApi'
import { useUserLoginMutation, useUserRegisterMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/formatDate'
import axiosClient from '../../api/axiosClient'
import { PageSpinner } from '../../components/ui/Spinner'
import { PublicLayout } from '../../components/layouts/PublicLayout'

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid mobile number required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

export default function OrderCertificate() {
  const { slug } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // null | 'register' | 'login'
  const [isProcessing, setIsProcessing] = useState(false)

  const { data: batch, isLoading, error } = useGetBatchBySlugQuery(slug)
  const [userRegister] = useUserRegisterMutation()
  const [userLogin] = useUserLoginMutation()

  const registerForm = useForm({ resolver: zodResolver(registerSchema) })
  const loginForm = useForm({ resolver: zodResolver(loginSchema) })

  const initiatePayment = async (batchId) => {
    try {
      const payRes = await axiosClient.post('/payment/initiate', { batch_id: batchId })
      const { paymentUrl, payuParams } = payRes.data?.data ?? payRes.data
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = paymentUrl
      Object.entries(payuParams).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch {
      toast.error('Could not initiate payment. Please try from your dashboard.')
      navigate('/dashboard')
    }
  }

  const handleRegisterSubmit = async (data) => {
    setIsProcessing(true)
    try {
      const result = await userRegister({ ...data, batch_slug: slug }).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))
      toast.success('Account created! Redirecting to payment...')
      await initiatePayment(batch.id)
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed')
      setIsProcessing(false)
    }
  }

  const handleLoginSubmit = async (data) => {
    setIsProcessing(true)
    try {
      const result = await userLogin(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: result.user }))
      toast.success('Logged in! Redirecting to payment...')
      await initiatePayment(batch.id)
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed')
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <PublicLayout showBackToHome>
        <div className="px-4 py-20">
          <PageSpinner />
        </div>
      </PublicLayout>
    )
  }

  if (error || !batch) {
    return (
      <PublicLayout showBackToHome>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-4 text-6xl">🔍</div>
            <h1 className="text-2xl font-bold text-slate-800">Batch Not Found</h1>
            <p className="mt-2 text-slate-500">
              This certificate link may be expired or invalid.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
              Go to homepage
            </Link>
          </div>
        </div>
      </PublicLayout>
    )
  }

  const programTypeLabel = {
    INTERNSHIP: 'Internship',
    COURSE: 'Course',
    PARTICIPATION: 'Participation',
  }[batch.program?.type] || batch.program?.type

  return (
    <PublicLayout showBackToHome mainClassName="bg-gradient-to-br from-slate-50 to-primary-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Certificate card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <Badge className="mb-3 bg-white/20 text-white border-0">
                  {programTypeLabel} Certificate
                </Badge>
                <h1 className="text-2xl font-bold">{batch.name}</h1>
                <p className="mt-1 flex items-center gap-2 text-primary-200">
                  <Building2 className="h-4 w-4" />
                  {batch.company?.name}
                </p>
              </div>
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Award className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {batch.program?.type === 'INTERNSHIP' && batch.role && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <div className="rounded-lg bg-primary-100 p-2">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="font-semibold text-slate-800">{batch.role}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="font-semibold text-slate-800">
                  {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="rounded-lg bg-amber-100 p-2">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Program Type</p>
                <p className="font-semibold text-slate-800">{programTypeLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="rounded-lg bg-sky-100 p-2">
                <DollarSign className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Certificate Fee</p>
                <p className="text-xl font-bold text-slate-800">₹{batch.certificate_price}</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="border-t border-slate-100 px-6 pb-6">
            <p className="mb-3 text-sm font-semibold text-slate-700">What you get:</p>
            <ul className="space-y-2">
              {['Digital certificate with QR verification', 'Unique certificate serial number', 'Shareable verification link', 'Download PDF anytime'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action section */}
        {!mode && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setMode('login')}
              className="flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="rounded-xl bg-slate-100 p-3">
                <LogIn className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Already have an account?</p>
                <p className="text-sm text-slate-500">Login to proceed to payment</p>
              </div>
            </button>
            <button
              onClick={() => setMode('register')}
              className="flex items-center justify-center gap-3 rounded-xl border-2 border-primary-200 bg-primary-50 p-5 text-left shadow-sm hover:border-primary-400 hover:shadow-md transition-all"
            >
              <div className="rounded-xl bg-primary-100 p-3">
                <CreditCard className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-primary-800">Get Certificate</p>
                <p className="text-sm text-primary-600">Register & Pay ₹{batch.certificate_price}</p>
              </div>
            </button>
          </div>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Create Account & Pay</h2>
              <button onClick={() => setMode(null)} className="text-sm text-slate-500 hover:text-slate-700">
                Back
              </button>
            </div>
            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                leftIcon={<User className="h-4 w-4" />}
                error={registerForm.formState.errors.name?.message}
                required
                {...registerForm.register('name')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={registerForm.formState.errors.email?.message}
                  required
                  {...registerForm.register('email')}
                />
                <Input
                  label="Mobile"
                  type="tel"
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="h-4 w-4" />}
                  error={registerForm.formState.errors.phone?.message}
                  required
                  {...registerForm.register('phone')}
                />
              </div>
              <Input
                label="Create Password"
                type="password"
                placeholder="••••••••"
                error={registerForm.formState.errors.password?.message}
                required
                {...registerForm.register('password')}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={isProcessing}
                size="lg"
                leftIcon={<CreditCard className="h-4 w-4" />}
              >
                Register & Pay ₹{batch.certificate_price}
              </Button>
            </form>
            <p className="mt-3 text-center text-xs text-slate-400">
              By registering, you agree to our terms of service
            </p>
          </div>
        )}

        {/* Login form */}
        {mode === 'login' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Login to Continue</h2>
              <button onClick={() => setMode(null)} className="text-sm text-slate-500 hover:text-slate-700">
                Back
              </button>
            </div>
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={loginForm.formState.errors.email?.message}
                required
                {...loginForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={loginForm.formState.errors.password?.message}
                required
                {...loginForm.register('password')}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={isProcessing}
                size="lg"
                leftIcon={<CreditCard className="h-4 w-4" />}
              >
                Login & Pay ₹{batch.certificate_price}
              </Button>
            </form>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
