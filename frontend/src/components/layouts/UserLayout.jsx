import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useLogoutMutation } from '../../store/api/authApi'
import { clearCredentials, selectUser } from '../../store/authSlice'
import { LogOut, User, FileText, Home, ShoppingBag, MessageSquareText } from 'lucide-react'

const TABS = [
  { to: '/dashboard', label: 'Home', icon: Home, exact: true },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/dashboard/support', label: 'Support', icon: MessageSquareText },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
]

export function UserLayout({ children }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(selectUser)
  const [logout] = useLogoutMutation()

  const handleLogout = async () => {
    try { await logout().unwrap() } catch { /* ignore */ }
    dispatch(clearCredentials())
    navigate('/')
  }

  const isActive = (tab) => (tab.exact ? location.pathname === tab.to : location.pathname.startsWith(tab.to))

  // Certificate detail page gets its own native-app-style topbar (back button + title) on
  // mobile instead of the full site header — the header stays put on desktop.
  const isCertDetail = /^\/dashboard\/certificates\//.test(location.pathname)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className={`border-b border-slate-200 bg-white shadow-sm ${isCertDetail ? 'max-md:hidden' : ''}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
            <img src="/logo.webp" alt="Validstep" className="h-8 w-auto" />
          </Link>

          {/* Desktop/tablet nav — the bottom tab bar below covers mobile instead */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {TABS.map((tab) => {
              const active = isActive(tab)
              const Icon = tab.icon
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-primary-50 text-primary-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/dashboard/invoices"
              className={`flex items-center gap-1.5 rounded-lg text-sm transition-colors max-md:h-9 max-md:w-9 max-md:justify-center max-md:rounded-full max-md:bg-slate-100 max-md:active:bg-slate-200 ${
                location.pathname === '/dashboard/invoices' ? 'text-primary-600' : 'text-slate-600 hover:text-primary-600'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> <span className="max-md:hidden">Invoices</span>
            </Link>
            <span className="hidden text-sm text-slate-600 lg:block">
              <User className="inline h-3.5 w-3.5 mr-1" />{user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors max-md:h-9 max-md:w-9 max-md:justify-center max-md:rounded-full max-md:border-0 max-md:bg-slate-100 max-md:px-0 max-md:active:bg-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" /> <span className="max-md:hidden">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-5xl px-4 py-6 max-md:pb-24 ${isCertDetail ? 'max-md:pt-0' : ''}`}>{children}</main>

      {/* Native-app-style bottom tab bar — mobile viewport only */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${active ? 'text-primary-600' : 'text-slate-400'}`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : 'text-slate-400'}`} strokeWidth={active ? 2.4 : 2} />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
