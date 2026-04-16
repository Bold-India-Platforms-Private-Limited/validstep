import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import {
  ArrowLeft, Copy, Check, Award, CheckSquare, Square,
  Download, ExternalLink, Palette, Eye, FileText,
  ChevronLeft, ChevronRight, Filter, FileDown,
} from 'lucide-react'
import {
  useGetBatchQuery,
  useGetBatchOrdersQuery,
  useIssueCertificatesMutation,
  useGetBatchCertificatesQuery,
  useSaveBatchTemplateMutation,
} from '../../store/api/companyApi'
import { Tabs } from '../../components/ui/Tabs'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge, PaymentStatusBadge, BatchStatusBadge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableSkeleton, EmptyTableRow } from '../../components/ui/Table'
import { Select } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatDate'
import axiosClient from '../../api/axiosClient'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'orders', label: 'Orders', icon: FileText },
  { key: 'template', label: 'Template', icon: Palette },
  { key: 'certificates', label: 'Certificates', icon: Award },
]

const PAGE_SIZE = 100

function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

export default function BatchDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [templateStyle, setTemplateStyle] = useState('CLASSIC')
  const [primaryColor, setPrimaryColor] = useState('#4F46E5')

  // Orders filters + pagination
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [exportingExcel, setExportingExcel] = useState(false)

  const { data: batch, isLoading } = useGetBatchQuery(id)
  const { data: ordersData, isLoading: ordersLoading } = useGetBatchOrdersQuery(
    { batchId: id, status: statusFilter || undefined, page, limit: PAGE_SIZE },
    { skip: activeTab !== 'orders' }
  )
  const { data: certificates, isLoading: certsLoading } = useGetBatchCertificatesQuery(id, { skip: activeTab !== 'certificates' })
  const [issueCertificates, { isLoading: issuing }] = useIssueCertificatesMutation()
  const [updateTemplate, { isLoading: savingTemplate }] = useSaveBatchTemplateMutation()

  if (isLoading) return <PageSpinner />
  if (!batch) return <div className="p-8 text-center text-slate-500">Batch not found</div>

  const enrollLink = `${import.meta.env.VITE_APP_URL}/order/${batch.unique_slug}`
  const orderList = ordersData?.orders || []
  const pagination = ordersData?.pagination || { total: 0, pages: 1 }
  const certList = certificates?.certificates || certificates || []
  const paidOrders = orderList.filter((o) => o.status === 'PAID' && !o.certificate?.is_issued)

  const copyLink = async () => {
    await navigator.clipboard.writeText(enrollLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied!')
  }

  const toggleOrder = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((x) => x !== orderId) : [...prev, orderId]
    )
  }

  const selectAllPaid = () => {
    if (selectedOrderIds.length === paidOrders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(paidOrders.map((o) => o.id))
    }
  }

  const handleIssue = async () => {
    if (selectedOrderIds.length === 0) { toast.error('Select at least one order'); return }
    try {
      const result = await issueCertificates({ batchId: id, orderIds: selectedOrderIds }).unwrap()
      toast.success(`${result.total || selectedOrderIds.length} certificate(s) issued!`)
      setSelectedOrderIds([])
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to issue certificates')
    }
  }

  const handleSaveTemplate = async () => {
    try {
      await updateTemplate({ batchId: id, template_name: 'Default Template', template_type: templateStyle, accent_color: primaryColor }).unwrap()
      toast.success('Template saved!')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save template')
    }
  }

  const handleDownloadCert = async (certId) => {
    try {
      const response = await axiosClient.get(`/user/certificates/${certId}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const handleFilterChange = (val) => {
    setStatusFilter(val)
    setPage(1)
    setSelectedOrderIds([])
  }

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await axiosClient.get(`/company/batches/${id}/orders/export?${params}`)
      const rows = res.data?.data ?? res.data

      if (!rows?.length) { toast.error('No data to export'); return }

      const headers = [
        'Name', 'Email', 'Phone', 'Certificate Serial', 'Amount (₹)',
        'Payment Status', 'Paid At', 'PayU Txn ID',
        'Certificate Issued', 'Issued At', 'Ordered At',
      ]
      const data = rows.map((r) => [
        r.name, r.email, r.phone, r.certificate_serial, r.amount,
        r.status, r.paid_at, r.payu_txn_id,
        r.certificate_issued, r.issued_at, r.ordered_at,
      ])

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

      // Column widths
      ws['!cols'] = [
        { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 10 },
        { wch: 12 }, { wch: 22 }, { wch: 24 },
        { wch: 14 }, { wch: 22 }, { wch: 22 },
      ]

      const wb = XLSX.utils.book_new()
      const sheetName = `${batch.name} Orders`.slice(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      const filterLabel = statusFilter ? `_${statusFilter.toLowerCase()}` : ''
      XLSX.writeFile(wb, `${batch.name}${filterLabel}_orders.xlsx`)
      toast.success(`Exported ${rows.length} rows to Excel`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingExcel(false)
    }
  }

  const statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'REFUNDED', label: 'Refunded' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/company/batches" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Link>
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{batch.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm text-slate-500">{batch.program?.name}</span>
              <BatchStatusBadge status={batch.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={(t) => { setActiveTab(t); setPage(1); setSelectedOrderIds([]) }} />

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Batch Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {[
                  { label: 'Program', value: batch.program?.name },
                  { label: 'Start Date', value: formatDate(batch.start_date) },
                  { label: 'End Date', value: formatDate(batch.end_date) },
                  batch.role && { label: 'Role', value: batch.role },
                  { label: 'Certificate Price', value: `₹${batch.certificate_price}` },
                  { label: 'ID Prefix', value: batch.id_prefix },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="text-sm font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Enrollment Link</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-slate-500">
                Share this link with your participants to enroll and pay for their certificate.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="flex-1 truncate text-sm font-mono text-slate-700">{enrollLink}</span>
                <button onClick={copyLink} className="flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <a href={enrollLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <Button onClick={copyLink} variant="outline" size="sm" className="mt-3 w-full">
                {copied ? 'Copied!' : 'Copy Enrollment Link'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Issue banner */}
          {paidOrders.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-primary-50 border border-primary-100 px-4 py-3">
              <p className="text-sm text-primary-800">
                <span className="font-semibold">{paidOrders.length}</span> paid order(s) ready to issue
              </p>
              <div className="flex items-center gap-3">
                <button onClick={selectAllPaid} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                  {selectedOrderIds.length === paidOrders.length ? 'Deselect All' : 'Select All Paid'}
                </button>
                {selectedOrderIds.length > 0 && (
                  <Button size="sm" onClick={handleIssue} isLoading={issuing} leftIcon={<Award className="h-4 w-4" />}>
                    Issue {selectedOrderIds.length} Certificate(s)
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Filters + Export toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Filter:</span>
              <div className="flex gap-1.5">
                {statusOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleFilterChange(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      statusFilter === value
                        ? 'bg-primary-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {pagination.total} total {statusFilter ? `(${statusFilter.toLowerCase()})` : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                isLoading={exportingExcel}
                onClick={handleExportExcel}
                leftIcon={<FileDown className="h-4 w-4" />}
              >
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Candidate</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Ordered On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : orderList.length === 0 ? (
                  <EmptyTableRow columns={7} message="No orders match the selected filter" />
                ) : (
                  orderList.map((order) => {
                    const isSelectable = order.status === 'PAID' && !order.certificate?.is_issued
                    const isSelected = selectedOrderIds.includes(order.id)
                    return (
                      <TableRow key={order.id} selected={isSelected}>
                        <TableCell>
                          {isSelectable ? (
                            <button onClick={() => toggleOrder(order.id)}>
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 text-primary-600" />
                                : <Square className="h-4 w-4 text-slate-400" />}
                            </button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-800">{order.user?.name}</p>
                            <p className="text-xs text-slate-500">{order.user?.email}</p>
                            {order.user?.phone && <p className="text-xs text-slate-400">{order.user.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-slate-600">
                            {order.certificate?.certificate_serial || order.certificate_serial || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-600">{formatDateTime(order.paid_at)}</span>
                        </TableCell>
                        <TableCell>
                          {order.certificate?.is_issued ? (
                            <div>
                              <Badge variant="success" dot>Issued</Badge>
                              {order.certificate.issued_at && (
                                <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(order.certificate.issued_at)}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="warning" dot>Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-600">{formatDate(order.created_at)}</span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Page {page} of {pagination.pages} · {pagination.total} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                    const p = pagination.pages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                      : page >= pagination.pages - 3 ? pagination.pages - 6 + i
                      : page - 3 + i
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[2rem] rounded-lg border px-2 py-1 text-sm transition-colors ${
                          p === page
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Template */}
      {activeTab === 'template' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Certificate Template</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <Select label="Template Style" value={templateStyle} onChange={(e) => setTemplateStyle(e.target.value)}>
                <option value="CLASSIC">Classic</option>
                <option value="MODERN">Modern</option>
                <option value="MINIMAL">Minimal</option>
              </Select>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300"
                  />
                  <span className="font-mono text-sm text-slate-600">{primaryColor}</span>
                </div>
              </div>

              <Button onClick={handleSaveTemplate} isLoading={savingTemplate} className="w-full">
                Save Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-xl border-4 p-8 text-center" style={{ borderColor: primaryColor }}>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: primaryColor }}>
                  <Award className="h-6 w-6 text-white" />
                </div>
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                  Certificate of {batch.program?.type === 'INTERNSHIP' ? 'Internship' : 'Completion'}
                </p>
                <p className="text-xl font-bold text-slate-800">Candidate Name</p>
                <p className="mt-1 text-sm text-slate-500">has successfully completed</p>
                <p className="mt-2 text-base font-semibold" style={{ color: primaryColor }}>{batch.name}</p>
                <p className="mt-1 text-sm text-slate-500">{batch.program?.name}</p>
                <p className="mt-3 text-xs text-slate-400">{formatDate(batch.start_date)} — {formatDate(batch.end_date)}</p>
                <div className="mt-4 flex justify-center gap-8">
                  <div className="text-center">
                    <div className="h-px w-20 bg-slate-300 mb-1" />
                    <p className="text-xs text-slate-400">Authorised Signatory</p>
                  </div>
                  <div className="text-center">
                    <div className="h-px w-20 bg-slate-300 mb-1" />
                    <p className="text-xs text-slate-400">Date</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">Style: {templateStyle}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Certificates */}
      {activeTab === 'certificates' && (
        <Card>
          <CardHeader><CardTitle>Issued Certificates</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Issued On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certsLoading ? (
                <TableSkeleton rows={5} columns={4} />
              ) : certList.length === 0 ? (
                <EmptyTableRow columns={4} message="No certificates issued yet" />
              ) : (
                certList.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{cert.user?.name}</p>
                        <p className="text-xs text-slate-500">{cert.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-700">{cert.certificate_serial}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">{formatDateTime(cert.issued_at || cert.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`${import.meta.env.VITE_APP_URL}/verify/${cert.verification_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Verify
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
