// A ceiling for any single monetary field. Comfortably above any real personal-finance figure
// (the wealthiest individuals on earth don't clear ~$500B, let alone a single account/transaction
// line item), while blocking fat-finger entries like an extra zero or two typed by mistake.
export const MAX_AMOUNT = 999_999_999.99

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
