import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'finance-tracker:theme'

function load(): ThemePreference {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
    if (theme === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])

  return { theme, setTheme }
}
