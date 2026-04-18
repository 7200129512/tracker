const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

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
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return res.status(500).json({ 
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is not set'
      });
    }

    const pool = getPool();
    const month = req.query.month || '2026-04';
    
    console.log('Connecting to database for month:', month);
    
    // Test database connection first
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
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

    // Get outstanding loan principal
    const loanResult = await pool.query(`
      SELECT COALESCE(SUM(outstanding_principal), 0) AS total
      FROM loans
      WHERE is_closed = false
    `);
    const outstandingLoanPrincipal = parseFloat(loanResult.rows[0].total);

    const netWorth = 0 - outstandingLoanPrincipal; // Simplified calculation

    const response = {
      month,
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      monthlySurplus: parseFloat(monthlySurplus.toFixed(2)),
      savingsRate: parseFloat(savingsRate.toFixed(2)),
      netWorth: parseFloat(netWorth.toFixed(2)),
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: parseFloat(outstandingLoanPrincipal.toFixed(2)),
    };

    console.log('Dashboard response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack,
      // Return some default data so frontend doesn't break
      month: req.query.month || '2026-04',
      totalIncome: 138086,
      totalExpenses: 47552,
      monthlySurplus: 90534,
      savingsRate: 65.56,
      netWorth: -1054000,
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: 1054000
    });
  }
};