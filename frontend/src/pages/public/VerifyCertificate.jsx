import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Award, Building2, Calendar, User,
  Hash, Clock, Shield,
} from 'lucide-react'
import { useVerifyCertificateQuery } from '../../store/api/publicApi'
import { formatDate } from '../../utils/formatDate'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'

export default function VerifyCertificate() {
  const { hash } = useParams()
  const { data, isLoading, error } = useVerifyCertificateQuery(hash)

  if (isLoading) return <PageSpinner />

  // Backend returns { valid, certificate: { serial, holder_name, batch_name, company, issued_at, is_issued, role, start_date, end_date, program_type, program_name } }
  const cert = data?.certificate
  const isValid = data?.valid && cert?.is_issued

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Award className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Certificate Verification</h1>
          <p className="mt-1 text-sm text-slate-500">Powered by Validstep.com</p>
        </div>

        {error || !cert ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-700">Certificate Not Found</h2>
            <p className="mt-2 text-slate-500">
              This certificate does not exist or the verification link is invalid.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
              Return to homepage
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {/* Status banner */}
            <div
              className={`flex items-center gap-3 px-6 py-4 ${
                isValid ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-amber-50 border-b border-amber-100'
              }`}
            >
              {isValid ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">Certificate Verified</p>
                    <p className="text-sm text-emerald-600">This is a genuine certificate</p>
                  </div>
                </>
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

            {/* Certificate details */}
            <div className="p-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                  <User className="h-7 w-7 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{cert.holder_name}</h2>
                <p className="text-slate-500">has successfully completed</p>
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
                    <p className="text-xs text-slate-500">Issued By</p>
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

                {cert.serial && (
                  <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                    <div className="rounded-lg bg-purple-100 p-2.5">
                      <Hash className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Certificate Serial</p>
                      <p className="font-mono font-semibold text-slate-800">{cert.serial}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="h-4 w-4" />
                  Verification ID: {hash?.slice(0, 16)}...
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
          <span className="text-slate-600">{import.meta.env.VITE_APP_URL}</span>
        </p>
      </div>
    </div>
  )
}
