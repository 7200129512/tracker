-- Pre-populate fixed expense entries (only if table is empty)
INSERT INTO expense_entries (name, amount, category, type, date)
SELECT 'House Rent', 14000.00, 'Rent', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)
WHERE NOT EXISTS (SELECT 1 FROM expense_entries WHERE name = 'House Rent' AND type = 'Fixed');

INSERT INTO expense_entries (name, amount, category, type, date)
SELECT 'Car EMI', 18552.00, 'EMI', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)
WHERE NOT EXISTS (SELECT 1 FROM expense_entries WHERE name = 'Car EMI' AND type = 'Fixed');

INSERT INTO expense_entries (name, amount, category, type, date)
SELECT 'Other Expenses', 15000.00, 'Other', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)
WHERE NOT EXISTS (SELECT 1 FROM expense_entries WHERE name = 'Other Expenses' AND type = 'Fixed');

-- Pre-populate car loan (only if no loans exist)
INSERT INTO loans (loan_name, original_principal, outstanding_principal, emi_amount, interest_rate_pa, emi_start_date)
SELECT 'Car Loan', 1054000.00, 1054000.00, 18552.00, 9.00, DATE_TRUNC('month', CURRENT_DATE)
WHERE NOT EXISTS (SELECT 1 FROM loans);

-- Pre-populate salary income (only if no income entries exist)
INSERT INTO income_entries (source_name, amount, frequency, effective_date)
SELECT 'Salary', 138086.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)
WHERE NOT EXISTS (SELECT 1 FROM income_entries WHERE source_name = 'Salary');

INSERT INTO income_entries (source_name, amount, frequency, effective_date)
SELECT 'Variable Pay', 42000.00, 'annual', DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '2 months'
WHERE NOT EXISTS (SELECT 1 FROM income_entries WHERE source_name = 'Variable Pay');
