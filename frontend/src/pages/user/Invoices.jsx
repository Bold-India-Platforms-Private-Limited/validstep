import { useState } from 'react'
import { useGetUserInvoicesQuery } from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF } from '../../utils/downloadInvoice'
import { FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserInvoices() {
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState(null)
  const { data, isLoading } = useGetUserInvoicesQuery({ page, limit: 20 })
  const invoices = data?.invoices || []
  const pagination = data?.pagination || {}

  const handleDownload = async (inv) => {
    setDownloadingId(inv.id)
    try {
      await downloadInvoicePDF('user', inv.order_id, `${inv.invoice_number}.pdf`)
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
        <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
        <p className="text-sm text-slate-500">Download invoices for your completed orders</p>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No invoices yet</p>
          <p className="mt-1 text-sm text-slate-400">Invoices appear here once your payment is confirmed</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['Invoice #', 'Program', 'Amount', 'Paid On', 'Downloads', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-slate-900">{inv.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{inv.order?.batch?.program?.name}</p>
                    <p className="text-xs text-slate-500">{inv.order?.batch?.name} · {inv.order?.batch?.company?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{inv.download_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(inv)}
                      disabled={downloadingId === inv.id}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {downloadingId === inv.id
                        ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
                        : <Download className="h-3.5 w-3.5" />
                      }
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">Page {page} of {pagination.pages} · {pagination.total} invoices</p>
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
