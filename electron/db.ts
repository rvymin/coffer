import initSqlJs, { type Database } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { addWeeks, addMonths, addYears } from 'date-fns'
import type {
  Account,
  Category,
  Transaction,
  Budget,
  Debt,
  DebtPayment,
  DebtPaymentInput,
  RecurringTransaction,
  RecurringFrequency,
} from '../src/lib/types.js'

const require = createRequire(import.meta.url)

const DEFAULT_CATEGORIES: Array<Omit<Category, 'id'>> = [
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

let db: Database
let dbPath: string

function persist() {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

async function loadSqlJs() {
  return initSqlJs({
    wasmBinary: fs.readFileSync(
      path.join(require.resolve('sql.js/dist/sql-wasm.js'), '..', 'sql-wasm.wasm'),
    ),
  })
}

export async function initDb(userDataDir: string) {
  const SQL = await loadSqlJs()

  dbPath = path.join(userDataDir, 'finance.db')

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      startingBalance REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      toAccountId TEXT,
      categoryId TEXT,
      kind TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      recurringId TEXT,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (toAccountId) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (recurringId) REFERENCES recurring_transactions(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(categoryId, month)
    );
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      originalBalance REAL NOT NULL,
      currentBalance REAL NOT NULL,
      interestRate REAL NOT NULL DEFAULT 0,
      monthlyPayment REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debtId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      transactionId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (debtId) REFERENCES debts(id) ON DELETE CASCADE,
      FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      categoryId TEXT,
      kind TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      frequency TEXT NOT NULL,
      nextDate TEXT NOT NULL,
      endDate TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );
  `)

  const debtPaymentColumns = db.exec('PRAGMA table_info(debt_payments)')
  const hasTransactionId = debtPaymentColumns[0]?.values.some((row) => row[1] === 'transactionId') ?? false
  if (!hasTransactionId) {
    db.run('ALTER TABLE debt_payments ADD COLUMN transactionId TEXT')
    persist()
  }

  const transactionColumns = db.exec('PRAGMA table_info(transactions)')
  const hasRecurringId = transactionColumns[0]?.values.some((row) => row[1] === 'recurringId') ?? false
  if (!hasRecurringId) {
    db.run('ALTER TABLE transactions ADD COLUMN recurringId TEXT')
    persist()
  }

  const hasToAccountId = transactionColumns[0]?.values.some((row) => row[1] === 'toAccountId') ?? false
  if (!hasToAccountId) {
    db.run('ALTER TABLE transactions ADD COLUMN toAccountId TEXT')
    persist()
  }

  const recurringColumns = db.exec('PRAGMA table_info(recurring_transactions)')
  const hasEndDate = recurringColumns[0]?.values.some((row) => row[1] === 'endDate') ?? false
  if (!hasEndDate) {
    db.run('ALTER TABLE recurring_transactions ADD COLUMN endDate TEXT')
    persist()
  }

  const catCount = db.exec('SELECT COUNT(*) FROM categories')[0]?.values[0][0] as number
  if (!catCount) {
    for (const c of DEFAULT_CATEGORIES) {
      db.run('INSERT INTO categories (id, name, kind, color) VALUES (?, ?, ?, ?)', [
        randomUUID(),
        c.name,
        c.kind,
        c.color,
      ])
    }
    persist()
  }
}

export function getDbPath(): string {
  return dbPath
}

// Wipes the current database file and reinitializes an empty one (default categories reseeded).
export async function resetAllData(userDataDir: string): Promise<void> {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  await initDb(userDataDir)
}

// Validates the candidate file opens as a sql.js database with our schema *before* touching the
// live database file, so a corrupt or unrelated file can't destroy the user's current data.
export async function restoreFromFile(
  sourcePath: string,
  userDataDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const SQL = await loadSqlJs()
  try {
    const candidate = new SQL.Database(fs.readFileSync(sourcePath))
    candidate.exec('SELECT COUNT(*) FROM accounts')
    candidate.close()
  } catch {
    return { ok: false, error: "That file doesn't look like a valid finance tracker backup." }
  }

  fs.copyFileSync(sourcePath, dbPath)
  await initDb(userDataDir)
  return { ok: true }
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildTransactionsCsv(): string {
  const accountName = new Map(listAccounts().map((a) => [a.id, a.name]))
  const categoryName = new Map(listCategories().map((c) => [c.id, c.name]))
  const header = ['Date', 'Description', 'Account', 'To Account', 'Category', 'Type', 'Amount']
  const rows = listTransactions().map((tx) => [
    tx.date,
    tx.description,
    accountName.get(tx.accountId) ?? '',
    tx.toAccountId ? accountName.get(tx.toAccountId) ?? '' : '',
    tx.categoryId ? categoryName.get(tx.categoryId) ?? '' : '',
    tx.kind,
    tx.amount.toFixed(2),
  ])
  return [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(',')).join('\n')
}

function rowsToObjects<T>(result: initSqlJs.QueryExecResult[]): T[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => (obj[col] = row[i]))
    return obj as T
  })
}

// ---- Accounts ----
export function listAccounts(): Account[] {
  return rowsToObjects<Account>(db.exec('SELECT * FROM accounts ORDER BY createdAt'))
}

export function createAccount(input: Omit<Account, 'id' | 'createdAt'>): Account {
  const account: Account = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }
  db.run('INSERT INTO accounts (id, name, type, startingBalance, createdAt) VALUES (?, ?, ?, ?, ?)', [
    account.id,
    account.name,
    account.type,
    account.startingBalance,
    account.createdAt,
  ])
  persist()
  return account
}

export function updateAccount(id: string, input: Partial<Omit<Account, 'id' | 'createdAt'>>): void {
  const stmt = db.prepare('SELECT * FROM accounts WHERE id = $id')
  stmt.bind({ $id: id })
  stmt.step()
  const current = stmt.getAsObject() as unknown as Account
  stmt.free()
  if (!current.id) return
  const merged = { ...current, ...input }
  db.run('UPDATE accounts SET name = ?, type = ?, startingBalance = ? WHERE id = ?', [
    merged.name,
    merged.type,
    merged.startingBalance,
    id,
  ])
  persist()
}

export function deleteAccount(id: string): void {
  db.run('DELETE FROM accounts WHERE id = ?', [id])
  persist()
}

// ---- Categories ----
export function listCategories(): Category[] {
  return rowsToObjects<Category>(db.exec('SELECT * FROM categories ORDER BY name'))
}

export function createCategory(input: Omit<Category, 'id'>): Category {
  const category: Category = { ...input, id: randomUUID() }
  db.run('INSERT INTO categories (id, name, kind, color) VALUES (?, ?, ?, ?)', [
    category.id,
    category.name,
    category.kind,
    category.color,
  ])
  persist()
  return category
}

export function updateCategory(id: string, input: Partial<Omit<Category, 'id'>>): void {
  const stmt = db.prepare('SELECT * FROM categories WHERE id = $id')
  stmt.bind({ $id: id })
  stmt.step()
  const current = stmt.getAsObject() as unknown as Category
  stmt.free()
  if (!current.id) return
  const merged = { ...current, ...input }
  db.run('UPDATE categories SET name = ?, kind = ?, color = ? WHERE id = ?', [
    merged.name,
    merged.kind,
    merged.color,
    id,
  ])
  persist()
}

export function deleteCategory(id: string): void {
  db.run('DELETE FROM categories WHERE id = ?', [id])
  persist()
}

// ---- Transactions ----
export function listTransactions(): Transaction[] {
  return rowsToObjects<Transaction>(db.exec('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC'))
}

export function createTransaction(input: Omit<Transaction, 'id' | 'createdAt' | 'recurringId'>): Transaction {
  const tx: Transaction = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), recurringId: null }
  db.run(
    'INSERT INTO transactions (id, accountId, toAccountId, categoryId, kind, amount, description, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tx.id, tx.accountId, tx.toAccountId, tx.categoryId, tx.kind, tx.amount, tx.description, tx.date, tx.createdAt],
  )
  persist()
  return tx
}

export function updateTransaction(id: string, input: Partial<Omit<Transaction, 'id' | 'createdAt'>>): void {
  const stmt = db.prepare('SELECT * FROM transactions WHERE id = $id')
  stmt.bind({ $id: id })
  stmt.step()
  const current = stmt.getAsObject() as unknown as Transaction
  stmt.free()
  if (!current.id) return
  const merged = { ...current, ...input }
  db.run(
    'UPDATE transactions SET accountId = ?, toAccountId = ?, categoryId = ?, kind = ?, amount = ?, description = ?, date = ? WHERE id = ?',
    [merged.accountId, merged.toAccountId, merged.categoryId, merged.kind, merged.amount, merged.description, merged.date, id],
  )
  persist()
}

export function deleteTransaction(id: string): void {
  const stmt = db.prepare('SELECT * FROM debt_payments WHERE transactionId = $id')
  stmt.bind({ $id: id })
  const hasLinkedPayment = stmt.step()
  const linkedPayment = hasLinkedPayment ? (stmt.getAsObject() as unknown as DebtPayment) : null
  stmt.free()

  if (linkedPayment?.id) {
    db.run('UPDATE debts SET currentBalance = currentBalance + ? WHERE id = ?', [
      linkedPayment.amount,
      linkedPayment.debtId,
    ])
    db.run('DELETE FROM debt_payments WHERE id = ?', [linkedPayment.id])
  }

  db.run('DELETE FROM transactions WHERE id = ?', [id])
  persist()
}

// ---- Budgets ----
export function listBudgets(): Budget[] {
  return rowsToObjects<Budget>(db.exec('SELECT * FROM budgets ORDER BY month DESC'))
}

export function upsertBudget(input: Omit<Budget, 'id'>): Budget {
  const stmt = db.prepare('SELECT * FROM budgets WHERE categoryId = $c AND month = $m')
  stmt.bind({ $c: input.categoryId, $m: input.month })
  const exists = stmt.step()
  const existing = exists ? (stmt.getAsObject() as unknown as Budget) : null
  stmt.free()

  if (existing?.id) {
    db.run('UPDATE budgets SET amount = ? WHERE id = ?', [input.amount, existing.id])
    persist()
    return { ...existing, amount: input.amount }
  }

  const budget: Budget = { ...input, id: randomUUID() }
  db.run('INSERT INTO budgets (id, categoryId, month, amount) VALUES (?, ?, ?, ?)', [
    budget.id,
    budget.categoryId,
    budget.month,
    budget.amount,
  ])
  persist()
  return budget
}

export function deleteBudget(id: string): void {
  db.run('DELETE FROM budgets WHERE id = ?', [id])
  persist()
}

// ---- Debts ----
export function listDebts(): Debt[] {
  return rowsToObjects<Debt>(db.exec('SELECT * FROM debts ORDER BY createdAt'))
}

export function createDebt(input: Omit<Debt, 'id' | 'createdAt'>): Debt {
  const debt: Debt = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }
  db.run(
    'INSERT INTO debts (id, name, type, originalBalance, currentBalance, interestRate, monthlyPayment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      debt.id,
      debt.name,
      debt.type,
      debt.originalBalance,
      debt.currentBalance,
      debt.interestRate,
      debt.monthlyPayment,
      debt.createdAt,
    ],
  )
  persist()
  return debt
}

export function updateDebt(id: string, input: Partial<Omit<Debt, 'id' | 'createdAt'>>): void {
  const stmt = db.prepare('SELECT * FROM debts WHERE id = $id')
  stmt.bind({ $id: id })
  stmt.step()
  const current = stmt.getAsObject() as unknown as Debt
  stmt.free()
  if (!current.id) return
  const merged = { ...current, ...input }
  db.run(
    'UPDATE debts SET name = ?, type = ?, originalBalance = ?, currentBalance = ?, interestRate = ?, monthlyPayment = ? WHERE id = ?',
    [merged.name, merged.type, merged.originalBalance, merged.currentBalance, merged.interestRate, merged.monthlyPayment, id],
  )
  persist()
}

export function deleteDebt(id: string): void {
  db.run('DELETE FROM debts WHERE id = ?', [id])
  persist()
}

// ---- Debt Payments ----
export function listDebtPayments(): DebtPayment[] {
  return rowsToObjects<DebtPayment>(db.exec('SELECT * FROM debt_payments ORDER BY date DESC, createdAt DESC'))
}

export function createDebtPayment(input: DebtPaymentInput): DebtPayment {
  let transactionId: string | null = null

  if (input.accountId) {
    const debtStmt = db.prepare('SELECT name FROM debts WHERE id = $id')
    debtStmt.bind({ $id: input.debtId })
    debtStmt.step()
    const debtName = (debtStmt.getAsObject().name as string) ?? 'Debt'
    debtStmt.free()

    transactionId = randomUUID()
    db.run(
      'INSERT INTO transactions (id, accountId, categoryId, kind, amount, description, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        transactionId,
        input.accountId,
        null,
        'transfer',
        input.amount,
        `Debt payment: ${debtName}`,
        input.date,
        new Date().toISOString(),
      ],
    )
  }

  const payment: DebtPayment = {
    id: randomUUID(),
    debtId: input.debtId,
    amount: input.amount,
    date: input.date,
    note: input.note,
    transactionId,
    createdAt: new Date().toISOString(),
  }
  db.run(
    'INSERT INTO debt_payments (id, debtId, amount, date, note, transactionId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [payment.id, payment.debtId, payment.amount, payment.date, payment.note, payment.transactionId, payment.createdAt],
  )
  db.run('UPDATE debts SET currentBalance = MAX(currentBalance - ?, 0) WHERE id = ?', [
    payment.amount,
    payment.debtId,
  ])
  persist()
  return payment
}

export function deleteDebtPayment(id: string): void {
  const stmt = db.prepare('SELECT * FROM debt_payments WHERE id = $id')
  stmt.bind({ $id: id })
  stmt.step()
  const payment = stmt.getAsObject() as unknown as DebtPayment
  stmt.free()
  if (!payment.id) return

  if (payment.transactionId) {
    db.run('DELETE FROM transactions WHERE id = ?', [payment.transactionId])
  }
  db.run('DELETE FROM debt_payments WHERE id = ?', [id])
  db.run('UPDATE debts SET currentBalance = currentBalance + ? WHERE id = ?', [payment.amount, payment.debtId])
  persist()
}

// ---- Recurring Transactions ----
export function listRecurring(): RecurringTransaction[] {
  const rows = rowsToObjects<Record<string, unknown>>(
    db.exec('SELECT * FROM recurring_transactions ORDER BY nextDate'),
  )
  return rows.map((r) => ({ ...r, active: !!r.active }) as unknown as RecurringTransaction)
}

export function createRecurring(input: Omit<RecurringTransaction, 'id' | 'createdAt'>): RecurringTransaction {
  const rule: RecurringTransaction = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }
  db.run(
    'INSERT INTO recurring_transactions (id, accountId, categoryId, kind, amount, description, frequency, nextDate, endDate, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      rule.id,
      rule.accountId,
      rule.categoryId,
      rule.kind,
      rule.amount,
      rule.description,
      rule.frequency,
      rule.nextDate,
      rule.endDate,
      rule.active ? 1 : 0,
      rule.createdAt,
    ],
  )
  persist()
  return rule
}

export function updateRecurring(id: string, input: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>): void {
  const stmt = db.prepare('SELECT * FROM recurring_transactions WHERE id = $id')
  stmt.bind({ $id: id })
  stmt.step()
  const currentRaw = stmt.getAsObject() as Record<string, unknown>
  stmt.free()
  if (!currentRaw.id) return
  const current = { ...currentRaw, active: !!currentRaw.active } as unknown as RecurringTransaction
  const merged = { ...current, ...input }
  db.run(
    'UPDATE recurring_transactions SET accountId = ?, categoryId = ?, kind = ?, amount = ?, description = ?, frequency = ?, nextDate = ?, endDate = ?, active = ? WHERE id = ?',
    [
      merged.accountId,
      merged.categoryId,
      merged.kind,
      merged.amount,
      merged.description,
      merged.frequency,
      merged.nextDate,
      merged.endDate,
      merged.active ? 1 : 0,
      id,
    ],
  )
  persist()
}

export function deleteRecurring(id: string): void {
  db.run('DELETE FROM recurring_transactions WHERE id = ?', [id])
  persist()
}

function advanceDate(dateIso: string, freq: RecurringFrequency): string {
  const d = new Date(`${dateIso}T00:00:00`)
  let next: Date
  if (freq === 'weekly') next = addWeeks(d, 1)
  else if (freq === 'biweekly') next = addWeeks(d, 2)
  else if (freq === 'monthly') next = addMonths(d, 1)
  else next = addYears(d, 1)
  return next.toISOString().slice(0, 10)
}

// Catches up any rules whose nextDate has arrived, posting one transaction per elapsed period
// (capped at 36 so a long-dormant rule can't spin) and persisting once at the end. Rules with an
// endDate stop posting once nextDate would fall after it, and are auto-paused since they'll never
// fire again.
export function runRecurringTransactions(): { created: number } {
  const today = new Date().toISOString().slice(0, 10)
  const rules = rowsToObjects<Record<string, unknown>>(
    db.exec('SELECT * FROM recurring_transactions WHERE active = 1'),
  )
  let created = 0

  for (const rule of rules) {
    const endDate = rule.endDate as string | null
    let nextDate = rule.nextDate as string
    const startDate = nextDate
    let iterations = 0
    while (nextDate <= today && (!endDate || nextDate <= endDate) && iterations < 36) {
      db.run(
        'INSERT INTO transactions (id, accountId, categoryId, kind, amount, description, date, createdAt, recurringId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          randomUUID(),
          rule.accountId,
          rule.categoryId,
          rule.kind,
          rule.amount,
          rule.description,
          nextDate,
          new Date().toISOString(),
          rule.id,
        ],
      )
      created += 1
      nextDate = advanceDate(nextDate, rule.frequency as RecurringFrequency)
      iterations += 1
    }
    if (nextDate !== startDate) {
      db.run('UPDATE recurring_transactions SET nextDate = ? WHERE id = ?', [nextDate, rule.id])
    }
    if (endDate && nextDate > endDate) {
      db.run('UPDATE recurring_transactions SET active = 0 WHERE id = ?', [rule.id])
    }
  }

  if (created > 0) persist()
  return { created }
}
