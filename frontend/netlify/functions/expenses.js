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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: staticExpenseData })
    };
  } catch (error) {
    console.error('Expenses API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        data: []
      })
    };
  }
};