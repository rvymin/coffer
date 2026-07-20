import type {
  Account,
  Api,
  Budget,
  Category,
  Debt,
  DebtPayment,
  DebtPaymentInput,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
  TxKind,
} from './types'

// ---------------------------------------------------------------------------
// Browser-only preview fallback for window.api.
//
// In the packaged Electron app the preload bridge (electron/preload.ts) exposes a real
// window.api backed by sql.js, so this mock never installs there. It exists so the production
// build can be previewed in a plain browser (e.g. `vite preview`) without hanging on the
// loading screen. It implements the full Api surface from src/lib/types.ts against in-memory
// arrays seeded with believable demo data, mirroring the real handlers' behavior in
// electron/db.ts (sort orders, debt-payment linking, recurring catch-up, reset semantics).
// Nothing is persisted — every reload starts fresh.
// ---------------------------------------------------------------------------

interface MockState {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
  debts: Debt[]
  debtPayments: DebtPayment[]
  recurring: RecurringTransaction[]
}

const rid = () => crypto.randomUUID()

let stampSeq = 0
function stamp(): string {
  // Monotonic createdAt values keep "date DESC, createdAt DESC" ordering deterministic.
  return new Date(Date.now() + stampSeq++).toISOString()
}

function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayLocalIso(): string {
  return localIso(new Date())
}

// ISO date `day` days-into the month that is `monthsAgo` before the current one (day ≤ 28, so
// no month-length clamping is needed).
function agoDate(monthsAgo: number, day: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  d.setDate(day)
  return localIso(d)
}

// Same default categories the real app seeds on first launch / after a reset
// (electron/db.ts DEFAULT_CATEGORIES).
function defaultCategories(): Category[] {
  const seeds: Array<{ name: string; kind: TxKind; color: string }> = [
    { name: 'Salary', kind: 'income', color: '#2f9e44' },
    { name: 'Other Income', kind: 'income', color: '#37b24d' },
    { name: 'Groceries', kind: 'expense', color: '#e8590c' },
    { name: 'Rent/Mortgage', kind: 'expense', color: '#9c36b5' },
    { name: 'Utilities', kind: 'expense', color: '#1971c2' },
    { name: 'Dining Out', kind: 'expense', color: '#f08c00' },
    { name: 'Transportation', kind: 'expense', color: '#0c8599' },
    { name: 'Entertainment', kind: 'expense', color: '#e64980' },
    { name: 'Health', kind: 'expense', color: '#40c057' },
    { name: 'Shopping', kind: 'expense', color: '#f76707' },
    { name: 'Other', kind: 'expense', color: '#868e96' },
  ]
  return seeds.map((s) => ({ ...s, id: rid() }))
}

function seedState(): MockState {
  const today = todayLocalIso()
  const categories = defaultCategories()
  const cat = (name: string) => categories.find((c) => c.name === name)?.id ?? null

  const accounts: Account[] = [
    { id: rid(), name: 'Chase Checking', type: 'Checking', startingBalance: 2450.18, createdAt: stamp() },
    { id: rid(), name: 'Ally Savings', type: 'Savings', startingBalance: 8312.55, createdAt: stamp() },
    { id: rid(), name: 'Amex Gold', type: 'Credit Card', startingBalance: 0, createdAt: stamp() },
    { id: rid(), name: 'Vanguard Brokerage', type: 'Investment', startingBalance: 12480.22, createdAt: stamp() },
  ]
  const [checking, savings, amex] = accounts

  const state: MockState = {
    accounts,
    categories,
    transactions: [],
    budgets: [],
    debts: [],
    debtPayments: [],
    recurring: [],
  }

  // ~6 months of believable activity. Anything dated after today is skipped so the current
  // month always looks "in progress" no matter which day the preview is opened.
  const add = (
    accountId: string,
    toAccountId: string | null,
    categoryId: string | null,
    kind: TxKind,
    amount: number,
    description: string,
    monthsAgo: number,
    day: number,
  ) => {
    const date = agoDate(monthsAgo, day)
    if (date > today) return
    state.transactions.push({
      id: rid(),
      accountId,
      toAccountId,
      categoryId,
      kind,
      amount,
      description,
      date,
      createdAt: stamp(),
      recurringId: null,
    })
  }

  const utilAmt = [118.42, 124.96, 139.2, 121.55, 116.88, 122.34]
  const grocAmt = [96.2, 88.45, 102.33, 91.27, 97.64, 84.19]
  const dineAmt = [52.6, 47.85, 61.2, 44.35, 55.9, 49.25]
  const transAmt = [46.18, 52.4, 41.95, 48.72, 44.6, 50.23]

  for (let m = 5; m >= 0; m--) {
    add(checking.id, null, cat('Salary'), 'income', 3264.8, 'Paycheck — Meridian Labs', m, 1)
    add(checking.id, null, cat('Salary'), 'income', 3264.8, 'Paycheck — Meridian Labs', m, 15)
    add(checking.id, null, cat('Rent/Mortgage'), 'expense', 1650, 'Rent — Elmwood Apartments', m, 2)
    add(checking.id, null, cat('Utilities'), 'expense', utilAmt[m], 'City Power & Water', m, 9)
    add(checking.id, null, cat('Groceries'), 'expense', grocAmt[m], 'Whole Foods Market', m, 6)
    add(amex.id, null, cat('Dining Out'), 'expense', dineAmt[m], 'Chipotle', m, 12)
    add(checking.id, null, cat('Transportation'), 'expense', transAmt[m], 'Shell fuel', m, 17)
    add(amex.id, null, cat('Entertainment'), 'expense', 15.49, 'Netflix', m, 21)
  }
  add(checking.id, null, cat('Groceries'), 'expense', 64.3, "Trader Joe's", 5, 20)
  add(checking.id, null, cat('Groceries'), 'expense', 71.22, "Trader Joe's", 3, 20)
  add(checking.id, null, cat('Groceries'), 'expense', 69.41, "Trader Joe's", 1, 20)
  add(amex.id, null, cat('Shopping'), 'expense', 132.47, 'Amazon order', 4, 24)
  add(amex.id, null, cat('Shopping'), 'expense', 89.99, 'Target', 1, 24)
  add(checking.id, null, cat('Health'), 'expense', 45.2, 'CVS Pharmacy', 3, 14)
  add(checking.id, null, cat('Health'), 'expense', 30.26, 'CVS Pharmacy', 0, 10)
  for (const m of [5, 3, 1]) add(checking.id, savings.id, null, 'transfer', 400, 'Transfer to savings', m, 25)
  for (const m of [5, 3, 1]) add(checking.id, amex.id, null, 'transfer', 210, 'Amex payment', m, 26)

  // Two debts with a payment history posted through the same code path the real API uses, so
  // the linked transfer transactions exist and balances land on consistent final values.
  const autoLoan: Debt = {
    id: rid(),
    name: 'Honda CR-V Auto Loan',
    type: 'auto_loan',
    originalBalance: 24000,
    currentBalance: 19570,
    interestRate: 5.9,
    monthlyPayment: 460,
    createdAt: stamp(),
  }
  const sapphire: Debt = {
    id: rid(),
    name: 'Chase Sapphire',
    type: 'credit_card',
    originalBalance: 5200,
    currentBalance: 3950,
    interestRate: 21.49,
    monthlyPayment: 250,
    createdAt: stamp(),
  }
  state.debts.push(autoLoan, sapphire)

  postDebtPayment(state, { debtId: autoLoan.id, amount: 460, date: agoDate(4, 10), note: 'Monthly payment', accountId: checking.id })
  postDebtPayment(state, { debtId: autoLoan.id, amount: 460, date: agoDate(2, 10), note: null, accountId: checking.id })
  postDebtPayment(state, { debtId: sapphire.id, amount: 250, date: agoDate(3, 18), note: null, accountId: checking.id })
  postDebtPayment(state, { debtId: sapphire.id, amount: 250, date: agoDate(1, 18), note: 'Extra principal', accountId: checking.id })

  // Budgets for the current and two previous months so the month picker has data to navigate.
  const budgetSeeds: Array<[string, number]> = [
    ['Groceries', 480],
    ['Dining Out', 220],
    ['Transportation', 180],
    ['Entertainment', 60],
    ['Utilities', 240],
    ['Shopping', 250],
  ]
  for (const offset of [0, 1, 2]) {
    const month = agoDate(offset, 1).slice(0, 7)
    for (const [name, amount] of budgetSeeds) {
      const categoryId = cat(name)
      if (categoryId) state.budgets.push({ id: rid(), categoryId, month, amount })
    }
  }

  const nextMonthFirst = new Date()
  nextMonthFirst.setDate(1)
  nextMonthFirst.setMonth(nextMonthFirst.getMonth() + 1)

  const paycheckNext = new Date()
  paycheckNext.setDate(paycheckNext.getDate() + 5)

  const netflixNext = new Date()
  netflixNext.setDate(21)
  if (localIso(netflixNext) <= today) netflixNext.setMonth(netflixNext.getMonth() + 1)

  const recurringSeeds: Array<Omit<RecurringTransaction, 'id' | 'createdAt'>> = [
    {
      accountId: checking.id,
      categoryId: cat('Rent/Mortgage'),
      kind: 'expense',
      amount: 1650,
      description: 'Rent — Elmwood Apartments',
      frequency: 'monthly',
      nextDate: localIso(nextMonthFirst),
      endDate: null,
      active: true,
    },
    {
      accountId: checking.id,
      categoryId: cat('Salary'),
      kind: 'income',
      amount: 3264.8,
      description: 'Paycheck — Meridian Labs',
      frequency: 'biweekly',
      nextDate: localIso(paycheckNext),
      endDate: null,
      active: true,
    },
    {
      accountId: amex.id,
      categoryId: cat('Entertainment'),
      kind: 'expense',
      amount: 15.49,
      description: 'Netflix',
      frequency: 'monthly',
      nextDate: localIso(netflixNext),
      endDate: null,
      active: true,
    },
  ]
  for (const seed of recurringSeeds) state.recurring.push({ ...seed, id: rid(), createdAt: stamp() })

  return state
}

// Mirrors electron/db.ts createDebtPayment: with an account linked, also post a transfer
// transaction for the payment, then draw the debt balance down (floored at 0).
function postDebtPayment(state: MockState, input: DebtPaymentInput): DebtPayment {
  let transactionId: string | null = null
  const debt = state.debts.find((d) => d.id === input.debtId)

  if (input.accountId) {
    transactionId = rid()
    state.transactions.push({
      id: transactionId,
      accountId: input.accountId,
      toAccountId: null,
      categoryId: null,
      kind: 'transfer',
      amount: input.amount,
      description: `Debt payment: ${debt?.name ?? 'Debt'}`,
      date: input.date,
      createdAt: stamp(),
      recurringId: null,
    })
  }

  const payment: DebtPayment = {
    id: rid(),
    debtId: input.debtId,
    amount: input.amount,
    date: input.date,
    note: input.note,
    transactionId,
    createdAt: stamp(),
  }
  state.debtPayments.push(payment)
  if (debt) debt.currentBalance = Math.max(debt.currentBalance - input.amount, 0)
  return payment
}

function advanceDate(dateIso: string, freq: RecurringFrequency): string {
  const d = new Date(`${dateIso}T00:00:00`)
  const day = d.getDate()
  if (freq === 'weekly') d.setDate(day + 7)
  else if (freq === 'biweekly') d.setDate(day + 14)
  else if (freq === 'monthly') {
    d.setMonth(d.getMonth() + 1)
    if (d.getDate() < day) d.setDate(0) // overflowed a short month — clamp to its last day
  } else {
    d.setFullYear(d.getFullYear() + 1)
    if (d.getDate() < day) d.setDate(0)
  }
  return localIso(d)
}

function createMockApi(state: MockState): Api {
  return {
    accounts: {
      // Real handler: ORDER BY createdAt — the in-memory array is already in insertion order.
      list: async () => [...state.accounts],
      create: async (input) => {
        const account: Account = { ...input, id: rid(), createdAt: stamp() }
        state.accounts.push(account)
        return account
      },
      update: async (id, input) => {
        const account = state.accounts.find((a) => a.id === id)
        if (account) Object.assign(account, input)
      },
      delete: async (id) => {
        state.accounts = state.accounts.filter((a) => a.id !== id)
      },
    },
    categories: {
      list: async () => [...state.categories].sort((a, b) => a.name.localeCompare(b.name)),
      create: async (input) => {
        const category: Category = { ...input, id: rid() }
        state.categories.push(category)
        return category
      },
      update: async (id, input) => {
        const category = state.categories.find((c) => c.id === id)
        if (category) Object.assign(category, input)
      },
      delete: async (id) => {
        state.categories = state.categories.filter((c) => c.id !== id)
      },
    },
    transactions: {
      list: async () =>
        [...state.transactions].sort((a, b) =>
          a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
        ),
      create: async (input) => {
        const tx: Transaction = { ...input, id: rid(), createdAt: stamp(), recurringId: null }
        state.transactions.push(tx)
        return tx
      },
      update: async (id, input) => {
        const tx = state.transactions.find((t) => t.id === id)
        if (tx) Object.assign(tx, input)
      },
      delete: async (id) => {
        // Mirror the real handler: deleting a transaction linked to a debt payment also
        // removes that payment and restores the debt balance.
        const linked = state.debtPayments.find((p) => p.transactionId === id)
        if (linked) {
          const debt = state.debts.find((d) => d.id === linked.debtId)
          if (debt) debt.currentBalance += linked.amount
          state.debtPayments = state.debtPayments.filter((p) => p.id !== linked.id)
        }
        state.transactions = state.transactions.filter((t) => t.id !== id)
      },
    },
    budgets: {
      list: async () => [...state.budgets].sort((a, b) => (a.month < b.month ? 1 : -1)),
      upsert: async (input) => {
        const existing = state.budgets.find((b) => b.categoryId === input.categoryId && b.month === input.month)
        if (existing) {
          existing.amount = input.amount
          return existing
        }
        const budget: Budget = { ...input, id: rid() }
        state.budgets.push(budget)
        return budget
      },
      delete: async (id) => {
        state.budgets = state.budgets.filter((b) => b.id !== id)
      },
    },
    debts: {
      list: async () => [...state.debts],
      create: async (input) => {
        const debt: Debt = { ...input, id: rid(), createdAt: stamp() }
        state.debts.push(debt)
        return debt
      },
      update: async (id, input) => {
        const debt = state.debts.find((d) => d.id === id)
        if (debt) Object.assign(debt, input)
      },
      delete: async (id) => {
        state.debts = state.debts.filter((d) => d.id !== id)
      },
    },
    debtPayments: {
      list: async () =>
        [...state.debtPayments].sort((a, b) =>
          a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
        ),
      create: async (input) => postDebtPayment(state, input),
      delete: async (id) => {
        const payment = state.debtPayments.find((p) => p.id === id)
        if (!payment) return
        if (payment.transactionId) {
          state.transactions = state.transactions.filter((t) => t.id !== payment.transactionId)
        }
        state.debtPayments = state.debtPayments.filter((p) => p.id !== id)
        const debt = state.debts.find((d) => d.id === payment.debtId)
        if (debt) debt.currentBalance += payment.amount
      },
    },
    recurring: {
      list: async () => [...state.recurring].sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1)),
      create: async (input) => {
        const rule: RecurringTransaction = { ...input, id: rid(), createdAt: stamp() }
        state.recurring.push(rule)
        return rule
      },
      update: async (id, input) => {
        const rule = state.recurring.find((r) => r.id === id)
        if (rule) Object.assign(rule, input)
      },
      delete: async (id) => {
        state.recurring = state.recurring.filter((r) => r.id !== id)
      },
      // Mirrors the real catch-up run: posts one transaction per elapsed period (capped at
      // 36), advances nextDate, and auto-pauses rules past their endDate.
      run: async () => {
        const today = todayLocalIso()
        let created = 0
        for (const rule of state.recurring) {
          if (!rule.active) continue
          let nextDate = rule.nextDate
          const startDate = nextDate
          let iterations = 0
          while (nextDate <= today && (!rule.endDate || nextDate <= rule.endDate) && iterations < 36) {
            state.transactions.push({
              id: rid(),
              accountId: rule.accountId,
              toAccountId: null,
              categoryId: rule.categoryId,
              kind: rule.kind,
              amount: rule.amount,
              description: rule.description,
              date: nextDate,
              createdAt: stamp(),
              recurringId: rule.id,
            })
            created += 1
            nextDate = advanceDate(nextDate, rule.frequency)
            iterations += 1
          }
          if (nextDate !== startDate) rule.nextDate = nextDate
          if (rule.endDate && nextDate > rule.endDate) rule.active = false
        }
        return { created }
      },
    },
    backup: {
      // No file dialogs exist outside Electron — resolve with the same shape the real handlers
      // return when the user cancels the dialog, which the Settings page already handles.
      exportDb: async () => ({ canceled: true }),
      exportCsv: async () => ({ canceled: true }),
      importDb: async () => ({ canceled: true, ok: false }),
    },
    app: {
      // Mirrors resetAllData: everything is cleared and categories return to the defaults.
      resetData: async () => {
        state.accounts = []
        state.transactions = []
        state.budgets = []
        state.debts = []
        state.debtPayments = []
        state.recurring = []
        state.categories = defaultCategories()
      },
    },
    updates: {
      // Auto-updates only exist in the packaged Electron app; the browser mock reports dev mode.
      getVersion: async () => 'dev-browser',
      getLastStatus: async () => null,
      getPlatform: async () => 'web',
      check: async () => ({ ok: false, dev: true }),
      download: async () => ({ ok: false, dev: true }),
      install: async () => {},
      openDownloadPage: async () => {},
      canSimulate: async () => false,
      simulate: async () => ({ ok: false }),
      onStatus: () => () => {},
    },
  }
}

export function installMockApi(): void {
  const w = window as unknown as { api?: Api }
  if (w.api) return // real preload bridge is present — never override it
  w.api = createMockApi(seedState())
}
