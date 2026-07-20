import { addMonths, format } from 'date-fns'
import type { Debt } from './types'

const MAX_MONTHS = 600
const EPSILON = 0.005
// Real lenders adjust the final payment on a loan by a few cents to a few dollars so it zeroes out
// exactly on schedule. This app applies the same fixed payment every month, so a payment rounded to
// the cent can leave a trivial residual after the "official" last payment. Folding anything under this
// amount into the same month avoids reporting a phantom extra month for what is really just rounding.
const FINAL_PAYMENT_TOLERANCE = 1

export interface DebtForecast {
  months: number | null
  payoffDate: string | null
  totalInterest: number | null
  payable: boolean
}

export function forecastPayoff(balance: number, interestRatePercent: number, monthlyPayment: number): DebtForecast {
  if (balance <= 0) {
    return { months: 0, payoffDate: format(new Date(), 'yyyy-MM-dd'), totalInterest: 0, payable: true }
  }
  if (monthlyPayment <= 0) {
    return { months: null, payoffDate: null, totalInterest: null, payable: false }
  }

  const monthlyRate = interestRatePercent / 100 / 12
  let remaining = balance
  let totalInterest = 0
  let months = 0

  while (remaining > EPSILON && months < MAX_MONTHS) {
    const interest = remaining * monthlyRate
    const principal = monthlyPayment - interest
    if (principal <= 0) {
      return { months: null, payoffDate: null, totalInterest: null, payable: false }
    }
    totalInterest += interest
    remaining -= principal
    months += 1
    if (remaining > EPSILON && remaining <= FINAL_PAYMENT_TOLERANCE) {
      remaining = 0
    }
  }

  if (remaining > EPSILON) {
    return { months: null, payoffDate: null, totalInterest: null, payable: false }
  }

  const payoffDate = format(addMonths(new Date(), months), 'yyyy-MM-dd')
  return { months, payoffDate, totalInterest: Math.round(totalInterest * 100) / 100, payable: true }
}

export interface ForecastPoint {
  label: string
  balance: number
}

function isForecastable(d: Debt): boolean {
  const monthlyRate = d.interestRate / 100 / 12
  return d.currentBalance > 0 && d.monthlyPayment > monthlyRate * d.currentBalance
}

export function singleDebtForecastSeries(debt: Debt): ForecastPoint[] {
  if (!isForecastable(debt)) return []

  const rate = debt.interestRate / 100 / 12
  let balance = debt.currentBalance
  const series: ForecastPoint[] = [{ label: 'Now', balance: Math.round(balance * 100) / 100 }]
  let date = new Date()

  for (let m = 1; m <= MAX_MONTHS && balance > EPSILON; m++) {
    const interest = balance * rate
    const principal = Math.min(debt.monthlyPayment - interest, balance)
    balance = Math.max(0, balance - principal)
    if (balance > EPSILON && balance <= FINAL_PAYMENT_TOLERANCE) balance = 0
    date = addMonths(date, 1)
    series.push({ label: format(date, 'MMM yyyy'), balance: Math.round(balance * 100) / 100 })
  }

  return series
}

const GROWTH_PROJECTION_MONTHS = 12

export function growthProjection(debt: Debt): ForecastPoint[] {
  // Negative amortization is a real risk on revolving, unsecured debt (credit cards), where the
  // payment amount is chosen freely and minimum payments are often below the interest accrued.
  // Installment loans (auto, mortgage, etc.) have a lender-fixed payment that always covers interest,
  // so an insufficient payment there almost always means the entered amount is wrong, not that the
  // loan is actually amortizing negatively.
  if (debt.type !== 'credit_card') return []
  if (debt.currentBalance <= 0 || debt.monthlyPayment <= 0 || isForecastable(debt)) return []

  const rate = debt.interestRate / 100 / 12
  let balance = debt.currentBalance
  const series: ForecastPoint[] = [{ label: 'Now', balance: Math.round(balance * 100) / 100 }]
  let date = new Date()

  for (let m = 1; m <= GROWTH_PROJECTION_MONTHS; m++) {
    const interest = balance * rate
    balance = balance + interest - debt.monthlyPayment
    date = addMonths(date, 1)
    series.push({ label: format(date, 'MMM yyyy'), balance: Math.round(balance * 100) / 100 })
  }

  return series
}

export interface MultiDebtSeriesPoint {
  label: string
  [debtId: string]: string | number
}

export interface MultiDebtSeriesResult {
  data: MultiDebtSeriesPoint[]
  lines: { id: string; name: string }[]
}

export function multiDebtForecastSeries(debts: Debt[]): MultiDebtSeriesResult {
  const active = debts.filter(isForecastable)
  if (active.length === 0) return { data: [], lines: [] }

  const balances = active.map((d) => d.currentBalance)
  const rates = active.map((d) => d.interestRate / 100 / 12)
  const payments = active.map((d) => d.monthlyPayment)

  function row(label: string): MultiDebtSeriesPoint {
    const r: MultiDebtSeriesPoint = { label }
    active.forEach((d, i) => (r[d.id] = Math.round(balances[i] * 100) / 100))
    return r
  }

  const data: MultiDebtSeriesPoint[] = [row('Now')]
  let date = new Date()

  for (let m = 1; m <= MAX_MONTHS; m++) {
    let allPaid = true
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue
      const interest = balances[i] * rates[i]
      const principal = Math.min(payments[i] - interest, balances[i])
      balances[i] = Math.max(0, balances[i] - principal)
      if (balances[i] > EPSILON && balances[i] <= FINAL_PAYMENT_TOLERANCE) balances[i] = 0
      if (balances[i] > EPSILON) allPaid = false
    }
    date = addMonths(date, 1)
    data.push(row(format(date, 'MMM yyyy')))
    if (allPaid) break
  }

  return { data, lines: active.map((d) => ({ id: d.id, name: d.name })) }
}
