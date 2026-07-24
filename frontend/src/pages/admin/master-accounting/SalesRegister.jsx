import { useState } from 'react'
import {
  useGetSalesRegisterPayuQuery, useGetSalesRegisterRazorpayQuery, useGetDistinctStatusesQuery,
} from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { Pagination } from '../../../components/ui/Pagination'
import { MultiSelectDropdown } from '../../../components/ui/MultiSelectDropdown'
import { formatDateTime, formatDate, formatCurrency } from '../../../utils/formatDate'
import { gatewayStatusVariant } from '../../../utils/gatewayStatus'
import { downloadFileGet } from '../../../utils/downloadFile'
import { useMasterAccountingFilter } from '../../../components/layouts/MasterAccountingLayout'
import { BookText, Search, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const GATEWAYS = [
  { key: 'RAZORPAY', label: 'RiseFlake.com / Resume — via Razorpay' },
  { key: 'PAYU', label: 'Validstep.com — via PayU' },
]

const BANK_CREDIT_BADGE = {
  CREDITED: 'success',
  PENDING: 'warning',
  NOT_SETTLED: 'default',
  NOT_LINKED: 'default',
}

const BANK_CREDIT_LABEL = {
  CREDITED: 'Credited',
  PENDING: 'Pending',
  NOT_SETTLED: 'Not Settled',
  NOT_LINKED: 'Not Linked',
}

export default function MasterAccountingSalesRegister() {
  const { from, to } = useMasterAccountingFilter()
  const [gateway, setGateway] = useState('RAZORPAY')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [statusFilter, setStatusFilter] = useState([])
  const [bankCredit, setBankCredit] = useState('')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const { data: statusOptions } = useGetDistinctStatusesQuery(gateway)

  const params = {
    from: from || undefined, to: to || undefined, page, limit,
    status: statusFilter.length ? statusFilter.join(',') : undefined, search: search || undefined,
    ...(gateway === 'PAYU' ? { bankCredit: bankCredit || undefined } : {}),
  }
  const payu = useGetSalesRegisterPayuQuery(params, { skip: gateway !== 'PAYU' })
  const rzp = useGetSalesRegisterRazorpayQuery(params, { skip: gateway !== 'RAZORPAY' })

  const { data, isLoading } = gateway === 'PAYU' ? payu : rzp
  const rows = data?.rows || []
  const pagination = data?.pagination || {}

  const handleGatewayChange = (g) => { setGateway(g); setStatusFilter([]); setBankCredit(''); setPage(1) }
  const handleFilterChange = (setter) => (v) => { setter(v); setPage(1) }

  const handleExport = async () => {
    setExporting(true)
    try {
      const query = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()
      await downloadFileGet(`/admin/master-accounting/sales-register/export${query ? `?${query}` : ''}`, 'sales-register.xlsx')
    } catch (err) {
      toast.error(err.message || 'Failed to export sales register')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Register</h1>
          <p className="mt-1 text-sm text-slate-500">
            Statutory-grade per-transaction register for both brands — full fee breakdown, and exactly which settlement
            (with UTR/date) each transaction's money was credited under.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {exporting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-white" /> : <Download className="h-3.5 w-3.5" />}
          Export Excel (both brands)
        </button>
      </div>

      {gateway === 'PAYU' && (
        <p className="text-xs text-slate-400">
          Fee columns break down PayU's exact per-transaction processing fee + GST from the settlement ledger, the
          priority/instant-settlement fee + GST when present, and this transaction's proportional share of that day's
          ~2% MDR (PayU settles that once per day, not per row — allocated by revenue share). "Settlement UTR/Date" and
          "Bank Credit" reflect real reconciliation against your uploaded HDFC bank statement, not an estimate.
        </p>
      )}
      {gateway === 'RAZORPAY' && (
        <p className="text-xs text-slate-400">
          Razorpay itemizes its transaction fee + GST per payment exactly. Razorpay settles in UTR batches with no
          per-payment link captured in the data yet, so Settlement/Bank Credit columns are not available here — see
          Bank Ledger / the Razorpay Settlement Report for batch-level confirmation.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {GATEWAYS.map((g) => (
          <button
            key={g.key}
            onClick={() => handleGatewayChange(g.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              gateway === g.key ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email, txn ID, or product..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <MultiSelectDropdown
          label="Status"
          allLabel="All Statuses"
          options={statusOptions || []}
          selected={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
        />
        {gateway === 'PAYU' && (
          <select
            value={bankCredit}
            onChange={(e) => handleFilterChange(setBankCredit)(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Bank Credit</option>
            <option value="matched">Credited</option>
            <option value="pending">Pending</option>
          </select>
        )}
      </div>

      {isLoading ? <PageSpinner /> : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <BookText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No transactions found for this period</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Txn Date/Time', 'Txn ID', 'Customer', 'Product', 'Status',
                    'Amount Charged', 'Processing Fee', 'Priority Fee', 'MDR Share', 'Total Fee', 'Net Amount',
                    'Settlement UTR', 'Settlement Date', 'Bank Credit', 'Refund', 'Chargeback',
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(row.txn_datetime)}</td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-slate-700">{row.gateway_txn_id}</p>
                      {row.merchant_txn_id && <p className="font-mono text-[11px] text-slate-400">{row.merchant_txn_id}</p>}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-slate-700">{row.email || '—'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-slate-700">{row.product || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={gatewayStatusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{formatCurrency(row.amount_charged)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-rose-600">
                      {row.fee_processing || row.fee_processing_gst ? `−${formatCurrency(row.fee_processing + row.fee_processing_gst)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-rose-600">
                      {row.fee_priority_settlement || row.fee_priority_settlement_gst ? `−${formatCurrency(row.fee_priority_settlement + row.fee_priority_settlement_gst)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-rose-600">
                      {row.fee_mdr_share || row.fee_mdr_share_gst ? `−${formatCurrency(row.fee_mdr_share + row.fee_mdr_share_gst)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-rose-700">−{formatCurrency(row.gateway_fee_total)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-700">{formatCurrency(row.net_amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {row.settlement_ref || (
                        gateway === 'RAZORPAY'
                          ? <span className="italic text-slate-400" title="Razorpay settles in UTR batches — no per-payment settlement link in the data. See Bank Ledger.">N/A (batched)</span>
                          : '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {row.settlement_datetime ? formatDate(row.settlement_datetime) : (
                        gateway === 'RAZORPAY'
                          ? <span className="italic text-slate-400" title="Razorpay settles in UTR batches — no per-payment settlement link in the data. See Bank Ledger.">N/A (batched)</span>
                          : '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={BANK_CREDIT_BADGE[row.bank_credit_status] || 'default'}>
                        {BANK_CREDIT_LABEL[row.bank_credit_status] || row.bank_credit_status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.is_refunded ? (
                        <div>
                          <p className="font-semibold text-rose-700">{formatCurrency(row.refund_amount)}</p>
                          {row.refund_settlement_ref && <p className="font-mono text-[11px] text-slate-400">{row.refund_settlement_ref}</p>}
                          {row.refund_settlement_datetime && <p className="text-[11px] text-slate-400">{formatDate(row.refund_settlement_datetime)}</p>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.is_charged_back ? (
                        <div>
                          <p className="font-semibold text-rose-700">{formatCurrency(row.chargeback_amount)}</p>
                          {row.chargeback_settlement_ref && <p className="font-mono text-[11px] text-slate-400">{row.chargeback_settlement_ref}</p>}
                          {row.chargeback_settlement_datetime && <p className="text-[11px] text-slate-400">{formatDate(row.chargeback_settlement_datetime)}</p>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
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
    </div>
  )
}
