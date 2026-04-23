import { useState } from 'react'
import { useGetAdminOrdersQuery } from '../../store/api/adminApi'
import { useReconcilePaymentMutation } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { ShoppingBag, Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminOrders() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const { data, isLoading, refetch } = useGetAdminOrdersQuery({ page, limit: 20, search, status })
  const [reconcile, { isLoading: reconciling }] = useReconcilePaymentMutation()

  const orders = data?.orders || []
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
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">All orders across the platform</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user or batch..."
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
          {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ShoppingBag className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No orders found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['User', 'Batch', 'Company', 'Amount', 'Payment', 'Status', 'Date', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                    <p className="text-xs text-slate-500">{o.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{o.batch?.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{o.batch?.company?.name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={o.payments?.[0]?.status || 'PENDING'} />
                      {(!o.payments?.[0]?.status || o.payments?.[0]?.status === 'INITIATED') && o.payments?.[0]?.payu_txn_id && (
                        <button
                          onClick={() => handleReconcile(o.payments[0].payu_txn_id)}
                          disabled={reconciling}
                          title="Reconcile"
                          className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    {o.certificate?.certificate_serial && (
                      <span className="font-mono text-xs text-slate-500">{o.certificate.certificate_serial}</span>
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
