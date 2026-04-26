import { useState } from 'react';
import {
  useIncomeEntries,
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

type TabType = 'salary' | 'pf' | 'variable';

export default function IncomePage() {
  const { data: entries = [], isLoading } = useIncomeEntries();
  const addIncome = useAddIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [form, setForm] = useState<Omit<IncomeEntry, 'id'>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('salary');

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
  const getIncomeType = (sourceName: string | undefined): string => {
    if (!sourceName) return 'other';
    const lower = sourceName.toLowerCase();
    if (lower.includes('salary') || lower.includes('base')) return 'base';
    if (lower.includes('variable')) return 'variable';
    if (lower.includes('pf') || lower.includes('provident')) return 'pf';
    return 'other';
  };

  // Filter entries by type
  const salaryEntries = entries.filter(e => getIncomeType(e.sourceName) === 'base' && e.frequency === 'monthly');
  const pfEntries = entries.filter(e => getIncomeType(e.sourceName) === 'pf' && e.frequency === 'monthly');
  const variableEntries = entries.filter(e => getIncomeType(e.sourceName) === 'variable' && e.frequency === 'annual');

  const baseIncome = salaryEntries.reduce((sum, e) => sum + e.amount, 0);
  const pfIncome = pfEntries.reduce((sum, e) => sum + e.amount, 0);
  const variableIncome = variableEntries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Income</h2>

      {/* Income Summary Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCard label="Base Salary" value={formatINR(baseIncome)} color="#3b82f6" />
        <SummaryCard label="Monthly PF" value={formatINR(pfIncome)} color="#8b5cf6" />
        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #f59e0b', minWidth: 200 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Annual Variable Pay</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{formatINR(variableIncome)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        <TabButton
          label="💰 Salary"
          active={activeTab === 'salary'}
          onClick={() => setActiveTab('salary')}
        />
        <TabButton
          label="🏦 PF (Monthly)"
          active={activeTab === 'pf'}
          onClick={() => setActiveTab('pf')}
        />
        <TabButton
          label="📈 Variable Pay"
          active={activeTab === 'variable'}
          onClick={() => setActiveTab('variable')}
        />
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>
          {activeTab === 'salary' && 'Add Base Salary'}
          {activeTab === 'pf' && 'Add Monthly PF'}
          {activeTab === 'variable' && 'Add Annual Variable Pay'}
        </h3>
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

      {/* List - Salary Tab */}
      {activeTab === 'salary' && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Base Salary Entries</h3>
          {isLoading ? (
            <p>Loading…</p>
          ) : salaryEntries.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No salary entries yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Source', 'Amount', 'Frequency', 'Effective Date', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salaryEntries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}>{e.sourceName}</td>
                    <td style={tdStyle}>{formatINR(e.amount)}</td>
                    <td style={tdStyle}>{e.frequency}</td>
                    <td style={tdStyle}>{e.effectiveDate}</td>
                    <td style={tdStyle}>
                      <button onClick={() => startEdit(e)} style={smallBtn('#3b82f6')}>Edit</button>
                      <button onClick={() => deleteIncome.mutate(e.id)} style={smallBtn('#ef4444')}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* List - PF Tab */}
      {activeTab === 'pf' && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Monthly PF Entries</h3>
          {isLoading ? (
            <p>Loading…</p>
          ) : pfEntries.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No PF entries yet. Go to Settings to set up automatic monthly PF.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Month', 'Amount', 'Frequency', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pfEntries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}>{formatMonth(e.effectiveDate)}</td>
                    <td style={tdStyle}>{formatINR(e.amount)}</td>
                    <td style={tdStyle}>{e.frequency}</td>
                    <td style={tdStyle}>
                      <button onClick={() => startEdit(e)} style={smallBtn('#3b82f6')}>Edit</button>
                      <button onClick={() => deleteIncome.mutate(e.id)} style={smallBtn('#ef4444')}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* List - Variable Pay Tab */}
      {activeTab === 'variable' && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Annual Variable Pay Entries</h3>
          {isLoading ? (
            <p>Loading…</p>
          ) : variableEntries.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No variable pay entries yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Source', 'Amount', 'Frequency', 'Effective Date', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variableEntries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}>{e.sourceName}</td>
                    <td style={tdStyle}>{formatINR(e.amount)}</td>
                    <td style={tdStyle}>{e.frequency}</td>
                    <td style={tdStyle}>{e.effectiveDate}</td>
                    <td style={tdStyle}>
                      <button onClick={() => startEdit(e)} style={smallBtn('#3b82f6')}>Edit</button>
                      <button onClick={() => deleteIncome.mutate(e.id)} style={smallBtn('#ef4444')}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: active ? '#3b82f6' : 'transparent',
        color: active ? '#fff' : '#64748b',
        border: 'none',
        borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`, minWidth: 200 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
};

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '10px 16px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
});

const smallBtn = (color: string): React.CSSProperties => ({
  padding: '4px 8px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
  marginRight: 4,
});

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 13,
  color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 13,
};
