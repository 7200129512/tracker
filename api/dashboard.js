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

    // For now, return static data to test if API routing works
    const response = {
      month: req.query.month || '2026-04',
      totalIncome: 138086,
      totalExpenses: 47552,
      monthlySurplus: 90534,
      savingsRate: 65.56,
      netWorth: -1054000,
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: 1054000,
    };

    console.log('Dashboard response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    });
  }
};