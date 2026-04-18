import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import {
  useHoldings, useClosedPositions, useAddHolding,
  useDeleteHolding,
} from '../api/investments';
import type { InvestmentHolding } from '../types';
import { formatINR, formatPct } from '../utils/format';

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const EMPTY = {
  stockSymbol: '',
  stockName: '',
  quantity: 0,
  purchasePrice: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
};

// Free stock market APIs
const STOCK_APIS = {
  // Using Alpha Vantage (free tier, 5 calls/min)
  ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
  // Using Finnhub (free tier)
  FINNHUB: 'https://finnhub.io/api/v1/quote',
  // Using Polygon.io (free tier)
  POLYGON: 'https://api.polygon.io/v1/open-close',
};

// Function to fetch current stock price from multiple APIs
const fetchStockPrice = async (symbol: string): Promise<number | null> => {
  try {
    // Try Alpha Vantage first (works for Indian stocks with .NS or .BO suffix)
    const alphaResponse = await fetch(
      `${STOCK_APIS.ALPHA_VANTAGE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => null);

    if (alphaResponse?.ok) {
      const data = await alphaResponse.json();
      const price = parseFloat(data['05. price']);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }

    // Try Yahoo Finance API via RapidAPI (free tier available)
    // Note: You may need to add your own API key for production
    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => null);

    if (yahooResponse?.ok) {
      const data = await yahooResponse.json();
      const price = data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (price && price > 0) {
        return price;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};

export default function InvestmentsPage() {
  const { data: holdings = [], isLoading } = useHoldings();
  const { data: closed = [] } = useClosedPositions();
  const addHolding = useAddHolding();
  const deleteHolding = useDeleteHolding();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [currentPrices, setCurrentPrices] = useState<{ [key: string]: number }>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch current prices for all holdings
  useEffect(() => {
    if (holdings.length === 0) return;
    
    const fetchPrices = async () => {
      setLoadingPrices(true);
      const prices: { [key: string]: number } = {};
      
      for (const holding of holdings) {
        const price = await fetchStockPrice(holding.stockSymbol);
        if (price) {
          prices[holding.stockSymbol] = price;
        } else {
          // Fallback to purchase price if API fails
          prices[holding.stockSymbol] = holding.purchasePrice;
        }
      }
      
      setCurrentPrices(prices);
      setLastUpdated(new Date());
      setLoadingPrices(false);
    };

    fetchPrices();
    
    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [holdings]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await addHolding.mutateAsync(form as Omit<InvestmentHolding, 'id' | 'isClosed' | 'currentPrice' | 'priceStale' | 'priceFetchedAt'>);
      setForm(EMPTY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error adding holding');
    }
  };

  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.purchasePrice, 0);
  const totalCurrent = holdings.reduce((s, h) => {
    const curPrice = currentPrices[h.stockSymbol] || h.purchasePrice;
    return s + h.quantity * curPrice;
  }, 0);
  const totalGain = totalCurrent - totalInvested;

  const allocationData = holdings
    .filter((h) => currentPrices[h.stockSymbol])
    .map((h) => ({ name: h.stockSymbol, value: h.quantity * (currentPrices[h.stockSymbol] || 0) }));

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Investments</h2>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Invested" value={formatINR(totalInvested)} color="#3b82f6" />
        <SummaryCard label="Current Value" value={formatINR(totalCurrent)} color="#22c55e" />
        <SummaryCard
          label="Gain / Loss"
          value={`${formatINR(totalGain)} (${totalInvested > 0 ? formatPct((totalGain / totalInvested) * 100) : '0%'})`}
          color={totalGain >= 0 ? '#22c55e' : '#ef4444'}
        />
        <div style={{ alignSelf: 'center', fontSize: 12, color: '#64748b' }}>
          {loadingPrices ? (
            <span>🔄 Fetching live prices...</span>
          ) : lastUpdated ? (
            <span>✓ Updated: {lastUpdated.toLocaleTimeString()}</span>
          ) : (
            <span>Prices loading...</span>
          )}
        </div>
      </div>

      {/* Add form */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Add Holding</h3>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Symbol (e.g. RELIANCE.NS)" value={form.stockSymbol} onChange={(e) => setForm({ ...form, stockSymbol: e.target.value.toUpperCase() })} required style={inputStyle} />
          <input placeholder="Stock Name" value={form.stockName} onChange={(e) => setForm({ ...form, stockName: e.target.value })} required style={inputStyle} />
          <input type="number" placeholder="Quantity" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required min={0.0001} step={0.0001} style={{ ...inputStyle, width: 120 }} />
          <input type="number" placeholder="Buy Price (₹)" value={form.purchasePrice || ''} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} required min={0.01} step={0.01} style={{ ...inputStyle, width: 140 }} />
          <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required style={inputStyle} />
          <button type="submit" style={btnStyle('#22c55e')}>Add</button>
        </form>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Use NSE suffix: RELIANCE.NS | BSE suffix: 500325.BO
        </p>
      </div>

      {/* Holdings table */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Active Holdings</h3>
        {isLoading ? <p>Loading…</p> : holdings.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No holdings yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Symbol', 'Name', 'Qty', 'Buy Price', 'Current Price', 'Value', 'Gain/Loss', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const curPrice = currentPrices[h.stockSymbol] || h.purchasePrice;
                  const value = h.quantity * curPrice;
                  const gain = (curPrice - h.purchasePrice) * h.quantity;
                  const gainPct = h.purchasePrice > 0 ? (gain / (h.purchasePrice * h.quantity)) * 100 : 0;
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}>
                        <strong>{h.stockSymbol}</strong>
                      </td>
                      <td style={tdStyle}>{h.stockName}</td>
                      <td style={tdStyle}>{h.quantity}</td>
                      <td style={tdStyle}>{formatINR(h.purchasePrice)}</td>
                      <td style={tdStyle}>{formatINR(curPrice)}</td>
                      <td style={tdStyle}>{formatINR(value)}</td>
                      <td style={{ ...tdStyle, color: gain >= 0 ? '#16a34a' : '#dc2626' }}>
                        {formatINR(gain)} ({formatPct(gainPct)})
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => deleteHolding.mutate(h.id)} style={smallBtn('#ef4444')}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocation chart */}
      {allocationData.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Portfolio Allocation</h3>
          <PieChart width={320} height={220}>
            <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {allocationData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip formatter={(v: number) => formatINR(v)} />
          </PieChart>
        </div>
      )}

      {/* Closed positions */}
      {closed.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Closed Positions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Symbol', 'Name', 'Buy Price'].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {closed.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>{h.stockSymbol}</td>
                  <td style={tdStyle}>{h.stockName}</td>
                  <td style={tdStyle}>{formatINR(h.purchasePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, minWidth: 130 };
const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14 });
const smallBtn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 4 });
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: '#334155' };
