import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useDashboardSummary, useCashFlow, useDashboardAlerts, useMonthlyDailyExpenses } from '../api/dashboard';
import { formatINR, currentMonth, formatMonth } from '../utils/format';

export default function DashboardPage() {
  const month = currentMonth();
  const { data: summary, isLoading } = useDashboardSummary(month);
  const { data: cashflow } = useCashFlow();
  const { data: alerts } = useDashboardAlerts(month);
  const { data: dailyExp } = useMonthlyDailyExpenses();

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (isLoading) return <p>Loading dashboard…</p>;

  const surplus = summary?.monthlySurplus ?? 0;

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Dashboard — {formatMonth(month)}</h2>

      {/* Alerts — budget and low surplus only */}
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
        </div>
      )}

      {/* Row 1 — Daily expense tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label={`Daily Spent (${todayLabel})`} value={formatINR(dailyExp?.todayTotal ?? 0)} color="#f97316" />
        <Card label={`Monthly Spent (${formatMonth(month)})`} value={formatINR(dailyExp?.monthTotal ?? 0)} color="#dc2626" />
        <Card label={`Daily Received (${todayLabel})`} value={formatINR(dailyExp?.todayCredit ?? 0)} color="#22c55e" />
        <Card label={`Monthly Received (${formatMonth(month)})`} value={formatINR(dailyExp?.monthCredit ?? 0)} color="#16a34a" />
      </div>

      {/* Row 2 — Income summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="Monthly Income" value={formatINR(summary?.totalIncome ?? 0)} color="#22c55e" />
        <Card label="Monthly PF" value={formatINR(summary?.pfAmount ?? 0)} color="#8b5cf6" />
        <Card label="Annual Variable Pay" value={formatINR(summary?.variablePayAmount ?? 0)} color="#f59e0b" />
        <Card label="Monthly Expenses" value={formatINR(summary?.totalExpenses ?? 0)} color="#ef4444" />
      </div>

      {/* Row 3 — Surplus and loan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="Monthly Surplus" value={formatINR(surplus)} color={surplus < 0 ? '#ef4444' : '#3b82f6'} highlight={surplus < 0} />
        <Card label="Loan Outstanding" value={formatINR(summary?.outstandingLoanPrincipal ?? 0)} color="#ef4444" />
        <Card label="Monthly EMI" value={formatINR(summary?.monthlyEmi ?? 0)} color="#f97316" />
      </div>

      {/* Cash flow chart */}
      {cashflow && cashflow.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 8 }}>
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

function Card({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: highlight ? '#ef4444' : '#1e293b' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

function alertStyle(type: 'orange' | 'red'): React.CSSProperties {
  const colors = {
    orange: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
    red: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  };
  const c = colors[type];
  return { background: c.bg, border: `1px solid ${c.border}`, color: c.text, borderRadius: 8, padding: '10px 16px', marginBottom: 8, fontSize: 14 };
}
