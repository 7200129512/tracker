import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../api/auth';

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    const { user, error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    if (user) {
      // Redirect to dashboard
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        <h1 style={{ marginBottom: 24, color: '#1e293b', textAlign: 'center' }}>Sign In</h1>

        {error && <div style={alertStyle('error')}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '20px',
};

const formContainerStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 40,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  width: '100%',
  maxWidth: 400,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 600,
  color: '#1e293b',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const alertStyle = (type: 'error' | 'success'): React.CSSProperties => ({
  padding: '12px 16px',
  borderRadius: 6,
  marginBottom: 16,
  fontSize: 14,
  background: type === 'error' ? '#fee2e2' : '#dcfce7',
  color: type === 'error' ? '#991b1b' : '#166534',
  border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
});
