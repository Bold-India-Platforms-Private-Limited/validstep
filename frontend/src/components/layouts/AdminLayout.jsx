import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useLogoutMutation } from '../../store/api/authApi'
import { clearCredentials, selectUser } from '../../store/authSlice'
import {
  LayoutDashboard, Building2, Layers, DollarSign,
  CreditCard, LogOut, Menu, X, FileText, ShieldCheck, Users,
  PanelLeftClose, PanelLeftOpen, Clock, ClipboardList, BarChart3, Globe, Wifi, Eye, Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SystemStatusBadge } from '../shared/SystemStatusBadge'
import { useGetAdminWhoamiQuery } from '../../store/api/adminApi'

const nav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/companies', icon: Building2, label: 'Organizations', scopeKey: 'companies' },
  { to: '/admin/batches', icon: Layers, label: 'Batches', scopeKey: 'batches' },
  { to: '/admin/users', icon: Users, label: 'Users', scopeKey: 'users' },
  { to: '/admin/order-log', icon: ClipboardList, label: 'Order', scopeKey: 'orders' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments', hideForReview: true },
  { to: '/admin/invoices', icon: FileText, label: 'Invoices', hideForReview: true },
  { to: '/admin/pricing', icon: DollarSign, label: 'Pricing' },
]

function NavItem({ to, icon: Icon, label, onClick, collapsed, badge }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100'}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge != null && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{badge}</span>
      )}
    </NavLink>
  )
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useRelativeTime(timestamp) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`
}

export function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === '1')
  const [loadedAt] = useState(() => Date.now())
  const lastUpdated = useRelativeTime(loadedAt)
  const now = useClock()
  const { data: whoami } = useGetAdminWhoamiQuery()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const [logout] = useLogoutMutation()
  const isReview = whoami?.access_level === 'review'
  const [noticeDismissed, setNoticeDismissed] = useState(false)

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const handleLogout = async () => {
    try { await logout().unwrap() } catch { /* ignore */ }
    dispatch(clearCredentials())
    navigate('/auth/admin/login')
  }

  const Sidebar = ({ collapsed = false }) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center px-4 py-5 border-b border-slate-100 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="relative shrink-0">
          <img src="/logo.webp" alt="Validstep" className={`w-auto object-contain ${collapsed ? 'h-8' : 'h-10'}`} />
          {!collapsed && (
            <span className="absolute -top-1.5 -right-2.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white shadow-sm whitespace-nowrap">
              Admin Panel
            </span>
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.filter((item) => !(item.hideForReview && isReview)).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={collapsed}
            onClick={() => setOpen(false)}
            badge={isReview && item.scopeKey ? whoami?.scope?.[item.scopeKey] : null}
          />
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        {isReview ? (
          <button
            type="button"
            onClick={() => toast.error('For Admin AC, not allowed to enter in Accounting')}
            title="For Admin AC, not allowed to enter in Accounting"
            className={`flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
          >
            <Lock className="h-4 w-4 shrink-0" /> {!collapsed && 'Accounting Panel'}
          </button>
        ) : (
          <NavLink
            to="/admin/master-accounting"
            onClick={() => setOpen(false)}
            title={collapsed ? 'Master Accounting' : undefined}
            className={`flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" /> {!collapsed && 'Master Accounting'}
          </NavLink>
        )}
      </div>
      <div className="border-t border-slate-100 p-3">
        {!collapsed && (
          <div className="mb-2 px-3 py-1">
            <p className="text-xs font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500">{isReview ? 'Demo Account (Read Only)' : 'Super Admin'}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="h-4 w-4" /> {!collapsed && 'Logout'}
        </button>
        <div className={`mt-2 flex items-center gap-1.5 px-3 text-[11px] text-slate-400 ${collapsed ? 'justify-center px-0' : ''}`} title={`Last updated ${lastUpdated}`}>
          <Clock className="h-3 w-3 shrink-0" />
          {!collapsed && <span>Last updated {lastUpdated}</span>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      <div className={`relative hidden md:flex md:flex-col md:border-r md:border-slate-200 md:bg-white transition-all duration-200 ${collapsed ? 'md:w-[72px]' : 'md:w-60'}`}>
        <Sidebar collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-slate-100">
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <img src="/logo.webp" alt="Validstep" className="h-6 w-6 rounded object-contain" />
          <span className="font-semibold text-slate-900">Admin Panel</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 md:px-6">
          <SystemStatusBadge />
          <div className="flex items-center gap-3">
            {whoami?.ip && (
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-600" title="Your current IP address (logged in as this admin)">
                <Wifi className="h-3.5 w-3.5 text-slate-400" />
                {whoami.ip}
              </span>
            )}
            <span className="font-mono text-xs text-slate-500">
              {now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
            </span>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Globe className="h-3.5 w-3.5" />
              Go to Website
            </a>
          </div>
        </div>
        {isReview && !noticeDismissed && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 md:px-6">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">
              For company and customer privacy and security, this Admin AC has been granted access to only 2 customers' transaction data. All other records, along with full admin actions, features and Master Accounting, are prohibited for this account.
            </span>
            <button
              onClick={() => setNoticeDismissed(true)}
              title="Dismiss"
              className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <main className="relative flex-1 overflow-auto p-4 md:p-6">
          {isReview && (
            <>
              <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center overflow-hidden">
                <span className="rotate-[-30deg] select-none whitespace-nowrap text-6xl font-bold text-slate-900/[0.06] md:text-8xl">
                  Admin AC — VIEW ONLY
                </span>
              </div>
              <div className="pointer-events-none fixed bottom-3 right-3 z-30 max-w-[260px] rounded-lg bg-slate-900/5 px-3 py-2 text-right text-[10px] leading-tight text-slate-400">
                <p className="font-semibold text-slate-500">View Only Mode Access Granted</p>
                {whoami?.geo && (
                  <p className="mt-0.5">
                    IP: {whoami.geo.ip}{whoami.geo.local && ' (local)'}
                    {whoami.geo.city && ` · ${[whoami.geo.city, whoami.geo.region, whoami.geo.country].filter(Boolean).join(', ')}`}
                    {whoami.geo.isp && ` · ${whoami.geo.isp}`}
                  </p>
                )}
              </div>
            </>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
