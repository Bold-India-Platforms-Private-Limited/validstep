import { Link } from 'react-router-dom'
import { Award } from 'lucide-react'

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Award className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-800">ListedIndia Verify</span>
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
