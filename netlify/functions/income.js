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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: staticIncomeData })
    };
  } catch (error) {
    console.error('Income API error:', error);
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