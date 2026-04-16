import { useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { useGetAdminPaymentsQuery } from '../../store/api/adminApi'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { SearchInput } from '../../components/ui/SearchInput'
import { Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  EmptyTableRow,
} from '../../components/ui/Table'
import { formatDate } from '../../utils/formatDate'
import axiosClient from '../../api/axiosClient'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  SUCCESS: 'success',
  INITIATED: 'warning',
  FAILURE: 'danger',
  REFUNDED: 'default',
}

function PaymentStatusBadge({ status }) {
  return (
    <Badge variant={STATUS_COLORS[status] || 'default'} dot>
      {status}
    </Badge>
  )
}

function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminPayments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [downloading, setDownloading] = useState(null)

  const { data, isLoading } = useGetAdminPaymentsQuery(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
  )

  const payments = data?.payments || data || []

  const filtered = payments.filter((p) => {
    const order = p.order
    return (
      order?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order?.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      order?.batch?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order?.batch?.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.payu_txn_id?.toLowerCase().includes(search.toLowerCase())
    )
  })

  const handleDownloadInvoice = async (orderId, serial) => {
    setDownloading(orderId)
    try {
      const res = await axiosClient.get(`/admin/orders/${orderId}/invoice`, {
        responseType: 'blob',
      })
      const contentType = res.headers['content-type'] || ''
      if (!contentType.includes('application/pdf')) {
        toast.error('Invoice not available yet')
        return
      }
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${serial || orderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download invoice')
    } finally {
      setDownloading(null)
    }
  }

  // Summary stats
  const successPayments = payments.filter((p) => p.status === 'SUCCESS')
  const totalRevenue = successPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">All payment transactions across the platform</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Payments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{payments.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">Successful</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{successPayments.length}</p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-sm text-primary-600">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-primary-700">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions ({filtered.length})</CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm py-2"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="INITIATED">Initiated</option>
              <option value="FAILURE">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </Select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search transactions..."
              className="w-64"
            />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Txn ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} columns={9} />
            ) : filtered.length === 0 ? (
              <EmptyTableRow columns={9} message="No payments found" />
            ) : (
              filtered.map((payment) => {
                const order = payment.order
                const serial = order?.certificate_serial
                const verifyHash = order?.certificate?.verification_hash
                const verifyUrl = verifyHash
                  ? `${window.location.origin}/verify/${verifyHash}`
                  : null
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{order?.user?.name || '—'}</p>
                        <p className="text-xs text-slate-500">{order?.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">{order?.batch?.name || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">{order?.batch?.company?.name || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-600">{serial || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-800">
                        ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500">
                        {payment.payu_txn_id || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {payment.status === 'SUCCESS'
                          ? formatDateTime(payment.updated_at)
                          : formatDate(payment.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.status === 'SUCCESS' && (
                          <button
                            onClick={() => handleDownloadInvoice(order?.id, serial)}
                            disabled={downloading === order?.id}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            title="Download Invoice"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Invoice
                          </button>
                        )}
                        {verifyUrl && (
                          <a
                            href={verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-600 border border-primary-200 hover:bg-primary-50 transition-colors"
                            title="Verify Certificate"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Verify
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
