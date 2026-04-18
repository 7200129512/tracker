-- Delete all seed data from Supabase
-- This removes the pre-populated static data

-- Delete income entries
DELETE FROM income_entries WHERE source_name IN ('Salary', 'Variable Pay');

-- Delete expense entries
DELETE FROM expense_entries WHERE name IN ('House Rent', 'Car EMI', 'Other Expenses');

-- Delete loans
DELETE FROM loans WHERE loan_name = 'Car Loan';

-- Delete all other data
DELETE FROM sell_transactions;
DELETE FROM investment_holdings;
DELETE FROM savings_transactions;
DELETE FROM emi_payments;
DELETE FROM monthly_notes;
