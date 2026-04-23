import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useLogoutMutation } from '../../store/api/authApi'
import { clearCredentials, selectUser } from '../../store/authSlice'
import {
  LayoutDashboard, FolderOpen, Layers, User, CreditCard,
  LogOut, Menu, X, Award, FileText,
} from 'lucide-react'

const nav = [
  { to: '/company/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/company/programs', icon: FolderOpen, label: 'Programs' },
  { to: '/company/batches', icon: Layers, label: 'Batches' },
  { to: '/company/payments', icon: CreditCard, label: 'Payments' },
  { to: '/company/invoices', icon: FileText, label: 'Invoices' },
  { to: '/company/profile', icon: User, label: 'Profile' },
]

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

export function CompanyLayout({ children }) {
  const [open, setOpen] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const [logout] = useLogoutMutation()

  const handleLogout = async () => {
    try { await logout().unwrap() } catch { /* ignore */ }
    dispatch(clearCredentials())
    navigate('/auth/company/login')
  }

  const Sidebar = ({ mobile }) => (
    <div className={`flex h-full flex-col ${mobile ? '' : 'w-60 border-r border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Award className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-900">Validstep</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />)}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 px-3 py-1">
          <p className="text-xs font-medium text-slate-900 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:w-60 md:border-r md:border-slate-200 md:bg-white">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-500" />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-slate-100">
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-900">Validstep</span>
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
