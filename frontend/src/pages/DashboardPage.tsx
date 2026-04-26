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
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolioLiveValue();
  const { data: loans = [] } = useLoans();
  const activeLoans = loans.filter((l) => !l.isClosed);

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

      {/* Row 1 — Daily bank tracking + Income */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <Card label="Daily Spend & Receive" value={`${formatINR(dailyExp?.todayTotal ?? 0)} / ${formatINR(dailyExp?.todayCredit ?? 0)}`} color="#f97316" />
        <IncomeCard 
          salary={formatINR(summary?.totalIncome ?? 0)}
          pf={formatINR(summary?.pfAmount ?? 0)}
          variablePay={formatINR(summary?.variablePayAmount ?? 0)}
        />
        <Card label="Monthly Surplus" value={formatINR(surplus)} color={surplus < 0 ? '#ef4444' : '#3b82f6'} highlight={surplus < 0} />
      </div>

      {/* Row 2 — Monthly totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16, marginBottom: 16 }}>
        <Card label="Monthly Spend & Receive" value={`${formatINR(dailyExp?.monthTotal ?? 0)} / ${formatINR(dailyExp?.monthCredit ?? 0)}`} color="#dc2626" />
      </div>

      {/* Row 3 — Obligations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16, marginBottom: 16 }}>
        <Card label="Fixed Expenses (Rent etc.)" value={formatINR(summary?.totalExpenses ?? 0)} color="#ef4444" />
      </div>

      {/* Loan breakdown — one card per active loan */}
      {activeLoans.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Loan Breakdown
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {activeLoans.map((loan) => {
              const remainingMonths = loan.emiAmount > 0 ? Math.ceil(loan.outstandingPrincipal / loan.emiAmount) : 0;
              return (
                <div key={loan.id} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #f97316' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{loan.loanName}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{formatINR(loan.outstandingPrincipal)}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    EMI: {formatINR(loan.emiAmount)} · ~{remainingMonths} months left
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: 3, height: 4, marginTop: 8 }}>
                    <div style={{
                      background: '#f97316',
                      width: `${Math.min(loan.originalPrincipal > 0 ? ((loan.originalPrincipal - loan.outstandingPrincipal) / loan.originalPrincipal) * 100 : 0, 100)}%`,
                      height: 4, borderRadius: 3,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment Breakdown */}
      {(() => {
        const invested  = portfolio?.investedValue  ?? summary?.portfolioInvestedValue ?? 0;
        const current   = portfolio?.currentValue   ?? summary?.portfolioCurrentValue  ?? 0;
        const gain      = portfolio?.gainLoss       ?? 0;
        const gainPct   = portfolio?.gainLossPct    ?? 0;
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Investment Breakdown
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Total Invested</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{formatINR(invested)}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Current Value{portfolioLoading ? ' (updating…)' : ''}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{formatINR(current)}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${gain >= 0 ? '#22c55e' : '#ef4444'}` }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Total Gain/Loss</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: gain >= 0 ? '#22c55e' : '#ef4444' }}>{formatINR(gain)} ({gainPct.toFixed(2)}%)</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Daily chart — current month day by day */}
      {dailyChart && dailyChart.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 8 }}>
          <h3 style={{ marginBottom: 4, color: '#1e293b' }}>Daily Transactions — {monthName}</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Day-by-day spent and received from your bank emails</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChart} margin={{ top: 8, right: 70, left: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                label={{ value: 'Day of Month', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
              />
              {/* Left axis — Spent (small ₹ amounts, no k) */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(v) => `₹${v}`}
                tick={{ fontSize: 10, fill: '#ef4444' }}
                width={55}
                allowDecimals={false}
              />
              {/* Right axis — Received (large amounts in k) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: '#22c55e' }}
                width={48}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatINR(v), name === 'spent' ? '🔴 Spent' : '🟢 Received']}
                labelFormatter={(l) => `Day ${l}`}
                contentStyle={{ fontSize: 13 }}
              />
              <Legend verticalAlign="top" height={32} formatter={(v) => v === 'spent' ? '🔴 Spent (left)' : '🟢 Received (right)'} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={(props: any) => props.payload.spent > 0 ? <circle cx={props.cx} cy={props.cy} r={4} fill="#ef4444" /> : <g />}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="received"
                stroke="#22c55e"
                strokeWidth={2}
                dot={(props: any) => props.payload.received > 0 ? <circle cx={props.cx} cy={props.cy} r={4} fill="#22c55e" /> : <g />}
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

function IncomeCard({ salary, pf, variablePay }: { salary: string; pf: string; variablePay: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #22c55e',
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Salary / PF / Variable Pay</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{salary} / {pf} / {variablePay}</div>
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
