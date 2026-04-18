import pool from '../db/client';
import { NotFoundError } from '../middleware/errorHandler';

interface IncomeRow {
  id: number;
  source_name: string;
  amount: string;
  frequency: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

function formatIncome(row: IncomeRow) {
  return {
    id: row.id,
    sourceName: row.source_name,
    amount: parseFloat(row.amount),
    frequency: row.frequency as 'monthly' | 'one-time' | 'annual',
    effectiveDate: row.effective_date,
  };
}

export async function getAllIncomeEntries() {
  const result = await pool.query<IncomeRow>(
    'SELECT * FROM income_entries ORDER BY created_at DESC'
  );
  return result.rows.map(formatIncome);
}

export async function createIncomeEntry(data: {
  sourceName: string;
  amount: number;
  frequency: 'monthly' | 'one-time' | 'annual';
  effectiveDate: string;
}) {
  const result = await pool.query<IncomeRow>(
    `INSERT INTO income_entries (source_name, amount, frequency, effective_date)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.sourceName, data.amount, data.frequency, data.effectiveDate]
  );
  return formatIncome(result.rows[0]);
}

export async function updateIncomeEntry(
  id: number,
  data: Partial<{
    sourceName: string;
    amount: number;
    frequency: 'monthly' | 'one-time' | 'annual';
    effectiveDate: string;
  }>
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.sourceName !== undefined) {
    fields.push(`source_name = $${idx++}`);
    values.push(data.sourceName);
  }
  if (data.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(data.amount);
  }
  if (data.frequency !== undefined) {
    fields.push(`frequency = $${idx++}`);
    values.push(data.frequency);
  }
  if (data.effectiveDate !== undefined) {
    fields.push(`effective_date = $${idx++}`);
    values.push(data.effectiveDate);
  }

  if (fields.length === 0) {
    return getAllIncomeEntries().then((entries) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) throw new NotFoundError(`Income entry with id ${id} not found`);
      return entry;
    });
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<IncomeRow>(
    `UPDATE income_entries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Income entry with id ${id} not found`);
  }
  return formatIncome(result.rows[0]);
}

export async function deleteIncomeEntry(id: number) {
  const result = await pool.query('DELETE FROM income_entries WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Income entry with id ${id} not found`);
  }
}

/**
 * Returns projected income per month for trailing 12 months.
 * - 'monthly': included in every month from effectiveDate onwards
 * - 'annual': included only in the month matching effectiveDate
 * - 'one-time': included only in the month of effectiveDate
 */
export async function getMonthlySummary(): Promise<{ month: string; totalIncome: number }[]> {
  const result = await pool.query<IncomeRow>('SELECT * FROM income_entries');
  const entries = result.rows.map(formatIncome);

  // Build trailing 12 months array (YYYY-MM)
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const summary: { month: string; totalIncome: number }[] = months.map((month) => ({
    month,
    totalIncome: 0,
  }));

  for (const entry of entries) {
    const effectiveMonth = entry.effectiveDate.slice(0, 7); // YYYY-MM

    for (const item of summary) {
      if (entry.frequency === 'monthly') {
        // Include every month from effectiveDate onwards
        if (item.month >= effectiveMonth) {
          item.totalIncome += entry.amount;
        }
      } else if (entry.frequency === 'annual') {
        // Include only the month matching effectiveDate (same month-day pattern)
        if (item.month === effectiveMonth) {
          item.totalIncome += entry.amount;
        }
      } else if (entry.frequency === 'one-time') {
        // Include only the month of effectiveDate
        if (item.month === effectiveMonth) {
          item.totalIncome += entry.amount;
        }
      }
    }
  }

  return summary;
}
