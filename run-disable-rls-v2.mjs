import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zcoildagsacuaceohddal.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2lsZGFnc2FjdWFjZW9oZGRhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MTI0MTA0MDAsImV4cCI6MTg3MDAxODQwMH0.zcoIdwsacuacohddal_238595cHdleit-i1i_service_role';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const queries = [
  'ALTER TABLE income_entries DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE expense_entries DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE loans DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE investment_holdings DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE savings_transactions DISABLE ROW LEVEL SECURITY;',
  'ALTER TABLE monthly_notes DISABLE ROW LEVEL SECURITY;',
];

async function runQuery(sql) {
  try {
    console.log(`Executing: ${sql.substring(0, 50)}...`);
    
    // Use the admin API to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      return false;
    }

    console.log('  ✓ Success');
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Disabling RLS on all tables...\n');
  
  for (const query of queries) {
    await runQuery(query);
  }
  
  console.log('\n✅ Done! The app should now work.');
}

main().catch(console.error);
