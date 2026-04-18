import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { exportAllData } from '../utils/csvExport';
import { parseAndValidateCsv } from '../utils/csvImport';
import pool from '../db/client';

const router = Router();

// GET /data/export — streams CSV download
router.get(
  '/export',
  asyncHandler(async (_req: Request, res: Response) => {
    const csv = await exportAllData();
    const filename = `portfolio-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  })
);

// POST /data/import — validate CSV, return preview + errors
router.post(
  '/import',
  asyncHandler(async (req: Request, res: Response) => {
    const { csvContent } = req.body;
    if (!csvContent) {
      res.status(400).json({ error: 'csvContent is required' });
      return;
    }

    const result = parseAndValidateCsv(csvContent);
    res.json({ data: result });
  })
);

// POST /data/import/confirm — replace all data with imported records (in a transaction)
router.post(
  '/import/confirm',
  asyncHandler(async (req: Request, res: Response) => {
    const { csvContent } = req.body;
    if (!csvContent) {
      res.status(400).json({ error: 'csvContent is required' });
      return;
    }

    const result = parseAndValidateCsv(csvContent);
    if (!result.valid) {
      res.status(400).json({
        error: 'CSV validation failed',
        data: { errors: result.errors },
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all existing data (order matters for FK constraints)
      await client.query('DELETE FROM sell_transactions');
      await client.query('DELETE FROM investment_holdings');
      await client.query('DELETE FROM emi_payments');
      await client.query('DELETE FROM loans');
      await client.query('DELETE FROM income_entries');
      await client.query('DELETE FROM expense_entries');
      await client.query('DELETE FROM savings_transactions');
      await client.query('DELETE FROM monthly_notes');
      await client.query('DELETE FROM price_cache');

      const records = result.records;

      // Insert income_entries
      for (const row of records.income_entries) {
        await client.query(
          `INSERT INTO income_entries (source_name, amount, frequency, effective_date)
           VALUES ($1, $2, $3, $4)`,
          [row.source_name, row.amount, row.frequency, row.effective_date]
        );
      }

      // Insert expense_entries
      for (const row of records.expense_entries) {
        await client.query(
          `INSERT INTO expense_entries (name, amount, category, type, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [row.name, row.amount, row.category, row.type, row.date]
        );
      }

      // Insert loans (need to track old id -> new id mapping for emi_payments)
      const loanIdMap = new Map<string, number>();
      for (const row of records.loans) {
        const loanResult = await client.query(
          `INSERT INTO loans (loan_name, original_principal, outstanding_principal, emi_amount, interest_rate_pa, emi_start_date, is_closed)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            row.loan_name,
            row.original_principal,
            row.outstanding_principal,
            row.emi_amount,
            row.interest_rate_pa,
            row.emi_start_date,
            row.is_closed === 'true' || row.is_closed === 't',
          ]
        );
        loanIdMap.set(row.id, loanResult.rows[0].id);
      }

      // Insert emi_payments (remap loan_id)
      for (const row of records.emi_payments) {
        const newLoanId = loanIdMap.get(row.loan_id) ?? parseInt(row.loan_id, 10);
        await client.query(
          `INSERT INTO emi_payments (loan_id, payment_month, emi_paid, principal_component, interest_component, balance_after)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newLoanId,
            row.payment_month,
            row.emi_paid,
            row.principal_component,
            row.interest_component,
            row.balance_after,
          ]
        );
      }

      // Insert investment_holdings (track id mapping for sell_transactions)
      const holdingIdMap = new Map<string, number>();
      for (const row of records.investment_holdings) {
        const holdingResult = await client.query(
          `INSERT INTO investment_holdings (stock_symbol, stock_name, quantity, purchase_price, purchase_date, is_closed)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            row.stock_symbol,
            row.stock_name,
            row.quantity,
            row.purchase_price,
            row.purchase_date,
            row.is_closed === 'true' || row.is_closed === 't',
          ]
        );
        holdingIdMap.set(row.id, holdingResult.rows[0].id);
      }

      // Insert sell_transactions (remap holding_id)
      for (const row of records.sell_transactions) {
        const newHoldingId = holdingIdMap.get(row.holding_id) ?? parseInt(row.holding_id, 10);
        await client.query(
          `INSERT INTO sell_transactions (holding_id, quantity_sold, sell_price, sell_date, realised_gain)
           VALUES ($1, $2, $3, $4, $5)`,
          [newHoldingId, row.quantity_sold, row.sell_price, row.sell_date, row.realised_gain]
        );
      }

      // Insert savings_transactions
      for (const row of records.savings_transactions) {
        await client.query(
          `INSERT INTO savings_transactions (type, amount, date, description)
           VALUES ($1, $2, $3, $4)`,
          [row.type, row.amount, row.date, row.description || null]
        );
      }

      // Insert monthly_notes
      for (const row of records.monthly_notes) {
        await client.query(
          `INSERT INTO monthly_notes (month, note) VALUES ($1, $2)`,
          [row.month, row.note]
        );
      }

      await client.query('COMMIT');

      res.json({ data: { message: 'Import successful', imported: {
        income_entries: records.income_entries.length,
        expense_entries: records.expense_entries.length,
        loans: records.loans.length,
        emi_payments: records.emi_payments.length,
        investment_holdings: records.investment_holdings.length,
        sell_transactions: records.sell_transactions.length,
        savings_transactions: records.savings_transactions.length,
        monthly_notes: records.monthly_notes.length,
      }}});
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// POST /data/reset — restore seed defaults
router.post(
  '/reset',
  asyncHandler(async (_req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all data
      await client.query('DELETE FROM sell_transactions');
      await client.query('DELETE FROM investment_holdings');
      await client.query('DELETE FROM emi_payments');
      await client.query('DELETE FROM loans');
      await client.query('DELETE FROM income_entries');
      await client.query('DELETE FROM expense_entries');
      await client.query('DELETE FROM savings_transactions');
      await client.query('DELETE FROM monthly_notes');
      await client.query('DELETE FROM price_cache');

      // Re-run seed defaults logic
      await client.query(`
        INSERT INTO expense_entries (name, amount, category, type, date)
        SELECT 'House Rent', 14000.00, 'Rent', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)
        WHERE NOT EXISTS (SELECT 1 FROM expense_entries WHERE name = 'House Rent' AND type = 'Fixed')
      `);

      await client.query(`
        INSERT INTO expense_entries (name, amount, category, type, date)
        SELECT 'Car EMI', 18552.00, 'EMI', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)
        WHERE NOT EXISTS (SELECT 1 FROM expense_entries WHERE name = 'Car EMI' AND type = 'Fixed')
      `);

      await client.query(`
        INSERT INTO expense_entries (name, amount, category, type, date)
        SELECT 'Other Expenses', 15000.00, 'Other', 'Fixed', DATE_TRUNC('month', CURRENT_DATE)
        WHERE NOT EXISTS (SELECT 1 FROM expense_entries WHERE name = 'Other Expenses' AND type = 'Fixed')
      `);

      await client.query(`
        INSERT INTO loans (loan_name, original_principal, outstanding_principal, emi_amount, interest_rate_pa, emi_start_date)
        SELECT 'Car Loan', 1054000.00, 1054000.00, 18552.00, 9.00, DATE_TRUNC('month', CURRENT_DATE)
        WHERE NOT EXISTS (SELECT 1 FROM loans)
      `);

      await client.query(`
        INSERT INTO income_entries (source_name, amount, frequency, effective_date)
        SELECT 'Salary', 138086.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE)
        WHERE NOT EXISTS (SELECT 1 FROM income_entries WHERE source_name = 'Salary')
      `);

      await client.query(`
        INSERT INTO income_entries (source_name, amount, frequency, effective_date)
        SELECT 'Variable Pay', 42000.00, 'annual', DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '2 months'
        WHERE NOT EXISTS (SELECT 1 FROM income_entries WHERE source_name = 'Variable Pay')
      `);

      await client.query('COMMIT');

      res.json({ data: { message: 'Data reset to defaults successfully' } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

export default router;
