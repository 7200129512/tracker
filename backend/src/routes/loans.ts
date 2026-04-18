import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as loanService from '../services/loanService';

const router = Router();

// GET /loans
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const loans = await loanService.getAllLoans();
    res.json({ data: loans });
  })
);

// POST /loans
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { loanName, originalPrincipal, outstandingPrincipal, emiAmount, interestRatePa, emiStartDate } =
      req.body;
    const loan = await loanService.createLoan({
      loanName,
      originalPrincipal,
      outstandingPrincipal,
      emiAmount,
      interestRatePa,
      emiStartDate,
    });
    res.status(201).json({ data: loan });
  })
);

// PUT /loans/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const loan = await loanService.updateLoan(id, req.body);
    res.json({ data: loan });
  })
);

// DELETE /loans/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await loanService.deleteLoan(id);
    res.json({ data: { message: 'Loan deleted' } });
  })
);

// POST /loans/:id/payments
router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const loanId = parseInt(req.params.id, 10);
    const { paymentMonth } = req.body;
    const payment = await loanService.recordEmiPayment(loanId, paymentMonth);
    res.status(201).json({ data: payment });
  })
);

// GET /loans/:id/payments
router.get(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const loanId = parseInt(req.params.id, 10);
    const payments = await loanService.getLoanPayments(loanId);
    res.json({ data: payments });
  })
);

// GET /loans/:id/amortisation
router.get(
  '/:id/amortisation',
  asyncHandler(async (req, res) => {
    const loanId = parseInt(req.params.id, 10);
    const schedule = await loanService.getAmortisationSchedule(loanId);
    res.json({ data: schedule });
  })
);

export default router;
