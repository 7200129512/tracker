-- Add user_id column to all tables for multi-user support
-- This migration adds user_id foreign key references to auth.users

-- Add user_id to income_entries
ALTER TABLE income_entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to expense_entries
ALTER TABLE expense_entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to loans
ALTER TABLE loans
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to investment_holdings
ALTER TABLE investment_holdings
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to savings_transactions
ALTER TABLE savings_transactions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to monthly_notes
ALTER TABLE monthly_notes
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX idx_income_entries_user_id ON income_entries(user_id);
CREATE INDEX idx_expense_entries_user_id ON expense_entries(user_id);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX idx_savings_transactions_user_id ON savings_transactions(user_id);
CREATE INDEX idx_monthly_notes_user_id ON monthly_notes(user_id);
