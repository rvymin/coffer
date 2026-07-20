import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Repeat, Play } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { RecurringFrequency, RecurringTransaction, TxKind } from '../lib/types'
import { formatMoney, todayIso, MAX_AMOUNT } from '../lib/format'
import { alertDialog, confirmDialog } from '../lib/dialog'
import Modal from '../components/Modal'
import Select from '../components/Select'

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

interface FormState {
  accountId: string
  categoryId: string
  kind: TxKind
  amount: string
  description: string
  frequency: RecurringFrequency
  nextDate: string
  endDate: string
}

function emptyForm(accountId: string, categoryId: string): FormState {
  return {
    accountId,
    categoryId,
    kind: 'expense',
    amount: '',
    description: '',
    frequency: 'monthly',
    nextDate: todayIso(),
    endDate: '',
  }
}

function isEnded(rule: RecurringTransaction): boolean {
  return Boolean(rule.endDate) && rule.nextDate > (rule.endDate as string)
}

export default function Recurring({ data }: { data: FinanceData }) {
  const { recurring, accounts, categories, accountById, categoryById, refresh } = data
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm('', ''))
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const categoriesForKind = useMemo(() => categories.filter((c) => c.kind === form.kind), [categories, form.kind])
  const sorted = useMemo(
    () => [...recurring].sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1)),
    [recurring],
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

  function openEdit(rule: RecurringTransaction) {
    setEditing(rule)
    setForm({
      accountId: rule.accountId,
      categoryId: rule.categoryId ?? '',
      kind: rule.kind,
      amount: String(rule.amount),
      description: rule.description,
      frequency: rule.frequency,
      nextDate: rule.nextDate,
      endDate: rule.endDate ?? '',
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
    if (!amount || amount <= 0 || amount > MAX_AMOUNT || !form.accountId || !form.nextDate) return
    const payload = {
      accountId: form.accountId,
      categoryId: form.categoryId || null,
      kind: form.kind,
      amount,
      description: form.description.trim() || (form.kind === 'income' ? 'Income' : 'Expense'),
      frequency: form.frequency,
      nextDate: form.nextDate,
      endDate: form.endDate || null,
      active: editing?.active ?? true,
    }
    if (editing) {
      await window.api.recurring.update(editing.id, payload)
    } else {
      await window.api.recurring.create(payload)
    }
    // A rule saved with a due (or past-due) date should post immediately rather than waiting
    // for the next app restart or a manual "Run now".
    await window.api.recurring.run()
    setShowForm(false)
    await refresh()
  }

  async function handleDelete(id: string) {
    if (
      !(await confirmDialog('Delete this recurring transaction? Transactions it already created will stay.', {
        danger: true,
        confirmLabel: 'Delete',
      }))
    )
      return
    await window.api.recurring.delete(id)
    await refresh()
  }

  async function toggleActive(rule: RecurringTransaction) {
    await window.api.recurring.update(rule.id, { active: !rule.active })
    await window.api.recurring.run()
    await refresh()
  }

  async function handleRunNow() {
    setRunning(true)
    setStatus(null)
    const result = await window.api.recurring.run()
    await refresh()
    setStatus(
      result.created > 0 ? `Posted ${result.created} transaction${result.created === 1 ? '' : 's'}.` : 'Nothing due yet.',
    )
    setRunning(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Recurring</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <small style={{ opacity: 0.7 }}>{status}</small>}
          <button className="btn" onClick={handleRunNow} disabled={running}>
            <Play size={14} strokeWidth={2.25} />
            Run now
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} strokeWidth={2.5} />
            Add recurring
          </button>
        </div>
      </div>

      <div className="page-stack">
      {sorted.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <Repeat size={19} strokeWidth={1.75} />
          </div>
          No recurring transactions yet. Add rent, subscriptions, or your paycheck so they post automatically.
        </div>
      ) : (
        <div className="card card-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th>Frequency</th>
                <th>Next / ends</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((rule) => {
                const category = rule.categoryId ? categoryById.get(rule.categoryId) : null
                const account = accountById.get(rule.accountId)
                return (
                  <tr key={rule.id} style={{ opacity: rule.active ? 1 : 0.5 }}>
                    <td>{rule.description}</td>
                    <td>{account?.name ?? '—'}</td>
                    <td>
                      {category ? (
                        <span className="tag">
                          <span className="tag-dot" style={{ background: category.color }} />
                          {category.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{FREQUENCY_LABELS[rule.frequency]}</td>
                    <td>
                      <div>{isEnded(rule) ? `Ended ${rule.endDate}` : rule.nextDate}</div>
                      {rule.endDate && !isEnded(rule) && <small style={{ opacity: 0.6 }}>Ends {rule.endDate}</small>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`amount ${rule.kind}`}>
                        {rule.kind === 'income' ? '+' : '-'}
                        {formatMoney(rule.amount)}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => toggleActive(rule)}>
                        {rule.active ? 'Pause' : 'Resume'}
                      </button>{' '}
                      <button className="btn btn-sm" onClick={() => openEdit(rule)}>
                        Edit
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(rule.id)}>
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
        <Modal
          title={editing ? 'Edit recurring transaction' : 'Add recurring transaction'}
          onClose={() => setShowForm(false)}
        >
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
                  placeholder="e.g. Rent"
                />
              </div>
              <div className="form-field">
                <label>Account</label>
                <Select value={form.accountId} onChange={(v) => setForm({ ...form, accountId: v })}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label>Category</label>
                <Select value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })}>
                  <option value="">Uncategorized</option>
                  {categoriesForKind.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label>Frequency</label>
                <Select
                  value={form.frequency}
                  onChange={(v) => setForm({ ...form, frequency: v as RecurringFrequency })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div className="form-field">
                <label>Next date</label>
                <input
                  type="date"
                  value={form.nextDate}
                  onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>End date (optional)</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.nextDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
    </div>
  )
}
