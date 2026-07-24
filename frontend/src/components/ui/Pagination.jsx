import { useEffect, useState } from 'react'

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100]

/** Windowed page list with ellipsis markers, e.g. [1, '…', 5, 6, 7, 8, 9, '…', 20]. */
function buildPageWindow(current, total, windowSize = 1) {
  const pages = []
  const add = (n) => pages.push(n)

  add(1)
  const start = Math.max(2, current - windowSize)
  const end = Math.min(total - 1, current + windowSize)

  if (start > 2) add('ellipsis-start')
  for (let n = start; n <= end; n++) add(n)
  if (end < total - 1) add('ellipsis-end')
  if (total > 1) add(total)

  return pages
}

/**
 * Shared pagination bar: numbered pages with ellipsis, first/prev/next/last controls,
 * optional per-page selector, optional jump-to-page with an explicit Go button.
 * Renders nothing when there's only one page and no per-page control to show.
 */
export function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
}) {
  const [jumpValue, setJumpValue] = useState(String(page))

  useEffect(() => { setJumpValue(String(page)) }, [page])

  if ((!pages || pages <= 1) && !onLimitChange) return null

  const totalPages = pages || 1

  const goToPage = (n) => {
    const clamped = Math.max(1, Math.min(totalPages, n))
    if (clamped !== page) onPageChange(clamped)
  }

  const commitJump = () => {
    const n = parseInt(jumpValue, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      goToPage(n)
    } else {
      setJumpValue(String(page))
    }
  }

  const pageWindow = buildPageWindow(page, totalPages)

  const navButtonClass =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages}{total != null ? ` · ${total} total` : ''}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onLimitChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Per page
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {limitOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={page === 1}
              aria-label="First page"
              className={navButtonClass}
            >
              «
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              className={navButtonClass}
            >
              ‹
            </button>

            {pageWindow.map((p) =>
              typeof p === 'number' ? (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={
                    p === page
                      ? 'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-primary-600 px-2 text-xs font-semibold text-white'
                      : navButtonClass
                  }
                >
                  {p}
                </button>
              ) : (
                <span key={p} className="px-1 text-xs text-slate-400">…</span>
              )
            )}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              className={navButtonClass}
            >
              ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
              className={navButtonClass}
            >
              »
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            Jump to
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitJump() }}
              className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={commitJump}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Go
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
