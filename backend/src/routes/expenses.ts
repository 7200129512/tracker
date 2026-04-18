import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as expenseService from '../services/expenseService';

const router = Router();

// GET /expenses/monthly-summary — must be before /:id routes
router.get(
  '/monthly-summary',
  asyncHandler(async (_req, res) => {
    const summary = await expenseService.getMonthlySummary();
    res.json({ data: summary });
  })
);

// GET /expenses/category-breakdown?month=YYYY-MM
router.get(
  '/category-breakdown',
  asyncHandler(async (req, res) => {
    const month = req.query.month as string;
    const breakdown = await expenseService.getCategoryBreakdown(month);
    res.json({ data: breakdown });
  })
);

// GET /expenses
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const month = req.query.month as string | undefined;
    const entries = await expenseService.getAllExpenseEntries(month);
    res.json({ data: entries });
  })
);

// POST /expenses
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, amount, category, type, date } = req.body;
    const entry = await expenseService.createExpenseEntry({ name, amount, category, type, date });
    res.status(201).json({ data: entry });
  })
);

// PUT /expenses/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const entry = await expenseService.updateExpenseEntry(id, req.body);
    res.json({ data: entry });
  })
);

// DELETE /expenses/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await expenseService.deleteExpenseEntry(id);
    res.json({ data: { message: 'Expense entry deleted' } });
  })
);

export default router;
