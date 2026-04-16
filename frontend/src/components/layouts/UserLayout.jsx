import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Award, LogOut, Menu, X, LayoutDashboard, FileText, ChevronDown } from 'lucide-react'
import { selectCurrentUser, logout } from '../../store/authSlice'
import axiosClient from '../../api/axiosClient'
import toast from 'react-hot-toast'
import { cn } from '../../utils/cn'

export function UserLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const user = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await axiosClient.post('/auth/logout')
    } catch {
      // ignore
    }
    dispatch(logout())
    navigate('/auth/user/login')
    toast.success('Logged out successfully')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Award className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Validstep.com</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden gap-1 sm:flex">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                  )
                }
              >
                <LayoutDashboard className="h-4 w-4" />
                My Certificates
              </NavLink>
            </nav>

            <div className="flex items-center gap-3">
              {/* User menu */}
              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block font-medium">{user?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-xl"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu btn */}
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 sm:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="border-t border-slate-100 px-4 py-3 sm:hidden">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <FileText className="h-4 w-4" />
              My Certificates
            </NavLink>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
