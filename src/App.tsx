import { useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  CreditCard,
  Repeat,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useFinanceData } from './lib/useFinanceData'
import { useTheme } from './lib/useTheme'
import { useHiddenStats } from './lib/useHiddenStats'
import { formatMoney } from './lib/format'
import Tooltip from './components/Tooltip'
import logoMark from './assets/logo-mark.png'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Recurring from './pages/Recurring'
import Budgets from './pages/Budgets'
import Debts from './pages/Debts'
import Settings from './pages/Settings'
import DialogHost from './components/DialogHost'
import UpdateBanner from './components/UpdateBanner'
import './App.css'

type Tab = 'dashboard' | 'transactions' | 'recurring' | 'accounts' | 'debts' | 'budgets' | 'settings'

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'debts', label: 'Debts', icon: CreditCard },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const data = useFinanceData()
  const { theme, setTheme } = useTheme()
  const { hidden: amountsHidden, toggle: toggleAmounts } = useHiddenStats()

  return (
    <div className="app-root">
      <UpdateBanner />
      <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src={logoMark} alt="" width={30} height={30} />
          </div>
          <span className="brand-name">Coffer</span>
        </div>
        <ul>
          {TABS.map((t) => (
            <li key={t.id}>
              <button className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
                <t.icon size={16} strokeWidth={2} />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        {!data.loading && (
          <div className="sidebar-networth">
            <div className="sidebar-networth-head">
              <div className="sidebar-networth-label">Net worth</div>
              <button
                className={`privacy-eye${amountsHidden ? ' active' : ''}`}
                onClick={toggleAmounts}
                aria-label={amountsHidden ? 'Show amounts' : 'Hide amounts'}
                title={amountsHidden ? 'Show amounts' : 'Hide amounts'}
              >
                {amountsHidden ? (
                  <EyeOff size={14} strokeWidth={2} />
                ) : (
                  <Eye size={14} strokeWidth={2} />
                )}
              </button>
            </div>
            <div className="sidebar-networth-value">
              {amountsHidden ? (
                <span className="masked-dots">••••••</span>
              ) : (
                <Tooltip content={formatMoney(data.netWorth)}>
                  <span>{formatMoney(data.netWorth)}</span>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </nav>
      <main className="content">
        {data.loading ? (
          <div className="loading">
            <span className="loading-spinner" aria-hidden="true" />
            Loading your finances…
          </div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <Dashboard data={data} amountsHidden={amountsHidden} onToggleAmounts={toggleAmounts} />
            )}
            {tab === 'transactions' && <Transactions data={data} />}
            {tab === 'recurring' && <Recurring data={data} />}
            {tab === 'accounts' && <Accounts data={data} />}
            {tab === 'debts' && <Debts data={data} />}
            {tab === 'budgets' && <Budgets data={data} />}
            {tab === 'settings' && <Settings data={data} theme={theme} onThemeChange={setTheme} />}
          </>
        )}
      </main>
      <DialogHost />
      </div>
    </div>
  )
}

export default App
