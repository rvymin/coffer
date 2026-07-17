import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'finance-tracker:hidden-stats'

function load(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useHiddenStats() {
  const [hidden, setHidden] = useState<Record<string, boolean>>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden))
  }, [hidden])

  const toggle = useCallback((key: string) => {
    setHidden((h) => ({ ...h, [key]: !h[key] }))
  }, [])

  const isHidden = useCallback((key: string) => Boolean(hidden[key]), [hidden])

  return { isHidden, toggle }
}
