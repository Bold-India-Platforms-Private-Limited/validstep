import { createContext, useContext, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  useGetGateStatusQuery,
  useUnlockMasterAccountingMutation,
  useLockMasterAccountingMutation,
} from '../../store/api/masterAccountingApi'
import { PageSpinner } from '../ui/Spinner'
import {
  LayoutDashboard, BookOpen, Tags, UploadCloud, Archive, Lock, ShieldCheck, ArrowLeft,
  ChevronsLeft, ChevronsRight, CalendarRange, FileText, BookText,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CAModeContext = createContext(false)
export function useCAMode() { return useContext(CAModeContext) }

function toISODate(d) { return d.toISOString().slice(0, 10) }

/** Indian FY runs April–March. */
function currentFYStartYear() {
  const now = new Date()
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

function fyRange(startYear) {
  return { from: toISODate(new Date(Date.UTC(startYear, 3, 1))), to: toISODate(new Date(Date.UTC(startYear + 1, 2, 31))) }
}

/** Company incorporated 2025-09-11 — FY2025-26 is the first year of operation. */
function buildFYOptions() {
  const start = 2025
  const end = currentFYStartYear() + 1 // one year ahead, ready before data exists
  const options = []
  for (let y = start; y <= end; y++) {
    options.push({ label: `${y}-${String(y + 1).slice(2)}`, startYear: y })
  }
  return options
}

// Build boundary dates with Date.UTC and read them back via toISOString (also UTC) —
// mixing a local-timezone constructor with a UTC-based reader is what caused the bug
// this replaced: in any timezone ahead of UTC (IST included), `new Date(y, m, 1)` at
// local midnight converts to the *previous* UTC day, silently shifting every preset
// range back by one day for admins whose browser clock is set to IST.
function presetRange(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (preset === 'month') return { from: toISODate(new Date(Date.UTC(y, m, 1))), to: toISODate(new Date(Date.UTC(y, m + 1, 0))) }
  if (preset === 'quarter') { const q = Math.floor(m / 3); return { from: toISODate(new Date(Date.UTC(y, q * 3, 1))), to: toISODate(new Date(Date.UTC(y, q * 3 + 3, 0))) } }
  if (preset === 'half-year') { const h = m < 6 ? 0 : 6; return { from: toISODate(new Date(Date.UTC(y, h, 1))), to: toISODate(new Date(Date.UTC(y, h + 6, 0))) } }
  if (preset === 'year') return { from: toISODate(new Date(Date.UTC(y, 0, 1))), to: toISODate(new Date(Date.UTC(y, 11, 31))) }
  return { from: '', to: '' }
}

const FilterContext = createContext(null)
export function useMasterAccountingFilter() { return useContext(FilterContext) }

const nav = [
  { to: '/admin/master-accounting/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/master-accounting/bank-ledger', icon: BookOpen, label: 'Bank Ledger' },
  { to: '/admin/master-accounting/invoices', icon: FileText, label: 'Invoices' },
  { to: '/admin/master-accounting/sales-register', icon: BookText, label: 'Sales Register' },
  { to: '/admin/master-accounting/categories-rules', icon: Tags, label: 'Categories & Rules' },
  { to: '/admin/master-accounting/imports', icon: UploadCloud, label: 'Imports' },
  { to: '/admin/master-accounting/files', icon: Archive, label: 'File Archive' },
]

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-amber-50 text-amber-800' : 'text-slate-600 hover:bg-slate-100'}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />{!collapsed && label}
    </NavLink>
  )
}

function GateScreen({ onUnlocked }) {
  const [dob, setDob] = useState('')
  const [unlock, { isLoading }] = useUnlockMasterAccountingMutation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await unlock(dob).unwrap()
      onUnlocked()
    } catch (err) {
      toast.error(err?.data?.message || 'Incorrect passcode')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Lock className="h-6 w-6 text-amber-700" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Master Accounting</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the company passcode to continue.</p>
        </div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Company Incorporation Date</label>
        <input
          autoFocus
          type="text"
          placeholder="DD-MM-YYYY"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={isLoading || !dob}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {isLoading ? 'Verifying…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}

function PeriodFilterPanel({ from, to, setFrom, setTo, granularity, setGranularity, applyPreset, fyOptions, applyFY, activeFY }) {
  return (
    <div className="space-y-2 border-t border-slate-100 p-3">
      <p className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <CalendarRange className="h-3.5 w-3.5" /> Period
      </p>
      <div className="grid grid-cols-2 gap-1">
        {['month', 'quarter', 'half-year', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            className={`rounded-lg px-2 py-1 text-xs font-medium capitalize ${granularity === p && !activeFY ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {p.replace('-', ' ')}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {fyOptions.map((fy) => (
          <button
            key={fy.startYear}
            onClick={() => applyFY(fy.startYear)}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${activeFY === fy.startYear ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            FY {fy.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
      </div>
    </div>
  )
}

export function MasterAccountingLayout({ children }) {
  const [caMode, setCaMode] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [granularity, setGranularity] = useState('month')
  const [activeFY, setActiveFY] = useState(null)
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useGetGateStatusQuery()
  const [lock] = useLockMasterAccountingMutation()

  const fyOptions = useMemo(() => buildFYOptions(), [])

  const applyPreset = (preset) => {
    const r = presetRange(preset)
    setFrom(r.from); setTo(r.to); setGranularity(preset); setActiveFY(null)
  }
  const applyFY = (startYear) => {
    const r = fyRange(startYear)
    setFrom(r.from); setTo(r.to); setGranularity('fy'); setActiveFY(startYear)
  }

  if (isLoading) return <PageSpinner />
  if (!data?.unlocked) return <GateScreen onUnlocked={refetch} />

  const handleLock = async () => {
    try { await lock().unwrap() } catch { /* ignore */ }
    navigate('/admin/dashboard')
  }

  const filterValue = { from, to, setFrom, setTo, granularity, setGranularity, applyPreset, applyFY, activeFY, fyOptions }

  return (
    <CAModeContext.Provider value={caMode}>
      <FilterContext.Provider value={filterValue}>
        <div className="flex h-screen bg-slate-50">
          <div className={`hidden md:flex md:flex-col md:border-r md:border-slate-200 md:bg-white transition-all ${collapsed ? 'md:w-16' : 'md:w-60'}`}>
            <div className={`flex items-center gap-2 border-b border-slate-100 px-4 py-5 ${collapsed ? 'justify-center px-2' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              {!collapsed && <span className="font-bold text-slate-900">Master Accounting</span>}
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {nav.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
            </nav>
            {!collapsed && (
              <PeriodFilterPanel
                from={from} to={to} setFrom={setFrom} setTo={setTo}
                granularity={granularity} setGranularity={setGranularity}
                applyPreset={applyPreset} fyOptions={fyOptions} applyFY={applyFY} activeFY={activeFY}
              />
            )}
            <div className="border-t border-slate-100 p-3 space-y-2">
              {!collapsed && (
                <label className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600">
                  CA Mode
                  <input
                    type="checkbox"
                    checked={caMode}
                    onChange={(e) => setCaMode(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-600"
                  />
                </label>
              )}
              <button onClick={() => navigate('/admin/dashboard')} title="Back to Admin" className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${collapsed ? 'justify-center' : ''}`}>
                <ArrowLeft className="h-4 w-4" /> {!collapsed && 'Back to Admin'}
              </button>
              <button onClick={handleLock} title="Lock" className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${collapsed ? 'justify-center' : ''}`}>
                <Lock className="h-4 w-4" /> {!collapsed && 'Lock'}
              </button>
              <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${collapsed ? 'justify-center' : ''}`}>
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
              </button>
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            {caMode && (
              <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5" /> CA Mode active — showing compliance-safe aggregates only
              </div>
            )}
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </FilterContext.Provider>
    </CAModeContext.Provider>
  )
}
