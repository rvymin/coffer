// Custom recharts legend: small dots + micro-caps labels that match the design system
// instead of the library's default boxed legend swatches.
export default function ChartLegend({
  payload,
}: {
  payload?: ReadonlyArray<{ value?: string | number; color?: string }>
}) {
  if (!payload || payload.length === 0) return null
  return (
    <div className="chart-legend">
      {payload.map((entry) => (
        <span key={String(entry.value)} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  )
}
