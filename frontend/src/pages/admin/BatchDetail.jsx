import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useGetAdminBatchQuery, useGetAdminBatchStatsQuery,
  useGetAdminBatchOrdersQuery, useIssueCertificatesAdminMutation,
  useGetAdminUsersQuery, useEnrollUsersInBatchMutation,
  useGetAssignableTransactionsQuery, useAssignTransactionsToBatchMutation, useGetAdminWhoamiQuery,
} from '../../store/api/adminApi'
import { PageSpinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatDate, formatCurrency } from '../../utils/formatDate'
import { ArrowLeft, Award, ShoppingBag, CreditCard, RefreshCw, CheckSquare, UserPlus, Search, Receipt } from 'lucide-react'

function EnrollUsersModal({ open, onClose, companyId, batchId, onEnrolled }) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const { data } = useGetAdminUsersQuery({ page: 1, limit: 100, ...(search && { search }) }, { skip: !open })
  const [enrollUsers, { isLoading }] = useEnrollUsersInBatchMutation()

  const users = data?.users || []

  const toggle = (userId) => setSelectedIds((s) => s.includes(userId) ? s.filter((x) => x !== userId) : [...s, userId])

  const handleClose = () => { setSearch(''); setSelectedIds([]); setResult(null); onClose() }

  const handleSubmit = async () => {
    if (!selectedIds.length) return
    try {
      const res = await enrollUsers({ companyId, batchId, user_ids: selectedIds }).unwrap()
      setResult(res)
      toast.success(`Enrolled ${res.enrolled} of ${res.total} selected users`)
      onEnrolled?.()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to enroll users')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Enroll Existing Users" size="lg">
      {!result ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {users.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No users found</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => toggle(u.id)}
                      className="rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} isLoading={isLoading} disabled={!selectedIds.length}>
                Enroll {selectedIds.length || ''} User{selectedIds.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{result.enrolled}</p>
              <p className="text-xs text-emerald-600">Enrolled</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{e.email}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function AssignTransactionsModal({ open, onClose, companyId, batchId, onAssigned }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const { data, isFetching } = useGetAssignableTransactionsQuery(
    { ...(from && { from }), ...(to && { to }), ...(search && { search }) },
    { skip: !open }
  )
  const [assignTransactions, { isLoading }] = useAssignTransactionsToBatchMutation()

  const transactions = data?.transactions || []

  const toggle = (payuId) => setSelectedIds((s) => s.includes(payuId) ? s.filter((x) => x !== payuId) : [...s, payuId])

  const handleClose = () => { setFrom(''); setTo(''); setSearch(''); setSelectedIds([]); setResult(null); onClose() }

  const handleSubmit = async () => {
    if (!selectedIds.length) return
    try {
      const res = await assignTransactions({ companyId, batchId, payu_ids: selectedIds }).unwrap()
      setResult(res)
      toast.success(`Assigned ${res.assigned} of ${res.total} selected transactions`)
      onAssigned?.()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to assign transactions')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Assign from Imported Transactions" size="lg">
      {!result ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Only <strong>captured</strong> (successful) transactions not yet assigned to a batch are shown. Filter by the transaction date range from the PayU report.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div className="relative col-span-2 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Email, name, txn ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {isFetching ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No assignable transactions found for this filter</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <label key={t.payu_id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.payu_id)}
                      onChange={() => toggle(t.payu_id)}
                      className="rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{[t.firstname, t.lastname].filter(Boolean).join(' ') || t.email || 'Unknown'}</p>
                      <p className="truncate text-xs text-slate-500">{t.email} &middot; {formatDate(t.addedon)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(t.amount || 0)}</p>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} isLoading={isLoading} disabled={!selectedIds.length}>
                Assign {selectedIds.length || ''} Transaction{selectedIds.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{result.assigned}</p>
              <p className="text-xs text-emerald-600">Assigned</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{e.email}</td>
                      <td className="px-3 py-2 text-red-600">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function AdminBatchDetail() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [selected, setSelected] = useState([])
  const [showEnroll, setShowEnroll] = useState(false)
  const [showAssignTxns, setShowAssignTxns] = useState(false)
  const { data: batchData, isLoading } = useGetAdminBatchQuery(id)
  const { data: statsData, refetch: refetchStats } = useGetAdminBatchStatsQuery(id)
  const { data: ordersData, refetch: refetchOrders } = useGetAdminBatchOrdersQuery({ id, page, limit })
  const [issueCerts, { isLoading: issuing }] = useIssueCertificatesAdminMutation()
  const { data: whoami } = useGetAdminWhoamiQuery()
  const isReview = whoami?.access_level === 'review'

  if (isLoading) return <PageSpinner />
  if (!batchData) return <p className="p-6 text-slate-500">Batch not found</p>

  const batch = batchData.batch || batchData
  const stats = statsData || {}
  const orders = ordersData?.orders || []
  const pagination = ordersData?.pagination || {}

  const toggle = (orderId) => setSelected((s) => s.includes(orderId) ? s.filter((x) => x !== orderId) : [...s, orderId])
  const toggleAll = () => setSelected(selected.length === orders.length ? [] : orders.map((o) => o.id))

  const handleIssue = async () => {
    if (!selected.length) return
    try {
      const res = await issueCerts({ batchId: id, order_ids: selected }).unwrap()
      toast.success(`${res.issued || selected.length} certificate(s) issued`)
      setSelected([])
      refetchOrders()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to issue')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/batches" className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{batch.name}</h1>
            <StatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-slate-500">{batch.company?.name} · {batch.program?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: ShoppingBag, label: 'Total Orders', value: stats.orders?.TOTAL || 0, color: 'text-primary-600 bg-primary-50' },
          { icon: CreditCard, label: 'Revenue', value: formatCurrency(stats.paid_revenue || 0), color: 'text-emerald-600 bg-emerald-50' },
          { icon: Award, label: 'Paid', value: stats.orders?.PAID || 0, color: 'text-violet-600 bg-violet-50' },
          { icon: RefreshCw, label: 'Pending', value: stats.orders?.PENDING || 0, color: 'text-amber-600 bg-amber-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Orders</h2>
          {!isReview && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAssignTxns(true)} leftIcon={<Receipt className="h-3.5 w-3.5" />}>
                Assign Transactions
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowEnroll(true)} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
                Enroll Users
              </Button>
              {selected.length > 0 && (
                <button
                  onClick={handleIssue}
                  disabled={issuing}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <CheckSquare className="h-4 w-4" />
                  Issue {selected.length} Certificate{selected.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {!isReview && (
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                    </th>
                  )}
                  {['User', 'Amount', 'Status', 'Certificate', 'Date', 'Paid At'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(o.id) ? 'bg-primary-50' : ''}`}>
                    {!isReview && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="rounded border-slate-300" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{o.user?.name}</p>
                      <p className="text-xs text-slate-500">{o.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(o.amount || 0)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      {o.certificate ? (
                        <div>
                          <p className="font-mono text-xs text-slate-600">{o.certificate.certificate_serial}</p>
                          <StatusBadge status={o.certificate.is_issued ? 'ISSUED' : 'PENDING'} />
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {o.paid_at ? formatDate(o.paid_at) : '—'}
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
      </div>

      <EnrollUsersModal
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        companyId={batch.company?.id}
        batchId={id}
        onEnrolled={() => { refetchOrders(); refetchStats(); }}
      />
      <AssignTransactionsModal
        open={showAssignTxns}
        onClose={() => setShowAssignTxns(false)}
        companyId={batch.company?.id}
        batchId={id}
        onAssigned={() => { refetchOrders(); refetchStats(); }}
      />
    </div>
  )
}
