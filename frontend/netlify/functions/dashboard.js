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
    const month = event.queryStringParameters?.month || '2026-04';
    
    const response = {
      month,
      totalIncome: 138086,
      totalExpenses: 47552,
      monthlySurplus: 90534,
      savingsRate: 65.56,
      netWorth: -1054000,
      portfolioValue: 0,
      savingsBalance: 0,
      outstandingLoanPrincipal: 1054000,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Dashboard API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message
      })
    };
  }
};