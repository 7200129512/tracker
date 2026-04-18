# Implementation Plan: Portfolio Tracker

## Overview

Build a three-tier personal finance web application: a React SPA frontend, a Node.js/Express REST API backend, and a PostgreSQL database. Implementation proceeds in layers — project scaffolding and database first, then backend services module by module, then the React frontend, and finally integration wiring and deployment configuration.

All monetary values are in Indian Rupees (₹). The stack is TypeScript throughout, using `fast-check` for property-based tests and Jest/ts-jest for unit and integration tests.

---

## Tasks

- [x] 1. Scaffold monorepo and shared types
  - Initialise a monorepo with two workspaces: `backend/` and `frontend/`
  - Create `shared/types.ts` containing all TypeScript interfaces from the design (`IncomeEntry`, `ExpenseEntry`, `Loan`, `EmiPayment`, `InvestmentHolding`, `SellTransaction`, `SavingsTransaction`, `MonthlyNote`)
  - Configure `tsconfig.json` at root and per workspace; enable strict mode
  - Add `eslint` + `prettier` config shared across workspaces
  - _Requirements: 7.1, 8.1_

- [x] 2. Set up backend project structure and Express app
  - Initialise `backend/` as a Node.js TypeScript project with `ts-node`, `ts-jest`, `jest`, `fast-check`, `express`, `pg`, `dotenv`
  - Create `src/app.ts` (Express app, JSON middleware, CORS with `FRONTEND_URL`), `src/server.ts` (HTTP entry point)
  - Create `src/middleware/errorHandler.ts` — global error handler mapping validation → 400, not-found → 404, conflict → 409, unexpected → 500; suppress stack trace in production
  - Create `src/middleware/validateEnv.ts` — check `DATABASE_URL` and `FRONTEND_URL` on startup; log descriptive error and `process.exit(1)` if missing
  - Create `src/db/client.ts` — `pg` Pool singleton using `DATABASE_URL`
  - _Requirements: 8.3, 8.4_

- [x] 3. Create database migrations
  - Create `src/db/migrations/001_initial_schema.sql` with all tables from the design: `income_entries`, `expense_entries`, `loans`, `emi_payments`, `investment_holdings`, `sell_transactions`, `price_cache`, `savings_transactions`, `monthly_notes`
  - Create `src/db/migrations/002_seed_defaults.sql` — insert pre-populated defaults: House Rent ₹14,000/month (Fixed/Rent), Car EMI ₹18,552/month (Fixed/EMI), Other Expenses ₹15,000/month (Fixed/Other), and car loan (outstanding ₹10,54,000, EMI ₹18,552)
  - Create a `src/db/migrate.ts` script that runs all pending migrations in order
  - _Requirements: 2.8, 3.4, 7.1_

- [x] 4. Implement health-check endpoint
  - Create `src/routes/health.ts` — `GET /health` runs `SELECT 1` against the DB; returns `{ status: "ok", db: "connected", uptime }` with HTTP 200, or HTTP 503 with `{ status: "error", db: "disconnected" }` on failure
  - Register the route in `app.ts` at `/health` (outside the `/api/v1` prefix)
  - _Requirements: 8.5_

- [x] 5. Implement amortisation utility and loan service
  - [x] 5.1 Create `src/utils/amortisation.ts` with two pure functions:
    - `generateSchedule(outstandingPrincipal, emiAmount, annualRatePercent, startDate): AmortisationRow[]` — reducing-balance method; each row has `principalComponent`, `interestComponent`, `balanceAfter`, `paymentDate`
    - `remainingInstalments(outstandingPrincipal, emiAmount, annualRatePercent): { count, closureDate }`
    - Return a `{ warning: 'emi_below_interest' }` flag when `emiAmount <= outstandingPrincipal × (annualRatePercent / 12 / 100)`
    - _Requirements: 3.2, 3.3, 3.8, 3.9_

  - [ ]* 5.2 Write property test for amortisation schedule invariants (Property 5)
    - **Property 5: Loan Amortisation Schedule Invariants**
    - For any valid (P, E, R) where E > monthly interest: every row satisfies `principalComponent + interestComponent = EMI` (±₹0.01); final row `balanceAfter` = 0 (±₹0.01); row count equals `remainingInstalments.count`
    - **Validates: Requirements 3.2, 3.3, 3.9**

  - [ ]* 5.3 Write property test for EMI payment principal reduction (Property 6)
    - **Property 6: EMI Payment Reduces Principal Correctly**
    - For any loan state, `principalComponent = EMI - (outstandingPrincipal × monthlyRate)` and the new balance equals `outstandingPrincipal - principalComponent`
    - **Validates: Requirements 3.5**

  - [x] 5.4 Create `src/services/loanService.ts` — CRUD for loans, record EMI payment (compute principal/interest split, update `outstanding_principal`, set `is_closed` when balance reaches 0), list payments, generate amortisation schedule via `amortisation.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 5.5 Create `src/routes/loans.ts` — wire all loan endpoints from the design (`GET /loans`, `POST /loans`, `PUT /loans/:id`, `DELETE /loans/:id`, `POST /loans/:id/payments`, `GET /loans/:id/payments`, `GET /loans/:id/amortisation`)
    - _Requirements: 3.1–3.9_

- [x] 6. Implement income module
  - [x] 6.1 Create `src/services/incomeService.ts` — CRUD for `income_entries`; `getMonthlySummary()` computes projected income per month for trailing 12 months (prorate one-time/annual entries; include variable-pay entries only in their specified month)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 6.2 Create `src/routes/income.ts` — `GET /income`, `POST /income`, `PUT /income/:id`, `DELETE /income/:id`, `GET /income/monthly-summary`
    - _Requirements: 1.1–1.7_

  - [ ]* 6.3 Write property test for CRUD persistence round-trip on income entries (Property 1, income slice)
    - **Property 1: CRUD Persistence Round-Trip — Income**
    - For any valid `IncomeEntry` payload, POST then GET by id returns equivalent field values
    - **Validates: Requirements 1.2**

- [x] 7. Implement expense module
  - [x] 7.1 Create `src/services/expenseService.ts` — CRUD for `expense_entries`; `getMonthlySummary()` for trailing 12 months; `getCategoryBreakdown(month)` returns per-category totals and percentages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 7.2 Create `src/routes/expenses.ts` — `GET /expenses`, `POST /expenses`, `PUT /expenses/:id`, `DELETE /expenses/:id`, `GET /expenses/monthly-summary`, `GET /expenses/category-breakdown`
    - _Requirements: 2.1–2.8_

  - [ ]* 7.3 Write property test for CRUD persistence round-trip on expense entries (Property 1, expense slice)
    - **Property 1: CRUD Persistence Round-Trip — Expenses**
    - For any valid `ExpenseEntry` payload, POST then GET by id returns equivalent field values
    - **Validates: Requirements 2.2**

- [x] 8. Implement savings module
  - [x] 8.1 Create `src/services/savingsService.ts` — CRUD for `savings_transactions`; `getBalance()` = sum of deposits minus sum of withdrawals; `getDateRangeSummary(from, to)` returns total deposited and withdrawn; warn (but still persist) when a withdrawal would make balance negative
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 8.2 Create `src/routes/savings.ts` — `GET /savings/transactions`, `POST /savings/transactions`, `PUT /savings/transactions/:id`, `DELETE /savings/transactions/:id`, `GET /savings/balance`
    - _Requirements: 5.1–5.8_

  - [ ]* 8.3 Write property test for savings balance consistency (Property 4)
    - **Property 4: Savings Balance Consistency**
    - For any sequence of deposits and withdrawals with positive amounts, `getBalance()` equals sum(deposits) − sum(withdrawals)
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 9. Implement market data service and price scheduler
  - [x] 9.1 Create `src/services/marketDataService.ts` — wraps `yahoo-finance2`; `fetchPrice(symbol)` upserts `price_cache`; `refreshAllPrices()` fetches all active holding symbols in batches of 5 with 500 ms delay; staleness logic: stale if `price_fetched_at` > 30 minutes ago or price never fetched
    - _Requirements: 4.8, 4.9_

  - [x] 9.2 Create `src/scheduler/priceRefresh.ts` — `node-cron` job using `MARKET_DATA_REFRESH_CRON` env var (default `*/15 9-15 * * 1-5` IST); calls `refreshAllPrices()`; includes a keep-alive DB ping every 6 days for Supabase free tier
    - _Requirements: 4.8_

- [x] 10. Implement investment module
  - [x] 10.1 Create `src/services/investmentService.ts` — CRUD for `investment_holdings`; `recordSell(holdingId, qty, price, date)` computes `realisedGain`, inserts `sell_transactions`, decrements holding quantity, sets `is_closed` when quantity reaches 0; `getPortfolioSummary()` joins holdings with `price_cache`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.11, 4.12_

  - [x] 10.2 Create `src/routes/investments.ts` — all investment endpoints from the design including `POST /investments/prices/refresh` (server-side debounce: reject if last refresh < 60 s ago)
    - _Requirements: 4.1–4.12_

  - [ ]* 10.3 Write property test for sell transaction quantity invariant (Property 7)
    - **Property 7: Sell Transaction Quantity Invariant**
    - For any holding with initial quantity Q and any sequence of valid sell quantities, final quantity = Q − sum(sold); quantity never goes negative at any intermediate step
    - **Validates: Requirements 4.11, 4.12**

  - [ ]* 10.4 Write property test for portfolio totals consistency (Property 8)
    - **Property 8: Portfolio Totals Consistency**
    - For any set of holdings with known prices, total current value = sum(qty × price); total gain/loss = sum((price − purchasePrice) × qty)
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 10.5 Write property test for CRUD persistence round-trip on investment holdings (Property 1, investment slice)
    - **Property 1: CRUD Persistence Round-Trip — Investments**
    - For any valid `InvestmentHolding` payload, POST then GET by id returns equivalent field values
    - **Validates: Requirements 4.2**

- [x] 11. Implement dashboard service and routes
  - [x] 11.1 Create `src/services/dashboardService.ts` — `getSummary(month)` aggregates income, expenses, surplus, net worth, savings rate from all modules; `getCashFlow()` returns 12-month income vs expense series; `getAlerts(month)` evaluates all three alert conditions (budget > 90%, surplus < ₹5,000, EMI due within 5 days)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.1, 9.2, 9.4_

  - [x] 11.2 Create `src/routes/dashboard.ts` — `GET /dashboard/summary`, `GET /dashboard/cashflow`, `GET /dashboard/alerts`
    - _Requirements: 6.1–6.8, 9.1, 9.2, 9.4_

  - [ ]* 11.3 Write property test for dashboard financial calculations consistency (Property 9)
    - **Property 9: Dashboard Financial Calculations Consistency**
    - For any (I > 0, X), `Monthly_Surplus = I − X`; `savings_rate = (surplus / I) × 100`; `Net_Worth = portfolio_value + savings_balance − outstanding_principal`
    - **Validates: Requirements 6.1, 6.2, 6.8**

  - [ ]* 11.4 Write property test for alert threshold correctness (Property 10)
    - **Property 10: Alert Threshold Correctness**
    - Budget alert active iff `expenses > 0.9 × income`; low-surplus alert active iff `surplus < 5000`; EMI reminder active iff next payment date within 5 days AND no payment recorded for that month
    - **Validates: Requirements 9.1, 9.2, 9.4**

- [x] 12. Implement CSV export and import utilities
  - [x] 12.1 Create `src/utils/csvExport.ts` — serialises all records from all tables into a multi-section CSV (one section header per entity type); `GET /data/export` streams the file as a download
    - _Requirements: 7.2_

  - [x] 12.2 Create `src/utils/csvImport.ts` — parses a multi-section CSV; validates each row (required fields present, numeric fields positive finite, dates valid ISO, enums match allowed values); returns `{ valid: boolean, errors: { row, field, reason }[], records }` without writing to DB; rejects entire file if any row fails
    - _Requirements: 7.3, 7.4_

  - [x] 12.3 Create `src/routes/dataManagement.ts` — `GET /data/export`, `POST /data/import` (validate + preview), `POST /data/import/confirm` (replace all data), `POST /data/reset` (restore seed defaults)
    - _Requirements: 7.2, 7.3, 7.4, 7.6_

  - [ ]* 12.4 Write property test for CSV export/import round-trip (Property 2)
    - **Property 2: CSV Export/Import Round-Trip**
    - For any valid application state, export → import produces a state where every record's fields are equivalent to the original
    - **Validates: Requirements 7.3, 7.5**

  - [ ]* 12.5 Write property test for malformed CSV rejection (Property 3)
    - **Property 3: Malformed CSV Rejection**
    - For any CSV with at least one row containing a missing required field or invalid value, the import is rejected entirely and the response identifies each problematic row with field name and reason
    - **Validates: Requirements 7.4**

- [x] 13. Implement monthly notes endpoint
  - Create `src/routes/monthlyNotes.ts` — `GET /notes/:month`, `POST /notes/:month`, `PUT /notes/:month` for storing and retrieving per-month notes
  - _Requirements: 9.5_

- [x] 14. Register all routes and finalise backend
  - Register all routers in `app.ts` under `/api/v1` prefix
  - Start the price refresh scheduler in `server.ts` after DB connection is confirmed
  - Verify `validateEnv.ts` runs before any route registration
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 15. Checkpoint — backend tests and build
  - Run `jest` in `backend/`; ensure all unit and property tests pass
  - Run `tsc --noEmit` to confirm no TypeScript errors
  - Ensure all tests pass; ask the user if questions arise.

- [x] 16. Scaffold React frontend
  - Initialise `frontend/` with Vite + React + TypeScript template
  - Install `@tanstack/react-query`, `react-router-dom`, `recharts`, `axios`
  - Set up `QueryClient` and `QueryClientProvider` in `main.tsx`
  - Create `src/api/client.ts` — Axios instance with `VITE_API_BASE_URL` base URL and `{ data, error }` envelope unwrapping
  - Create `src/types.ts` — re-export or copy shared interfaces from `shared/types.ts`
  - _Requirements: 8.1_

- [x] 17. Implement Layout, Sidebar, and routing
  - Create `src/components/Layout.tsx` with `Sidebar` (navigation links to all pages) and `TopBar` (current month label, manual price refresh button)
  - Set up `react-router-dom` routes for: `/` (Dashboard), `/income`, `/expenses`, `/loans`, `/investments`, `/savings`, `/data`
  - _Requirements: 6.7_

- [x] 18. Implement Income page
  - [x] 18.1 Create `src/api/income.ts` — React Query hooks: `useIncomeEntries`, `useMonthlyIncomeSummary`, `useAddIncome`, `useUpdateIncome`, `useDeleteIncome`
    - _Requirements: 1.1–1.7_

  - [x] 18.2 Create `src/pages/IncomePage.tsx` with `IncomeForm` (add/edit, all fields from Req 1.1), `IncomeList` (table with edit/delete actions), `MonthlyIncomeChart` (12-month bar chart via Recharts)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

- [x] 19. Implement Expenses page
  - [x] 19.1 Create `src/api/expenses.ts` — React Query hooks: `useExpenseEntries`, `useMonthlySummary`, `useCategoryBreakdown`, `useAddExpense`, `useUpdateExpense`, `useDeleteExpense`
    - _Requirements: 2.1–2.7_

  - [x] 19.2 Create `src/pages/ExpensesPage.tsx` with `ExpenseForm`, `ExpenseList`, `CategoryBreakdownChart` (pie chart, Recharts), `MonthlyExpenseChart` (12-month bar chart)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 20. Implement Loans page
  - [x] 20.1 Create `src/api/loans.ts` — React Query hooks: `useLoans`, `useLoanPayments`, `useAmortisationSchedule`, `useAddLoan`, `useUpdateLoan`, `useDeleteLoan`, `useRecordEmiPayment`
    - _Requirements: 3.1–3.9_

  - [x] 20.2 Create `src/pages/LoansPage.tsx` with `LoanCard` (progress bar, closure date, warning badge for EMI-below-interest), `LoanForm`, `EMIPaymentForm`, `AmortisationTable` (scrollable schedule)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 21. Implement Investments page
  - [x] 21.1 Create `src/api/investments.ts` — React Query hooks: `useHoldings`, `useClosedPositions`, `useAddHolding`, `useUpdateHolding`, `useDeleteHolding`, `useSellHolding`, `useRefreshPrices`
    - _Requirements: 4.1–4.12_

  - [x] 21.2 Create `src/pages/InvestmentsPage.tsx` with `HoldingForm`, `HoldingsTable` (symbol, qty, buy price, current price with stale badge, P&L), `SellTransactionForm`, `ClosedPositionsTable`, `AllocationChart` (pie chart), `PriceRefreshButton`
    - Render yellow stale-price badge with `priceFetchedAt` timestamp when `priceStale: true`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

- [x] 22. Implement Savings page
  - [x] 22.1 Create `src/api/savings.ts` — React Query hooks: `useSavingsTransactions`, `useSavingsBalance`, `useAddTransaction`, `useUpdateTransaction`, `useDeleteTransaction`
    - _Requirements: 5.1–5.8_

  - [x] 22.2 Create `src/pages/SavingsPage.tsx` with `SavingsBalanceCard` (prominent balance display), `SavingsTransactionForm` (add/edit, with negative-balance warning), `SavingsTransactionList`, `DateRangeSummary` (total deposited/withdrawn for selected range)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 23. Implement Dashboard page
  - [x] 23.1 Create `src/api/dashboard.ts` — React Query hooks: `useDashboardSummary`, `useCashFlow`, `useDashboardAlerts`; configure `refetchInterval: 2000` on summary to satisfy Req 6.7
    - _Requirements: 6.1–6.8, 9.1, 9.2, 9.4_

  - [x] 23.2 Create `src/pages/DashboardPage.tsx` with:
    - `SummaryCards` — income, expenses, surplus (red highlight when negative per Req 6.3), net worth
    - `CashFlowChart` — 12-month income vs expenses bar chart (Recharts)
    - `AlertBanner` — budget alert (>90% spend), low-surplus alert (<₹5,000), EMI payment reminder
    - `LoanProgressBar` — % of original principal repaid
    - `PortfolioSummaryCard` — total invested, current value, gain/loss
    - `SavingsRateCard` — savings rate %
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.1, 9.2, 9.4_

- [x] 24. Implement Data Management page
  - Create `src/api/dataManagement.ts` — hooks/functions for export (trigger download), import (upload + preview errors), import confirm, reset
  - Create `src/pages/DataManagementPage.tsx` with `ExportButton`, `ImportForm` (CSV upload, inline error list per row, confirm dialog), `ResetButton` (confirm dialog)
  - _Requirements: 7.2, 7.3, 7.4, 7.6_

- [ ] 25. Implement monthly summary and notes UI
  - Add `MonthlySummaryModal` component — shown at start of each new calendar month (detected via `localStorage` last-seen month); displays previous month's income, expenses, surplus, net portfolio change; includes a text area to add/edit the monthly note
  - Create `src/api/monthlyNotes.ts` — hooks for `useMonthlyNote`, `useSaveMonthlyNote`
  - _Requirements: 9.3, 9.5_

- [ ] 26. Add "waking up" banner for Render free-tier cold starts
  - In `src/api/client.ts`, add an Axios response interceptor: if a request fails with a network error or times out, display a persistent `WakingUpBanner` component with a retry button
  - _Requirements: 8.1_

- [x] 27. Write environment variable documentation and README
  - Create `README.md` at repo root documenting: all required environment variables (table from design), local development setup steps, migration command, deployment steps for Vercel + Render + Supabase
  - _Requirements: 8.3_

- [x] 28. Final checkpoint — full build and test suite
  - Run `tsc --noEmit` in both `backend/` and `frontend/`
  - Run `jest` in `backend/` — all unit, property, and integration tests must pass
  - Run `vite build` in `frontend/` — build must complete without errors
  - Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they do not block subsequent tasks.
- Each task references specific requirements for traceability.
- Property tests (Properties 1–10) are placed close to the implementation tasks they validate to catch regressions early.
- The backend is fully functional before any frontend work begins (Tasks 1–15), enabling API testing with tools like Postman or curl during development.
- The price scheduler (Task 9) only runs during Indian market hours (09:15–15:30 IST, Mon–Fri) to conserve free-tier execution hours.
