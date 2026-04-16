import { cn } from '../../utils/cn'

const variants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ children, variant = 'default', className, dot = false, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger' && 'bg-red-500',
            variant === 'primary' && 'bg-primary-500',
            variant === 'default' && 'bg-slate-500',
            variant === 'info' && 'bg-sky-500',
          )}
        />
      )}
      {children}
    </span>
  )
}

export function PaymentStatusBadge({ status }) {
  const map = {
    PAID: { variant: 'success', label: 'Paid' },
    PENDING: { variant: 'warning', label: 'Pending' },
    FAILED: { variant: 'danger', label: 'Failed' },
    REFUNDED: { variant: 'info', label: 'Refunded' },
  }
  const config = map[status] || { variant: 'default', label: status }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function BatchStatusBadge({ status }) {
  const map = {
    ACTIVE: { variant: 'success', label: 'Active' },
    DRAFT: { variant: 'default', label: 'Draft' },
    COMPLETED: { variant: 'info', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  }
  const config = map[status] || { variant: 'default', label: status }
  return <Badge variant={config.variant} dot>{config.label}</Badge>
}

export function CompanyStatusBadge({ isActive }) {
  return isActive
    ? <Badge variant="success" dot>Active</Badge>
    : <Badge variant="danger" dot>Inactive</Badge>
}
