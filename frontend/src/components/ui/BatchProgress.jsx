import { formatDate } from '../../utils/formatDate'

/** Visual progress of a batch's duration — today's position between start_date and end_date. */
export function BatchProgress({ startDate, endDate, issuedAt, certificateDeliveryDate }) {
  if (!startDate || !endDate) return null

  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const pct = Math.round(Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)))
  const expectedDate = certificateDeliveryDate || endDate

  const statusLabel = issuedAt
    ? `Delivered ${formatDate(issuedAt)}`
    : now < start
      ? `Starts ${formatDate(startDate)}`
      : now > end
        ? 'Wrapping up — certificate pending'
        : `${pct}% complete`

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${issuedAt ? 'bg-emerald-500' : 'bg-primary-500'}`}
          style={{ width: `${issuedAt ? 100 : pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{statusLabel}</span>
        <span>{issuedAt ? 'Issued' : `Expected by ${formatDate(expectedDate)}`}</span>
      </div>
    </div>
  )
}
