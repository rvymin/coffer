import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'finance-tracker:hidden-stats'

// Global privacy toggle: one switch masks every amount on the dashboard (hero, hero chips,
// stat cards, recent-transaction amounts) plus the sidebar net-worth chip. Older versions
// stored a per-card map — if one is found, migrate to hidden when any card was hidden.
function load(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'boolean') return parsed
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed as Record<string, unknown>).some(Boolean)
    }
    return false
  } catch {
    return false
  }
}

export function useHiddenStats() {
  const [hidden, setHidden] = useState<boolean>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden))
  }, [hidden])

  const toggle = useCallback(() => setHidden((h) => !h), [])

  return { hidden, toggle }
}
