// processCommand — the single code path for natural-language commands from
// the console text box. (Voice entries are normalized inside the Google
// store's refresh pass, which shares the same parser and matcher.)

import { parseCommand } from '../parser/index.js';
import { fuzzyMatch } from '../parser/fuzzyMatch.js';
import { normalize } from '../parser/normalize.js';
import * as store from '../google/store.js';
import { logCommand } from './commandLog.js';

const DAY_LABELS = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

export function describeRecurrence(task) {
  if (task.recurrence_type === 'once') return 'once';
  if (task.recurrence_type === 'weekly') {
    const days = String(task.days_of_week || '').split(',').filter(Boolean);
    return `every ${days.map((d) => DAY_LABELS[d] ?? d).join(', ')}`;
  }
  const n = task.interval_days;
  if (n === 1) return 'every day';
  if (n === 2) return 'every other day';
  if (n === 7) return 'every week';
  if (n % 7 === 0) return `every ${n / 7} weeks`;
  return `every ${n} days`;
}

export function formatTime(timeOfDay) {
  const [h, m] = String(timeOfDay).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// "today" / "tomorrow" / "on Sat, Jul 11" — so the toast says when a new task
// will actually surface on the dashboard.
function dueDayLabel(due, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay - start) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `on ${new Date(due).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

export async function processCommand(rawText, { source = 'text', now = new Date() } = {}) {
  const parsed = parseCommand(rawText, now);
  let outcome = 'error';
  let task = null;
  let completion = null;
  let message = '';
  let candidates;
  let detail = null;

  try {
    if (parsed.intent === 'add_task') {
      task = await store.createTask(
        {
          title: parsed.title,
          recurrence_type: parsed.recurrence.type,
          interval_days: parsed.recurrence.intervalDays ?? null,
          days_of_week: parsed.recurrence.daysOfWeek ?? null,
          time_of_day: parsed.timeOfDay,
          first_due_at: parsed.firstDueAt,
        },
        now
      );
      outcome = 'applied';
      const when = `${dueDayLabel(task.next_due_at, now)} at ${formatTime(task.time_of_day)}`;
      message =
        task.recurrence_type === 'once'
          ? `Added: ${task.title} — ${when}`
          : `Added: ${task.title} — ${describeRecurrence(task)} at ${formatTime(task.time_of_day)}, starting ${dueDayLabel(task.next_due_at, now)}`;
    } else if (parsed.intent === 'complete_task') {
      const activeTasks = await store.listTasks({ active: 1 });
      const withNormalized = activeTasks.map((t) => ({ ...t, title_normalized: normalize(t.title) }));
      const result = fuzzyMatch(parsed.phrase, withNormalized);
      detail = { scores: result.scored.slice(0, 5) };
      if (result.outcome === 'matched') {
        const done = await store.completeTask(result.match.id, now);
        if (done.error) {
          outcome = 'error';
          message = `Matched "${result.match.title}" but couldn't complete it (${done.error}).`;
        } else {
          ({ task, completion } = done);
          outcome = 'applied';
          message = `Completed: ${completion.title}`;
        }
      } else if (result.outcome === 'ambiguous') {
        outcome = 'ambiguous';
        candidates = result.scored.filter((s) => s.score >= 0.6).slice(0, 3);
        message = `Not sure which task you meant: ${candidates.map((c) => `"${c.title}"`).join(' or ')}`;
      } else {
        outcome = 'no_match';
        message = `No task matched "${parsed.phrase}"`;
      }
    } else {
      // No schedule, no completion phrasing — behave like Google Tasks itself
      // and just add the text as a plain, undated list item.
      const title = String(rawText).trim();
      task = await store.createPlainTask(title);
      outcome = 'applied';
      message = `Added to your list: ${task.title} (no date — find it under All Tasks)`;
    }
  } catch (err) {
    console.error('processCommand failed:', err);
    outcome = 'error';
    message = 'Something went wrong applying that command.';
    detail = { error: err.message };
  }

  logCommand({
    source,
    raw_text: String(rawText),
    intent: parsed.intent,
    outcome,
    task_title: task?.title ?? completion?.title ?? null,
    detail,
  });

  return { intent: parsed.intent, outcome, task, completion, message, candidates };
}
