import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installMockApi } from './lib/mockApi'

// Browser-only preview fallback: in the packaged Electron app the preload bridge already
// provides window.api, so the mock never installs there — it only kicks in when the build is
// opened in a plain browser (e.g. `vite preview`).
installMockApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
