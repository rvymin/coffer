import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Account, Budget, Category, Debt, DebtPayment, RecurringTransaction, Transaction } from './types'

export function useFinanceData() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([])
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [a, c, t, b, d, dp, r] = await Promise.all([
      window.api.accounts.list(),
      window.api.categories.list(),
      window.api.transactions.list(),
      window.api.budgets.list(),
      window.api.debts.list(),
      window.api.debtPayments.list(),
      window.api.recurring.list(),
    ])
    setAccounts(a)
    setCategories(c)
    setTransactions(t)
    setBudgets(b)
    setDebts(d)
    setDebtPayments(dp)
    setRecurring(r)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const balancesByAccount = useMemo(() => {
    const map = new Map<string, number>()
    for (const account of accounts) map.set(account.id, account.startingBalance)
    for (const tx of transactions) {
      const current = map.get(tx.accountId) ?? 0
      map.set(tx.accountId, current + (tx.kind === 'income' ? tx.amount : -tx.amount))
    }
    return map
  }, [accounts, transactions])

  const totalAssets = useMemo(
    () => Array.from(balancesByAccount.values()).reduce((sum, v) => sum + v, 0),
    [balancesByAccount],
  )

  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.currentBalance, 0), [debts])

  const netWorth = totalAssets - totalDebt

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const debtById = useMemo(() => new Map(debts.map((d) => [d.id, d])), [debts])

  return {
    accounts,
    categories,
    transactions,
    budgets,
    debts,
    debtPayments,
    recurring,
    loading,
    refresh,
    balancesByAccount,
    totalAssets,
    totalDebt,
    netWorth,
    categoryById,
    accountById,
    debtById,
  }
}

export type FinanceData = ReturnType<typeof useFinanceData>
