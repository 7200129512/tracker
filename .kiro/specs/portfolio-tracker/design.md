# Design Document: Portfolio Tracker

## Overview

The Portfolio Tracker is a personal finance web application that gives a single unified view of income, expenses, liabilities, investments, and savings. All monetary values are in Indian Rupees (₹).

The system is a classic three-tier web application:

- **Frontend**: React SPA deployed to Vercel or Netlify (free tier)
- **Backend**: Node.js REST API deployed to Render or Railway (free tier)
- **Database**: PostgreSQL on Supabase or Railway (free tier)
- **External**: Yahoo Finance (via `yahoo-finance2` npm package) for NSE/BSE market prices

The backend is the single source of truth. The frontend never writes directly to the database; all mutations go through the REST API. Market price data is fetched server-side, cached in the database, and served to the frontend to avoid CORS issues and to control rate-limiting.

---

## Architecture

```mermaid
graph TD
    subgraph "Client (Browser)"
        FE[React SPA<br/>Vite + React Query]
    end

    subgraph "Backend (Render / Railway)"
        API[Node.js REST API<br/>Express]
        SCHED[Price Refresh Scheduler<br/>node-cron]
    end

    subgraph "Database (Supabase / Railway)"
        DB[(PostgreSQL)]
    end

    subgraph "External"
        YF[Yahoo Finance<br/>yahoo-finance2]
    end

    FE -- "HTTPS REST" --> API
    API -- "SQL via pg / Prisma" --> DB
    SCHED -- "Runs inside API process" --> YF
    SCHED -- "Writes cached prices" --> DB
    API -- "On-demand price fetch" --> YF
```

### Key Architectural Decisions

**Server-side price fetching**: Yahoo Finance calls are made from the backend, not the browser. This avoids CORS restrictions and keeps the API key (if any) out of the client bundle. The `yahoo-finance2` package uses the `.NS` suffix for NSE symbols (e.g., `RELIANCE.NS`) and `.BO` for BSE symbols (e.g., `500325.BO`).

**Price caching in DB**: The last fetched price and its timestamp are stored in the `price_cache` table. If Yahoo Finance is unavailable, the API returns the cached price with a `price_stale: true` flag and the `price_fetched_at` timestamp.

**Scheduled refresh**: A `node-cron` job runs every 15 minutes during Indian market hours (09:15–15:30 IST, Mon–Fri) to refresh all active holdings. Outside market hours the scheduler is idle.

**React Query for client state**: The frontend uses TanStack React Query for server-state management. All API responses are cached in the React Query cache; mutations automatically invalidate relevant queries, ensuring the Dashboard refreshes within 2 seconds of any data change (Requirement 6.7).

**Single-user, no auth**: The application is a personal tool with no multi-user authentication. All API endpoints are open (protected only by the deployment URL). A future auth layer can be added without schema changes.

---

## Components and Interfaces

### Frontend Component Tree

```
App
├── Layout
│   ├── Sidebar (navigation)
│   └── TopBar (current month label, refresh button)
├── DashboardPage
│   ├── SummaryCards (income, expenses, surplus, net worth)
│   ├── CashFlowChart (12-month bar chart, Recharts)
│   ├── AlertBanner (budget alert, low-surplus alert, EMI reminder)
│   ├── LoanProgressBar
│   ├── PortfolioSummaryCard
│   └── SavingsRateCard
├── IncomePage
│   ├── IncomeForm (add / edit)
│   ├── IncomeList (table with edit/delete)
│   └── MonthlyIncomeChart (12-month)
├── ExpensesPage
│   ├── ExpenseForm (add / edit)
│   ├── ExpenseList (table with edit/delete)
│   ├── CategoryBreakdownChart (pie chart, Recharts)
│   └── MonthlyExpenseChart (12-month)
├── LoansPage
│   ├── LoanCard (per loan: progress bar, closure date)
│   ├── LoanForm (add / edit)
│   ├── EMIPaymentForm (record payment for a month)
│   └── AmortisationTable (scrollable schedule)
├── InvestmentsPage
│   ├── HoldingForm (add / edit)
│   ├── HoldingsTable (symbol, qty, buy price, current price, P&L)
│   ├── SellTransactionForm
│   ├── ClosedPositionsTable
│   ├── AllocationChart (pie chart)
│   └── PriceRefreshButton (manual trigger)
├── SavingsPage
│   ├── SavingsBalanceCard
│   ├── SavingsTransactionForm (add / edit)
│   ├── SavingsTransactionList
│   └── DateRangeSummary (total deposited / withdrawn)
└── DataManagementPage
    ├── ExportButton (CSV download)
    ├── ImportForm (CSV upload + confirm dialog)
    └── ResetButton (reset to defaults + confirm dialog)
```

### Backend Module Structure

```
src/
├── app.ts                  # Express app setup, middleware
├── server.ts               # HTTP server entry point
├── db/
│   ├── client.ts           # pg Pool / Prisma client
│   └── migrations/         # SQL migration files
├── routes/
│   ├── income.ts
│   ├── expenses.ts
│   ├── loans.ts
│   ├── investments.ts
│   ├── savings.ts
│   ├── dashboard.ts
│   ├── marketData.ts
│   └── dataManagement.ts
├── services/
│   ├── incomeService.ts
│   ├── expenseService.ts
│   ├── loanService.ts      # amortisation logic
│   ├── investmentService.ts
│   ├── savingsService.ts
│   ├── dashboardService.ts
│   └── marketDataService.ts # yahoo-finance2 wrapper + cache
├── scheduler/
│   └── priceRefresh.ts     # node-cron job
├── middleware/
│   ├── errorHandler.ts
│   └── validateEnv.ts
└── utils/
    ├── amortisation.ts     # pure amortisation math
    ├── csvExport.ts
    └── csvImport.ts
```

---

## Data Models

### Database Schema

```sql
-- Income entries
CREATE TABLE income_entries (
    id            SERIAL PRIMARY KEY,
    source_name   VARCHAR(255) NOT NULL,
    amount        NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    frequency     VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'one-time', 'annual')),
    effective_date DATE NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense entries
CREATE TABLE expense_entries (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    category    VARCHAR(50) NOT NULL CHECK (category IN
                    ('Rent','EMI','Food','Transport','Utilities','Entertainment','Other')),
    type        VARCHAR(10) NOT NULL CHECK (type IN ('Fixed', 'Variable')),
    date        DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Loans
CREATE TABLE loans (
    id                    SERIAL PRIMARY KEY,
    loan_name             VARCHAR(255) NOT NULL,
    loan_type             VARCHAR(50) NOT NULL DEFAULT 'Other',  -- e.g. 'Car Loan', 'Home Loan'
    original_principal    NUMERIC(14, 2) NOT NULL CHECK (original_principal > 0),
    outstanding_principal NUMERIC(14, 2) NOT NULL CHECK (outstanding_principal >= 0),
    emi_amount            NUMERIC(14, 2) NOT NULL CHECK (emi_amount > 0),
    interest_rate_pa      NUMERIC(6, 4) NOT NULL CHECK (interest_rate_pa >= 0),
    emi_start_date        DATE NOT NULL,
    tenure_months         INTEGER NOT NULL DEFAULT 0,            -- original loan tenure in months (0 = unknown)
    is_closed             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMI payment records
CREATE TABLE emi_payments (
    id              SERIAL PRIMARY KEY,
    loan_id         INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    payment_month   DATE NOT NULL,          -- first day of the month paid
    emi_paid        NUMERIC(14, 2) NOT NULL,
    principal_component NUMERIC(14, 2) NOT NULL,
    interest_component  NUMERIC(14, 2) NOT NULL,
    balance_after   NUMERIC(14, 2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (loan_id, payment_month)
);

-- Investment holdings (active and closed)
CREATE TABLE investment_holdings (
    id              SERIAL PRIMARY KEY,
    stock_symbol    VARCHAR(30) NOT NULL,   -- e.g. "RELIANCE.NS"
    stock_name      VARCHAR(255) NOT NULL,
    quantity        NUMERIC(14, 4) NOT NULL CHECK (quantity >= 0),
    purchase_price  NUMERIC(14, 4) NOT NULL CHECK (purchase_price > 0),
    purchase_date   DATE NOT NULL,
    is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sell transactions
CREATE TABLE sell_transactions (
    id              SERIAL PRIMARY KEY,
    holding_id      INTEGER NOT NULL REFERENCES investment_holdings(id) ON DELETE CASCADE,
    quantity_sold   NUMERIC(14, 4) NOT NULL CHECK (quantity_sold > 0),
    sell_price      NUMERIC(14, 4) NOT NULL CHECK (sell_price > 0),
    sell_date       DATE NOT NULL,
    realised_gain   NUMERIC(14, 4) NOT NULL,  -- (sell_price - purchase_price) * quantity_sold
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price cache (one row per symbol)
CREATE TABLE price_cache (
    symbol          VARCHAR(30) PRIMARY KEY,
    current_price   NUMERIC(14, 4),
    price_fetched_at TIMESTAMPTZ,
    fetch_error     TEXT
);

-- Savings transactions
CREATE TABLE savings_transactions (
    id          SERIAL PRIMARY KEY,
    type        VARCHAR(12) NOT NULL CHECK (type IN ('Deposit', 'Withdrawal')),
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    date        DATE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Monthly notes (for Requirement 9.5)
CREATE TABLE monthly_notes (
    id          SERIAL PRIMARY KEY,
    month       DATE NOT NULL UNIQUE,   -- first day of the month
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### TypeScript Interfaces (shared types)

```typescript
// Shared between frontend and backend via a types package or copy
export interface IncomeEntry {
  id: number;
  sourceName: string;
  amount: number;
  frequency: 'monthly' | 'one-time' | 'annual';
  effectiveDate: string; // ISO date
}

export interface ExpenseEntry {
  id: number;
  name: string;
  amount: number;
  category: 'Rent' | 'EMI' | 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Other';
  type: 'Fixed' | 'Variable';
  date: string;
}

export interface Loan {
  id: number;
  loanName: string;
  loanType: string;               // e.g. 'Car Loan', 'Home Loan', 'Personal Loan'
  originalPrincipal: number;
  outstandingPrincipal: number;
  emiAmount: number;
  interestRatePa: number;
  emiStartDate: string;
  tenureMonths: number;           // original loan tenure in months (0 = unknown)
  isClosed: boolean;
  remainingInstalments: number;   // computed
  estimatedClosureDate: string;   // computed
}

export interface EmiPayment {
  id: number;
  loanId: number;
  paymentMonth: string;
  emiPaid: number;
  principalComponent: number;
  interestComponent: number;
  balanceAfter: number;
}

export interface InvestmentHolding {
  id: number;
  stockSymbol: string;
  stockName: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  isClosed: boolean;
  currentPrice: number | null;
  priceStale: boolean;
  priceFetchedAt: string | null;
}

export interface SellTransaction {
  id: number;
  holdingId: number;
  quantitySold: number;
  sellPrice: number;
  sellDate: string;
  realisedGain: number;
}

export interface SavingsTransaction {
  id: number;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  date: string;
  description: string;
}

export interface MonthlyNote {
  id: number;
  month: string;
  note: string;
}
```

---

## REST API Endpoints

All endpoints are prefixed with `/api/v1`. Responses use `{ data, error }` envelope. Errors include an HTTP status code and a human-readable `message`.

### Income

| Method | Path | Description |
|--------|------|-------------|
| GET | `/income` | List all income entries |
| POST | `/income` | Create a new income entry |
| PUT | `/income/:id` | Update an income entry |
| DELETE | `/income/:id` | Delete an income entry |
| GET | `/income/monthly-summary` | Projected income per month for trailing 12 months |

### Expenses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/expenses` | List all expense entries (optional `?month=YYYY-MM`) |
| POST | `/expenses` | Create a new expense entry |
| PUT | `/expenses/:id` | Update an expense entry |
| DELETE | `/expenses/:id` | Delete an expense entry |
| GET | `/expenses/monthly-summary` | Total expenses per month for trailing 12 months |
| GET | `/expenses/category-breakdown?month=YYYY-MM` | Per-category totals and percentages |

### Loans

| Method | Path | Description |
|--------|------|-------------|
| GET | `/loans` | List all loans (with computed fields) |
| POST | `/loans` | Create a new loan |
| PUT | `/loans/:id` | Update loan fields |
| DELETE | `/loans/:id` | Delete a loan |
| POST | `/loans/:id/payments` | Record an EMI payment for a month |
| GET | `/loans/:id/payments` | List all recorded EMI payments |
| GET | `/loans/:id/amortisation` | Full projected amortisation schedule |

### Investments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/investments/holdings` | List all active holdings (with current prices) |
| POST | `/investments/holdings` | Add a new holding |
| PUT | `/investments/holdings/:id` | Update a holding |
| DELETE | `/investments/holdings/:id` | Delete a holding |
| GET | `/investments/closed` | List closed/sold positions |
| POST | `/investments/holdings/:id/sell` | Record a sell transaction |
| GET | `/investments/holdings/:id/transactions` | List sell transactions for a holding |
| POST | `/investments/prices/refresh` | Trigger manual price refresh for all active holdings |

### Savings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/savings/transactions` | List all savings transactions |
| POST | `/savings/transactions` | Add a savings transaction |
| PUT | `/savings/transactions/:id` | Update a savings transaction |
| DELETE | `/savings/transactions/:id` | Delete a savings transaction |
| GET | `/savings/balance` | Current balance + date-range summary |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary?month=YYYY-MM` | All summary metrics for a given month |
| GET | `/dashboard/cashflow` | 12-month income vs expense series |
| GET | `/dashboard/alerts?month=YYYY-MM` | Active alerts for the month |

### Data Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/data/export` | Download full CSV export |
| POST | `/data/import` | Upload and validate CSV; returns preview + errors |
| POST | `/data/import/confirm` | Commit a validated import (replaces all data) |
| POST | `/data/reset` | Reset all data to pre-populated defaults |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ status: "ok", db: "connected" }` with HTTP 200 |

---

## Market Data API Integration

### Symbol Format

Yahoo Finance uses exchange suffixes for Indian stocks:
- NSE: `RELIANCE.NS`, `INFY.NS`, `TCS.NS`
- BSE: `500325.BO`, `500209.BO`

When a user adds a holding, they enter the symbol with the suffix (e.g., `RELIANCE.NS`). The UI provides a helper note explaining the format.

### Fetch Flow

```mermaid
sequenceDiagram
    participant Scheduler
    participant MarketDataService
    participant YahooFinance as yahoo-finance2
    participant DB as price_cache

    Scheduler->>MarketDataService: refreshAllPrices()
    MarketDataService->>DB: SELECT DISTINCT symbol FROM investment_holdings WHERE is_closed = false
    loop for each symbol (batched, max 5 concurrent)
        MarketDataService->>YahooFinance: quote(symbol)
        alt success
            YahooFinance-->>MarketDataService: { regularMarketPrice, ... }
            MarketDataService->>DB: UPSERT price_cache SET current_price, price_fetched_at, fetch_error=NULL
        else error / timeout
            MarketDataService->>DB: UPSERT price_cache SET fetch_error = message (price unchanged)
        end
    end
```

### Staleness Logic

When the API serves a holding's current price:

1. Look up `price_cache` for the symbol.
2. If `current_price IS NOT NULL` and `price_fetched_at > NOW() - INTERVAL '30 minutes'` → `priceStale: false`.
3. If `price_fetched_at <= NOW() - INTERVAL '30 minutes'` → `priceStale: true`, return last known price.
4. If `current_price IS NULL` (never fetched) → `currentPrice: null`, `priceStale: true`.

The frontend renders a yellow warning badge with the `priceFetchedAt` timestamp when `priceStale: true`.

### Rate Limiting and Caching Strategy

- The scheduler batches requests: maximum 5 concurrent Yahoo Finance calls.
- A 500 ms delay between batches prevents rate-limit errors.
- The `POST /investments/prices/refresh` endpoint (manual trigger) is debounced server-side: it will not re-fetch if the last refresh was less than 60 seconds ago.
- No API key is required for `yahoo-finance2`; it uses Yahoo's unofficial public endpoint.

---

## Loan Amortisation Logic

The amortisation service uses the standard reducing-balance method:

```
Monthly interest rate: r = annual_rate / 12 / 100
Interest component of instalment n: I_n = outstanding_balance_n × r
Principal component of instalment n: P_n = EMI - I_n
New balance after instalment n: B_{n+1} = B_n - P_n
```

The `amortisation.ts` utility exposes two pure functions:

```typescript
/**
 * Generate the full amortisation schedule from a given outstanding balance.
 * Returns an array of instalment rows until balance reaches 0.
 */
function generateSchedule(
  outstandingPrincipal: number,
  emiAmount: number,
  annualRatePercent: number,
  startDate: Date
): AmortisationRow[]

/**
 * Calculate remaining instalments and estimated closure date.
 */
function remainingInstalments(
  outstandingPrincipal: number,
  emiAmount: number,
  annualRatePercent: number
): { count: number; closureDate: Date }
```

When `emiAmount <= outstandingPrincipal × (annualRatePercent / 12 / 100)`, the EMI does not cover the interest — the service returns a warning flag (Requirement 3.8).

---

## Deployment Architecture

### Environment Variables

| Variable | Module | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `PORT` | Backend | HTTP port (default `3000`) |
| `FRONTEND_URL` | Backend | Allowed CORS origin (e.g., `https://portfolio-tracker.vercel.app`) |
| `NODE_ENV` | Backend | `production` or `development` |
| `MARKET_DATA_REFRESH_CRON` | Backend | Cron expression for price refresh (default `*/15 9-15 * * 1-5`) |

No API key is required for Yahoo Finance via `yahoo-finance2`.

### Startup Validation

On startup, `validateEnv.ts` checks for `DATABASE_URL` and `FRONTEND_URL`. If either is missing, the process logs a descriptive error and exits with code 1 (Requirement 8.4).

### Health Check

`GET /health` queries `SELECT 1` against the database. Returns:
```json
{ "status": "ok", "db": "connected", "uptime": 12345 }
```
If the DB query fails, returns HTTP 503 with `{ "status": "error", "db": "disconnected" }`.

### Free-Tier Constraints

| Platform | Constraint | Mitigation |
|----------|-----------|------------|
| Render (free) | Spins down after 15 min inactivity | Frontend shows a "waking up…" banner; health check retried on first load |
| Railway (free) | 500 execution hours/month | Scheduler only runs during market hours to conserve hours |
| Supabase (free) | 500 MB storage, pauses after 1 week inactivity | Keep-alive ping from scheduler every 6 days |
| Vercel/Netlify | No meaningful constraint for a SPA | — |

### Deployment Diagram

```mermaid
graph LR
    Browser -->|HTTPS| Vercel/Netlify
    Vercel/Netlify -->|serves static bundle| Browser
    Browser -->|HTTPS REST| Render/Railway
    Render/Railway -->|pg connection| Supabase/Railway-DB
    Render/Railway -->|HTTPS| YahooFinance[Yahoo Finance]
```

---

## Error Handling

### Backend

- All route handlers are wrapped in `asyncHandler` to forward unhandled promise rejections to the Express error middleware.
- The global error handler maps known error types to HTTP status codes:
  - Validation errors → 400
  - Not found → 404
  - Constraint violations (e.g., duplicate EMI payment for same month) → 409
  - Unexpected errors → 500 (with stack trace suppressed in production)
- Database errors are logged with a correlation ID; the response body never exposes raw SQL.

### Frontend

- React Query's `onError` callbacks display toast notifications for failed mutations.
- Network errors (e.g., backend sleeping on Render free tier) show a persistent banner with a retry button.
- CSV import errors are displayed inline in the import form, listing each problematic row with the field name and reason.

### CSV Import Validation

The import parser validates each row before committing any data:
1. Required fields present and non-empty.
2. Numeric fields parse to positive finite numbers.
3. Date fields parse to valid ISO dates.
4. Enum fields match allowed values.

If any row fails validation, the entire import is rejected with a list of `{ row, field, reason }` objects (Requirement 7.4). No partial imports are allowed.

---

## Testing Strategy

### Unit Tests (Jest + ts-jest)

Focus on pure business logic:
- `amortisation.ts`: schedule generation, remaining instalments, interest-coverage warning
- `csvExport.ts` / `csvImport.ts`: serialisation and deserialisation
- `savingsService.ts`: balance calculation
- `dashboardService.ts`: surplus, net worth, savings rate, alert thresholds
- `marketDataService.ts`: staleness logic, error fallback

### Property-Based Tests (fast-check)

The `fast-check` library is used for property-based testing. Each property test runs a minimum of 100 iterations. Tests are tagged with the design property they validate.

See the Correctness Properties section for the full list of properties.

### Integration Tests (Supertest + test database)

- Each REST endpoint tested with a real PostgreSQL test database (Docker or Supabase branch).
- Seed scripts populate pre-populated defaults for loan and expense entries.
- Tests cover happy path, validation errors, and constraint violations.

### End-to-End Tests (Playwright — optional)

- Dashboard renders correct summary metrics after seeding data.
- CSV export → import round trip via browser UI.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The `fast-check` library is used for all property-based tests. Each test runs a minimum of 100 iterations. Tests are tagged with the format: `Feature: portfolio-tracker, Property N: <property_text>`.

### Property 1: CRUD Persistence Round-Trip

*For any* valid entity record (income entry, expense entry, loan, investment holding, or savings transaction), creating the record via the API and then retrieving it SHALL return a record with field values equivalent to those submitted.

**Validates: Requirements 1.2, 2.2, 4.2, 5.2**

### Property 2: CSV Export/Import Round-Trip

*For any* valid application state containing any combination of income entries, expense entries, loans, investment holdings, and savings transactions, exporting to CSV and then importing that CSV SHALL produce a state where every record's fields are equivalent to the original state before export.

**Validates: Requirements 7.3, 7.5**

### Property 3: Malformed CSV Rejection

*For any* CSV file containing at least one row with a missing required field or an invalid field value (wrong type, out-of-range number, unrecognised enum value), the import SHALL be rejected in its entirety and the response SHALL identify each problematic row with the field name and reason.

**Validates: Requirements 7.4**

### Property 4: Savings Balance Consistency

*For any* sequence of savings transactions (any mix of deposits and withdrawals with positive amounts), the Savings_Balance returned by the API SHALL equal the sum of all deposit amounts minus the sum of all withdrawal amounts across all transactions in that sequence.

**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

### Property 5: Loan Amortisation Schedule Invariants

*For any* loan with a valid outstanding principal P, EMI amount E, and annual interest rate R where E exceeds the monthly interest (P × R / 12 / 100):
- Every row in the generated amortisation schedule SHALL satisfy: `principal_component + interest_component = EMI` (within ₹0.01 rounding tolerance).
- The final row's `balance_after` SHALL be ₹0 (within ₹0.01 rounding tolerance).
- The `remaining_instalments` count SHALL equal the number of rows in the generated schedule.

**Validates: Requirements 3.2, 3.3, 3.9**

### Property 6: EMI Payment Reduces Principal Correctly

*For any* loan in any state, recording an EMI payment for a given month SHALL reduce the outstanding principal by exactly the principal component of that payment, where `principal_component = EMI - (outstanding_principal × monthly_rate)`.

**Validates: Requirements 3.5**

### Property 7: Sell Transaction Quantity Invariant

*For any* investment holding with an initial quantity Q, after recording any sequence of sell transactions whose individual quantities are each ≤ the remaining quantity at the time of sale, the holding's final remaining quantity SHALL equal Q minus the sum of all quantities sold, and SHALL never be negative at any point in the sequence.

**Validates: Requirements 4.11, 4.12**

### Property 8: Portfolio Totals Consistency

*For any* set of active investment holdings with known current prices, the total portfolio current value SHALL equal the sum of `quantity × currentPrice` across all holdings, and the total gain/loss SHALL equal the sum of `(currentPrice - purchasePrice) × quantity` across all holdings.

**Validates: Requirements 4.5, 4.6**

### Property 9: Dashboard Financial Calculations Consistency

*For any* month with total income I > 0 and total expenses X:
- `Monthly_Surplus = I - X`
- `savings_rate = (Monthly_Surplus / I) × 100`
- `Net_Worth = total_portfolio_current_value + Savings_Balance - total_outstanding_loan_principal`

All three values returned by the Dashboard summary endpoint SHALL satisfy these formulas simultaneously.

**Validates: Requirements 6.1, 6.2, 6.8**

### Property 10: Alert Threshold Correctness

*For any* month's financial data:
- The budget alert SHALL be active if and only if `total_expenses > 0.9 × total_income`.
- The low-surplus alert SHALL be active if and only if `Monthly_Surplus < 5000`.
- The EMI payment reminder SHALL be active for a loan if and only if the next scheduled payment date is within 5 calendar days of today AND no payment has been recorded for that month.

**Validates: Requirements 9.1, 9.2, 9.4**
