const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:@sara4251@SARA@db.zcoldagsacuaceohddal.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'Database connected successfully', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: error.message 
    });
  }
});

// Dashboard summary endpoint
app.get('/api/v1/dashboard/summary', async (req, res) => {
  try {
    const month = req.query.month || '2026-04';
    
    console.log('Fetching dashboard data for month:', month);
    
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
    res.json(response);
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

// Income endpoints
app.get('/api/v1/income', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM income_entries ORDER BY effective_date DESC');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Income API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, data: [] });
  }
});

// Expenses endpoints
app.get('/api/v1/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expense_entries ORDER BY date DESC');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Expenses API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, data: [] });
  }
});

// Loans endpoints
app.get('/api/v1/loans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loans ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Loans API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, data: [] });
  }
});

// Investments endpoints
app.get('/api/v1/investments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM investment_holdings ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Investments API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, data: [] });
  }
});

// Savings endpoints
app.get('/api/v1/savings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM savings_transactions ORDER BY date DESC');
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Savings API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, data: [] });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Portfolio Tracker Backend running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Database test: http://localhost:${port}/test-db`);
});