import { useState } from 'react';
import { useLoans, useAddLoan, useUpdateLoan, useDeleteLoan } from '../api/loans';
import type { Loan } from '../types';
import { formatINR } from '../utils/format';

const LOAN_TYPES = [
  'Personal Loan',
  'Car Loan',
  'Home Loan',
  'Education Loan',
  'Credit Card',
  'Other',
] as const;

type LoanType = typeof LOAN_TYPES[number];

const LOAN_TYPE_COLORS: Record<LoanType, string> = {
  'Personal Loan': '#8b5cf6',
  'Car Loan':      '#f59e0b',
  'Home Loan':     '#3b82f6',
  'Education Loan':'#06b6d4',
  'Credit Card':   '#ef4444',
  'Other':         '#64748b',
};

const LOAN_TYPE_ICONS: Record<LoanType, string> = {
  'Personal Loan': '👤',
  'Car Loan':      '🚗',
  'Home Loan':     '🏠',
  'Education Loan':'🎓',
  'Credit Card':   '💳',
  'Other':         '📋',
};

const EMPTY = {
  loanName: '',
  loanType: 'Personal Loan' as LoanType,
  originalPrincipal: 0,
  outstandingPrincipal: 0,
  emiAmount: 0,
  interestRatePa: 0,
  emiStartDate: new Date().toISOString().slice(0, 10),
  isClosed: false,
};

export default function LoansPage() {
  const { data: loans = [], isLoading } = useLoans();
  const addLoan = useAddLoan();
  const updateLoan = useUpdateLoan();
  const deleteLoan = useDeleteLoan();

  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const activeLoans = loans.filter((l) => !l.isClosed);
  const closedLoans = loans.filter((l) => l.isClosed);

  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstandingPrincipal, 0);
  const totalEmi = activeLoans.reduce((s, l) => s + l.emiAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editId !== null) {
        await updateLoan.mutateAsync({ id: editId, ...form });
        setEditId(null);
      } else {
        await addLoan.mutateAsync(form as Omit<Loan, 'id' | 'remainingInstalments' | 'estimatedClosureDate'>);
      }
      setForm(EMPTY);
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving loan');
    }
  };

  const startEdit = (loan: Loan) => {
    setEditId(loan.id);
    setForm({
      loanName: loan.loanName,
      loanType: (loan as any).loanType || 'Personal Loan',
      originalPrincipal: loan.originalPrincipal,
      outstandingPrincipal: loan.outstandingPrincipal,
      emiAmount: loan.emiAmount,
      interestRatePa: loan.interestRatePa,
      emiStartDate: loan.emiStartDate,
      isClosed: loan.isClosed,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkClosed = async (loan: Loan) => {
    if (!window.confirm(`Mark "${loan.loanName}" as closed?`)) return;
    await updateLoan.mutateAsync({ id: loan.id, isClosed: true, outstandingPrincipal: 0 });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Loans</h2>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <SummaryCard label="Total Outstanding" value={formatINR(totalOutstanding)} color="#ef4444" />
        <SummaryCard label="Total Monthly EMI" value={formatINR(totalEmi)} color="#f97316" />
        <SummaryCard label="Active Loans" value={`${activeLoans.length}`} color="#3b82f6" />
      </div>

      {/* ── Add / Edit form ────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? 16 : 0 }}>
          <h3 style={{ margin: 0 }}>{editId ? 'Edit Loan' : 'Add New Loan'}</h3>
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY); setError(''); }}
            style={btnStyle(showForm ? '#94a3b8' : '#3b82f6')}
          >
            {showForm ? '✕ Cancel' : '+ Add Loan'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit}>
            {error && <p style={{ color: '#dc2626', marginBottom: 8, fontSize: 13 }}>{error}</p>}

            {/* Loan type selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Loan Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {LOAN_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, loanType: t })}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `2px solid ${form.loanType === t ? LOAN_TYPE_COLORS[t] : '#e2e8f0'}`,
                      background: form.loanType === t ? LOAN_TYPE_COLORS[t] : '#fff',
                      color: form.loanType === t ? '#fff' : '#475569',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: form.loanType === t ? 600 : 400,
                    }}
                  >
                    {LOAN_TYPE_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Loan Name / Bank</label>
                <input
                  placeholder="e.g. HDFC Car Loan"
                  value={form.loanName}
                  onChange={(e) => setForm({ ...form, loanName: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Original Principal (₹)</label>
                <input
                  type="number" placeholder="e.g. 500000"
                  value={form.originalPrincipal || ''}
                  onChange={(e) => setForm({ ...form, originalPrincipal: Number(e.target.value) })}
                  required min={1} style={inputStyle}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Outstanding Balance (₹)</label>
                <input
                  type="number" placeholder="e.g. 350000"
                  value={form.outstandingPrincipal || ''}
                  onChange={(e) => setForm({ ...form, outstandingPrincipal: Number(e.target.value) })}
                  required min={0} style={inputStyle}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Monthly EMI (₹)</label>
                <input
                  type="number" placeholder="e.g. 12000"
                  value={form.emiAmount || ''}
                  onChange={(e) => setForm({ ...form, emiAmount: Number(e.target.value) })}
                  required min={1} style={inputStyle}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Interest Rate % p.a.</label>
                <input
                  type="number" placeholder="e.g. 9.5"
                  value={form.interestRatePa || ''}
                  onChange={(e) => setForm({ ...form, interestRatePa: Number(e.target.value) })}
                  required min={0} step={0.01} style={inputStyle}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>EMI Start Date</label>
                <input
                  type="date" value={form.emiStartDate}
                  onChange={(e) => setForm({ ...form, emiStartDate: e.target.value })}
                  required style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button type="submit" style={btnStyle('#22c55e')}>
                {editId ? 'Update Loan' : 'Save Loan'}
              </button>
              {editId && (
                <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); setShowForm(false); }} style={btnStyle('#94a3b8')}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ── Active Loans ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <p style={{ marginTop: 16, color: '#94a3b8' }}>Loading…</p>
      ) : activeLoans.length === 0 ? (
        <div style={{ ...cardStyle, marginTop: 16, textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
          No active loans. Click "+ Add Loan" to add one.
        </div>
      ) : (
        <>
          <h3 style={{ marginTop: 24, marginBottom: 12, color: '#1e293b' }}>Active Loans</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {activeLoans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onEdit={() => startEdit(loan)}
                onDelete={() => deleteLoan.mutate(loan.id)}
                onClose={() => handleMarkClosed(loan)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Closed Loans ──────────────────────────────────────────────────── */}
      {closedLoans.length > 0 && (
        <>
          <h3 style={{ marginTop: 28, marginBottom: 12, color: '#64748b' }}>Closed Loans</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {closedLoans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onEdit={() => startEdit(loan)}
                onDelete={() => deleteLoan.mutate(loan.id)}
                onClose={() => {}}
                closed
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Loan Card ─────────────────────────────────────────────────────────────────
function LoanCard({
  loan, onEdit, onDelete, onClose, closed = false,
}: {
  loan: Loan;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  closed?: boolean;
}) {
  const loanType = ((loan as any).loanType || 'Other') as LoanType;
  const color = LOAN_TYPE_COLORS[loanType] || '#64748b';
  const icon  = LOAN_TYPE_ICONS[loanType]  || '📋';

  const repaidPct = loan.originalPrincipal > 0
    ? ((loan.originalPrincipal - loan.outstandingPrincipal) / loan.originalPrincipal) * 100
    : 0;

  // Estimate remaining months
  const remainingMonths = loan.emiAmount > 0
    ? Math.ceil(loan.outstandingPrincipal / loan.emiAmount)
    : 0;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderTop: `4px solid ${closed ? '#94a3b8' : color}`,
      opacity: closed ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: closed ? '#f1f5f9' : `${color}20`,
              color: closed ? '#94a3b8' : color,
              borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600,
            }}>
              {icon} {loanType}
            </span>
            {closed && <span style={{ background: '#22c55e', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>CLOSED</span>}
          </div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>{loan.loanName}</h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!closed && <button onClick={onEdit} style={smallBtn('#3b82f6')}>Edit</button>}
          {!closed && <button onClick={onClose} style={smallBtn('#22c55e')}>Close</button>}
          <button onClick={onDelete} style={smallBtn('#ef4444')}>Delete</button>
        </div>
      </div>

      {/* Key figures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Stat label="Outstanding" value={formatINR(loan.outstandingPrincipal)} color={color} />
        <Stat label="Monthly EMI" value={formatINR(loan.emiAmount)} color="#f97316" />
        <Stat label="Interest Rate" value={`${loan.interestRatePa}% p.a.`} color="#8b5cf6" />
        <Stat label="Est. Remaining" value={closed ? 'Closed' : `${remainingMonths} months`} color="#64748b" />
      </div>

      {/* Progress bar */}
      {!closed && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
            <span>Repaid {repaidPct.toFixed(1)}%</span>
            <span>{formatINR(loan.originalPrincipal - loan.outstandingPrincipal)} of {formatINR(loan.originalPrincipal)}</span>
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6 }}>
            <div style={{ background: color, width: `${Math.min(repaidPct, 100)}%`, height: 6, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginTop: 16 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, width: '100%', boxSizing: 'border-box' };
const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 });
const smallBtn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 });
const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
