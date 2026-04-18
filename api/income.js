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
    // Return static income data for now
    const staticIncomeData = [
      {
        id: 1,
        source_name: 'Salary',
        amount: '138086.00',
        frequency: 'monthly',
        effective_date: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-18T07:39:01.873Z',
        updated_at: '2026-04-18T07:39:01.873Z'
      },
      {
        id: 2,
        source_name: 'Variable Pay',
        amount: '42000.00',
        frequency: 'annual',
        effective_date: '2026-03-01T00:00:00.000Z',
        created_at: '2026-04-18T07:39:01.873Z',
        updated_at: '2026-04-18T07:39:01.873Z'
      }
    ];

    res.status(200).json({ data: staticIncomeData });
  } catch (error) {
    console.error('Income API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      data: []
    });
  }
};