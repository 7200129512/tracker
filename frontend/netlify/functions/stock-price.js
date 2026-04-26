/**
 * Stock price fetcher — scrapes Google Finance
 * URL pattern: https://www.google.com/finance/quote/SYMBOL:NSE
 *
 * The rendered HTML contains the price in a pattern like:
 *   ₹1,331.00   or   $123.45
 * We extract it with a regex from the page HTML.
 *
 * Falls back to BSE if NSE returns no price.
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

  // Try NSE first, then BSE
  const exchanges = ['NSE', 'BSE'];

  for (const exchange of exchanges) {
    try {
      const price = await fetchGoogleFinance(sym, exchange);
      if (price && price > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            symbol: sym,
            price,
            exchange,
            source: 'google-finance',
            timestamp: new Date().toISOString(),
          }),
        };
      }
    } catch (err) {
      console.warn(`Google Finance ${exchange} failed for ${sym}:`, err.message);
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: `Could not fetch price for ${sym} from Google Finance`,
    }),
  };
};

// ── Core scraper ──────────────────────────────────────────────────────────────

async function fetchGoogleFinance(symbol, exchange) {
  const url = `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}:${exchange}`;

  const res = await fetch(url, {
    headers: {
      // Mimic a real browser so Google returns the full page
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();

  // Google Finance embeds the price in the HTML in several places.
  // Most reliable patterns (in order of preference):
  //
  // 1. data-last-price attribute:  data-last-price="1331.0"
  // 2. JSON-LD structured data:    "price":"1331.00"
  // 3. Visible price text:         ₹1,331.00  or  ₹1331
  //
  // We try all three and return the first valid one.

  // Pattern 1 — data attribute (most reliable)
  const dataAttrMatch = html.match(/data-last-price="([\d.]+)"/);
  if (dataAttrMatch) {
    const p = parseFloat(dataAttrMatch[1]);
    if (p > 0) return p;
  }

  // Pattern 2 — JSON-LD / inline JSON price field
  const jsonPriceMatch = html.match(/"price"\s*:\s*"?([\d,]+\.?\d*)"?/);
  if (jsonPriceMatch) {
    const p = parseFloat(jsonPriceMatch[1].replace(/,/g, ''));
    if (p > 0) return p;
  }

  // Pattern 3 — visible rupee price in the page text
  // Matches: ₹1,331.00  ₹1331  ₹1,331
  const rupeeMatch = html.match(/₹\s*([\d,]+(?:\.\d+)?)/);
  if (rupeeMatch) {
    const p = parseFloat(rupeeMatch[1].replace(/,/g, ''));
    if (p > 0) return p;
  }

  // Pattern 4 — any standalone large number that looks like a stock price
  // e.g. >1331.00< in a tag — last resort
  const tagPriceMatch = html.match(/>(\d{2,6}(?:\.\d{1,2})?)</);
  if (tagPriceMatch) {
    const p = parseFloat(tagPriceMatch[1]);
    if (p > 0) return p;
  }

  throw new Error('Price not found in Google Finance HTML');
}
