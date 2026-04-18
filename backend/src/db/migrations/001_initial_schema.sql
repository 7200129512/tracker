-- Income entries
CREATE TABLE IF NOT EXISTS income_entries (
    id            SERIAL PRIMARY KEY,
    source_name   VARCHAR(255) NOT NULL,
    amount        NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    frequency     VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'one-time', 'annual')),
    effective_date DATE NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense entries
CREATE TABLE IF NOT EXISTS expense_entries (
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
CREATE TABLE IF NOT EXISTS loans (
    id                    SERIAL PRIMARY KEY,
    loan_name             VARCHAR(255) NOT NULL,
    original_principal    NUMERIC(14, 2) NOT NULL CHECK (original_principal > 0),
    outstanding_principal NUMERIC(14, 2) NOT NULL CHECK (outstanding_principal >= 0),
    emi_amount            NUMERIC(14, 2) NOT NULL CHECK (emi_amount > 0),
    interest_rate_pa      NUMERIC(6, 4) NOT NULL CHECK (interest_rate_pa >= 0),
    emi_start_date        DATE NOT NULL,
    is_closed             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMI payment records
CREATE TABLE IF NOT EXISTS emi_payments (
    id                  SERIAL PRIMARY KEY,
    loan_id             INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    payment_month       DATE NOT NULL,
    emi_paid            NUMERIC(14, 2) NOT NULL,
    principal_component NUMERIC(14, 2) NOT NULL,
    interest_component  NUMERIC(14, 2) NOT NULL,
    balance_after       NUMERIC(14, 2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (loan_id, payment_month)
);

-- Investment holdings (active and closed)
CREATE TABLE IF NOT EXISTS investment_holdings (
    id              SERIAL PRIMARY KEY,
    stock_symbol    VARCHAR(30) NOT NULL,
    stock_name      VARCHAR(255) NOT NULL,
    quantity        NUMERIC(14, 4) NOT NULL CHECK (quantity >= 0),
    purchase_price  NUMERIC(14, 4) NOT NULL CHECK (purchase_price > 0),
    purchase_date   DATE NOT NULL,
    is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sell transactions
CREATE TABLE IF NOT EXISTS sell_transactions (
    id              SERIAL PRIMARY KEY,
    holding_id      INTEGER NOT NULL REFERENCES investment_holdings(id) ON DELETE CASCADE,
    quantity_sold   NUMERIC(14, 4) NOT NULL CHECK (quantity_sold > 0),
    sell_price      NUMERIC(14, 4) NOT NULL CHECK (sell_price > 0),
    sell_date       DATE NOT NULL,
    realised_gain   NUMERIC(14, 4) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price cache (one row per symbol)
CREATE TABLE IF NOT EXISTS price_cache (
    symbol           VARCHAR(30) PRIMARY KEY,
    current_price    NUMERIC(14, 4),
    price_fetched_at TIMESTAMPTZ,
    fetch_error      TEXT
);

-- Savings transactions
CREATE TABLE IF NOT EXISTS savings_transactions (
    id          SERIAL PRIMARY KEY,
    type        VARCHAR(12) NOT NULL CHECK (type IN ('Deposit', 'Withdrawal')),
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    date        DATE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Monthly notes
CREATE TABLE IF NOT EXISTS monthly_notes (
    id          SERIAL PRIMARY KEY,
    month       DATE NOT NULL UNIQUE,
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id         SERIAL PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
