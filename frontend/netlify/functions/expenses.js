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
    const pool = getPool();
    const result = await pool.query('SELECT * FROM expense_entries ORDER BY id DESC');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows })
    };
  } catch (error) {
    console.error('Expenses API error:', error);
    
    // Return fallback data
    const fallbackData = [
      {
        id: 1,
        name: 'House Rent',
        amount: '14000.00',
        category: 'Rent',
        type: 'Fixed',
        date: '2026-04-01T00:00:00.000Z'
      },
      {
        id: 2,
        name: 'Car EMI',
        amount: '18552.00',
        category: 'EMI',
        type: 'Fixed',
        date: '2026-04-01T00:00:00.000Z'
      },
      {
        id: 3,
        name: 'Other Expenses',
        amount: '15000.00',
        category: 'Other',
        type: 'Fixed',
        date: '2026-04-01T00:00:00.000Z'
      }
    ];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        data: fallbackData,
        error: 'Using fallback data',
        details: error.message
      })
    };
  }
};