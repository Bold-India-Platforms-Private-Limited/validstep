import { cn } from '../../utils/cn'

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-between border-b border-slate-100 px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={cn('text-base font-semibold text-slate-900', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-between border-t border-slate-100 px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatCard({ title, value, icon: Icon, change, changeLabel, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  }

  return (
    <Card>
      <CardContent className="flex items-start justify-between py-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {changeLabel && (
            <p className="mt-1 text-xs text-slate-500">
              {change !== undefined && (
                <span className={cn('font-medium', change >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {change >= 0 ? '+' : ''}{change}%{' '}
                </span>
              )}
              {changeLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-xl p-3', colorMap[color] || colorMap.indigo)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
