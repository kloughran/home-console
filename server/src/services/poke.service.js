// Pushes a summary of due recurring tasks to ntfy so the phone pokes you until
// they're done. NTFY_TOPIC is the master switch — unset disables the feature.

import fs from 'node:fs';
import { decidePoke } from '../time/poke.js';

let lastSentAt; // undefined = not yet loaded from disk; Date | null after
let warnedDisabled = false;
let warnedWriteFailed = false;
let warnedBadLines = false;

const statePath = () => process.env.POKE_STATE_PATH || './data/poke-state.json';
const linesPath = () => process.env.POKE_LINES_PATH || './data/poke-lines.json';

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

// Optional trash-talk phrase file; missing = plain notifications (the normal
// case), malformed = warn once and stay plain. Re-read each tick so edits land
// without a restart.
function loadPokeLines() {
  let text;
  try {
    text = fs.readFileSync(linesPath(), 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed?.tiers) || !parsed.tiers.every((t) => Array.isArray(t?.insults))) {
      throw new Error('expected { tiers: [{ minDays, insults: [...] }] }');
    }
    warnedBadLines = false;
    return parsed;
  } catch (err) {
    if (!warnedBadLines) {
      console.warn(`poke lines file ignored (${err.message}) — using plain notifications`);
      warnedBadLines = true;
    }
    return null;
  }
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

async function sendNtfy({ title, message, priority }) {
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
  const headers = { Title: title, Priority: priority || 'default', Tags: 'house' };
  // Action button rather than a Click tap-through: tapping the notification
  // should open it in the ntfy app (full text readable), not the console.
  if (process.env.CONSOLE_URL) headers.Actions = `view, Open console, ${process.env.CONSOLE_URL}`;
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
  const decision = decidePoke({ now, tasks, lastSentAt, config: pokeConfig(), lines: loadPokeLines() });
  if (!decision.send) return;
  await sendNtfy(decision); // advance lastSentAt only on success → failed sends retry next tick
  lastSentAt = now;
  saveState(now);
}
