# Coffer

A personal finance tracker for Windows and macOS — accounts, transactions, budgets, debt payoff forecasting, and net worth, all in one local desktop app. No cloud, no account, no subscription: your data lives in a local SQLite database on your own machine.

## Features

- **Accounts** — track checking, savings, credit cards, and more, with running balances
- **Transactions** — income, expenses, and transfers, with categories, search, and filtering
- **Recurring transactions** — auto-posting rules (weekly, biweekly, monthly, yearly) with an optional end date
- **Budgets** — monthly category budgets with spend tracking
- **Debts** — payoff forecasting with amortization math, payment history, and a payoff timeline chart
- **Dashboard** — net worth trend, income vs. expenses, and spending-by-category charts, over any custom date range
- **Bulk add** — quickly enter a batch of transactions at once
- **Backup & restore** — export the database or a CSV of transactions, and restore from a backup
- **Light / dark / system theme**

## Tech stack

- [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly) for local storage — no native database dependency
- [Recharts](https://recharts.org/) for charts
- [electron-builder](https://www.electron.build/) for packaging

## Development

```
npm install
npm run dev
```

## Building

```
npm run dist
```

`electron-builder` automatically builds for whichever OS you run this on — a Windows installer (`.exe`) on Windows, or a `.dmg`/`.zip` on macOS. Output lands in `release/`.

The app is unsigned (no Apple/Microsoft developer certificate), so on first launch:
- **Windows**: SmartScreen will warn it's from an unrecognized publisher — click "More info" → "Run anyway".
- **macOS**: Gatekeeper will block it as being from an unidentified developer — right-click the app → "Open" instead of double-clicking.
