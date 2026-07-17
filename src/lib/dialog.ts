import { useEffect, useState } from 'react'

export interface DialogRequest {
  kind: 'confirm' | 'alert'
  message: string
  title?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (value: boolean) => void
}

type Listener = (req: DialogRequest | null) => void
let listener: Listener | null = null

function open(req: Omit<DialogRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    listener?.({ ...req, resolve })
  })
}

// Drop-in replacements for window.confirm/alert that render as an in-app modal instead of a
// native OS dialog, so every popup in the app shares the same design language.
export function confirmDialog(
  message: string,
  options?: { title?: string; confirmLabel?: string; danger?: boolean },
): Promise<boolean> {
  return open({ kind: 'confirm', message, ...options })
}

export function alertDialog(message: string, options?: { title?: string }): Promise<void> {
  return open({ kind: 'alert', message, ...options }).then(() => undefined)
}

export function useDialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null)

  useEffect(() => {
    listener = setRequest
    return () => {
      listener = null
    }
  }, [])

  function respond(value: boolean) {
    request?.resolve(value)
    setRequest(null)
  }

  return { request, respond }
}
