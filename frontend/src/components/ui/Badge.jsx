const variants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
}

export function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    PAID: 'success', SUCCESS: 'success', ACTIVE: 'success',
    PENDING: 'warning', PROCESSING: 'warning', DRAFT: 'default',
    FAILED: 'danger', FAILURE: 'danger', COMPLETED: 'info',
    HOLD: 'warning', REFUNDED: 'info', INITIATED: 'default',
  }
  return <Badge variant={map[status] || 'default'}>{status}</Badge>
}
