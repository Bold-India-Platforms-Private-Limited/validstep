import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { PublicLayout } from '../../components/layouts/PublicLayout'

export default function NotFound() {
  return (
    <PublicLayout showBackToHome>
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-7xl font-bold text-primary-600">404</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Page not found</h1>
          <p className="mt-3 text-slate-500 max-w-sm mx-auto">
            Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
