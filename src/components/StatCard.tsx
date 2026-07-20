import type { ComponentType } from 'react'
import Tooltip from './Tooltip'

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hidden,
}: {
  label: string
  value: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  tone?: 'income' | 'expense'
  hidden: boolean
}) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon${tone ? ` ${tone}` : ''}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="stat-text">
        <div className="stat-label">{label}</div>
        <div className={`stat-value${tone ? ` ${tone}` : ''}`}>
          {hidden ? (
            '••••••'
          ) : (
            <Tooltip content={value}>
              <span>{value}</span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}
