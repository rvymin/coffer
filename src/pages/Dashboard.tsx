import { useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PieChart as PieChartIcon,
  Receipt,
  CreditCard,
  ArrowLeftRight,
  LineChart as LineChartIcon,
  Repeat,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import { formatMoney, currentMonth, formatMonth } from '../lib/format'
import { monthOf, monthlyTotals, monthlySeries, monthsBetween, spendingByCategoryInRange } from '../lib/calc'
import { netWorthSeries } from '../lib/netWorth'
import { resolveRange, formatRangeLabel, type RangePreset } from '../lib/dateRange'
import {
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  chartMargin,
  axisTickMargin,
  gridStroke,
  axisStroke,
  formatAxisMoney,
  yAxisWidth,
} from '../lib/chartTheme'
import StatCard from '../components/StatCard'
import ChartLegend from '../components/ChartLegend'
import ValueTooltip from '../components/Tooltip'
import DateRangePicker from '../components/DateRangePicker'

export default function Dashboard({
  data,
  amountsHidden,
  onToggleAmounts,
}: {
  data: FinanceData
  amountsHidden: boolean
  onToggleAmounts: () => void
}) {
  const { accounts, transactions, categoryById, debts, debtPayments, netWorth, totalAssets, totalDebt } = data
  const month = currentMonth()

  const { income, expense } = useMemo(() => monthlyTotals(transactions, month), [transactions, month])
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  const [rangePreset, setRangePreset] = useState<RangePreset>('last6')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const transactionDates = useMemo(() => transactions.map((tx) => tx.date), [transactions])
  const range = useMemo(
    () => resolveRange(rangePreset, customFrom, customTo, transactionDates),
    [rangePreset, customFrom, customTo, transactionDates],
  )
  const rangeLabel = useMemo(() => formatRangeLabel(rangePreset, range), [rangePreset, range])
  const rangeMonths = useMemo(() => monthsBetween(monthOf(range.from), monthOf(range.to)), [range])

  const series = useMemo(
    () =>
      monthlySeries(transactions, rangeMonths).map((m) => ({
        ...m,
        label: formatMonth(m.month).split(' ')[0],
      })),
    [transactions, rangeMonths],
  )

  const pieData = useMemo(() => {
    const spend = spendingByCategoryInRange(transactions, range.from, range.to)
    return Array.from(spend.entries())
      .map(([categoryId, amount]) => ({
        name: categoryById.get(categoryId)?.name ?? 'Other',
        value: amount,
        color: categoryById.get(categoryId)?.color ?? 'var(--text-dim)',
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, range, categoryById])

  const recentTx = useMemo(() => transactions.slice(0, 8), [transactions])

  const netWorthData = useMemo(() => {
    const points = netWorthSeries(accounts, transactions, debts, debtPayments, rangeMonths).map((p) => ({
      ...p,
      label: formatMonth(p.month).split(' ')[0],
    }))
    // Override the current month with the live totals so the chart's last point always
    // matches the "Net worth" stat card above, even if debts were manually adjusted.
    if (points.length > 0) {
      const last = points[points.length - 1]
      if (last.month === month) {
        points[points.length - 1] = { ...last, assets: totalAssets, debt: totalDebt, netWorth }
      }
    }
    return points
  }, [accounts, transactions, debts, debtPayments, rangeMonths, totalAssets, totalDebt, netWorth, month])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
        </div>
        <button
          className={`btn privacy-toggle${amountsHidden ? ' active' : ''}`}
          onClick={onToggleAmounts}
          aria-pressed={amountsHidden}
        >
          {amountsHidden ? (
            <EyeOff size={15} strokeWidth={2} />
          ) : (
            <Eye size={15} strokeWidth={2} />
          )}
          {amountsHidden ? 'Show amounts' : 'Hide amounts'}
        </button>
      </div>

      <div className="page-stack">
        <div className="card hero-card">
          <div className="hero-label">Net worth</div>
          <div className="hero-value">{amountsHidden ? '••••••' : formatMoney(netWorth)}</div>
          <div className="hero-chips">
            <span className="hero-chip">
              <TrendingUp size={13} strokeWidth={2.25} className="hero-chip-icon income" />
              Total assets <strong>{amountsHidden ? '••••' : formatMoney(totalAssets)}</strong>
            </span>
            <span className="hero-chip">
              <TrendingDown size={13} strokeWidth={2.25} className="hero-chip-icon expense" />
              Total debt <strong>{amountsHidden ? '••••' : formatMoney(totalDebt)}</strong>
            </span>
          </div>
        </div>

        <div className="card-grid">
          <StatCard
            label="Income this month"
            value={formatMoney(income)}
            icon={TrendingUp}
            tone="income"
            hidden={amountsHidden}
          />
          <StatCard
            label="Expenses this month"
            value={formatMoney(expense)}
            icon={TrendingDown}
            tone="expense"
            hidden={amountsHidden}
          />
          <StatCard
            label="Savings rate"
            value={income > 0 ? `${savingsRate.toFixed(0)}%` : '—'}
            icon={PiggyBank}
            hidden={amountsHidden}
          />
          {debts.length > 0 && (
            <StatCard
              label="Total debt"
              value={formatMoney(totalDebt)}
              icon={CreditCard}
              tone="expense"
              hidden={amountsHidden}
            />
          )}
        </div>

        <div className="toolbar">
          <DateRangePicker
            preset={rangePreset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={setRangePreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>

        <div className="card">
          <h2 className="chart-title">Net worth trend ({rangeLabel})</h2>
          {accounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <LineChartIcon size={19} strokeWidth={1.75} />
              </div>
              Add an account to start tracking your net worth over time.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={netWorthData} margin={chartMargin}>
                <defs>
                  {/* userSpaceOnUse spans the fixed 260px plot height, so the fade stays
                      uniform no matter how extreme the data — a bounding-box gradient
                      re-maps its fade to the data's extremes and renders as a hard-edged
                      shaded block under the curve. */}
                  <linearGradient
                    id="netWorthFill"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1={chartMargin.top}
                    x2="0"
                    y2={260 - chartMargin.bottom}
                  >
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={axisStroke}
                  fontSize={12}
                  minTickGap={30}
                  interval="preserveStartEnd"
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
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  name="Net worth"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#netWorthFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-row">
          <div className="card">
            <h2 className="chart-title">Income vs expenses ({rangeLabel})</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={series} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={axisStroke}
                  fontSize={12}
                  minTickGap={30}
                  interval="preserveStartEnd"
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
                <Bar dataKey="income" name="Income" fill="var(--income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="var(--expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="chart-title">Spending by category ({rangeLabel})</h2>
            {pieData.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <PieChartIcon size={19} strokeWidth={1.75} />
                </div>
                No expenses in this range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Recent transactions</h2>
          {recentTx.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Receipt size={19} strokeWidth={1.75} />
              </div>
              No transactions yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx) => {
                  const category = tx.categoryId ? categoryById.get(tx.categoryId) : null
                  return (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>
                        {tx.description}
                        {tx.recurringId && (
                          <ValueTooltip content="Posted by a recurring transaction" alwaysShow>
                            <span className="recurring-badge">
                              <Repeat size={12} strokeWidth={2.25} />
                            </span>
                          </ValueTooltip>
                        )}
                      </td>
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
                          {amountsHidden
                            ? '••••'
                            : `${tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : ''}${formatMoney(tx.amount)}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
