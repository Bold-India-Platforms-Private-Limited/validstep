import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGetFilePreviewQuery, useGetImportedRowsQuery } from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Pagination } from '../../../components/ui/Pagination'
import { formatDate, formatCurrency } from '../../../utils/formatDate'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const IMPORTED_COLUMNS = {
  RAZORPAY_PAYMENT_REPORT: [
    { key: 'razorpay_id', label: 'ID' },
    { key: 'amount', label: 'Amount', fmt: formatCurrency },
    { key: 'status', label: 'Status' },
    { key: 'method', label: 'Method' },
    { key: 'fee', label: 'Fee', fmt: formatCurrency },
  ],
  RAZORPAY_SETTLEMENT_REPORT: [
    { key: 'settlement_id', label: 'ID' },
    { key: 'amount', label: 'Amount', fmt: formatCurrency },
    { key: 'utr', label: 'UTR' },
    { key: 'status', label: 'Status' },
  ],
  PAYU_TRANSACTION_REPORT: [
    { key: 'payu_id', label: 'PayU ID' },
    { key: 'txnid', label: 'Txn ID' },
    { key: 'status', label: 'Status' },
    { key: 'amount', label: 'Amount', fmt: formatCurrency },
    { key: 'mode', label: 'Mode' },
  ],
  PAYU_SETTLEMENT_REPORT: [
    { key: 'settlement_key', label: 'Settlement Key' },
    { key: 'merchant_utr', label: 'UTR' },
    { key: 'amount_net_signed', label: 'Net Amount', fmt: formatCurrency },
    { key: 'settled_amount', label: 'Settled Amount', fmt: formatCurrency },
  ],
  BANK_STATEMENT: [
    { key: 'txn_date', label: 'Date', fmt: formatDate },
    { key: 'narration', label: 'Narration' },
    { key: 'ref_no', label: 'Ref No.' },
    { key: 'withdrawal_amt', label: 'Withdrawal', fmt: (v) => (v ? formatCurrency(v) : '—') },
    { key: 'deposit_amt', label: 'Deposit', fmt: (v) => (v ? formatCurrency(v) : '—') },
    { key: 'category', label: 'Category', fmt: (v) => v?.name || 'Needs Review' },
  ],
}

export default function MasterAccountingFileCompare() {
  const { id } = useParams()
  const [origPage, setOrigPage] = useState(1)
  const [importedPage, setImportedPage] = useState(1)

  const { data: preview, isLoading: previewLoading } = useGetFilePreviewQuery({ id, page: origPage, limit: 50 })
  const { data: imported, isLoading: importedLoading } = useGetImportedRowsQuery({ id, page: importedPage, limit: 50 })

  const columns = IMPORTED_COLUMNS[imported?.file_type] || []

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/master-accounting/files" className="text-slate-400 hover:text-amber-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold text-slate-900">{preview?.original_filename || 'Compare File'}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Read-only — nothing here can be edited
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Original File (as uploaded)</h3>
            <p className="text-xs text-slate-500">Raw sheet contents, unmodified</p>
          </div>
          <div className="flex-1 overflow-auto" style={{ maxHeight: '60vh' }}>
            {previewLoading ? <PageSpinner /> : (
              <table className="w-full text-xs">
                <tbody>
                  {(preview?.rows || []).map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="w-8 px-2 py-1 text-right text-slate-300">{(preview.pagination.page - 1) * preview.pagination.limit + i + 1}</td>
                      {row.map((cell, j) => <td key={j} className="whitespace-nowrap px-2 py-1 text-slate-700">{cell === null || cell === undefined ? '' : String(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {preview?.pagination && (
            <Pagination page={preview.pagination.page} pages={preview.pagination.pages} total={preview.pagination.total} limit={preview.pagination.limit} onPageChange={setOrigPage} />
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Imported into Software</h3>
            <p className="text-xs text-slate-500">What was actually parsed and saved from this file</p>
          </div>
          <div className="flex-1 overflow-auto" style={{ maxHeight: '60vh' }}>
            {importedLoading ? <PageSpinner /> : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-left uppercase tracking-wide text-slate-500">
                    {columns.map((c) => <th key={c.key} className="px-2 py-1.5">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(imported?.rows || []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      {columns.map((c) => (
                        <td key={c.key} className="max-w-[220px] truncate px-2 py-1 text-slate-700" title={String(row[c.key] ?? '')}>
                          {c.fmt ? c.fmt(row[c.key]) : String(row[c.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {imported?.rows?.length === 0 && (
                    <tr><td colSpan={columns.length} className="px-2 py-6 text-center text-slate-400">No imported rows for this file.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {imported?.pagination && (
            <Pagination page={imported.pagination.page} pages={imported.pagination.pages} total={imported.pagination.total} limit={imported.pagination.limit} onPageChange={setImportedPage} />
          )}
        </div>
      </div>
    </div>
  )
}
