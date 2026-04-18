import pool from '../db/client';

function toCsvRow(obj: Record<string, unknown>): string {
  return Object.values(obj)
    .map((v) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',');
}

function toCsvSection(sectionName: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return `## ${sectionName}\n`;
  }
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const dataLines = rows.map(toCsvRow);
  return [`## ${sectionName}`, headerLine, ...dataLines].join('\n') + '\n';
}

export async function exportAllData(): Promise<string> {
  const sections: string[] = [];

  // income_entries
  const incomeResult = await pool.query(
    'SELECT id, source_name, amount, frequency, effective_date, created_at, updated_at FROM income_entries ORDER BY id'
  );
  sections.push(toCsvSection('income_entries', incomeResult.rows));

  // expense_entries
  const expenseResult = await pool.query(
    'SELECT id, name, amount, category, type, date, created_at, updated_at FROM expense_entries ORDER BY id'
  );
  sections.push(toCsvSection('expense_entries', expenseResult.rows));

  // loans
  const loansResult = await pool.query(
    'SELECT id, loan_name, original_principal, outstanding_principal, emi_amount, interest_rate_pa, emi_start_date, is_closed, created_at, updated_at FROM loans ORDER BY id'
  );
  sections.push(toCsvSection('loans', loansResult.rows));

  // emi_payments
  const emiResult = await pool.query(
    'SELECT id, loan_id, payment_month, emi_paid, principal_component, interest_component, balance_after, created_at FROM emi_payments ORDER BY id'
  );
  sections.push(toCsvSection('emi_payments', emiResult.rows));

  // investment_holdings
  const holdingsResult = await pool.query(
    'SELECT id, stock_symbol, stock_name, quantity, purchase_price, purchase_date, is_closed, created_at, updated_at FROM investment_holdings ORDER BY id'
  );
  sections.push(toCsvSection('investment_holdings', holdingsResult.rows));

  // sell_transactions
  const sellResult = await pool.query(
    'SELECT id, holding_id, quantity_sold, sell_price, sell_date, realised_gain, created_at FROM sell_transactions ORDER BY id'
  );
  sections.push(toCsvSection('sell_transactions', sellResult.rows));

  // savings_transactions
  const savingsResult = await pool.query(
    'SELECT id, type, amount, date, description, created_at, updated_at FROM savings_transactions ORDER BY id'
  );
  sections.push(toCsvSection('savings_transactions', savingsResult.rows));

  // monthly_notes
  const notesResult = await pool.query(
    'SELECT id, month, note, created_at, updated_at FROM monthly_notes ORDER BY id'
  );
  sections.push(toCsvSection('monthly_notes', notesResult.rows));

  return sections.join('\n');
}
