// Netlify Function to fetch real-time stock prices
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
    // Try Alpha Vantage API
    const alphaResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`,
      { timeout: 5000 }
    );

    if (alphaResponse.ok) {
      const data = await alphaResponse.json();
      const price = parseFloat(data['05. price']);
      
      if (!isNaN(price) && price > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ symbol, price, source: 'alpha-vantage' }),
        };
      }
    }

    // Try using a free CORS proxy with Yahoo Finance
    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`,
      { timeout: 5000 }
    );

    if (yahooResponse.ok) {
      const data = await yahooResponse.json();
      const price = data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      
      if (price && price > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ symbol, price, source: 'yahoo-finance' }),
        };
      }
    }

    // Fallback: return error
    return {
      statusCode: 404,
      body: JSON.stringify({ error: `Could not fetch price for ${symbol}` }),
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
