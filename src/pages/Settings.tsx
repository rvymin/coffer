import { useState } from 'react'
import { DatabaseBackup, FileDown, FileUp, TriangleAlert } from 'lucide-react'
import type { FinanceData } from '../lib/useFinanceData'
import type { ThemePreference } from '../lib/useTheme'
import { confirmDialog } from '../lib/dialog'
import Modal from '../components/Modal'

const RESET_CONFIRM_WORD = 'DELETE'

export default function Settings({
  data,
  theme,
  onThemeChange,
}: {
  data: FinanceData
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)

  async function handleExportDb() {
    setStatus(null)
    const result = await window.api.backup.exportDb()
    if (!result.canceled) setStatus(`Backup saved to ${result.filePath}`)
  }

  async function handleExportCsv() {
    setStatus(null)
    const result = await window.api.backup.exportCsv()
    if (!result.canceled) setStatus(`Transactions exported to ${result.filePath}`)
  }

  async function handleImportDb() {
    if (!(await confirmDialog('Restoring a backup replaces all current data in this app. Continue?'))) return
    setStatus(null)
    const result = await window.api.backup.importDb()
    if (result.canceled) return
    if (!result.ok) {
      setStatus(result.error ?? 'Could not restore that backup.')
      return
    }
    await data.refresh()
    setStatus('Backup restored.')
  }

  function openReset() {
    setConfirmText('')
    setShowReset(true)
  }

  async function handleReset() {
    setResetting(true)
    await window.api.app.resetData()
    await data.refresh()
    setResetting(false)
    setShowReset(false)
    setStatus('All data has been reset.')
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="page-stack">
        <div className="card">
          <h2>Appearance</h2>
          <p style={{ opacity: 0.75, marginTop: 4 }}>Choose how Coffer looks.</p>
          <div className="segmented" style={{ marginTop: 12 }}>
            <button
              className={theme === 'system' ? 'active' : ''}
              onClick={() => onThemeChange('system')}
            >
              System
            </button>
            <button className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')}>
              Light
            </button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')}>
              Dark
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Data &amp; backup</h2>
          <p style={{ opacity: 0.75, marginTop: 4 }}>
            Your data lives in a single local file with no automatic backup. Export a copy regularly, especially
            before making major changes.
          </p>
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleExportDb}>
              <DatabaseBackup size={15} strokeWidth={2.25} />
              Backup database (.db)
            </button>
            <button className="btn" onClick={handleExportCsv}>
              <FileDown size={15} strokeWidth={2.25} />
              Export transactions (.csv)
            </button>
            <button className="btn" onClick={handleImportDb}>
              <FileUp size={15} strokeWidth={2.25} />
              Restore from backup (.db)
            </button>
          </div>
          {status && <p style={{ marginTop: 12, opacity: 0.8 }}>{status}</p>}
        </div>

        <div className="card danger-zone">
          <h2>Reset data</h2>
          <p style={{ opacity: 0.75, marginTop: 4 }}>
            Permanently delete every account, transaction, budget, debt, and recurring rule. Categories are
            reset to the defaults. This cannot be undone — back up first if you're not sure.
          </p>
          <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
            <button className="btn btn-danger" onClick={openReset}>
              <TriangleAlert size={15} strokeWidth={2.25} />
              Reset all data
            </button>
          </div>
        </div>
      </div>

      {showReset && (
        <Modal title="Reset all data" onClose={() => setShowReset(false)}>
          <p style={{ opacity: 0.85 }}>
            This permanently deletes every account, transaction, budget, debt, and recurring rule in this app.
            Categories are reset to the defaults. There is no undo.
          </p>
          <div className="form-field" style={{ marginTop: 16 }}>
            <label>
              Type <strong>{RESET_CONFIRM_WORD}</strong> to confirm
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={RESET_CONFIRM_WORD}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setShowReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={confirmText !== RESET_CONFIRM_WORD || resetting}
              onClick={handleReset}
            >
              {resetting ? 'Resetting…' : 'Reset everything'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
