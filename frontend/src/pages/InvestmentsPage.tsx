import { useState, useEffect } from 'react';
import { useHoldings, useClosedPositions, useAddHolding, useDeleteHolding } from '../api/investments';
import type { InvestmentHolding } from '../types';
import { formatINR, formatPct } from '../utils/format';

const EMPTY = {
  stockSymbol: '',
  stockName: '',
  quantity: 0,
  purchasePrice: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
};

interface HoldingWithPriceError extends InvestmentHolding {
  priceError?: string;
}

export default function InvestmentsPage() {
  const { data: holdings = [], isLoading } = useHoldings();
  const { data: closed = [] } = useClosedPositions();
  const addHolding = useAddHolding();
  const deleteHolding = useDeleteHolding();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [holdingsWithPrices, setHoldingsWithPrices] = useState<HoldingWithPriceError[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Fetch real-time prices for all holdings
  useEffect(() => {
    if (holdings.length === 0) {
      setHoldingsWithPrices([]);
      return;
    }

    setLoadingPrices(true);
    const fetchPrices = async () => {
      const updated = await Promise.all(
        holdings.map(async (holding) => {
          try {
            // Call the Netlify function with correct path
            const response = await fetch(`https://tracker-2026-app.netlify.app/.netlify/functions/stock-price?symbol=${holding.stockSymbol}`);
            if (response.ok) {
              const data = await response.json();
              return { ...holding, currentPrice: data.price };
            } else {
              console.warn(`Failed to fetch price for ${holding.stockSymbol}: ${response.status}`);
              return { ...holding, priceError: 'Failed to fetch price' };
            }
          } catch (err) {
            console.error(`Error fetching price for ${holding.stockSymbol}:`, err);
            return { ...holding, priceError: 'Error fetching price' };
          }
        })
      );
      setHoldingsWithPrices(updated);
      setLoadingPrices(false);
    };

    fetchPrices();
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

  const totalInvested = holdingsWithPrices.reduce((s, h) => s + h.quantity * h.purchasePrice, 0);
  const totalCurrentValue = holdingsWithPrices.reduce((s, h) => s + h.quantity * (h.currentPrice || h.purchasePrice), 0);
  const totalGain = totalCurrentValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Investments</h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Invested" value={formatINR(totalInvested)} color="#3b82f6" />
        <SummaryCard label="Current Value" value={formatINR(totalCurrentValue)} color="#8b5cf6" />
        <SummaryCard 
          label="Total Gain/Loss" 
          value={`${formatINR(totalGain)} (${formatPct(totalGainPct)})`} 
          color={totalGain >= 0 ? '#22c55e' : '#ef4444'} 
        />
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Add Holding</h3>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Symbol" value={form.stockSymbol} onChange={(e) => setForm({ ...form, stockSymbol: e.target.value.toUpperCase() })} required style={inputStyle} />
          <input placeholder="Stock Name" value={form.stockName} onChange={(e) => setForm({ ...form, stockName: e.target.value })} required style={inputStyle} />
          <input type="number" placeholder="Quantity" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required min={0.0001} step={0.0001} style={{ ...inputStyle, width: 120 }} />
          <input type="number" placeholder="Buy Price (₹)" value={form.purchasePrice || ''} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} required min={0.01} step={0.01} style={{ ...inputStyle, width: 140 }} />
          <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required style={inputStyle} />
          <button type="submit" style={btnStyle('#22c55e')}>Add</button>
        </form>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>
          Active Holdings{' '}
          {loadingPrices && <span style={{ fontSize: 12, color: '#94a3b8' }}>(updating prices…)</span>}
        </h3>
        {isLoading ? <p>Loading…</p> : holdingsWithPrices.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No holdings yet. Import from the Data Management page.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Instrument', 'Qty', 'Avg. Cost', 'LTP', 'Invested', 'Cur. Val', 'P&L', 'P&L %', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdingsWithPrices.map((h, idx) => {
                  const ltp = h.currentPrice || h.purchasePrice;
                  const invested = h.quantity * h.purchasePrice;
                  const curVal = h.quantity * ltp;
                  const pnl = curVal - invested;
                  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                  const isGain = pnl >= 0;

                  return (
                    <tr
                      key={h.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{h.stockSymbol}</td>
                      <td style={tdStyle}>{h.quantity}</td>
                      <td style={tdStyle}>{formatINR(h.purchasePrice)}</td>
                      <td style={tdStyle}>
                        {(h as HoldingWithPriceError).priceError ? (
                          <span style={{ color: '#ef4444', fontSize: 11 }}>—</span>
                        ) : (
                          formatINR(ltp)
                        )}
                      </td>
                      <td style={tdStyle}>{formatINR(invested)}</td>
                      <td style={tdStyle}>{formatINR(curVal)}</td>
                      <td style={{ ...tdStyle, color: isGain ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {formatINR(pnl)}
                      </td>
                      <td style={{ ...tdStyle, color: isGain ? '#16a34a' : '#dc2626' }}>
                        {formatPct(pnlPct)}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => deleteHolding.mutate(h.id)} style={smallBtn('#ef4444')}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
