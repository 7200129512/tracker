import 'dotenv/config';
import { validateEnv } from './middleware/validateEnv';

validateEnv();

import app from './app';
import pool from './db/client';
import { startScheduler } from './scheduler/priceRefresh';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] Connected to PostgreSQL');
  } catch (err) {
    console.error('[db] Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }

  startScheduler();

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

start();
