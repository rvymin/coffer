export type AccountType = string
export type TxKind = 'income' | 'expense' | 'transfer'
export type DebtType = 'credit_card' | 'student_loan' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'other'
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Account {
  id: string
  name: string
  type: AccountType
  startingBalance: number
  createdAt: string
}

export interface Category {
  id: string
  name: string
  kind: TxKind
  color: string
}

export interface Transaction {
  id: string
  accountId: string
  toAccountId: string | null
  categoryId: string | null
  kind: TxKind
  amount: number
  description: string
  date: string
  createdAt: string
  recurringId: string | null
}

export interface Budget {
  id: string
  categoryId: string
  month: string
  amount: number
}

export interface Debt {
  id: string
  name: string
  type: DebtType
  originalBalance: number
  currentBalance: number
  interestRate: number
  monthlyPayment: number
  createdAt: string
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  date: string
  note: string | null
  transactionId: string | null
  createdAt: string
}

export interface DebtPaymentInput {
  debtId: string
  amount: number
  date: string
  note: string | null
  accountId: string | null
}

export interface RecurringTransaction {
  id: string
  accountId: string
  categoryId: string | null
  kind: TxKind
  amount: number
  description: string
  frequency: RecurringFrequency
  nextDate: string
  endDate: string | null
  active: boolean
  createdAt: string
}

export interface ExportResult {
  canceled: boolean
  filePath?: string
}

export interface ImportResult {
  canceled: boolean
  ok: boolean
  error?: string
}

export interface Api {
  accounts: {
    list: () => Promise<Account[]>
    create: (input: Omit<Account, 'id' | 'createdAt'>) => Promise<Account>
    update: (id: string, input: Partial<Omit<Account, 'id' | 'createdAt'>>) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  categories: {
    list: () => Promise<Category[]>
    create: (input: Omit<Category, 'id'>) => Promise<Category>
    update: (id: string, input: Partial<Omit<Category, 'id'>>) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  transactions: {
    list: () => Promise<Transaction[]>
    create: (input: Omit<Transaction, 'id' | 'createdAt' | 'recurringId'>) => Promise<Transaction>
    update: (id: string, input: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  budgets: {
    list: () => Promise<Budget[]>
    upsert: (input: Omit<Budget, 'id'>) => Promise<Budget>
    delete: (id: string) => Promise<void>
  }
  debts: {
    list: () => Promise<Debt[]>
    create: (input: Omit<Debt, 'id' | 'createdAt'>) => Promise<Debt>
    update: (id: string, input: Partial<Omit<Debt, 'id' | 'createdAt'>>) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  debtPayments: {
    list: () => Promise<DebtPayment[]>
    create: (input: DebtPaymentInput) => Promise<DebtPayment>
    delete: (id: string) => Promise<void>
  }
  recurring: {
    list: () => Promise<RecurringTransaction[]>
    create: (input: Omit<RecurringTransaction, 'id' | 'createdAt'>) => Promise<RecurringTransaction>
    update: (id: string, input: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>) => Promise<void>
    delete: (id: string) => Promise<void>
    run: () => Promise<{ created: number }>
  }
  backup: {
    exportDb: () => Promise<ExportResult>
    exportCsv: () => Promise<ExportResult>
    importDb: () => Promise<ImportResult>
  }
  app: {
    resetData: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: Api
  }
}
