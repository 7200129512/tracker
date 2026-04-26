/**
 * Live stock price via Yahoo Finance v8 JSON API
 * No scraping — returns structured JSON with regularMarketPrice
 *
 * NSE stocks: append .NS  (e.g. RELIANCE.NS)
 * BSE stocks: append .BO  (e.g. RELIANCE.BO)
 *
 * Yahoo Finance v8 chart endpoint requires no API key.
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const { symbol } = event.queryStringParameters || {};
  if (!symbol) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'symbol parameter required' }),
    };
  }

  const sym = symbol.trim().toUpperCase();

  // Try NSE first (.NS), then BSE (.BO)
  const tickers = [`${sym}.NS`, `${sym}.BO`];

  for (const ticker of tickers) {
    try {
      const price = await fetchYahooPrice(ticker);
      if (price && price > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            symbol: sym,
            ticker,
            price,
            source: 'yahoo-finance',
            timestamp: new Date().toISOString(),
          }),
        };
      }
    } catch (err) {
      console.warn(`Yahoo Finance failed for ${ticker}:`, err.message);
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: `Could not fetch live price for ${sym}`,
    }),
  };
};

// ── Yahoo Finance v8 chart API ────────────────────────────────────────────────
// Returns the regularMarketPrice (real-time during market hours, last close otherwise)

async function fetchYahooPrice(ticker) {
  // Use two Yahoo endpoints — v8/chart is most reliable
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d&includePrePost=false`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
      // Yahoo sometimes needs a cookie/crumb — try without first
    },
  });

  if (!res.ok) {
    // Try the v7 quote endpoint as secondary
    return fetchYahooV7(ticker);
  }

  const data = await res.json();

  // v8 response structure
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('No meta in Yahoo v8 response');

  // regularMarketPrice is the live price during market hours
  const price =
    meta.regularMarketPrice ??
    meta.chartPreviousClose ??
    meta.previousClose;

  if (!price || isNaN(price) || price <= 0) {
    throw new Error(`Invalid price in Yahoo v8: ${price}`);
  }

  return price;
}

async function fetchYahooV7(ticker) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&fields=regularMarketPrice,regularMarketPreviousClose`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`Yahoo v7 HTTP ${res.status}`);

  const data = await res.json();
  const quote = data?.quoteResponse?.result?.[0];
  if (!quote) throw new Error('No quote in Yahoo v7 response');

  const price = quote.regularMarketPrice ?? quote.regularMarketPreviousClose;
  if (!price || isNaN(price) || price <= 0) throw new Error(`Invalid price in Yahoo v7: ${price}`);

  return price;
}
