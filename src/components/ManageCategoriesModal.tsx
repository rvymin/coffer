import { useMemo, useState, type FormEvent } from 'react'
import { Trash2, Plus } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { TxKind } from '../lib/types'
import { confirmDialog } from '../lib/dialog'
import Modal from './Modal'
import Select from './Select'

const COLOR_PALETTE = [
  '#2f9e44',
  '#37b24d',
  '#e8590c',
  '#9c36b5',
  '#1971c2',
  '#f08c00',
  '#0c8599',
  '#e64980',
  '#40c057',
  '#f76707',
  '#7c3aed',
  '#868e96',
]

export default function ManageCategoriesModal({ data, onClose }: { data: FinanceData; onClose: () => void }) {
  const { categories, refresh } = data
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<TxKind>('expense')
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0])

  const income = useMemo(() => categories.filter((c) => c.kind === 'income'), [categories])
  const expense = useMemo(() => categories.filter((c) => c.kind === 'expense'), [categories])

  function nameValue(id: string, fallback: string) {
    return id in drafts ? drafts[id] : fallback
  }

  async function saveName(id: string, fallback: string) {
    const value = drafts[id]
    if (value === undefined || value.trim() === '' || value === fallback) {
      setDrafts((d) => {
        const next = { ...d }
        delete next[id]
        return next
      })
      return
    }
    await window.api.categories.update(id, { name: value.trim() })
    setDrafts((d) => {
      const next = { ...d }
      delete next[id]
      return next
    })
    await refresh()
  }

  async function handleDelete(id: string) {
    if (
      !(await confirmDialog(
        'Delete this category? Any budgets for it will be removed and its transactions will become uncategorized.',
        { danger: true, confirmLabel: 'Delete' },
      ))
    )
      return
    await window.api.categories.delete(id)
    await refresh()
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await window.api.categories.create({ name: newName.trim(), kind: newKind, color: newColor })
    setNewName('')
    await refresh()
  }

  function renderRow(id: string, name: string, color: string) {
    return (
      <div key={id} className="category-row">
        <span className="tag-dot" style={{ background: color }} />
        <input
          value={nameValue(id, name)}
          onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))}
          onBlur={() => saveName(id, name)}
        />
        <button className="row-remove-btn" onClick={() => handleDelete(id)} aria-label="Delete category">
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    )
  }

  return (
    <Modal title="Manage categories" onClose={onClose}>
      <h3>Income</h3>
      {income.length === 0 ? (
        <div className="empty-state" style={{ padding: '10px 0' }}>
          No income categories yet.
        </div>
      ) : (
        <div className="category-list">{income.map((c) => renderRow(c.id, c.name, c.color))}</div>
      )}

      <h3 style={{ marginTop: 18 }}>Expense</h3>
      {expense.length === 0 ? (
        <div className="empty-state" style={{ padding: '10px 0' }}>
          No expense categories yet.
        </div>
      ) : (
        <div className="category-list">{expense.map((c) => renderRow(c.id, c.name, c.color))}</div>
      )}

      <h3 style={{ marginTop: 18 }}>Add category</h3>
      <form onSubmit={handleAdd}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-field">
            <label>Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Pet Care" />
          </div>
          <div className="form-field">
            <label>Type</label>
            <Select value={newKind} onChange={(v) => setNewKind(v as TxKind)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Color</label>
            <div className="color-swatches">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${c === newColor ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className="btn btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            Add category
          </button>
        </div>
      </form>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
