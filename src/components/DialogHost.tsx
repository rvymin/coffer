import { useDialogHost } from '../lib/dialog'
import Modal from './Modal'

export default function DialogHost() {
  const { request, respond } = useDialogHost()

  if (!request) return null

  const isAlert = request.kind === 'alert'

  return (
    <Modal title={request.title ?? (isAlert ? 'Notice' : 'Please confirm')} onClose={() => respond(false)}>
      <p style={{ opacity: 0.85 }}>{request.message}</p>
      <div className="form-actions">
        {!isAlert && (
          <button className="btn" onClick={() => respond(false)}>
            Cancel
          </button>
        )}
        <button
          className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => respond(true)}
          autoFocus
        >
          {request.confirmLabel ?? 'OK'}
        </button>
      </div>
    </Modal>
  )
}
