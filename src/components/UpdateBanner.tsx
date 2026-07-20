import { useEffect, useState } from 'react'
import { ArrowUpCircle, X } from 'lucide-react'
import type { UpdateStatus } from '../lib/types'

// Dismissing the "available" banner is remembered per version so it doesn't
// nag on every launch, but a newer version always re-surfaces it.
const DISMISS_KEY = 'coffer.dismissedUpdateVersion'

export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [isMac, setIsMac] = useState(false)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() =>
    localStorage.getItem(DISMISS_KEY)
  )
  const [dismissedReadyVersion, setDismissedReadyVersion] = useState<string | null>(null)

  useEffect(() => {
    const apply = (s: UpdateStatus) => {
      setStatus(s)
      if (s.state === 'available' || s.state === 'ready') setVersion(s.version)
    }
    window.api.updates
      .getPlatform()
      .then((p) => setIsMac(p === 'darwin'))
      .catch(() => {})
    window.api.updates
      .getLastStatus()
      .then((s) => {
        if (s) apply(s)
      })
      .catch(() => {})
    return window.api.updates.onStatus(apply)
  }, [])

  if (!status) return null
  if (status.state !== 'available' && status.state !== 'downloading' && status.state !== 'ready') {
    return null
  }
  if (status.state === 'available' && version !== null && version === dismissedVersion) return null
  if (status.state === 'ready' && version !== null && version === dismissedReadyVersion) return null

  function dismiss() {
    if (!version) return
    if (status?.state === 'ready') {
      // Installs on quit anyway — just stop showing the prompt for this session.
      setDismissedReadyVersion(version)
    } else {
      localStorage.setItem(DISMISS_KEY, version)
      setDismissedVersion(version)
    }
  }

  function handleAction() {
    if (isMac) {
      // Unsigned macOS builds can't self-update — send the user to the release page.
      window.api.updates.openDownloadPage().catch(() => {})
    } else {
      window.api.updates.download().catch(() => {})
    }
  }

  return (
    <div className="update-banner" role="status">
      <ArrowUpCircle size={14} strokeWidth={2.25} className="update-banner-icon" />
      <span className="update-banner-text">
        {status.state === 'available' && (
          <>
            Coffer <strong>v{version}</strong> is available
          </>
        )}
        {status.state === 'downloading' && 'Downloading update…'}
        {status.state === 'ready' && (
          <>
            <strong>v{version}</strong> is ready to install
          </>
        )}
      </span>
      {status.state === 'downloading' && (
        <>
          <div className="update-progress update-banner-progress">
            <div
              className="update-progress-bar"
              style={{ width: `${Math.min(100, Math.round(status.percent))}%` }}
            />
          </div>
          <span className="update-banner-percent">{Math.round(status.percent)}%</span>
        </>
      )}
      {status.state === 'available' && (
        <button className="update-banner-action" onClick={handleAction}>
          {isMac ? 'Get from GitHub' : 'Download'}
        </button>
      )}
      {status.state === 'ready' && (
        <button className="update-banner-action" onClick={() => window.api.updates.install()}>
          Restart
        </button>
      )}
      {status.state !== 'downloading' && (
        <button
          className="update-banner-close"
          onClick={dismiss}
          aria-label="Dismiss update notification"
          title="Dismiss"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
