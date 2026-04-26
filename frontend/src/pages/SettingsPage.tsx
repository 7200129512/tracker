import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabaseClient } from '../api/client';

export default function SettingsPage() {
  const { user } = useAuth();
  const [monthlyPF, setMonthlyPF] = useState<number>(7002);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSetMonthlyPF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (monthlyPF <= 0) {
      setError('Monthly PF amount must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('Setting monthly PF for user:', user.id);
      
      // Create PF entries for the next 12 months starting from next month
      const today = new Date();
      const entries = [];

      for (let i = 1; i <= 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
        entries.push({
          source_name: 'Monthly PF',
          amount: monthlyPF,
          frequency: 'monthly',
          effective_date: date.toISOString().split('T')[0],
          user_id: user.id,
        });
      }

      console.log('Creating PF entries:', entries.length);
      
      // Insert all entries
      let successCount = 0;
      let errorCount = 0;
      
      for (const entry of entries) {
        try {
          console.log('Creating entry for:', entry.effective_date);
          await supabaseClient.post('/income_entries', entry);
          successCount++;
        } catch (err) {
          console.error('Error creating entry:', err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setMessage(`✅ Monthly PF set to ₹${monthlyPF}. Created ${successCount} automatic entries starting next month.`);
      }
      
      if (errorCount > 0) {
        setError(`⚠️ Created ${successCount} entries but ${errorCount} failed. Check console for details.`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error setting monthly PF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>Settings</h2>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: 16 }}>Monthly PF Configuration</h3>
        <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
          Set your monthly PF amount. This will automatically create PF entries for the next 12 months starting from the 1st of each month.
        </p>

        {error && <div style={alertStyle('error')}>{error}</div>}
        {message && <div style={alertStyle('success')}>{message}</div>}

        <form onSubmit={handleSetMonthlyPF} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Monthly PF Amount (₹)</label>
            <input
              type="number"
              value={monthlyPF}
              onChange={(e) => setMonthlyPF(Number(e.target.value))}
              placeholder="e.g., 7002"
              min={1}
              step={1}
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
            {loading ? 'Setting up...' : 'Set Monthly PF'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: 12, background: '#f0f9ff', borderRadius: 6, borderLeft: '4px solid #0ea5e9' }}>
          <p style={{ fontSize: 13, color: '#0c4a6e', margin: 0 }}>
            💡 <strong>Tip:</strong> Once set, PF entries will be automatically created for the next 12 months. You can edit or delete individual entries if needed.
          </p>
        </div>
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 600,
  color: '#1e293b',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  width: 200,
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
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
