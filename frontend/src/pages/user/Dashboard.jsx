import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetUserCertificatesQuery, useGetUserOrdersQuery, useGetUserProfileQuery } from '../../store/api/userApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { downloadInvoicePDF } from '../../utils/downloadInvoice'
import { Award, ShoppingBag, Download, Eye, User, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserDashboard() {
  const [downloadingId, setDownloadingId] = useState(null)
  const { data: profile } = useGetUserProfileQuery()
  const { data: certs, isLoading: certsLoading } = useGetUserCertificatesQuery()
  const { data: orders, isLoading: ordersLoading } = useGetUserOrdersQuery()

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Award className="mb-2 h-5 w-5 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900">{certificates.length}</p>
          <p className="text-xs text-slate-500">Certificates</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ShoppingBag className="mb-2 h-5 w-5 text-emerald-500" />
          <p className="text-2xl font-bold text-slate-900">{orderList.length}</p>
          <p className="text-xs text-slate-500">Orders</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
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
              <div key={cert.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{cert.batch?.program?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{cert.batch?.name}</p>
                  </div>
                  <StatusBadge status={cert.is_issued ? 'ISSUED' : 'PENDING'} />
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Issued: {cert.issued_at ? formatDate(cert.issued_at) : '—'}
                </p>
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
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Batch', 'Amount', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orderList.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{o.batch?.program?.name}</p>
                      <p className="text-xs text-slate-500">{o.batch?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(o.payments?.[0]?.amount || o.amount_paid || 0)}
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
      )}
    </div>
  )
}
