import { useState } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip,
} from 'recharts';
import {
  useExpenseEntries,
  useCategoryBreakdown,
  useAddExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '../api/expenses';
import type { ExpenseEntry } from '../types';
import { formatINR, formatMonth, currentMonth } from '../utils/format';

const CATEGORIES: ExpenseEntry['category'][] = [
  'Rent', 'EMI', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Other',
];
const PIE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const EMPTY: Omit<ExpenseEntry, 'id'> = {
  name: '',
  amount: 0,
  category: 'Other',
  type: 'Variable',
  date: new Date().toISOString().slice(0, 10),
  dueDate: undefined,
};

export default function ExpensesPage() {
  const month = currentMonth();
  const { data: entries = [], isLoading } = useExpenseEntries();
  const { data: breakdown = [] } = useCategoryBreakdown(month);
  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [form, setForm] = useState<Omit<ExpenseEntry, 'id'>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editId !== null) {
        await updateExpense.mutateAsync({ id: editId, ...form });
        setEditId(null);
      } else {
        await addExpense.mutateAsync(form);
      }
      setForm(EMPTY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving expense');
    }
  };

  const startEdit = (entry: ExpenseEntry) => {
    setEditId(entry.id);
    setForm({ name: entry.name, amount: entry.amount, category: entry.category, type: entry.type, date: entry.date, dueDate: entry.dueDate });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, color: '#1e293b', fontSize: 28, fontWeight: 700 }}>Expenses</h2>

      {/* Add/Edit Form */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600, color: '#334155' }}>
          {editId ? 'Edit Expense' : 'Add Expense'}
        </h3>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              placeholder="Expense name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Amount (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              required
              min={1}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseEntry['category'] })}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'Fixed' | 'Variable' })}
              style={inputStyle}
            >
              <option value="Fixed">Fixed</option>
              <option value="Variable">Variable</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Due Date (Day)</label>
            <input
              type="number"
              placeholder="e.g., 6"
              value={form.dueDate || ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value ? Number(e.target.value) : undefined })}
              min={1}
              max={31}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={btnStyle('#22c55e')}>
              {editId ? 'Update' : 'Add'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); }} style={btnStyle('#94a3b8')}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, color: '#334155' }}>
            Category Breakdown — {formatMonth(month)}
          </h3>
          <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
            <PieChart width={260} height={220}>
              <Pie data={breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={85}>
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v: number) => formatINR(v)} />
            </PieChart>
            <div style={{ flex: 1, minWidth: 280 }}>
              <table style={{ width: '100%', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ ...thStyle, paddingBottom: 12 }}>Category</th>
                    <th style={{ ...thStyle, paddingBottom: 12, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...thStyle, paddingBottom: 12, textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b) => (
                    <tr key={b.category} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...tdStyle, paddingTop: 10, paddingBottom: 10 }}>{b.category}</td>
                      <td style={{ ...tdStyle, paddingTop: 10, paddingBottom: 10, textAlign: 'right', fontWeight: 600 }}>{formatINR(b.amount)}</td>
                      <td style={{ ...tdStyle, paddingTop: 10, paddingBottom: 10, textAlign: 'right', color: '#64748b' }}>{b.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, color: '#334155' }}>All Expenses</h3>
        {isLoading ? (
          <p style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>No expenses yet. Add your first expense above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Name', 'Amount', 'Category', 'Type', 'Date', 'Due Date', 'Actions'].map((h) => (
                    <th key={h} style={{ ...thStyle, padding: '12px 16px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(ev) => ev.currentTarget.style.background = '#f8fafc'} onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, padding: '14px 16px', fontWeight: 500 }}>{e.name}</td>
                    <td style={{ ...tdStyle, padding: '14px 16px', fontWeight: 600 }}>{formatINR(e.amount)}</td>
                    <td style={{ ...tdStyle, padding: '14px 16px' }}>
                      <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{e.category}</span>
                    </td>
                    <td style={{ ...tdStyle, padding: '14px 16px' }}>{e.type}</td>
                    <td style={{ ...tdStyle, padding: '14px 16px', color: '#64748b' }}>{e.date}</td>
                    <td style={{ ...tdStyle, padding: '14px 16px', color: '#64748b' }}>{e.dueDate ? `${e.dueDate}th` : '-'}</td>
                    <td style={{ ...tdStyle, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(e)} style={smallBtn('#3b82f6')}>Edit</button>
                        <button onClick={() => deleteExpense.mutate(e.id)} style={smallBtn('#ef4444')}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', transition: 'border-color 0.2s' };
const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'opacity 0.2s' });
const smallBtn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'opacity 0.2s' });
const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', color: '#334155' };
