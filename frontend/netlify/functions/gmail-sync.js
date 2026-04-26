/**
 * Gmail Sync — reads bank transaction emails and saves to daily_transactions
 * POST /.netlify/functions/gmail-sync  { user_id: "..." }
 *
 * Fast approach: uses snippet-only first pass to filter, then fetches full body
 * only for emails that look like transactions. Runs in parallel batches.
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zcoildagsacuaceohddal.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getStoredTokens(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const data = await res.json();
  return data?.[0] || null;
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  return res.json();
}

async function updateAccessToken(userId, accessToken, expiresAt) {
  await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, expires_at: expiresAt }),
  });
}

// ── Gmail API helpers ─────────────────────────────────────────────────────────

// Fetch message list with snippet (metadata only — very fast, no body fetch needed)
async function fetchGmailMessageList(accessToken, query, maxResults = 100) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  return data.messages || [];
}

// Fetch message with metadata + snippet only (fast — no full body)
async function fetchMessageMetadata(accessToken, messageId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Date&metadataHeaders=From&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}

// Fetch full message body (slower — only call when needed)
async function fetchMessageFull(accessToken, messageId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}

function extractTextFromMessage(message) {
  const snippet = message.snippet || '';
  const parts = message.payload?.parts || [];
  let text = snippet + ' ';

  function extractParts(partList) {
    for (const part of partList) {
      if (part.parts) extractParts(part.parts);
      if (part.body?.data) {
        const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
        if (part.mimeType === 'text/plain') {
          text += decoded + ' ';
        } else if (part.mimeType === 'text/html') {
          text += decoded.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ') + ' ';
        }
      }
    }
  }

  if (parts.length > 0) {
    extractParts(parts);
  } else if (message.payload?.body?.data) {
    const decoded = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    text += decoded.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  }

  return text.trim();
}

function getEmailDate(message) {
  const headers = message.payload?.headers || [];
  const dateHeader = headers.find(h => h.name === 'Date');
  if (dateHeader) {
    const d = new Date(dateHeader.value);
    if (!isNaN(d.getTime())) return d;
  }
  if (message.internalDate) return new Date(parseInt(message.internalDate));
  return new Date();
}

// ── Transaction parser ────────────────────────────────────────────────────────

function parseTransactionEmail(text, emailDate) {
  const result = {
    amount: 0,
    type: 'debit',
    merchant: 'Unknown',
    category: 'Other',
    date: emailDate.toISOString().split('T')[0],
    time: emailDate.toTimeString().split(' ')[0].substring(0, 8),
  };

  const amountPatterns = [
    /(?:Rs\.?\s*|INR\s*|₹\s*)(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:Rs\.?|INR|₹)/i,
  ];
  for (const p of amountPatterns) {
    const m = text.match(p);
    if (m) { result.amount = parseFloat(m[1].replace(/,/g, '')); break; }
  }

  if (result.amount === 0) return null;

  if (/debited|debit|withdrawn|spent|paid|purchase|payment made/i.test(text)) result.type = 'debit';
  else if (/credited|credit|received|deposited|salary|refund/i.test(text)) result.type = 'credit';

  const merchantPatterns = [
    /to\s+VPA\s+([A-Za-z0-9._@]+)/i,
    /(?:at|to|towards|merchant[:\s]+)\s*([A-Za-z0-9][A-Za-z0-9\s\-&'.,]+?)(?:\s+on\b|\s+dated|\s+\d|\s+via|\s+Ref|\s+UPI|\.|\n)/i,
    /(?:from)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.,]+?)(?:\s+on\b|\s+dated|\s+\d|\.|\n)/i,
  ];
  for (const p of merchantPatterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1) { result.merchant = m[1].trim().replace(/\s+/g, ' ').substring(0, 100); break; }
  }

  const textLower = (result.merchant + ' ' + text).toLowerCase();
  if (/swiggy|zomato|domino|pizza|restaurant|cafe|food|mcdonald|kfc|burger|biryani/i.test(textLower)) result.category = 'Food';
  else if (/uber|ola|rapido|metro|bus|petrol|fuel|parking|toll|cab/i.test(textLower)) result.category = 'Transport';
  else if (/amazon|flipkart|myntra|ajio|meesho|shopping|mall|store/i.test(textLower)) result.category = 'Shopping';
  else if (/electricity|water|gas|bill|recharge|mobile|internet|broadband|dth/i.test(textLower)) result.category = 'Utilities';
  else if (/movie|cinema|netflix|prime|hotstar|pvr|inox/i.test(textLower)) result.category = 'Entertainment';
  else if (/hospital|medical|pharmacy|doctor|health|apollo|clinic/i.test(textLower)) result.category = 'Healthcare';
  else if (/rent|maintenance|society|housing/i.test(textLower)) result.category = 'Rent';

  // Parse date from email body — handles: 26-Apr-26, 04-04-26, 26/04/2026, 04-04-2026
  const monthMap = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  const datePatterns = [
    /(\d{1,2})[\/\-](\w{3})[\/\-](\d{2,4})/,   // 26-Apr-26 or 26-Apr-2026
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // 04-04-26 or 26/04/2026
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) {
      const day = m[1].padStart(2, '0');
      const rawMonth = m[2];
      const month = isNaN(Number(rawMonth))
        ? (monthMap[rawMonth.toLowerCase()] || '01')
        : rawMonth.padStart(2, '0');
      let year = m[3];
      if (year.length === 2) year = '20' + year;
      result.date = `${year}-${month}-${day}`;
      break;
    }
  }

  return result;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

// Get all already-saved gmail_message_ids for this user in one query (fast)
async function getSavedMessageIds(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_transactions?user_id=eq.${userId}&gmail_message_id=not.is.null&select=gmail_message_id`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json();
  return new Set((data || []).map(r => r.gmail_message_id));
}

// Bulk insert all transactions at once
async function saveTransactions(userId, transactions) {
  if (transactions.length === 0) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_transactions`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(transactions),
  });
  return res.ok ? transactions.length : 0;
}

async function updateLastSync(userId) {
  await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_sync_at: new Date().toISOString() }),
  });
}

// Run promises in parallel batches
async function batchProcess(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let userId;
  try {
    const body = JSON.parse(event.body || '{}');
    userId = body.user_id;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id required' }) };

  try {
    // 1. Get stored tokens
    const tokenRow = await getStoredTokens(userId);
    if (!tokenRow) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Gmail not connected.' }) };

    let accessToken = tokenRow.access_token;

    // 2. Refresh token if expired
    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt <= new Date()) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      if (refreshed.error) throw new Error(`Token refresh failed: ${refreshed.error}`);
      accessToken = refreshed.access_token;
      await updateAccessToken(userId, accessToken, new Date(Date.now() + refreshed.expires_in * 1000).toISOString());
    }

    // 3. Build query — from 1st of current month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const since = Math.floor(firstOfMonth.getTime() / 1000);
    const bankQuery = `(from:alerts@hdfcbank.net OR from:alerts@hdfcbank.bank.in OR from:noreply@hdfcbank.com OR from:hdfcbank.com OR from:alerts@sbi.co.in OR from:icicibank.com OR from:axisbank.com OR from:kotakbank.com OR from:yesbank.in) after:${since}`;

    // 4. Get message IDs (fast — just IDs, no body)
    const messages = await fetchGmailMessageList(accessToken, bankQuery, 100);
    if (messages.length === 0) {
      await updateLastSync(userId);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, saved: 0, skipped: 0, total: 0, message: 'No bank emails found this month.' }) };
    }

    // 5. Get already-saved IDs in ONE query (avoids N individual checks)
    const savedIds = await getSavedMessageIds(userId);
    const newMessages = messages.filter(m => !savedIds.has(m.id));

    if (newMessages.length === 0) {
      await updateLastSync(userId);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, saved: 0, skipped: messages.length, total: messages.length, message: 'All transactions already synced.' }) };
    }

    // 6. Fetch full body for new messages in parallel batches of 10
    const fullMessages = await batchProcess(newMessages, 10, (msg) =>
      fetchMessageFull(accessToken, msg.id)
    );

    // 7. Parse all transactions
    const toSave = [];
    for (let i = 0; i < fullMessages.length; i++) {
      const fullMsg = fullMessages[i];
      const text = extractTextFromMessage(fullMsg);
      const emailDate = getEmailDate(fullMsg);
      const tx = parseTransactionEmail(text, emailDate);
      if (!tx) continue;

      toSave.push({
        user_id: userId,
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant,
        category: tx.category,
        date: tx.date,
        time: tx.time,
        raw_sms: text.substring(0, 500),
        gmail_message_id: newMessages[i].id,
      });
    }

    // 8. Bulk insert all at once
    const saved = await saveTransactions(userId, toSave);
    await updateLastSync(userId);

    // Build summary of what was saved for debugging
    const savedDates = toSave.map(t => `${t.merchant} ₹${t.amount} on ${t.date}`).join(', ');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved,
        skipped: messages.length - newMessages.length,
        total: messages.length,
        message: saved > 0
          ? `✅ Saved ${saved} new transaction${saved > 1 ? 's' : ''} from this month`
          : 'No new transactions found.',
        debug: savedDates || 'nothing to save',
      }),
    };
  } catch (err) {
    console.error('Gmail sync error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Sync failed' }) };
  }
};
