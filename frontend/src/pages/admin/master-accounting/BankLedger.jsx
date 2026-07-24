import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useGetBankLedgerQuery, useGetCategoriesQuery, useGetBrandsQuery, useGetBankAccountsQuery,
  useCreateManualEntryMutation, useRetagBankTransactionMutation,
} from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { Pagination } from '../../../components/ui/Pagination'
import { formatDate, formatCurrency } from '../../../utils/formatDate'
import { useCAMode, useMasterAccountingFilter } from '../../../components/layouts/MasterAccountingLayout'
import { Plus, Tag, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

const COLUMNS = [
  { key: 'txn_date', label: 'Date' },
  { key: 'narration', label: 'Narration' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'withdrawal_amt', label: 'Withdrawal', align: 'right' },
  { key: 'deposit_amt', label: 'Deposit', align: 'right' },
]

function SortableHeader({ col, sortBy, sortDir, onSort }) {
  const active = sortBy === col.key
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={`px-4 py-2 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onSort(col.key)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-slate-900' : ''}`}
      >
        {col.label} <Icon className="h-3 w-3" />
      </button>
    </th>
  )
}

function ManualEntryModal({ onClose }) {
  const { data: bankAccounts } = useGetBankAccountsQuery()
  const { data: categories } = useGetCategoriesQuery()
  const { data: brands } = useGetBrandsQuery()
  const [createManualEntry, { isLoading }] = useCreateManualEntryMutation()
  const [form, setForm] = useState({ bankAccountId: '', txnDate: '', narration: '', categoryId: '', brandId: '', withdrawalAmt: '', depositAmt: '', notes: '' })

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createManualEntry({
        bankAccountId: form.bankAccountId,
        txnDate: form.txnDate,
        narration: form.narration,
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || undefined,
        withdrawalAmt: form.withdrawalAmt ? Number(form.withdrawalAmt) : undefined,
        depositAmt: form.depositAmt ? Number(form.depositAmt) : undefined,
        notes: form.notes || undefined,
      }).unwrap()
      toast.success('Manual entry added')
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add entry')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add Manual Entry</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select required value={form.bankAccountId} onChange={(e) => update('bankAccountId', e.target.value)} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select bank account…</option>
            {(bankAccounts || []).map((b) => <option key={b.id} value={b.id}>{b.nickname}</option>)}
          </select>
          <input required type="date" value={form.txnDate} onChange={(e) => update('txnDate', e.target.value)} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Narration / description" value={form.narration} onChange={(e) => update('narration', e.target.value)} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Withdrawal amount" value={form.withdrawalAmt} onChange={(e) => update('withdrawalAmt', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Deposit amount" value={form.depositAmt} onChange={(e) => update('depositAmt', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">No category</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.brandId} onChange={(e) => update('brandId', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">No brand</option>
            {(brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <textarea placeholder="Internal notes (not shown in CA Mode)" value={form.notes} onChange={(e) => update('notes', e.target.value)} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} />
        </div>
        <button disabled={isLoading} className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
          {isLoading ? 'Saving…' : 'Save Entry'}
        </button>
      </form>
    </div>
  )
}

function RetagPopover({ row, onClose }) {
  const { data: categories } = useGetCategoriesQuery()
  const { data: brands } = useGetBrandsQuery()
  const [retag, { isLoading }] = useRetagBankTransactionMutation()
  const [categoryId, setCategoryId] = useState(row.category?.id || '')
  const [brandId, setBrandId] = useState(row.brand?.id || '')

  const handleSave = async () => {
    try {
      await retag({ id: row.id, categoryId: categoryId || undefined, brandId: brandId || undefined }).unwrap()
      toast.success('Transaction re-tagged')
      onClose()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to re-tag')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Re-tag Transaction</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="mb-3 truncate text-xs text-slate-500">{row.narration}</p>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">No category</option>
          {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">No brand</option>
          {(brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button disabled={isLoading} onClick={handleSave} className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
          {isLoading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function MasterAccountingBankLedger() {
  const caMode = useCAMode()
  const { from, to } = useMasterAccountingFilter()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  // Defaults to showing every transaction in one view — this page exists for a full manual
  // categorization pass, so paging at the usual 20-per-page size just adds friction to that.
  const [limit, setLimit] = useState(1000)
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '')
  const [sortBy, setSortBy] = useState('txn_date')
  const [sortDir, setSortDir] = useState('desc')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [retagRow, setRetagRow] = useState(null)
  const { data: categories } = useGetCategoriesQuery()

  const handleSort = (key) => {
    if (sortBy === key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')) }
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  const { data, isLoading } = useGetBankLedgerQuery({
    page, limit, categoryId: categoryId || undefined, caMode: caMode || undefined,
    from: from || undefined, to: to || undefined, sortBy, sortDir,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Bank Ledger</h1>
          {data?.pagination && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {data.pagination.total} transaction{data.pagination.total === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">All categories</option>
            <option value="null">Needs Classification</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {!caMode && (
            <button onClick={() => setShowManualEntry(true)} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">
              <Plus className="h-4 w-4" /> Manual Entry
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? <PageSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  {COLUMNS.map((col) => <SortableHeader key={col.key} col={col} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />)}
                  {!caMode && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDate(r.txn_date)}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-slate-900" title={r.narration}>
                      {r.narration}
                      {r.is_manual_entry && <Badge variant="info" className="ml-2">Manual</Badge>}
                    </td>
                    <td className="px-4 py-2">
                      {r.category ? <Badge variant={r.category.type === 'REVENUE' ? 'success' : 'default'}>{r.category.name}</Badge> : <Badge variant="warning">Needs Review</Badge>}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{r.brand?.name || '—'}</td>
                    <td className="px-4 py-2 text-right text-red-600">{r.withdrawal_amt ? formatCurrency(r.withdrawal_amt) : '—'}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{r.deposit_amt ? formatCurrency(r.deposit_amt) : '—'}</td>
                    {!caMode && (
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setRetagRow(r)} className="text-slate-400 hover:text-amber-600" title="Re-tag">
                          <Tag className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {data?.rows?.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data?.pagination && (
          <Pagination
            page={data.pagination.page}
            pages={data.pagination.pages}
            total={data.pagination.total}
            limit={limit}
            limitOptions={[20, 50, 100, 500, 1000]}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1) }}
          />
        )}
      </div>

      {showManualEntry && <ManualEntryModal onClose={() => setShowManualEntry(false)} />}
      {retagRow && <RetagPopover row={retagRow} onClose={() => setRetagRow(null)} />}
    </div>
  )
}
