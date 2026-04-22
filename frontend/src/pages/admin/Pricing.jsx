import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useGetPricingQuery, useUpdatePricingMutation } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { DollarSign, Info } from 'lucide-react'

export default function AdminPricing() {
  const { data, isLoading } = useGetPricingQuery()
  const [update, { isLoading: saving }] = useUpdatePricingMutation()
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (data) {
      reset({
        platform_fee_percent: data.platform_fee_percent ?? '',
        min_certificate_price: data.min_certificate_price ?? '',
        gst_percent: data.gst_percent ?? '',
      })
    }
  }, [data, reset])

  const onSubmit = async (formData) => {
    try {
      await update({
        platform_fee_percent: parseFloat(formData.platform_fee_percent),
        min_certificate_price: parseFloat(formData.min_certificate_price),
        gst_percent: parseFloat(formData.gst_percent),
      }).unwrap()
      toast.success('Pricing updated')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Pricing</h1>
        <p className="text-sm text-slate-500">Configure platform fees and limits</p>
      </div>

      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">Changes take effect immediately for new orders. Existing orders are not affected.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Platform Fee (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="e.g. 10"
            leftIcon={<DollarSign className="h-4 w-4" />}
            {...register('platform_fee_percent')}
          />
          <Input
            label="Minimum Certificate Price (₹)"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 99"
            leftIcon={<DollarSign className="h-4 w-4" />}
            {...register('min_certificate_price')}
          />
          <Input
            label="GST (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="e.g. 18"
            leftIcon={<DollarSign className="h-4 w-4" />}
            {...register('gst_percent')}
          />

          {data && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-700 mb-2">Current Values</p>
              <div className="space-y-1 text-slate-600">
                <p>Platform fee: <span className="font-semibold">{data.platform_fee_percent}%</span></p>
                <p>Min price: <span className="font-semibold">₹{data.min_certificate_price}</span></p>
                <p>GST: <span className="font-semibold">{data.gst_percent}%</span></p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" isLoading={saving}>Save Pricing</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
