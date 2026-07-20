import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Drop-in replacement for the native `title` attribute — that renders as an OS tooltip that can't
// be restyled, so anywhere we need a "full value on hover" affordance (e.g. a truncated number)
// uses this instead. The popup is portaled to <body> and positioned via getBoundingClientRect +
// `position: fixed`: glass cards use backdrop-filter, which makes each card a containing block for
// fixed-position descendants — an inline popup would be positioned relative to the card (landing
// in the wrong place) and trapped in the card's stacking context (painted behind sibling cards).
export default function Tooltip({
  content,
  children,
  alwaysShow = false,
}: {
  content: string
  children: ReactNode
  // Most usages wrap a value that's only sometimes truncated (stat cards, balances) and should
  // stay silent when the full value already fits. Icon-only tooltips (e.g. the recurring badge)
  // aren't standing in for clipped text, so they opt into always showing.
  alwaysShow?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  function show() {
    const el = ref.current
    if (!el) return
    if (!alwaysShow) {
      const parent = el.parentElement
      const truncated = !!parent && parent.scrollWidth > parent.clientWidth + 1
      if (!truncated) return
    }
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.top, left: rect.left })
  }

  return (
    <span
      ref={ref}
      className="app-tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos &&
        createPortal(
          <span className="app-tooltip" style={{ top: pos.top - 8, left: pos.left }}>
            {content}
          </span>,
          document.body
        )}
    </span>
  )
}
