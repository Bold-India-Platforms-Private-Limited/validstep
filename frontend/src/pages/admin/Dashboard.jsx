import { useGetAdminDashboardQuery } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/formatDate'
import { DonutChart, STATUS_COLOR } from '../../components/charts/AdminCharts'
import { Building2, Layers, ShoppingBag, CreditCard, TrendingUp, AlertCircle, PieChart } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboardQuery()

  if (isLoading) return <PageSpinner />

  const recentOrders = data?.recent_orders || []
  const pendingCompanies = (data?.recent_companies || []).filter((c) => !c.is_verified)
  const totalOrders = data?.orders?.total || 0
  const paidOrders = data?.orders?.paid || 0
  const otherOrders = Math.max(0, totalOrders - paidOrders)
  const orderSplit = [
    { label: 'Paid', value: paidOrders, color: STATUS_COLOR.PAID },
    { label: 'Other', value: otherOrders, color: '#c3c2b7' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Platform overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Organizations" value={data?.companies?.total || 0} color="primary" />
        <StatCard icon={Layers} label="Batches" value={data?.batches?.total || 0} color="violet" />
        <StatCard icon={ShoppingBag} label="Orders" value={data?.orders?.total || 0} color="emerald" />
        <StatCard icon={CreditCard} label="Revenue" value={formatCurrency(data?.revenue?.total || 0)} color="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending companies */}
        {pendingCompanies.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold text-amber-800">Pending Verification ({pendingCompanies.length})</h2>
            </div>
            <div className="space-y-2">
              {pendingCompanies.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                  <a href={`/admin/companies/${c.id}`} className="text-xs text-primary-600 hover:underline">Review</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Recent Orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">No orders yet</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                    <p className="text-xs text-slate-500">{o.batch?.program?.name} · {o.batch?.name}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order split */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Orders — Paid vs Other</h2>
          </div>
          {totalOrders === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No orders yet</p>
          ) : (
            <DonutChart data={orderSplit} centerLabel="Total Orders" centerValue={totalOrders} />
          )}
        </div>
      </div>
    </div>
  )
}
