import { useState } from 'react'
import { useGetAdminAnalyticsQuery } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/formatDate'
import { AreaLineChart, MiniBarChart, DonutChart, SERIES_COLOR, STATUS_COLOR } from '../../components/charts/AdminCharts'
import { TrendingUp, Users, IndianRupee, PieChart } from 'lucide-react'

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
  const statusBreakdown = data?.statusBreakdown || []
  const statusTotal = statusBreakdown.reduce((s, d) => s + d.count, 0)
  const donutData = statusBreakdown.map((d) => ({ label: d.status, value: d.count, color: STATUS_COLOR[d.status] }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">Revenue, customer growth, and order health over time</p>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatPill icon={IndianRupee} label={`Revenue (last ${months} months)`} value={formatCurrency(totals.revenue)} color="bg-amber-50 text-amber-600" />
        <StatPill icon={Users} label={`New customers (last ${months} months)`} value={totals.customers} color="bg-violet-50 text-violet-600" />
        <StatPill icon={PieChart} label="Orders (all time)" value={statusTotal} color="bg-blue-50 text-blue-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: SERIES_COLOR.blue }} />
            <h2 className="font-semibold text-slate-800">Revenue per Month</h2>
          </div>
          {series.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No revenue data yet</p>
          ) : (
            <AreaLineChart data={series} valueKey="revenue" formatValue={formatCurrency} color={SERIES_COLOR.blue} />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: SERIES_COLOR.violet }} />
            <h2 className="font-semibold text-slate-800">New Customers per Month</h2>
          </div>
          {series.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No customer data yet</p>
          ) : (
            <MiniBarChart data={series} valueKey="customers" formatValue={(v) => `${v} customers`} color={SERIES_COLOR.violet} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Order Status Breakdown</h2>
        </div>
        {statusTotal === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No orders yet</p>
        ) : (
          <DonutChart data={donutData} centerLabel="Total Orders" centerValue={statusTotal} />
        )}
      </div>
    </div>
  )
}
