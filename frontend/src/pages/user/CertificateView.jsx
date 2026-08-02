import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGetCertificateQuery } from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { BatchProgress } from '../../components/ui/BatchProgress'
import { formatDate } from '../../utils/formatDate'
import { downloadCertificateFile } from '../../utils/downloadInvoice'
import { ArrowLeft, Download, ExternalLink, Award, CheckCircle, Copy, Linkedin } from 'lucide-react'
import toast from 'react-hot-toast'

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

function isPdfUrl(url) {
  return /\.pdf($|\?)/i.test(url || '')
}

export default function CertificateView() {
  const { id } = useParams()
  const { data: cert, isLoading } = useGetCertificateQuery(id)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const ext = isPdfUrl(cert.certificate_url) ? 'pdf' : (cert.certificate_url.match(/\.(\w+)($|\?)/)?.[1] || 'jpg')
      await downloadCertificateFile(cert.id, `certificate-${cert.certificate_serial}.${ext}`)
    } catch (err) {
      toast.error(err.message || 'Failed to download certificate')
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return <PageSpinner />
  if (!cert) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Award className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-medium text-slate-600">Certificate not found</p>
      <Link to="/dashboard" className="mt-4 text-sm text-primary-600 hover:underline">Back to dashboard</Link>
    </div>
  )

  const verifyUrl = `${APP_URL}/verify/${cert.verification_code || cert.verification_hash}`
  const credentialId = cert.verification_code || cert.certificate_serial
  const companyName = cert.batch?.company?.name || 'the organization'
  const programName = cert.batch?.program?.name || 'the program'

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      toast.success('Credential URL copied')
    } catch {
      toast.error('Could not copy — copy it manually')
    }
  }

  const linkedInText = `I'm excited to share that I've completed my certification from ${companyName}! 🎓\n\n` +
    `Program: ${programName}\n` +
    `Credential ID: ${credentialId}\n\n` +
    `Verify it here: ${verifyUrl}\n\n` +
    `#Certification #ProfessionalDevelopment`
  const linkedInShareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedInText)}`

  return (
    <div className="space-y-6">
      {/* Native-app-style topbar on mobile (the site header is hidden there for this page);
          a plain in-flow row on desktop, where the header stays visible above it. */}
      <div className="flex items-center gap-3 max-md:sticky max-md:top-0 max-md:z-30 max-md:-mx-4 max-md:-mt-6 max-md:border-b max-md:border-slate-200 max-md:bg-white/95 max-md:px-3 max-md:pb-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] max-md:backdrop-blur">
        <Link to="/dashboard" className="rounded-lg p-2 transition-colors hover:bg-slate-100 max-md:h-10 max-md:w-10 max-md:rounded-full max-md:active:bg-slate-200">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Certificate</h1>
        </div>
      </div>

      {/* Certificate card */}
      <div className="max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-md:-mx-4 max-md:rounded-none max-md:border-x-0">
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

        <div className="flex flex-col md:flex-row">
          {/* Certificate preview — 50% width on desktop, full width stacked on mobile */}
          {cert.certificate_url && (
            <div className="border-b border-slate-100 bg-slate-50 p-4 md:w-1/2 md:border-b-0 md:border-r">
              {isPdfUrl(cert.certificate_url) ? (
                <iframe
                  src={cert.certificate_url}
                  title="Certificate preview"
                  className="h-[480px] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={cert.certificate_url}
                  alt="Certificate"
                  className="mx-auto max-h-[480px] w-full rounded-lg border border-slate-200 bg-white object-contain"
                />
              )}
            </div>
          )}

          <div className={`p-6 space-y-5 ${cert.certificate_url ? 'md:w-1/2' : ''}`}>
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
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Customer ID</p>
                <p className="mt-1 text-slate-700">{cert.batch?.role || cert.certificate_serial?.replace(/^[A-Za-z]+-/, '')}</p>
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

            {/* Progress */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</p>
              <BatchProgress
                startDate={cert.batch?.start_date}
                endDate={cert.batch?.end_date}
                certificateDeliveryDate={cert.batch?.certificate_delivery_date}
                issuedAt={cert.issued_at}
              />
            </div>

            {/* Credential ID — the doc ID printed on the certificate itself (QR/verification
                code), not the internal order serial */}
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Credential ID</p>
              <p className="font-mono text-sm font-semibold text-slate-800">{credentialId}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {cert.certificate_url && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {downloading
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />
                    : <Download className="h-4 w-4" />
                  }
                  Download {isPdfUrl(cert.certificate_url) ? 'PDF' : 'Certificate'}
                </button>
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

            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0958a8] transition-colors"
            >
              <Linkedin className="h-4 w-4" />
              Share on LinkedIn
            </a>

            {/* Credential URL */}
            <div className="rounded-lg border border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-400 mb-1">Credential URL</p>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{verifyUrl}</p>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
