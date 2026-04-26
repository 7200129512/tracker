import { useState } from 'react';
import {
  useSavingsTransactions, useSavingsBalance,
  useAddTransaction, useUpdateTransaction, useDeleteTransaction,
} from '../api/savings';
import { useAuth } from '../context/AuthContext';
import type { SavingsTransaction } from '../types';
import { formatINR } from '../utils/format';

const EMPTY: Omit<SavingsTransaction, 'id'> = {
  type: 'Deposit',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: '',
};

export default function SavingsPage() {
  const { user } = useAuth();
  const { data: transactions = [], isLoading } = useSavingsTransactions();
  const { data: balanceData } = useSavingsBalance();
  const addTx = useAddTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  const [form, setForm] = useState<Omit<SavingsTransaction, 'id'>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const { data: rangeData } = useSavingsBalance(rangeFrom || undefined, rangeTo || undefined);

  // Bank balance from Gmail
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [bankBalanceDate, setBankBalanceDate] = useState('');
  const [bankBalanceSnippet, setBankBalanceSnippet] = useState('');
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const handleFetchBankBalance = async () => {
    if (!user?.id) return;
    setFetchingBalance(true);
    setFetchError('');
    setBankBalance(null);

    try {
      const res = await fetch('/.netlify/functions/bank-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Failed to fetch balance';
        const debug = data.debug ? ` (${data.debug})` : '';
        setFetchError(msg + debug);
        return;
      }

      setBankBalance(data.balance);
      setBankBalanceDate(data.emailDate ? new Date(data.emailDate).toLocaleString('en-IN') : '');
      setBankBalanceSnippet(data.snippet || '');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setFetchingBalance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editId !== null) {
        await updateTx.mutateAsync({ id: editId, ...form });
        setEditId(null);
      } else {
        await addTx.mutateAsync(form);
      }
      setForm(EMPTY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving transaction');
    }
  };

  const startEdit = (tx: SavingsTransaction) => {
    setEditId(tx.id);
    setForm({ type: tx.type, amount: tx.amount, date: tx.date, description: tx.description });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Savings</h2>

      {/* ── Balance cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #0ea5e9', minWidth: 200 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tracked Balance</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0ea5e9' }}>
            {formatINR(balanceData?.balance ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From manual entries below</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #22c55e', minWidth: 160 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Deposited</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
            {formatINR(balanceData?.totalDeposited ?? 0)}
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444', minWidth: 160 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Withdrawn</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>
            {formatINR(balanceData?.totalWithdrawn ?? 0)}
          </div>
        </div>
      </div>

      {/* ── Live Bank Balance from Gmail ───────────────────────────────────── */}
      <div style={{ ...cardStyle, marginBottom: 16, borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              🏦 Live Bank Balance (from Gmail)
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Reads your latest HDFC/SBI/ICICI bank email and extracts the available balance.
              Requires Gmail to be connected (Daily Expense page).
            </div>
          </div>
          <button
            onClick={handleFetchBankBalance}
            disabled={fetchingBalance}
            style={btnStyle('#8b5cf6')}
          >
            {fetchingBalance ? '⏳ Reading emails…' : '🔄 Fetch Bank Balance'}
          </button>
        </div>

        {fetchError && (
          <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
            ❌ {fetchError}
          </div>
        )}

        {bankBalance !== null && (
          <div style={{ marginTop: 12, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 4 }}>
              Available Balance (as of {bankBalanceDate})
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#7c3aed' }}>
              {formatINR(bankBalance)}
            </div>
            {bankBalanceSnippet && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
                From email: "{bankBalanceSnippet}…"
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
              Want to save this as your current balance?{' '}
              <button
                onClick={() => {
                  setForm({ type: 'Deposit', amount: bankBalance, date: new Date().toISOString().slice(0, 10), description: 'Bank balance sync from Gmail' });
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 600, fontSize: 12, textDecoration: 'underline' }}
              >
                Add as deposit entry ↓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit form ────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>{editId ? 'Edit Transaction' : 'Add Transaction'}</h3>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as 'Deposit' | 'Withdrawal' })}
            style={inputStyle}
          >
            <option value="Deposit">Deposit</option>
            <option value="Withdrawal">Withdrawal</option>
          </select>
          <input
            type="number"
            placeholder="Amount (₹)"
            value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            required
            min={1}
            style={{ ...inputStyle, width: 140 }}
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            style={inputStyle}
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ ...inputStyle, minWidth: 200 }}
          />
          <button type="submit" style={btnStyle(form.type === 'Deposit' ? '#22c55e' : '#ef4444')}>
            {editId ? 'Update' : form.type === 'Deposit' ? '+ Deposit' : '- Withdraw'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); }} style={btnStyle('#94a3b8')}>
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* ── Date range summary ─────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Date Range Summary</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} style={inputStyle} />
          <span>to</span>
          <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} style={inputStyle} />
          {rangeData && (
            <span style={{ fontSize: 14, color: '#475569' }}>
              Deposited: <strong>{formatINR(rangeData.totalDeposited)}</strong> | Withdrawn: <strong>{formatINR(rangeData.totalWithdrawn)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ── Transaction history ────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Transaction History</h3>
        {isLoading ? (
          <p>Loading…</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No transactions yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Date', 'Type', 'Amount', 'Description', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>{tx.date}</td>
                  <td style={{ ...tdStyle, color: tx.type === 'Deposit' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {tx.type}
                  </td>
                  <td style={tdStyle}>{formatINR(tx.amount)}</td>
                  <td style={tdStyle}>{tx.description}</td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(tx)} style={smallBtn('#3b82f6')}>Edit</button>
                    <button onClick={() => deleteTx.mutate(tx.id)} style={smallBtn('#ef4444')}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, minWidth: 130,
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
});
const smallBtn = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 4,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 4,
});
const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569',
};
const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: '#334155',
};
