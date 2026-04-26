# Portfolio Tracker

A personal finance web application for tracking income, expenses, loans, investments, and savings. Built with React, Node.js/Express, and PostgreSQL.

## Features

- **Dashboard** — Net worth, monthly surplus, savings rate, cash flow chart, alerts
- **Income** — Track salary, variable pay, and other income sources
- **Expenses** — Categorized expense tracking with breakdown charts
- **Loans** — EMI tracking, amortisation schedules, repayment progress
- **Investments** — Stock portfolio with automatic price updates (NSE/BSE via Yahoo Finance)
- **Savings** — Transaction history with deposits and withdrawals
- **Data Management** — CSV export/import, reset to defaults

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TanStack React Query + Recharts
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Market Data**: Yahoo Finance (Netlify function + backend scheduler via `yahoo-finance2`)

## Prerequisites

- Node.js 20.x
- PostgreSQL 14+ (or use a free cloud database like Supabase)

## Environment Variables

### Backend (`.env` in `backend/`)

```env
DATABASE_URL=postgresql://user:password@host:5432/database
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
MARKET_DATA_REFRESH_CRON=*/15 9-15 * * 1-5
```

### Frontend (`.env` in `frontend/`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for both backend and frontend (npm workspaces).

### 2. Set Up Database

**Option A: Local PostgreSQL**

```bash
# Create database
createdb portfolio_tracker

# Run migrations
cd backend
npm run migrate
```

**Option B: Free Cloud Database (Supabase)**

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database → Connection string → URI
4. Copy the connection string and paste it in `backend/.env` as `DATABASE_URL`
5. Run migrations:

```bash
cd backend
npm run migrate
```

### 3. Start Development Servers

**Terminal 1 — Backend:**

```bash
npm run dev:backend
```

Backend runs on `http://localhost:3000`

**Terminal 2 — Frontend:**

```bash
npm run dev:frontend
```

Frontend runs on `http://localhost:5173`

### 4. Open the App

Navigate to `http://localhost:5173` in your browser.

## Pre-Populated Data

On first launch, the app pre-populates:
- House Rent: ₹14,000/month (Fixed/Rent)
- Car EMI: ₹18,552/month (Fixed/EMI)
- Other Expenses: ₹15,000/month (Fixed/Other)
- Car Loan: ₹10,54,000 outstanding, ₹18,552 EMI

## Dashboard Calculations

### Monthly Surplus

```
Monthly Surplus = Total Income − Total Expenses (expense_entries) − Loan EMIs
```

- **Total Income** — sum of income entries for the current month, excluding PF and Variable Pay entries.
- **Total Expenses** (`totalExpenses`) — sum of all records in `expense_entries` for the current user. Fixed expenses (rent, etc.) are stored as individual entries and treated as recurring each month. This field reflects `expense_entries` only.
- **Loan EMIs** (`monthlyEmi`) — sum of `emi_amount` across all open loans.
- **Cash Expenses** (`cashExpenses`) — sum of debit rows in `daily_transactions` for the current month. This is a **display-only** figure shown as "Cash Spent This Month" on the dashboard. It is intentionally excluded from the surplus formula because raw bank debits include transfers, investment purchases, and EMI payments that would cause double-counting.

> **Why `cashExpenses` is not used in surplus:** `daily_transactions` are SMS-parsed bank debits. They capture every outflow from the bank account — including EMI payments already counted via `monthlyEmi` and investment transfers. Including them in the surplus would double-count those amounts.

### Portfolio Current Value

The dashboard fetches `stock_symbol` for each active holding and then calls the `/.netlify/functions/stock-price` Netlify function in parallel (one request per holding) to retrieve live market prices. If the function returns a valid price for a symbol it is used as the LTP; otherwise the holding's purchase price is used as a fallback. This means the "Current Value" and "Total Gain/Loss" cards on the dashboard always reflect the freshest available price on page load.

```
portfolioCurrentValue = Σ (quantity × LTP)          // LTP from stock-price function, fallback = purchase_price
portfolioGainLoss     = portfolioCurrentValue − portfolioInvestedValue
portfolioGainLossPct  = (portfolioGainLoss / portfolioInvestedValue) × 100
```

> **Note**: The dashboard uses the `stock-price` Netlify function directly rather than the `price_cache` database table. The backend scheduler still populates `price_cache` for the Investments page stale-price badge, but the dashboard summary card fetches prices live on every load.

### Net Worth

```
Net Worth = Savings Balance − Outstanding Loan Principal
```

Portfolio current value is shown separately in the dashboard's portfolio summary row and is not included in the net worth figure.

## Frontend Query Hooks

The `frontend/src/api/dashboard.ts` module exports the following React Query hooks:

| Hook | Description |
|------|-------------|
| `useDashboardSummary(month)` | Fetches the full dashboard summary for a given `YYYY-MM` month string. Refetches every 30 seconds. Returns income, expenses, surplus, net worth, savings balance, portfolio values, EMI total, PF amount, variable pay amount, and `cashExpenses` (display-only). |
| `useCashFlow()` | Returns a month-by-month array of `{ month, income, expenses }` for the cash flow chart. Income excludes PF and Variable Pay entries. |
| `useMonthlyDailyExpenses()` | Aggregates `daily_transactions` for the current month into `{ monthTotal, todayTotal, monthCredit, todayCredit }`. Refetches every 60 seconds. Used for the "Cash Spent This Month" display card. |
| `useDailyChart()` | Returns a day-by-day array of `{ day, spent, received }` for the current month, filled for every day from the 1st to today. Sourced from `daily_transactions`. Refetches every 60 seconds. |
| `useDashboardAlerts(month)` | Returns `{ budgetAlert, lowSurplusAlert, emiReminder, emiReminderLoanName }`. Refetches every 30 seconds. |

> All hooks require an authenticated user (`useAuth`) and are disabled when `user.id` is not available.

## API Endpoints

All endpoints are prefixed with `/api/v1`:

- **Income**: `GET|POST|PUT|DELETE /income`, `GET /income/monthly-summary`
- **Expenses**: `GET|POST|PUT|DELETE /expenses`, `GET /expenses/monthly-summary`, `GET /expenses/category-breakdown`
- **Loans**: `GET|POST|PUT|DELETE /loans`, `POST /loans/:id/payments`, `GET /loans/:id/amortisation`
- **Investments**: `GET|POST|PUT|DELETE /investments/holdings`, `POST /investments/holdings/:id/sell`, `POST /investments/prices/refresh`
- **Savings**: `GET|POST|PUT|DELETE /savings/transactions`, `GET /savings/balance`
- **Dashboard**: `GET /dashboard/summary`, `GET /dashboard/cashflow`, `GET /dashboard/alerts`
- **Data**: `GET /data/export`, `POST /data/import`, `POST /data/reset`
- **Health**: `GET /health`

## Deployment

### Frontend (Vercel / Netlify)

1. Push code to GitHub
2. Connect repo to Vercel or Netlify
3. Set build command: `npm run build --workspace=frontend`
4. Set output directory: `frontend/dist`
5. Add environment variable: `VITE_API_BASE_URL=<your-backend-url>`

### Backend (Render / Railway)

1. Push code to GitHub
2. Connect repo to Render or Railway
3. Set build command: `npm run build --workspace=backend`
4. Set start command: `npm run start --workspace=backend`
5. Add environment variables (see Backend section above)
6. Run migrations after first deploy: `npm run migrate --workspace=backend`

### Database (Supabase / Railway)

Use the free tier of Supabase or Railway PostgreSQL. Copy the connection string to `DATABASE_URL`.

## Stock Symbol Format

- **NSE**: `RELIANCE.NS`, `INFY.NS`, `TCS.NS`
- **BSE**: `500325.BO`, `500209.BO`

## Market Data Refresh

The backend automatically refreshes stock prices every 15 minutes during Indian market hours (09:15–15:30 IST, Mon–Fri). You can also manually refresh from the frontend.

## Netlify Functions (Frontend Serverless)

When deployed to Netlify, the frontend uses serverless functions under `frontend/netlify/functions/` as a lightweight API layer. These are used instead of (or alongside) the Express backend for certain operations.

### `stock-price` — Real-time Indian Stock Prices

**Endpoint**: `GET /.netlify/functions/stock-price?symbol=<SYMBOL>`

Fetches the current market price for an NSE/BSE-listed stock using the Yahoo Finance v8/v7 JSON APIs. No scraping — returns structured JSON. Tries NSE (`.NS` suffix) first, then falls back to BSE (`.BO` suffix).

No API key is required.

**How it works**

1. Appends `.NS` to the symbol and calls the Yahoo Finance v8 chart endpoint (`query1.finance.yahoo.com/v8/finance/chart/…`). Reads `regularMarketPrice` from the `meta` object.
2. If v8 returns a non-OK status, falls back to the Yahoo Finance v7 quote endpoint (`query2.finance.yahoo.com/v7/finance/quote?symbols=…`).
3. If NSE yields no valid price, repeats steps 1–2 with the `.BO` suffix for BSE.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `symbol` | Yes | Stock symbol without exchange suffix (e.g., `RELIANCE`, `INFY`, `TCS`) |

**Success Response (200)**

```json
{
  "symbol": "RELIANCE",
  "ticker": "RELIANCE.NS",
  "price": 2945.50,
  "source": "yahoo-finance",
  "timestamp": "2026-04-26T10:30:00.000Z"
}
```

`ticker` shows the full Yahoo Finance symbol that returned a valid price (`.NS` or `.BO`).

**Error Response (404)**

```json
{
  "error": "Could not fetch live price for RELIANCE"
}
```

Returned when both NSE and BSE lookups fail for the given symbol.

## Testing

```bash
cd backend
npm test
```

## License

MIT
