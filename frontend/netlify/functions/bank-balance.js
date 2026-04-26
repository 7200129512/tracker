/**
 * Bank Balance Fetcher
 * Reads the latest HDFC/SBI/ICICI/Axis bank transaction email from Gmail
 * and extracts the "Available Balance" from the message body.
 *
 * POST /.netlify/functions/bank-balance  { user_id: "..." }
 *
 * HDFC SMS/email patterns:
 *   "Avl Bal: Rs.45,230.50"
 *   "Available Balance: INR 45,230.50"
 *   "Avl Bal:INR 45230.50"
 *   "balance is Rs 45,230.50"
 */

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || 'https://zcoldagsacuaceohddal.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };

  let userId;
  try {
    userId = JSON.parse(event.body || '{}').user_id;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id required' }) };

  try {
    // 1. Get stored Gmail tokens
    const tokenRes = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    const tokenRows = await tokenRes.json();
    if (!tokenRows?.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Gmail not connected. Please connect Gmail first.' }) };
    }

    let { access_token, refresh_token, expires_at } = tokenRows[0];

    // 2. Refresh token if expired
    if (new Date(expires_at) <= new Date()) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      });
      const refreshed = await refreshRes.json();
      if (refreshed.error) throw new Error(`Token refresh failed: ${refreshed.error}`);
      access_token = refreshed.access_token;
      // Update token in DB
      await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() }),
      });
    }

    // 3. Search for latest bank balance email (last 7 days)
    const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const query = `(from:alerts@hdfcbank.net OR from:alerts@hdfcbank.bank.in OR from:noreply@hdfcbank.com OR from:alerts@sbi.co.in OR from:icicibank.com OR from:axisbank.com OR from:kotakbank.com) after:${since}`;

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No bank emails found in last 7 days.' }) };
    }

    // 4. Try each message until we find a balance
    for (const msg of messages) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const msgData = await msgRes.json();

      // Extract text from email body
      const text = extractText(msgData);
      const balance = extractBalance(text);

      if (balance !== null) {
        // Get email date
        const headers2 = msgData.payload?.headers || [];
        const dateHeader = headers2.find(h => h.name === 'Date');
        const emailDate = dateHeader ? new Date(dateHeader.value).toISOString() : new Date().toISOString();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            balance,
            source: 'gmail',
            emailDate,
            snippet: msgData.snippet?.substring(0, 120),
          }),
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Could not extract balance from recent bank emails. Balance pattern not found.' }),
    };

  } catch (err) {
    console.error('Bank balance error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractText(message) {
  let text = (message.snippet || '') + ' ';
  const parts = message.payload?.parts || [];

  function walk(partList) {
    for (const part of partList) {
      if (part.parts) walk(part.parts);
      if (part.body?.data) {
        try {
          const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
          text += (part.mimeType === 'text/html'
            ? decoded.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
            : decoded) + ' ';
        } catch {}
      }
    }
  }

  if (parts.length > 0) {
    walk(parts);
  } else if (message.payload?.body?.data) {
    try {
      text += Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } catch {}
  }

  return text;
}

function extractBalance(text) {
  // Patterns ordered by specificity — most reliable first
  const patterns = [
    // HDFC: "Avl Bal: Rs.45,230.50" or "Avl Bal:INR 45,230.50"
    /[Aa]vl\.?\s*[Bb]al(?:ance)?[:\s]+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/,
    // "Available Balance: INR 45,230.50" or "Available Bal: Rs 45,230"
    /[Aa]vailable\s+[Bb]al(?:ance)?[:\s]+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/,
    // "Bal: Rs 45,230.50"
    /\bBal[:\s]+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/,
    // "balance is Rs 45,230.50"
    /balance\s+is\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "Closing Balance: 45,230.50"
    /[Cc]losing\s+[Bb]alance[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/,
    // Generic: ₹45,230.50 near "balance"
    /balance[^₹\d]{0,20}₹\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0 && num < 100000000) { // sanity: < 10 crore
        return num;
      }
    }
  }
  return null;
}
