import { useEffect, useState } from 'react'
import {
  useGetAdminOrderLogQuery, useGetAdminOrderDetailQuery, useResolveAdminQueryMutation, useGetAdminCompaniesQuery,
  useResendUserPasswordMutation, useResendCertificateEmailMutation,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF, getInvoicePreviewUrl } from '../../utils/downloadInvoice'
import {
  ClipboardList, Search, Eye, FileText, ShieldCheck, MessageSquareText, KeyRound, Send, Award,
  Calendar, Building2, Wallet, ShieldQuestion, MessageCircle, Sparkles, FolderOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'

const DAY_MS = 24 * 60 * 60 * 1000

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
}

// Payment, order creation, account creation, and batch enrollment are folded into one fixed
// flow (see Order Timeline below) — always shown together, all dated to the payment date.
const CORE_FLOW_LABELS = ['Payment Received', 'Order Created', 'Account Created', 'Enrolled in Batch']
const CORE_FLOW_EVENT_TYPES = new Set(['PAYMENT_IMPORTED', 'USER_CREATED', 'BATCH_ASSIGNED'])

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'send-certificate', label: 'Send Certificate' },
  { key: 'background-verification', label: 'Background Verification Requests', comingSoon: true, icon: ShieldQuestion },
  { key: 'organizer-update', label: 'Update From Organizer', comingSoon: true, icon: MessageCircle },
]

function ComingSoonPanel({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
        {Icon ? <Icon className="h-6 w-6 text-violet-500" /> : <Sparkles className="h-6 w-6 text-violet-500" />}
      </div>
      <p className="font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-sm text-slate-400">This feature is coming soon.</p>
    </div>
  )
}

function OrderDetailModal({ orderId, onClose }) {
  const { data, isLoading } = useGetAdminOrderDetailQuery(orderId, { skip: !orderId })
  const [resolveQuery, { isLoading: resolving }] = useResolveAdminQueryMutation()
  const [resendPassword, { isLoading: sendingPassword }] = useResendUserPasswordMutation()
  const [resendCertEmail, { isLoading: sendingCertEmail }] = useResendCertificateEmailMutation()
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [loadingPreview, setLoadingPreview] = useState(false)

  const order = data?.order
  const events = data?.events || []
  const otherEvents = events.filter((e) => !CORE_FLOW_EVENT_TYPES.has(e.event))
  const queries = data?.queries || []

  useEffect(() => {
    setTab('overview')
  }, [orderId])

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
      await resendCertEmail(order.id).unwrap()
      toast.success(`Certificate email sent to ${order.user.email}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send certificate email')
    }
  }

  const orderCreatedDate = order?.payments?.[0]?.created_at || order?.created_at

  const headerContent = order && (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="truncate text-base font-semibold text-slate-900">{order.user?.name}</p>
      <p className="truncate text-xs text-slate-500">{order.user?.email}</p>
      {order.user?.phone && <p className="text-xs text-slate-500">{order.user.phone}</p>}
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

  return (
    <Modal open={!!orderId} onClose={onClose} title="Order Detail" headerContent={headerContent} size="wide">
      {isLoading || !order ? (
        <div className="py-16"><PageSpinner /></div>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
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
                  <p className="mt-1"><Badge variant={order.certificate?.is_issued ? 'success' : 'warning'}>{order.certificate?.is_issued ? 'Issued' : 'Not Issued'}</Badge></p>
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
                  {order.certificate?.verification_hash ? (
                    <a
                      href={`${window.location.origin}/verify/${order.certificate.verification_hash}`}
                      target="_blank" rel="noreferrer"
                      className="mt-1 block truncate text-sm text-primary-600 hover:underline"
                    >
                      /verify/{order.certificate.verification_hash}
                    </a>
                  ) : <p className="mt-1 text-sm text-slate-400">—</p>}
                </div>
              </div>
              {order.certificate?.certificate_url && (
                <a
                  href={order.certificate.certificate_url}
                  target="_blank" rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Certificate PDF
                </a>
              )}
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
                  ? `Email the issued certificate to ${order.user?.email}. Useful if the original notification bounced or the customer asks for it again.`
                  : 'This certificate has not been issued yet — issue it from the batch\'s Certificates screen first.'}
              </p>
              <button
                onClick={handleSendCertificateEmail}
                disabled={sendingCertEmail || !order.certificate?.is_issued}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendingCertEmail ? 'Sending…' : 'Send Certificate Email'}
              </button>
            </div>
          )}

          {TABS.find((t) => t.key === tab)?.comingSoon && (
            <ComingSoonPanel icon={TABS.find((t) => t.key === tab)?.icon} label={TABS.find((t) => t.key === tab)?.label} />
          )}
        </div>
      )}
    </Modal>
  )
}

export default function AdminOrderLog() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detailOrderId, setDetailOrderId] = useState(null)
  const { data, isLoading } = useGetAdminOrderLogQuery({
    page, limit,
    ...(search && { search }),
    ...(status && { status }),
    ...(companyFilter && { company_id: companyFilter }),
    ...(from && { from }),
    ...(to && { to }),
  })
  const { data: companiesData } = useGetAdminCompaniesQuery({ limit: 100 })

  const orderLog = data?.orderLog || []
  const pagination = data?.pagination || {}

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
          onChange={(e) => { setCompanyFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All organizations</option>
          {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
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
                      <button
                        onClick={() => setDetailOrderId(o.id)}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
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
