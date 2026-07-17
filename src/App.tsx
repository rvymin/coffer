import { useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  CreditCard,
  Repeat,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useFinanceData } from './lib/useFinanceData'
import { useTheme } from './lib/useTheme'
import logoMark from './assets/logo-mark.png'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Recurring from './pages/Recurring'
import Budgets from './pages/Budgets'
import Debts from './pages/Debts'
import Settings from './pages/Settings'
import DialogHost from './components/DialogHost'
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

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src={logoMark} alt="" width={15} height={15} />
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
      </nav>
      <main className="content">
        {data.loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard data={data} />}
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
  )
}

export default App
