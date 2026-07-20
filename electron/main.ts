import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // The app is fully local: deny new windows and block all in-window navigation
  // so no remote or unexpected content can ever be loaded into the renderer.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function registerIpc() {
  ipcMain.handle('accounts:list', () => db.listAccounts())
  ipcMain.handle('accounts:create', (_e, input) => db.createAccount(input))
  ipcMain.handle('accounts:update', (_e, id, input) => db.updateAccount(id, input))
  ipcMain.handle('accounts:delete', (_e, id) => db.deleteAccount(id))

  ipcMain.handle('categories:list', () => db.listCategories())
  ipcMain.handle('categories:create', (_e, input) => db.createCategory(input))
  ipcMain.handle('categories:update', (_e, id, input) => db.updateCategory(id, input))
  ipcMain.handle('categories:delete', (_e, id) => db.deleteCategory(id))

  ipcMain.handle('transactions:list', () => db.listTransactions())
  ipcMain.handle('transactions:create', (_e, input) => db.createTransaction(input))
  ipcMain.handle('transactions:update', (_e, id, input) => db.updateTransaction(id, input))
  ipcMain.handle('transactions:delete', (_e, id) => db.deleteTransaction(id))

  ipcMain.handle('budgets:list', () => db.listBudgets())
  ipcMain.handle('budgets:upsert', (_e, input) => db.upsertBudget(input))
  ipcMain.handle('budgets:delete', (_e, id) => db.deleteBudget(id))

  ipcMain.handle('debts:list', () => db.listDebts())
  ipcMain.handle('debts:create', (_e, input) => db.createDebt(input))
  ipcMain.handle('debts:update', (_e, id, input) => db.updateDebt(id, input))
  ipcMain.handle('debts:delete', (_e, id) => db.deleteDebt(id))

  ipcMain.handle('debtPayments:list', () => db.listDebtPayments())
  ipcMain.handle('debtPayments:create', (_e, input) => db.createDebtPayment(input))
  ipcMain.handle('debtPayments:delete', (_e, id) => db.deleteDebtPayment(id))

  ipcMain.handle('recurring:list', () => db.listRecurring())
  ipcMain.handle('recurring:create', (_e, input) => db.createRecurring(input))
  ipcMain.handle('recurring:update', (_e, id, input) => db.updateRecurring(id, input))
  ipcMain.handle('recurring:delete', (_e, id) => db.deleteRecurring(id))
  ipcMain.handle('recurring:run', () => db.runRecurringTransactions())

  ipcMain.handle('backup:exportDb', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Backup database',
      defaultPath: `finance-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    fs.copyFileSync(db.getDbPath(), result.filePath)
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle('backup:exportCsv', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export transactions as CSV',
      defaultPath: `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    fs.writeFileSync(result.filePath, db.buildTransactionsCsv())
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle('backup:importDb', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Restore from backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true, ok: false }
    const outcome = await db.restoreFromFile(result.filePaths[0], app.getPath('userData'))
    return { canceled: false, ...outcome }
  })

  ipcMain.handle('app:resetData', async () => {
    await db.resetAllData(app.getPath('userData'))
  })
}

process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[main] unhandledRejection', err)
})

app.whenReady().then(async () => {
  console.log('[main] app ready, VITE_DEV_SERVER_URL =', VITE_DEV_SERVER_URL)
  try {
    await db.initDb(app.getPath('userData'))
    console.log('[main] db initialized')
    const { created } = db.runRecurringTransactions()
    if (created > 0) console.log(`[main] posted ${created} recurring transaction(s)`)
  } catch (err) {
    console.error('[main] db init failed', err)
  }
  registerIpc()
  createWindow()
  console.log('[main] window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
