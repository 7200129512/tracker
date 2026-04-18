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

    // Import pg dynamically to avoid module loading issues
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 1 // Limit connections for serverless
    });

    const month = event.queryStringParameters?.month || '2026-04';
    
    console.log('Connecting to database for month:', month);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // Test database connection first with timeout
    const connectionTest = await Promise.race([
      pool.query('SELECT NOW() as current_time'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 8000)
      )
    ]);
    
    console.log('Database connection successful:', connectionTest.rows[0]);
    
    // Get total income - simplified query
    const incomeQuery = `
      SELECT COALESCE(SUM(amount::numeric), 0) AS total
      FROM income_entries
    `;
    const incomeResult = await pool.query(incomeQuery);
    const totalIncome = parseFloat(incomeResult.rows[0].total);
    console.log('Income query result:', totalIncome);

    // Get total expenses - simplified query  
    const expenseQuery = `
      SELECT COALESCE(SUM(amount::numeric), 0) AS total
      FROM expense_entries
    `;
    const expenseResult = await pool.query(expenseQuery);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);
    console.log('Expense query result:', totalExpenses);

    // Get outstanding loan principal - simplified query
    const loanQuery = `
      SELECT COALESCE(SUM(outstanding_principal::numeric), 0) AS total
      FROM loans
      WHERE is_closed = false OR is_closed IS NULL
    `;
    const loanResult = await pool.query(loanQuery);
    const outstandingLoanPrincipal = parseFloat(loanResult.rows[0].total);
    console.log('Loan query result:', outstandingLoanPrincipal);

    const monthlySurplus = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;
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
    
    // Close the connection
    await pool.end();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};