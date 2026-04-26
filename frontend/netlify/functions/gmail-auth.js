/**
 * Gmail OAuth handler
 * GET  /.netlify/functions/gmail-auth?action=url&user_id=xxx   → returns Google OAuth URL
 * GET  /.netlify/functions/gmail-auth?action=callback&code=xxx&user_id=xxx → exchanges code for tokens, saves to Supabase
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zcoildagsacuaceohddal.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Redirect URI must match what's registered in Google Cloud Console
const REDIRECT_URI = `${process.env.URL || 'https://tracker-2026-app.netlify.app'}/.netlify/functions/gmail-auth`;

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  const params = event.queryStringParameters || {};
  const action = params.action;

  // ── 1. Return the Google OAuth URL ──────────────────────────────────────
  if (action === 'url') {
    const userId = params.user_id;
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id required' }) };
    if (!GOOGLE_CLIENT_ID) return { statusCode: 500, headers, body: JSON.stringify({ error: 'GOOGLE_CLIENT_ID not configured' }) };

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', userId); // pass user_id through OAuth flow

    return { statusCode: 200, headers, body: JSON.stringify({ url: url.toString() }) };
  }

  // ── 2. OAuth callback — exchange code for tokens ─────────────────────────
  if (action === 'callback' || params.code) {
    const code = params.code;
    const userId = params.state || params.user_id;

    if (!code || !userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'code and user_id required' }) };
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenRes.json();
      if (tokens.error) throw new Error(tokens.error_description || tokens.error);

      // Save tokens to Supabase
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          connected: true,
        }),
      });

      if (!upsertRes.ok) {
        const err = await upsertRes.text();
        throw new Error(`Supabase error: ${err}`);
      }

      // Redirect back to app with success
      return {
        statusCode: 302,
        headers: {
          ...headers,
          Location: `${process.env.URL || 'https://tracker-2026-app.netlify.app'}/daily-expense?gmail=connected`,
        },
        body: '',
      };
    } catch (err) {
      console.error('OAuth callback error:', err);
      return {
        statusCode: 302,
        headers: {
          ...headers,
          Location: `${process.env.URL || 'https://tracker-2026-app.netlify.app'}/daily-expense?gmail=error&msg=${encodeURIComponent(err.message)}`,
        },
        body: '',
      };
    }
  }

  // ── 3. Disconnect Gmail ──────────────────────────────────────────────────
  if (action === 'disconnect') {
    const userId = params.user_id;
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id required' }) };

    await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  // ── 4. Check connection status ───────────────────────────────────────────
  if (action === 'status') {
    const userId = params.user_id;
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id required' }) };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?user_id=eq.${userId}&select=connected,expires_at`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    const data = await res.json();
    const connected = data?.[0]?.connected === true;
    return { statusCode: 200, headers, body: JSON.stringify({ connected }) };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
};
