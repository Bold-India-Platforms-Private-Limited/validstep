import { useState } from 'react'
import { formatCurrency } from '../../utils/formatDate'

function compactINR(v) {
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K`
  return `${sign}₹${abs.toFixed(0)}`
}

function niceCeil(value) {
  if (value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const fraction = value / base
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * base
}

/**
 * Two-series grouped bar chart (e.g. Revenue vs Expense, Credit vs Debit) — one
 * bar pair per period. Colors are the validated green/red categorical pair
 * (dataviz skill: `node scripts/validate_palette.js "#008300,#e34948" --mode light`
 * passes lightness, chroma, CVD-separation, and contrast checks), matching the
 * credit/debit color convention already used in the tables on this page — so a
 * reader never sees the same data colored two different ways.
 */
export function GroupedBarChart({ title, subtitle, data, series, height = 220 }) {
  const [hover, setHover] = useState(null) // { groupIndex, seriesIndex, x, y }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        <p className="mt-6 pb-6 text-center text-sm text-slate-400">No data in this period yet.</p>
      </div>
    )
  }

  const paddingLeft = 52, paddingRight = 12, paddingTop = 12, paddingBottom = 28
  const groupSlot = 76
  const width = paddingLeft + paddingRight + data.length * groupSlot
  const plotWidth = width - paddingLeft - paddingRight
  const plotHeight = height - paddingTop - paddingBottom

  const maxRaw = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)))
  const niceMax = niceCeil(maxRaw)
  const yScale = (v) => paddingTop + plotHeight - (Math.max(0, v) / niceMax) * plotHeight

  const groupWidth = plotWidth / data.length
  const barWidth = Math.min(24, (groupWidth - 12) / series.length)
  const gridFractions = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg width={width} height={height} className="block">
          {gridFractions.map((f) => {
            const y = paddingTop + plotHeight - f * plotHeight
            return (
              <g key={f}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e1e0d9" strokeWidth={1} />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#898781">
                  {compactINR(niceMax * f)}
                </text>
              </g>
            )
          })}
          <line x1={paddingLeft} y1={paddingTop + plotHeight} x2={width - paddingRight} y2={paddingTop + plotHeight} stroke="#c3c2b7" strokeWidth={1} />

          {data.map((d, gi) => {
            const groupX = paddingLeft + gi * groupWidth
            const groupInnerWidth = barWidth * series.length + 2 * (series.length - 1)
            const startX = groupX + (groupWidth - groupInnerWidth) / 2
            return (
              <g key={d.period}>
                {series.map((s, si) => {
                  const value = d[s.key] || 0
                  const barX = startX + si * (barWidth + 2)
                  const barY = yScale(value)
                  const barHeight = Math.max(0, paddingTop + plotHeight - barY)
                  const isHovered = hover && hover.groupIndex === gi && hover.seriesIndex === si
                  return (
                    <rect
                      key={s.key}
                      x={barX}
                      y={barHeight > 0 ? barY : paddingTop + plotHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={4}
                      fill={s.color}
                      opacity={isHovered ? 0.85 : 1}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect()
                        setHover({ groupIndex: gi, seriesIndex: si, x: rect.left + barX + barWidth / 2, y: rect.top + barY })
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
                <text x={groupX + groupWidth / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="#898781">
                  {d.period}
                </text>
              </g>
            )
          })}
        </svg>

        {hover && (
          <div
            className="pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{ left: hover.x, top: hover.y - 8 }}
          >
            <p className="font-semibold">{data[hover.groupIndex].period} · {series[hover.seriesIndex].label}</p>
            <p>{formatCurrency(data[hover.groupIndex][series[hover.seriesIndex].key] || 0)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
