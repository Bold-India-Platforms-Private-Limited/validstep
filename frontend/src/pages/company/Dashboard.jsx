import { Link } from 'react-router-dom'
import { useGetCompanyDashboardQuery } from '../../store/api/companyApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/formatDate'
import { Layers, ShoppingBag, Award, DollarSign, Plus, ArrowRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

export default function CompanyDashboard() {
  const { data, isLoading } = useGetCompanyDashboardQuery()

  if (isLoading) return <PageSpinner />

  const s = data?.stats || {}
  const recent = data?.recentOrders || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your certificate platform</p>
        </div>
        <Link to="/company/batches/create" className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" /> New Batch
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Total Batches" value={s.totalBatches} color="bg-primary-50 text-primary-600" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={s.totalOrders} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Award} label="Certificates Issued" value={s.issuedCertificates} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={DollarSign} label="Revenue" value={s.totalRevenue ? formatCurrency(s.totalRevenue) : '₹0'} color="bg-sky-50 text-sky-600" />
      </div>

      {recent.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            <Link to="/company/payments" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                  <p className="text-xs text-slate-500">{o.batch?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">₹{parseFloat(o.amount || 0).toFixed(0)}</p>
                  <span className={`text-xs font-medium ${o.status === 'PAID' ? 'text-emerald-600' : 'text-slate-400'}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
