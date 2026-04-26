import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zcoildagsacuaceohddal.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2lsZGFnc2FjdWFjZW9oZGRhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MTI0MTA0MDAsImV4cCI6MTg3MDAxODQwMH0.zcoIdwsacuacohddal_238595cHdleit-i1i_service_role';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📱 Creating daily_transactions table for SMS-based expense tracking...');
    const migrationSQL = fs.readFileSync('./backend/src/db/migrations/007_create_daily_transactions.sql', 'utf8');
    
    console.log('Applying migration to Supabase...\n');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('  ❌ Error:', error.message);
        } else {
          console.log('  ✅ Success');
        }
      } catch (err) {
        console.error('  ❌ Error:', err.message);
      }
    }
    
    console.log('\n🎉 Daily Transactions table created successfully!');
    console.log('📱 You can now use the Daily Expense feature to track SMS transactions.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();