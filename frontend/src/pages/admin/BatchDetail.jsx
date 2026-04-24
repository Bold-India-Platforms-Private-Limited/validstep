import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useGetAdminBatchQuery, useGetAdminBatchStatsQuery,
  useGetAdminBatchOrdersQuery, useIssueCertificatesAdminMutation,
  useReconcilePaymentMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { ArrowLeft, Award, ShoppingBag, CreditCard, RefreshCw, CheckSquare } from 'lucide-react'

export default function AdminBatchDetail() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const { data: batchData, isLoading } = useGetAdminBatchQuery(id)
  const { data: statsData } = useGetAdminBatchStatsQuery(id)
  const { data: ordersData, refetch: refetchOrders } = useGetAdminBatchOrdersQuery({ id, page, limit: 20 })
  const [issueCerts, { isLoading: issuing }] = useIssueCertificatesAdminMutation()
  const [reconcile, { isLoading: reconciling }] = useReconcilePaymentMutation()

  if (isLoading) return <PageSpinner />
  if (!batchData) return <p className="p-6 text-slate-500">Batch not found</p>

  const batch = batchData.batch || batchData
  const stats = statsData || {}
  const orders = ordersData?.orders || []
  const pagination = ordersData?.pagination || {}

  const toggle = (orderId) => setSelected((s) => s.includes(orderId) ? s.filter((x) => x !== orderId) : [...s, orderId])
  const toggleAll = () => setSelected(selected.length === orders.length ? [] : orders.map((o) => o.id))

  const handleIssue = async () => {
    if (!selected.length) return
    try {
      const res = await issueCerts({ batchId: id, order_ids: selected }).unwrap()
      toast.success(`${res.issued || selected.length} certificate(s) issued`)
      setSelected([])
      refetchOrders()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to issue')
    }
  }

  const handleReconcile = async (txnid) => {
    try {
      await reconcile(txnid).unwrap()
      toast.success('Payment reconciled')
      refetchOrders()
    } catch (err) {
      toast.error(err?.data?.message || 'Reconcile failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/batches" className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{batch.name}</h1>
            <StatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-slate-500">{batch.company?.name} · {batch.program?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: ShoppingBag, label: 'Total Orders', value: stats.orders?.TOTAL || 0, color: 'text-primary-600 bg-primary-50' },
          { icon: CreditCard, label: 'Revenue', value: formatCurrency(stats.paid_revenue || 0), color: 'text-emerald-600 bg-emerald-50' },
          { icon: Award, label: 'Paid', value: stats.orders?.PAID || 0, color: 'text-violet-600 bg-violet-50' },
          { icon: RefreshCw, label: 'Pending', value: stats.orders?.PENDING || 0, color: 'text-amber-600 bg-amber-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Orders</h2>
          {selected.length > 0 && (
            <button
              onClick={handleIssue}
              disabled={issuing}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              Issue {selected.length} Certificate{selected.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                </th>
                {['User', 'Amount', 'Status', 'Certificate', 'Date', 'Paid At'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o) => (
                <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(o.id) ? 'bg-primary-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                    <p className="text-xs text-slate-500">{o.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      {o.status === 'PENDING' && o.payu_txn_id && (
                        <button
                          onClick={() => handleReconcile(o.payu_txn_id)}
                          disabled={reconciling}
                          title="Reconcile payment"
                          className="text-xs text-primary-600 hover:underline disabled:opacity-50"
                        >
                          Sync
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {o.certificate ? (
                      <div>
                        <p className="font-mono text-xs text-slate-600">{o.certificate.certificate_serial}</p>
                        <StatusBadge status={o.certificate.is_issued ? 'ISSUED' : 'PENDING'} />
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {o.paid_at ? formatDate(o.paid_at) : '—'}
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
      </div>
    </div>
  )
}
