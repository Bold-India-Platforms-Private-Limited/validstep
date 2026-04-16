import { useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  Award, Download, Clock, CheckCircle2, XCircle, Calendar,
  Building2, FileText, AlertCircle, ExternalLink, Receipt,
  CreditCard, Hash, Shield, X, Bell, MailCheck, PartyPopper,
} from 'lucide-react'
import { useGetUserOrdersQuery, useGetUserPaymentsQuery } from '../../store/api/userApi'
import { selectCurrentUser } from '../../store/authSlice'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PaymentStatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs } from '../../components/ui/Tabs'
import { formatDate } from '../../utils/formatDate'
import axiosClient from '../../api/axiosClient'
import { isBefore, parseISO } from 'date-fns'

const TABS = [
  { key: 'certificates', label: 'My Certificates', icon: Award },
  { key: 'payments', label: 'Payment History', icon: CreditCard },
]

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

const paymentStatusColors = {
  SUCCESS:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  INITIATED:'bg-slate-50 text-slate-600 border-slate-200',
  FAILURE:  'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-amber-50 text-amber-700 border-amber-200',
}

/* ─── Notification Alerts ─────────────────────────────────────── */
function NotificationBanner({ order, onDismiss }) {
  const isIssued = order.certificate?.is_issued
  const isPaid   = order.status === 'PAID'
  const batchName = order.batch?.name || 'your batch'
  const companyName = order.batch?.company?.name
  const verifyHash = order.certificate?.verification_hash
  const verifyUrl = verifyHash
    ? `${import.meta.env.VITE_APP_URL}/verify/${verifyHash}`
    : null
  const endDate = order.batch?.end_date

  if (!isPaid) return null

  if (isIssued) {
    return (
      <div className="relative flex items-start gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 shadow-sm">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-sm">
          <PartyPopper className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-900 leading-tight">
            🎉 Your certificate has been issued!
          </p>
          <p className="mt-0.5 text-sm text-emerald-700">
            <span className="font-medium">{batchName}</span>
            {companyName && <span className="text-emerald-600"> · {companyName}</span>}
          </p>
          {order.certificate?.issued_at && (
            <p className="mt-0.5 text-xs text-emerald-600">
              Issued on {formatDateTime(order.certificate.issued_at)}
            </p>
          )}
          {verifyUrl && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Shield className="h-3.5 w-3.5" />
                View &amp; Verify Certificate
              </a>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Share Link
              </a>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => onDismiss(order.certificate.id)}
          className="flex-shrink-0 rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Paid but not yet issued
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 shadow-sm">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-sm">
        <MailCheck className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-900 leading-tight">
          Certificate being prepared
        </p>
        <p className="mt-0.5 text-sm text-blue-700">
          <span className="font-medium">{batchName}</span>
          {companyName && <span className="text-blue-600"> · {companyName}</span>}
        </p>
        <p className="mt-1 text-sm text-blue-800">
          You will receive your certificate via email by{' '}
          <span className="font-semibold">
            {endDate ? `end of program (${formatDate(endDate)})` : 'end of the program'}
          </span>.
        </p>
        <p className="mt-1 text-xs text-blue-500">
          Serial: <span className="font-mono">{order.certificate_serial}</span>
        </p>
      </div>
      <div className="flex-shrink-0">
        <Clock className="h-5 w-5 text-blue-400" />
      </div>
    </div>
  )
}

/* ─── Main Dashboard ──────────────────────────────────────────── */
export default function UserDashboard() {
  const user = useSelector(selectCurrentUser)
  const [activeTab, setActiveTab] = useState('certificates')
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState(null)

  // Dismissed certificate notifications tracked in localStorage
  const [dismissedNotifs, setDismissedNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_cert_notifs') || '[]')
    } catch { return [] }
  })

  // Poll every 30 s so issued-certificate alerts appear automatically
  const { data: ordersData, isLoading } = useGetUserOrdersQuery(
    undefined,
    { pollingInterval: 30_000 },
  )
  const { data: paymentsData, isLoading: paymentsLoading } = useGetUserPaymentsQuery(
    {},
    { skip: activeTab !== 'payments' },
  )

  const orders  = ordersData?.orders  || []
  const payments = paymentsData?.payments || []

  const dismissNotif = (certId) => {
    const updated = [...dismissedNotifs, certId]
    setDismissedNotifs(updated)
    localStorage.setItem('dismissed_cert_notifs', JSON.stringify(updated))
  }

  // Build notification list from paid orders
  const notificationOrders = orders.filter((order) => {
    if (order.status !== 'PAID') return false
    if (order.certificate?.is_issued) {
      // Show issued alert only if not dismissed
      return !dismissedNotifs.includes(order.certificate?.id)
    }
    // Always show "awaiting" alert for paid+not-issued
    return true
  })

  // Sort: issued first, then awaiting
  const sortedNotifs = [...notificationOrders].sort((a, b) => {
    if (a.certificate?.is_issued && !b.certificate?.is_issued) return -1
    if (!a.certificate?.is_issued && b.certificate?.is_issued) return 1
    return 0
  })

  const handleDownload = async (certId, certSerial) => {
    setDownloadingId(certId)
    try {
      const response = await axiosClient.get(`/user/certificates/${certId}/download`, { responseType: 'blob' })
      const contentType = response.headers?.['content-type'] || ''
      if (contentType.includes('application/pdf')) {
        const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `certificate-${certSerial || certId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Certificate downloaded!')
      } else {
        toast.error('Certificate PDF not ready yet. Please try again later.')
      }
    } catch {
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDownloadInvoice = async (orderId, serial) => {
    setDownloadingInvoice(orderId)
    try {
      const response = await axiosClient.get(`/user/orders/${orderId}/invoice`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${serial || orderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Invoice downloaded!')
    } catch {
      toast.error('Invoice download failed.')
    } finally {
      setDownloadingInvoice(null)
    }
  }

  const handleRetryPayment = async (batchId) => {
    try {
      const payRes = await axiosClient.post('/payment/initiate', { batch_id: batchId })
      const { paymentUrl, payuParams } = payRes.data?.data ?? payRes.data
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = paymentUrl
      Object.entries(payuParams).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch {
      toast.error('Could not initiate payment')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back, <strong>{user?.name}</strong></p>
        </div>
        {sortedNotifs.length > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
            <Bell className="h-3.5 w-3.5" />
            {sortedNotifs.length} notification{sortedNotifs.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Notification Banners ────────────────────────────────── */}
      {sortedNotifs.length > 0 && (
        <div className="space-y-3">
          {sortedNotifs.map((order) => (
            <NotificationBanner
              key={order.id}
              order={order}
              onDismiss={dismissNotif}
            />
          ))}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* ── Certificates Tab ─────────────────────────────────────── */}
      {activeTab === 'certificates' && (
        <>
          {orders.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No certificates yet"
              description="Use a batch enrollment link from your company to get started."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {orders.map((order) => {
                const isIssued  = order.certificate?.is_issued
                const isPaid    = order.status === 'PAID'
                const isFailed  = order.status === 'FAILED'
                const isPending = order.status === 'PENDING'
                const batchEndDate = order.batch?.end_date ? parseISO(order.batch.end_date) : null
                const isBatchEnded = batchEndDate ? isBefore(batchEndDate, new Date()) : false
                const canDownload = isIssued && isPaid
                const verifyUrl = order.certificate?.verification_hash
                  ? `${import.meta.env.VITE_APP_URL}/verify/${order.certificate.verification_hash}`
                  : null

                return (
                  <Card key={order.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-4 py-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
                            <Award className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{order.batch?.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              <p className="text-xs text-slate-500">{order.batch?.company?.name}</p>
                            </div>
                          </div>
                        </div>
                        <PaymentStatusBadge status={order.status} />
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        {order.batch?.program?.type && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                            <span>
                              {order.batch.program.type === 'INTERNSHIP'
                                ? `Internship / Fellowship${order.batch.role ? ` — ${order.batch.role}` : ''}`
                                : order.batch.program.type === 'HACKATHON' ? 'Hackathon'
                                : order.batch.program.type}
                            </span>
                          </div>
                        )}
                        {order.batch?.start_date && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                            <span>{formatDate(order.batch.start_date)} — {formatDate(order.batch.end_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {order.certificate_serial}
                          </span>
                        </div>
                      </div>

                      {/* Status notice */}
                      <div className="mt-auto space-y-2">
                        {isPaid && isIssued && (
                          <>
                            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-emerald-800">Certificate Issued</p>
                                {order.certificate?.issued_at && (
                                  <p className="text-xs text-emerald-600">
                                    {formatDateTime(order.certificate.issued_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {verifyUrl && (
                              <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                                <p className="text-xs font-medium text-primary-800 mb-1 flex items-center gap-1">
                                  <Shield className="h-3 w-3" /> Verification Link
                                </p>
                                <a
                                  href={verifyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary-600 hover:underline break-all"
                                >
                                  {verifyUrl}
                                </a>
                              </div>
                            )}
                          </>
                        )}
                        {isPaid && !isIssued && (
                          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <MailCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <p className="text-xs font-medium text-blue-800">
                                You will receive your certificate via email by end of program
                              </p>
                            </div>
                            {!isBatchEnded && batchEndDate && (
                              <p className="mt-1 ml-6 text-xs text-blue-500">
                                Expected: {formatDate(order.batch.end_date)}
                              </p>
                            )}
                          </div>
                        )}
                        {isFailed && (
                          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <p className="text-xs font-medium text-red-800">Payment Failed</p>
                          </div>
                        )}
                        {isPending && (
                          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                            <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <p className="text-xs font-medium text-slate-600">Payment Pending</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {canDownload && (
                          <Button
                            size="sm"
                            className="flex-1"
                            isLoading={downloadingId === order.certificate?.id}
                            onClick={() => handleDownload(order.certificate.id, order.certificate_serial)}
                            leftIcon={<Download className="h-4 w-4" />}
                          >
                            Download PDF
                          </Button>
                        )}
                        {verifyUrl && (
                          <a
                            href={verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Verify
                          </a>
                        )}
                        {isPaid && (
                          <button
                            onClick={() => handleDownloadInvoice(order.id, order.certificate_serial)}
                            disabled={downloadingInvoice === order.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            <Receipt className="h-4 w-4" />
                            Invoice
                          </button>
                        )}
                        {!isPaid && !isFailed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRetryPayment(order.batch_id)}
                          >
                            Pay Now
                          </Button>
                        )}
                        {isFailed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRetryPayment(order.batch_id)}
                          >
                            Retry Payment
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Payment History Tab ──────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {paymentsLoading ? (
            <PageSpinner />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Your payment history will appear here after your first transaction."
            />
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const order = payment.order
                const statusClass = paymentStatusColors[payment.status] || paymentStatusColors.INITIATED
                return (
                  <Card key={payment.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            payment.status === 'SUCCESS'
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}>
                            {payment.status === 'SUCCESS'
                              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              : payment.status === 'FAILURE'
                              ? <XCircle className="h-5 w-5 text-red-400" />
                              : <Clock className="h-5 w-5 text-slate-400" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {order?.batch?.name || 'Certificate Order'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {order?.batch?.company?.name} · Serial:{' '}
                              <span className="font-mono">{order?.certificate_serial || '—'}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatDateTime(payment.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-800">
                              ₹{Number(payment.amount).toLocaleString('en-IN')}
                            </p>
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                              {payment.status}
                            </span>
                          </div>
                          {payment.status === 'SUCCESS' && order && (
                            <button
                              onClick={() => handleDownloadInvoice(order.id, order.certificate_serial)}
                              disabled={downloadingInvoice === order.id}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              <Receipt className="h-4 w-4" />
                              Invoice
                            </button>
                          )}
                          {order?.certificate?.verification_hash && (
                            <a
                              href={`${import.meta.env.VITE_APP_URL}/verify/${order.certificate.verification_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Verify
                            </a>
                          )}
                        </div>
                      </div>

                      {payment.payu_txn_id && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <p className="text-xs text-slate-400">
                            Transaction ID:{' '}
                            <span className="font-mono text-slate-600">{payment.payu_txn_id}</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
