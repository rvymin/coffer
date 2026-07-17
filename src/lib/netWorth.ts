import type { Account, Debt, DebtPayment, Transaction, TxKind } from './types'
import { monthOf } from './calc'

export interface NetWorthPoint {
  month: string
  assets: number
  debt: number
  netWorth: number
}

// Mirrors balancesByAccount in useFinanceData: income adds to a balance, expense and transfer
// both subtract from the source account (a transfer with no toAccountId is cash leaving the
// system entirely, e.g. a debt payment). A transfer *with* a toAccountId also credits that
// destination account, since it's moving money between two tracked accounts rather than losing it.
function accountSign(kind: TxKind): number {
  return kind === 'income' ? 1 : -1
}

export function netWorthSeries(
  accounts: Account[],
  transactions: Transaction[],
  debts: Debt[],
  debtPayments: DebtPayment[],
  months: string[],
): NetWorthPoint[] {
  return months.map((month) => {
    const assets = accounts.reduce((sum, account) => {
      const txTotal = transactions
        .filter((tx) => monthOf(tx.date) <= month)
        .reduce((s, tx) => {
          if (tx.accountId === account.id) s += accountSign(tx.kind) * tx.amount
          if (tx.kind === 'transfer' && tx.toAccountId === account.id) s += tx.amount
          return s
        }, 0)
      return sum + account.startingBalance + txTotal
    }, 0)

    const debt = debts.reduce((sum, d) => {
      const paid = debtPayments
        .filter((p) => p.debtId === d.id && monthOf(p.date) <= month)
        .reduce((s, p) => s + p.amount, 0)
      return sum + Math.max(d.originalBalance - paid, 0)
    }, 0)

    return { month, assets, debt, netWorth: assets - debt }
  })
}
