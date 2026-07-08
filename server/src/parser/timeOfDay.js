// chrono-node wrapper: pulls a time ("at 9am") and/or an explicit date
// ("tomorrow", "on friday", "june 3rd") out of the text and removes the
// matched words so the residue can become the task title.

import * as chrono from 'chrono-node';

const pad = (n) => String(n).padStart(2, '0');

// → { remaining, timeOfDay: 'HH:MM:SS'|null, explicitDate: Date|null }
export function extractTime(text, now = new Date()) {
  const results = chrono.parse(text, now, { forwardDate: true });
  if (results.length === 0) return { remaining: text, timeOfDay: null, explicitDate: null };

  const r = results[0];
  const remaining = (text.slice(0, r.index) + ' ' + text.slice(r.index + r.text.length)).trim();

  let timeOfDay = null;
  if (r.start.isCertain('hour')) {
    const h = r.start.get('hour');
    const m = r.start.isCertain('minute') ? r.start.get('minute') : 0;
    timeOfDay = `${pad(h)}:${pad(m)}:00`;
  }

  let explicitDate = null;
  if (r.start.isCertain('day') || r.start.isCertain('weekday')) {
    explicitDate = r.start.date();
  }

  return { remaining, timeOfDay, explicitDate };
}
