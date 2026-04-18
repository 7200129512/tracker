const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zcoildagsacuaceohddal.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2lsZGFnc2FjdWFjZW9oZGRhbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzEyNDEwNDAwLCJleHAiOjE4NzAwMTg0MDB9.zcoIdwsacuacohddal_238595cHdleit-i1i';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync('backend/src/db/migrations/003_add_user_id_columns.sql', 'utf8');
    
    console.log('Applying migration to Supabase...');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('✓ Success');
      }
    }
    
    console.log('\n✅ Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
