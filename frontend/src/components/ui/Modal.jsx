import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, headerContent, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl', wide: 'max-w-[92vw]' }[size]

  // Rendered via portal straight into <body> — pages like AdminLayout nest content inside
  // overflow-hidden flex containers, which clip a merely-descendant `position: fixed`
  // overlay to that container's box instead of the true viewport (e.g. the overlay would
  // stop short of covering the top header bar). A portal escapes that entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative flex max-h-[94vh] w-full ${maxW} flex-col rounded-2xl bg-white shadow-2xl`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-6 py-3">
          {headerContent || <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
