import { useEffect, useRef, useState } from 'react'
import {
  useGetAdminOrderLogQuery, useGetAdminOrderDetailQuery, useResolveAdminQueryMutation, useGetAdminCompaniesQuery, useGetAdminBatchesQuery,
  useResendUserPasswordMutation, useResendCertificateEmailMutation, usePreviewCertificateEmailMutation, useUploadAdminCertificateMutation, useGetAdminWhoamiQuery,
  useGetCertificateBadgeConfigQuery, useUpdateCertificateBadgeConfigMutation, usePreviewCertificateBadgeMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { GreenVerifyIcon, OpenLinkIcon } from '../../components/ui/BrandIcons'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF, getInvoicePreviewUrl } from '../../utils/downloadInvoice'
import {
  ClipboardList, Search, Eye, EyeOff, FileText, ShieldCheck, MessageSquareText, KeyRound, Send, Award,
  Calendar, Building2, Wallet, ShieldQuestion, MessageCircle, Sparkles, FolderOpen, Lock, UploadCloud,
} from 'lucide-react'
import toast from 'react-hot-toast'

const DAY_MS = 24 * 60 * 60 * 1000

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`
}

function maskPhone(phone) {
  if (!phone) return ''
  const visible = phone.slice(-2)
  return `${'*'.repeat(Math.max(phone.length - visible.length, 3))}${visible}`
}

function DurationProgress({ startDate, endDate, certificateDeliveryDate }) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS))
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((now - start) / DAY_MS)))
  const pct = Math.round((elapsedDays / totalDays) * 100)
  const remainingDays = totalDays - elapsedDays
  const status = now < start ? 'Not started' : now > end ? 'Duration complete' : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{pct}%</span>
        <span className="text-xs font-medium text-slate-500">Day {elapsedDays} of {totalDays}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
        <span>{status}</span>
        <span>Delivery: {formatDate(certificateDeliveryDate || endDate)}</span>
      </div>
    </div>
  )
}

const EVENT_LABELS = {
  PAYMENT_IMPORTED: 'Payment imported',
  USER_CREATED: 'Account created',
  BATCH_ASSIGNED: 'Order created / enrolled in batch',
  WELCOME_EMAIL_SENT: 'Login details emailed to customer',
  ENROLLMENT_EMAIL_SENT: 'Enrollment confirmation emailed',
  SYSTEM_PASSWORD_SENT: 'Login email sent to customer',
  CERTIFICATE_GENERATED: 'Certificate generated',
  CERTIFICATE_ISSUED_EMAIL_SENT: 'Certificate email sent to customer',
  CERTIFICATE_DOWNLOADED: 'Certificate downloaded by customer',
  INVOICE_DOWNLOADED: 'Invoice downloaded by customer',
  CERTIFICATE_UPLOADED_BY_ADMIN: 'Certificate uploaded by admin',
}

// Payment, order creation, account creation, and batch enrollment are folded into one fixed
// flow (see Order Timeline below) — always shown together, all dated to the payment date.
const CORE_FLOW_LABELS = ['Payment Received', 'Order Created', 'Account Created', 'Enrolled in Batch']
const CORE_FLOW_EVENT_TYPES = new Set(['PAYMENT_IMPORTED', 'USER_CREATED', 'BATCH_ASSIGNED'])

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'send-certificate', label: 'Send Certificate' },
  { key: 'background-verification', label: 'Background Verification Requests', comingSoon: true, icon: ShieldQuestion, restricted: true },
  { key: 'organizer-update', label: 'Update From Organizer', comingSoon: true, icon: MessageCircle, restricted: true },
]

function ComingSoonPanel({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
        {Icon ? <Icon className="h-6 w-6 text-violet-500" /> : <Sparkles className="h-6 w-6 text-violet-500" />}
      </div>
      <p className="font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-sm text-slate-400">No Update.</p>
    </div>
  )
}

function RestrictedPanel({ label }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
        <Lock className="h-6 w-6 text-amber-600" />
      </div>
      <p className="font-medium text-amber-800">{label}</p>
      <p className="mt-1 max-w-xs text-sm text-amber-700">This data is sensitive and not available for the Dummy Admin Account.</p>
    </div>
  )
}

function OrderDetailModal({ orderId, onClose }) {
  const { data, isLoading } = useGetAdminOrderDetailQuery(orderId, { skip: !orderId })
  const { data: whoami } = useGetAdminWhoamiQuery()
  const isReview = whoami?.access_level === 'review'
  const [resolveQuery, { isLoading: resolving }] = useResolveAdminQueryMutation()
  const [resendPassword, { isLoading: sendingPassword }] = useResendUserPasswordMutation()
  const [resendCertEmail, { isLoading: sendingCertEmail }] = useResendCertificateEmailMutation()
  const [previewCertEmail, { isLoading: loadingEmailPreview }] = usePreviewCertificateEmailMutation()
  const [uploadCertificate, { isLoading: uploadingCertificate }] = useUploadAdminCertificateMutation()
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [adjustFile, setAdjustFile] = useState(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailPreview, setEmailPreview] = useState(null)
  const [showContact, setShowContact] = useState(false)
  const [useCustomEmail, setUseCustomEmail] = useState(false)
  const fileInputRef = useRef(null)

  const order = data?.order
  const events = data?.events || []
  const otherEvents = events.filter((e) => !CORE_FLOW_EVENT_TYPES.has(e.event))
  const queries = data?.queries || []

  useEffect(() => {
    setTab('overview')
    setUploadResult(null)
    setEmailPreview(null)
    setShowContact(false)
    setUseCustomEmail(false)
  }, [orderId])

  useEffect(() => {
    if (order?.user?.email && !useCustomEmail) setEmailTo(order.user.email)
  }, [order?.user?.email, useCustomEmail])

  const handleDownloadInvoice = async () => {
    if (!order) return
    setDownloading(true)
    try {
      await downloadInvoicePDF('admin', order.id, `invoice-${order.certificate_serial}.pdf`)
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice')
    } finally {
      setDownloading(false)
    }
  }

  const handleViewInvoice = async () => {
    if (!order) return
    // Open the tab synchronously (within the click gesture) so popup blockers allow it,
    // then redirect it once the PDF blob is ready.
    const newTab = window.open('', '_blank', 'noopener,noreferrer')
    setLoadingPreview(true)
    try {
      const url = await getInvoicePreviewUrl('admin', order.id)
      if (newTab) newTab.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (newTab) newTab.close()
      toast.error(err.message || 'Failed to load invoice')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleResolve = async (queryId) => {
    try {
      await resolveQuery(queryId).unwrap()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update query')
    }
  }

  const handleSendLoginEmail = async () => {
    if (!order?.user?.id) return
    try {
      await resendPassword(order.user.id).unwrap()
      toast.success(`Login email sent to ${order.user.email}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send login email')
    }
  }

  const handleSendCertificateEmail = async () => {
    if (!order?.id) return
    try {
      const result = await resendCertEmail({ orderId: order.id, to: emailTo }).unwrap()
      toast.success(`Certificate email sent to ${result?.sentTo || emailTo}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send certificate email')
    }
  }

  const handlePreviewCertificateEmail = async () => {
    if (!order?.id) return
    try {
      const result = await previewCertEmail(order.id).unwrap()
      setEmailPreview(result)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to load email preview')
    }
  }

  const handleCertificateFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file || !order?.id) return
    if (file.type === 'application/pdf') {
      // PDF: no live raster preview available — upload immediately with the current saved default badge position/size.
      const formData = new FormData()
      formData.append('certificate', file)
      try {
        const result = await uploadCertificate({ orderId: order.id, formData }).unwrap()
        setUploadResult(result)
        toast.success('Certificate uploaded and branded')
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to upload certificate')
      }
      return
    }
    // Image: open the adjustable live-preview modal instead of uploading immediately.
    setAdjustFile(file)
  }

  const orderCreatedDate = order?.payments?.[0]?.created_at || order?.created_at

  const headerContent = order && (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="truncate text-base font-semibold text-slate-900">{order.user?.name}</p>
      <p className="truncate text-xs text-slate-500">
        {showContact ? order.user?.email : maskEmail(order.user?.email)}
      </p>
      {order.user?.phone && (
        <p className="text-xs text-slate-500">
          {showContact ? order.user.phone : maskPhone(order.user.phone)}
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowContact((v) => !v)}
        title={showContact ? 'Hide contact details' : 'Show contact details'}
        className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600"
      >
        {showContact ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <p className="font-mono text-xs text-slate-400">{order.certificate_serial}</p>
      <StatusBadge status={order.status} />
      <button
        onClick={handleViewInvoice}
        disabled={loadingPreview}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Eye className="h-3.5 w-3.5" />
        {loadingPreview ? 'Loading…' : 'View Invoice'}
      </button>
      <button
        onClick={handleDownloadInvoice}
        disabled={downloading}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <FileText className="h-3.5 w-3.5" />
        {downloading ? 'Downloading…' : 'Download Invoice'}
      </button>
    </div>
  )

  const uploadedIsImage = /\.(jpe?g|png)$/i.test(uploadResult?.certificate_url || '')

  return (
    <>
    <Modal open={!!orderId} onClose={onClose} title="Order Detail" headerContent={headerContent} size="wide">
      {isLoading || !order ? (
        <div className="py-16"><PageSpinner /></div>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map((t) => {
              const blocked = t.restricted && isReview
              return (
                <button
                  key={t.key}
                  onClick={() => !blocked && setTab(t.key)}
                  disabled={blocked}
                  title={blocked ? 'This data is sensitive and not available for the Dummy Admin Account' : undefined}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${blocked ? 'cursor-not-allowed text-slate-300' : tab === t.key ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {blocked && <Lock className="h-3 w-3" />}
                  {t.label}
                </button>
              )
            })}
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Building2 className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization / Program / Batch</p>
                  </div>
                  <p className="mt-3 truncate text-base font-semibold text-slate-900">{order.company?.name}</p>
                  <p className="text-sm text-slate-500">{order.batch?.program?.name} · {order.batch?.name}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</p>
                      <p className="text-sm font-medium text-slate-800">{formatDate(order.batch?.start_date)} — {formatDate(order.batch?.end_date)}</p>
                    </div>
                  </div>
                  <DurationProgress
                    startDate={order.batch?.start_date}
                    endDate={order.batch?.end_date}
                    certificateDeliveryDate={order.batch?.certificate_delivery_date}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <Wallet className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(order.amount)}</p>
                  <p className="text-sm text-slate-500">
                    {order.is_manual_enrollment ? 'Manual enrollment' : (order.payments?.[0] ? `${formatDate(order.payments[0].created_at)} · ${order.payments[0].payu_txn_id || order.payu_txn_id || '—'}` : '—')}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {/* Timeline */}
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <ClipboardList className="h-4 w-4 text-slate-400" />
                      Order Timeline
                    </h3>
                    <button
                      onClick={handleSendLoginEmail}
                      disabled={sendingPassword}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {sendingPassword ? 'Sending…' : 'Send Login Email'}
                    </button>
                  </div>
                  <div>
                    {/* Payment, order creation, account creation, and batch enrollment all
                        happen together at import time — shown as one flow, all dated to the
                        payment date, rather than each DeliveryEvent's own insert timestamp
                        (which can trail the actual payment by days on a bulk/imported order). */}
                    {[
                      ...CORE_FLOW_LABELS.map((label) => ({ key: label, label, date: orderCreatedDate })),
                      ...otherEvents.map((e) => ({ key: e.id, label: EVENT_LABELS[e.event] || e.event, date: e.created_at })),
                    ].map((item, i, arr) => (
                      <div key={item.key} className="relative flex items-start gap-3 pb-3.5 last:pb-0">
                        {i < arr.length - 1 && (
                          <div className="absolute left-[3px] top-3 bottom-0 w-0.5 -ml-px bg-primary-200" />
                        )}
                        <div className="relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500 ring-4 ring-white" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400">{formatDate(item.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification + Queries */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      Certificate Verification
                    </h3>
                    <p className="text-xl font-bold text-slate-900">{data.verification_count}</p>
                    <p className="text-xs text-slate-500">Total verification requests received for this certificate</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <FolderOpen className="h-4 w-4 text-slate-400" />
                      Document Wallet
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-slate-300">—</p>
                      <Badge variant="default">0</Badge>
                    </div>
                    <p className="text-xs text-slate-500">Number of documents this customer has stored in the Validstep web app</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <MessageSquareText className="h-4 w-4 text-slate-400" />
                      Customer Queries
                    </h3>
                    {queries.length === 0 ? (
                      <p className="text-xs text-slate-400">No queries or correction requests raised.</p>
                    ) : (
                      <div className="space-y-3">
                        {queries.map((q) => (
                          <div key={q.id} className="rounded-lg border border-slate-100 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-800">{q.subject}</p>
                              <Badge variant={q.status === 'OPEN' ? 'warning' : 'success'}>{q.status}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{q.message}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-xs text-slate-400">{formatDate(q.created_at)}</p>
                              <button
                                onClick={() => handleResolve(q.id)}
                                disabled={resolving}
                                className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                              >
                                Mark as {q.status === 'OPEN' ? 'Resolved' : 'Open'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'certificate' && (
            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Award className="h-4 w-4 text-slate-400" />
                Certificate
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <p className="mt-1 flex items-center gap-1.5">
                    <Badge variant={order.certificate?.is_issued ? 'success' : 'warning'}>{order.certificate?.is_issued ? 'Issued' : 'Not Issued'}</Badge>
                    {order.certificate?.certificate_source === 'ADMIN_UPLOADED' && <Badge variant="info">Admin Uploaded</Badge>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Serial</p>
                  <p className="mt-1 font-mono text-sm text-slate-800">{order.certificate_serial}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Issued On</p>
                  <p className="mt-1 text-sm text-slate-800">{formatDate(order.certificate?.issued_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verification Link</p>
                  {(() => {
                    const verifyId = order.certificate?.verification_code || order.certificate?.verification_hash
                    return verifyId ? (
                      <a
                        href={`${window.location.origin}/verify/${verifyId}`}
                        target="_blank" rel="noreferrer"
                        className="mt-1 block truncate text-sm text-primary-600 hover:underline"
                      >
                        /verify/{verifyId}
                      </a>
                    ) : <p className="mt-1 text-sm text-slate-400">—</p>
                  })()}
                </div>
              </div>
              {order.certificate?.certificate_url && (
                <a
                  href={order.certificate.certificate_url}
                  target="_blank" rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Certificate
                </a>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <UploadCloud className="h-4 w-4 text-slate-400" />
                  Upload Custom Certificate
                </h4>
                <p className="mb-3 text-sm text-slate-500">
                 Upload only the organization-approved certificate design prepared by the Validstep Design Team (Adobe Photoshop). Supported formats: JPG, PNG, or PDF. Validstep will securely apply its digital verification badge, QR code, and unique Certificate ID, store the certificate securely, and publish it with a public verification page for instant authenticity verification.
                </p>
                {isReview ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <Lock className="h-3.5 w-3.5" /> View only — This Admin Account cannot upload certificates.
                  </p>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={handleCertificateFileSelected}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingCertificate}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <UploadCloud className="h-4 w-4" />
                      {uploadingCertificate ? 'Uploading…' : 'Upload Custom Certificate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'send-certificate' && (
            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Send className="h-4 w-4 text-slate-400" />
                Send Certificate
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                {order.certificate?.is_issued
                  ? 'Email the issued certificate — the certificate file is attached. By default it goes to the customer\'s account email (useful if the original notification bounced or the customer asks for it again).'
                  : 'This certificate has not been issued yet — issue it from the batch\'s Certificates screen first.'}
              </p>
              {isReview && (
                <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Lock className="h-3.5 w-3.5" /> View only — This Admin Account cannot send certificate emails.
                </p>
              )}
              {order.certificate?.is_issued && !isReview && (
                <div className="mb-4 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Send to</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="sendToMode"
                        checked={!useCustomEmail}
                        onChange={() => { setUseCustomEmail(false); setEmailTo(order.user?.email || '') }}
                      />
                      Customer Account Associated Email
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="sendToMode"
                        checked={useCustomEmail}
                        onChange={() => { setUseCustomEmail(true); setEmailTo('') }}
                      />
                      A different email, just for this delivery
                    </label>
                  </div>
                  {useCustomEmail && (
                    <>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="Enter email address"
                        autoFocus
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
                      />
                      <p className="text-xs text-amber-600">
                        This only changes where this one email goes — the customer's account email is not changed.
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePreviewCertificateEmail}
                  disabled={loadingEmailPreview || !order.certificate?.is_issued}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  {loadingEmailPreview ? 'Loading…' : 'Preview Email'}
                </button>
                <button
                  onClick={handleSendCertificateEmail}
                  disabled={sendingCertEmail || !order.certificate?.is_issued || isReview || !emailTo}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sendingCertEmail ? 'Sending…' : 'Send Certificate Email'}
                </button>
              </div>
            </div>
          )}

          {TABS.find((t) => t.key === tab)?.comingSoon && (
            TABS.find((t) => t.key === tab)?.restricted && isReview
              ? <RestrictedPanel label={TABS.find((t) => t.key === tab)?.label} />
              : <ComingSoonPanel icon={TABS.find((t) => t.key === tab)?.icon} label={TABS.find((t) => t.key === tab)?.label} />
          )}
        </div>
      )}
    </Modal>

    <Modal open={!!uploadResult} onClose={() => setUploadResult(null)} title="Certificate Uploaded">
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <GreenVerifyIcon className="h-4 w-4" />
          Branded and published — the student can already see this in their dashboard.
        </div>
        {uploadedIsImage ? (
          <img src={uploadResult?.certificate_url} alt="Branded certificate preview" className="w-full rounded-xl border border-slate-200" />
        ) : (
          <a
            href={uploadResult?.certificate_url}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm font-medium text-primary-600 hover:bg-slate-100"
          >
            <FileText className="h-4 w-4" /> Open Certificate PDF
          </a>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verification Link</p>
          <a
            href={uploadResult?.verify_url}
            target="_blank" rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
          >
            /verify/{uploadResult?.verification_code} <OpenLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Modal>

    {adjustFile && (
      <CertificateBadgeAdjustModal
        file={adjustFile}
        orderId={order?.id}
        onClose={() => setAdjustFile(null)}
        onConfirmed={(result) => {
          setAdjustFile(null)
          setUploadResult(result)
          toast.success('Certificate uploaded and branded')
        }}
      />
    )}

    <Modal open={!!emailPreview} onClose={() => setEmailPreview(null)} title="Certificate Email Preview" size="wide">
      {emailPreview && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
            <p><span className="text-slate-400">To:</span> <span className="font-medium text-slate-700">{emailTo || emailPreview.defaultTo}</span></p>
            <p><span className="text-slate-400">Subject:</span> <span className="font-medium text-slate-700">{emailPreview.subject}</span></p>
          </div>
          <iframe
            title="Certificate email preview"
            srcDoc={emailPreview.html}
            className="h-[600px] w-full rounded-lg border border-slate-200 bg-white"
          />
        </div>
      )}
    </Modal>
    </>
  )
}

function CertificateBadgeAdjustModal({ file, orderId, onClose, onConfirmed }) {
  const { data: savedConfig } = useGetCertificateBadgeConfigQuery()
  const [previewBadge, { isLoading: previewing }] = usePreviewCertificateBadgeMutation()
  const [uploadCertificate, { isLoading: uploading }] = useUploadAdminCertificateMutation()
  const [saveBadgeDefault, { isLoading: savingDefault }] = useUpdateCertificateBadgeConfigMutation()
  const [x, setX] = useState(3)
  const [y, setY] = useState(96)
  const [scale, setScale] = useState(100)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (savedConfig) {
      setX(savedConfig.x)
      setY(savedConfig.y)
      setScale(savedConfig.scale)
    }
  }, [savedConfig])

  // Debounced live preview — re-sends the file bytes each time (accepted simplicity trade-off
  // for this admin-only tool, no temp-file/session caching).
  useEffect(() => {
    if (!file) return
    const timer = setTimeout(async () => {
      const formData = new FormData()
      formData.append('certificate', file)
      formData.append('x', x)
      formData.append('y', y)
      formData.append('scale', scale)
      try {
        const result = await previewBadge(formData).unwrap()
        setPreviewUrl(result.preview)
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to render preview')
      }
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, x, y, scale])

  const handleConfirm = async () => {
    if (!orderId) return
    const formData = new FormData()
    formData.append('certificate', file)
    formData.append('x', x)
    formData.append('y', y)
    formData.append('scale', scale)
    try {
      const result = await uploadCertificate({ orderId, formData }).unwrap()
      onConfirmed(result)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to upload certificate')
    }
  }

  const handleReset = () => {
    if (!savedConfig) return
    setX(savedConfig.x)
    setY(savedConfig.y)
    setScale(savedConfig.scale)
  }

  const handleSaveDefault = async () => {
    try {
      await saveBadgeDefault({ x, y, scale }).unwrap()
      toast.success('Saved as the default badge position/size')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save default')
    }
  }

  return (
    <Modal open={!!file} onClose={onClose} title="Adjust Certificate Badge" size="wide">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="relative flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2">
          {previewUrl ? (
            <img src={previewUrl} alt="Badge preview" className="max-h-[70vh] w-auto rounded-lg" />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Rendering preview…</div>
          )}
          {previewing && (
            <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm">Updating…</div>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Horizontal Position (%)</label>
            <input type="range" min="0" max="97" value={x}
              onChange={(e) => setX(+e.target.value)}
              className="w-full h-1.5 accent-primary-600" />
            <span className="text-xs text-slate-400">{x}%</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Vertical Position (%)</label>
            <input type="range" min="3" max="100" value={y}
              onChange={(e) => setY(+e.target.value)}
              className="w-full h-1.5 accent-primary-600" />
            <span className="text-xs text-slate-400">{y}%</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Badge Size</label>
            <input type="range" min="40" max="200" value={scale}
              onChange={(e) => setScale(+e.target.value)}
              className="w-full h-1.5 accent-primary-600" />
            <span className="text-xs text-slate-400">{scale}%</span>
          </div>
          <button type="button" onClick={handleReset} className="text-xs text-primary-600 hover:underline">
            Reset to default
          </button>
          <button
            type="button"
            onClick={handleSaveDefault}
            disabled={savingDefault}
            className="w-full rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          >
            {savingDefault ? 'Saving…' : 'Save as Default'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading || !previewUrl}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Confirm & Upload'}
          </button>
          <p className="text-xs text-slate-400">Confirming an upload always saves these settings as the default too — use "Save as Default" to update the default without uploading.</p>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminOrderLog() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detailOrderId, setDetailOrderId] = useState(null)
  const { data, isLoading } = useGetAdminOrderLogQuery({
    page, limit,
    ...(search && { search }),
    ...(status && { status }),
    ...(companyFilter && { company_id: companyFilter }),
    ...(batchFilter && { batch_id: batchFilter }),
    ...(from && { from }),
    ...(to && { to }),
  })
  const { data: companiesData } = useGetAdminCompaniesQuery({ limit: 100 })
  const { data: batchesData } = useGetAdminBatchesQuery(
    { limit: 100, company_id: companyFilter },
    { skip: !companyFilter },
  )

  const orderLog = data?.orderLog || []
  const pagination = data?.pagination || {}

  const handleViewInvoice = async (order) => {
    try {
      const url = await getInvoicePreviewUrl('admin', order.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err.message || 'Failed to load invoice')
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Order</h1>
        <p className="text-sm text-slate-500">Every enrollment order — company, program, batch, delivery dates, and payment — the audit trail for service delivery.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, company, or txn ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setBatchFilter(''); setPage(1) }}
          className="rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All organizations</option>
          {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={batchFilter}
          onChange={(e) => { setBatchFilter(e.target.value); setPage(1) }}
          disabled={!companyFilter}
          title={!companyFilter ? 'Choose an organization first' : undefined}
          className="rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">All batches</option>
          {(batchesData?.batches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {orderLog.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No orders found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Participant', 'Organization / Program / Batch', 'Duration / Delivery', 'Amount / Status', 'Order Created', ''].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orderLog.map((o) => (
                  <tr key={o.id} onClick={() => setDetailOrderId(o.id)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                      <p className="text-xs text-slate-500">{o.user?.email}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p className="font-medium text-slate-700">{o.company?.name}</p>
                      <p className="text-slate-500">{o.batch?.program?.name} · {o.batch?.name}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <p>{formatDate(o.batch?.start_date)} — {formatDate(o.batch?.end_date)}</p>
                      <p className="text-slate-400">Delivery: {formatDate(o.batch?.certificate_delivery_date || o.batch?.end_date)}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</p>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(o.payment_date || o.created_at)}
                      {o.is_manual_enrollment && <span className="ml-1 text-slate-400">(manual)</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <button
                          onClick={() => setDetailOrderId(o.id)}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewInvoice(o) }}
                          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Invoice
                        </button>
                      </div>
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
      )}

      {detailOrderId && <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />}
    </div>
  )
}
