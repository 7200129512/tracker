import { useState } from 'react';
import {
  useLoans, useAddLoan, useUpdateLoan, useDeleteLoan,
  useRecordEmiPayment, useAmortisationSchedule,
} from '../api/loans';
import type { Loan } from '../types';
import { formatINR, currentMonth } from '../utils/format';

const EMPTY_LOAN = {
  loanName: '',
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
  const recordEmi = useRecordEmiPayment();

  const [form, setForm] = useState(EMPTY_LOAN);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);
  const [emiMonth, setEmiMonth] = useState(currentMonth());
  const [error, setError] = useState('');

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
      setForm(EMPTY_LOAN);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving loan');
    }
  };

  const startEdit = (loan: Loan) => {
    setEditId(loan.id);
    setForm({
      loanName: loan.loanName,
      originalPrincipal: loan.originalPrincipal,
      outstandingPrincipal: loan.outstandingPrincipal,
      emiAmount: loan.emiAmount,
      interestRatePa: loan.interestRatePa,
      emiStartDate: loan.emiStartDate,
      isClosed: loan.isClosed,
    });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Loans</h2>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>{editId ? 'Edit Loan' : 'Add Loan'}</h3>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Loan name" value={form.loanName} onChange={(e) => setForm({ ...form, loanName: e.target.value })} required style={inputStyle} />
          <input type="number" placeholder="Original Principal (₹)" value={form.originalPrincipal || ''} onChange={(e) => setForm({ ...form, originalPrincipal: Number(e.target.value) })} required min={1} style={{ ...inputStyle, width: 180 }} />
          <input type="number" placeholder="Outstanding (₹)" value={form.outstandingPrincipal || ''} onChange={(e) => setForm({ ...form, outstandingPrincipal: Number(e.target.value) })} required min={0} style={{ ...inputStyle, width: 160 }} />
          <input type="number" placeholder="EMI (₹)" value={form.emiAmount || ''} onChange={(e) => setForm({ ...form, emiAmount: Number(e.target.value) })} required min={1} style={{ ...inputStyle, width: 130 }} />
          <input type="number" placeholder="Interest Rate % p.a." value={form.interestRatePa || ''} onChange={(e) => setForm({ ...form, interestRatePa: Number(e.target.value) })} required min={0} step={0.01} style={{ ...inputStyle, width: 160 }} />
          <input type="date" value={form.emiStartDate} onChange={(e) => setForm({ ...form, emiStartDate: e.target.value })} required style={inputStyle} />
          <button type="submit" style={btnStyle('#3b82f6')}>{editId ? 'Update' : 'Add'}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_LOAN); }} style={btnStyle('#94a3b8')}>Cancel</button>}
        </form>
      </div>

      {isLoading ? <p style={{ marginTop: 16 }}>Loading…</p> : (
        loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            onEdit={() => startEdit(loan)}
            onDelete={() => deleteLoan.mutate(loan.id)}
            expanded={expandedLoan === loan.id}
            onToggle={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
            emiMonth={emiMonth}
            setEmiMonth={setEmiMonth}
            onRecordEmi={() => recordEmi.mutate({ loanId: loan.id, paymentMonth: emiMonth })}
          />
        ))
      )}
    </div>
  );
}

function LoanCard({
  loan, onEdit, onDelete, expanded, onToggle, emiMonth, setEmiMonth, onRecordEmi,
}: {
  loan: Loan;
  onEdit: () => void;
  onDelete: () => void;
  expanded: boolean;
  onToggle: () => void;
  emiMonth: string;
  setEmiMonth: (m: string) => void;
  onRecordEmi: () => void;
}) {
  const { data: schedule = [] } = useAmortisationSchedule(expanded ? loan.id : -1);
  const repaidPct = loan.originalPrincipal > 0
    ? ((loan.originalPrincipal - loan.outstandingPrincipal) / loan.originalPrincipal) * 100
    : 0;

  return (
    <div style={{ ...cardStyle, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>
            {loan.loanName}
            {loan.isClosed && <span style={{ marginLeft: 8, fontSize: 12, background: '#22c55e', color: '#fff', borderRadius: 4, padding: '2px 8px' }}>CLOSED</span>}
            {loan.emiWarning && <span style={{ marginLeft: 8, fontSize: 12, background: '#ef4444', color: '#fff', borderRadius: 4, padding: '2px 8px' }}>⚠️ EMI below interest</span>}
          </h3>
          <p style={{ color: '#64748b', margin: '4px 0', fontSize: 14 }}>
            Outstanding: <strong>{formatINR(loan.outstandingPrincipal)}</strong> | EMI: {formatINR(loan.emiAmount)} | Rate: {loan.interestRatePa}% p.a.
          </p>
          <p style={{ color: '#64748b', margin: '4px 0', fontSize: 14 }}>
            Remaining instalments: {loan.remainingInstalments} | Closure: {loan.estimatedClosureDate}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={smallBtn('#3b82f6')}>Edit</button>
          <button onClick={onDelete} style={smallBtn('#ef4444')}>Delete</button>
          <button onClick={onToggle} style={smallBtn('#8b5cf6')}>{expanded ? 'Hide' : 'Schedule'}</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Repaid: {repaidPct.toFixed(1)}%
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8 }}>
          <div style={{ background: '#22c55e', width: `${Math.min(repaidPct, 100)}%`, height: 8, borderRadius: 4 }} />
        </div>
      </div>

      {/* Record EMI */}
      {!loan.isClosed && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#475569' }}>Record EMI for:</span>
          <input
            type="month"
            value={emiMonth}
            onChange={(e) => setEmiMonth(e.target.value)}
            style={{ ...inputStyle, width: 160 }}
          />
          <button onClick={onRecordEmi} style={btnStyle('#22c55e')}>Record Payment</button>
        </div>
      )}

      {/* Amortisation schedule */}
      {expanded && schedule.length > 0 && (
        <div style={{ marginTop: 16, maxHeight: 300, overflowY: 'auto' }}>
          <h4 style={{ marginBottom: 8 }}>Amortisation Schedule</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Date', 'Principal', 'Interest', 'Balance'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>{row.paymentDate}</td>
                  <td style={tdStyle}>{formatINR(row.principalComponent)}</td>
                  <td style={tdStyle}>{formatINR(row.interestComponent)}</td>
                  <td style={tdStyle}>{formatINR(row.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, minWidth: 130 };
const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14 });
const smallBtn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 });
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: '#334155' };
