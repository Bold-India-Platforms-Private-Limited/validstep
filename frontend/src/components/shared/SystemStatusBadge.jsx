import { useEffect, useState } from 'react'

// Pings the backend's /health endpoint so callers reflect the API's real, live
// state rather than a hardcoded claim.
export function SystemStatusBadge({ dark = false }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'operational' | 'down'

  useEffect(() => {
    let cancelled = false
    const healthUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') + '/health'

    const check = async () => {
      try {
        const res = await fetch(healthUrl, { cache: 'no-store' })
        if (!cancelled) setStatus(res.ok ? 'operational' : 'down')
      } catch {
        if (!cancelled) setStatus('down')
      }
    }

    check()
    const id = setInterval(check, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (status === 'checking') return null

  const isUp = status === 'operational'

  if (dark) {
    return (
      <span
        title={isUp ? 'All systems operational' : 'Service temporarily unavailable'}
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${isUp ? 'text-gray-400' : 'text-red-400'}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isUp ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {isUp ? 'All Systems Operational' : 'Service Unavailable'}
      </span>
    )
  }

  return (
    <span
      title={isUp ? 'All systems operational' : 'Service temporarily unavailable'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
        isUp ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isUp ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
      {isUp ? 'All Systems Operational' : 'Service Unavailable'}
    </span>
  )
}
