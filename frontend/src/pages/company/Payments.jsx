import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetPaymentHistoryQuery } from '../../store/api/companyApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF } from '../../utils/downloadInvoice'
import { CreditCard, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CompanyPayments() {
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState(null)
  const { data, isLoading } = useGetPaymentHistoryQuery({ page, limit: 20 })
  const payments = data?.payments || []
  const pagination = data?.pagination || {}

  const handleDownloadInvoice = async (payment) => {
    const orderId = payment.order?.id
    const serial = payment.order?.certificate?.certificate_serial || payment.order_id
    if (!orderId) return
    setDownloadingId(payment.id)
    try {
      await downloadInvoicePDF('company', orderId, `invoice-${serial}.pdf`)
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice')
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
          <p className="text-sm text-slate-500">All payment transactions for your batches</p>
        </div>
        <Link
          to="/company/invoices"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Invoices
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <CreditCard className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No payments yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['User', 'Batch', 'Amount', 'Status', 'Date', ''].map((h) => (
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
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    {p.status === 'SUCCESS' && (
                      <button
                        onClick={() => handleDownloadInvoice(p)}
                        disabled={downloadingId === p.id}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                        title="Download Invoice"
                      >
                        {downloadingId === p.id
                          ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 inline-block" />
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
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Page {page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Prev</button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
