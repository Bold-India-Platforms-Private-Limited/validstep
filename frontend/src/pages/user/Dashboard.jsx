import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useGetUserCertificatesQuery, useGetUserOrdersQuery, useGetUserProfileQuery, useGetUserDeliveryLogQuery,
} from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { BatchProgress } from '../../components/ui/BatchProgress'
import { formatDate } from '../../utils/formatDate'
import { downloadCertificateFile } from '../../utils/downloadInvoice'
import { Award, ShoppingBag, Download, Eye, User, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const DELIVERY_EVENT_LABELS = {
  PAYMENT_IMPORTED: 'Payment imported',
  BATCH_ASSIGNED: 'Enrolled in batch',
  WELCOME_EMAIL_SENT: 'Login details emailed',
  ENROLLMENT_EMAIL_SENT: 'Enrollment confirmation emailed',
  CERTIFICATE_GENERATED: 'Certificate generated',
  CERTIFICATE_ISSUED_EMAIL_SENT: 'Certificate issued email sent',
  CERTIFICATE_DOWNLOADED: 'Certificate downloaded',
}

export default function UserDashboard() {
  const [downloadingId, setDownloadingId] = useState(null)
  const { data: profile } = useGetUserProfileQuery()
  const { data: certs, isLoading: certsLoading } = useGetUserCertificatesQuery()
  const { data: orders, isLoading: ordersLoading } = useGetUserOrdersQuery()
  const { data: deliveryLog } = useGetUserDeliveryLogQuery()

  const certificates = certs?.certificates || []
  const orderList = orders?.orders || []

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id)
    try {
      const ext = /\.pdf($|\?)/i.test(cert.certificate_url) ? 'pdf' : (cert.certificate_url.match(/\.(\w+)($|\?)/)?.[1] || 'jpg')
      await downloadCertificateFile(cert.id, `certificate-${cert.certificate_serial}.${ext}`)
    } catch (err) {
      toast.error(err.message || 'Failed to download certificate')
    } finally {
      setDownloadingId(null)
    }
  }

  if (certsLoading || ordersLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <User className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome, {profile?.name || 'there'}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 max-md:rounded-2xl">
          <Award className="mb-2 h-5 w-5 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900">{certificates.length}</p>
          <p className="text-xs text-slate-500">Certificates</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 max-md:rounded-2xl">
          <ShoppingBag className="mb-2 h-5 w-5 text-emerald-500" />
          <p className="text-2xl font-bold text-slate-900">{orderList.length}</p>
          <p className="text-xs text-slate-500">Orders</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 max-md:rounded-2xl">
          <ShoppingBag className="mb-2 h-5 w-5 text-amber-500" />
          <p className="text-2xl font-bold text-slate-900">
            {orderList.filter((o) => o.status === 'PENDING').length}
          </p>
          <p className="text-xs text-slate-500">Pending Orders</p>
        </div>
      </div>

      {/* Certificates */}
      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Your Certificates</h2>
        {certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
            <Award className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600">No certificates yet</p>
            <p className="mt-1 text-sm text-slate-400">Your certificates will appear here once issued</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <div key={cert.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md max-md:rounded-2xl max-md:active:bg-slate-50">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{cert.batch?.program?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{cert.batch?.company?.name} &middot; {cert.batch?.name}</p>
                  </div>
                  <StatusBadge status={cert.is_issued ? 'ISSUED' : 'PENDING'} />
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  {formatDate(cert.batch?.start_date)} — {formatDate(cert.batch?.end_date)}
                </p>
                <div className="mb-3">
                  <BatchProgress
                    startDate={cert.batch?.start_date}
                    endDate={cert.batch?.end_date}
                    certificateDeliveryDate={cert.batch?.certificate_delivery_date}
                    issuedAt={cert.issued_at}
                  />
                </div>
                <p className="mb-3 font-mono text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                  {cert.certificate_serial?.replace(/^[A-Za-z]+-/, '')}
                </p>
                <div className="flex gap-2">
                  <Link
                    to={`/dashboard/certificates/${cert.certificate_serial?.replace(/^[A-Za-z]+-/, '')}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                  {cert.certificate_url && (
                    <button
                      onClick={() => handleDownload(cert)}
                      disabled={downloadingId === cert.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {downloadingId === cert.id
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block" />
                        : <Download className="h-3.5 w-3.5" />
                      }
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery timeline */}
      {deliveryLog?.events?.filter((e) => e.event !== 'USER_CREATED').length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-slate-400" />
            Delivery Timeline
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              {(() => {
                const events = deliveryLog.events.filter((e) => e.event !== 'USER_CREATED' && e.event !== 'INVOICE_DOWNLOADED')
                return events.map((e, i) => (
                  <div key={e.id} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500 ring-4 ring-primary-100" />
                      {i < events.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-4 last:pb-0">
                      <p className="text-sm font-medium text-slate-800">{DELIVERY_EVENT_LABELS[e.event] || e.event}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(e.created_at)}
                        {e.order?.batch?.name && ` · ${e.order.batch.name}`}
                      </p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
