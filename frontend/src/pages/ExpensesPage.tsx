import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  useExpenseEntries,
  useMonthlySummary,
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
  const { data: summary = [] } = useMonthlySummary();
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
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Expenses</h2>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>{editId ? 'Edit Expense' : 'Add Expense'}</h3>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseEntry['category'] })}
            style={inputStyle}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as 'Fixed' | 'Variable' })}
            style={inputStyle}
          >
            <option value="Fixed">Fixed</option>
            <option value="Variable">Variable</option>
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Due Date (day of month, e.g., 6)"
            value={form.dueDate || ''}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value ? Number(e.target.value) : undefined })}
            min={1}
            max={31}
            style={{ ...inputStyle, width: 160 }}
          />
          <button type="submit" style={btnStyle('#ef4444')}>
            {editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); }} style={btnStyle('#94a3b8')}>
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Category Breakdown — {formatMonth(month)}</h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <PieChart width={240} height={200}>
              <Pie data={breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v: number) => formatINR(v)} />
            </PieChart>
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>%</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={b.category}>
                    <td style={tdStyle}>{b.category}</td>
                    <td style={tdStyle}>{formatINR(b.amount)}</td>
                    <td style={tdStyle}>{b.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>All Expenses</h3>
        {isLoading ? (
          <p>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No expenses yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Name', 'Amount', 'Category', 'Type', 'Date', 'Due Date', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>{e.name}</td>
                  <td style={tdStyle}>{formatINR(e.amount)}</td>
                  <td style={tdStyle}>{e.category}</td>
                  <td style={tdStyle}>{e.type}</td>
                  <td style={tdStyle}>{e.date}</td>
                  <td style={tdStyle}>{e.dueDate ? `${e.dueDate}th` : '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(e)} style={smallBtn('#3b82f6')}>Edit</button>
                    <button onClick={() => deleteExpense.mutate(e.id)} style={smallBtn('#ef4444')}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Chart */}
      {summary.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>12-Month Expense History</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.map((d) => ({ ...d, month: formatMonth(d.month) }))}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, minWidth: 140 };
const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14 });
const smallBtn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 4 });
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: '#334155' };
