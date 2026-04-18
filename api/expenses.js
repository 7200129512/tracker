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
    // Return static expense data for now
    const staticExpenseData = [
      {
        id: 1,
        name: 'House Rent',
        amount: '14000.00',
        category: 'Rent',
        type: 'Fixed',
        date: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-18T07:39:01.873Z',
        updated_at: '2026-04-18T07:39:01.873Z'
      },
      {
        id: 2,
        name: 'Car EMI',
        amount: '18552.00',
        category: 'EMI',
        type: 'Fixed',
        date: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-18T07:39:01.873Z',
        updated_at: '2026-04-18T07:39:01.873Z'
      },
      {
        id: 3,
        name: 'Other Expenses',
        amount: '15000.00',
        category: 'Other',
        type: 'Fixed',
        date: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-18T07:39:01.873Z',
        updated_at: '2026-04-18T07:39:01.873Z'
      }
    ];

    res.status(200).json({ data: staticExpenseData });
  } catch (error) {
    console.error('Expenses API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      data: []
    });
  }
};