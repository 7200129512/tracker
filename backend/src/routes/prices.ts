import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Cache for prices to avoid excessive API calls
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch stock price from multiple sources
async function fetchStockPrice(symbol: string): Promise<number | null> {
  // Check cache first
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    // Try Alpha Vantage API
    const alphaResponse = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`,
      { timeout: 5000 }
    ).catch(() => null);

    if (alphaResponse?.data?.['05. price']) {
      const price = parseFloat(alphaResponse.data['05. price']);
      if (!isNaN(price) && price > 0) {
        priceCache[symbol] = { price, timestamp: Date.now() };
        return price;
      }
    }

    // Try using a free API that works better for Indian stocks
    // Using a simple approach with yfinance-like endpoint
    const yahooResponse = await axios.get(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`,
      { timeout: 5000 }
    ).catch(() => null);

    if (yahooResponse?.data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw) {
      const price = yahooResponse.data.quoteSummary.result[0].price.regularMarketPrice.raw;
      if (price > 0) {
        priceCache[symbol] = { price, timestamp: Date.now() };
        return price;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

// GET /api/v1/prices/:symbol
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const price = await fetchStockPrice(symbol);
    
    if (price === null) {
      return res.status(404).json({ error: `Could not fetch price for ${symbol}` });
    }

    res.json({ symbol, price, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Price fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// GET /api/v1/prices/batch
// Fetch prices for multiple symbols
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols must be an array' });
    }

    const prices: { [key: string]: number | null } = {};
    
    for (const symbol of symbols) {
      prices[symbol] = await fetchStockPrice(symbol);
    }

    res.json({ prices, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Batch price fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

export default router;
