// Calendar-date helpers in the user's LOCAL timezone. Never build YYYY-MM-DD
// strings with Date.toISOString() — it returns UTC, which can be a calendar
// day off from local time and would post recurring transactions or name
// backup files with the wrong date.
export function localDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocalIso(): string {
  return localDateIso(new Date())
}
