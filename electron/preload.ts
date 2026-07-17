import { contextBridge, ipcRenderer } from 'electron'

const api = {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input: unknown) => ipcRenderer.invoke('accounts:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('accounts:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('accounts:delete', id),
  },
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (input: unknown) => ipcRenderer.invoke('categories:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('categories:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
  },
  transactions: {
    list: () => ipcRenderer.invoke('transactions:list'),
    create: (input: unknown) => ipcRenderer.invoke('transactions:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('transactions:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('transactions:delete', id),
  },
  budgets: {
    list: () => ipcRenderer.invoke('budgets:list'),
    upsert: (input: unknown) => ipcRenderer.invoke('budgets:upsert', input),
    delete: (id: string) => ipcRenderer.invoke('budgets:delete', id),
  },
  debts: {
    list: () => ipcRenderer.invoke('debts:list'),
    create: (input: unknown) => ipcRenderer.invoke('debts:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('debts:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('debts:delete', id),
  },
  debtPayments: {
    list: () => ipcRenderer.invoke('debtPayments:list'),
    create: (input: unknown) => ipcRenderer.invoke('debtPayments:create', input),
    delete: (id: string) => ipcRenderer.invoke('debtPayments:delete', id),
  },
  recurring: {
    list: () => ipcRenderer.invoke('recurring:list'),
    create: (input: unknown) => ipcRenderer.invoke('recurring:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('recurring:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('recurring:delete', id),
    run: () => ipcRenderer.invoke('recurring:run'),
  },
  backup: {
    exportDb: () => ipcRenderer.invoke('backup:exportDb'),
    exportCsv: () => ipcRenderer.invoke('backup:exportCsv'),
    importDb: () => ipcRenderer.invoke('backup:importDb'),
  },
  app: {
    resetData: () => ipcRenderer.invoke('app:resetData'),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
