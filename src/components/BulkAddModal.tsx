import { useState, type KeyboardEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { TxKind } from '../lib/types'
import { formatMoney, todayIso, MAX_AMOUNT } from '../lib/format'
import Modal from './Modal'
import Select from './Select'

interface BulkRow {
  key: string
  date: string
  description: string
  accountId: string
  categoryId: string
  kind: TxKind
  amount: string
}

function makeRow(defaults: Partial<BulkRow> = {}): BulkRow {
  return {
    key: crypto.randomUUID(),
    date: todayIso(),
    description: '',
    accountId: '',
    categoryId: '',
    kind: 'expense',
    amount: '',
    ...defaults,
  }
}

export default function BulkAddModal({ data, onClose }: { data: FinanceData; onClose: () => void }) {
  const { accounts, categories, refresh } = data
  const defaultAccountId = accounts[0]?.id ?? ''
  const defaultCategoryId = categories.find((c) => c.kind === 'expense')?.id ?? ''

  const [rows, setRows] = useState<BulkRow[]>([
    makeRow({ accountId: defaultAccountId, categoryId: defaultCategoryId }),
  ])
  const [saving, setSaving] = useState(false)

  function updateRow(key: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function setKind(key: string, kind: TxKind) {
    const firstMatch = categories.find((c) => c.kind === kind)
    updateRow(key, { kind, categoryId: firstMatch?.id ?? '' })
  }

  function addRow() {
    const last = rows[rows.length - 1]
    setRows((prev) => [
      ...prev,
      makeRow({
        accountId: last?.accountId || defaultAccountId,
        date: last?.date || todayIso(),
        kind: last?.kind ?? 'expense',
        categoryId: last?.categoryId || defaultCategoryId,
      }),
    ])
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  function handleAmountKeyDown(e: KeyboardEvent<HTMLInputElement>, isLastRow: boolean) {
    if (e.key === 'Enter' && isLastRow) {
      e.preventDefault()
      addRow()
    }
  }

  const validRows = rows.filter(
    (r) => r.accountId && r.date && Number(r.amount) > 0 && Number(r.amount) <= MAX_AMOUNT,
  )
  const totalIncome = validRows.filter((r) => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = validRows.filter((r) => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0)

  async function handleSubmit() {
    if (validRows.length === 0) return
    setSaving(true)
    try {
      await Promise.all(
        validRows.map((r) =>
          window.api.transactions.create({
            accountId: r.accountId,
            categoryId: r.categoryId || null,
            kind: r.kind,
            amount: Number(r.amount),
            description: r.description.trim() || (r.kind === 'income' ? 'Income' : 'Expense'),
            date: r.date,
          }),
        ),
      )
      await refresh()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <Modal title="Quick add transactions" onClose={onClose}>
        <p>Add an account first before entering transactions.</p>
        <div className="form-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Quick add transactions" onClose={onClose} wide>
      <table className="bulk-grid">
        <thead>
          <tr>
            <th className="col-date">Date</th>
            <th>Description</th>
            <th>Account</th>
            <th>Category</th>
            <th className="col-kind">Type</th>
            <th className="col-amount">Amount</th>
            <th className="col-remove"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const categoriesForKind = categories.filter((c) => c.kind === row.kind)
            return (
              <tr key={row.key}>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row.key, { date: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    placeholder={row.kind === 'income' ? 'Income' : 'Expense'}
                  />
                </td>
                <td>
                  <Select
                    value={row.accountId}
                    onChange={(v) => updateRow(row.key, { accountId: v })}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Select
                    value={row.categoryId}
                    onChange={(v) => updateRow(row.key, { categoryId: v })}
                  >
                    <option value="">Uncategorized</option>
                    {categoriesForKind.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <Select value={row.kind} onChange={(v) => setKind(row.key, v as TxKind)}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </Select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={MAX_AMOUNT}
                    value={row.amount}
                    onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    onKeyDown={(e) => handleAmountKeyDown(e, i === rows.length - 1)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="row-remove-btn"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                    aria-label="Remove row"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button type="button" className="bulk-add-row-btn" onClick={addRow}>
        <Plus size={14} strokeWidth={2.25} />
        Add row
      </button>

      <div className="bulk-summary">
        <span>
          <strong>{validRows.length}</strong> of {rows.length} row{rows.length === 1 ? '' : 's'} ready
        </span>
        {totalIncome > 0 && (
          <span>
            Income: <strong className="amount income">+{formatMoney(totalIncome)}</strong>
          </span>
        )}
        {totalExpense > 0 && (
          <span>
            Expense: <strong className="amount expense">-{formatMoney(totalExpense)}</strong>
          </span>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={validRows.length === 0 || saving}
        >
          {saving ? 'Saving…' : `Add ${validRows.length || ''} transaction${validRows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </Modal>
  )
}
