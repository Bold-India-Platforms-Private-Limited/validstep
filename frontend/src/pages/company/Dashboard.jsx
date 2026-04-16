import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Layers, Users, Award, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { useGetCompanyStatsQuery } from '../../store/api/companyApi'
import { useGetBatchesQuery } from '../../store/api/companyApi'
import { selectCurrentUser } from '../../store/authSlice'
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { BatchStatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatDate'

export default function CompanyDashboard() {
  const user = useSelector(selectCurrentUser)
  const { data: stats, isLoading: statsLoading } = useGetCompanyStatsQuery()
  const { data: batchesData, isLoading: batchesLoading } = useGetBatchesQuery({ limit: 5 })

  const batches = batchesData?.batches || []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's an overview of your certificate platform
          </p>
        </div>
        <Link to="/company/batches/create">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New Batch</Button>
        </Link>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Batches"
            value={stats?.batches?.total ?? 0}
            icon={Layers}
            color="indigo"
          />
          <StatCard
            title="Active Batches"
            value={stats?.batches?.active ?? 0}
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            title="Total Orders"
            value={stats?.orders?.total ?? 0}
            icon={Users}
            color="sky"
          />
          <StatCard
            title="Certificates Issued"
            value={stats?.certificates?.issued ?? 0}
            icon={Award}
            color="amber"
          />
        </div>
      )}

      {/* Recent batches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
          <Link
            to="/company/batches"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {batchesLoading ? (
            <PageSpinner />
          ) : batches.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No batches yet</p>
              <p className="mt-1 text-sm text-slate-400">Create your first batch to get started</p>
              <Link to="/company/batches/create" className="mt-4 inline-block">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Create Batch
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {batches.slice(0, 5).map((batch) => (
                <Link
                  key={batch.id}
                  to={`/company/batches/${batch.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{batch.name}</p>
                    <p className="text-sm text-slate-500">
                      {batch.program?.name} · {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">{batch._count?.orders || 0}</p>
                      <p className="text-xs text-slate-400">orders</p>
                    </div>
                    <BatchStatusBadge status={batch.status} />
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
