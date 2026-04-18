const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:@sara4251@SARA@db.zcoldagsacuaceohddal.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
    
    console.log('\nChecking tables...');
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('📋 Tables:', tables.rows.map(r => r.table_name));
    
    console.log('\nChecking expense entries...');
    const expenses = await pool.query('SELECT * FROM expense_entries');
    console.log('💸 Expenses count:', expenses.rows.length);
    if (expenses.rows.length > 0) {
      console.log('Expenses:', expenses.rows);
    }
    
    console.log('\nChecking loans...');
    const loans = await pool.query('SELECT * FROM loans');
    console.log('🏦 Loans count:', loans.rows.length);
    if (loans.rows.length > 0) {
      console.log('Loans:', loans.rows);
    }
    
    console.log('\nChecking income...');
    const income = await pool.query('SELECT * FROM income_entries');
    console.log('💰 Income count:', income.rows.length);
    if (income.rows.length > 0) {
      console.log('Income:', income.rows);
    }
    
    // Try to manually insert seed data if tables are empty
    if (expenses.rows.length === 0) {
      console.log('\n🌱 Inserting seed data...');
      
      await pool.query(`
        INSERT INTO expense_entries (name, amount, category, type, date)
        VALUES 
          ('House Rent', 14000.00, 'Rent', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)),
          ('Car EMI', 18552.00, 'EMI', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)),
          ('Other Expenses', 15000.00, 'Other', 'Fixed', DATE_TRUNC('month', CURRENT_DATE))
      `);
      
      await pool.query(`
        INSERT INTO loans (loan_name, original_principal, outstanding_principal, emi_amount, interest_rate_pa, emi_start_date)
        VALUES ('Car Loan', 1054000.00, 1054000.00, 18552.00, 9.00, DATE_TRUNC('month', CURRENT_DATE))
      `);
      
      await pool.query(`
        INSERT INTO income_entries (source_name, amount, frequency, effective_date)
        VALUES 
          ('Salary', 138086.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)),
          ('Variable Pay', 42000.00, 'annual', DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '2 months')
      `);
      
      console.log('✅ Seed data inserted successfully!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();