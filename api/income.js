const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

module.exports = async (req, res) => {
  // Enable CORS with more permissive headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM income_entries ORDER BY effective_date DESC');
    res.status(200).json({ data: result.rows });
  } catch (error) {
    console.error('Income API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      data: []
    });
  }
};