import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Check, X, DollarSign } from 'lucide-react'
import { useGetPricingQuery, useUpdatePricingMutation } from '../../store/api/adminApi'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'

const typeLabels = {
  INTERNSHIP: 'Internship / Fellowship',
  COURSE: 'Course',
  PARTICIPATION: 'Participation',
  HACKATHON: 'Hackathon',
  OTHER: 'Other',
}

export default function AdminPricing() {
  const { data: pricingData, isLoading } = useGetPricingQuery()
  const [updatePricing, { isLoading: updating }] = useUpdatePricingMutation()
  const [editingType, setEditingType] = useState(null)
  const [editPrice, setEditPrice] = useState('')

  // Backend returns array of PricingConfig directly after baseQuery unwraps
  const pricingList = Array.isArray(pricingData) ? pricingData : []

  const handleEdit = (item) => {
    setEditingType(item.program_type)
    setEditPrice(String(item.default_price))
  }

  const handleSave = async (item) => {
    const price = parseFloat(editPrice)
    if (isNaN(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }
    try {
      await updatePricing({ program_type: item.program_type, default_price: price }).unwrap()
      toast.success(`${typeLabels[item.program_type]} price updated to ₹${price}`)
      setEditingType(null)
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pricing Configuration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set default certificate prices by program type. Companies can override per batch.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Default Prices</CardTitle></CardHeader>
        {pricingList.length === 0 ? (
          <CardContent>
            <div className="py-8 text-center text-slate-400">
              <DollarSign className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">No pricing configured</p>
            </div>
          </CardContent>
        ) : (
          <div className="divide-y divide-slate-100">
            {pricingList.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50">
                    <DollarSign className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{typeLabels[item.program_type]}</p>
                      <Badge variant="default">{item.program_type}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">Default certificate price</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editingType === item.program_type ? (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-sm">₹</span>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 rounded-lg border border-primary-300 px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min="0"
                          step="1"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => handleSave(item)}
                        disabled={updating}
                        className="rounded-lg bg-emerald-100 p-2 text-emerald-600 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingType(null)}
                        className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-slate-800">₹{Number(item.default_price).toLocaleString('en-IN')}</p>
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">How pricing works</p>
              <p className="mt-1 text-sm text-slate-500">
                These default prices pre-fill when a company creates a new batch.
                Companies can set a custom price per batch. Users pay the batch-level price.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
