import { cn } from '../../utils/cn'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export function Table({ children, className }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function TableHeader({ children }) {
  return <thead className="bg-slate-50">{children}</thead>
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TableRow({ children, className, onClick, selected }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-slate-50',
        selected && 'bg-primary-50',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className, sortable, sorted, onSort }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500',
        sortable && 'cursor-pointer select-none hover:text-slate-700',
        className,
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="text-slate-400">
            {sorted === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </span>
        )}
      </div>
    </th>
  )
}

export function TableCell({ children, className, ...props }) {
  return (
    <td
      className={cn('px-4 py-3 text-slate-700 whitespace-nowrap', className)}
      {...props}
    >
      {children}
    </td>
  )
}

export function EmptyTableRow({ columns, message = 'No data found' }) {
  return (
    <tr>
      <td colSpan={columns} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl">📭</div>
          <p className="text-sm font-medium text-slate-600">{message}</p>
          <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
        </div>
      </td>
    </tr>
  )
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded bg-slate-200 animate-pulse" style={{ width: `${Math.random() * 40 + 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
