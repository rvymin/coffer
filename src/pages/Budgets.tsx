import { useMemo, useState } from 'react'
import { Target, TrendingDown, Scale, PiggyBank, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { Budget } from '../lib/types'
import { formatMoney, formatMonth, currentMonth, MAX_AMOUNT } from '../lib/format'
import { spendingByCategory } from '../lib/calc'
import ManageCategoriesModal from '../components/ManageCategoriesModal'
import Tooltip from '../components/Tooltip'

export default function Budgets({ data }: { data: FinanceData }) {
  const { categories, budgets, transactions, refresh } = data
  const [month, setMonth] = useState(currentMonth())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [showCategories, setShowCategories] = useState(false)

  const expenseCategories = useMemo(() => categories.filter((c) => c.kind === 'expense'), [categories])
  const spending = useMemo(() => spendingByCategory(transactions, month), [transactions, month])
  const budgetsForMonth = useMemo(() => {
    const map = new Map<string, Budget>()
    for (const b of budgets) if (b.month === month) map.set(b.categoryId, b)
    return map
  }, [budgets, month])

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function draftValue(categoryId: string) {
    if (categoryId in drafts) return drafts[categoryId]
    return String(budgetsForMonth.get(categoryId)?.amount ?? '')
  }

  async function saveBudget(categoryId: string) {
    const raw = drafts[categoryId]
    if (raw === undefined) return
    const trimmed = raw.trim()
    const amount = Number(trimmed)
    const existing = budgetsForMonth.get(categoryId)

    if (trimmed === '' || !Number.isFinite(amount) || amount <= 0) {
      if (existing) await window.api.budgets.delete(existing.id)
    } else if (amount <= MAX_AMOUNT) {
      await window.api.budgets.upsert({ categoryId, month, amount })
    }

    setDrafts((d) => {
      const next = { ...d }
      delete next[categoryId]
      return next
    })
    await refresh()
  }

  const budgetedCategoryIds = useMemo(() => new Set(budgetsForMonth.keys()), [budgetsForMonth])
  const totalBudget = Array.from(budgetsForMonth.values()).reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = expenseCategories
    .filter((c) => budgetedCategoryIds.has(c.id))
    .reduce((sum, c) => sum + (spending.get(c.id) ?? 0), 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Budgets</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => setShowCategories(true)}>
            <Tag size={14} strokeWidth={2.25} />
            Manage categories
          </button>
          <div className="month-picker">
            <button className="btn btn-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={15} strokeWidth={2.25} />
            </button>
            <strong>{formatMonth(month)}</strong>
            <button className="btn btn-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={15} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>

      <div className="page-stack">
        <div className="card-grid">
          <div className="card stat-card">
            <div className="stat-icon">
              <Target size={19} strokeWidth={2} />
            </div>
            <div className="stat-text">
              <div className="stat-label">
                <Tooltip content="Total budgeted">
                  <span>Total budgeted</span>
                </Tooltip>
              </div>
              <div className="stat-value">
                <Tooltip content={formatMoney(totalBudget)}>
                  <span>{formatMoney(totalBudget)}</span>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon expense">
              <TrendingDown size={19} strokeWidth={2} />
            </div>
            <div className="stat-text">
              <div className="stat-label">
                <Tooltip content="Total spent">
                  <span>Total spent</span>
                </Tooltip>
              </div>
              <div className="stat-value expense">
                <Tooltip content={formatMoney(totalSpent)}>
                  <span>{formatMoney(totalSpent)}</span>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon">
              <Scale size={19} strokeWidth={2} />
            </div>
            <div className="stat-text">
              <div className="stat-label">
                <Tooltip content="Remaining">
                  <span>Remaining</span>
                </Tooltip>
              </div>
              <div className="stat-value">
                <Tooltip content={formatMoney(totalBudget - totalSpent)}>
                  <span>{formatMoney(totalBudget - totalSpent)}</span>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          {expenseCategories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <PiggyBank size={19} strokeWidth={1.75} />
              </div>
              No expense categories yet.
            </div>
          ) : (
            expenseCategories.map((c) => {
              const budgetAmount = budgetsForMonth.get(c.id)?.amount ?? 0
              const spent = spending.get(c.id) ?? 0
              const pct = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0
              const over = budgetAmount > 0 && spent > budgetAmount
              return (
                <div key={c.id} className="budget-row">
                  <span className="tag">
                    <span className="tag-dot" style={{ background: c.color }} />
                    <Tooltip content={c.name}>
                      <span>{c.name}</span>
                    </Tooltip>
                  </span>
                  <div>
                    <div className="budget-progress-track">
                      <div
                        className={`budget-progress-fill${over ? ' over' : ''}`}
                        style={{ width: `${budgetAmount > 0 ? pct : 0}%` }}
                      />
                    </div>
                    <small style={{ opacity: 0.7 }}>
                      {formatMoney(spent)} spent{budgetAmount > 0 ? ` of ${formatMoney(budgetAmount)}` : ''}
                      {over ? ' — over budget' : ''}
                    </small>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={MAX_AMOUNT}
                    placeholder="Budget"
                    value={draftValue(c.id)}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    onBlur={() => saveBudget(c.id)}
                  />
                  <button className="btn btn-sm" onClick={() => saveBudget(c.id)}>
                    Save
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showCategories && <ManageCategoriesModal data={data} onClose={() => setShowCategories(false)} />}
    </div>
  )
}
