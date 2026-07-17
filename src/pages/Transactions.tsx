import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Receipt, Search, ListPlus, ArrowLeftRight, Repeat } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { Transaction, TxKind } from '../lib/types'
import { formatMoney, todayIso, MAX_AMOUNT } from '../lib/format'
import { resolveRange, type RangePreset } from '../lib/dateRange'
import { alertDialog, confirmDialog } from '../lib/dialog'
import Modal from '../components/Modal'
import BulkAddModal from '../components/BulkAddModal'
import DateRangePicker from '../components/DateRangePicker'
import Tooltip from '../components/Tooltip'
import Select from '../components/Select'

interface FormState {
  accountId: string
  categoryId: string
  kind: TxKind
  amount: string
  description: string
  date: string
}

function emptyForm(accountId: string, categoryId: string): FormState {
  return { accountId, categoryId, kind: 'expense', amount: '', description: '', date: todayIso() }
}

export default function Transactions({ data }: { data: FinanceData }) {
  const { transactions, accounts, categories, categoryById, accountById, debtPayments, refresh } = data
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm('', ''))

  const [filterAccount, setFilterAccount] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterKind, setFilterKind] = useState<'all' | TxKind>('all')
  const [search, setSearch] = useState('')
  const [datePreset, setDatePreset] = useState<RangePreset>('allTime')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const transactionDates = useMemo(() => transactions.map((tx) => tx.date), [transactions])
  const dateRange = useMemo(
    () => resolveRange(datePreset, customFrom, customTo, transactionDates),
    [datePreset, customFrom, customTo, transactionDates],
  )

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false
      if (filterKind !== 'all' && tx.kind !== filterKind) return false
      if (tx.date < dateRange.from || tx.date > dateRange.to) return false
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, filterAccount, filterCategory, filterKind, dateRange, search])

  const categoriesForKind = useMemo(
    () => categories.filter((c) => c.kind === form.kind),
    [categories, form.kind],
  )

  function openCreate() {
    if (accounts.length === 0) {
      alertDialog('Add an account first.')
      return
    }
    const defaultCategory = categories.find((c) => c.kind === 'expense')
    setEditing(null)
    setForm(emptyForm(accounts[0].id, defaultCategory?.id ?? ''))
    setShowForm(true)
  }

  function openBulkCreate() {
    if (accounts.length === 0) {
      alertDialog('Add an account first.')
      return
    }
    setShowBulkForm(true)
  }

  function openEdit(tx: Transaction) {
    setEditing(tx)
    setForm({
      accountId: tx.accountId,
      categoryId: tx.categoryId ?? '',
      kind: tx.kind,
      amount: String(tx.amount),
      description: tx.description,
      date: tx.date,
    })
    setShowForm(true)
  }

  function handleKindChange(kind: TxKind) {
    const firstMatch = categories.find((c) => c.kind === kind)
    setForm({ ...form, kind, categoryId: firstMatch?.id ?? '' })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!amount || amount <= 0 || amount > MAX_AMOUNT || !form.accountId || !form.date) return
    const payload = {
      accountId: form.accountId,
      categoryId: form.categoryId || null,
      kind: form.kind,
      amount,
      description: form.description.trim() || (form.kind === 'income' ? 'Income' : 'Expense'),
      date: form.date,
    }
    if (editing) {
      await window.api.transactions.update(editing.id, payload)
    } else {
      await window.api.transactions.create(payload)
    }
    setShowForm(false)
    await refresh()
  }

  async function handleDelete(id: string) {
    const isLinkedToDebtPayment = debtPayments.some((p) => p.transactionId === id)
    const message = isLinkedToDebtPayment
      ? 'This transaction is linked to a debt payment. Deleting it will also remove that payment and restore the debt balance. Continue?'
      : 'Delete this transaction?'
    if (!(await confirmDialog(message, { danger: true, confirmLabel: 'Delete' }))) return
    await window.api.transactions.delete(id)
    await refresh()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Transactions</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={openBulkCreate}>
            <ListPlus size={15} strokeWidth={2.25} />
            Quick add
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} strokeWidth={2.5} />
            Add transaction
          </button>
        </div>
      </div>

      <div className="page-stack">
        <div className="toolbar">
          <div className="search-input">
            <Search size={14} strokeWidth={2} />
            <input
              placeholder="Search description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterAccount} onChange={setFilterAccount}>
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select value={filterCategory} onChange={setFilterCategory}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={filterKind} onChange={(v) => setFilterKind(v as 'all' | TxKind)}>
            <option value="all">All types</option>
            <option value="income">Income only</option>
            <option value="expense">Expense only</option>
            <option value="transfer">Transfers only</option>
          </Select>
          <DateRangePicker
            preset={datePreset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={setDatePreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">
              <Receipt size={19} strokeWidth={1.75} />
            </div>
            No transactions match your filters.
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const category = tx.categoryId ? categoryById.get(tx.categoryId) : null
                  const account = accountById.get(tx.accountId)
                  return (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>
                        {tx.description}
                        {tx.recurringId && (
                          <Tooltip content="Posted by a recurring transaction" alwaysShow>
                            <span className="recurring-badge">
                              <Repeat size={12} strokeWidth={2.25} />
                            </span>
                          </Tooltip>
                        )}
                      </td>
                      <td>{account?.name ?? '—'}</td>
                      <td>
                        {category ? (
                          <span className="tag">
                            <span className="tag-dot" style={{ background: category.color }} />
                            {category.name}
                          </span>
                        ) : tx.kind === 'transfer' ? (
                          <span className="tag tag-transfer">
                            <ArrowLeftRight size={11} strokeWidth={2.25} />
                            Transfer
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`amount ${tx.kind}`}>
                          {tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : ''}
                          {formatMoney(tx.amount)}
                        </span>
                      </td>
                      <td>
                        {tx.kind !== 'transfer' && (
                          <button className="btn btn-sm" onClick={() => openEdit(tx)}>
                            Edit
                          </button>
                        )}{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tx.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit transaction' : 'Add transaction'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Type</label>
                <Select value={form.kind} onChange={(v) => handleKindChange(v as TxKind)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </Select>
              </div>
              <div className="form-field">
                <label>Amount</label>
                <input
                  autoFocus
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={MAX_AMOUNT}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Whole Foods"
                />
              </div>
              <div className="form-field">
                <label>Account</label>
                <Select
                  value={form.accountId}
                  onChange={(v) => setForm({ ...form, accountId: v })}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label>Category</label>
                <Select
                  value={form.categoryId}
                  onChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <option value="">Uncategorized</option>
                  {categoriesForKind.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showBulkForm && <BulkAddModal data={data} onClose={() => setShowBulkForm(false)} />}
    </div>
  )
}
