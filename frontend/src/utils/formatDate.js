import { format, parseISO, isValid } from 'date-fns'

/**
 * Format a date string or Date object to "01 Apr 2026" format
 */
export function formatDate(date) {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

/**
 * Format a date string or Date object to "01 Apr 2026, 10:30 AM" format
 */
export function formatDateTime(date) {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd MMM yyyy, hh:mm a')
  } catch {
    return '—'
  }
}

/**
 * Format a date for input[type=date] (YYYY-MM-DD)
 */
export function formatDateInput(date) {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return ''
    return format(d, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}
