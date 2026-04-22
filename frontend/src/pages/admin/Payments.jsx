import { useState } from 'react'
import { useGetAdminPaymentsQuery, useReconcilePaymentMutation } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { CreditCard, RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPayments() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const { data, isLoading, refetch } = useGetAdminPaymentsQuery({ page, limit: 20, search, status })
  const [reconcile, { isLoading: reconciling }] = useReconcilePaymentMutation()

  const payments = data?.payments || []
  const pagination = data?.pagination || {}

  const handleReconcile = async (txnid) => {
    try {
      await reconcile(txnid).unwrap()
      toast.success('Payment synced')
      refetch()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500">All payment transactions on the platform</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by txn ID or user..."
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
          {['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <CreditCard className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No payments found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['User', 'Batch', 'Amount', 'Status', 'Txn ID', 'Gateway', 'Date', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{p.order?.user?.name}</p>
                    <p className="text-xs text-slate-500">{p.order?.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.order?.batch?.name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500 break-all">{p.txnid || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.gateway || 'PayU'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    {p.status === 'PENDING' && p.txnid && (
                      <button
                        onClick={() => handleReconcile(p.txnid)}
                        disabled={reconciling}
                        title="Sync with PayU"
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Page {page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
