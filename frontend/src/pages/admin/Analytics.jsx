import { useState } from 'react'
import { useGetAdminAnalyticsQuery } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/formatDate'
import { TrendingUp, Users, IndianRupee } from 'lucide-react'

function BarChart({ data, valueKey, formatValue, barColor }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div className="flex h-56 items-end gap-2">
      {data.map((d) => {
        const heightPct = Math.max(2, (d[valueKey] / max) * 100)
        return (
          <div key={d.month} className="group relative flex flex-1 flex-col items-center justify-end gap-2">
            <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white group-hover:block">
              {formatValue(d[valueKey])}
            </div>
            <div
              className={`w-full rounded-t-md transition-all ${barColor}`}
              style={{ height: `${heightPct}%` }}
            />
            <span className="text-[10px] font-medium text-slate-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [months, setMonths] = useState(12)
  const { data, isLoading } = useGetAdminAnalyticsQuery({ months })

  if (isLoading) return <PageSpinner />

  const series = data?.series || []
  const totals = data?.totals || { revenue: 0, customers: 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">Revenue and customer growth over time</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${months === m ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {m}M
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatPill icon={IndianRupee} label={`Revenue (last ${months} months)`} value={formatCurrency(totals.revenue)} color="bg-amber-50 text-amber-600" />
        <StatPill icon={Users} label={`New customers (last ${months} months)`} value={totals.customers} color="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Revenue per Month</h2>
          </div>
          {series.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No revenue data yet</p>
          ) : (
            <BarChart data={series} valueKey="revenue" formatValue={formatCurrency} barColor="bg-amber-400" />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" />
            <h2 className="font-semibold text-slate-800">New Customers per Month</h2>
          </div>
          {series.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No customer data yet</p>
          ) : (
            <BarChart data={series} valueKey="customers" formatValue={(v) => `${v} customers`} barColor="bg-violet-400" />
          )}
        </div>
      </div>
    </div>
  )
}
