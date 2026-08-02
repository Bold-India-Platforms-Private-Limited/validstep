import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  XCircle, Award, Building2, Calendar, User,
  Hash, Clock, Shield, Download, FileText, Maximize2, X,
} from 'lucide-react'
import { useVerifyCertificateQuery } from '../../store/api/publicApi'
import { formatDate } from '../../utils/formatDate'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { GreenVerifyIcon, OpenLinkIcon } from '../../components/ui/BrandIcons'
import { PublicLayout } from '../../components/layouts/PublicLayout'

export default function VerifyCertificate() {
  const { hash } = useParams()
  const { data, isLoading, error } = useVerifyCertificateQuery(hash)
  const [fullscreen, setFullscreen] = useState(false)

  if (isLoading) {
    return (
      <PublicLayout showBackToHome hideFooter>
        <div className="px-4 py-20">
          <PageSpinner />
        </div>
      </PublicLayout>
    )
  }

  // Backend returns { valid, certificate: { serial, holder_name, batch_name, company, issued_at, is_issued, role, start_date, end_date, program_type, program_name } }
  const cert = data?.certificate
  const isValid = data?.valid && cert?.is_issued
  const isImageCert = /\.(jpe?g|png)$/i.test(cert?.certificate_url || '')
  const hasPreview = isValid && cert?.certificate_url

  const detailsContent = cert && (
    <>
      <div className="mb-4 text-center sm:mb-6">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 sm:mb-3 sm:h-14 sm:w-14">
          <User className="h-5 w-5 text-primary-600 sm:h-7 sm:w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{cert.holder_name}</h2>
        <p className="text-sm text-slate-500 sm:text-base">has successfully completed</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="rounded-lg bg-primary-100 p-2.5">
            <Award className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Program / Batch</p>
            <p className="font-semibold text-slate-800">{cert.batch_name}</p>
            <p className="text-sm text-slate-500">{cert.program_name} ({cert.program_type})</p>
          </div>
        </div>

        {cert.role && (
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
            <div className="rounded-lg bg-indigo-100 p-2.5">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="font-semibold text-slate-800">{cert.role}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="rounded-lg bg-emerald-100 p-2.5">
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Organization Name</p>
            <p className="font-semibold text-slate-800">{cert.company}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <div className="rounded-lg bg-sky-100 p-2">
              <Calendar className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Start Date</p>
              <p className="font-semibold text-slate-800 text-sm">{formatDate(cert.start_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <div className="rounded-lg bg-sky-100 p-2">
              <Calendar className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">End Date</p>
              <p className="font-semibold text-slate-800 text-sm">{formatDate(cert.end_date)}</p>
            </div>
          </div>
        </div>

        {cert.issued_at && (
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Issued On</p>
              <p className="font-semibold text-slate-800">{formatDate(cert.issued_at)}</p>
            </div>
          </div>
        )}

        {cert.certificate_id && (
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
            <div className="rounded-lg bg-purple-100 p-2.5">
              <Hash className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Certificate ID</p>
              <p className="font-mono font-semibold text-slate-800">{cert.certificate_id}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <PublicLayout showBackToHome hideFooter mainClassName="bg-gradient-to-br from-slate-50 to-slate-100">
      <div className={`mx-auto px-4 py-4 sm:py-8 ${hasPreview ? 'max-w-7xl' : 'max-w-xl'}`}>
        {error || !cert ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-md sm:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:h-16 sm:w-16">
              <XCircle className="h-6 w-6 text-red-500 sm:h-8 sm:w-8" />
            </div>
            <h2 className="text-lg font-bold text-red-700 sm:text-xl">Certificate Not Found</h2>
            <p className="mt-2 text-slate-500">
              This certificate does not exist or the verification link is invalid.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
              Return to homepage
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {/* Status banner — only shown when there's no certificate preview to overlay it onto */}
            {!hasPreview && (
              <div
                className={`flex items-center gap-3 px-6 py-4 ${
                  isValid ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-amber-50 border-b border-amber-100'
                }`}
              >
                {isValid ? (
                  <div className="flex items-center gap-3">
                    <GreenVerifyIcon className="h-6 w-6" />
                    <div>
                      <p className="font-semibold text-emerald-800">Certificate Verified</p>
                      <p className="text-sm text-emerald-600">This is a valid certificate</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800">Certificate Pending</p>
                      <p className="text-sm text-amber-600">This certificate has not been issued yet</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {hasPreview ? (
              // Desktop: certificate on the left, details card on the right. Mobile: stacked,
              // certificate on top, details below.
              <div className="flex flex-col md:flex-row">
                <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-6 md:w-1/2 md:border-b-0 md:border-r">
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    {isImageCert ? (
                      <img
                        src={cert.certificate_url}
                        alt="Certificate preview"
                        className="w-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 bg-white py-12 text-sm text-slate-400">
                        <FileText className="h-8 w-8" />
                        Preview not available for this file type — use the buttons below
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm">
                      <GreenVerifyIcon className="h-4 w-4 shrink-0" />
                      <div className="leading-tight">
                        <p className="text-xs font-semibold text-emerald-800">Certificate Verified</p>
                        <p className="text-[10px] text-emerald-600">This is a valid certificate</p>
                      </div>
                    </div>
                    {isImageCert && (
                      <button
                        type="button"
                        onClick={() => setFullscreen(true)}
                        className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-white"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Full Screen</span>
                      </button>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={cert.certificate_url}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                    <a
                      href={cert.certificate_url}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Open in New Tab <OpenLinkIcon className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="p-4 sm:p-6 md:w-1/2">{detailsContent}</div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">{detailsContent}</div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="h-4 w-4" />
                  Verification ID: {hash?.length > 16 ? `${hash.slice(0, 16)}...` : hash}
                </div>
                <Badge variant={isValid ? 'success' : 'warning'} dot>
                  {isValid ? 'VERIFIED' : 'PENDING'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Verify the authenticity at{' '}
          <span className="text-slate-600">{window.location.origin}</span>
        </p>
      </div>

      {fullscreen && hasPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={cert.certificate_url}
            alt="Certificate full screen"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </PublicLayout>
  )
}
