import { Link } from 'react-router-dom'
import { useGetBatchesQuery } from '../../store/api/batchApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatDate } from '../../utils/formatDate'
import { Plus, Layers } from 'lucide-react'

export default function Batches() {
  const { data, isLoading } = useGetBatchesQuery({})
  const batches = data?.batches || []

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batches</h1>
          <p className="text-sm text-slate-500">Manage certificate batches</p>
        </div>
        <Link to="/company/batches/create">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New Batch</Button>
        </Link>
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Layers className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No batches yet</p>
          <Link to="/company/batches/create"><Button className="mt-4" size="sm">Create Batch</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{b.name}</h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{b.program?.name} · {b.program?.type}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(b.start_date)} — {formatDate(b.end_date)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/company/batches/${b.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Manage
                  </Link>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>₹{parseFloat(b.certificate_price).toFixed(0)} per cert</span>
                <span>{b._count?.orders || 0} orders</span>
                <span>{b._count?.certificates || 0} certificates</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
