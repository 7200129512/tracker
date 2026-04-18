import { NavLink, Outlet } from 'react-router-dom';
import { useRefreshPrices } from '../api/investments';
import { currentMonth, formatMonth } from '../utils/format';

const navItems = [
  { to: '/', label: '📊 Dashboard', end: true },
  { to: '/income', label: '💰 Income' },
  { to: '/expenses', label: '🧾 Expenses' },
  { to: '/loans', label: '🏦 Loans' },
  { to: '/investments', label: '📈 Investments' },
  { to: '/savings', label: '🏧 Savings' },
  { to: '/data', label: '⚙️ Data' },
];

export default function Layout() {
  const refresh = useRefreshPrices();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: '#1e293b',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>💼 Portfolio</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Finance Tracker</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 20px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#0f172a' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        {/* Top bar */}
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, color: '#64748b' }}>
            📅 {formatMonth(currentMonth())}
          </span>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            style={{
              background: '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {refresh.isPending ? 'Refreshing…' : '🔄 Refresh Prices'}
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
