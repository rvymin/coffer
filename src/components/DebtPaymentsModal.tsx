import { useMemo, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { Debt } from '../lib/types'
import { formatMoney, todayIso, MAX_AMOUNT } from '../lib/format'
import { confirmDialog } from '../lib/dialog'
import Modal from './Modal'
import Select from './Select'

const NO_ACCOUNT = ''

export default function DebtPaymentsModal({
  data,
  debt,
  onClose,
}: {
  data: FinanceData
  debt: Debt
  onClose: () => void
}) {
  const { debtPayments, accounts, accountById, transactions, refresh } = data
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? NO_ACCOUNT)

  const payments = useMemo(
    () => debtPayments.filter((p) => p.debtId === debt.id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [debtPayments, debt.id],
  )

  const transactionById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0 || value > MAX_AMOUNT || !date) return
    await window.api.debtPayments.create({
      debtId: debt.id,
      amount: value,
      date,
      note: note.trim() || null,
      accountId: accountId || null,
    })
    setAmount('')
    setNote('')
    await refresh()
  }

  async function handleDelete(id: string, hasLinkedTransaction: boolean) {
    const message = hasLinkedTransaction
      ? 'Delete this payment? The balance will be restored and the linked transaction will be removed.'
      : 'Delete this payment? The balance will be restored.'
    if (!(await confirmDialog(message, { danger: true, confirmLabel: 'Delete' }))) return
    await window.api.debtPayments.delete(id)
    await refresh()
  }

  return (
    <Modal title={`Payments — ${debt.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '13px 10px' }}>
          <div className="form-field">
            <label>Amount</label>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0.01"
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Paid from</label>
            <Select value={accountId} onChange={setAccountId}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value={NO_ACCOUNT}>Don't link an account (backfilling history)</option>
            </Select>
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Extra principal payment" />
          </div>
        </div>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className="btn btn-primary">
            Log payment
          </button>
        </div>
      </form>

      <h3 style={{ marginTop: 20 }}>History</h3>
      {payments.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px 0' }}>
          No payments logged yet.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Note</th>
              <th>Paid from</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const linkedTx = p.transactionId ? transactionById.get(p.transactionId) : undefined
              const linkedAccount = linkedTx ? accountById.get(linkedTx.accountId) : undefined
              return (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{p.note || '—'}</td>
                  <td>
                    {linkedAccount ? (
                      linkedAccount.name
                    ) : (
                      <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Not linked</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className="amount income">
                    {formatMoney(p.amount)}
                  </td>
                  <td>
                    <button
                      className="row-remove-btn"
                      onClick={() => handleDelete(p.id, Boolean(p.transactionId))}
                      aria-label="Delete payment"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
