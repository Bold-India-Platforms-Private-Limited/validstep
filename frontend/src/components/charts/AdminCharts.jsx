import { useState } from 'react'

// Shared chart primitives for the admin panel — plain SVG, no charting library.
// Colors follow the house categorical/status palette (validated for colorblind-safety).

export const SERIES_COLOR = { blue: '#2a78d6', violet: '#4a3aa7' }
export const STATUS_COLOR = { PAID: '#0ca30c', PENDING: '#fab219', REFUNDED: '#ec835a', FAILED: '#d03b3b' }

const CHART_H = 200
const CHART_W = 600
const PAD = { top: 16, right: 12, bottom: 24, left: 12 }

function niceMax(max) {
  if (max <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const n = max / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

export function AreaLineChart({ data, valueKey, formatValue, color = SERIES_COLOR.blue }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const max = niceMax(Math.max(1, ...data.map((d) => d[valueKey])))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const x = (i) => PAD.left + i * stepX
  const y = (v) => PAD.top + innerH - (v / max) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[valueKey])}`).join(' ')
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  const gradId = `area-grad-${color.replace('#', '')}`

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ height: 220 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g) => (
          <line key={g} x1={PAD.left} x2={CHART_W - PAD.right} y1={PAD.top + innerH * (1 - g)} y2={PAD.top + innerH * (1 - g)} stroke="#e1e0d9" strokeWidth="1" />
        ))}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.month}>
            <circle cx={x(i)} cy={y(d[valueKey])} r={hoverIdx === i ? 5 : 3} fill={color} stroke="#fcfcfb" strokeWidth="1.5" />
            <rect
              x={x(i) - stepX / 2} y={PAD.top} width={stepX || innerW} height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
            />
          </g>
        ))}
        {hoverIdx != null && (
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD.top} y2={PAD.top + innerH} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        )}
        {data.map((d, i) => (
          (i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
            <text key={d.month} x={x(i)} y={CHART_H - 6} fontSize="9" textAnchor="middle" fill="#898781">{d.label}</text>
          )
        ))}
      </svg>
      {hoverIdx != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
          style={{ left: `${(x(hoverIdx) / CHART_W) * 100}%`, top: `${(y(data[hoverIdx][valueKey]) / CHART_H) * 100}%` }}
        >
          {data[hoverIdx].label}: {formatValue(data[hoverIdx][valueKey])}
        </div>
      )}
    </div>
  )
}

export function MiniBarChart({ data, valueKey, formatValue, color = SERIES_COLOR.violet }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const max = niceMax(Math.max(1, ...data.map((d) => d[valueKey])))
  const gap = 4
  const barW = data.length > 0 ? innerW / data.length - gap : 0

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ height: 220 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={PAD.left} x2={CHART_W - PAD.right} y1={PAD.top + innerH * (1 - g)} y2={PAD.top + innerH * (1 - g)} stroke="#e1e0d9" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const h = Math.max(2, (d[valueKey] / max) * innerH)
          const bx = PAD.left + i * (barW + gap)
          const by = PAD.top + innerH - h
          return (
            <g key={d.month}>
              <rect x={bx} y={by} width={barW} height={h} rx="3" fill={color} opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.45} />
              <rect x={bx} y={PAD.top} width={barW} height={innerH} fill="transparent" onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))} />
            </g>
          )
        })}
        {data.map((d, i) => (
          (i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
            <text key={d.month} x={PAD.left + i * (barW + gap) + barW / 2} y={CHART_H - 6} fontSize="9" textAnchor="middle" fill="#898781">{d.label}</text>
          )
        ))}
      </svg>
      {hoverIdx != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
          style={{ left: `${((PAD.left + hoverIdx * (barW + gap) + barW / 2) / CHART_W) * 100}%`, top: `${(PAD.top / CHART_H) * 100}%` }}
        >
          {data[hoverIdx].label}: {formatValue(data[hoverIdx][valueKey])}
        </div>
      )}
    </div>
  )
}

/** Donut chart for a small categorical/status breakdown. data: [{label, value, color}] */
export function DonutChart({ data, centerLabel, centerValue }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 60
  const STROKE = 22
  const C = 2 * Math.PI * R
  const GAP = total > 0 ? 3 : 0 // degrees-equivalent gap between segments, in stroke units
  let cumulative = 0

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 160 160" width="160" height="160">
          <g transform="rotate(-90 80 80)">
            <circle cx="80" cy="80" r={R} fill="none" stroke="#e1e0d9" strokeWidth={STROKE} />
            {total > 0 && data.map((d, i) => {
              if (d.value === 0) return null
              const frac = d.value / total
              const dash = Math.max(0, frac * C - GAP)
              const offset = -cumulative
              cumulative += frac * C
              return (
                <circle
                  key={d.label}
                  cx="80" cy="80" r={R} fill="none"
                  stroke={d.color} strokeWidth={hoverIdx === i ? STROKE + 4 : STROKE}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  style={{ transition: 'stroke-width 120ms' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
                />
              )
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-slate-900">{hoverIdx != null ? data[hoverIdx].value : centerValue}</p>
          <p className="text-[10px] text-slate-500">{hoverIdx != null ? data[hoverIdx].label : centerLabel}</p>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div
            key={d.label}
            className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 text-xs transition-colors ${hoverIdx === i ? 'bg-slate-50' : ''}`}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="font-medium text-slate-700">{d.label}</span>
            <span className="text-slate-400">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
