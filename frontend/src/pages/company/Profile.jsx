import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Building2, Mail, Phone, Globe, FileText } from 'lucide-react'
import { useGetCompanyProfileQuery, useUpdateCompanyProfileMutation } from '../../store/api/companyApi'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'

export default function CompanyProfile() {
  const { data: profile, isLoading } = useGetCompanyProfileQuery()
  const [update, { isLoading: saving }] = useUpdateCompanyProfileMutation()
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (profile) reset({
      name: profile.name,
      phone: profile.phone || '',
      website: profile.website || '',
      description: profile.description || '',
      logo_url: profile.logo_url || '',
    })
  }, [profile, reset])

  const onSubmit = async (data) => {
    try {
      await update(data).unwrap()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <p className="text-sm text-slate-500">Update your company information</p>
      </div>

      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50">
              <Building2 className="h-8 w-8 text-primary-400" />
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900">{profile?.name}</p>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${profile?.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {profile?.is_verified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Company Name" leftIcon={<Building2 className="h-4 w-4" />} required {...register('name')} />
          <Input label="Phone" type="tel" leftIcon={<Phone className="h-4 w-4" />} {...register('phone')} />
          <Input label="Website" type="url" placeholder="https://example.com" leftIcon={<Globe className="h-4 w-4" />} {...register('website')} />
          <Input label="Logo URL" placeholder="https://..." leftIcon={<FileText className="h-4 w-4" />} {...register('logo_url')} />
          <Textarea label="Description" rows={4} placeholder="Brief description of your company" {...register('description')} />
          <div className="flex justify-end">
            <Button type="submit" isLoading={saving}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
