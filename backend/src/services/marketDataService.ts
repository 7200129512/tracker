import pool from '../db/client';

// yahoo-finance2 is ESM-only; use dynamic require with type cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let yahooFinance: any;

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

async function getYahooFinance() {
  if (!yahooFinance) {
    // Dynamic import for ESM-only package
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - yahoo-finance2 is ESM-only; moduleResolution doesn't resolve its types
    const mod = await import('yahoo-finance2');
    yahooFinance = mod.default;
  }
  return yahooFinance;
}

export async function fetchPrice(symbol: string): Promise<void> {
  try {
    const yf = await getYahooFinance();
    const quote = await yf.quote(symbol);
    const currentPrice = quote.regularMarketPrice ?? null;

    await pool.query(
      `INSERT INTO price_cache (symbol, current_price, price_fetched_at, fetch_error)
       VALUES ($1, $2, NOW(), NULL)
       ON CONFLICT (symbol) DO UPDATE
       SET current_price = $2, price_fetched_at = NOW(), fetch_error = NULL`,
      [symbol, currentPrice]
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await pool.query(
      `INSERT INTO price_cache (symbol, fetch_error)
       VALUES ($1, $2)
       ON CONFLICT (symbol) DO UPDATE
       SET fetch_error = $2`,
      [symbol, errorMessage]
    );
  }
}

export async function refreshAllPrices(): Promise<void> {
  const result = await pool.query<{ stock_symbol: string }>(
    `SELECT DISTINCT stock_symbol FROM investment_holdings WHERE is_closed = false`
  );

  const symbols = result.rows.map((r) => r.stock_symbol);
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 500;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((symbol) => fetchPrice(symbol)));

    if (i + BATCH_SIZE < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
}

export async function getLastRefreshTime(): Promise<Date | null> {
  const result = await pool.query<{ last_refresh: string | null }>(
    `SELECT MAX(price_fetched_at) AS last_refresh FROM price_cache`
  );
  const ts = result.rows[0]?.last_refresh;
  return ts ? new Date(ts) : null;
}

export function isPriceStale(priceFetchedAt: Date | null): boolean {
  if (!priceFetchedAt) return true;
  return Date.now() - priceFetchedAt.getTime() > STALE_THRESHOLD_MS;
}
