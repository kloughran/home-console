// Pushes a summary of due recurring tasks to ntfy so the phone pokes you until
// they're done. NTFY_TOPIC is the master switch — unset disables the feature.

import fs from 'node:fs';
import { decidePoke } from '../time/poke.js';

let lastSentAt; // undefined = not yet loaded from disk; Date | null after
let warnedDisabled = false;
let warnedWriteFailed = false;

const statePath = () => process.env.POKE_STATE_PATH || './data/poke-state.json';

export function isPokeConfigured() {
  return Boolean(process.env.NTFY_TOPIC);
}

function pokeConfig() {
  return {
    days: process.env.POKE_DAYS || 'mon,tue,wed,thu,fri',
    start: process.env.POKE_WINDOW_START || '09:00',
    end: process.env.POKE_WINDOW_END || '17:00',
    intervalMs: Number(process.env.POKE_INTERVAL_MS) || 7_200_000,
  };
}

function loadState() {
  try {
    const d = new Date(JSON.parse(fs.readFileSync(statePath(), 'utf8')).lastSentAt);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null; // missing or corrupt state just means "never sent"
  }
}

function saveState(sentAt) {
  try {
    fs.writeFileSync(statePath(), JSON.stringify({ lastSentAt: sentAt.toISOString() }, null, 2));
  } catch (err) {
    if (!warnedWriteFailed) {
      console.warn(`poke state not persisted (${err.message}) — continuing in-memory`);
      warnedWriteFailed = true;
    }
  }
}

async function sendNtfy({ title, message }) {
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
  const headers = { Title: title, Priority: 'default', Tags: 'house' };
  if (process.env.CONSOLE_URL) headers.Click = process.env.CONSOLE_URL;
  const res = await fetch(`${server}/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers,
    body: message,
  });
  if (!res.ok) throw new Error(`ntfy ${res.status}: ${await res.text().catch(() => '')}`);
}

// Called from the background refresh tick with freshly fetched shaped tasks.
export async function runPokeCheck(tasks, now = new Date()) {
  if (!isPokeConfigured()) {
    if (!warnedDisabled) {
      console.log('NTFY_TOPIC unset — task poking disabled');
      warnedDisabled = true;
    }
    return;
  }
  if (lastSentAt === undefined) lastSentAt = loadState();
  const decision = decidePoke({ now, tasks, lastSentAt, config: pokeConfig() });
  if (!decision.send) return;
  await sendNtfy(decision); // advance lastSentAt only on success → failed sends retry next tick
  lastSentAt = now;
  saveState(now);
}
