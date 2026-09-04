import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Download, FileText, XCircle, Award, Calendar, Clock, Hash, User, Maximize2, X,
} from 'lucide-react'
import { useLazyLookupPublicCertificateQuery } from '../../store/api/publicApi'
import { PublicLayout } from '../../components/layouts/PublicLayout'
import { GreenVerifyIcon, OpenLinkIcon } from '../../components/ui/BrandIcons'
import { Spinner } from '../../components/ui/Spinner'

export default function CertificateDownload() {
  const [query, setQuery] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [trigger, { data: cert, error, isFetching, isUninitialized }] = useLazyLookupPublicCertificateQuery()

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) trigger(q)
  }

  const notFound = error?.status === 404
  const isImage = /\.(jpe?g|png)$/i.test(cert?.download_url || '')

  return (
    <PublicLayout showBackToHome hideFooter mainClassName="bg-gradient-to-br from-slate-50 to-slate-100">
      <div className={`mx-auto px-4 py-6 sm:py-10 ${cert ? 'max-w-5xl' : 'max-w-lg'}`}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Download your certificate</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your registered email address or offer-letter ID to find and download your certificate.
            No account needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="you@example.com  or  BFDA72436"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
          >
            {isFetching ? <Spinner className="h-4 w-4 text-white" /> : <Search className="h-4 w-4" />}
            Find certificate
          </button>
        </form>

        <div className="mt-6">
          {isFetching && (
            <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div>
          )}

          {!isFetching && notFound && (
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-md">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-red-700">No certificate found</h2>
              <p className="mt-2 text-sm text-slate-500">
                We couldn't find a certificate for that email or offer-letter ID. Double-check the spelling,
                or try the other one.
              </p>
            </div>
          )}

          {!isFetching && error && !notFound && (
            <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-md">
              <p className="text-sm text-amber-700">
                {error?.data?.message || 'Something went wrong. Please try again in a moment.'}
              </p>
            </div>
          )}

          {!isFetching && cert && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="flex flex-col md:flex-row">
                <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-6 md:w-1/2 md:border-b-0 md:border-r">
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    {isImage ? (
                      <img src={cert.download_url} alt="Certificate preview" className="w-full" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 bg-white py-12 text-sm text-slate-400">
                        <FileText className="h-8 w-8" />
                        Preview not available — use the buttons below
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm">
                      <GreenVerifyIcon className="h-4 w-4 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-800">Certificate found</p>
                    </div>
                    {isImage && (
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
                      href={cert.download_url}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                    <a
                      href={cert.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open in New Tab <OpenLinkIcon className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="p-4 sm:p-6 md:w-1/2">
                  <div className="mb-4 text-center sm:mb-6">
                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 sm:h-14 sm:w-14">
                      <User className="h-5 w-5 text-primary-600 sm:h-7 sm:w-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{cert.name}</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                      <div className="rounded-lg bg-purple-100 p-2.5"><Hash className="h-5 w-5 text-purple-600" /></div>
                      <div>
                        <p className="text-xs text-slate-500">Offer Letter ID</p>
                        <p className="font-mono font-semibold text-slate-800">{cert.offer_letter_id}</p>
                      </div>
                    </div>
                    {cert.duration && (
                      <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                        <div className="rounded-lg bg-sky-100 p-2.5"><Clock className="h-5 w-5 text-sky-600" /></div>
                        <div>
                          <p className="text-xs text-slate-500">Duration</p>
                          <p className="font-semibold text-slate-800">{cert.duration}</p>
                        </div>
                      </div>
                    )}
                    {cert.issue_date_text && (
                      <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                        <div className="rounded-lg bg-amber-100 p-2.5"><Calendar className="h-5 w-5 text-amber-600" /></div>
                        <div>
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-semibold text-slate-800">{cert.issue_date_text}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 rounded-xl bg-emerald-50 p-4">
                      <div className="rounded-lg bg-emerald-100 p-2.5"><Award className="h-5 w-5 text-emerald-600" /></div>
                      <p className="text-sm font-medium text-emerald-800">
                        This certificate is stored on Validstep and safe to download.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isUninitialized && !isFetching && (
            <p className="mt-8 text-center text-xs text-slate-400">
              Looking to verify someone else's certificate instead?{' '}
              <Link to="/verify/demo" className="text-primary-600 hover:underline">Verify a certificate</Link>
            </p>
          )}
        </div>
      </div>

      {fullscreen && cert && isImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setFullscreen(false)}>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={cert.download_url}
            alt="Certificate full screen"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </PublicLayout>
  )
}
