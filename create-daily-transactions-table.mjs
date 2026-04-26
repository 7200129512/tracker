/**
 * Run this script to create the daily_transactions table in Supabase.
 * Usage: node create-daily-transactions-table.mjs
 */

import { createClient } from './frontend/node_modules/@supabase/supabase-js/dist/module/index.js';

const SUPABASE_URL = 'https://zcoildagsacuaceohddal.supabase.co';

// ⚠️  Replace this with your actual service_role key from:
// Supabase Dashboard → Project Settings → API → service_role (secret)
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_KEY environment variable');
  console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role key');
  console.error('   Run: $env:SUPABASE_SERVICE_KEY="your_key_here"; node create-daily-transactions-table.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SQL = `
CREATE TABLE IF NOT EXISTS daily_transactions (
    id          SERIAL PRIMARY KEY,
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    type        VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
    merchant    VARCHAR(255) NOT NULL,
    category    VARCHAR(50) NOT NULL CHECK (category IN 
                    ('Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Healthcare', 'Rent', 'Other')),
    date        DATE NOT NULL,
    time        TIME NOT NULL,
    raw_sms     TEXT NOT NULL,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_transactions_user_id ON daily_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_date ON daily_transactions(date);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_user_date ON daily_transactions(user_id, date);
`;

async function run() {
  console.log('Creating daily_transactions table...');
  const { error } = await supabase.rpc('exec_sql', { sql: SQL });
  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\nIf exec_sql is not available, please run this SQL manually in the Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/zcoildagsacuaceohddal/sql/new');
    console.log('\n--- SQL to run ---');
    console.log(SQL);
  } else {
    console.log('✅ Table created successfully!');
  }
}

run();
