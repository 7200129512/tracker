import pool from '../db/client';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { isPriceStale } from './marketDataService';

interface HoldingRow {
  id: number;
  stock_symbol: string;
  stock_name: string;
  quantity: string;
  purchase_price: string;
  purchase_date: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  current_price?: string | null;
  price_fetched_at?: string | null;
}

function formatHolding(row: HoldingRow) {
  const priceFetchedAt = row.price_fetched_at ? new Date(row.price_fetched_at) : null;
  const currentPrice = row.current_price != null ? parseFloat(row.current_price) : null;

  return {
    id: row.id,
    stockSymbol: row.stock_symbol,
    stockName: row.stock_name,
    quantity: parseFloat(row.quantity),
    purchasePrice: parseFloat(row.purchase_price),
    purchaseDate: row.purchase_date,
    isClosed: row.is_closed,
    currentPrice,
    priceStale: isPriceStale(priceFetchedAt),
    priceFetchedAt: priceFetchedAt ? priceFetchedAt.toISOString() : null,
  };
}

export async function getAllHoldings() {
  const result = await pool.query<HoldingRow>(
    `SELECT ih.*, pc.current_price, pc.price_fetched_at
     FROM investment_holdings ih
     LEFT JOIN price_cache pc ON ih.stock_symbol = pc.symbol
     WHERE ih.is_closed = false
     ORDER BY ih.created_at DESC`
  );
  return result.rows.map(formatHolding);
}

export async function getClosedPositions() {
  const result = await pool.query<HoldingRow>(
    `SELECT ih.*, pc.current_price, pc.price_fetched_at
     FROM investment_holdings ih
     LEFT JOIN price_cache pc ON ih.stock_symbol = pc.symbol
     WHERE ih.is_closed = true
     ORDER BY ih.updated_at DESC`
  );
  return result.rows.map(formatHolding);
}

export async function createHolding(data: {
  stockSymbol: string;
  stockName: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}) {
  const result = await pool.query<HoldingRow>(
    `INSERT INTO investment_holdings (stock_symbol, stock_name, quantity, purchase_price, purchase_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.stockSymbol, data.stockName, data.quantity, data.purchasePrice, data.purchaseDate]
  );
  const row = result.rows[0];
  return formatHolding({ ...row, current_price: null, price_fetched_at: null });
}

export async function updateHolding(
  id: number,
  data: Partial<{
    stockSymbol: string;
    stockName: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
    isClosed: boolean;
  }>
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.stockSymbol !== undefined) {
    fields.push(`stock_symbol = $${idx++}`);
    values.push(data.stockSymbol);
  }
  if (data.stockName !== undefined) {
    fields.push(`stock_name = $${idx++}`);
    values.push(data.stockName);
  }
  if (data.quantity !== undefined) {
    fields.push(`quantity = $${idx++}`);
    values.push(data.quantity);
  }
  if (data.purchasePrice !== undefined) {
    fields.push(`purchase_price = $${idx++}`);
    values.push(data.purchasePrice);
  }
  if (data.purchaseDate !== undefined) {
    fields.push(`purchase_date = $${idx++}`);
    values.push(data.purchaseDate);
  }
  if (data.isClosed !== undefined) {
    fields.push(`is_closed = $${idx++}`);
    values.push(data.isClosed);
  }

  if (fields.length === 0) {
    const holdings = await getAllHoldings();
    const holding = holdings.find((h) => h.id === id);
    if (!holding) throw new NotFoundError(`Holding with id ${id} not found`);
    return holding;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<HoldingRow>(
    `UPDATE investment_holdings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Holding with id ${id} not found`);
  }

  // Fetch with price cache
  const withPrice = await pool.query<HoldingRow>(
    `SELECT ih.*, pc.current_price, pc.price_fetched_at
     FROM investment_holdings ih
     LEFT JOIN price_cache pc ON ih.stock_symbol = pc.symbol
     WHERE ih.id = $1`,
    [id]
  );
  return formatHolding(withPrice.rows[0]);
}

export async function deleteHolding(id: number) {
  const result = await pool.query('DELETE FROM investment_holdings WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Holding with id ${id} not found`);
  }
}

export async function recordSell(
  holdingId: number,
  quantitySold: number,
  sellPrice: number,
  sellDate: string
) {
  const holdingResult = await pool.query<HoldingRow>(
    'SELECT * FROM investment_holdings WHERE id = $1',
    [holdingId]
  );

  if (holdingResult.rows.length === 0) {
    throw new NotFoundError(`Holding with id ${holdingId} not found`);
  }

  const holding = holdingResult.rows[0];
  const currentQty = parseFloat(holding.quantity);

  if (quantitySold > currentQty) {
    throw new ValidationError(
      `Cannot sell ${quantitySold} units; only ${currentQty} available`
    );
  }

  const purchasePrice = parseFloat(holding.purchase_price);
  const realisedGain = parseFloat(((sellPrice - purchasePrice) * quantitySold).toFixed(4));
  const newQty = parseFloat((currentQty - quantitySold).toFixed(4));
  const isClosed = newQty <= 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sellResult = await client.query(
      `INSERT INTO sell_transactions (holding_id, quantity_sold, sell_price, sell_date, realised_gain)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [holdingId, quantitySold, sellPrice, sellDate, realisedGain]
    );

    await client.query(
      `UPDATE investment_holdings SET quantity = $1, is_closed = $2, updated_at = NOW() WHERE id = $3`,
      [newQty, isClosed, holdingId]
    );

    await client.query('COMMIT');

    const tx = sellResult.rows[0];
    return {
      id: tx.id,
      holdingId: tx.holding_id,
      quantitySold: parseFloat(tx.quantity_sold),
      sellPrice: parseFloat(tx.sell_price),
      sellDate: tx.sell_date,
      realisedGain: parseFloat(tx.realised_gain),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getHoldingTransactions(holdingId: number) {
  const holdingCheck = await pool.query('SELECT id FROM investment_holdings WHERE id = $1', [holdingId]);
  if (holdingCheck.rows.length === 0) {
    throw new NotFoundError(`Holding with id ${holdingId} not found`);
  }

  const result = await pool.query(
    `SELECT * FROM sell_transactions WHERE holding_id = $1 ORDER BY sell_date ASC`,
    [holdingId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    holdingId: row.holding_id,
    quantitySold: parseFloat(row.quantity_sold),
    sellPrice: parseFloat(row.sell_price),
    sellDate: row.sell_date,
    realisedGain: parseFloat(row.realised_gain),
  }));
}

export async function getPortfolioSummary() {
  const result = await pool.query<{
    stock_symbol: string;
    quantity: string;
    purchase_price: string;
    current_price: string | null;
  }>(
    `SELECT ih.stock_symbol, ih.quantity, ih.purchase_price, pc.current_price
     FROM investment_holdings ih
     LEFT JOIN price_cache pc ON ih.stock_symbol = pc.symbol
     WHERE ih.is_closed = false`
  );

  let totalInvested = 0;
  let totalCurrentValue = 0;

  for (const row of result.rows) {
    const qty = parseFloat(row.quantity);
    const purchasePrice = parseFloat(row.purchase_price);
    const currentPrice = row.current_price != null ? parseFloat(row.current_price) : purchasePrice;

    totalInvested += qty * purchasePrice;
    totalCurrentValue += qty * currentPrice;
  }

  const totalGainLoss = totalCurrentValue - totalInvested;

  return {
    totalInvested: parseFloat(totalInvested.toFixed(2)),
    totalCurrentValue: parseFloat(totalCurrentValue.toFixed(2)),
    totalGainLoss: parseFloat(totalGainLoss.toFixed(2)),
  };
}
