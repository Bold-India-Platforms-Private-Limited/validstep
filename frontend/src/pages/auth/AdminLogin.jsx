import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Mail, Lock, Shield, RefreshCw } from 'lucide-react'
import { useAdminLoginMutation } from '../../store/api/authApi'
import { setCredentials } from '../../store/authSlice'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  captcha: z.string().min(1, 'Required'),
})

function generateCaptcha() {
  return {
    a: Math.floor(Math.random() * 6),
    b: Math.floor(Math.random() * 6),
  }
}

export default function AdminLogin() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [login, { isLoading }] = useAdminLoginMutation()
  const { register, handleSubmit, formState: { errors }, resetField, watch } = useForm({ resolver: zodResolver(schema) })
  const [captcha, setCaptcha] = useState(generateCaptcha)
  const captchaValue = watch('captcha')
  const captchaStatus = !captchaValue ? null : Number(captchaValue) === captcha.a + captcha.b ? 'correct' : 'incorrect'

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha())
    resetField('captcha')
  }, [resetField])

  const onSubmit = async ({ captcha: captchaAnswer, ...data }) => {
    if (Number(captchaAnswer) !== captcha.a + captcha.b) {
      toast.error('Incorrect answer to the security check')
      refreshCaptcha()
      return
    }
    try {
      const result = await login(data).unwrap()
      dispatch(setCredentials({ accessToken: result.accessToken, user: { ...result.admin, role: 'SUPERADMIN' } }))
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed')
      refreshCaptcha()
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
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Security Check<span className="ml-0.5 text-red-500">*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex h-9 select-none items-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700">
                  {captcha.a} + {captcha.b} =
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-20"
                  style={
                    captchaStatus === 'correct'
                      ? { borderColor: '#22c55e' }
                      : captchaStatus === 'incorrect'
                        ? { borderColor: '#ef4444' }
                        : undefined
                  }
                  {...register('captcha')}
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Refresh captcha"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {errors.captcha && <p className="mt-1 text-xs text-red-500">{errors.captcha.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" isLoading={isLoading}>
              Sign In as Admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
