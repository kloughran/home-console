// One-time OAuth setup for the Google Tasks bridge (installed-app loopback
// flow). Prereqs in server/.env: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET from
// a "Desktop app" OAuth client (see README). Run from server/:
//
//   node scripts/google-auth.js
//
// Opens no browser itself — copy the printed URL into one, approve access,
// and the script writes the tokens file, then exits.

import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8765;
const REDIRECT = `http://localhost:${PORT}`;
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env first (see README).');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/tasks',
    access_type: 'offline',
    prompt: 'consent',
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(404).end();
    return;
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: 'authorization_code',
    }),
  });
  const data = await tokenRes.json();

  if (!tokenRes.ok || !data.refresh_token) {
    res.end('Token exchange failed — see terminal output.');
    console.error('Token exchange failed:', data);
    process.exit(1);
  }

  const tokensPath = process.env.GOOGLE_TOKENS_PATH || './data/google-tokens.json';
  fs.mkdirSync(path.dirname(tokensPath), { recursive: true });
  fs.writeFileSync(
    tokensPath,
    JSON.stringify(
      {
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        expiry_date: Date.now() + data.expires_in * 1000,
      },
      null,
      2
    )
  );
  res.end('Home Console is authorized — you can close this tab.');
  console.log(`Tokens written to ${tokensPath}`);
  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log('Open this URL in your browser and approve access:\n');
  console.log(authUrl + '\n');
  console.log('Waiting for the redirect...');
});
