import { useEffect, useState } from 'react'
import {
  useGetRazorpayPaymentsQuery, useGetPayuTransactionsQuery, useGetInvoiceAnalyticsQuery,
  useGetPayuBankCreditChainQuery, useGetRazorpayBankCreditChainQuery, useGetDistinctStatusesQuery,
} from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { Pagination } from '../../../components/ui/Pagination'
import { MultiSelectDropdown } from '../../../components/ui/MultiSelectDropdown'
import { formatDate, formatDateTime, formatCurrency } from '../../../utils/formatDate'
import { gatewayStatusVariant } from '../../../utils/gatewayStatus'
import { downloadFileGet, fetchFileBlob } from '../../../utils/downloadFile'
import { useMasterAccountingFilter } from '../../../components/layouts/MasterAccountingLayout'
import { FileText, Download, Eye, X, Search, ArrowRight, Landmark } from 'lucide-react'
import toast from 'react-hot-toast'

const GATEWAYS = [
  { key: 'RAZORPAY', label: 'RiseFlake.com / Resume — via Razorpay' },
  { key: 'PAYU', label: 'Validstep.com — via PayU' },
]

const VIEWS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'analytics', label: 'Analytics' },
]

function BankCreditCell({ row, gateway, onOpenChain }) {
  if (gateway === 'RAZORPAY') {
    return (
      <button onClick={() => onOpenChain(row)} className="text-xs text-slate-400 hover:text-amber-700 hover:underline">
        See Bank Ledger (batch)
      </button>
    )
  }
  const bc = row.bank_credit
  if (!bc) return <span className="text-xs text-slate-400">—</span>
  return (
    <button onClick={() => onOpenChain(row)} className="hover:opacity-80">
      <Badge variant={bc.matched ? 'success' : 'warning'}>{bc.matched ? 'Credited' : 'Pending'}</Badge>
    </button>
  )
}

function InvoicePreviewModal({ objectUrl, loading, filename, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{filename}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownload}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-2xl bg-slate-100">
          {loading ? (
            <div className="flex h-full items-center justify-center"><PageSpinner /></div>
          ) : (
            <iframe title={filename} src={objectUrl} className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  )
}

function ChainStep({ title, children, tone = 'default' }) {
  const toneClass = tone === 'success' ? 'border-emerald-200 bg-emerald-50' : tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
  return (
    <div className={`flex-1 rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1.5 text-sm text-slate-800">{children}</div>
    </div>
  )
}

function BankCreditChainModal({ gateway, row, onClose }) {
  const payuQuery = useGetPayuBankCreditChainQuery(row.payu_id, { skip: gateway !== 'PAYU' })
  const rzpQuery = useGetRazorpayBankCreditChainQuery(row.razorpay_id, { skip: gateway !== 'RAZORPAY' })
  const { data: chain, isLoading } = gateway === 'PAYU' ? payuQuery : rzpQuery

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Landmark className="h-5 w-5 text-amber-600" /> Money Trail
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        {isLoading ? <PageSpinner /> : chain && (
          <div className="space-y-4">
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <ChainStep title="1. Customer Paid" tone="default">
                <p className="font-semibold">{formatCurrency(chain.customer_paid.amount)}</p>
                <p className="text-xs text-slate-500">{formatDateTime(chain.customer_paid.date)}</p>
                <p className="truncate text-xs text-slate-500">{chain.customer_paid.email || '—'}</p>
              </ChainStep>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
              <ChainStep title="2. Gateway Settlement" tone={chain.gateway_settlement.matched ? 'success' : 'warning'}>
                {chain.gateway_settlement.matched ? (
                  <>
                    <p className="font-semibold">{formatCurrency(chain.gateway_settlement.net_amount)}</p>
                    <p className="text-xs text-slate-500">{formatDate(chain.gateway_settlement.settlement_date)}</p>
                    <p className="truncate font-mono text-xs text-slate-500">UTR {chain.gateway_settlement.utr}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">{chain.gateway_settlement.reason}</p>
                )}
              </ChainStep>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
              <ChainStep title="3. Bank Credit" tone={chain.bank_credit.matched ? 'success' : 'warning'}>
                {chain.bank_credit.matched ? (
                  <>
                    <p className="font-semibold">{formatCurrency(chain.bank_credit.bank_amount)} <span className="font-normal text-slate-400">(batch)</span></p>
                    <p className="text-xs text-slate-500">{formatDate(chain.bank_credit.bank_txn_date)}</p>
                    <p className="truncate text-xs text-slate-500">{chain.bank_credit.bank_narration}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">{chain.bank_credit.reason}</p>
                )}
              </ChainStep>
            </div>

            {chain.refunds?.map((r, i) => (
              <div key={i} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Refund</p>
                <p className="mt-1 text-sm font-semibold text-rose-800">{formatCurrency(r.amount)}</p>
                {r.bank_debit.matched ? (
                  <p className="mt-1 text-xs text-rose-700">
                    Settlement UTR {r.bank_debit.settlement_utr} — batch {r.bank_debit.is_credit ? 'netted to a credit' : 'debit'} of{' '}
                    {formatCurrency(r.bank_debit.bank_amount)} on {formatDate(r.bank_debit.bank_txn_date)}.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-rose-700">{r.bank_debit.reason}</p>
                )}
              </div>
            ))}
            {chain.chargebacks?.map((c, i) => (
              <div key={i} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Chargeback</p>
                <p className="mt-1 text-sm font-semibold text-rose-800">{formatCurrency(c.amount)}</p>
                {c.bank_debit.matched ? (
                  <p className="mt-1 text-xs text-rose-700">
                    Settlement UTR {c.bank_debit.settlement_utr} — batch {c.bank_debit.is_credit ? 'netted to a credit' : 'debit'} of{' '}
                    {formatCurrency(c.bank_debit.bank_amount)} on {formatDate(c.bank_debit.bank_txn_date)}.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-rose-700">{c.bank_debit.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsView({ gateway, from, to }) {
  const { data, isLoading } = useGetInvoiceAnalyticsQuery({ gateway, from: from || undefined, to: to || undefined })
  const rows = data || []

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        {gateway === 'PAYU'
          ? '"Credited" here means genuinely bank-confirmed — this settlement UTR has been matched to an uploaded HDFC statement row. "Pending" is captured but not yet bank-matched.'
          : 'Razorpay has no per-payment settlement link in the data yet, so "Credited" here means "captured" (a successful charge) — not an individually bank-confirmed credit. See Bank Ledger for actual batch settlement confirmation.'}
      </p>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No data in this period</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Month', gateway === 'PAYU' ? 'Credited Txns' : 'Txns', 'Amount Charged', 'Gateway Fee', 'Net Credited',
                    ...(gateway === 'PAYU' ? ['Pending Txns', 'Pending Amount'] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.period} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.period}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.credited_count}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(r.credited_amount)}</td>
                    <td className="px-4 py-3 text-sm text-rose-600">−{formatCurrency(r.credited_fee)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{formatCurrency(r.credited_net)}</td>
                    {gateway === 'PAYU' && (
                      <>
                        <td className="px-4 py-3 text-sm text-amber-700">{r.pending_count}</td>
                        <td className="px-4 py-3 text-sm text-amber-700">{formatCurrency(r.pending_amount)}</td>
                      </>
                    )}
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

export default function MasterAccountingInvoices() {
  const { from, to } = useMasterAccountingFilter()
  const [view, setView] = useState('transactions')
  const [gateway, setGateway] = useState('RAZORPAY')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [statusFilter, setStatusFilter] = useState([])
  const [bankCredit, setBankCredit] = useState('')
  const [search, setSearch] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // `${rowId}:${mode}` e.g. "abc:view-customer"
  const [preview, setPreview] = useState(null) // { filename, path, objectUrl, loading }
  const [chainRow, setChainRow] = useState(null)

  const { data: statusOptions } = useGetDistinctStatusesQuery(gateway)

  const params = {
    from: from || undefined, to: to || undefined, page, limit,
    status: statusFilter.length ? statusFilter.join(',') : undefined, search: search || undefined,
    ...(gateway === 'PAYU' ? { bankCredit: bankCredit || undefined } : {}),
  }
  const rzp = useGetRazorpayPaymentsQuery(params, { skip: gateway !== 'RAZORPAY' || view !== 'transactions' })
  const payu = useGetPayuTransactionsQuery(params, { skip: gateway !== 'PAYU' || view !== 'transactions' })

  const { data, isLoading } = gateway === 'RAZORPAY' ? rzp : payu
  const rows = data?.rows || []
  const pagination = data?.pagination || {}

  // Revoke the previous blob URL whenever it's replaced or the modal closes, so repeated
  // previews don't leak memory.
  useEffect(() => () => { if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl) }, [preview?.objectUrl])

  const handleGatewayChange = (g) => { setGateway(g); setStatusFilter([]); setBankCredit(''); setPage(1) }
  const handleFilterChange = (setter) => (v) => { setter(v); setPage(1) }

  const invoicePathAndName = (row, type) => {
    const idPart = gateway === 'RAZORPAY' ? row.razorpay_id : row.payu_id
    const url = gateway === 'RAZORPAY'
      ? `/admin/master-accounting/invoices/razorpay/${idPart}/download`
      : `/admin/master-accounting/invoices/payu/${idPart}/download`
    return [`${url}?type=${type}`, `${type}-invoice-${idPart}.pdf`]
  }

  const handleDownload = async (row, type) => {
    setPendingAction(`${row.id}:download-${type}`)
    try {
      const [path, filename] = invoicePathAndName(row, type)
      await downloadFileGet(path, filename)
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice')
    } finally {
      setPendingAction(null)
    }
  }

  const handleView = async (row, type) => {
    const [path, filename] = invoicePathAndName(row, type)
    setPendingAction(`${row.id}:view-${type}`)
    setPreview({ filename, path, objectUrl: null, loading: true })
    try {
      const blob = await fetchFileBlob(path)
      const objectUrl = URL.createObjectURL(blob)
      setPreview({ filename, path, objectUrl, loading: false })
    } catch (err) {
      toast.error(err.message || 'Failed to load invoice')
      setPreview(null)
    } finally {
      setPendingAction(null)
    }
  }

  const closePreview = () => setPreview(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Per-transaction invoices for both brands — the full money trail from what the customer was charged, through the
          payment gateway's fee, to what's actually credited to your company bank account.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          An invoice is only available once a transaction is confirmed credited to the bank, refunded, or charged back —
          not while it's still pending settlement confirmation.
        </p>
        {gateway === 'PAYU' && (
          <p className="mt-1 text-xs text-slate-400">
            "Gateway Fee" combines this transaction's exact processing/priority-settlement fee (from PayU's ledger) with its
            proportional share of that day's ~2% PayU transaction fee (allocated, since PayU settles that once per day, not
            per row). Click "Bank Credit" for the full linked money trail.
          </p>
        )}
        {gateway === 'RAZORPAY' && (
          <p className="mt-1 text-xs text-slate-400">
            Razorpay itemizes its transaction fee + GST per payment directly, so "Gateway Fee" here is exact, not an
            allocation. Razorpay settles in UTR batches rather than per payment, so the specific bank-credit date for a
            given payment is tracked via Bank Ledger / the Razorpay Settlement Report, not per-invoice.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === v.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'analytics' ? (
        <AnalyticsView gateway={gateway} from={from} to={to} />
      ) : (
        <>
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
              <FileText className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-600">No transactions found for this period</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Customer', 'Product', 'Date', 'Status', 'Amount Charged', 'Gateway Fee', 'Net Credited', 'Bank Credit', 'Invoice'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((row) => {
                      const eligible = !!row.invoice_eligible
                      return (
                        <tr key={row.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{row.email || '—'}</p>
                            <p className="font-mono text-xs text-slate-400">{gateway === 'RAZORPAY' ? row.razorpay_id : row.payu_id}</p>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-700">
                            {gateway === 'RAZORPAY' ? (row.description || '—') : (row.productinfo || '—')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {formatDate(gateway === 'RAZORPAY' ? row.created_at_source : row.addedon)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={gatewayStatusVariant(row.status)}>{row.status}</Badge>
                            {row.is_refunded && !/refund/i.test(row.status) && <Badge variant="info" className="ml-1.5">Refunded</Badge>}
                            {row.is_charged_back && !/chargeback/i.test(row.status) && <Badge variant="danger" className="ml-1.5">Chargeback</Badge>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-3 text-sm text-rose-600">{row.gateway_fee != null ? `−${formatCurrency(row.gateway_fee)}` : '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{row.net_amount != null ? formatCurrency(row.net_amount) : '—'}</td>
                          <td className="px-4 py-3"><BankCreditCell row={row} gateway={gateway} onOpenChain={setChainRow} /></td>
                          <td className="px-4 py-3">
                            {!eligible ? (
                              <span className="text-xs text-slate-400" title="Only available once credited, refunded, or charged back">Not yet eligible</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {[['customer', 'Customer'], ['company', 'Company']].map(([type, label]) => (
                                  <div key={type} className="flex items-center gap-2 text-xs">
                                    <span className="w-16 shrink-0 text-slate-500">{label}:</span>
                                    <button
                                      onClick={() => handleView(row, type)}
                                      disabled={pendingAction === `${row.id}:view-${type}`}
                                      className="flex items-center gap-1 text-slate-500 hover:text-amber-700 hover:underline disabled:opacity-50"
                                    >
                                      <Eye className="h-3 w-3" /> View
                                    </button>
                                    <button
                                      onClick={() => handleDownload(row, type)}
                                      disabled={pendingAction === `${row.id}:download-${type}`}
                                      className="flex items-center gap-1 text-amber-700 hover:underline disabled:opacity-50"
                                    >
                                      <Download className="h-3 w-3" /> Download
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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
        </>
      )}

      {preview && (
        <InvoicePreviewModal
          objectUrl={preview.objectUrl}
          loading={preview.loading}
          filename={preview.filename}
          onClose={closePreview}
          onDownload={() => downloadFileGet(preview.path, preview.filename).catch((err) => toast.error(err.message || 'Failed to download invoice'))}
        />
      )}

      {chainRow && <BankCreditChainModal gateway={gateway} row={chainRow} onClose={() => setChainRow(null)} />}
    </div>
  )
}
