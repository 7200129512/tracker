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
    // Return static loan data for now
    const staticLoanData = [
      {
        id: 1,
        loan_name: 'Car Loan',
        original_principal: '1054000.00',
        outstanding_principal: '1054000.00',
        emi_amount: '18552.00',
        interest_rate_pa: '9.0000',
        emi_start_date: '2026-04-01T00:00:00.000Z',
        is_closed: false,
        created_at: '2026-04-18T07:39:01.873Z',
        updated_at: '2026-04-18T07:39:01.873Z'
      }
    ];

    res.status(200).json({ data: staticLoanData });
  } catch (error) {
    console.error('Loans API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      data: []
    });
  }
};