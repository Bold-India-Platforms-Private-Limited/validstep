import { useState } from 'react'
import { useGetUserOrdersQuery } from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF } from '../../utils/downloadInvoice'
import { ShoppingBag, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserOrders() {
  const [downloadingId, setDownloadingId] = useState(null)
  const { data: orders, isLoading } = useGetUserOrdersQuery()
  const orderList = orders?.orders || []

  const handleDownloadInvoice = async (order) => {
    setDownloadingId(order.id)
    try {
      await downloadInvoicePDF('user', order.id, `invoice-${order.certificate_serial}.pdf`)
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice')
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Order History</h1>
        <p className="text-sm text-slate-500">All your certificate orders</p>
      </div>

      {orderList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ShoppingBag className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No orders yet</p>
          <p className="mt-1 text-sm text-slate-400">Your orders will appear here once placed</p>
        </div>
      ) : (
        <>
          {/* Table — tablet/desktop */}
          <div className="hidden rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {['Company', 'Batch', 'Duration', 'Amount', 'Status', 'Date', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orderList.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{o.batch?.company?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{o.batch?.program?.name}</p>
                        <p className="text-xs text-slate-500">{o.batch?.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(o.batch?.start_date)} — {formatDate(o.batch?.end_date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatCurrency(o.amount || 0)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-3">
                        {o.status === 'PAID' && (
                          <button
                            onClick={() => handleDownloadInvoice(o)}
                            disabled={downloadingId === o.id}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                            title="Download Invoice"
                          >
                            {downloadingId === o.id
                              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 inline-block" />
                              : <FileText className="h-3.5 w-3.5" />
                            }
                            Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Native list-cards — mobile viewport only */}
          <div className="space-y-2.5 md:hidden">
            {orderList.map((o) => (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{o.batch?.program?.name}</p>
                    <p className="truncate text-xs text-slate-500">{o.batch?.company?.name} · {o.batch?.name}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mb-3 text-xs text-slate-400">{formatDate(o.batch?.start_date)} — {formatDate(o.batch?.end_date)}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</p>
                    <p className="text-xs text-slate-400">{formatDate(o.created_at)}</p>
                  </div>
                  {o.status === 'PAID' && (
                    <button
                      onClick={() => handleDownloadInvoice(o)}
                      disabled={downloadingId === o.id}
                      className="flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {downloadingId === o.id
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
                        : <FileText className="h-3.5 w-3.5" />
                      }
                      Invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
