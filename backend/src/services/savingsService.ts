import pool from '../db/client';
import { NotFoundError } from '../middleware/errorHandler';

interface SavingsRow {
  id: number;
  type: string;
  amount: string;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function formatTransaction(row: SavingsRow) {
  return {
    id: row.id,
    type: row.type as 'Deposit' | 'Withdrawal',
    amount: parseFloat(row.amount),
    date: row.date,
    description: row.description ?? '',
  };
}

export async function getAllTransactions() {
  const result = await pool.query<SavingsRow>(
    'SELECT * FROM savings_transactions ORDER BY date DESC, created_at DESC'
  );
  return result.rows.map(formatTransaction);
}

export async function createTransaction(data: {
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  date: string;
  description?: string;
}) {
  // Check if withdrawal would make balance negative
  let warning: string | undefined;
  if (data.type === 'Withdrawal') {
    const balanceResult = await pool.query<{ balance: string }>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE -amount END), 0) AS balance
       FROM savings_transactions`
    );
    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    if (currentBalance - data.amount < 0) {
      warning = 'negative_balance';
    }
  }

  const result = await pool.query<SavingsRow>(
    `INSERT INTO savings_transactions (type, amount, date, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.type, data.amount, data.date, data.description ?? null]
  );

  const transaction = formatTransaction(result.rows[0]);
  return warning ? { ...transaction, warning } : transaction;
}

export async function updateTransaction(
  id: number,
  data: Partial<{
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    date: string;
    description: string;
  }>
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.type !== undefined) {
    fields.push(`type = $${idx++}`);
    values.push(data.type);
  }
  if (data.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(data.amount);
  }
  if (data.date !== undefined) {
    fields.push(`date = $${idx++}`);
    values.push(data.date);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(data.description);
  }

  if (fields.length === 0) {
    const existing = await pool.query<SavingsRow>('SELECT * FROM savings_transactions WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError(`Savings transaction with id ${id} not found`);
    return formatTransaction(existing.rows[0]);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<SavingsRow>(
    `UPDATE savings_transactions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Savings transaction with id ${id} not found`);
  }
  return formatTransaction(result.rows[0]);
}

export async function deleteTransaction(id: number) {
  const result = await pool.query('DELETE FROM savings_transactions WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Savings transaction with id ${id} not found`);
  }
}

export async function getBalance(from?: string, to?: string) {
  const allResult = await pool.query<{ type: string; total: string }>(
    `SELECT type, SUM(amount) AS total FROM savings_transactions GROUP BY type`
  );

  let totalDeposited = 0;
  let totalWithdrawn = 0;
  for (const row of allResult.rows) {
    if (row.type === 'Deposit') totalDeposited = parseFloat(row.total);
    else if (row.type === 'Withdrawal') totalWithdrawn = parseFloat(row.total);
  }
  const balance = totalDeposited - totalWithdrawn;

  if (from && to) {
    const rangeResult = await pool.query<{ type: string; total: string }>(
      `SELECT type, SUM(amount) AS total
       FROM savings_transactions
       WHERE date >= $1 AND date <= $2
       GROUP BY type`,
      [from, to]
    );

    let rangeDeposited = 0;
    let rangeWithdrawn = 0;
    for (const row of rangeResult.rows) {
      if (row.type === 'Deposit') rangeDeposited = parseFloat(row.total);
      else if (row.type === 'Withdrawal') rangeWithdrawn = parseFloat(row.total);
    }

    return {
      balance,
      totalDeposited,
      totalWithdrawn,
      dateRange: {
        from,
        to,
        deposited: rangeDeposited,
        withdrawn: rangeWithdrawn,
      },
    };
  }

  return { balance, totalDeposited, totalWithdrawn };
}

export async function getDateRangeSummary(from: string, to: string) {
  const result = await pool.query<{ type: string; total: string }>(
    `SELECT type, SUM(amount) AS total
     FROM savings_transactions
     WHERE date >= $1 AND date <= $2
     GROUP BY type`,
    [from, to]
  );

  let totalDeposited = 0;
  let totalWithdrawn = 0;
  for (const row of result.rows) {
    if (row.type === 'Deposit') totalDeposited = parseFloat(row.total);
    else if (row.type === 'Withdrawal') totalWithdrawn = parseFloat(row.total);
  }

  return { from, to, totalDeposited, totalWithdrawn };
}
