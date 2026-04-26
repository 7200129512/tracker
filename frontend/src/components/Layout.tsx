import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../api/auth';
import { currentMonth, formatMonth } from '../utils/format';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/expenses', label: 'Expenses', icon: '◈' },
  { to: '/daily-expense', label: 'Daily Expense', icon: '✦' },
  { to: '/loans', label: 'Loans', icon: '⊞' },
  { to: '/investments', label: 'Investments', icon: '◱' },
  { to: '/savings', label: 'Savings', icon: '▣' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/data', label: 'Data', icon: '▤' },
];

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/signin');
    }
  };

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Mobile menu button */}
      {isMobile && (
        <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>💼 Portfolio</div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f1f5f9',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: isMobile ? '100%' : 220,
          background: '#1e293b',
          color: '#f1f5f9',
          display: isMobile && !sidebarOpen ? 'none' : 'flex',
          flexDirection: 'column',
          padding: isMobile ? '16px 0' : '24px 0',
          flexShrink: 0,
          position: isMobile ? 'absolute' : 'relative',
          top: isMobile ? 48 : 0,
          left: 0,
          right: 0,
          zIndex: 100,
          maxHeight: isMobile ? 'calc(100vh - 48px)' : 'auto',
          overflowY: isMobile ? 'auto' : 'visible',
        }}
      >
        {!isMobile && (
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>💼 Portfolio</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Finance Tracker</div>
          </div>
        )}
        <nav style={{ flex: 1, padding: isMobile ? '8px 0' : '16px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => isMobile && setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: isMobile ? '12px 16px' : '10px 20px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#0f172a' : 'transparent',
                textDecoration: 'none',
                fontSize: isMobile ? 15 : 14,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
              })}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info and sign out */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Logged in as:</div>
          <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12, wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', width: isMobile ? '100%' : 'auto' }}>
        {/* Top bar */}
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '12px 16px' : '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: isMobile ? 13 : 14, color: '#64748b' }}>
            📅 {formatMonth(currentMonth())}
          </span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: isMobile ? 16 : 24, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
