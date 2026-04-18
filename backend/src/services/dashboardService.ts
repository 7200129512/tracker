import pool from '../db/client';

/**
 * Get summary metrics for a given month (YYYY-MM).
 */
export async function getSummary(month: string) {
  // Total income for the month
  const incomeResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM income_entries
     WHERE (frequency = 'monthly' AND TO_CHAR(effective_date, 'YYYY-MM') <= $1)
        OR (frequency IN ('annual', 'one-time') AND TO_CHAR(effective_date, 'YYYY-MM') = $1)`,
    [month]
  );
  const totalIncome = parseFloat(incomeResult.rows[0].total);

  // Total expenses for the month
  const expenseResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expense_entries
     WHERE TO_CHAR(date, 'YYYY-MM') = $1`,
    [month]
  );
  const totalExpenses = parseFloat(expenseResult.rows[0].total);

  const monthlySurplus = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

  // Portfolio current value
  const portfolioResult = await pool.query<{ total_value: string }>(
    `SELECT COALESCE(SUM(ih.quantity * COALESCE(pc.current_price, ih.purchase_price)), 0) AS total_value
     FROM investment_holdings ih
     LEFT JOIN price_cache pc ON ih.stock_symbol = pc.symbol
     WHERE ih.is_closed = false`
  );
  const portfolioValue = parseFloat(portfolioResult.rows[0].total_value);

  // Savings balance
  const savingsResult = await pool.query<{ balance: string }>(
    `SELECT COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE -amount END), 0) AS balance
     FROM savings_transactions`
  );
  const savingsBalance = parseFloat(savingsResult.rows[0].balance);

  // Outstanding loan principal
  const loanResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(outstanding_principal), 0) AS total
     FROM loans
     WHERE is_closed = false`
  );
  const outstandingLoanPrincipal = parseFloat(loanResult.rows[0].total);

  const netWorth = portfolioValue + savingsBalance - outstandingLoanPrincipal;

  return {
    month,
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    monthlySurplus: parseFloat(monthlySurplus.toFixed(2)),
    savingsRate: parseFloat(savingsRate.toFixed(2)),
    netWorth: parseFloat(netWorth.toFixed(2)),
    portfolioValue: parseFloat(portfolioValue.toFixed(2)),
    savingsBalance: parseFloat(savingsBalance.toFixed(2)),
    outstandingLoanPrincipal: parseFloat(outstandingLoanPrincipal.toFixed(2)),
  };
}

/**
 * Returns 12-month array of { month, income, expenses }.
 */
export async function getCashFlow(): Promise<{ month: string; income: number; expenses: number }[]> {
  // Build trailing 12 months
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Get expense totals per month
  const expenseResult = await pool.query<{ month: string; total: string }>(
    `SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount) AS total
     FROM expense_entries
     WHERE date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
     GROUP BY month`
  );
  const expenseMap = new Map(expenseResult.rows.map((r) => [r.month, parseFloat(r.total)]));

  // Get all income entries for computing monthly income
  const incomeResult = await pool.query<{
    amount: string;
    frequency: string;
    effective_date: string;
  }>('SELECT amount, frequency, effective_date FROM income_entries');

  const incomeMap = new Map<string, number>();
  for (const month of months) {
    incomeMap.set(month, 0);
  }

  for (const entry of incomeResult.rows) {
    const amount = parseFloat(entry.amount);
    const effectiveMonth = entry.effective_date.slice(0, 7);

    for (const month of months) {
      if (entry.frequency === 'monthly' && month >= effectiveMonth) {
        incomeMap.set(month, (incomeMap.get(month) ?? 0) + amount);
      } else if (
        (entry.frequency === 'annual' || entry.frequency === 'one-time') &&
        month === effectiveMonth
      ) {
        incomeMap.set(month, (incomeMap.get(month) ?? 0) + amount);
      }
    }
  }

  return months.map((month) => ({
    month,
    income: parseFloat((incomeMap.get(month) ?? 0).toFixed(2)),
    expenses: parseFloat((expenseMap.get(month) ?? 0).toFixed(2)),
  }));
}

/**
 * Returns active alerts for a given month.
 */
export async function getAlerts(month: string): Promise<
  Array<{
    type: string;
    message: string;
    severity: 'warning' | 'info';
  }>
> {
  const alerts: Array<{ type: string; message: string; severity: 'warning' | 'info' }> = [];

  // Get income and expenses for the month
  const incomeResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM income_entries
     WHERE (frequency = 'monthly' AND TO_CHAR(effective_date, 'YYYY-MM') <= $1)
        OR (frequency IN ('annual', 'one-time') AND TO_CHAR(effective_date, 'YYYY-MM') = $1)`,
    [month]
  );
  const totalIncome = parseFloat(incomeResult.rows[0].total);

  const expenseResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expense_entries
     WHERE TO_CHAR(date, 'YYYY-MM') = $1`,
    [month]
  );
  const totalExpenses = parseFloat(expenseResult.rows[0].total);
  const monthlySurplus = totalIncome - totalExpenses;

  // Budget alert: expenses > 90% of income
  if (totalIncome > 0 && totalExpenses > 0.9 * totalIncome) {
    alerts.push({
      type: 'budget_alert',
      message: `Expenses (₹${totalExpenses.toFixed(0)}) exceed 90% of income (₹${totalIncome.toFixed(0)})`,
      severity: 'warning',
    });
  }

  // Low-surplus alert: surplus < 5000
  if (monthlySurplus < 5000) {
    alerts.push({
      type: 'low_surplus',
      message: `Monthly surplus (₹${monthlySurplus.toFixed(0)}) is below ₹5,000`,
      severity: 'warning',
    });
  }

  // EMI reminder: next payment due within 5 days and not yet recorded
  const today = new Date();
  const loansResult = await pool.query<{
    id: number;
    loan_name: string;
    emi_start_date: string;
    is_closed: boolean;
  }>('SELECT id, loan_name, emi_start_date, is_closed FROM loans WHERE is_closed = false');

  for (const loan of loansResult.rows) {
    // Determine next payment date (first of current month)
    const currentMonthFirst = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextPaymentDate = currentMonthFirst;

    const daysUntilPayment = Math.floor(
      (nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if within 5 days (including today if day 1-5)
    const dayOfMonth = today.getDate();
    if (dayOfMonth <= 5) {
      // Check if payment already recorded for this month
      const paymentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const paymentCheck = await pool.query(
        `SELECT id FROM emi_payments WHERE loan_id = $1 AND payment_month = $2`,
        [loan.id, paymentMonth]
      );

      if (paymentCheck.rows.length === 0) {
        alerts.push({
          type: 'emi_reminder',
          message: `EMI payment for "${loan.loan_name}" is due (${paymentMonth})`,
          severity: 'info',
        });
      }
    }

    void daysUntilPayment; // suppress unused variable warning
  }

  return alerts;
}
