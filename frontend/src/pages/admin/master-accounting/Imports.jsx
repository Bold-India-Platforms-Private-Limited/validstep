import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useImportRazorpayPaymentsMutation, useImportRazorpaySettlementsMutation,
  useImportPayuTransactionsMutation, useImportPayuSettlementsMutation,
  useImportBankStatementMutation,
  usePreviewRazorpayPaymentsMutation, usePreviewRazorpaySettlementsMutation,
  usePreviewPayuTransactionsMutation, usePreviewPayuSettlementsMutation,
  usePreviewBankStatementMutation,
  useRunReconciliationMutation, useGetMonthCoverageQuery,
} from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { formatDate } from '../../../utils/formatDate'
import { Upload, RefreshCw, AlertTriangle, CheckCircle2, X, Archive } from 'lucide-react'
import toast from 'react-hot-toast'

const IMPORTS = [
  { key: 'razorpayPayments', label: 'Razorpay Payment Report', brand: 'RiseFlake' },
  { key: 'razorpaySettlements', label: 'Razorpay Settlement Report', brand: 'RiseFlake' },
  { key: 'payuTransactions', label: 'PayU Transaction Report', brand: 'Validstep' },
  { key: 'payuSettlements', label: 'PayU Settlement Report', brand: 'Validstep' },
  { key: 'bankStatement', label: 'HDFC Bank Statement', brand: 'Shared' },
]

const PERIOD_TYPES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom (reference only)' },
]

const COVERAGE_LABELS = [
  { fileType: 'RAZORPAY_PAYMENT_REPORT', label: 'Razorpay Payments' },
  { fileType: 'RAZORPAY_SETTLEMENT_REPORT', label: 'Razorpay Settlements' },
  { fileType: 'PAYU_TRANSACTION_REPORT', label: 'PayU Transactions' },
  { fileType: 'PAYU_SETTLEMENT_REPORT', label: 'PayU Settlements' },
  { fileType: 'BANK_STATEMENT', label: 'Bank Statement' },
]

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

function CoverageMatrix() {
  const { data, isLoading } = useGetMonthCoverageQuery()
  if (isLoading) return <PageSpinner />
  const months = data?.months || []
  if (months.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="font-semibold text-slate-900">Data Coverage by Month</h3>
        <p className="text-xs text-slate-500">Which months have data for each report type — a blank cell means that month's file hasn't been uploaded yet. Custom/reference-only uploads don't count here.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2">Report</th>
              {months.map((m) => <th key={m} className="px-3 py-2 text-center">{monthLabel(m)}</th>)}
            </tr>
          </thead>
          <tbody>
            {COVERAGE_LABELS.map((row) => (
              <tr key={row.fileType} className="border-b border-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">{row.label}</td>
                {months.map((m) => {
                  const count = data.coverage[row.fileType]?.[m]
                  return (
                    <td key={m} className="px-3 py-2 text-center">
                      {count
                        ? <Badge variant="success">{count}</Badge>
                        : <Badge variant="danger">Missing</Badge>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewModal({ preview, fileLabel, periodType, onConfirm, onCancel, isImporting }) {
  const isReferenceOnly = periodType !== 'MONTHLY'
  const hasOverlap = preview.overlapping_files?.length > 0
  const hasExisting = preview.already_imported_rows > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Confirm Import — {fileLabel}</h2>
          <button onClick={onCancel}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {isReferenceOnly && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-800">
              <Archive className="h-4 w-4" /> Reference-only upload
            </p>
            <p className="mt-1 text-xs text-sky-700">
              This file will be archived read-only for later cross-checking, but none of its rows will be written to your
              ledger, dashboard, or reports — it won't double-count data already covered by your monthly uploads.
            </p>
          </div>
        )}

        {isReferenceOnly && preview.verification && (
          <div className="mb-4 rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">Verification against your existing ledger</p>
            <p className="mb-2 text-xs text-slate-500">
              Every transaction in this file's date range is checked both ways: against what you already uploaded monthly,
              and vice versa — so a month you forgot to upload, a row a monthly file got wrong, and a row this file itself
              doesn't cover all show up below.
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 p-2">
                <p className="text-lg font-bold text-emerald-700">{preview.verification.verified_count}</p>
                <p className="text-[11px] text-emerald-700">Verified Correct</p>
              </div>
              <div className={`rounded-lg p-2 ${preview.verification.mismatch_count > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className={`text-lg font-bold ${preview.verification.mismatch_count > 0 ? 'text-red-700' : 'text-slate-400'}`}>{preview.verification.mismatch_count}</p>
                <p className={`text-[11px] ${preview.verification.mismatch_count > 0 ? 'text-red-700' : 'text-slate-400'}`}>Mismatched</p>
              </div>
              <div className={`rounded-lg p-2 ${preview.verification.missing_from_ledger_count > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-lg font-bold ${preview.verification.missing_from_ledger_count > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{preview.verification.missing_from_ledger_count}</p>
                <p className={`text-[11px] ${preview.verification.missing_from_ledger_count > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Missing from Ledger</p>
              </div>
              <div className={`rounded-lg p-2 ${preview.verification.extra_in_ledger_count > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-lg font-bold ${preview.verification.extra_in_ledger_count > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{preview.verification.extra_in_ledger_count}</p>
                <p className={`text-[11px] ${preview.verification.extra_in_ledger_count > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Not in This File</p>
              </div>
            </div>

            {preview.verification.mismatch_count === 0 && preview.verification.missing_from_ledger_count === 0
              && preview.verification.extra_in_ledger_count === 0 && preview.verification.verified_count > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Every transaction in this date range matches exactly between this file and your ledger — fully verified.
              </p>
            )}

            {preview.verification.mismatch_count > 0 && (
              <div className="mt-2 rounded-lg bg-red-50 p-2">
                <p className="text-xs font-semibold text-red-800">Rows that don't match your ledger:</p>
                <ul className="mt-1 space-y-1 text-xs text-red-700">
                  {preview.verification.mismatches.slice(0, 5).map((m) => (
                    <li key={m.key}>
                      • {m.key}: {m.diffs.map((d) => `${d.field} is ${d.ledger_value} in ledger but ${d.file_value} in this file`).join(', ')}
                    </li>
                  ))}
                </ul>
                {preview.verification.mismatch_count > 5 && (
                  <p className="mt-1 text-[11px] text-red-600">…and {preview.verification.mismatch_count - 5} more.</p>
                )}
              </div>
            )}

            {preview.verification.missing_from_ledger_count > 0 && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2">
                <p className="text-xs font-semibold text-amber-800">
                  In this file but not in your ledger at all — check whether the corresponding monthly upload is missing:
                </p>
                <ul className="mt-1 space-y-1 text-xs text-amber-700">
                  {preview.verification.missing_from_ledger.slice(0, 5).map((k) => <li key={k}>• {k}</li>)}
                </ul>
                {preview.verification.missing_from_ledger_count > 5 && (
                  <p className="mt-1 text-[11px] text-amber-600">…and {preview.verification.missing_from_ledger_count - 5} more.</p>
                )}
              </div>
            )}

            {preview.verification.extra_in_ledger_count > 0 && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2">
                <p className="text-xs font-semibold text-amber-800">
                  In your ledger (within this file's date range) but not found in this file — could mean this file doesn't
                  fully cover that sub-range, or the ledger has a row not backed by the source:
                </p>
                <ul className="mt-1 space-y-1 text-xs text-amber-700">
                  {preview.verification.extra_in_ledger.slice(0, 5).map((k) => <li key={k}>• {k}</li>)}
                </ul>
                {preview.verification.extra_in_ledger_count > 5 && (
                  <p className="mt-1 text-[11px] text-amber-600">…and {preview.verification.extra_in_ledger_count - 5} more.</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-slate-900">{preview.total_rows}</p>
            <p className="text-xs text-slate-500">Total Rows</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xl font-bold text-emerald-700">{isReferenceOnly ? 0 : preview.new_rows}</p>
            <p className="text-xs text-emerald-700">{isReferenceOnly ? 'Written to Ledger' : 'New'}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xl font-bold text-amber-700">{preview.already_imported_rows}</p>
            <p className="text-xs text-amber-700">Already Imported</p>
          </div>
        </div>

        {preview.date_range && (
          <p className="mt-3 text-sm text-slate-600">
            This file covers <strong>{formatDate(preview.date_range.from)}</strong> to <strong>{formatDate(preview.date_range.to)}</strong>.
          </p>
        )}

        {!isReferenceOnly && hasOverlap && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Overlaps with previously uploaded file(s)
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-amber-700">
              {preview.overlapping_files.map((f) => (
                <li key={f.id}>• {f.original_filename} (uploaded {formatDate(f.uploaded_at)})</li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-amber-700">
              Rows already in the system are safely skipped as duplicates — nothing gets double-counted. Only the {preview.new_rows} new row(s) will be added.
            </p>
          </div>
        )}

        {isReferenceOnly && hasOverlap && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs text-sky-700">
              For reference: this range overlaps with {preview.overlapping_files.length} monthly upload(s) already in your ledger —
              useful for cross-checking totals, since none of this file's rows will be added again.
            </p>
          </div>
        )}

        {!isReferenceOnly && !hasOverlap && hasExisting && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> No new rows in this file — it looks like a re-upload of data you already have.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isImporting}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isImporting
              ? 'Importing…'
              : isReferenceOnly
                ? 'Archive as Reference'
                : preview.new_rows > 0 ? `Import ${preview.new_rows} New Row(s)` : 'Import Anyway'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UploadCard({ importKey, label, brand, usePreview, useImport }) {
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const [preview, { isLoading: previewing }] = usePreview()
  const [runImport, { isLoading: importing }] = useImport()
  const [periodType, setPeriodType] = useState('MONTHLY')
  const [periodLabel, setPeriodLabel] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [previewResult, setPreviewResult] = useState(null)

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await preview(file).unwrap()
      setPendingFile(file)
      setPreviewResult(result)
    } catch (err) {
      toast.error(err?.data?.message || `Failed to read ${label}`)
    }
  }

  const handleConfirm = async () => {
    try {
      const result = await runImport({ file: pendingFile, periodType, periodLabel: periodLabel || undefined }).unwrap()
      const pending = result.pending_classification

      if (result.archived_only) {
        toast.success(`Archived ${result.parsed_row_count} row(s) for reference — nothing added to your ledger.`)
      } else {
        toast.success(
          `Imported ${result.row_count} rows${result.skipped_count || result.skipped_duplicate ? ` (${result.skipped_count ?? result.skipped_duplicate} already existed)` : ''}` +
          (pending ? ` · ${pending} need classification` : '')
        )
        if (pending > 0 && importKey === 'bankStatement') {
          toast((t) => (
            <span>
              {pending} new row(s) need a category.{' '}
              <button
                className="font-semibold text-amber-700 underline"
                onClick={() => { toast.dismiss(t.id); navigate('/admin/master-accounting/bank-ledger?categoryId=null') }}
              >
                Review now
              </button>
            </span>
          ), { duration: 8000 })
        }
      }
      setPendingFile(null)
      setPreviewResult(null)
      setPeriodLabel('')
    } catch (err) {
      toast.error(err?.data?.message || `Failed to import ${label}`)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{brand}</p>
      <p className="mb-3 font-semibold text-slate-900">{label}</p>

      <label className="mb-1 block text-xs font-medium text-slate-500">Period type</label>
      <select
        value={periodType}
        onChange={(e) => setPeriodType(e.target.value)}
        className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      >
        {PERIOD_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {periodType === 'CUSTOM' && (
        <input
          type="text"
          placeholder="Label, e.g. Q1 2026 / FY 2025-26"
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      )}

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={previewing}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
      >
        {previewing
          ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
          : <Upload className="h-4 w-4" />
        }
        {previewing ? 'Reading file…' : 'Upload File'}
      </button>

      {previewResult && (
        <PreviewModal
          preview={previewResult}
          fileLabel={label}
          periodType={periodType}
          onConfirm={handleConfirm}
          onCancel={() => { setPendingFile(null); setPreviewResult(null) }}
          isImporting={importing}
        />
      )}
    </div>
  )
}

const HOOKS = {
  razorpayPayments: { usePreview: usePreviewRazorpayPaymentsMutation, useImport: useImportRazorpayPaymentsMutation },
  razorpaySettlements: { usePreview: usePreviewRazorpaySettlementsMutation, useImport: useImportRazorpaySettlementsMutation },
  payuTransactions: { usePreview: usePreviewPayuTransactionsMutation, useImport: useImportPayuTransactionsMutation },
  payuSettlements: { usePreview: usePreviewPayuSettlementsMutation, useImport: useImportPayuSettlementsMutation },
  bankStatement: { usePreview: usePreviewBankStatementMutation, useImport: useImportBankStatementMutation },
}

export default function MasterAccountingImports() {
  const [runReconciliation, { isLoading: reconciling }] = useRunReconciliationMutation()

  const handleReconcile = async () => {
    try {
      const result = await runReconciliation().unwrap()
      toast.success(
        `Razorpay: ${result.razorpay_matched} matched / ${result.razorpay_unmatched} unmatched · ` +
        `PayU: ${result.payu_matched} matched / ${result.payu_unmatched} unmatched`
      )
    } catch (err) {
      toast.error(err?.data?.message || 'Reconciliation failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Import Source Files</h1>
        <button onClick={handleReconcile} disabled={reconciling} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${reconciling ? 'animate-spin' : ''}`} /> Run Reconciliation
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Pick a period type before uploading — <strong>Monthly</strong> is the normal recurring upload and gets fully added to
        your ledger. <strong>Quarterly / Half-Yearly / Yearly / Custom</strong> files (e.g. a combined Q1 report) are archived
        read-only for later cross-checking only and are never written into your ledger or reports, so they can't
        double-count data you've already uploaded monthly.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {IMPORTS.map((i) => (
          <UploadCard key={i.key} importKey={i.key} label={i.label} brand={i.brand} {...HOOKS[i.key]} />
        ))}
      </div>

      <CoverageMatrix />
    </div>
  )
}
