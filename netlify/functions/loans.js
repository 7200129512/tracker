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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: staticLoanData })
    };
  } catch (error) {
    console.error('Loans API error:', error);
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