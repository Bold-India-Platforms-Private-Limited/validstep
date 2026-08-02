import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { User, Mail, Phone, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useGetUserProfileQuery, useUpdateUserProfileMutation } from '../../store/api/userApi'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`
}

export default function UserProfile() {
  const { data: profile, isLoading } = useGetUserProfileQuery()
  const [update, { isLoading: saving }] = useUpdateUserProfileMutation()
  const { register, handleSubmit, reset } = useForm()
  const [showEmail, setShowEmail] = useState(false)
  const [showPhone, setShowPhone] = useState(false)

  useEffect(() => {
    if (profile) reset({ name: profile.name, phone: profile.phone || '' })
  }, [profile, reset])

  const onSubmit = async (data) => {
    try {
      await update(data).unwrap()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update profile')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Manage your account details</p>
      </div>

      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <User className="h-8 w-8 text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{profile?.name}</p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${profile?.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <ShieldCheck className="h-3 w-3" />
              {profile?.is_verified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" leftIcon={<User className="h-4 w-4" />} required {...register('name')} />
          <Input
            label="Email"
            type="text"
            leftIcon={<Mail className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowEmail((v) => !v)} className="pointer-events-auto text-slate-400 hover:text-slate-600">
                {showEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            value={showEmail ? (profile?.email || '') : maskEmail(profile?.email)}
            disabled
          />
          <Input
            label="Phone"
            type={showPhone ? 'tel' : 'password'}
            leftIcon={<Phone className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPhone((v) => !v)} className="pointer-events-auto text-slate-400 hover:text-slate-600">
                {showPhone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('phone')}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={saving}>Save Changes</Button>
          </div>
        </form>

        <p className="mt-6 text-xs text-slate-400">Last Login - Today</p>
      </div>
    </div>
  )
}
