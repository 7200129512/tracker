import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/auth';
import { formatINR } from '../utils/format';

interface Transaction {
  id: number;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  category: string;
  date: string;
  time: string;
  raw_sms: string;
  user_id: string;
}

export default function DailyExpensePage() {
  const { user } = useAuth();
  const [smsText, setSmsText] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // SMS Parser - Extracts transaction details from bank SMS
  const parseSMS = (sms: string) => {
    const result = {
      amount: 0,
      type: 'debit' as 'debit' | 'credit',
      merchant: 'Unknown',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 8),
    };

    // Extract amount — handles Rs., Rs, INR, ₹ with optional space
    const amountMatch = sms.match(/(?:Rs\.?\s*|INR\s*|₹\s*)(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Detect transaction type
    if (/debited|debit|spent|paid|purchase|withdrawn/i.test(sms)) {
      result.type = 'debit';
    } else if (/credited|credit|received|deposited|added/i.test(sms)) {
      result.type = 'credit';
    }

    // Extract merchant / payee name
    const merchantPatterns = [
      /(?:at|to|towards)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.]+?)(?:\s+on\b|\s+dated|\s+\d|\s+via|\s+Ref|\.)/i,
      /(?:from)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.]+?)(?:\s+on\b|\s+dated|\s+\d|\s+via|\s+Ref|\.)/i,
      /UPI[:\s]+([A-Za-z0-9][A-Za-z0-9\s\-&'.@]+?)(?:\s+on\b|\s+\d|\.)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = sms.match(pattern);
      if (match && match[1].trim().length > 1) {
        result.merchant = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Auto-categorize based on merchant / SMS content
    const textLower = (result.merchant + ' ' + sms).toLowerCase();
    if (/swiggy|zomato|domino|pizza|restaurant|cafe|food|mcdonald|kfc|burger|biryani|hotel/i.test(textLower)) {
      result.category = 'Food';
    } else if (/uber|ola|rapido|metro|bus|petrol|fuel|parking|toll|cab|auto/i.test(textLower)) {
      result.category = 'Transport';
    } else if (/amazon|flipkart|myntra|ajio|meesho|shopping|mall|store|market/i.test(textLower)) {
      result.category = 'Shopping';
    } else if (/electricity|water|gas|bill|recharge|mobile|internet|broadband|dth/i.test(textLower)) {
      result.category = 'Utilities';
    } else if (/movie|cinema|netflix|prime|hotstar|entertainment|game|pvr|inox/i.test(textLower)) {
      result.category = 'Entertainment';
    } else if (/hospital|medical|pharmacy|doctor|health|apollo|clinic|medicine/i.test(textLower)) {
      result.category = 'Healthcare';
    } else if (/rent|maintenance|society|housing/i.test(textLower)) {
      result.category = 'Rent';
    }

    // Extract date — formats: 26-Apr-26, 26/04/2026, 26-04-2026
    const datePatterns = [
      /(\d{1,2})[\/\-](\w{3})[\/\-](\d{2,4})/,
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const dateMatch = sms.match(pattern);
      if (dateMatch) {
        const monthMap: Record<string, string> = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
        };
        const day = dateMatch[1].padStart(2, '0');
        const rawMonth = dateMatch[2];
        const month = isNaN(Number(rawMonth))
          ? (monthMap[rawMonth.toLowerCase()] || '01')
          : rawMonth.padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) year = '20' + year;
        result.date = `${year}-${month}-${day}`;
        break;
      }
    }

    return result;
  };

  // Load transactions for selected date
  const loadTransactions = useCallback(async (date: string) => {
    if (!user?.id) return;
    setLoadingTx(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('daily_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('time', { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  }, [user?.id]);

  // Load on mount and when date changes
  useEffect(() => {
    loadTransactions(selectedDate);
  }, [selectedDate, loadTransactions]);

  const handleParseSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setError('User not authenticated'); return; }
    if (!smsText.trim()) { setError('Please paste an SMS message'); return; }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const parsed = parseSMS(smsText);

      if (parsed.amount === 0) {
        setError('Could not find an amount in this SMS. Make sure it contains Rs./INR/₹ followed by a number.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('daily_transactions')
        .insert({
          amount: parsed.amount,
          type: parsed.type,
          merchant: parsed.merchant,
          category: parsed.category,
          date: parsed.date,
          time: parsed.time,
          raw_sms: smsText.trim(),
          user_id: user.id,
        });

      if (insertError) throw insertError;

      setMessage(`✅ ${parsed.type === 'debit' ? 'Spent' : 'Received'} ₹${parsed.amount.toLocaleString('en-IN')} at ${parsed.merchant} (${parsed.category})`);
      setSmsText('');
      // Reload for the parsed date (may differ from selectedDate)
      setSelectedDate(parsed.date);
      loadTransactions(parsed.date);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      setError(err?.message || 'Failed to save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    const { error: delError } = await supabase
      .from('daily_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id);
    if (!delError) loadTransactions(selectedDate);
  };

  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
  const netAmount = totalCredit - totalDebit;

  return (
    <div>
      <h2 style={{ marginBottom: 20, color: '#1e293b' }}>💸 Daily Expense</h2>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Spent" value={formatINR(totalDebit)} color="#ef4444" />
        <SummaryCard label="Total Received" value={formatINR(totalCredit)} color="#22c55e" />
        <SummaryCard label="Net" value={formatINR(Math.abs(netAmount))} color={netAmount >= 0 ? '#22c55e' : '#ef4444'} sub={netAmount >= 0 ? 'surplus' : 'deficit'} />
      </div>

      {/* SMS Parser Form */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 8, fontSize: 16 }}>📱 Add from Bank SMS</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
          Copy a transaction SMS from HDFC, SBI, ICICI, Axis or any Indian bank and paste it below.
          The app will auto-detect the amount, merchant and category.
        </p>

        {error && <div style={alertStyle('error')}>{error}</div>}
        {message && <div style={alertStyle('success')}>{message}</div>}

        <form onSubmit={handleParseSMS}>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            placeholder={`Paste SMS here…\n\nExample:\nYour A/c XX1234 debited Rs.250.00 at SWIGGY on 26-Apr-26. Avl Bal: Rs.12,345.00`}
            rows={5}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              marginBottom: 12,
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
            disabled={loading}
          />
          <button
            type="submit"
            style={{ ...btnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            disabled={loading}
          >
            {loading ? '⏳ Saving...' : '✨ Parse & Save Transaction'}
          </button>
        </form>

        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0f9ff', borderRadius: 6, borderLeft: '4px solid #0ea5e9' }}>
          <p style={{ fontSize: 12, color: '#0c4a6e', margin: 0, lineHeight: 1.6 }}>
            💡 <strong>Works with:</strong> HDFC, SBI, ICICI, Axis, Kotak, Yes Bank and most Indian banks.
            Supports debit/credit, UPI, ATM and POS transactions.
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📅 Transactions</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
          />
        </div>

        {loadingTx ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
            No transactions for this date. Paste an SMS above to add one!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transactions.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '14px 16px',
                  background: t.type === 'debit' ? '#fef2f2' : '#f0fdf4',
                  borderRadius: 8,
                  borderLeft: `4px solid ${t.type === 'debit' ? '#ef4444' : '#22c55e'}`,
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.merchant}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {categoryEmoji(t.category)} {t.category} &nbsp;•&nbsp; {t.time?.substring(0, 5)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: t.type === 'debit' ? '#ef4444' : '#22c55e' }}>
                      {t.type === 'debit' ? '−' : '+'}{formatINR(Number(t.amount))}
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}
                    >
                      🗑 delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function categoryEmoji(cat: string) {
  const map: Record<string, string> = {
    Food: '🍔', Transport: '🚗', Shopping: '🛍', Utilities: '💡',
    Entertainment: '🎬', Healthcare: '🏥', Rent: '🏠', Other: '📦',
  };
  return map[cat] || '📦';
}

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`, flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const btnStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
};

const alertStyle = (type: 'error' | 'success'): React.CSSProperties => ({
  padding: '12px 16px',
  borderRadius: 6,
  marginBottom: 14,
  fontSize: 13,
  background: type === 'error' ? '#fee2e2' : '#dcfce7',
  color: type === 'error' ? '#991b1b' : '#166534',
  border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
});
