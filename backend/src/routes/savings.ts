import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as savingsService from '../services/savingsService';

const router = Router();

// GET /savings/balance?from=&to=
router.get(
  '/balance',
  asyncHandler(async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const balance = await savingsService.getBalance(from, to);
    res.json({ data: balance });
  })
);

// GET /savings/transactions
router.get(
  '/transactions',
  asyncHandler(async (_req, res) => {
    const transactions = await savingsService.getAllTransactions();
    res.json({ data: transactions });
  })
);

// POST /savings/transactions
router.post(
  '/transactions',
  asyncHandler(async (req, res) => {
    const { type, amount, date, description } = req.body;
    const transaction = await savingsService.createTransaction({ type, amount, date, description });
    res.status(201).json({ data: transaction });
  })
);

// PUT /savings/transactions/:id
router.put(
  '/transactions/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const transaction = await savingsService.updateTransaction(id, req.body);
    res.json({ data: transaction });
  })
);

// DELETE /savings/transactions/:id
router.delete(
  '/transactions/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await savingsService.deleteTransaction(id);
    res.json({ data: { message: 'Savings transaction deleted' } });
  })
);

export default router;
