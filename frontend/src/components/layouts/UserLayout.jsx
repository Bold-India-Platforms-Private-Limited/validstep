import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useLogoutMutation } from '../../store/api/authApi'
import { clearCredentials, selectUser } from '../../store/authSlice'
import { Award, LogOut, User } from 'lucide-react'

export function UserLayout({ children }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const [logout] = useLogoutMutation()

  const handleLogout = async () => {
    try { await logout().unwrap() } catch { /* ignore */ }
    dispatch(clearCredentials())
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Award className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Validstep</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">
              <User className="inline h-3.5 w-3.5 mr-1" />{user?.name}
            </span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
