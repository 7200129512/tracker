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
    const result = await pool.query('SELECT * FROM income_entries ORDER BY id DESC');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result.rows })
    };
  } catch (error) {
    console.error('Income API error:', error);
    
    // Return fallback data
    const fallbackData = [
      {
        id: 1,
        source_name: 'Salary',
        amount: '138086.00',
        frequency: 'monthly',
        effective_date: '2026-04-01T00:00:00.000Z'
      },
      {
        id: 2,
        source_name: 'Variable Pay',
        amount: '42000.00',
        frequency: 'annual',
        effective_date: '2026-03-01T00:00:00.000Z'
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