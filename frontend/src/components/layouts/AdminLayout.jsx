import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useLogoutMutation } from '../../store/api/authApi'
import { clearCredentials, selectUser } from '../../store/authSlice'
import {
  LayoutDashboard, Building2, Layers, DollarSign,
  CreditCard, LogOut, Menu, X, FileText, ShieldCheck, Users,
  PanelLeftClose, PanelLeftOpen, Clock, ClipboardList, BarChart3, Globe, Wifi,
} from 'lucide-react'
import { SystemStatusBadge } from '../shared/SystemStatusBadge'
import { useGetAdminWhoamiQuery } from '../../store/api/adminApi'

const nav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/companies', icon: Building2, label: 'Organizations' },
  { to: '/admin/batches', icon: Layers, label: 'Batches' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/order-log', icon: ClipboardList, label: 'Order' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { to: '/admin/invoices', icon: FileText, label: 'Invoices' },
  { to: '/admin/pricing', icon: DollarSign, label: 'Pricing' },
]

function NavItem({ to, icon: Icon, label, onClick, collapsed }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100'}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />{!collapsed && label}
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
        {nav.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} onClick={() => setOpen(false)} />)}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <NavLink
          to="/admin/master-accounting"
          onClick={() => setOpen(false)}
          title={collapsed ? 'Master Accounting' : undefined}
          className={`flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" /> {!collapsed && 'Master Accounting'}
        </NavLink>
      </div>
      <div className="border-t border-slate-100 p-3">
        {!collapsed && (
          <div className="mb-2 px-3 py-1">
            <p className="text-xs font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500">Super Admin</p>
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
              <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-500 sm:flex" title="Your current IP address">
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
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
