import { useState } from 'react'
import {
  useGetCategoriesQuery, useCreateCategoryMutation,
  useGetRulesQuery, useCreateRuleMutation, useUpdateRuleMutation, useRunReclassificationMutation,
} from '../../../store/api/masterAccountingApi'
import { PageSpinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_TYPES = ['REVENUE', 'EXPENSE', 'TRANSFER', 'TAX', 'REFUND', 'OTHER']
const MATCH_TYPES = ['CONTAINS', 'STARTS_WITH', 'REGEX']

function NewCategoryForm({ onDone }) {
  const [createCategory, { isLoading }] = useCreateCategoryMutation()
  const [name, setName] = useState('')
  const [type, setType] = useState('EXPENSE')

  const submit = async (e) => {
    e.preventDefault()
    try {
      await createCategory({ name, type }).unwrap()
      setName('')
      toast.success('Category created')
      onDone?.()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create category')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input required placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        {CATEGORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button disabled={isLoading} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
        <Plus className="h-4 w-4" /> Add
      </button>
    </form>
  )
}

function NewRuleForm({ categories }) {
  const [createRule, { isLoading }] = useCreateRuleMutation()
  const [categoryId, setCategoryId] = useState('')
  const [matchType, setMatchType] = useState('CONTAINS')
  const [pattern, setPattern] = useState('')
  const [priority, setPriority] = useState(50)

  const submit = async (e) => {
    e.preventDefault()
    try {
      await createRule({ categoryId, matchType, pattern, priority: Number(priority) }).unwrap()
      setPattern('')
      toast.success('Rule created')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create rule')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        <option value="">Category…</option>
        {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        {MATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input required placeholder="Narration pattern (e.g. CLOUDFLARE)" value={pattern} onChange={(e) => setPattern(e.target.value)} className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      <input type="number" title="Priority (higher wins)" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      <button disabled={isLoading} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
        <Plus className="h-4 w-4" /> Add Rule
      </button>
    </form>
  )
}

export default function MasterAccountingCategoriesRules() {
  const { data: categories, isLoading: catLoading } = useGetCategoriesQuery()
  const { data: rules, isLoading: rulesLoading } = useGetRulesQuery()
  const [updateRule] = useUpdateRuleMutation()
  const [reclassify, { isLoading: reclassifying }] = useRunReclassificationMutation()

  const handleReclassify = async () => {
    try {
      const result = await reclassify().unwrap()
      toast.success(`Checked ${result.checked} rows, matched ${result.matched}`)
    } catch (err) {
      toast.error(err?.data?.message || 'Reclassification failed')
    }
  }

  const toggleRule = async (rule) => {
    try {
      await updateRule({ id: rule.id, isActive: !rule.is_active }).unwrap()
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update rule')
    }
  }

  if (catLoading || rulesLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Categories &amp; Classification Rules</h1>
        <button onClick={handleReclassify} disabled={reclassifying} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${reclassifying ? 'animate-spin' : ''}`} /> Reclassify Unmatched
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">Chart of Accounts</h3>
        <NewCategoryForm />
        <div className="mt-3 flex flex-wrap gap-2">
          {(categories || []).map((c) => (
            <Badge key={c.id} variant={c.type === 'REVENUE' ? 'success' : c.type === 'EXPENSE' ? 'default' : 'info'}>
              {c.name}{c.brand && ` · ${c.brand.name}`}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Classification Rules</h3>
          <NewRuleForm categories={categories} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Pattern</th>
                <th className="px-4 py-2">Match</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {(rules || []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-900">{r.pattern}</td>
                  <td className="px-4 py-2 text-slate-500">{r.match_type}</td>
                  <td className="px-4 py-2">{r.category?.name}</td>
                  <td className="px-4 py-2 text-slate-500">{r.priority}</td>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={r.is_active} onChange={() => toggleRule(r)} className="h-4 w-4 accent-amber-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
