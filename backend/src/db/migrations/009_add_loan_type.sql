-- Add loan_type column to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_type VARCHAR(50) DEFAULT 'Other';
