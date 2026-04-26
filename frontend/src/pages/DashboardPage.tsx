import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useDashboardSummary, useDashboardAlerts, useMonthlyDailyExpenses, useDailyChart } from '../api/dashboard';
import { formatINR, currentMonth, formatMonth } from '../utils/format';

export default function DashboardPage() {
  const month = currentMonth();
  const { data: summary, isLoading } = useDashboardSummary(month);
  const { data: alerts } = useDashboardAlerts(month);
  const { data: dailyExp } = useMonthlyDailyExpenses();
  const { data: dailyChart } = useDailyChart();

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

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

      {/* Row 1 — Daily bank tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <Card label={`Daily Spent (${todayLabel})`} value={formatINR(dailyExp?.todayTotal ?? 0)} color="#f97316" />
        <Card label={`Monthly Spent (${formatMonth(month)})`} value={formatINR(dailyExp?.monthTotal ?? 0)} color="#dc2626" />
        <Card label={`Daily Received (${todayLabel})`} value={formatINR(dailyExp?.todayCredit ?? 0)} color="#22c55e" />
        <Card label={`Monthly Received (${formatMonth(month)})`} value={formatINR(dailyExp?.monthCredit ?? 0)} color="#16a34a" />
      </div>

      {/* Row 2 — Income */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <Card label="Monthly Income" value={formatINR(summary?.totalIncome ?? 0)} color="#22c55e" />
        <Card label="Monthly PF" value={formatINR(summary?.pfAmount ?? 0)} color="#8b5cf6" />
        <Card label="Annual Variable Pay" value={formatINR(summary?.variablePayAmount ?? 0)} color="#f59e0b" />
        <Card label="Monthly Surplus" value={formatINR(surplus)} color={surplus < 0 ? '#ef4444' : '#3b82f6'} highlight={surplus < 0} />
      </div>

      {/* Row 3 — Obligations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card label="Cash Expenses" value={formatINR(summary?.totalExpenses ?? 0)} color="#ef4444" />
        <Card label="Loan Outstanding" value={formatINR(summary?.outstandingLoanPrincipal ?? 0)} color="#be123c" />
        <Card label="Monthly EMI" value={formatINR(summary?.monthlyEmi ?? 0)} color="#f97316" />
      </div>

      {/* Daily chart — current month day by day */}
      {dailyChart && dailyChart.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 8 }}>
          <h3 style={{ marginBottom: 4, color: '#1e293b' }}>Daily Transactions — {monthName}</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Day-by-day spent and received from your bank emails</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyChart} margin={{ top: 8, right: 60, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                label={{ value: 'Day of Month', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
              />
              {/* Left Y-axis for spent (smaller amounts in ₹) */}
              <YAxis
                yAxisId="spent"
                orientation="left"
                tickFormatter={(v) => v === 0 ? '₹0' : `₹${v.toLocaleString('en-IN')}`}
                tick={{ fontSize: 10, fill: '#ef4444' }}
                width={58}
                domain={[0, 'auto']}
                tickCount={6}
                allowDecimals={false}
              />
              {/* Right Y-axis for received (larger amounts) */}
              <YAxis
                yAxisId="received"
                orientation="right"
                tickFormatter={(v) => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#22c55e' }}
                width={52}
                domain={[0, 'auto']}
                tickCount={6}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatINR(v), name === 'spent' ? '🔴 Spent' : '🟢 Received']}
                labelFormatter={(l) => `Day ${l}`}
                contentStyle={{ fontSize: 13 }}
              />
              <Legend verticalAlign="top" height={32} formatter={(v) => v === 'spent' ? '🔴 Spent' : '🟢 Received'} />
              <Line
                yAxisId="received"
                type="monotone"
                dataKey="received"
                stroke="#22c55e"
                strokeWidth={2}
                dot={(props: any) => props.payload.received > 0 ? <circle cx={props.cx} cy={props.cy} r={4} fill="#22c55e" /> : <g />}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="spent"
                type="monotone"
                dataKey="spent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={(props: any) => props.payload.spent > 0 ? <circle cx={props.cx} cy={props.cy} r={4} fill="#ef4444" /> : <g />}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(!dailyChart || dailyChart.length === 0) && (
        <div style={{ ...cardStyle, marginTop: 8, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <p style={{ color: '#64748b', fontSize: 14 }}>No transactions this month yet. Sync your Gmail to see the daily chart.</p>
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
