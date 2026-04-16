import { cn } from '../../utils/cn'

export function Spinner({ size = 'md', className }) {
  const sizeMap = {
    xs: 'h-3 w-3 border',
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
    xl: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={cn(
        'rounded-full border-slate-200 border-t-primary-600 animate-spin',
        sizeMap[size],
        className,
      )}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <Spinner size="xl" />
    </div>
  )
}

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200', className)}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
