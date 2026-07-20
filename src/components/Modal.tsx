import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
