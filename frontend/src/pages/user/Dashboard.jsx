import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useGetUserCertificatesQuery, useGetUserOrdersQuery, useGetUserProfileQuery, useGetUserDeliveryLogQuery,
  useGetMyQueriesQuery, useCreateQueryMutation,
} from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge, Badge } from '../../components/ui/Badge'
import { BatchProgress } from '../../components/ui/BatchProgress'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF } from '../../utils/downloadInvoice'
import { Award, ShoppingBag, Download, Eye, User, FileText, ChevronRight, Clock, MessageSquareText } from 'lucide-react'
import toast from 'react-hot-toast'

const DELIVERY_EVENT_LABELS = {
  PAYMENT_IMPORTED: 'Payment imported',
  BATCH_ASSIGNED: 'Enrolled in batch',
  WELCOME_EMAIL_SENT: 'Login details emailed',
  ENROLLMENT_EMAIL_SENT: 'Enrollment confirmation emailed',
  CERTIFICATE_GENERATED: 'Certificate generated',
  CERTIFICATE_ISSUED_EMAIL_SENT: 'Certificate issued email sent',
  CERTIFICATE_DOWNLOADED: 'Certificate downloaded',
  INVOICE_DOWNLOADED: 'Invoice downloaded',
}

function RaiseQueryModal({ open, onClose, orders }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [createQuery, { isLoading }] = useCreateQueryMutation()

  const handleClose = () => { setSubject(''); setMessage(''); setOrderId(''); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are required'); return }
    try {
      await createQuery({ subject, message, ...(orderId && { order_id: orderId }) }).unwrap()
      toast.success('Query submitted — our team will get back to you')
      handleClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit query')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Raise a Query">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">Have a question, or need a correction on your certificate details? Let us know.</p>
        {orders.length > 0 && (
          <Select label="Related Order (optional)" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">Not related to a specific order</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.batch?.name} — {o.certificate_serial}</option>)}
          </Select>
        )}
        <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Name spelled incorrectly on certificate" />
        <Textarea label="Message" required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your query or correction request..." />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Submit</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function UserDashboard() {
  const [downloadingId, setDownloadingId] = useState(null)
  const [showQuery, setShowQuery] = useState(false)
  const { data: profile } = useGetUserProfileQuery()
  const { data: certs, isLoading: certsLoading } = useGetUserCertificatesQuery()
  const { data: orders, isLoading: ordersLoading } = useGetUserOrdersQuery()
  const { data: deliveryLog } = useGetUserDeliveryLogQuery()
  const { data: myQueries } = useGetMyQueriesQuery()

  const handleDownloadInvoice = async (order) => {
    setDownloadingId(order.id)
    try {
      await downloadInvoicePDF('user', order.id, `invoice-${order.certificate_serial}.pdf`)
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice')
    } finally {
      setDownloadingId(null)
    }
  }

  const certificates = certs?.certificates || []
  const orderList = orders?.orders || []

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
          <p className="text-sm text-slate-500">{profile?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-md:flex max-md:grid-cols-none max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-1">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-md:min-w-[128px] max-md:flex-shrink-0 max-md:snap-start max-md:rounded-2xl">
          <Award className="mb-2 h-5 w-5 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900">{certificates.length}</p>
          <p className="text-xs text-slate-500">Certificates</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-md:min-w-[128px] max-md:flex-shrink-0 max-md:snap-start max-md:rounded-2xl">
          <ShoppingBag className="mb-2 h-5 w-5 text-emerald-500" />
          <p className="text-2xl font-bold text-slate-900">{orderList.length}</p>
          <p className="text-xs text-slate-500">Orders</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1 max-md:col-span-1 max-md:min-w-[128px] max-md:flex-shrink-0 max-md:snap-start max-md:rounded-2xl">
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
                  {cert.certificate_serial}
                </p>
                <div className="flex gap-2">
                  <Link
                    to={`/dashboard/certificates/${cert.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                  {cert.certificate_url && (
                    <a
                      href={cert.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      {orderList.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Order History</h2>
            <Link
              to="/dashboard/invoices"
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <FileText className="h-3.5 w-3.5" />
              View all invoices
            </Link>
          </div>
          {/* Table — tablet/desktop */}
          <div className="hidden rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden md:block">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Company', 'Batch', 'Duration', 'Amount', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orderList.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700">{o.batch?.company?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{o.batch?.program?.name}</p>
                      <p className="text-xs text-slate-500">{o.batch?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(o.batch?.start_date)} — {formatDate(o.batch?.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(o.amount || 0)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      {o.status === 'PAID' && (
                        <button
                          onClick={() => handleDownloadInvoice(o)}
                          disabled={downloadingId === o.id}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                          title="Download Invoice"
                        >
                          {downloadingId === o.id
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 inline-block" />
                            : <FileText className="h-3.5 w-3.5" />
                          }
                          Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Native list-cards — mobile viewport only */}
          <div className="space-y-2.5 md:hidden">
            {orderList.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm active:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{o.batch?.program?.name}</p>
                  <p className="truncate text-xs text-slate-500">{o.batch?.company?.name} · {o.batch?.name}</p>
                  <p className="truncate text-xs text-slate-400">{formatDate(o.batch?.start_date)} — {formatDate(o.batch?.end_date)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-slate-400">{formatDate(o.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</p>
                  {o.status === 'PAID' && (
                    <button
                      onClick={() => handleDownloadInvoice(o)}
                      disabled={downloadingId === o.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600 disabled:opacity-50"
                      title="Download Invoice"
                    >
                      {downloadingId === o.id
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 inline-block" />
                        : <Download className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery timeline */}
      {deliveryLog?.events?.filter((e) => e.event !== 'USER_CREATED').length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-slate-400" />
            Delivery Timeline
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {deliveryLog.events.filter((e) => e.event !== 'USER_CREATED').map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{DELIVERY_EVENT_LABELS[e.event] || e.event}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(e.created_at)}
                      {e.order?.batch?.name && ` · ${e.order.batch.name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Queries */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
            <MessageSquareText className="h-4 w-4 text-slate-400" />
            Queries & Correction Requests
          </h2>
          <button
            onClick={() => setShowQuery(true)}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Raise a Query
          </button>
        </div>
        {(myQueries?.queries || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-400">No queries raised yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {myQueries.queries.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{q.subject}</p>
                  <Badge variant={q.status === 'OPEN' ? 'warning' : 'success'}>{q.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{q.message}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {formatDate(q.created_at)}
                  {q.order?.batch?.name && ` · ${q.order.batch.name}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <RaiseQueryModal open={showQuery} onClose={() => setShowQuery(false)} orders={orderList} />
    </div>
  )
}
