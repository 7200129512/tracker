-- Create daily_transactions table for SMS-based transaction tracking
CREATE TABLE IF NOT EXISTS daily_transactions (
    id          SERIAL PRIMARY KEY,
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    type        VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
    merchant    VARCHAR(255) NOT NULL,
    category    VARCHAR(50) NOT NULL CHECK (category IN 
                    ('Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Healthcare', 'Rent', 'Other')),
    date        DATE NOT NULL,
    time        TIME NOT NULL,
    raw_sms     TEXT NOT NULL,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_daily_transactions_user_id ON daily_transactions(user_id);
CREATE INDEX idx_daily_transactions_date ON daily_transactions(date);
CREATE INDEX idx_daily_transactions_user_date ON daily_transactions(user_id, date);