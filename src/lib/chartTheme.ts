import type { CSSProperties } from 'react'

// Shared recharts styling so every tooltip/legend across the app looks like part of the same
// design system instead of the library's default plain white square box.
export const tooltipContentStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
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

export const legendWrapperStyle: CSSProperties = {
  fontSize: 12.5,
  fontFamily: 'var(--sans)',
  color: 'var(--text-dim)',
  paddingTop: 8,
}

// Shared spacing so every chart's plot area breathes the same amount, and axis tick labels never
// crowd the origin corner where the X and Y axes meet.
export const chartMargin = { top: 10, right: 14, bottom: 4, left: 4 }
export const axisTickMargin = 10
