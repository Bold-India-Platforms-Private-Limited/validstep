import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Building2, Mail, Phone, Globe, MapPin } from 'lucide-react'
import {
  useGetCompanyProfileQuery,
  useUpdateCompanyProfileMutation,
} from '../../store/api/companyApi'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone required'),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  bio: z.string().optional(),
})

export default function CompanyProfile() {
  const { data: profile, isLoading } = useGetCompanyProfileQuery()
  const [updateProfile, { isLoading: saving }] = useUpdateCompanyProfileMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile) reset(profile)
  }, [profile, reset])

  const onSubmit = async (data) => {
    try {
      await updateProfile(data).unwrap()
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your company information</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="Company Name"
                  leftIcon={<Building2 className="h-4 w-4" />}
                  error={errors.name?.message}
                  required
                  {...register('name')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Email Address"
                    type="email"
                    leftIcon={<Mail className="h-4 w-4" />}
                    error={errors.email?.message}
                    required
                    {...register('email')}
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    leftIcon={<Phone className="h-4 w-4" />}
                    error={errors.phone?.message}
                    required
                    {...register('phone')}
                  />
                </div>
                <Input
                  label="Website"
                  type="url"
                  leftIcon={<Globe className="h-4 w-4" />}
                  error={errors.website?.message}
                  placeholder="https://company.com"
                  {...register('website')}
                />
                <Input
                  label="Address"
                  leftIcon={<MapPin className="h-4 w-4" />}
                  placeholder="123 Business Street, City"
                  {...register('address')}
                />
                <Textarea
                  label="About Company"
                  placeholder="Brief description of your company..."
                  rows={4}
                  {...register('bio')}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="submit" isLoading={saving} disabled={!isDirty}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent>
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100">
                  <Building2 className="h-10 w-10 text-primary-600" />
                </div>
                <h3 className="font-semibold text-slate-800">{profile?.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{profile?.email}</p>
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-sm text-primary-600 hover:underline"
                  >
                    {profile.website}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
