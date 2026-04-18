import { useState } from 'react';
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

export default function InvestmentsPage() {
  const { data: holdings = [], isLoading } = useHoldings();
  const { data: closed = [] } = useClosedPositions();
  const addHolding = useAddHolding();
  const deleteHolding = useDeleteHolding();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

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

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Investments</h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Invested" value={formatINR(totalInvested)} color="#3b82f6" />
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
        <h3 style={{ marginBottom: 12 }}>Active Holdings</h3>
        {isLoading ? <p>Loading…</p> : holdings.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No holdings yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Symbol', 'Name', 'Qty', 'Buy Price', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}><strong>{h.stockSymbol}</strong></td>
                    <td style={tdStyle}>{h.stockName}</td>
                    <td style={tdStyle}>{h.quantity}</td>
                    <td style={tdStyle}>{formatINR(h.purchasePrice)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteHolding.mutate(h.id)} style={smallBtn('#ef4444')}>Delete</button>
                    </td>
                  </tr>
                ))}
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
