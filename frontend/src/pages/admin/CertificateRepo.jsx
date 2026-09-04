import { useEffect, useMemo, useState } from 'react'
import {
  Archive, UploadCloud, Search, ExternalLink, RefreshCw, Download, FileSpreadsheet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useMatchPublicCertsMutation,
  useStartPublicCertUploadMutation,
  useGetPublicCertUploadStatusQuery,
  useGetPublicCertRecordsQuery,
} from '../../store/api/certRepoApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDateTime } from '../../utils/formatDate'

const ROW_STATUS_COLOR = {
  ready: 'text-emerald-600',
  already_uploaded: 'text-amber-600',
}

const UPLOAD_STATUS_VARIANT = {
  UPLOADED: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
}

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-lg p-3 text-center ${tones[tone]}`}>
      <p className="text-xl font-bold">{value ?? 0}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  )
}

function UploadWizard({ open, onClose, onDone }) {
  const [step, setStep] = useState('form') // form | preview | progress | done
  const [file, setFile] = useState(null)
  const [folderPath, setFolderPath] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [matchResult, setMatchResult] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [finalResult, setFinalResult] = useState(null)

  const [matchPublicCerts, { isLoading: isMatching }] = useMatchPublicCertsMutation()
  const [startUpload, { isLoading: isStarting }] = useStartPublicCertUploadMutation()
  const { data: statusData } = useGetPublicCertUploadStatusQuery(jobId, {
    skip: !jobId || step !== 'progress',
    pollingInterval: 2000,
  })

  useEffect(() => {
    if (step === 'progress' && statusData && (statusData.state === 'completed' || statusData.state === 'failed')) {
      setFinalResult(statusData.result || statusData.progress)
      setStep('done')
    }
  }, [statusData, step])

  const reset = () => {
    setStep('form'); setFile(null); setFolderPath(''); setSourceLabel('')
    setMatchResult(null); setJobId(null); setFinalResult(null)
  }
  const handleClose = () => { reset(); onClose() }

  const handleMatch = async () => {
    if (!file || !folderPath.trim()) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder_path', folderPath.trim())
    try {
      const res = await matchPublicCerts(formData).unwrap()
      setMatchResult(res)
      setStep('preview')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to match certificates')
    }
  }

  const handleStart = async () => {
    try {
      const res = await startUpload({ match_token: matchResult.matchToken, source_label: sourceLabel.trim() }).unwrap()
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
  const progress = statusData?.progress
  const pct = progress?.total ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <Modal open={open} onClose={handleClose} title="Import Public Certificates" size="lg">
      {step === 'form' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload the delivery-log Excel/CSV (columns: <code>name, email, id, duration, date, mail address,
            mo&nbsp;no, Status, Delivered_Time, Break_Taken</code>) and point at the folder <strong>on this
            server</strong> holding the certificate images, each named after the <code>id</code> column
            (e.g. <code>BFDA72436.jpg</code>). The sheet is parsed in memory and never stored — only the
            row values are saved. Each matched image is pushed to R2 under
            <code> public-certificate-repo/</code>.
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
            label="Certificate image folder path (on this server)"
            placeholder="/Users/you/certificates/bfda-jun-aug-2026"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
          />
          <Input
            label="Source label (optional)"
            placeholder="BFDA Jun–Aug 2026"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            <StatCard label="Ready" value={summary.ready} tone="emerald" />
            <StatCard label="Already done" value={summary.already_uploaded} tone="amber" />
            <StatCard label="No file" value={summary.no_file} tone="red" />
            <StatCard label="Duplicate ID" value={summary.duplicate_id} tone="red" />
            <StatCard label="Parse errors" value={summary.parse_error} tone="red" />
          </div>
          <p className="text-xs text-slate-500">
            <strong>Ready</strong> and <strong>already done</strong> rows will be uploaded (already-done rows
            are overwritten with the current file). Everything else is skipped and stays listed here.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchResult.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-700">{r.name || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.email || '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.offerLetterId || '—'}</td>
                    <td className={`px-3 py-2 font-medium ${ROW_STATUS_COLOR[r.status] || 'text-red-600'}`}>{r.status}</td>
                    <td className="px-3 py-2 text-slate-500">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setStep('form')}>Back</Button>
            <Button onClick={handleStart} isLoading={isStarting} disabled={!summary.ready && !summary.already_uploaded}>
              Upload {(summary.ready || 0) + (summary.already_uploaded || 0)} Certificate
              {(summary.ready || 0) + (summary.already_uploaded || 0) === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}

      {step === 'progress' && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-slate-600">Uploading certificates to R2…</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-primary-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-500">
            {progress?.processed || 0} / {progress?.total || 0} processed
            {progress ? ` · ${progress.succeeded} uploaded · ${progress.failed} failed` : ''}
          </p>
        </div>
      )}

      {step === 'done' && finalResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <StatCard label="Uploaded" value={finalResult.succeeded} tone="emerald" />
            <StatCard label="Errors" value={finalResult.failed} tone="red" />
          </div>
          {(finalResult.errors || []).length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finalResult.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-slate-600">{e.offerLetterId}</td>
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

export default function AdminCertificateRepo() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [searchInput])

  const params = useMemo(() => {
    const p = { page, limit }
    if (search) p.search = search
    if (status) p.status = status
    return p
  }, [page, limit, search, status])

  const { data, isLoading, isFetching, refetch } = useGetPublicCertRecordsQuery(params)
  const records = data?.records || []
  const stats = data?.stats || {}
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Archive className="h-5 w-5 text-primary-600" /> Certificate Repository
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Bulk-import offer-letter certificates from a local Excel sheet + image folder. Recipients look
            them up and download at <code>/certificate-download</code> with no login.
          </p>
        </div>
        <Button leftIcon={<UploadCloud className="h-4 w-4" />} onClick={() => setWizardOpen(true)}>
          Import Certificates
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Uploaded" value={stats.UPLOADED} tone="emerald" />
        <StatCard label="Pending" value={stats.PENDING} tone="amber" />
        <StatCard label="Failed" value={stats.FAILED} tone="red" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, or offer-letter ID"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All statuses</option>
            <option value="UPLOADED">Uploaded</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-10"><PageSpinner /></div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-slate-400">
            <FileSpreadsheet className="h-8 w-8" />
            No certificate records yet — click <strong>Import Certificates</strong> to add some.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Offer Letter ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-500">Downloads</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Uploaded</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-800">{r.name || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.email}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.offer_id}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={UPLOAD_STATUS_VARIANT[r.upload_status] || 'default'} dot>
                        {r.upload_status}
                      </Badge>
                      {r.upload_status === 'FAILED' && r.upload_error && (
                        <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-red-500" title={r.upload_error}>
                          {r.upload_error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{r.download_count}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatDateTime(r.uploaded_at)}</td>
                    <td className="px-4 py-2.5">
                      {r.certificate_url ? (
                        <a
                          href={r.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(n) => { setLimit(n); setPage(1) }}
        />
      </div>

      <UploadWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onDone={() => { setPage(1); refetch() }} />
    </div>
  )
}
