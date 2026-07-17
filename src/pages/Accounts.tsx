import { useState, type FormEvent } from 'react'
import { Plus, Wallet, Landmark, PiggyBank, CreditCard, Banknote, LineChart } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { Account } from '../lib/types'
import { formatMoney, MAX_AMOUNT } from '../lib/format'
import { confirmDialog } from '../lib/dialog'
import Modal from '../components/Modal'
import Tooltip from '../components/Tooltip'

const ACCOUNT_TYPE_SUGGESTIONS = ['Checking', 'Savings', 'Credit Card', 'Cash', 'Investment']

const ACCOUNT_TYPE_ICONS: { match: RegExp; icon: typeof Landmark }[] = [
  { match: /check/i, icon: Landmark },
  { match: /saving/i, icon: PiggyBank },
  { match: /credit/i, icon: CreditCard },
  { match: /cash/i, icon: Banknote },
  { match: /invest|brokerage|retirement|401k|ira/i, icon: LineChart },
]

function iconForType(type: string) {
  return ACCOUNT_TYPE_ICONS.find((t) => t.match.test(type))?.icon ?? Wallet
}

interface FormState {
  name: string
  type: string
  startingBalance: string
}

function emptyForm(): FormState {
  return { name: '', type: 'Checking', startingBalance: '0' }
}

export default function Accounts({ data }: { data: FinanceData }) {
  const { accounts, balancesByAccount, refresh } = data
  const [editing, setEditing] = useState<Account | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setForm({
      name: account.name,
      type: account.type,
      startingBalance: String(account.startingBalance),
    })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      type: form.type.trim() || 'Other',
      startingBalance: Number(form.startingBalance) || 0,
    }
    if (!payload.name || Math.abs(payload.startingBalance) > MAX_AMOUNT) return
    if (editing) {
      await window.api.accounts.update(editing.id, payload)
    } else {
      await window.api.accounts.create(payload)
    }
    setShowForm(false)
    await refresh()
  }

  async function handleDelete(id: string) {
    if (
      !(await confirmDialog('Delete this account? Its transactions will also be removed.', {
        danger: true,
        confirmLabel: 'Delete',
      }))
    )
      return
    await window.api.accounts.delete(id)
    await refresh()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Accounts</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} strokeWidth={2.5} />
          Add account
        </button>
      </div>

      <div className="page-stack">
        {accounts.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">
              <Wallet size={19} strokeWidth={1.75} />
            </div>
            No accounts yet. Add your first account to get started.
          </div>
        ) : (
          <div className="accounts-grid">
            {accounts.map((account) => {
              const Icon = iconForType(account.type)
              return (
                <div key={account.id} className="card account-card">
                  <div className="account-type-row">
                    <div className="account-type">{account.type}</div>
                    <div className="stat-icon">
                      <Icon size={20} strokeWidth={2} />
                    </div>
                  </div>
                  <h3>{account.name}</h3>
                  <div className="account-balance">
                    <Tooltip content={formatMoney(balancesByAccount.get(account.id) ?? 0)}>
                      <span>{formatMoney(balancesByAccount.get(account.id) ?? 0)}</span>
                    </Tooltip>
                  </div>
                  <div className="account-actions">
                    <button className="btn btn-sm" onClick={() => openEdit(account)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(account.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <Modal
          key={editing?.id ?? 'new'}
          title={editing ? 'Edit account' : 'Add account'}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Name</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chase Checking"
                  required
                />
              </div>
              <div className="form-field">
                <label>Type</label>
                <input
                  list="account-type-suggestions"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="e.g. Checking, HSA, 401k…"
                />
                <datalist id="account-type-suggestions">
                  {ACCOUNT_TYPE_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="form-field">
                <label>Starting balance</label>
                <input
                  type="number"
                  step="0.01"
                  min={-MAX_AMOUNT}
                  max={MAX_AMOUNT}
                  value={form.startingBalance}
                  onChange={(e) => setForm({ ...form, startingBalance: e.target.value })}
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
