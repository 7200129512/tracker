const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:@sara4251@SARA@db.zcoldagsacuaceohddal.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', db: 'Connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', db: 'Failed', error: error.message });
  }
});

app.get('/api/v1/dashboard/summary', async (req, res) => {
  try {
    const incomeResult = await pool.query('SELECT COALESCE(SUM(amount::numeric), 0) AS total FROM income_entries');
    const expenseResult = await pool.query('SELECT COALESCE(SUM(amount::numeric), 0) AS total FROM expense_entries');
    const loanResult = await pool.query('SELECT COALESCE(SUM(outstanding_principal::numeric), 0) AS total FROM loans WHERE is_closed = false OR is_closed IS NULL');
    
    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpenses = parseFloat(expenseResult.rows[0].total);
    const outstandingLoanPrincipal = parseFloat(loanResult.rows[0].total);
    
    const monthlySurplus = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;
    const netWorth = 0 - outstandingLoanPrincipal;

    res.json({
      month: req.query.month || '2026-04',
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      monthlySurplus: parseFloat(monthlySurplus.toFixed(2)),
      savingsRate: parseFloat(savingsRate.toFixed(2)),
      netWorth: parseFloat(netWorth.toFixed(2)),
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: parseFloat(outstandingLoanPrincipal.toFixed(2))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/income', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM income_entries ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

app.get('/api/v1/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expense_entries ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

app.get('/api/v1/loans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loans ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

app.get('/api/v1/investments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM investment_holdings ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

app.get('/api/v1/savings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM savings_transactions ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});