import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** Checkbox-list filter dropdown — lets the user pick any combination of values (e.g. several
 * transaction statuses at once) instead of only one at a time via a native <select>. */
export function MultiSelectDropdown({ label, options, selected, onChange, allLabel = 'All' }) {
  const [open, setOpen] = useState(false)

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const summary = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span className="text-slate-500">{label}:</span> {summary}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mb-1 w-full rounded px-2 py-1 text-left text-xs font-medium text-amber-700 hover:bg-amber-50"
              >
                Clear ({selected.length})
              </button>
            )}
            <div className="max-h-64 overflow-y-auto">
              {options.map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  {opt}
                </label>
              ))}
              {options.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">No options</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
