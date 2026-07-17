import { Children, isValidElement, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface OptionData {
  value: string
  label: ReactNode
}

// Drop-in replacement for the native <select>. Chromium/Windows renders a select's open option
// list as a native popup that only follows the OS light/dark setting — it can't be themed to
// match the app's own accent colors or its manual theme toggle, so it always looks out of place.
// This renders the list itself (`position: fixed`, same escape-the-card trick as Tooltip) so it's
// themed exactly like the rest of Coffer. No wrapper element — the trigger button sizes exactly
// like a native <select> would in every layout context (toolbar row, form-field column, table cell).
export default function Select({
  value,
  onChange,
  children,
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const options: OptionData[] = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => ({
      value: String((child.props as { value: unknown }).value),
      label: (child.props as { children: ReactNode }).children,
    }))

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : ''

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleScrollOrResize(e: Event) {
      // Scrolling inside our own option list (when it has more items than fit) fires a native
      // 'scroll' event too — since capture-phase listeners on window see it, don't treat that as
      // "the page scrolled out from under us" and close the list on the user mid-scroll.
      if (e.target instanceof Node && listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.children[highlighted]?.scrollIntoView({ block: 'nearest' })
  }, [open, highlighted])

  function openList() {
    if (disabled) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(index: number) {
    const opt = options[index]
    if (!opt) return
    onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(highlighted)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`app-select-trigger${open ? ' open' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={15} strokeWidth={2.25} className="app-select-chevron" />
      </button>
      {open && pos && (
        <ul
          className="app-select-list"
          role="listbox"
          ref={listRef}
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`app-select-option${opt.value === value ? ' selected' : ''}${i === highlighted ? ' highlighted' : ''}`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
