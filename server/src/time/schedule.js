// Pure scheduling math. All datetimes are local-time JS Dates; callers pass
// `now` explicitly so everything here is deterministic and unit-testable.

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function atTime(date, timeOfDay) {
  const [h, m, s] = String(timeOfDay).split(':').map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, s || 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseDays(daysOfWeek) {
  if (Array.isArray(daysOfWeek)) return daysOfWeek;
  return String(daysOfWeek || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Smallest datetime strictly after `after` whose weekday is in daysOfWeek, at timeOfDay.
export function nextWeeklyOccurrence(daysOfWeek, timeOfDay, after) {
  const wanted = new Set(parseDays(daysOfWeek).map((d) => DAY_KEYS.indexOf(d)));
  if (wanted.size === 0) return null;
  for (let i = 0; i <= 7; i++) {
    const candidate = atTime(addDays(after, i), timeOfDay);
    if (candidate > after && wanted.has(candidate.getDay())) return candidate;
  }
  return null;
}

// Next due date after completing a task. Returns null for one-shots (deactivate).
// Interval tasks advance from the scheduled time, not the completion time, but
// catch up past `from` so a long-overdue task isn't instantly overdue again.
export function advanceNextDue(task, from = new Date()) {
  if (task.recurrence_type === 'once') return null;
  if (task.recurrence_type === 'interval') {
    let next = atTime(new Date(task.next_due_at), task.time_of_day);
    do {
      next = atTime(addDays(next, task.interval_days), task.time_of_day);
    } while (next <= from);
    return next;
  }
  // weekly
  const after = new Date(Math.max(new Date(task.next_due_at).getTime(), from.getTime()));
  return nextWeeklyOccurrence(task.days_of_week, task.time_of_day, after);
}

// First due date for a newly created task.
export function firstDueAt(recurrence, timeOfDay, now = new Date()) {
  if (recurrence.type === 'weekly') {
    return nextWeeklyOccurrence(recurrence.daysOfWeek, timeOfDay, now);
  }
  const today = atTime(now, timeOfDay);
  return today > now ? today : atTime(addDays(today, 1), timeOfDay);
}
