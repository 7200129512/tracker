import { supabaseClient } from './client';

export const exportData = async () => {
  try {
    // Fetch all data from Supabase tables
    const [incomeRes, expenseRes, loansRes, investmentsRes, savingsRes] = await Promise.all([
      supabaseClient.get('/income_entries'),
      supabaseClient.get('/expense_entries'),
      supabaseClient.get('/loans'),
      supabaseClient.get('/investment_holdings'),
      supabaseClient.get('/savings_transactions'),
    ]);

    const data = {
      income: incomeRes.data,
      expenses: expenseRes.data,
      loans: loansRes.data,
      investments: investmentsRes.data,
      savings: savingsRes.data,
      exportedAt: new Date().toISOString(),
    };

    // Create a blob and download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

export const importData = async (file: File) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate data structure
    const errors: { row: number; field: string; reason: string }[] = [];
    
    // Basic validation
    if (!data.income && !data.expenses && !data.loans && !data.investments && !data.savings) {
      errors.push({ row: 0, field: 'root', reason: 'No valid data found in file' });
    }
    
    // Store in session for confirmation
    sessionStorage.setItem('importData', JSON.stringify(data));
    
    return { success: true, recordCount: Object.keys(data).length, errors };
  } catch (error) {
    console.error('Import parse error:', error);
    return { 
      success: false, 
      recordCount: 0, 
      errors: [{ row: 0, field: 'file', reason: error instanceof Error ? error.message : 'Failed to parse file' }] 
    };
  }
};

export const confirmImport = async () => {
  try {
    const importDataStr = sessionStorage.getItem('importData');
    if (!importDataStr) {
      throw new Error('No import data found');
    }

    const data = JSON.parse(importDataStr);

    // Import data into Supabase
    if (data.income && data.income.length > 0) {
      await supabaseClient.post('/income_entries', data.income);
    }
    if (data.expenses && data.expenses.length > 0) {
      await supabaseClient.post('/expense_entries', data.expenses);
    }
    if (data.loans && data.loans.length > 0) {
      await supabaseClient.post('/loans', data.loans);
    }
    if (data.investments && data.investments.length > 0) {
      await supabaseClient.post('/investment_holdings', data.investments);
    }
    if (data.savings && data.savings.length > 0) {
      await supabaseClient.post('/savings_transactions', data.savings);
    }

    sessionStorage.removeItem('importData');
    return { success: true };
  } catch (error) {
    console.error('Import confirm error:', error);
    throw error;
  }
};

export const resetData = async () => {
  try {
    // Delete all data from tables (in reverse order of dependencies)
    await Promise.all([
      supabaseClient.delete('/sell_transactions'),
      supabaseClient.delete('/emi_payments'),
      supabaseClient.delete('/investment_holdings'),
      supabaseClient.delete('/savings_transactions'),
      supabaseClient.delete('/loans'),
      supabaseClient.delete('/expense_entries'),
      supabaseClient.delete('/income_entries'),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Reset error:', error);
    throw error;
  }
};
