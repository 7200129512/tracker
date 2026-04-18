import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as dashboardService from '../services/dashboardService';

const router = Router();

// GET /dashboard/summary?month=YYYY-MM
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const month =
      (req.query.month as string) ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();
    const summary = await dashboardService.getSummary(month);
    res.json({ data: summary });
  })
);

// GET /dashboard/cashflow
router.get(
  '/cashflow',
  asyncHandler(async (_req, res) => {
    const cashflow = await dashboardService.getCashFlow();
    res.json({ data: cashflow });
  })
);

// GET /dashboard/alerts?month=YYYY-MM
router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const month =
      (req.query.month as string) ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();
    const alerts = await dashboardService.getAlerts(month);
    res.json({ data: alerts });
  })
);

export default router;
