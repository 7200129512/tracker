# Requirements Document

## Introduction

A personal finance and portfolio tracker application that gives a single, unified view of income, expenses, liabilities, and investments. The application helps the user understand their monthly cash flow, track loan repayment progress, monitor stock market investments (via Zerodha), and assess overall financial health through a dashboard. All monetary values are in Indian Rupees (₹).

## Glossary

- **System**: The Portfolio Tracker application.
- **User**: The individual who owns and manages their personal finances within the application.
- **Income_Tracker**: The module responsible for recording and displaying income entries.
- **Expense_Tracker**: The module responsible for recording and displaying expense entries.
- **Loan_Tracker**: The module responsible for tracking outstanding loans, EMI schedules, and repayment progress.
- **Investment_Tracker**: The module responsible for recording and displaying investment holdings and performance.
- **Dashboard**: The summary view that aggregates data from all modules into a financial health overview.
- **Income_Entry**: A record of money received by the User, including salary, variable pay, or any other income source.
- **Expense_Entry**: A record of money spent by the User, including fixed expenses (rent, EMI) and variable expenses.
- **Fixed_Expense**: A recurring expense with a constant amount each month (e.g., house rent, car EMI).
- **Variable_Expense**: An expense whose amount may differ each month (e.g., groceries, utilities).
- **Loan**: A liability with an outstanding principal, an EMI amount, and a repayment schedule.
- **EMI**: Equated Monthly Instalment — a fixed monthly payment toward a loan.
- **Investment_Holding**: A record of a financial instrument (e.g., a stock) held by the User, including quantity and purchase price.
- **Portfolio**: The complete collection of Investment_Holdings owned by the User.
- **Net_Worth**: Total assets (savings balance + portfolio market value) minus total liabilities (outstanding loan principal).
- **Monthly_Surplus**: Take-home income for the month minus all expenses (including EMI) for the same month.
- **Zerodha**: The User's stock brokerage platform, used as the source of investment data.
- **Savings_Tracker**: The module responsible for recording savings transactions and displaying the current savings balance and transaction history.
- **Savings_Transaction**: A record of a deposit or withdrawal in the savings module, including date, amount (₹), type (Deposit / Withdrawal), and description.
- **Savings_Balance**: The running total of all Savings_Transactions (sum of deposits minus sum of withdrawals).
- **Market_Data_API**: A free, publicly accessible API (e.g., Yahoo Finance) used to fetch current market prices for Indian stocks listed on NSE or BSE.

---

## Requirements

### Requirement 1: Income Tracking

**User Story:** As a User, I want to record and view all my income sources, so that I know exactly how much money I receive each month.

#### Acceptance Criteria

1. THE Income_Tracker SHALL allow the User to add an Income_Entry with the following fields: source name, amount (₹), frequency (monthly / one-time / annual), and effective date.
2. WHEN the User adds an Income_Entry, THE Income_Tracker SHALL persist the entry and display it in the income list immediately.
3. WHEN the User edits an existing Income_Entry, THE Income_Tracker SHALL update the stored record and reflect the change in all dependent calculations.
4. WHEN the User deletes an Income_Entry, THE Income_Tracker SHALL remove the record and recalculate all dependent totals.
5. THE Income_Tracker SHALL display the total projected income for the current calendar month, summing all monthly income sources and prorating one-time or annual entries that fall within the month.
6. WHEN a variable pay entry is added with a specific month (e.g., March), THE Income_Tracker SHALL include that amount only in the projected income for that month.
7. THE Income_Tracker SHALL display a monthly income history for the trailing 12 months as a list or chart.

---

### Requirement 2: Expense Tracking

**User Story:** As a User, I want to record and categorise all my expenses, so that I can understand where my money is going each month.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL allow the User to add an Expense_Entry with the following fields: name, amount (₹), category (Rent / EMI / Food / Transport / Utilities / Entertainment / Other), type (Fixed / Variable), and date.
2. WHEN the User adds an Expense_Entry, THE Expense_Tracker SHALL persist the entry and display it in the expense list immediately.
3. WHEN the User edits an existing Expense_Entry, THE Expense_Tracker SHALL update the stored record and reflect the change in all dependent calculations.
4. WHEN the User deletes an Expense_Entry, THE Expense_Tracker SHALL remove the record and recalculate all dependent totals.
5. THE Expense_Tracker SHALL display the total expenses for the current calendar month, broken down by category.
6. THE Expense_Tracker SHALL display a monthly expense history for the trailing 12 months as a list or chart.
7. WHEN the User views the expense breakdown, THE Expense_Tracker SHALL display each category's amount and its percentage of total monthly expenses.
8. THE Expense_Tracker SHALL pre-populate the following Fixed_Expense entries on first launch: House Rent ₹14,000/month, Car EMI ₹18,552/month, and Other Expenses ₹15,000/month, so that the User does not need to enter known recurring costs manually.

---

### Requirement 3: Loan and Liability Tracking

**User Story:** As a User, I want to track my outstanding loan and EMI progress, so that I know how much I still owe and when I will be debt-free.

#### Acceptance Criteria

1. THE Loan_Tracker SHALL allow the User to add a Loan with the following fields: loan name, outstanding principal (₹), EMI amount (₹), interest rate (% per annum), and EMI start date.
2. WHEN the User adds a Loan, THE Loan_Tracker SHALL calculate and display the estimated number of remaining EMI instalments based on the outstanding principal, EMI amount, and interest rate.
3. WHEN the User adds a Loan, THE Loan_Tracker SHALL calculate and display the estimated loan closure date.
4. THE Loan_Tracker SHALL pre-populate a loan entry with outstanding principal ₹10,54,000 and EMI ₹18,552 on first launch, so that the User's existing car loan is tracked from the start.
5. WHEN the User records an EMI payment for a month, THE Loan_Tracker SHALL reduce the outstanding principal by the principal component of that EMI and update the remaining instalments and closure date.
6. THE Loan_Tracker SHALL display a repayment progress indicator showing the percentage of the original loan principal that has been repaid.
7. WHEN the outstanding principal reaches ₹0, THE Loan_Tracker SHALL mark the loan as closed and stop including its EMI in monthly expense calculations.
8. IF the User enters an EMI amount that is less than the monthly interest accrued on the outstanding principal, THEN THE Loan_Tracker SHALL display a warning that the EMI does not cover the interest.
9. THE Loan_Tracker SHALL display a month-by-month amortisation schedule showing principal component, interest component, and remaining balance for each future instalment.

---

### Requirement 4: Investment Tracking

**User Story:** As a User, I want to record and monitor my stock market investments, so that I can track the performance of my portfolio over time.

#### Acceptance Criteria

1. THE Investment_Tracker SHALL allow the User to add an Investment_Holding with the following fields: stock symbol, stock name, quantity, purchase price per share (₹), and purchase date.
2. WHEN the User adds an Investment_Holding, THE Investment_Tracker SHALL persist the entry and display it in the portfolio list.
3. WHEN the User edits an Investment_Holding, THE Investment_Tracker SHALL update the stored record and recalculate portfolio totals.
4. WHEN the User deletes an Investment_Holding, THE Investment_Tracker SHALL remove the record and recalculate portfolio totals.
5. THE Investment_Tracker SHALL display for each holding: stock symbol, quantity, purchase price, current price, current value (quantity × current price), absolute gain/loss (₹), and percentage gain/loss.
6. THE Investment_Tracker SHALL display the total portfolio invested value, total current value, total absolute gain/loss (₹), and total percentage gain/loss.
7. WHEN the User manually enters a current market price for a holding, THE Investment_Tracker SHALL recalculate all gain/loss figures for that holding and update portfolio totals immediately.
8. THE Investment_Tracker SHALL automatically fetch the latest market price for each NSE/BSE-listed holding from the Market_Data_API and refresh all displayed values without requiring manual input from the User.
9. WHEN the Market_Data_API is unavailable or returns an error for a symbol, THE Investment_Tracker SHALL display the last successfully fetched price alongside a staleness indicator showing the timestamp of that price.
10. THE Investment_Tracker SHALL display a portfolio allocation chart showing each holding's percentage of the total current portfolio value.
11. THE Investment_Tracker SHALL allow the User to record a sell transaction for a holding, specifying quantity sold and sell price, and SHALL update the holding's quantity and calculate realised gain/loss for that transaction.
12. WHEN a holding's quantity reaches 0 after a sell transaction, THE Investment_Tracker SHALL move the holding to a closed/sold positions list rather than deleting it, preserving the transaction history.

---

### Requirement 5: Savings Tracking

**User Story:** As a User, I want to record my savings deposits and withdrawals, so that I can track my current savings balance and understand how my savings have changed over time.

#### Acceptance Criteria

1. THE Savings_Tracker SHALL allow the User to add a Savings_Transaction with the following fields: type (Deposit / Withdrawal), amount (₹), date, and description.
2. WHEN the User adds a Savings_Transaction, THE Savings_Tracker SHALL persist the entry, update the Savings_Balance, and display the transaction in the history list immediately.
3. WHEN the User edits a Savings_Transaction, THE Savings_Tracker SHALL update the stored record and recalculate the Savings_Balance.
4. WHEN the User deletes a Savings_Transaction, THE Savings_Tracker SHALL remove the record and recalculate the Savings_Balance.
5. THE Savings_Tracker SHALL calculate the Savings_Balance as the sum of all Deposit amounts minus the sum of all Withdrawal amounts across all Savings_Transactions.
6. THE Savings_Tracker SHALL display the current Savings_Balance prominently alongside the full chronological transaction history.
7. IF a Withdrawal transaction would cause the Savings_Balance to fall below ₹0, THEN THE Savings_Tracker SHALL display a warning to the User before persisting the transaction.
8. THE Savings_Tracker SHALL display the total deposited and total withdrawn amounts for any User-selected date range.

---

### Requirement 6: Financial Health Dashboard

**User Story:** As a User, I want a single dashboard view of my finances, so that I can quickly assess my overall financial health without navigating multiple sections.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following summary metrics for the current month: total income, total expenses, Monthly_Surplus, and total outstanding loan principal.
2. THE Dashboard SHALL display the Net_Worth, calculated as (total portfolio current value + Savings_Balance) minus total outstanding loan principal.
3. WHEN the Monthly_Surplus is negative, THE Dashboard SHALL highlight the surplus figure in a visually distinct manner to alert the User.
4. THE Dashboard SHALL display a cash flow chart for the trailing 12 months, showing monthly income and monthly expenses as separate series.
5. THE Dashboard SHALL display the loan repayment progress as a percentage of the original principal repaid.
6. THE Dashboard SHALL display the total portfolio gain/loss (₹ and %) alongside the total invested amount.
7. WHEN any module's data is updated, THE Dashboard SHALL refresh all affected summary metrics within 2 seconds without requiring a full page reload.
8. THE Dashboard SHALL display a savings rate for the current month, calculated as (Monthly_Surplus ÷ total income) × 100, expressed as a percentage.

---

### Requirement 7: Data Persistence and Management

**User Story:** As a User, I want my financial data to be saved reliably, so that I do not lose my records between sessions.

#### Acceptance Criteria

1. THE System SHALL persist all Income_Entries, Expense_Entries, Loans, Investment_Holdings, and Savings_Transactions to a PostgreSQL database hosted on a free-tier provider (e.g., Supabase or Railway), accessed via a REST API backend, so that data survives application restarts.
2. WHEN the User exports data, THE System SHALL generate a downloadable file in CSV format containing all records from all modules.
3. WHEN the User imports a previously exported CSV file, THE System SHALL parse the file and restore all records, replacing any existing data after the User confirms the action.
4. IF the imported CSV file contains malformed or missing required fields, THEN THE System SHALL display a descriptive error message identifying the problematic rows and SHALL NOT import any data from that file.
5. FOR ALL valid data sets, exporting then importing SHALL produce a state equivalent to the original state before export (round-trip property).
6. THE System SHALL allow the User to reset all data to the pre-populated defaults after confirming the action.

---

### Requirement 8: Deployment and Hosting

**User Story:** As a User, I want the application to be deployable to free hosting platforms, so that I can access it from any device without incurring hosting costs.

#### Acceptance Criteria

1. THE System SHALL be deployable with the frontend hosted on Vercel or Netlify and the backend hosted on Render or Railway, using only free-tier plans.
2. THE System SHALL use a PostgreSQL database on a free-tier provider (e.g., Supabase or Railway) as its sole persistent data store.
3. THE System SHALL document all required environment variables (e.g., database connection string, Market_Data_API key) in a README or equivalent configuration guide, so that the User can configure a new deployment without inspecting source code.
4. WHEN environment variables required for a module are missing at startup, THE System SHALL log a descriptive error identifying each missing variable and SHALL NOT start that module.
5. THE System SHALL expose a health-check endpoint that returns HTTP 200 when the backend and database connection are operational, enabling hosting platforms to verify deployment success.

---

### Requirement 9: Monthly Review and Alerts

**User Story:** As a User, I want to receive alerts when my spending or loan status crosses important thresholds, so that I can take corrective action in time.

#### Acceptance Criteria

1. WHEN the total expenses for the current month exceed 90% of the total income for the same month, THE System SHALL display a budget alert on the Dashboard.
2. WHEN the Monthly_Surplus falls below ₹5,000, THE System SHALL display a low-surplus alert on the Dashboard.
3. THE System SHALL display a monthly summary at the start of each new calendar month showing the previous month's income, expenses, surplus, and net portfolio change.
4. WHEN a loan EMI payment is due within the next 5 days and has not been recorded as paid, THE System SHALL display a payment reminder on the Dashboard.
5. WHEN the User views the monthly summary, THE System SHALL allow the User to add a note or observation for that month, which is stored alongside the summary record.
