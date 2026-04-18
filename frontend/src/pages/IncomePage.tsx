import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  useIncomeEntries,
  useMonthlyIncomeSummary,
  useAddIncome,
  useUpdateIncome,
  useDeleteIncome,
} from '../api/income';
import type { IncomeEntry } from '../types';
import { formatINR, formatMonth } from '../utils/format';

const EMPTY: Omit<IncomeEntry, 'id'> = {
  sourceName: '',
  amount: 0,
  frequency: 'monthly',
  effectiveDate: new Date().toISOString().slice(0, 10),
  incomeType: 'other',
};

export default function IncomePage() {
  const { data: entries = [], isLoading } = useIncomeEntries();
  const { data: summary = [] } = useMonthlyIncomeSummary();
  const addIncome = useAddIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [form, setForm] = useState<Omit<IncomeEntry, 'id'>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editId !== null) {
        await updateIncome.mutateAsync({ id: editId, ...form });
        setEditId(null);
      } else {
        await addIncome.mutateAsync(form);
      }
      setForm(EMPTY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving income');
    }
  };

  const startEdit = (entry: IncomeEntry) => {
    setEditId(entry.id);
    setForm({
      sourceName: entry.sourceName,
      amount: entry.amount,
      frequency: entry.frequency,
      effectiveDate: entry.effectiveDate,
      incomeType: entry.incomeType || 'other',
    });
  };

  // Calculate income breakdown based on source name
  const getIncomeType = (sourceName: string): string => {
    if (sourceName.toLowerCase().includes('salary')) return 'base';
    if (sourceName.toLowerCase().includes('variable')) return 'variable';
    if (sourceName.toLowerCase().includes('pf')) return 'pf';
    return 'other';
  };

  const baseIncome = entries.find(e => getIncomeType(e.sourceName) === 'base')?.amount || 0;
  const variableIncome = entries.find(e => getIncomeType(e.sourceName) === 'variable')?.amount || 0;
  const pfIncome = entries.find(e => getIncomeType(e.sourceName) === 'pf')?.amount || 0;
  const otherIncome = entries.filter(e => !['base', 'variable', 'pf'].includes(getIncomeType(e.sourceName))).reduce((s, e) => s + e.amount, 0);
  const totalMonthly = baseIncome + otherIncome; // PF is NOT added to monthly income

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Income</h2>

      {/* Income Summary Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Base Salary" value={formatINR(baseIncome)} color="#3b82f6" />
        <SummaryCard label="Monthly PF" value={formatINR(pfIncome)} color="#8b5cf6" />
        <SummaryCard label="Other Monthly" value={formatINR(otherIncome)} color="#22c55e" />
        <SummaryCard label="Total Monthly" value={formatINR(totalMonthly)} color="#1e293b" />
        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #f59e0b', minWidth: 200 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Annual Variable Pay</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{formatINR(variableIncome)}</div>
        </div>
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>{editId ? 'Edit Income' : 'Add Income'}</h3>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Source name"
            value={form.sourceName}
            onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
            required
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Amount (₹)"
            value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            required
            min={1}
            style={{ ...inputStyle, width: 140 }}
          />
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value as IncomeEntry['frequency'] })}
            style={inputStyle}
          >
            <option value="monthly">Monthly</option>
            <option value="one-time">One-time</option>
            <option value="annual">Annual</option>
          </select>
          <input
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
            required
            style={inputStyle}
          />
          <button type="submit" style={btnStyle('#22c55e')}>
            {editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setForm(EMPTY); }}
              style={btnStyle('#94a3b8')}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* List */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Income Entries</h3>
        {isLoading ? (
          <p>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No income entries yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Source', 'Type', 'Amount', 'Frequency', 'Effective Date', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const type = getIncomeType(e.sourceName);
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}>{e.sourceName}</td>
                    <td style={tdStyle}><span style={{ background: getTypeColor(type), color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{type}</span></td>
                    <td style={tdStyle}>{formatINR(e.amount)}</td>
                    <td style={tdStyle}>{e.frequency}</td>
                    <td style={tdStyle}>{e.effectiveDate}</td>
                    <td style={tdStyle}>
                      <button onClick={() => startEdit(e)} style={smallBtn('#3b82f6')}>Edit</button>
                      <button
                        onClick={() => deleteIncome.mutate(e.id)}
                        style={smallBtn('#ef4444')}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Chart */}
      {summary.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>12-Month Income History</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.map((d) => ({ ...d, month: formatMonth(d.month) }))}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

function getTypeColor(type: string): string {
  switch (type) {
    case 'base': return '#3b82f6';
    case 'variable': return '#f59e0b';
    case 'pf': return '#8b5cf6';
    default: return '#64748b';
  }
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};
const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  minWidth: 160,
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
});
const smallBtn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 12,
  marginRight: 4,
});
const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
};
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: '#334155' };
