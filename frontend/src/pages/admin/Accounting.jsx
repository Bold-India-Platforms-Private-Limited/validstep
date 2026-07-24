import { useRef, useState } from 'react'
import {
  useGetAccountingSummaryQuery,
  useGetAccountingImportsQuery,
  useUploadAccountingFileMutation,
  useGetReconciliationQuery,
  useRunReconciliationMutation,
} from '../../store/api/accountingApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatDate'
import { downloadFileGet, downloadFilePost } from '../../utils/downloadFile'
import { Banknote, Upload, FileSpreadsheet, FileText, RefreshCw, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const IMPORT_TYPES = [
  { type: 'TRANSACTION_REPORT', label: 'Transaction Report' },
  { type: 'SETTLEMENT_REPORT', label: 'Settlement Report' },
  { type: 'BANK_STATEMENT', label: 'Bank Statement' },
]

const MATCH_VARIANTS = {
  MATCHED_EXACT: 'success',
  MATCHED_AMOUNT_DATE: 'info',
  UNMATCHED: 'danger',
  IGNORED: 'default',
}

const CHANNEL_LABELS = {
  VALIDSTEP: 'Validstep Website',
  PAYU_BUTTON: 'PayU Button',
  OTHER: 'Other',
}

const CHANNEL_VARIANTS = {
  VALIDSTEP: 'primary',
  PAYU_BUTTON: 'info',
  OTHER: 'default',
}

function UploadButton({ type, label }) {
  const inputRef = useRef(null)
  const [upload, { isLoading }] = useUploadAccountingFileMutation()

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await upload({ type, file }).unwrap()
      toast.success(`Imported ${result.row_count} rows from ${label}`)
    } catch (err) {
      toast.error(err?.data?.message || `Failed to import ${label}`)
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
      >
        {isLoading
          ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600" />
          : <Upload className="h-4 w-4" />
        }
        Upload {label}
      </button>
    </div>
  )
}

function ReceiptButton({ payuId }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadFileGet(`/admin/accounting/transactions/${payuId}/receipt`, `receipt-${payuId}.pdf`)
    } catch (err) {
      toast.error(err.message || 'Failed to download receipt')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      title="Download Receipt"
      className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
    >
      {downloading
        ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 inline-block" />
        : <FileText className="h-3.5 w-3.5" />
      }
      Receipt
    </button>
  )
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function AdminAccounting() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)

  const rangeParams = { ...(from ? { from } : {}), ...(to ? { to } : {}) }

  const { data: summary, isLoading: summaryLoading } = useGetAccountingSummaryQuery(rangeParams)
  const { data: imports } = useGetAccountingImportsQuery({ limit: 10 })
  const { data: reconciliation, isLoading: reconLoading } = useGetReconciliationQuery({
    ...rangeParams,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(channelFilter ? { channel: channelFilter } : {}),
    page, limit,
  })
  const [runReconciliation, { isLoading: rerunning }] = useRunReconciliationMutation()

  const rows = reconciliation?.rows || []
  const pagination = reconciliation?.pagination || {}
  const statusCounts = reconciliation?.status_counts || []

  const revenue = summary?.revenue || {}
  const fees = revenue.fees || {}
  const feeLineItems = [
    { label: 'Per-Transaction Processing Fee', value: fees.per_transaction_processing_fee },
    { label: 'Per-Transaction GST', value: fees.per_transaction_gst },
    { label: 'Priority/Instant Settlement Fee', value: fees.priority_settlement_fee },
    { label: 'GST on Priority Settlement Fee', value: fees.priority_settlement_gst },
    { label: 'PayU Transaction Fee (~2% MDR)', value: fees.daily_platform_fee },
    { label: 'GST on Transaction Fee', value: fees.daily_platform_fee_gst },
  ].filter((f) => f.value)

  const bankMatched = (summary?.bank_reconciliation || []).filter((r) => r.status !== 'UNMATCHED').reduce((a, r) => a + r.count, 0)
  const bankTotal = (summary?.bank_reconciliation || []).reduce((a, r) => a + r.count, 0)
  const matchPct = bankTotal ? Math.round((bankMatched / bankTotal) * 100) : null

  const handleRerun = async () => {
    try {
      const result = await runReconciliation().unwrap()
      toast.success(`Reconciliation done — ${result.matched_exact + result.matched_amount_date} matched, ${result.unmatched} unmatched`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to re-run reconciliation')
    }
  }

  const handleGenerateStatement = async () => {
    if (!from || !to) return toast.error('Pick a from/to date range first')
    setGenerating(true)
    try {
      await downloadFilePost('/admin/accounting/fee-statement', { from, to }, `payu-fee-statement-${from}_to_${to}.pdf`)
    } catch (err) {
      toast.error(err.message || 'Failed to generate fee statement')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const qs = new URLSearchParams(rangeParams).toString()
      await downloadFileGet(`/admin/accounting/export${qs ? `?${qs}` : ''}`, `validstep-payu-accounting${from ? `-${from}_to_${to}` : ''}.xlsx`)
    } catch (err) {
      toast.error(err.message || 'Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounting</h1>
          <p className="text-sm text-slate-500">PayU transactions, settlements & bank reconciliation for company accounting</p>
        </div>
        <Banknote className="h-8 w-8 text-primary-500" />
      </div>

      {/* Uploads */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">Import Reports</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {IMPORT_TYPES.map((t) => <UploadButton key={t.type} {...t} />)}
        </div>
        {imports?.imports?.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
            {imports.imports.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />{imp.original_filename}</span>
                <span>{imp.type.replace('_', ' ')} · {imp.row_count} rows · {formatDateTime(imp.uploaded_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date range + actions */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        </div>
        <button
          onClick={handleGenerateStatement}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" /> Generate Fee Statement
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export for CA
        </button>
        <button
          onClick={handleRerun}
          disabled={rerunning}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${rerunning ? 'animate-spin' : ''}`} /> Re-run Reconciliation
        </button>
      </div>

      {summaryLoading ? <PageSpinner /> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label="Total Revenue" value={formatCurrency(revenue.gross_amount || 0)} sub={`${revenue.count || 0} transactions`} />
            <SummaryCard label="Refunds / Chargebacks" value={formatCurrency(revenue.refund_amount || 0)} sub={`${revenue.refund_count || 0} refunds`} />
            <SummaryCard label="Total PayU Fees" value={formatCurrency(fees.total || 0)} sub="See itemized breakdown below" />
            <SummaryCard label="Net Revenue" value={formatCurrency(revenue.net_revenue || 0)} sub="Revenue − refunds − fees" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SummaryCard label="Credited to Bank" value={formatCurrency(revenue.net_credited_to_bank || 0)} sub={matchPct !== null ? `Bank-verified · ${matchPct}% reconciled` : 'Bank-verified (HDFC statement)'} />
            <SummaryCard label="Reconciliation Variance" value={formatCurrency(revenue.reconciliation_variance || 0)} sub="Timing gap between transaction & settlement reports" />
          </div>

          {/* Itemized PayU fee breakdown */}
          {feeLineItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-1 text-sm font-semibold text-slate-700">PayU Fee Breakdown</p>
              <p className="mb-3 text-xs text-slate-500">"PayU Transaction Fee" is PayU's standard ~2% + GST MDR — genuinely per-transaction (verified: median exactly 2.000% of daily volume), but settled as one combined debit per day (shown on PayU's dashboard under Settlements → Adjustment → "Platform fees") rather than itemized per transaction row.</p>
              <div className="space-y-1.5">
                {feeLineItems.map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{f.label}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(f.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-sm font-semibold">
                  <span className="text-slate-700">Total</span>
                  <span className="text-slate-900">{formatCurrency(fees.total || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* By channel: Validstep website vs PayU Button vs other */}
          {summary?.by_channel?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-700">Gross Collected by Channel</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {summary.by_channel.map((c) => (
                  <div key={c.channel} className="rounded-lg border border-slate-100 p-3">
                    <Badge variant={CHANNEL_VARIANTS[c.channel] || 'default'}>{CHANNEL_LABELS[c.channel] || c.channel}</Badge>
                    <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(c.gross_amount)}</p>
                    <p className="text-xs text-slate-500">{c.count} transactions · net settled {formatCurrency(c.net_settled_amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By company */}
          {summary?.by_company?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-700">Gross Collected by Client Company</p>
              <div className="space-y-1.5">
                {summary.by_company.map((c) => (
                  <div key={c.company_id || 'unmapped'} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{c.company_name}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(c.amount)} <span className="text-xs text-slate-400">({c.count})</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Reconciliation table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-700">Settlement ↔ Bank Reconciliation</p>
          <div className="flex gap-2">
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="">All channels</option>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              {statusCounts.map((s) => (
                <option key={s.status} value={s.status}>{s.status.replace('_', ' ')} ({s.count})</option>
              ))}
            </select>
          </div>
        </div>

        {reconLoading ? <PageSpinner /> : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Banknote className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600">No settlement data for this filter</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {['Merchant Txn ID', 'Channel', 'Action', 'Net Amount', 'Settlement Date', 'Bank Ref', 'Match Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.merchant_txn_id}</td>
                      <td className="px-4 py-3"><Badge variant={CHANNEL_VARIANTS[r.source_channel] || 'default'}>{CHANNEL_LABELS[r.source_channel] || r.source_channel}</Badge></td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.requested_action}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(r.amount_net_signed)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(r.settlement_date)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.bank_transaction?.ref_no || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={MATCH_VARIANTS[r.bank_match_status] || 'default'}>{r.bank_match_status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3">
                        {r.requested_action === 'capture' && r.payu_id && (
                          <ReceiptButton payuId={r.payu_id} />
                        )}
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
          </>
        )}
      </div>
    </div>
  )
}
