import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useDashboardSummary, useDashboardAlerts, useMonthlyDailyExpenses, useDailyChart, usePortfolioLiveValue } from '../api/dashboard';
import { useLoans } from '../api/loans';
import { formatINR, currentMonth, formatMonth } from '../utils/format';

export default function DashboardPage() {
  const month = currentMonth();
  const { data: summary, isLoading } = useDashboardSummary(month);
  const { data: alerts } = useDashboardAlerts(month);
  const { data: dailyExp } = useMonthlyDailyExpenses();
  const { data: dailyChart } = useDailyChart();
  const { data: portfolio } = usePortfolioLiveValue();
  const { data: loans = [] } = useLoans();
  const activeLoans = loans.filter((l) => !l.isClosed);

  const today = new Date();
  const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (isLoading) return <p>Loading dashboard…</p>;

  const surplus = summary?.monthlySurplus ?? 0;
  const invested = portfolio?.investedValue ?? summary?.portfolioInvestedValue ?? 0;
  const current  = portfolio?.currentValue  ?? summary?.portfolioCurrentValue  ?? 0;
  const gain     = portfolio?.gainLoss      ?? 0;
  const gainPct  = portfolio?.gainLossPct   ?? 0;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <h2 className="page-heading">Dashboard — {formatMonth(month)}</h2>

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
        </div>
      )}

      {/* Row 1 — Daily Spend/Receive · Income · Monthly Spend/Receive */}
      <div className="dash-grid">
        <DashCard
          label="Daily Spend & Receive"
          value={`${formatINR(dailyExp?.todayTotal ?? 0)} / ${formatINR(dailyExp?.todayCredit ?? 0)}`}
          color="#f97316"
        />
        <DashCard
          label="Salary / PF / Variable Pay"
          value={`${formatINR(summary?.totalIncome ?? 0)} / ${formatINR(summary?.pfAmount ?? 0)} / ${formatINR(summary?.variablePayAmount ?? 0)}`}
          color="#22c55e"
        />
        <DashCard
          label="Monthly Spend & Receive"
          value={`${formatINR(dailyExp?.monthTotal ?? 0)} / ${formatINR(dailyExp?.monthCredit ?? 0)}`}
          color="#dc2626"
        />
      </div>

      {/* Row 2 — Surplus/Expenses · Investments · Loan Breakdown */}
      <div className="dash-grid">
        <DashCard
          label="Monthly Surplus / Fixed Expenses"
          value={`${formatINR(surplus)} / ${formatINR(summary?.totalExpenses ?? 0)}`}
          color="#22c55e"
        />
        <DashCard
          label="Total Invested / Current Value / Gain/Loss"
          value={`${formatINR(invested)} / ${formatINR(current)} / ${formatINR(gain)} (${gainPct.toFixed(2)}%)`}
          color="#3b82f6"
          small
        />
        <LoanCard loans={activeLoans} />
      </div>

      {/* Daily chart */}
      {dailyChart && dailyChart.length > 0 ? (
        <div className="chart-card">
          <h3>Daily Transactions — {monthName}</h3>
          <p>Day-by-day spent and received from your bank emails</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={dailyChart}
              margin={{ top: 8, right: 48, left: 8, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                label={{ value: 'Day of Month', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(v) => v === 0 ? '₹0' : `₹${v > 999 ? (v / 1000).toFixed(0) + 'k' : v}`}
                tick={{ fontSize: 10, fill: '#ef4444' }}
                width={42}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: '#22c55e' }}
                width={38}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatINR(v), name === 'spent' ? '🔴 Spent' : '🟢 Received']}
                labelFormatter={(l) => `Day ${l}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                formatter={(v) => v === 'spent' ? '🔴 Spent (left)' : '🟢 Received (right)'}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={(props: any) => props.payload.spent > 0
                  ? <circle cx={props.cx} cy={props.cy} r={3} fill="#ef4444" />
                  : <g />}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="received"
                stroke="#22c55e"
                strokeWidth={2}
                dot={(props: any) => props.payload.received > 0
                  ? <circle cx={props.cx} cy={props.cy} r={3} fill="#22c55e" />
                  : <g />}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            No transactions this month yet. Sync your Gmail to see the daily chart.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable card ──────────────────────────────────────── */
function DashCard({
  label, value, color, small,
}: {
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      className="dash-card"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="dash-card-label">{label}</div>
      <div
        className="dash-card-value"
        style={small ? { fontSize: 14, lineHeight: 1.4 } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

/* ─── Loan breakdown card ────────────────────────────────── */
function LoanCard({ loans }: { loans: any[] }) {
  return (
    <div className="dash-card" style={{ borderLeft: '4px solid #f97316' }}>
      <div className="dash-card-label">Loan Breakdown</div>
      {loans.length > 0 ? (
        loans.slice(0, 1).map((loan) => {
          const remainingMonths = loan.emiAmount > 0
            ? Math.ceil(loan.outstandingPrincipal / loan.emiAmount)
            : 0;
          return (
            <div key={loan.id}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                {loan.loanName}
              </div>
              <div className="dash-card-value">{formatINR(loan.outstandingPrincipal)}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                EMI: <span style={{ fontWeight: 700 }}>{formatINR(loan.emiAmount)}</span> · ~{remainingMonths}m
              </div>
            </div>
          );
        })
      ) : (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>No active loans</div>
      )}
    </div>
  );
}

/* ─── Alert styles ───────────────────────────────────────── */
function alertStyle(type: 'orange' | 'red'): React.CSSProperties {
  const colors = {
    orange: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
    red:    { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
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
