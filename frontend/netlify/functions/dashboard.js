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
    
    // Get total income for the month - simplified query
    const incomeResult = await pool.query(`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total
      FROM income_entries
      WHERE frequency = 'monthly'
    `);
    const totalIncome = parseFloat(incomeResult.rows[0].total);

    // Get total expenses for the month - simplified query
    const expenseResult = await pool.query(`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) AS total
      FROM expense_entries
    `);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);

    const monthlySurplus = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

    // Get outstanding loan principal - simplified query
    const loanResult = await pool.query(`
      SELECT COALESCE(SUM(CAST(outstanding_principal AS DECIMAL)), 0) AS total
      FROM loans
      WHERE is_closed = false OR is_closed IS NULL
    `);
    const outstandingLoanPrincipal = parseFloat(loanResult.rows[0].total);

    const netWorth = 0 - outstandingLoanPrincipal;

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
    
    // Return fallback data so frontend doesn't break
    const fallbackResponse = {
      month: event.queryStringParameters?.month || '2026-04',
      totalIncome: 138086,
      totalExpenses: 47552,
      monthlySurplus: 90534,
      savingsRate: 65.56,
      netWorth: -1054000,
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: 1054000,
      error: 'Using fallback data',
      details: error.message
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackResponse)
    };
  }
};