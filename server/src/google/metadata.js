// The [hc ...] notes line — how a Google Task carries schedule metadata the
// Tasks API can't express (recurrence, time of day). One line inside the
// task's free-text notes; any other note content is preserved untouched.
//
//   [hc once at 09:00]
//   [hc every 2 days at 09:00]
//   [hc every mon,thu at 19:00]
//   [hc paused every 2 days at 09:00]   — paused: hidden from the dashboard
//   [hc logged]                          — completed occurrence of a recurring
//                                          task (history record; never revived)

const DAY_KEYS = new Set(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);

const ONCE_RE = /^\[hc (paused )?once at (\d{2}):(\d{2})\]$/;
const INTERVAL_RE = /^\[hc (paused )?every (\d+) days? at (\d{2}):(\d{2})\]$/;
const WEEKLY_RE = /^\[hc (paused )?every ([a-z]{3}(?:,[a-z]{3})*) at (\d{2}):(\d{2})\]$/;
const LOGGED_RE = /^\[hc logged\]$/;
const ANY_HC_RE = /^\[hc .*\]$/;

// schedule = { recurrence_type: 'once'|'interval'|'weekly', interval_days,
//              days_of_week: 'mon,thu'|null, time_of_day: 'HH:MM:SS', paused: bool }

export function serializeSchedule(schedule) {
  const hhmm = String(schedule.time_of_day).slice(0, 5);
  const paused = schedule.paused ? 'paused ' : '';
  if (schedule.recurrence_type === 'once') return `[hc ${paused}once at ${hhmm}]`;
  if (schedule.recurrence_type === 'interval') {
    const n = schedule.interval_days;
    return `[hc ${paused}every ${n} day${n === 1 ? '' : 's'} at ${hhmm}]`;
  }
  return `[hc ${paused}every ${schedule.days_of_week} at ${hhmm}]`;
}

export const LOGGED_LINE = '[hc logged]';

function parseLine(line) {
  if (LOGGED_RE.test(line)) return { logged: true };

  let m = line.match(ONCE_RE);
  if (m) {
    return {
      recurrence_type: 'once',
      interval_days: null,
      days_of_week: null,
      time_of_day: `${m[2]}:${m[3]}:00`,
      paused: Boolean(m[1]),
    };
  }
  m = line.match(INTERVAL_RE);
  if (m) {
    const n = Number(m[2]);
    if (n < 1) return null;
    return {
      recurrence_type: 'interval',
      interval_days: n,
      days_of_week: null,
      time_of_day: `${m[3]}:${m[4]}:00`,
      paused: Boolean(m[1]),
    };
  }
  m = line.match(WEEKLY_RE);
  if (m) {
    const days = m[2].split(',');
    if (!days.every((d) => DAY_KEYS.has(d))) return null;
    return {
      recurrence_type: 'weekly',
      interval_days: null,
      days_of_week: days.join(','),
      time_of_day: `${m[3]}:${m[4]}:00`,
      paused: Boolean(m[1]),
    };
  }
  return null;
}

// → schedule | { logged: true } | null (no [hc] line / unparseable)
export function parseSchedule(notes) {
  for (const line of String(notes ?? '').split(/\r?\n/)) {
    const parsed = parseLine(line.trim());
    if (parsed) return parsed;
  }
  return null;
}

export function stripScheduleLine(notes) {
  return String(notes ?? '')
    .split(/\r?\n/)
    .filter((line) => !ANY_HC_RE.test(line.trim()))
    .join('\n')
    .trim();
}

// Replace (or append) the [hc] line, preserving all other note text.
export function setScheduleLine(notes, line) {
  const rest = stripScheduleLine(notes);
  return rest ? `${line}\n${rest}` : line;
}
