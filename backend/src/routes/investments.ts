import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as investmentService from '../services/investmentService';
import { refreshAllPrices, getLastRefreshTime } from '../services/marketDataService';

const router = Router();

// Track last manual refresh time for debouncing
let lastManualRefresh: Date | null = null;
const DEBOUNCE_MS = 60 * 1000; // 60 seconds

// GET /investments/holdings
router.get(
  '/holdings',
  asyncHandler(async (_req, res) => {
    const holdings = await investmentService.getAllHoldings();
    res.json({ data: holdings });
  })
);

// POST /investments/holdings
router.post(
  '/holdings',
  asyncHandler(async (req, res) => {
    const { stockSymbol, stockName, quantity, purchasePrice, purchaseDate } = req.body;
    const holding = await investmentService.createHolding({
      stockSymbol,
      stockName,
      quantity,
      purchasePrice,
      purchaseDate,
    });
    res.status(201).json({ data: holding });
  })
);

// PUT /investments/holdings/:id
router.put(
  '/holdings/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const holding = await investmentService.updateHolding(id, req.body);
    res.json({ data: holding });
  })
);

// DELETE /investments/holdings/:id
router.delete(
  '/holdings/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await investmentService.deleteHolding(id);
    res.json({ data: { message: 'Holding deleted' } });
  })
);

// GET /investments/closed
router.get(
  '/closed',
  asyncHandler(async (_req, res) => {
    const positions = await investmentService.getClosedPositions();
    res.json({ data: positions });
  })
);

// POST /investments/holdings/:id/sell
router.post(
  '/holdings/:id/sell',
  asyncHandler(async (req, res) => {
    const holdingId = parseInt(req.params.id, 10);
    const { quantitySold, sellPrice, sellDate } = req.body;
    const transaction = await investmentService.recordSell(holdingId, quantitySold, sellPrice, sellDate);
    res.status(201).json({ data: transaction });
  })
);

// GET /investments/holdings/:id/transactions
router.get(
  '/holdings/:id/transactions',
  asyncHandler(async (req, res) => {
    const holdingId = parseInt(req.params.id, 10);
    const transactions = await investmentService.getHoldingTransactions(holdingId);
    res.json({ data: transactions });
  })
);

// POST /investments/prices/refresh (debounced: reject if last refresh < 60s ago)
router.post(
  '/prices/refresh',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    if (lastManualRefresh && now.getTime() - lastManualRefresh.getTime() < DEBOUNCE_MS) {
      const secondsAgo = Math.floor((now.getTime() - lastManualRefresh.getTime()) / 1000);
      res.status(429).json({
        error: `Price refresh was triggered ${secondsAgo}s ago. Please wait at least 60 seconds between refreshes.`,
      });
      return;
    }

    lastManualRefresh = now;
    // Run refresh in background
    refreshAllPrices().catch((err) => {
      console.error('[investments] Price refresh failed:', err);
    });

    const lastRefresh = await getLastRefreshTime();
    res.json({
      data: {
        message: 'Price refresh started',
        lastRefreshTime: lastRefresh ? lastRefresh.toISOString() : null,
      },
    });
  })
);

export default router;
