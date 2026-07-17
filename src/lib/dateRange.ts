import { currentMonth, todayIso } from './format'

export type RangePreset = 'thisMonth' | 'last3' | 'last6' | 'last12' | 'thisYear' | 'allTime' | 'custom'

export const RANGE_PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'thisMonth', label: 'This month' },
  { value: 'last3', label: 'Last 3 months' },
  { value: 'last6', label: 'Last 6 months' },
  { value: 'last12', label: 'Last 12 months' },
  { value: 'thisYear', label: 'This year' },
  { value: 'allTime', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

export interface DateRange {
  from: string
  to: string
}

function firstOfMonthMonthsAgo(monthsAgo: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// transactionDates only matters for the 'allTime' preset, so a range never excludes real data —
// it spans from the earliest transaction through the later of today or the latest transaction
// (covering the rare case of a future-dated entry).
export function resolveRange(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
  transactionDates: string[],
): DateRange {
  const today = todayIso()
  switch (preset) {
    case 'custom':
      return { from: customFrom || today, to: customTo || today }
    case 'allTime': {
      if (transactionDates.length === 0) return { from: today, to: today }
      const from = transactionDates.reduce((min, d) => (d < min ? d : min))
      const to = transactionDates.reduce((max, d) => (d > max ? d : max), today)
      return { from, to }
    }
    case 'thisMonth':
      return { from: `${currentMonth()}-01`, to: today }
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
    case 'last3':
      return { from: firstOfMonthMonthsAgo(2), to: today }
    case 'last12':
      return { from: firstOfMonthMonthsAgo(11), to: today }
    case 'last6':
    default:
      return { from: firstOfMonthMonthsAgo(5), to: today }
  }
}

export function formatRangeLabel(preset: RangePreset, range: DateRange): string {
  if (preset !== 'custom') {
    return RANGE_PRESET_OPTIONS.find((o) => o.value === preset)?.label.toLowerCase() ?? ''
  }
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(range.from)} – ${fmt(range.to)}`
}
