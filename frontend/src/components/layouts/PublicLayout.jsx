import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PublicLayout({ children, mainClassName = '', showBackToHome = false }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src="/logo.webp" alt="Validstep" className="h-8 w-auto" />
            </Link>
            {showBackToHome && (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-violet-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className={`flex-1 ${mainClassName}`}>{children}</main>
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
          <Link to="/" className="hover:text-violet-600">Home</Link>
          <Link to="/about" className="hover:text-violet-600">About</Link>
          <Link to="/contact" className="hover:text-violet-600">Contact</Link>
          <Link to="/terms" className="hover:text-violet-600">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-violet-600">Privacy Policy</Link>
          <Link to="/refund" className="hover:text-violet-600">Refund Policy</Link>
          <Link to="/delivery" className="hover:text-violet-600">Delivery Policy</Link>
        </div>
      </footer>
    </div>
  )
}
