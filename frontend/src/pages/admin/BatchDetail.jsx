import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useGetAdminBatchQuery, useGetAdminBatchStatsQuery,
  useGetAdminBatchOrdersQuery, useIssueCertificatesAdminMutation,
  useGetAdminUsersQuery, useEnrollUsersInBatchMutation,
  useGetAssignableTransactionsQuery, useAssignTransactionsToBatchMutation, useGetAdminWhoamiQuery,
  useMatchBulkCertificatesMutation, useStartBulkCertificateUploadMutation, useGetBulkCertificateUploadStatusQuery,
  usePreviewBatchAccessEmailQuery, useSendBatchAccessEmailsMutation, useGetBatchAccessEmailStatusQuery,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { ArrowLeft, Award, ShoppingBag, CreditCard, RefreshCw, CheckSquare, UserPlus, Search, Receipt, UploadCloud, Mail, Copy } from 'lucide-react'

function EnrollUsersModal({ open, onClose, companyId, batchId, onEnrolled }) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const { data } = useGetAdminUsersQuery({ page: 1, limit: 100, ...(search && { search }) }, { skip: !open })
  const [enrollUsers, { isLoading }] = useEnrollUsersInBatchMutation()

  const users = data?.users || []

  const toggle = (userId) => setSelectedIds((s) => s.includes(userId) ? s.filter((x) => x !== userId) : [...s, userId])

  const handleClose = () => { setSearch(''); setSelectedIds([]); setResult(null); onClose() }

  const handleSubmit = async () => {
    if (!selectedIds.length) return
    try {
      const res = await enrollUsers({ companyId, batchId, user_ids: selectedIds }).unwrap()
      setResult(res)
      toast.success(`Enrolled ${res.enrolled} of ${res.total} selected users`)
      onEnrolled?.()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to enroll users')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Enroll Existing Users" size="lg">
      {!result ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {users.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No users found</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => toggle(u.id)}
                      className="rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} isLoading={isLoading} disabled={!selectedIds.length}>
                Enroll {selectedIds.length || ''} User{selectedIds.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{result.enrolled}</p>
              <p className="text-xs text-emerald-600">Enrolled</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{e.email}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function AssignTransactionsModal({ open, onClose, companyId, batchId, onAssigned }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const { data, isFetching } = useGetAssignableTransactionsQuery(
    { ...(from && { from }), ...(to && { to }), ...(search && { search }) },
    { skip: !open }
  )
  const [assignTransactions, { isLoading }] = useAssignTransactionsToBatchMutation()

  const transactions = data?.transactions || []

  const toggle = (payuId) => setSelectedIds((s) => s.includes(payuId) ? s.filter((x) => x !== payuId) : [...s, payuId])

  const handleClose = () => { setFrom(''); setTo(''); setSearch(''); setSelectedIds([]); setResult(null); onClose() }

  const handleSubmit = async () => {
    if (!selectedIds.length) return
    try {
      const res = await assignTransactions({ companyId, batchId, payu_ids: selectedIds }).unwrap()
      setResult(res)
      toast.success(`Assigned ${res.assigned} of ${res.total} selected transactions`)
      onAssigned?.()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to assign transactions')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Assign from Imported Transactions" size="lg">
      {!result ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Only <strong>captured</strong> (successful) transactions not yet assigned to a batch are shown. Filter by the transaction date range from the PayU report.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div className="relative col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Email, name, txn ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {isFetching ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No assignable transactions found for this filter</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <label key={t.payu_id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.payu_id)}
                      onChange={() => toggle(t.payu_id)}
                      className="rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{[t.firstname, t.lastname].filter(Boolean).join(' ') || t.email || 'Unknown'}</p>
                      <p className="truncate text-xs text-slate-500">{t.email} &middot; {formatDate(t.addedon)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(t.amount || 0)}</p>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} isLoading={isLoading} disabled={!selectedIds.length}>
                Assign {selectedIds.length || ''} Transaction{selectedIds.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{result.assigned}</p>
              <p className="text-xs text-emerald-600">Assigned</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{e.email}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const STATUS_COLOR = {
  ready: 'text-emerald-600',
  already_uploaded: 'text-amber-600',
}

function BulkCertificateUploadModal({ open, onClose, batchId, onDone }) {
  const [step, setStep] = useState('form') // form | preview | progress | done
  const [file, setFile] = useState(null)
  const [folderPath, setFolderPath] = useState('')
  const [matchResult, setMatchResult] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [finalResult, setFinalResult] = useState(null)

  const [matchBulkCertificates, { isLoading: isMatching }] = useMatchBulkCertificatesMutation()
  const [startBulkCertificateUpload, { isLoading: isStarting }] = useStartBulkCertificateUploadMutation()
  const { data: statusData } = useGetBulkCertificateUploadStatusQuery(
    { batchId, jobId },
    { skip: !jobId || step !== 'progress', pollingInterval: 2000 }
  )

  useEffect(() => {
    if (step === 'progress' && statusData && (statusData.state === 'completed' || statusData.state === 'failed')) {
      setFinalResult(statusData.result || statusData.progress)
      setStep('done')
    }
  }, [statusData, step])

  const reset = () => {
    setStep('form'); setFile(null); setFolderPath(''); setMatchResult(null); setJobId(null); setFinalResult(null)
  }
  const handleClose = () => { reset(); onClose() }

  const handleMatch = async () => {
    if (!file || !folderPath.trim()) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder_path', folderPath.trim())
    try {
      const res = await matchBulkCertificates({ batchId, formData }).unwrap()
      setMatchResult(res)
      setStep('preview')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to match certificates')
    }
  }

  const handleUpload = async () => {
    try {
      const res = await startBulkCertificateUpload({ batchId, match_token: matchResult.matchToken }).unwrap()
      if (res.sync) {
        setFinalResult(res.result)
        setStep('done')
      } else {
        setJobId(res.jobId)
        setStep('progress')
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to start upload')
    }
  }

  const handleDone = () => { const cb = onDone; reset(); onClose(); cb?.() }

  const summary = matchResult?.summary || {}
  const otherErrors = (summary.no_certificate || 0) + (summary.duplicate_row || 0) + (summary.parse_error || 0)
  const progress = statusData?.progress
  // Rows the sheet couldn't place — no matching order/file/etc. These need a manual upload
  // via the single certificate upload on that order's row, so we keep this list visible
  // all the way through to the Done screen instead of letting it disappear after preview.
  const pendingRows = (matchResult?.rows || []).filter((r) => r.status !== 'ready' && r.status !== 'already_uploaded')

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Upload Certificates" size="lg">
      {step === 'form' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload an Excel/CSV sheet (Name, Email, Email2, ID, Duration, Date) and point at the folder on this
            server containing the finished certificate files, named after the ID column (e.g.{' '}
            <code>BFDA52703.jpg</code>). Rows are matched to batch orders by either email column — whichever one
            matches — and to files by ID. Same badge-and-storage logic as the single certificate upload.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Excel / CSV file</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <Input
            label="Certificate folder path (on this server)"
            placeholder="/Users/you/certificates/batch-folder"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleMatch} isLoading={isMatching} disabled={!file || !folderPath.trim()}>
              Match
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && matchResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xl font-bold text-emerald-700">{summary.ready || 0}</p>
              <p className="text-xs text-emerald-600">Ready</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xl font-bold text-amber-700">{summary.already_uploaded || 0}</p>
              <p className="text-xs text-amber-600">Already done</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xl font-bold text-red-700">{summary.no_order || 0}</p>
              <p className="text-xs text-red-600">No email match</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xl font-bold text-red-700">{summary.no_file || 0}</p>
              <p className="text-xs text-red-600">No file</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xl font-bold text-red-700">{otherErrors}</p>
              <p className="text-xs text-red-600">Other errors</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Only <strong>ready</strong> rows will be uploaded. Everything else is skipped — no data is changed for
            those orders, and they stay listed here (and again after upload) so you know exactly what still needs a
            manual certificate upload.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Email 2</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchResult.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-700">{r.email || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.email2 || '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.id || '—'}</td>
                    <td className={`px-3 py-2 font-medium ${STATUS_COLOR[r.status] || 'text-red-600'}`}>{r.status}</td>
                    <td className="px-3 py-2 text-slate-500">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setStep('form')}>Back</Button>
            <Button onClick={handleUpload} isLoading={isStarting} disabled={!summary.ready}>
              Upload {summary.ready || 0} Certificate{summary.ready === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}

      {step === 'progress' && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-slate-600">Uploading certificates…</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${progress?.total ? Math.round((progress.processed / progress.total) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {progress?.processed || 0} / {progress?.total || 0} processed
            {progress ? ` · ${progress.succeeded} succeeded · ${progress.failed} failed` : ''}
          </p>
        </div>
      )}

      {step === 'done' && finalResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{finalResult.succeeded ?? 0}</p>
              <p className="text-xs text-emerald-600">Uploaded</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{finalResult.failed ?? 0}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {(finalResult.errors || []).length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finalResult.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{e.email}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{e.docId}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pendingRows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">
                {pendingRows.length} record{pendingRows.length === 1 ? '' : 's'} from the sheet still need{pendingRows.length === 1 ? 's' : ''} a manual certificate upload
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Email 2</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingRows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-700">{r.email || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{r.email2 || '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.id || '—'}</td>
                        <td className="px-3 py-2 font-medium text-red-600">{r.status}</td>
                        <td className="px-3 py-2 text-slate-500">{r.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Use the single certificate upload on that order's row in the table below to handle these.
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function SendBatchEmailModal({ open, onClose, batchId, selectedOrderIds, totalUsers, issuedUsers, onDone }) {
  const [target, setTarget] = useState('selected') // 'selected' | 'all'
  const [step, setStep] = useState('compose') // compose | progress | done
  const [jobId, setJobId] = useState(null)
  const [finalResult, setFinalResult] = useState(null)

  const hasSelection = selectedOrderIds.length > 0
  const effectiveTarget = hasSelection ? target : 'all'
  const previewOrderId = effectiveTarget === 'selected' ? selectedOrderIds[0] : undefined

  const { data: preview, isFetching: isPreviewing } = usePreviewBatchAccessEmailQuery(
    { batchId, orderId: previewOrderId },
    { skip: !open }
  )
  const [sendEmails, { isLoading: isSending }] = useSendBatchAccessEmailsMutation()
  const { data: statusData } = useGetBatchAccessEmailStatusQuery(
    { batchId, jobId },
    { skip: !jobId || step !== 'progress', pollingInterval: 2000 }
  )

  useEffect(() => {
    if (step === 'progress' && statusData && (statusData.state === 'completed' || statusData.state === 'failed')) {
      setFinalResult(statusData.result || statusData.progress)
      setStep('done')
    }
  }, [statusData, step])

  const reset = () => { setTarget('selected'); setStep('compose'); setJobId(null); setFinalResult(null) }
  const handleClose = () => { reset(); onClose() }
  const handleDone = () => { const cb = onDone; reset(); onClose(); cb?.() }

  const handleSend = async () => {
    try {
      const res = await sendEmails({
        batchId,
        all: effectiveTarget === 'all',
        order_ids: effectiveTarget === 'selected' ? selectedOrderIds : undefined,
      }).unwrap()
      if (res.sync) {
        setFinalResult(res.result)
        setStep('done')
      } else {
        setJobId(res.jobId)
        setStep('progress')
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send emails')
    }
  }

  const progress = statusData?.progress
  const recipientCount = effectiveTarget === 'selected' ? selectedOrderIds.length : issuedUsers

  return (
    <Modal open={open} onClose={handleClose} title="Send Account Access Email" size="xl">
      {step === 'compose' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Sends the login + Public Verification Link email to recipients whose certificate is already issued.
            Anyone without an issued certificate yet is skipped and reported after sending.
          </p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-lg font-bold text-slate-900">{totalUsers ?? '—'}</p>
              <p className="text-xs text-slate-500">Total Users</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-lg font-bold text-emerald-700">{issuedUsers ?? '—'}</p>
              <p className="text-xs text-emerald-600">Issued (will receive email)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={effectiveTarget === 'selected'}
                disabled={!hasSelection}
                onChange={() => setTarget('selected')}
              />
              Selected users ({selectedOrderIds.length})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={effectiveTarget === 'all'} onChange={() => setTarget('all')} />
              All users in this batch — sends only to the {issuedUsers ?? 0} with an issued certificate
            </label>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Preview {preview?.sample ? '(sample data — pick a selected user to preview their real details)' : ''}
            </p>
            {isPreviewing || !preview ? (
              <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-400">
                Loading preview…
              </div>
            ) : (
              <iframe title="Email preview" srcDoc={preview.html} className="h-[420px] w-full rounded-lg border border-slate-200 bg-white" />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSend} isLoading={isSending}>
              Send {recipientCount !== null ? `to ${recipientCount} User${recipientCount === 1 ? '' : 's'}` : 'to All Users'}
            </Button>
          </div>
        </div>
      )}

      {step === 'progress' && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-slate-600">Sending emails…</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${progress?.total ? Math.round((progress.processed / progress.total) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {progress?.processed || 0} / {progress?.total || 0} processed
            {progress ? ` · ${progress.succeeded} sent · ${progress.failed} skipped/failed` : ''}
          </p>
          {progress?.pacing?.cooling_down ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Pausing ~{Math.max(0, Math.round((new Date(progress.pacing.resume_at).getTime() - Date.now()) / 1000))}s before the next batch — sending is throttled to 40–100 emails/min with periodic pauses to avoid spam flags.
            </p>
          ) : (
            <p className="text-xs text-slate-400">Throttled to 40–100 emails/min, with a longer pause every 80 sends.</p>
          )}
        </div>
      )}

      {step === 'done' && finalResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{finalResult.succeeded ?? 0}</p>
              <p className="text-xs text-emerald-600">Sent</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{finalResult.failed ?? 0}</p>
              <p className="text-xs text-red-600">Skipped / Failed</p>
            </div>
          </div>
          {(finalResult.errors || []).length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finalResult.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{e.email}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function AdminBatchDetail() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [certFilter, setCertFilter] = useState('')
  const [selected, setSelected] = useState([])
  const [showEnroll, setShowEnroll] = useState(false)
  const [showAssignTxns, setShowAssignTxns] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const { data: batchData, isLoading } = useGetAdminBatchQuery(id)
  const { data: statsData, refetch: refetchStats } = useGetAdminBatchStatsQuery(id)
  const { data: ordersData, refetch: refetchOrders } = useGetAdminBatchOrdersQuery({
    id, page, limit, ...(certFilter && { certificate_status: certFilter }),
  })
  const [issueCerts, { isLoading: issuing }] = useIssueCertificatesAdminMutation()
  const { data: whoami } = useGetAdminWhoamiQuery()
  const isReview = whoami?.access_level === 'review'

  if (isLoading) return <PageSpinner />
  if (!batchData) return <p className="p-6 text-slate-500">Batch not found</p>

  const batch = batchData.batch || batchData
  const stats = statsData || {}
  const orders = ordersData?.orders || []
  const pagination = ordersData?.pagination || {}

  const toggle = (orderId) => setSelected((s) => s.includes(orderId) ? s.filter((x) => x !== orderId) : [...s, orderId])
  const toggleAll = () => setSelected(selected.length === orders.length ? [] : orders.map((o) => o.id))

  const copyEmail = (email) => {
    navigator.clipboard.writeText(email)
      .then(() => toast.success('Email copied'))
      .catch(() => toast.error('Could not copy — your browser blocked clipboard access'))
  }

  const handleIssue = async () => {
    if (!selected.length) return
    // A single selected order almost always means "I want to manually upload this one
    // person's certificate" (e.g. it wasn't covered by the bulk upload sheet/folder) rather
    // than generating one from the system template — send them straight to that order's
    // Certificate tab in a new tab instead of running the bulk template-issue flow.
    if (selected.length === 1) {
      window.open(`/admin/order-log?order=${selected[0]}&tab=certificate`, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const res = await issueCerts({ batchId: id, order_ids: selected }).unwrap()
      toast.success(`${res.issued || selected.length} certificate(s) issued`)
      setSelected([])
      refetchOrders()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to issue')
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-900">Orders</h2>
            <select
              value={certFilter}
              onChange={(e) => { setCertFilter(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Certificates</option>
              <option value="ISSUED">Issued</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          {!isReview && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAssignTxns(true)} leftIcon={<Receipt className="h-3.5 w-3.5" />}>
                Assign Transactions
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowEnroll(true)} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
                Enroll Users
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowSendEmail(true)} leftIcon={<Mail className="h-3.5 w-3.5" />}>
                Send Email
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowBulkUpload(true)} leftIcon={<UploadCloud className="h-3.5 w-3.5" />}>
                Bulk Upload Certificates
              </Button>
              {selected.length > 0 && (
                <button
                  onClick={handleIssue}
                  disabled={issuing}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {selected.length === 1 ? (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Upload Certificate
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Issue {selected.length} Certificates
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {!isReview && (
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                    </th>
                  )}
                  {['User', 'Amount', 'Status', 'Certificate', 'Date', 'Paid At'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(o.id) ? 'bg-primary-50' : ''}`}>
                    {!isReview && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="rounded border-slate-300" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                      <div className="flex items-center gap-1">
                        {o.user?.email && (
                          <button
                            type="button"
                            onClick={() => copyEmail(o.user.email)}
                            title="Copy email"
                            className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                        <p className="truncate text-xs text-slate-500">{o.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      {o.certificate ? (
                        <div>
                          <p className="font-mono text-xs text-slate-600">{o.certificate.verification_code || o.certificate.certificate_serial}</p>
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
          </div>
          <Pagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1) }}
          />
        </div>
      </div>

      <EnrollUsersModal
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        companyId={batch.company?.id}
        batchId={id}
        onEnrolled={() => { refetchOrders(); refetchStats(); }}
      />
      <AssignTransactionsModal
        open={showAssignTxns}
        onClose={() => setShowAssignTxns(false)}
        companyId={batch.company?.id}
        batchId={id}
        onAssigned={() => { refetchOrders(); refetchStats(); }}
      />
      <BulkCertificateUploadModal
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        batchId={id}
        onDone={() => { refetchOrders(); refetchStats(); }}
      />
      <SendBatchEmailModal
        open={showSendEmail}
        onClose={() => setShowSendEmail(false)}
        batchId={id}
        selectedOrderIds={selected}
        totalUsers={stats.orders?.TOTAL}
        issuedUsers={stats.certificates_issued}
        onDone={() => { refetchOrders(); refetchStats(); }}
      />
    </div>
  )
}
