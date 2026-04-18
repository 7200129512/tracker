import pool from '../db/client';
import { NotFoundError } from '../middleware/errorHandler';

interface ExpenseRow {
  id: number;
  name: string;
  amount: string;
  category: string;
  type: string;
  date: string;
  created_at: string;
  updated_at: string;
}

type ExpenseCategory = 'Rent' | 'EMI' | 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Other';
type ExpenseType = 'Fixed' | 'Variable';

function formatExpense(row: ExpenseRow) {
  return {
    id: row.id,
    name: row.name,
    amount: parseFloat(row.amount),
    category: row.category as ExpenseCategory,
    type: row.type as ExpenseType,
    date: row.date,
  };
}

export async function getAllExpenseEntries(month?: string) {
  if (month) {
    // Filter by month (YYYY-MM)
    const result = await pool.query<ExpenseRow>(
      `SELECT * FROM expense_entries
       WHERE TO_CHAR(date, 'YYYY-MM') = $1
       ORDER BY date DESC`,
      [month]
    );
    return result.rows.map(formatExpense);
  }

  const result = await pool.query<ExpenseRow>(
    'SELECT * FROM expense_entries ORDER BY date DESC'
  );
  return result.rows.map(formatExpense);
}

export async function createExpenseEntry(data: {
  name: string;
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
}) {
  const result = await pool.query<ExpenseRow>(
    `INSERT INTO expense_entries (name, amount, category, type, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.amount, data.category, data.type, data.date]
  );
  return formatExpense(result.rows[0]);
}

export async function updateExpenseEntry(
  id: number,
  data: Partial<{
    name: string;
    amount: number;
    category: ExpenseCategory;
    type: ExpenseType;
    date: string;
  }>
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(data.amount);
  }
  if (data.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(data.category);
  }
  if (data.type !== undefined) {
    fields.push(`type = $${idx++}`);
    values.push(data.type);
  }
  if (data.date !== undefined) {
    fields.push(`date = $${idx++}`);
    values.push(data.date);
  }

  if (fields.length === 0) {
    const existing = await pool.query<ExpenseRow>('SELECT * FROM expense_entries WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError(`Expense entry with id ${id} not found`);
    return formatExpense(existing.rows[0]);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<ExpenseRow>(
    `UPDATE expense_entries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Expense entry with id ${id} not found`);
  }
  return formatExpense(result.rows[0]);
}

export async function deleteExpenseEntry(id: number) {
  const result = await pool.query('DELETE FROM expense_entries WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Expense entry with id ${id} not found`);
  }
}

/**
 * Returns total expenses per month for trailing 12 months.
 */
export async function getMonthlySummary(): Promise<{ month: string; totalExpenses: number }[]> {
  const result = await pool.query<{ month: string; total: string }>(
    `SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount) AS total
     FROM expense_entries
     WHERE date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
     GROUP BY month
     ORDER BY month ASC`
  );

  // Build trailing 12 months array
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const dbMap = new Map(result.rows.map((r) => [r.month, parseFloat(r.total)]));

  return months.map((month) => ({
    month,
    totalExpenses: dbMap.get(month) ?? 0,
  }));
}

/**
 * Returns per-category totals and percentages for a given month (YYYY-MM).
 */
export async function getCategoryBreakdown(
  month: string
): Promise<{ category: string; total: number; percentage: number }[]> {
  const result = await pool.query<{ category: string; total: string }>(
    `SELECT category, SUM(amount) AS total
     FROM expense_entries
     WHERE TO_CHAR(date, 'YYYY-MM') = $1
     GROUP BY category
     ORDER BY total DESC`,
    [month]
  );

  const rows = result.rows.map((r) => ({
    category: r.category,
    total: parseFloat(r.total),
  }));

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return rows.map((r) => ({
    category: r.category,
    total: r.total,
    percentage: grandTotal > 0 ? parseFloat(((r.total / grandTotal) * 100).toFixed(2)) : 0,
  }));
}
