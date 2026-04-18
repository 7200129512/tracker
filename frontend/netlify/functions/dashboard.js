const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database configuration error',
          details: 'DATABASE_URL environment variable is not set'
        })
      };
    }

    const pool = getPool();
    const month = event.queryStringParameters?.month || '2026-04';
    
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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      })
    };
  }
};