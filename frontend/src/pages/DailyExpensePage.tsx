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
  const [syncing, setSyncing] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'gmail' | 'manual'>('gmail');

  // Check Gmail connection status + handle OAuth callback
  useEffect(() => {
    if (!user?.id) return;

    // Handle OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get('gmail');
    if (gmailStatus === 'connected') {
      setMessage('✅ Gmail connected successfully! Click "Sync Now" to import transactions.');
      setGmailConnected(true);
      window.history.replaceState({}, '', '/daily-expense');
    } else if (gmailStatus === 'error') {
      setError(`Gmail connection failed: ${params.get('msg') || 'Unknown error'}`);
      window.history.replaceState({}, '', '/daily-expense');
    }

    checkGmailStatus();
  }, [user?.id]);

  const checkGmailStatus = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('gmail_tokens')
        .select('connected, last_sync_at')
        .eq('user_id', user.id)
        .single();

      if (data?.connected) {
        setGmailConnected(true);
        setLastSync(data.last_sync_at || null);
      }
    } catch {
      setGmailConnected(false);
    }
  };

  const handleConnectGmail = async () => {
    if (!user?.id) return;
    setError('');
    try {
      const res = await fetch(`/.netlify/functions/gmail-auth?action=url&user_id=${user.id}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to get Gmail auth URL');
      }
    } catch (err: any) {
      setError('Failed to connect Gmail: ' + err.message);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!user?.id || !confirm('Disconnect Gmail? Auto-sync will stop.')) return;
    await fetch(`/.netlify/functions/gmail-auth?action=disconnect&user_id=${user.id}`);
    setGmailConnected(false);
    setLastSync(null);
    setMessage('Gmail disconnected.');
  };

  const handleSyncGmail = async () => {
    if (!user?.id) return;
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/.netlify/functions/gmail-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
      setLastSync(new Date().toISOString());
      loadTransactions(selectedDate);
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // SMS Parser
  const parseSMS = (sms: string) => {
    const result = {
      amount: 0,
      type: 'debit' as 'debit' | 'credit',
      merchant: 'Unknown',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 8),
    };

    const amountMatch = sms.match(/(?:Rs\.?\s*|INR\s*|₹\s*)(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    if (/debited|debit|spent|paid|purchase|withdrawn/i.test(sms)) result.type = 'debit';
    else if (/credited|credit|received|deposited|added/i.test(sms)) result.type = 'credit';

    const merchantPatterns = [
      /(?:at|to|towards)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.]+?)(?:\s+on\b|\s+dated|\s+\d|\s+via|\s+Ref|\.)/i,
      /(?:from)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.]+?)(?:\s+on\b|\s+dated|\s+\d|\s+via|\s+Ref|\.)/i,
    ];
    for (const p of merchantPatterns) {
      const m = sms.match(p);
      if (m && m[1].trim().length > 1) { result.merchant = m[1].trim(); break; }
    }

    const textLower = (result.merchant + ' ' + sms).toLowerCase();
    if (/swiggy|zomato|domino|pizza|restaurant|cafe|food|mcdonald|kfc|burger/i.test(textLower)) result.category = 'Food';
    else if (/uber|ola|rapido|metro|bus|petrol|fuel|parking|toll|cab/i.test(textLower)) result.category = 'Transport';
    else if (/amazon|flipkart|myntra|ajio|meesho|shopping|mall|store/i.test(textLower)) result.category = 'Shopping';
    else if (/electricity|water|gas|bill|recharge|mobile|internet|broadband/i.test(textLower)) result.category = 'Utilities';
    else if (/movie|cinema|netflix|prime|hotstar|pvr|inox/i.test(textLower)) result.category = 'Entertainment';
    else if (/hospital|medical|pharmacy|doctor|health|apollo|clinic/i.test(textLower)) result.category = 'Healthcare';
    else if (/rent|maintenance|society|housing/i.test(textLower)) result.category = 'Rent';

    const datePatterns = [/(\d{1,2})[\/\-](\w{3})[\/\-](\d{2,4})/, /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/];
    const monthMap: Record<string, string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
    for (const p of datePatterns) {
      const m = sms.match(p);
      if (m) {
        const day = m[1].padStart(2, '0');
        const rawMonth = m[2];
        const month = isNaN(Number(rawMonth)) ? (monthMap[rawMonth.toLowerCase()] || '01') : rawMonth.padStart(2, '0');
        let year = m[3]; if (year.length === 2) year = '20' + year;
        result.date = `${year}-${month}-${day}`; break;
      }
    }
    return result;
  };

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

  useEffect(() => { loadTransactions(selectedDate); }, [selectedDate, loadTransactions]);

  const handleParseSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setError('User not authenticated'); return; }
    if (!smsText.trim()) { setError('Please paste an SMS message'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const parsed = parseSMS(smsText);
      if (parsed.amount === 0) { setError('Could not find an amount. Make sure SMS contains Rs./INR/₹ followed by a number.'); return; }
      const { error: insertError } = await supabase.from('daily_transactions').insert({
        amount: parsed.amount, type: parsed.type, merchant: parsed.merchant,
        category: parsed.category, date: parsed.date, time: parsed.time,
        raw_sms: smsText.trim(), user_id: user.id,
      });
      if (insertError) throw insertError;
      setMessage(`✅ ${parsed.type === 'debit' ? 'Spent' : 'Received'} ₹${parsed.amount.toLocaleString('en-IN')} at ${parsed.merchant}`);
      setSmsText('');
      setSelectedDate(parsed.date);
      loadTransactions(parsed.date);
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    const { error: delError } = await supabase.from('daily_transactions').delete().eq('id', id).eq('user_id', user!.id);
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

      {/* Gmail Connect Card */}
      <div style={{ ...cardStyle, marginBottom: 16, borderTop: `4px solid ${gmailConnected ? '#22c55e' : '#f59e0b'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>
              📧 Auto-Sync from Gmail
              <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: gmailConnected ? '#dcfce7' : '#fef3c7', color: gmailConnected ? '#166534' : '#92400e', fontWeight: 600 }}>
                {gmailConnected ? '● Connected' : '○ Not connected'}
              </span>
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              {gmailConnected
                ? `Automatically reads bank transaction emails from your Gmail. ${lastSync ? `Last sync: ${new Date(lastSync).toLocaleString('en-IN')}` : 'Never synced yet.'}`
                : 'Connect your Gmail to automatically import bank transaction emails from HDFC, SBI, ICICI, Axis and more.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {gmailConnected ? (
              <>
                <button onClick={handleSyncGmail} disabled={syncing} style={{ ...btnSmall, background: '#3b82f6' }}>
                  {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
                </button>
                <button onClick={handleDisconnectGmail} style={{ ...btnSmall, background: '#ef4444' }}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={handleConnectGmail} style={{ ...btnSmall, background: '#4285f4' }}>
                🔗 Connect Gmail
              </button>
            )}
          </div>
        </div>

        {gmailConnected && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#166534' }}>
            ✅ Reads emails from: alerts@hdfcbank.net, SBI, ICICI, Axis, Kotak &amp; more. Scans last 30 days on each sync.
          </div>
        )}
      </div>

      {/* Tabs: Gmail / Manual */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
        {(['gmail', 'manual'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {tab === 'gmail' ? '📧 From Email' : '✍️ Manual Entry'}
          </button>
        ))}
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}
      {message && <div style={alertStyle('success')}>{message}</div>}

      {/* Gmail Tab */}
      {activeTab === 'gmail' && (
        <div style={cardStyle}>
          {!gmailConnected ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <h3 style={{ marginBottom: 8, color: '#1e293b' }}>Connect your Gmail</h3>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Your bank sends transaction alerts to your email.<br />
                Connect Gmail once and transactions will sync automatically.
              </p>
              <button onClick={handleConnectGmail} style={{ ...btnStyle, background: '#4285f4', maxWidth: 280, margin: '0 auto' }}>
                🔗 Connect Gmail Account
              </button>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
                We only read emails from your bank. We never read personal emails.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Gmail is connected ✅</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    Click "Sync Now" to fetch the latest bank emails
                  </div>
                </div>
                <button onClick={handleSyncGmail} disabled={syncing} style={{ ...btnSmall, background: '#3b82f6', padding: '10px 20px' }}>
                  {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
                </button>
              </div>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#475569' }}>
                <strong>How it works:</strong> Scans your Gmail for bank emails from the last 30 days →
                Extracts amount, merchant, category → Saves to your transactions automatically.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual SMS Tab */}
      {activeTab === 'manual' && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 8, fontSize: 15 }}>📱 Paste Bank SMS</h3>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            Copy a transaction SMS from HDFC, SBI, ICICI or any Indian bank and paste below.
          </p>
          <form onSubmit={handleParseSMS}>
            <textarea
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder={`Paste SMS here…\n\nExample:\nYour A/c XX1234 debited Rs.250.00 at SWIGGY on 26-Apr-26. Avl Bal: Rs.12,345.00`}
              rows={5}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', marginBottom: 12, resize: 'vertical', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <button type="submit" style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? '⏳ Saving...' : '✨ Parse & Save'}
            </button>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📅 Transactions</h3>
          <input
            type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
          />
        </div>

        {loadingTx ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
            No transactions for this date.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transactions.map((t) => (
              <div key={t.id} style={{ padding: '14px 16px', background: t.type === 'debit' ? '#fef2f2' : '#f0fdf4', borderRadius: 8, borderLeft: `4px solid ${t.type === 'debit' ? '#ef4444' : '#22c55e'}` }}>
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
                    <button onClick={() => handleDelete(t.id)} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
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
  const map: Record<string, string> = { Food:'🍔', Transport:'🚗', Shopping:'🛍', Utilities:'💡', Entertainment:'🎬', Healthcare:'🏥', Rent:'🏠', Other:'📦' };
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

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const btnStyle: React.CSSProperties = { padding: '12px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', display: 'block' };
const btnSmall: React.CSSProperties = { padding: '8px 14px', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const alertStyle = (type: 'error' | 'success'): React.CSSProperties => ({
  padding: '12px 16px', borderRadius: 6, marginBottom: 14, fontSize: 13,
  background: type === 'error' ? '#fee2e2' : '#dcfce7',
  color: type === 'error' ? '#991b1b' : '#166534',
  border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
});
