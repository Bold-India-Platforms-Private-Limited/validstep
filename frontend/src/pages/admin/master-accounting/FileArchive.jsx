import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetFileArchiveQuery, useDeleteFileArchiveMutation } from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { formatDate, formatDateTime } from '../../../utils/formatDate'
import { downloadFileGet } from '../../../utils/downloadFile'
import { Download, ShieldCheck, Eye, Trash2, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const FILE_TYPES = [
  { value: '', label: 'All file types' },
  { value: 'PAYU_TRANSACTION_REPORT', label: 'PayU Transaction Report' },
  { value: 'PAYU_SETTLEMENT_REPORT', label: 'PayU Settlement Report' },
  { value: 'RAZORPAY_PAYMENT_REPORT', label: 'Razorpay Payment Report' },
  { value: 'RAZORPAY_SETTLEMENT_REPORT', label: 'Razorpay Settlement Report' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
]

const PERIOD_TYPE_LABELS = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
}

function formatBytes(n) {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function PeriodCell({ file }) {
  return (
    <div>
      <Badge variant={file.period_type === 'MONTHLY' ? 'default' : 'info'}>{PERIOD_TYPE_LABELS[file.period_type] || file.period_type}</Badge>
      {file.period_label && <p className="mt-1 text-xs text-slate-500">{file.period_label}</p>}
      {file.date_range && (
        <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{formatDate(file.date_range.from)} – {formatDate(file.date_range.to)}</p>
      )}
      {!file.date_range && !file.imported_to_ledger && (
        <p className="mt-1 text-xs text-slate-400">Reference only</p>
      )}
    </div>
  )
}

/** Two-step confirmation: an informational step naming exactly what's affected, then
 * a final, deliberately harder-to-misclick step before the irreversible delete fires. */
function DeleteConfirmModal({ file, onClose }) {
  const [step, setStep] = useState(1)
  const [deleteFile, { isLoading }] = useDeleteFileArchiveMutation()

  const handleFinalDelete = async () => {
    try {
      const result = await deleteFile(file.id).unwrap()
      toast.success(`Deleted "${result.original_filename}" and ${result.deleted_rows} associated row(s)`)
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete file')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-red-600" /> Remove File
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-slate-600">You're about to remove:</p>
            <p className="mt-1 font-medium text-slate-900">{file.original_filename}</p>
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              This will permanently:
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-red-700">
                <li>Delete the original file from the server</li>
                <li>Delete all {file.row_count} row(s) imported into your ledger/reports from this file</li>
              </ul>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => setStep(2)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-800">Are you absolutely sure?</p>
              <p className="mt-1 text-xs text-red-700">
                This cannot be undone. "{file.original_filename}" and its {file.row_count} row(s) of data will be gone permanently.
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Go Back
              </button>
              <button
                onClick={handleFinalDelete}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MasterAccountingFileArchive() {
  const [fileType, setFileType] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { data: files, isLoading } = useGetFileArchiveQuery({ fileType: fileType || undefined })

  const handleDownload = async (file) => {
    try {
      await downloadFileGet(`/admin/master-accounting/files/${file.id}/download`, file.original_filename)
    } catch (err) {
      toast.error(err.message || 'Failed to download file')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Original File Archive</h1>
        <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          {FILE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        Every file here is stored read-only with a SHA-256 checksum and is never modified after upload.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? <PageSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">File</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Brand / Bank</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2 text-right">Rows</th>
                  <th className="px-4 py-2 text-right">Size</th>
                  <th className="px-4 py-2">Uploaded</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(files || []).map((f) => (
                  <tr key={f.id} className="border-b border-slate-50">
                    <td className="max-w-xs truncate px-4 py-2 font-medium text-slate-900" title={f.original_filename}>{f.original_filename}</td>
                    <td className="px-4 py-2"><Badge variant="default">{f.file_type.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-2 text-slate-500">{f.brand?.name || f.bank_account?.nickname || '—'}</td>
                    <td className="px-4 py-2"><PeriodCell file={f} /></td>
                    <td className="px-4 py-2 text-right text-slate-500">{f.row_count}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{formatBytes(f.file_size)}</td>
                    <td className="px-4 py-2 text-slate-500">{formatDateTime(f.uploaded_at)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/master-accounting/files/${f.id}/compare`} className="text-slate-400 hover:text-amber-600" title="View original & compare with imported data">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDownload(f)} className="text-slate-400 hover:text-amber-600" title="Download original">
                          <Download className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(f)} className="text-slate-400 hover:text-red-600" title="Remove file and its data">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files?.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">No files archived yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && <DeleteConfirmModal file={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  )
}
