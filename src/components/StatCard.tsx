import { Eye, EyeOff } from 'lucide-react'
import type { ComponentType } from 'react'
import Tooltip from './Tooltip'

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hidden,
  onToggleHide,
}: {
  label: string
  value: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  tone?: 'income' | 'expense'
  hidden: boolean
  onToggleHide: () => void
}) {
  return (
    <div className="card stat-card">
      <button
        className={`stat-hide-btn${hidden ? ' active' : ''}`}
        onClick={onToggleHide}
        aria-label={hidden ? 'Show value' : 'Hide value'}
      >
        {hidden ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
      </button>
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
      <div className={`stat-icon${tone ? ` ${tone}` : ''}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
    </div>
  )
}
