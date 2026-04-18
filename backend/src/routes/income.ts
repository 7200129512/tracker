import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as incomeService from '../services/incomeService';

const router = Router();

// GET /income/monthly-summary — must be before /:id routes
router.get(
  '/monthly-summary',
  asyncHandler(async (_req, res) => {
    const summary = await incomeService.getMonthlySummary();
    res.json({ data: summary });
  })
);

// GET /income
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const entries = await incomeService.getAllIncomeEntries();
    res.json({ data: entries });
  })
);

// POST /income
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { sourceName, amount, frequency, effectiveDate } = req.body;
    const entry = await incomeService.createIncomeEntry({
      sourceName,
      amount,
      frequency,
      effectiveDate,
    });
    res.status(201).json({ data: entry });
  })
);

// PUT /income/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const entry = await incomeService.updateIncomeEntry(id, req.body);
    res.json({ data: entry });
  })
);

// DELETE /income/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await incomeService.deleteIncomeEntry(id);
    res.json({ data: { message: 'Income entry deleted' } });
  })
);

export default router;
