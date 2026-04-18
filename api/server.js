// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic dashboard endpoint
app.get('/api/v1/dashboard/summary', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    
    // Simple response for now
    res.json({
      month,
      totalIncome: 138086,
      totalExpenses: 47552,
      monthlySurplus: 90534,
      savingsRate: 65.56,
      netWorth: 0,
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: 1054000
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export for Vercel
module.exports = app;