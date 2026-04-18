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
- **Market Data**: Yahoo Finance (via `yahoo-finance2`)

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

## Testing

```bash
cd backend
npm test
```

## License

MIT
