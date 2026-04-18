// Netlify Function to fetch real-time stock prices
// Uses Indian-Stock-Market-API for NSE/BSE stocks
// This avoids CORS issues by proxying through Netlify

exports.handler = async (event) => {
  const { symbol } = event.queryStringParameters || {};

  if (!symbol) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Symbol parameter required' }),
    };
  }

  try {
    // Use Indian-Stock-Market-API for real-time prices
    // Supports NSE (.NS) and BSE (.BO) suffixes
    const apiUrl = `https://nse-api-ruby.vercel.app/stock?symbol=${symbol}&res=num`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`API returned status ${response.status} for symbol ${symbol}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Could not fetch price for ${symbol}` }),
      };
    }

    const data = await response.json();
    
    // Extract price from response
    // The API returns data in format: { "symbol": "...", "price": 123.45, ... }
    const price = data?.price || data?.lastPrice || data?.current_price;
    
    if (price && !isNaN(parseFloat(price)) && parseFloat(price) > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          symbol, 
          price: parseFloat(price), 
          source: 'indian-stock-market-api',
          timestamp: new Date().toISOString()
        }),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: `Invalid price data for ${symbol}` }),
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
