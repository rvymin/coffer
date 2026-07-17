import { CalendarRange } from 'lucide-react'
import { RANGE_PRESET_OPTIONS, type RangePreset } from '../lib/dateRange'
import Select from './Select'

export default function DateRangePicker({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: {
  preset: RangePreset
  customFrom: string
  customTo: string
  onPresetChange: (preset: RangePreset) => void
  onCustomFromChange: (date: string) => void
  onCustomToChange: (date: string) => void
}) {
  return (
    <div className="date-range-picker">
      <span className="date-range-label">
        <CalendarRange size={14} strokeWidth={2.25} />
        Date range
      </span>
      <Select value={preset} onChange={(v) => onPresetChange(v as RangePreset)}>
        {RANGE_PRESET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {preset === 'custom' && (
        <div className="date-range-custom">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            aria-label="From date"
          />
          <span>to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            aria-label="To date"
          />
        </div>
      )}
    </div>
  )
}
