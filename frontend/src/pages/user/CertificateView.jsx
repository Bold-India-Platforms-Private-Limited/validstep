import { useParams, Link } from 'react-router-dom'
import { useGetCertificateQuery } from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/formatDate'
import { ArrowLeft, Download, ExternalLink, Award, CheckCircle } from 'lucide-react'

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

export default function CertificateView() {
  const { id } = useParams()
  const { data: cert, isLoading } = useGetCertificateQuery(id)

  if (isLoading) return <PageSpinner />
  if (!cert) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Award className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-slate-600">Certificate not found</p>
      <Link to="/dashboard" className="mt-4 text-sm text-primary-600 hover:underline">Back to dashboard</Link>
    </div>
  )

  const verifyUrl = `${APP_URL}/verify/${cert.verification_hash}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Certificate</h1>
          <p className="text-sm text-slate-500">{cert.certificate_serial}</p>
        </div>
      </div>

      {/* Certificate card */}
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-white" />
            <div>
              <p className="text-sm font-medium text-primary-100">Certificate of Completion</p>
              <p className="text-xl font-bold text-white">{cert.batch?.program?.name}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={cert.is_issued ? 'ISSUED' : 'PENDING'} />
            {cert.is_issued && (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Verified
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Recipient</p>
              <p className="mt-1 font-semibold text-slate-900">{cert.user?.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Program</p>
              <p className="mt-1 font-semibold text-slate-900">{cert.batch?.program?.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Batch</p>
              <p className="mt-1 text-slate-700">{cert.batch?.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Role</p>
              <p className="mt-1 text-slate-700">{cert.batch?.role || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="mt-1 text-slate-700">
                {formatDate(cert.batch?.start_date)} — {formatDate(cert.batch?.end_date)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Issued On</p>
              <p className="mt-1 text-slate-700">{cert.issued_at ? formatDate(cert.issued_at) : '—'}</p>
            </div>
          </div>

          {/* Certificate ID */}
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Certificate ID</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{cert.certificate_serial}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {cert.certificate_url && (
              <a
                href={cert.certificate_url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            )}
            <a
              href={verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Verify Online
            </a>
          </div>

          {/* Verification URL */}
          <div className="rounded-lg border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Verification URL</p>
            <p className="font-mono text-xs text-slate-600 break-all">{verifyUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
