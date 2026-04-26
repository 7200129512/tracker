-- Add tenure_months column to loans table
-- Stores the original loan tenure in months for display purposes (e.g. "Remaining of 60m")
ALTER TABLE loans ADD COLUMN IF NOT EXISTS tenure_months INTEGER DEFAULT 0;
