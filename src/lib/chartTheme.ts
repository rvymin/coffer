import type { CSSProperties } from 'react'

// Shared recharts styling so every tooltip/legend across the app looks like part of the same
// design system instead of the library's default plain white square box. Tooltips are frosted
// glass like every other floating surface.
export const tooltipContentStyle: CSSProperties = {
  background: 'var(--glass-strong)',
  backdropFilter: 'blur(16px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)',
  padding: '8px 12px',
  fontSize: 12.5,
  fontFamily: 'var(--sans)',
}

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--text-dim)',
  fontWeight: 600,
  marginBottom: 4,
}

export const tooltipItemStyle: CSSProperties = {
  color: 'var(--text-h)',
  fontSize: 12.5,
  fontWeight: 500,
}

// Compact axis labels: full currency strings like "$210,000.00" overflow the fixed Y-axis
// gutter and get visually clipped, so chart axes use short $k/$M forms instead. Tooltips
// and cards still show the exact figures via formatMoney.
export function formatAxisMoney(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`
  return `${sign}$${Math.round(abs)}`
}

// Y-axis gutter width, sized for compact formatAxisMoney labels ("-$1.2M" ≈ 40px at 12px)
// so tick labels never clip no matter how large the amounts get.
export const yAxisWidth = 56

// Shared spacing so every chart's plot area breathes the same amount, and axis tick labels never
// crowd the origin corner where the X and Y axes meet.
export const chartMargin = { top: 10, right: 14, bottom: 4, left: 4 }
export const axisTickMargin = 10

// Gridlines and axis text read from the theme tokens so charts restyle themselves across all
// three theme paths (system light/dark, manual data-theme) with no JS theme detection.
export const gridStroke = 'var(--grid-line)'
export const axisStroke = 'var(--text-dim)'

// Harmonious categorical palette for multi-series charts (e.g. the all-debts payoff forecast).
// Emerald-led to match the brand, with coral/amber/teal/blue for separation; each entry is a
// --chart-* token so it brightens appropriately in dark mode.
export const seriesColors = [
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-2)',
]
