import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Plus,
  CreditCard,
  GraduationCap,
  Car,
  Home,
  HandCoins,
  Landmark,
  Wallet,
  CalendarCheck,
  TrendingDown,
  BadgeDollarSign,
} from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { Debt, DebtType } from '../lib/types'
import { formatMoney, formatMonth, currentMonth, MAX_AMOUNT } from '../lib/format'
import { monthOf } from '../lib/calc'
import { forecastPayoff, multiDebtForecastSeries, singleDebtForecastSeries, growthProjection } from '../lib/debtCalc'
import { confirmDialog } from '../lib/dialog'
import {
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  chartMargin,
  axisTickMargin,
  gridStroke,
  axisStroke,
  seriesColors,
  formatAxisMoney,
  yAxisWidth,
} from '../lib/chartTheme'
import ChartLegend from '../components/ChartLegend'
import Modal from '../components/Modal'
import DebtPaymentsModal from '../components/DebtPaymentsModal'
import ValueTooltip from '../components/Tooltip'
import Select from '../components/Select'

const DEBT_TYPES: { value: DebtType; label: string; icon: typeof CreditCard }[] = [
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'student_loan', label: 'Student Loan', icon: GraduationCap },
  { value: 'auto_loan', label: 'Auto Loan', icon: Car },
  { value: 'mortgage', label: 'Mortgage', icon: Home },
  { value: 'personal_loan', label: 'Personal Loan', icon: HandCoins },
  { value: 'other', label: 'Other', icon: Landmark },
]

interface FormState {
  name: string
  type: DebtType
  originalBalance: string
  currentBalance: string
  interestRate: string
  monthlyPayment: string
}

const emptyForm: FormState = {
  name: '',
  type: 'credit_card',
  originalBalance: '',
  currentBalance: '',
  interestRate: '',
  monthlyPayment: '',
}

export default function Debts({ data }: { data: FinanceData }) {
  const { debts, debtPayments, totalDebt, refresh } = data
  const [editing, setEditing] = useState<Debt | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [paymentsFor, setPaymentsFor] = useState<Debt | null>(null)

  const month = currentMonth()
  const paidThisMonth = useMemo(
    () => debtPayments.filter((p) => monthOf(p.date) === month).reduce((s, p) => s + p.amount, 0),
    [debtPayments, month],
  )
  const totalMonthlyPayment = useMemo(() => debts.reduce((s, d) => s + d.monthlyPayment, 0), [debts])

  const forecasts = useMemo(() => {
    const map = new Map<string, ReturnType<typeof forecastPayoff>>()
    for (const d of debts) map.set(d.id, forecastPayoff(d.currentBalance, d.interestRate, d.monthlyPayment))
    return map
  }, [debts])

  const debtFreeDate = useMemo(() => {
    const withBalance = debts.filter((d) => d.currentBalance > 0)
    if (withBalance.length === 0) return null
    const dates = withBalance.map((d) => forecasts.get(d.id)?.payoffDate ?? null)
    if (dates.some((d) => d === null)) return null
    return dates.reduce((latest, d) => (d! > latest! ? d : latest), dates[0])
  }, [debts, forecasts])

  const [forecastTab, setForecastTab] = useState<'all' | string>('all')
  const activeForecastTab = debts.some((d) => d.id === forecastTab) ? forecastTab : 'all'
  const selectedDebt = activeForecastTab === 'all' ? null : (debts.find((d) => d.id === activeForecastTab) ?? null)

  const forecastCardRef = useRef<HTMLDivElement>(null)
  function viewDebtForecast(debtId: string) {
    setForecastTab(debtId)
    forecastCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const multiSeries = useMemo(() => multiDebtForecastSeries(debts), [debts])
  const singleSeries = useMemo(
    () => (selectedDebt ? singleDebtForecastSeries(selectedDebt) : []),
    [selectedDebt],
  )
  const growthSeries = useMemo(
    () => (selectedDebt ? growthProjection(selectedDebt) : []),
    [selectedDebt],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(debt: Debt) {
    setEditing(debt)
    setForm({
      name: debt.name,
      type: debt.type,
      originalBalance: String(debt.originalBalance),
      currentBalance: String(debt.currentBalance),
      interestRate: String(debt.interestRate),
      monthlyPayment: String(debt.monthlyPayment),
    })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const originalBalance = Number(form.originalBalance)
    const currentBalance = Number(form.currentBalance)
    const monthlyPayment = Number(form.monthlyPayment) || 0
    if (
      !form.name.trim() ||
      originalBalance <= 0 ||
      originalBalance > MAX_AMOUNT ||
      currentBalance < 0 ||
      currentBalance > MAX_AMOUNT ||
      monthlyPayment > MAX_AMOUNT
    )
      return
    const payload = {
      name: form.name.trim(),
      type: form.type,
      originalBalance,
      currentBalance,
      interestRate: Number(form.interestRate) || 0,
      monthlyPayment,
    }
    if (editing) {
      await window.api.debts.update(editing.id, payload)
    } else {
      await window.api.debts.create(payload)
    }
    setShowForm(false)
    await refresh()
  }

  async function handleDelete(id: string) {
    if (
      !(await confirmDialog('Delete this debt? Its payment history will also be removed.', {
        danger: true,
        confirmLabel: 'Delete',
      }))
    )
      return
    await window.api.debts.delete(id)
    await refresh()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Debts</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} strokeWidth={2.5} />
          Add debt
        </button>
      </div>

      <div className="page-stack">
      {debts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <CreditCard size={19} strokeWidth={1.75} />
          </div>
          No debts tracked yet. Add a credit card, loan, or mortgage to start forecasting payoff.
        </div>
      ) : (
        <>
          <div className="card-grid">
            <div className="card stat-card">
              <div className="stat-icon expense">
                <TrendingDown size={19} strokeWidth={2} />
              </div>
              <div className="stat-text">
                <div className="stat-label">
                  <ValueTooltip content="Total debt">
                    <span>Total debt</span>
                  </ValueTooltip>
                </div>
                <div className="stat-value expense">
                  <ValueTooltip content={formatMoney(totalDebt)}>
                    <span>{formatMoney(totalDebt)}</span>
                  </ValueTooltip>
                </div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">
                <Wallet size={19} strokeWidth={2} />
              </div>
              <div className="stat-text">
                <div className="stat-label">
                  <ValueTooltip content="Monthly payments">
                    <span>Monthly payments</span>
                  </ValueTooltip>
                </div>
                <div className="stat-value">
                  <ValueTooltip content={formatMoney(totalMonthlyPayment)}>
                    <span>{formatMoney(totalMonthlyPayment)}</span>
                  </ValueTooltip>
                </div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon income">
                <BadgeDollarSign size={19} strokeWidth={2} />
              </div>
              <div className="stat-text">
                <div className="stat-label">
                  <ValueTooltip content="Paid this month">
                    <span>Paid this month</span>
                  </ValueTooltip>
                </div>
                <div className="stat-value income">
                  <ValueTooltip content={formatMoney(paidThisMonth)}>
                    <span>{formatMoney(paidThisMonth)}</span>
                  </ValueTooltip>
                </div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon">
                <CalendarCheck size={19} strokeWidth={2} />
              </div>
              <div className="stat-text">
                <div className="stat-label">
                  <ValueTooltip content="Debt-free by">
                    <span>Debt-free by</span>
                  </ValueTooltip>
                </div>
                <div className="stat-value">
                  <ValueTooltip content={debtFreeDate ? formatMonth(debtFreeDate.slice(0, 7)) : '—'}>
                    <span>{debtFreeDate ? formatMonth(debtFreeDate.slice(0, 7)) : '—'}</span>
                  </ValueTooltip>
                </div>
              </div>
            </div>
          </div>

          <div className="card" ref={forecastCardRef}>
            <h2 className="chart-title">Payoff forecast</h2>
            <div className="tab-bar">
              <button
                className={activeForecastTab === 'all' ? 'active' : ''}
                onClick={() => setForecastTab('all')}
              >
                All debts
              </button>
              {debts.map((d) => (
                <button
                  key={d.id}
                  className={activeForecastTab === d.id ? 'active' : ''}
                  onClick={() => setForecastTab(d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {activeForecastTab === 'all' ? (
              multiSeries.lines.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  No debts have a forecastable payoff yet — set a monthly payment above the monthly interest on
                  at least one debt.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={multiSeries.data} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={axisStroke}
                      fontSize={11}
                      interval="preserveStartEnd"
                      minTickGap={40}
                      tickMargin={axisTickMargin}
                    />
                    <YAxis
                      stroke={axisStroke}
                      fontSize={12}
                      tickFormatter={formatAxisMoney}
                      width={yAxisWidth}
                      tickMargin={axisTickMargin}
                    />
                    <Tooltip
                      formatter={(v) => formatMoney(Number(v))}
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />
                    <Legend content={<ChartLegend />} />
                    {multiSeries.lines.map((line, i) => (
                      <Line
                        key={line.id}
                        type="monotone"
                        dataKey={line.id}
                        name={line.name}
                        stroke={seriesColors[i % seriesColors.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )
            ) : selectedDebt && selectedDebt.currentBalance <= 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                {selectedDebt.name} is paid off 🎉
              </div>
            ) : singleSeries.length === 0 ? (
              growthSeries.length > 0 ? (
                <>
                  <p className="forecast-warning">
                    This payment doesn't cover the monthly interest — projected balance if it stays the same:
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={growthSeries} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke={axisStroke}
                        fontSize={11}
                        interval="preserveStartEnd"
                        minTickGap={40}
                        tickMargin={axisTickMargin}
                      />
                      <YAxis
                        stroke={axisStroke}
                        fontSize={12}
                        tickFormatter={formatAxisMoney}
                        width={yAxisWidth}
                        tickMargin={axisTickMargin}
                      />
                      <Tooltip
                        formatter={(v) => formatMoney(Number(v))}
                        contentStyle={tooltipContentStyle}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        name="Projected balance"
                        stroke="var(--expense)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : selectedDebt && selectedDebt.monthlyPayment <= 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  Set a monthly payment to forecast payoff.
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  This payment looks too low to cover the interest on an installment loan — double check it
                  matches your loan statement.
                </div>
              )
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={singleSeries} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke={axisStroke}
                    fontSize={11}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    tickMargin={axisTickMargin}
                  />
                  <YAxis
                    stroke={axisStroke}
                    fontSize={12}
                    tickFormatter={formatAxisMoney}
                    width={yAxisWidth}
                    tickMargin={axisTickMargin}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Remaining balance"
                    stroke="var(--expense)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="accounts-grid">
            {debts.map((debt) => {
              const meta = DEBT_TYPES.find((t) => t.value === debt.type)
              const forecast = forecasts.get(debt.id)
              const paidPct =
                debt.originalBalance > 0
                  ? Math.min(100, ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100)
                  : 0
              return (
                <div key={debt.id} className="card account-card">
                  <div className="account-type-row">
                    <div className="account-type">{meta?.label ?? debt.type}</div>
                    <div className="stat-icon expense">{meta && <meta.icon size={20} strokeWidth={2} />}</div>
                  </div>
                  <h3>{debt.name}</h3>
                  <div className="account-balance expense">
                    <ValueTooltip content={formatMoney(debt.currentBalance)}>
                      <span>{formatMoney(debt.currentBalance)}</span>
                    </ValueTooltip>
                  </div>

                  <div className="budget-progress-track">
                    <div className="budget-progress-fill" style={{ width: `${paidPct}%` }} />
                  </div>
                  <small style={{ opacity: 0.7 }}>
                    {paidPct.toFixed(0)}% paid off of {formatMoney(debt.originalBalance)}
                  </small>

                  <small style={{ opacity: 0.7 }}>
                    {debt.interestRate.toFixed(2)}% APR · {formatMoney(debt.monthlyPayment)}/mo
                  </small>

                  {debt.currentBalance <= 0 ? (
                    <small className="status-text income">Paid off 🎉</small>
                  ) : !forecast?.payable ? (
                    <button
                      type="button"
                      className="status-text-btn expense"
                      onClick={() => viewDebtForecast(debt.id)}
                    >
                      {debt.monthlyPayment <= 0
                        ? 'Set a monthly payment to forecast payoff'
                        : debt.type === 'credit_card'
                          ? "Payment doesn't cover interest — balance is growing"
                          : 'Payment looks too low — check your loan statement'}
                    </button>
                  ) : (
                    <small>
                      Paid off in <strong>{forecast.months}</strong> mo (
                      {formatMonth(forecast.payoffDate!.slice(0, 7))}) · {formatMoney(forecast.totalInterest ?? 0)}{' '}
                      interest
                    </small>
                  )}

                  <div className="account-actions">
                    <button className="btn btn-sm" onClick={() => setPaymentsFor(debt)}>
                      Payments
                    </button>
                    <button className="btn btn-sm" onClick={() => openEdit(debt)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(debt.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit debt' : 'Add debt'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Name</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chase Sapphire"
                  required
                />
              </div>
              <div className="form-field">
                <label>Type</label>
                <Select value={form.type} onChange={(v) => setForm({ ...form, type: v as DebtType })}>
                  {DEBT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="form-field">
                <label>Original balance</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={MAX_AMOUNT}
                  value={form.originalBalance}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm((f) => ({
                      ...f,
                      originalBalance: val,
                      currentBalance: editing ? f.currentBalance : val,
                    }))
                  }}
                  required
                />
              </div>
              <div className="form-field">
                <label>Current balance</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={MAX_AMOUNT}
                  value={form.currentBalance}
                  onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Interest rate (APR %)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  placeholder="e.g. 19.99"
                />
              </div>
              <div className="form-field">
                <label>Monthly payment</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={MAX_AMOUNT}
                  value={form.monthlyPayment}
                  onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })}
                  placeholder="Used for payoff forecast"
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

      {paymentsFor && <DebtPaymentsModal data={data} debt={paymentsFor} onClose={() => setPaymentsFor(null)} />}
    </div>
  )
}
