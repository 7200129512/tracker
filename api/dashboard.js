const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    
    // Get total income for the month
    const incomeResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM income_entries
      WHERE (frequency = 'monthly' AND TO_CHAR(effective_date, 'YYYY-MM') <= $1)
         OR (frequency IN ('annual', 'one-time') AND TO_CHAR(effective_date, 'YYYY-MM') = $1)
    `, [month]);
    const totalIncome = parseFloat(incomeResult.rows[0].total);

    // Get total expenses for the month
    const expenseResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expense_entries
      WHERE TO_CHAR(date, 'YYYY-MM') = $1
    `, [month]);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);

    const monthlySurplus = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

    // Get portfolio value
    const portfolioResult = await pool.query(`
      SELECT COALESCE(SUM(ih.quantity * COALESCE(pc.current_price, ih.purchase_price)), 0) AS total_value
      FROM investment_holdings ih
      LEFT JOIN price_cache pc ON ih.stock_symbol = pc.symbol
      WHERE ih.is_closed = false
    `);
    const portfolioValue = parseFloat(portfolioResult.rows[0].total_value);

    // Get savings balance
    const savingsResult = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE -amount END), 0) AS balance
      FROM savings_transactions
    `);
    const savingsBalance = parseFloat(savingsResult.rows[0].balance);

    // Get outstanding loan principal
    const loanResult = await pool.query(`
      SELECT COALESCE(SUM(outstanding_principal), 0) AS total
      FROM loans
      WHERE is_closed = false
    `);
    const outstandingLoanPrincipal = parseFloat(loanResult.rows[0].total);

    const netWorth = portfolioValue + savingsBalance - outstandingLoanPrincipal;

    res.json({
      month,
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      monthlySurplus: parseFloat(monthlySurplus.toFixed(2)),
      savingsRate: parseFloat(savingsRate.toFixed(2)),
      netWorth: parseFloat(netWorth.toFixed(2)),
      portfolioValue: parseFloat(portfolioValue.toFixed(2)),
      savingsBalance: parseFloat(savingsBalance.toFixed(2)),
      outstandingLoanPrincipal: parseFloat(outstandingLoanPrincipal.toFixed(2)),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};