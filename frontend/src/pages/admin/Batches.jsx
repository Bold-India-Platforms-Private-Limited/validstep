import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGetAdminBatchesQuery, useUpdateAdminCompanyBatchMutation, useGetAdminWhoamiQuery } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Pagination } from '../../components/ui/Pagination'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { Layers, Search, ChevronRight } from 'lucide-react'

const BATCH_STATUSES = ['DRAFT', 'ACTIVE', 'HOLD', 'COMPLETED']

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  HOLD: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
}

function BatchStatusSelect({ batch, readOnly }) {
  const [updateBatch, { isLoading }] = useUpdateAdminCompanyBatchMutation()

  const handleChange = async (e) => {
    const newStatus = e.target.value
    if (newStatus === batch.status) return
    try {
      await updateBatch({ companyId: batch.company?.id, id: batch.id, status: newStatus }).unwrap()
      toast.success(`${batch.name} marked ${newStatus}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status')
    }
  }

  if (readOnly) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[batch.status] || 'bg-slate-100 text-slate-600'}`}>
        {batch.status}
      </span>
    )
  }

  return (
    <select
      value={batch.status}
      onChange={handleChange}
      disabled={isLoading}
      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${statusStyles[batch.status] || 'bg-slate-100 text-slate-600'}`}
    >
      {BATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

export default function AdminBatches() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const { data: whoami } = useGetAdminWhoamiQuery()
  const isReview = whoami?.access_level === 'review'
  const { data, isLoading } = useGetAdminBatchesQuery({
    page,
    limit,
    ...(search && { search }),
    ...(status && { status }),
  })

  const batches = data?.batches || []
  const pagination = data?.pagination || {}

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Batches</h1>
        <p className="text-sm text-slate-500">All certificate batches across companies</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search batches..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          {['DRAFT', 'ACTIVE', 'HOLD', 'COMPLETED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Layers className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No batches found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Batch', 'Organization', 'Price', 'Orders', 'Status', 'Dates', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.program?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{b.company?.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(b.certificate_price)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{b._count?.orders || 0}</td>
                    <td className="px-4 py-3"><BatchStatusSelect batch={b} readOnly={isReview} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(b.start_date)}<br />{formatDate(b.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/batches/${b.id}`} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1) }}
          />
        </div>
      )}
    </div>
  )
}
