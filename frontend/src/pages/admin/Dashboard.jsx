import { Link } from 'react-router-dom'
import { Building2, Layers, ShoppingCart, Award, TrendingUp, ArrowRight } from 'lucide-react'
import { useGetAdminStatsQuery, useGetAdminCompaniesQuery } from '../../store/api/adminApi'
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { CompanyStatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatDate'

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStatsQuery()
  const { data: companiesData, isLoading: companiesLoading } = useGetAdminCompaniesQuery({ limit: 5 })

  // Use recent_companies from stats, or fall back to companies list
  const companies = stats?.recent_companies || companiesData?.companies || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform overview and key metrics</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Companies" value={stats?.companies?.total ?? 0} icon={Building2} color="indigo" />
          <StatCard title="Active Batches" value={stats?.batches?.active ?? 0} icon={Layers} color="emerald" />
          <StatCard title="Total Orders" value={stats?.orders?.total ?? 0} icon={ShoppingCart} color="sky" />
          <StatCard title="Certificates Issued" value={stats?.certificates?.issued ?? 0} icon={Award} color="amber" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Companies</CardTitle>
          <Link to="/admin/companies" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {companiesLoading ? (
            <PageSpinner />
          ) : companies.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No companies yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  to={`/admin/companies/${company.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-800">{company.name}</p>
                    <p className="text-sm text-slate-500">{company.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">{company.batch_count || 0}</p>
                      <p className="text-xs text-slate-400">batches</p>
                    </div>
                    <CompanyStatusBadge isActive={company.is_active} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
