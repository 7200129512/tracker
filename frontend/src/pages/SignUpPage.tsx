import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../api/auth';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const { user, error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    if (user) {
      setSuccess('Account created successfully! Please check your email to confirm your account.');
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        <h1 style={{ marginBottom: 24, color: '#1e293b', textAlign: 'center' }}>Create Account</h1>

        {error && <div style={alertStyle('error')}>{error}</div>}
        {success && <div style={alertStyle('success')}>{success}</div>}

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
              placeholder="At least 6 characters"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/signin" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
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
