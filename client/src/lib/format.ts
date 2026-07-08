import type { Task } from '../api/types';

const DAY_LABELS: Record<string, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
};

export function recurrenceLabel(task: Task): string {
  if (task.recurrence_type === 'once') return task.managed ? 'once' : 'one-time';
  if (task.recurrence_type === 'weekly') {
    const days = (task.days_of_week ?? '').split(',').filter(Boolean);
    return `every ${days.map((d) => DAY_LABELS[d] ?? d).join(', ')}`;
  }
  const n = task.interval_days ?? 1;
  if (n === 1) return 'every day';
  if (n === 2) return 'every other day';
  if (n === 7) return 'every week';
  if (n % 7 === 0) return `every ${n / 7} weeks`;
  return `every ${n} days`;
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function dateTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeLabel(iso)}`;
}

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function dueLabel(iso: string, withTime = true, now = new Date()): string {
  const due = new Date(iso);
  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(due).getTime()) / DAY_MS);
  const time = withTime ? ` at ${timeLabel(iso)}` : '';
  if (daysAgo === 0) return `today${time}`;
  if (daysAgo === 1) return `yesterday${time}`;
  if (daysAgo > 1) return `${daysAgo} days overdue`;
  if (daysAgo === -1) return `tomorrow${time}`;
  return withTime
    ? dateTimeLabel(iso)
    : due.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Unmanaged (plain Google) tasks are all-day: their 9:00 sort time is
// synthetic, so never show it.
export function dueLabelForTask(task: Task): string {
  if (!task.next_due_at) return 'no date';
  return dueLabel(task.next_due_at, task.managed);
}

export function nextDueLabel(task: Task): string {
  if (!task.next_due_at) return 'no date';
  if (!task.managed) {
    const d = new Date(task.next_due_at);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return dateTimeLabel(task.next_due_at);
}
