// Google OAuth token handling. Tokens live in a JSON file (mounted volume in
// Docker) created once by scripts/google-auth.js; this module refreshes the
// short-lived access token from the long-lived refresh token as needed.

import fs from 'node:fs';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REFRESH_SLACK_MS = 60_000;

let cached = null;
let disabled = false;

export function tokensPath() {
  return process.env.GOOGLE_TOKENS_PATH || './data/google-tokens.json';
}

export function isConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && fs.existsSync(tokensPath())
  );
}

export function isDisabled() {
  return disabled;
}

export async function getAccessToken() {
  if (disabled) throw new Error('Google auth is disabled (invalid refresh token)');
  if (!cached) cached = JSON.parse(fs.readFileSync(tokensPath(), 'utf8'));

  if (cached.access_token && cached.expiry_date && cached.expiry_date - REFRESH_SLACK_MS > Date.now()) {
    return cached.access_token;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: cached.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === 'invalid_grant') {
      disabled = true;
      console.error(
        'Google refresh token is no longer valid. Re-run `node scripts/google-auth.js`, ' +
          'copy the new tokens file into place, and restart the server.'
      );
    }
    throw new Error(`Google token refresh failed (${res.status}): ${JSON.stringify(data)}`);
  }

  cached.access_token = data.access_token;
  cached.expiry_date = Date.now() + data.expires_in * 1000;
  fs.writeFileSync(tokensPath(), JSON.stringify(cached, null, 2));
  return cached.access_token;
}
