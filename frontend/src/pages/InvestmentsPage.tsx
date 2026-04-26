import { useState, useEffect, useMemo } from 'react';
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

// ── Computed row (adds derived fields for sorting) ────────────────────────────
interface ComputedRow extends HoldingWithPriceError {
  ltp: number;
  invested: number;
  curVal: number;
  pnl: number;
  pnlPct: number;
}

type SortKey = 'stockSymbol' | 'quantity' | 'purchasePrice' | 'ltp' | 'invested' | 'curVal' | 'pnl' | 'pnlPct';
type SortDir = 'asc' | 'desc';

const COLUMNS: { label: string; key: SortKey | null; align: 'left' | 'right' | 'center' }[] = [
  { label: 'Instrument', key: 'stockSymbol',  align: 'left' },
  { label: 'Qty',        key: 'quantity',     align: 'right' },
  { label: 'Avg. Cost',  key: 'purchasePrice',align: 'right' },
  { label: 'LTP',        key: 'ltp',          align: 'right' },
  { label: 'Invested',   key: 'invested',     align: 'right' },
  { label: 'Cur. Val',   key: 'curVal',       align: 'right' },
  { label: 'P&L',        key: 'pnl',          align: 'right' },
  { label: 'P&L %',      key: 'pnlPct',       align: 'right' },
  { label: '',           key: null,           align: 'center' },
];

export default function InvestmentsPage() {
  const { data: holdings = [], isLoading } = useHoldings();
  const { data: closed = [] } = useClosedPositions();
  const addHolding = useAddHolding();
  const deleteHolding = useDeleteHolding();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [holdingsWithPrices, setHoldingsWithPrices] = useState<HoldingWithPriceError[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('stockSymbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Fetch live prices ───────────────────────────────────────────────────────
  useEffect(() => {
    if (holdings.length === 0) { setHoldingsWithPrices([]); return; }
    setLoadingPrices(true);
    const fetchPrices = async () => {
      const results = await Promise.all(
        holdings.map(async (holding) => {
          try {
            const res = await fetch(`/.netlify/functions/stock-price?symbol=${encodeURIComponent(holding.stockSymbol)}`);
            if (res.ok) {
              const data = await res.json();
              return { ...holding, currentPrice: data.price };
            }
            return { ...holding, priceError: 'unavailable' };
          } catch {
            return { ...holding, priceError: 'unavailable' };
          }
        })
      );
      setHoldingsWithPrices(results);
      setLoadingPrices(false);
    };
    fetchPrices();
  }, [holdings]);

  // ── Compute derived fields + sort ───────────────────────────────────────────
  const sortedRows = useMemo<ComputedRow[]>(() => {
    const computed: ComputedRow[] = holdingsWithPrices.map((h) => {
      const ltp = h.currentPrice || h.purchasePrice;
      const invested = h.quantity * h.purchasePrice;
      const curVal = h.quantity * ltp;
      const pnl = curVal - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      return { ...h, ltp, invested, curVal, pnl, pnlPct };
    });

    return [...computed].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av), bn = Number(bv);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }, [holdingsWithPrices, sortKey, sortDir]);

  const handleSort = (key: SortKey | null) => {
    if (!key) return;
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ── Summary totals ──────────────────────────────────────────────────────────
  const totalInvested    = sortedRows.reduce((s, h) => s + h.invested, 0);
  const totalCurrentValue = sortedRows.reduce((s, h) => s + h.curVal, 0);
  const totalGain        = totalCurrentValue - totalInvested;
  const totalGainPct     = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // ── Add holding ─────────────────────────────────────────────────────────────
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

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Investments</h2>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Invested"   value={formatINR(totalInvested)}    color="#3b82f6" />
        <SummaryCard label="Current Value"    value={formatINR(totalCurrentValue)} color="#8b5cf6" />
        <SummaryCard
          label="Total Gain/Loss"
          value={`${formatINR(totalGain)} (${formatPct(totalGainPct)})`}
          color={totalGain >= 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* ── Add Holding form ──────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Add Holding</h3>
        {error && <p style={{ color: '#dc2626', marginBottom: 8, fontSize: 13 }}>{error}</p>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Symbol</label>
            <input
              placeholder="e.g. RELIANCE"
              value={form.stockSymbol}
              onChange={(e) => setForm({ ...form, stockSymbol: e.target.value.toUpperCase(), stockName: e.target.value.toUpperCase() })}
              required
              style={inputStyle}
            />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Quantity</label>
            <input
              type="number"
              placeholder="e.g. 10"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
              min={0.0001}
              step={0.0001}
              style={{ ...inputStyle, width: 110 }}
            />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Avg. Cost (₹)</label>
            <input
              type="number"
              placeholder="e.g. 2450.50"
              value={form.purchasePrice || ''}
              onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
              required
              min={0.01}
              step={0.01}
              style={{ ...inputStyle, width: 140 }}
            />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Buy Date</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={addHolding.isPending} style={{ ...btnStyle('#22c55e'), alignSelf: 'flex-end', marginBottom: 1 }}>
            {addHolding.isPending ? 'Adding…' : '+ Add'}
          </button>
        </form>
      </div>

      {/* ── Active Holdings grid ──────────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>
          Active Holdings{' '}
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
            ({sortedRows.length} stocks)
          </span>
          {loadingPrices && (
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
              · updating prices…
            </span>
          )}
        </h3>

        {isLoading ? (
          <p style={{ color: '#94a3b8' }}>Loading…</p>
        ) : sortedRows.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No holdings yet. Import from the Data page or add one above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      onClick={() => handleSort(col.key)}
                      style={{
                        ...thStyle,
                        textAlign: col.align,
                        cursor: col.key ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        background: col.key === sortKey ? '#e2e8f0' : undefined,
                      }}
                    >
                      {col.label}
                      {col.key === sortKey && (
                        <span style={{ marginLeft: 4, fontSize: 10 }}>
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((h, idx) => {
                  const isGain = h.pnl >= 0;
                  return (
                    <tr
                      key={h.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                      }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{h.stockSymbol}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {Number(h.quantity).toLocaleString('en-IN')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatINR(h.purchasePrice)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {h.priceError ? (
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                        ) : (
                          formatINR(h.ltp)
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatINR(h.invested)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatINR(h.curVal)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: isGain ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {formatINR(h.pnl)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: isGain ? '#16a34a' : '#dc2626' }}>
                        {formatPct(h.pnlPct)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => deleteHolding.mutate(h.id)}
                          style={smallBtn('#ef4444')}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals row */}
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td style={{ ...tdStyle, textAlign: 'left',  fontWeight: 700 }}>Total</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} />
                  <td style={{ ...tdStyle, textAlign: 'right' }} />
                  <td style={{ ...tdStyle, textAlign: 'right' }} />
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{formatINR(totalInvested)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{formatINR(totalCurrentValue)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: totalGain >= 0 ? '#16a34a' : '#dc2626' }}>
                    {formatINR(totalGain)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: totalGain >= 0 ? '#16a34a' : '#dc2626' }}>
                    {formatPct(totalGainPct)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Closed Positions ──────────────────────────────────────────────── */}
      {closed.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Closed Positions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Symbol', 'Name', 'Buy Price'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
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

// ── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`, minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};
const fieldGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, minWidth: 130,
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
});
const smallBtn = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 4,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12,
});
const thStyle: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 600, color: '#475569',
};
const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: '#334155',
};
