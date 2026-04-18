import cron from 'node-cron';
import { refreshAllPrices } from '../services/marketDataService';
import pool from '../db/client';

export function startScheduler(): void {
  const cronExpression =
    process.env.MARKET_DATA_REFRESH_CRON || '*/15 9-15 * * 1-5';

  // Price refresh scheduler
  cron.schedule(cronExpression, async () => {
    console.log('[scheduler] Refreshing market prices...');
    try {
      await refreshAllPrices();
      console.log('[scheduler] Market prices refreshed successfully');
    } catch (err) {
      console.error('[scheduler] Failed to refresh market prices:', err);
    }
  });

  // Keep-alive DB ping every 6 days (for Supabase free tier)
  cron.schedule('0 0 */6 * *', async () => {
    console.log('[scheduler] Keep-alive DB ping...');
    try {
      await pool.query('SELECT 1');
      console.log('[scheduler] Keep-alive DB ping successful');
    } catch (err) {
      console.error('[scheduler] Keep-alive DB ping failed:', err);
    }
  });

  console.log(`[scheduler] Price refresh scheduled: ${cronExpression}`);
  console.log('[scheduler] Keep-alive DB ping scheduled: every 6 days');
}
