// Pure poke decision logic. All datetimes are local-time JS Dates; callers pass
// `now` explicitly so everything here is deterministic and unit-testable.
//
// config = { days: 'mon,tue,wed,thu,fri', start: '09:00', end: '17:00', intervalMs: 7200000 }

import { parseDays, DAY_KEYS } from './schedule.js';

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Inclusive on both ends so a 17:00 cutoff still gets its final send.
export function inPokeWindow(now, config) {
  const days = new Set(parseDays(config.days).map((d) => DAY_KEYS.indexOf(d)));
  if (!days.has(now.getDay())) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= toMinutes(config.start) && minutes <= toMinutes(config.end);
}

// Recurring managed tasks whose due time has passed. Instant-granular on
// purpose — the dashboard's "due today" bucket includes tonight, which
// shouldn't poke yet.
export function pendingRecurringTasks(tasks, now) {
  return tasks.filter(
    (t) =>
      t.managed &&
      t.active === 1 &&
      (t.recurrence_type === 'interval' || t.recurrence_type === 'weekly') &&
      t.next_due_at &&
      t.next_due_at <= now
  );
}

function localMidnight(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function timeLabel(d) {
  const h = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

// Title must stay ASCII — it travels in an HTTP header (latin-1); task titles
// with arbitrary UTF-8 go in the message body.
export function formatPokeMessage(pending, now) {
  const title = `${pending.length} task${pending.length === 1 ? '' : 's'} waiting`;
  const message = pending
    .map((t) => {
      // Round, not floor: local day spans are 23/25h across DST.
      const days = Math.round((localMidnight(now) - localMidnight(t.next_due_at)) / 86_400_000);
      const when =
        days > 0 ? `overdue ${days} day${days === 1 ? '' : 's'}` : `due ${timeLabel(t.next_due_at)}`;
      return `• ${t.title} (${when})`;
    })
    .join('\n');
  return { title, message };
}

export function decidePoke({ now, tasks, lastSentAt, config }) {
  if (!inPokeWindow(now, config)) return { send: false, reason: 'outside-window' };
  const pending = pendingRecurringTasks(tasks, now);
  if (pending.length === 0) return { send: false, reason: 'nothing-pending' };
  if (lastSentAt && now - lastSentAt < config.intervalMs) return { send: false, reason: 'too-soon' };
  return { send: true, pending, ...formatPokeMessage(pending, now) };
}
