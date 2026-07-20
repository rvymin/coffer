import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'

// Injects a strict Content-Security-Policy into the packaged index.html only.
// Excluded from dev because Vite's react-refresh preamble is an inline script
// that a script-src 'self' policy would block.
const cspPlugin = (): Plugin => ({
  name: 'coffer-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta name="theme-color"',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'" />\n    <meta name="theme-color"`,
    ),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    cspPlugin(),
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['sql.js'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      renderer: {},
    }),
    renderer(),
  ],
})
