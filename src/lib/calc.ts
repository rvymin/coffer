import type { Transaction } from './types'

export function monthOf(dateIso: string): string {
  return dateIso.slice(0, 7)
}

export function monthlyTotals(transactions: Transaction[], month: string) {
  let income = 0
  let expense = 0
  for (const tx of transactions) {
    if (monthOf(tx.date) !== month) continue
    if (tx.kind === 'income') income += tx.amount
    else if (tx.kind === 'expense') expense += tx.amount
  }
  return { income, expense }
}

export function spendingByCategory(transactions: Transaction[], month: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.kind !== 'expense' || monthOf(tx.date) !== month || !tx.categoryId) continue
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount)
  }
  return map
}

export function monthlySeries(transactions: Transaction[], months: string[]) {
  return months.map((month) => ({ month, ...monthlyTotals(transactions, month) }))
}

// Inclusive list of 'YYYY-MM' months from fromMonth through toMonth.
export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  const months: string[] = []
  let y = fy
  let m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

export function spendingByCategoryInRange(transactions: Transaction[], from: string, to: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.kind !== 'expense' || tx.date < from || tx.date > to || !tx.categoryId) continue
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount)
  }
  return map
}
