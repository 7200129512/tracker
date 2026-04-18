import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useDashboardSummary, useCashFlow, useDashboardAlerts } from '../api/dashboard';
import { formatINR, formatPct, currentMonth, formatMonth } from '../utils/format';

export default function DashboardPage() {
  const month = currentMonth();
  const { data: summary, isLoading } = useDashboardSummary(month);
  const { data: cashflow } = useCashFlow();
  const { data: alerts } = useDashboardAlerts(month);

  if (isLoading) return <p>Loading dashboard…</p>;

  const surplus = summary?.monthlySurplus ?? 0;

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Dashboard — {formatMonth(month)}</h2>

      {/* Alerts */}
      {alerts && (
        <div style={{ marginBottom: 16 }}>
          {alerts.budgetAlert && (
            <div style={alertStyle('orange')}>
              ⚠️ Budget Alert: You've spent more than 90% of your income this month.
            </div>
          )}
          {alerts.lowSurplusAlert && (
            <div style={alertStyle('red')}>
              🔴 Low Surplus: Monthly surplus is below ₹5,000.
            </div>
          )}
          {alerts.emiReminder && (
            <div style={alertStyle('blue')}>
              🔔 EMI Reminder: {alerts.emiReminderLoanName || 'A loan'} payment is due within 5 days.
            </div>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="Monthly Income" value={formatINR(summary?.totalIncome ?? 0)} color="#22c55e" />
        <Card label="Monthly PF" value={formatINR(summary?.pfAmount ?? 0)} color="#8b5cf6" />
        <Card label="Monthly Expenses" value={formatINR(summary?.totalExpenses ?? 0)} color="#ef4444" />
        <Card
          label="Monthly Surplus"
          value={formatINR(surplus)}
          color={surplus < 0 ? '#ef4444' : '#3b82f6'}
          highlight={surplus < 0}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="Savings Balance" value={formatINR(summary?.savingsBalance ?? 0)} color="#0ea5e9" />
        <Card label="Savings Rate" value={formatPct(summary?.savingsRate ?? 0)} color="#14b8a6" />
        <Card label="Net Worth" value={formatINR(summary?.netWorth ?? 0)} color="#1e293b" />
        <Card label="Outstanding Loan" value={formatINR(summary?.outstandingLoanPrincipal ?? 0)} color="#ef4444" />
      </div>

      {/* Loan progress */}
      {summary && summary.outstandingLoanPrincipal > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 8, color: '#1e293b' }}>Loan Repayment Progress</h3>
          <p style={{ color: '#64748b', marginBottom: 8 }}>
            Outstanding: {formatINR(summary.outstandingLoanPrincipal)}
          </p>
        </div>
      )}

      {/* Cash flow chart */}
      {cashflow && cashflow.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ marginBottom: 16, color: '#1e293b' }}>12-Month Cash Flow</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashflow.map((d) => ({ ...d, month: formatMonth(d.month) }))}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${color}`,
        outline: highlight ? '2px solid #ef4444' : 'none',
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: highlight ? '#ef4444' : '#1e293b' }}>
        {value}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

function alertStyle(type: 'orange' | 'red' | 'blue'): React.CSSProperties {
  const colors = {
    orange: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
    red: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    blue: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  };
  const c = colors[type];
  return {
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 8,
    fontSize: 14,
  };
}
