import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/** Catches render-time crashes anywhere below it and shows the actual error instead of a
 * blank white page — a render error with no boundary unmounts the whole React tree. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
            <p className="mt-1 max-w-md text-sm text-slate-500">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
