import { useState } from 'react'
import { useGetAdminInvoicesQuery } from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF } from '../../utils/downloadInvoice'
import { FileText, Search, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminInvoices() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const { data, isLoading } = useGetAdminInvoicesQuery({ page, limit: 20, search: search || undefined })
  const invoices = data?.invoices || []
  const pagination = data?.pagination || {}

  const handleDownload = async (inv) => {
    setDownloadingId(inv.id)
    try {
      await downloadInvoicePDF('admin', inv.order_id, `${inv.invoice_number}.pdf`)
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
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500">All invoices across the platform</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice #, txn ID, or user..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No invoices found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['Invoice #', 'User', 'Company / Batch', 'Amount', 'Paid On', 'Downloads', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-slate-900">{inv.invoice_number}</span>
                    {inv.payu_txn_id && (
                      <p className="font-mono text-xs text-slate-400 mt-0.5">{inv.payu_txn_id}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{inv.order?.user?.name}</p>
                    <p className="text-xs text-slate-500">{inv.order?.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{inv.order?.company?.name}</p>
                    <p className="text-xs text-slate-500">{inv.order?.batch?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{inv.download_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(inv)}
                      disabled={downloadingId === inv.id}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                      title="Download Invoice"
                    >
                      {downloadingId === inv.id
                        ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 inline-block" />
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
              <p className="text-xs text-slate-500">Page {page} of {pagination.pages} · {pagination.total} total</p>
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
