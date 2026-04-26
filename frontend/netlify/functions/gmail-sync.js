/**
 * Gmail Sync — reads bank transaction emails and saves to daily_transactions
 * POST /.netlify/functions/gmail-sync  { user_id: "..." }
 *
 * Supports: HDFC, SBI, ICICI, Axis, Kotak, Yes Bank
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zcoildagsacuaceohddal.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Token helpers ────────────────────────────────────────────────────────────

async function getStoredTokens(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
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
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken, expires_at: expiresAt }),
  });
}

// ── Gmail API helpers ────────────────────────────────────────────────────────

async function fetchGmailMessages(accessToken, query, maxResults = 20) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.messages || [];
}

async function fetchMessageBody(accessToken, messageId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}

function extractTextFromMessage(message) {
  const parts = message.payload?.parts || [];
  let text = '';

  // Try plain text first
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }

  // Fallback to body directly
  if (!text && message.payload?.body?.data) {
    text = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  // Fallback to snippet
  if (!text) text = message.snippet || '';

  return text;
}

function getEmailDate(message) {
  const headers = message.payload?.headers || [];
  const dateHeader = headers.find(h => h.name === 'Date');
  if (dateHeader) {
    const d = new Date(dateHeader.value);
    if (!isNaN(d.getTime())) return d;
  }
  // fallback: use internalDate (milliseconds)
  if (message.internalDate) return new Date(parseInt(message.internalDate));
  return new Date();
}

// ── Email parser ─────────────────────────────────────────────────────────────

function parseTransactionEmail(text, emailDate) {
  const result = {
    amount: 0,
    type: 'debit',
    merchant: 'Unknown',
    category: 'Other',
    date: emailDate.toISOString().split('T')[0],
    time: emailDate.toTimeString().split(' ')[0].substring(0, 8),
  };

  // Extract amount — Rs., Rs, INR, ₹
  const amountPatterns = [
    /(?:Rs\.?\s*|INR\s*|₹\s*)(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:Rs\.?|INR|₹)/i,
  ];
  for (const p of amountPatterns) {
    const m = text.match(p);
    if (m) {
      result.amount = parseFloat(m[1].replace(/,/g, ''));
      break;
    }
  }

  if (result.amount === 0) return null; // not a transaction email

  // Detect type
  if (/debited|debit|withdrawn|spent|paid|purchase|payment made/i.test(text)) {
    result.type = 'debit';
  } else if (/credited|credit|received|deposited|salary|refund/i.test(text)) {
    result.type = 'credit';
  }

  // Extract merchant
  const merchantPatterns = [
    /(?:at|to|towards|merchant[:\s]+)\s*([A-Za-z0-9][A-Za-z0-9\s\-&'.,]+?)(?:\s+on\b|\s+dated|\s+\d|\s+via|\s+Ref|\s+UPI|\.|\n)/i,
    /(?:from)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.,]+?)(?:\s+on\b|\s+dated|\s+\d|\.|\n)/i,
    /UPI[:\s]+([A-Za-z0-9][A-Za-z0-9\s\-&'.@]+?)(?:\s+on\b|\s+\d|\.|\n)/i,
  ];
  for (const p of merchantPatterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1) {
      result.merchant = m[1].trim().replace(/\s+/g, ' ').substring(0, 100);
      break;
    }
  }

  // Auto-categorize
  const textLower = (result.merchant + ' ' + text).toLowerCase();
  if (/swiggy|zomato|domino|pizza|restaurant|cafe|food|mcdonald|kfc|burger|biryani/i.test(textLower)) {
    result.category = 'Food';
  } else if (/uber|ola|rapido|metro|bus|petrol|fuel|parking|toll|cab/i.test(textLower)) {
    result.category = 'Transport';
  } else if (/amazon|flipkart|myntra|ajio|meesho|shopping|mall|store/i.test(textLower)) {
    result.category = 'Shopping';
  } else if (/electricity|water|gas|bill|recharge|mobile|internet|broadband|dth/i.test(textLower)) {
    result.category = 'Utilities';
  } else if (/movie|cinema|netflix|prime|hotstar|pvr|inox/i.test(textLower)) {
    result.category = 'Entertainment';
  } else if (/hospital|medical|pharmacy|doctor|health|apollo|clinic/i.test(textLower)) {
    result.category = 'Healthcare';
  } else if (/rent|maintenance|society|housing/i.test(textLower)) {
    result.category = 'Rent';
  }

  return result;
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function isAlreadySaved(userId, gmailMessageId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_transactions?user_id=eq.${userId}&gmail_message_id=eq.${gmailMessageId}&select=id`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

async function saveTransaction(userId, tx, gmailMessageId, rawEmail) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_transactions`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      amount: tx.amount,
      type: tx.type,
      merchant: tx.merchant,
      category: tx.category,
      date: tx.date,
      time: tx.time,
      raw_sms: rawEmail.substring(0, 500),
      gmail_message_id: gmailMessageId,
    }),
  });
  return res.ok;
}

async function updateLastSync(userId) {
  await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ last_sync_at: new Date().toISOString() }),
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

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
    // Get stored tokens
    const tokenRow = await getStoredTokens(userId);
    if (!tokenRow) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Gmail not connected. Please connect Gmail first.' }) };
    }

    let accessToken = tokenRow.access_token;

    // Refresh token if expired
    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt <= new Date()) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      if (refreshed.error) throw new Error(`Token refresh failed: ${refreshed.error}`);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await updateAccessToken(userId, accessToken, newExpiry);
    }

    // Search Gmail for bank transaction emails (last 7 days)
    const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const bankQuery = `(from:alerts@hdfcbank.net OR from:noreply@hdfcbank.com OR from:alerts@sbi.co.in OR from:icicibank.com OR from:axisbank.com OR from:kotakbank.com) after:${since}`;

    const messages = await fetchGmailMessages(accessToken, bankQuery, 30);

    let saved = 0;
    let skipped = 0;

    for (const msg of messages) {
      // Skip if already saved
      const alreadySaved = await isAlreadySaved(userId, msg.id);
      if (alreadySaved) { skipped++; continue; }

      // Fetch full message
      const fullMsg = await fetchMessageBody(accessToken, msg.id);
      const text = extractTextFromMessage(fullMsg);
      const emailDate = getEmailDate(fullMsg);

      // Parse transaction
      const tx = parseTransactionEmail(text, emailDate);
      if (!tx) { skipped++; continue; }

      // Save to Supabase
      const ok = await saveTransaction(userId, tx, msg.id, text);
      if (ok) saved++;
    }

    await updateLastSync(userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved,
        skipped,
        total: messages.length,
        message: saved > 0
          ? `✅ Found and saved ${saved} new transaction${saved > 1 ? 's' : ''} from your email`
          : 'No new transactions found in the last 7 days',
      }),
    };
  } catch (err) {
    console.error('Gmail sync error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Sync failed' }),
    };
  }
};
