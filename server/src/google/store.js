// GoogleTasksStore — the user's default Google Tasks list IS the database.
//
// Managed tasks carry an [hc ...] schedule line in their notes (see
// metadata.js); recurrence is enforced here: completing a recurring task
// marks the old copy completed (tagged [hc logged] as the history record)
// and inserts a successor at the next occurrence. A normalization pass turns
// voice-added entries ("water my coleus every other day at 9am") into managed
// tasks and consumes completion statements ("I watered my coleus"). Plain
// personal entries are never touched.

import { parseCommand } from '../parser/index.js';
import { fuzzyMatch } from '../parser/fuzzyMatch.js';
import { normalize } from '../parser/normalize.js';
import { advanceNextDue, firstDueAt, atTime } from '../time/schedule.js';
import {
  serializeSchedule,
  parseSchedule,
  setScheduleLine,
  LOGGED_LINE,
} from './metadata.js';
import * as api from './tasksApi.js';
import { isConfigured, isDisabled } from './auth.js';
import { logCommand } from '../services/commandLog.js';

const CACHE_TTL_MS = 20_000;
const COMPLETED_LOOKBACK_DAYS = 30;
const DEFAULT_TIME = '09:00:00';

let listId = null;
let cache = null; // { tasks, completions, raw: Map<id, rawTask>, fetchedAt }
let refreshing = null; // in-flight refresh promise
const seenStatements = new Map(); // id → updated stamp for unmatched completion statements

const listName = () => process.env.GOOGLE_TASKS_LIST_NAME || '@default';

// ---------- date helpers (Google `due` is date-only) ----------

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dueField(date) {
  return `${localDateStr(date)}T00:00:00.000Z`;
}

// "2026-07-09T00:00:00.000Z" + "17:00:00" → local Date 2026-07-09 17:00
export function composeDue(dueIso, timeOfDay) {
  const [y, m, d] = String(dueIso).slice(0, 10).split('-').map(Number);
  return atTime(new Date(y, m - 1, d), timeOfDay);
}

// ---------- shaping raw Google tasks into console task objects ----------

export function shapeTask(raw) {
  const meta = parseSchedule(raw.notes);
  const managed = Boolean(meta && !meta.logged);
  const timeOfDay = managed ? meta.time_of_day : DEFAULT_TIME;
  return {
    id: raw.id,
    title: raw.title ?? '',
    recurrence_type: managed ? meta.recurrence_type : 'once',
    interval_days: managed ? meta.interval_days : null,
    days_of_week: managed ? meta.days_of_week : null,
    time_of_day: timeOfDay,
    next_due_at: raw.due ? composeDue(raw.due, timeOfDay) : null,
    active: managed && meta.paused ? 0 : 1,
    managed,
    updated_at: raw.updated,
  };
}

function shapeCompletion(raw) {
  const meta = parseSchedule(raw.notes);
  return {
    id: raw.id,
    title: raw.title ?? '',
    completed_at: raw.completed ? new Date(raw.completed) : new Date(),
    recurring: Boolean(meta?.logged), // logged = occurrence of a recurring task; undo hidden
  };
}

// ---------- normalization decisions (pure — unit tested) ----------

export function decideNormalization(raw, now = new Date()) {
  const meta = parseSchedule(raw.notes);

  if (raw.status === 'completed') {
    // Completed via the Google app/voice with live recurrence → resurrect.
    if (meta && !meta.logged && meta.recurrence_type !== 'once') {
      const taskLike = {
        recurrence_type: meta.recurrence_type,
        interval_days: meta.interval_days,
        days_of_week: meta.days_of_week,
        time_of_day: meta.time_of_day,
        next_due_at: raw.due ? composeDue(raw.due, meta.time_of_day) : now,
      };
      return {
        action: 'resurrect',
        successor: {
          title: raw.title,
          notes: setScheduleLine(raw.notes, serializeSchedule(meta)),
          due: advanceNextDue(taskLike, now),
        },
      };
    }
    return { action: 'none' };
  }

  if (meta) return { action: 'none' }; // already managed

  const parsed = parseCommand(raw.title || '', now);
  if (parsed.intent === 'add_task' && (parsed.hadRecurrence || parsed.explicitAdd)) {
    return {
      action: 'rewrite',
      title: parsed.title,
      schedule: {
        recurrence_type: parsed.recurrence.type,
        interval_days: parsed.recurrence.intervalDays ?? null,
        days_of_week: parsed.recurrence.daysOfWeek?.join(',') ?? null,
        time_of_day: parsed.timeOfDay,
        paused: false,
      },
      due: parsed.firstDueAt,
    };
  }
  if (parsed.intent === 'complete_task') {
    return { action: 'complete-statement', phrase: parsed.phrase };
  }
  return { action: 'none' };
}

// ---------- refresh & normalization pass ----------

async function ensureListId() {
  if (!listId) {
    listId = await api.resolveListId(listName());
    if (!listId) throw new Error(`Google Tasks list "${listName()}" not found`);
  }
  return listId;
}

async function fetchAll() {
  await ensureListId();
  const completedMin = new Date(Date.now() - COMPLETED_LOOKBACK_DAYS * 86_400_000).toISOString();
  const [pending, completed] = await Promise.all([
    api.listPendingTasks(listId),
    api.listCompletedTasks(listId, completedMin),
  ]);
  return [...pending, ...completed];
}

export async function refresh(force = false) {
  if (!isConfigured() || isDisabled()) throw new Error('Google Tasks bridge not configured');
  if (cache && !force && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (refreshing) return refreshing;
  refreshing = doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh() {
  let items = await fetchAll();
  const mutated = await normalizePass(items);
  if (mutated) items = await fetchAll();

  const pending = items.filter((t) => t.status === 'needsAction' && (t.title ?? '').trim());
  const completed = items.filter((t) => t.status === 'completed');
  cache = {
    tasks: pending.map(shapeTask),
    completions: completed.map(shapeCompletion).sort((a, b) => b.completed_at - a.completed_at),
    raw: new Map(items.map((t) => [t.id, t])),
    fetchedAt: Date.now(),
  };
  return cache;
}

async function normalizePass(items) {
  const now = new Date();
  let mutated = false;
  const pending = items.filter((t) => t.status === 'needsAction');

  for (const raw of items) {
    try {
      const decision = decideNormalization(raw, now);
      if (decision.action === 'rewrite') {
        await api.patchTask(listId, raw.id, {
          title: decision.title,
          notes: setScheduleLine(raw.notes, serializeSchedule(decision.schedule)),
          due: dueField(decision.due),
        });
        logCommand({ source: 'voice', raw_text: raw.title, intent: 'add_task', outcome: 'applied', task_title: decision.title });
        mutated = true;
      } else if (decision.action === 'complete-statement') {
        if (seenStatements.get(raw.id) === raw.updated) continue;
        const candidates = pending
          .filter((t) => t.id !== raw.id)
          .map((t) => ({ id: t.id, title: t.title, title_normalized: normalize(t.title ?? '') }));
        const result = fuzzyMatch(decision.phrase, candidates);
        if (result.outcome === 'matched') {
          await completeRaw(items.find((t) => t.id === result.match.id), now);
          await api.deleteTask(listId, raw.id);
          logCommand({ source: 'voice', raw_text: raw.title, intent: 'complete_task', outcome: 'applied', task_title: result.match.title });
          mutated = true;
        } else {
          seenStatements.set(raw.id, raw.updated);
          logCommand({
            source: 'voice',
            raw_text: raw.title,
            intent: 'complete_task',
            outcome: result.outcome === 'ambiguous' ? 'ambiguous' : 'no_match',
            detail: { scores: result.scored.slice(0, 5) },
          });
        }
      } else if (decision.action === 'resurrect') {
        await api.patchTask(listId, raw.id, { notes: setScheduleLine(raw.notes, LOGGED_LINE) });
        await api.insertTask(listId, {
          title: decision.successor.title,
          notes: decision.successor.notes,
          due: dueField(decision.successor.due),
        });
        logCommand({ source: 'voice', raw_text: `completed in Google: ${raw.title}`, intent: 'complete_task', outcome: 'applied', task_title: raw.title });
        mutated = true;
      }
    } catch (err) {
      console.error(`normalize: failed on "${raw.title}":`, err.message);
    }
  }
  return mutated;
}

// Complete a raw pending task. Recurring: tag the old copy [hc logged] as the
// history record and insert the successor. Once/plain: just mark completed.
async function completeRaw(raw, now) {
  const meta = parseSchedule(raw.notes);
  const recurring = Boolean(meta && !meta.logged && meta.recurrence_type !== 'once');

  if (recurring) {
    await api.patchTask(listId, raw.id, {
      status: 'completed',
      notes: setScheduleLine(raw.notes, LOGGED_LINE),
    });
    const taskLike = {
      recurrence_type: meta.recurrence_type,
      interval_days: meta.interval_days,
      days_of_week: meta.days_of_week,
      time_of_day: meta.time_of_day,
      next_due_at: raw.due ? composeDue(raw.due, meta.time_of_day) : now,
    };
    const successor = await api.insertTask(listId, {
      title: raw.title,
      notes: setScheduleLine(raw.notes, serializeSchedule(meta)),
      due: dueField(advanceNextDue(taskLike, now)),
    });
    return { successor, recurring: true };
  }

  await api.patchTask(listId, raw.id, { status: 'completed' });
  return { successor: null, recurring: false };
}

// ---------- public CRUD (used by services/routes) ----------

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.active !== b.active) return b.active - a.active;
    if (!a.next_due_at) return 1;
    if (!b.next_due_at) return -1;
    return a.next_due_at - b.next_due_at;
  });
}

export async function listTasks({ active = 'all' } = {}) {
  const { tasks } = await refresh();
  const filtered = active === 'all' ? tasks : tasks.filter((t) => t.active === Number(active));
  return sortTasks(filtered);
}

export async function getTask(id) {
  const { tasks } = await refresh();
  return tasks.find((t) => t.id === id) ?? null;
}

export async function listCompletions({ limit = 50 } = {}) {
  const { completions } = await refresh();
  return completions.slice(0, limit);
}

export async function createTask(
  { title, recurrence_type, interval_days = null, days_of_week = null, time_of_day = DEFAULT_TIME, first_due_at = null },
  now = new Date()
) {
  await ensureListId();
  const schedule = {
    recurrence_type,
    interval_days,
    days_of_week: Array.isArray(days_of_week) ? days_of_week.join(',') : days_of_week,
    time_of_day,
    paused: false,
  };
  const due = first_due_at ?? firstDueAt({ type: recurrence_type, daysOfWeek: schedule.days_of_week }, time_of_day, now);
  const raw = await api.insertTask(listId, {
    title,
    notes: serializeSchedule(schedule),
    due: dueField(due),
  });
  invalidate();
  return shapeTask(raw);
}

// A bare list item, exactly like typing into Google Tasks: no schedule
// metadata, no due date. Shows under All Tasks until the user schedules it.
export async function createPlainTask(title) {
  await ensureListId();
  const raw = await api.insertTask(listId, { title });
  invalidate();
  return shapeTask(raw);
}

export async function updateTask(id, fields, now = new Date()) {
  const { raw: rawMap } = await refresh();
  const raw = rawMap.get(id);
  if (!raw || raw.status !== 'needsAction') return null;

  const current = shapeTask(raw);
  const merged = {
    recurrence_type: fields.recurrence_type ?? current.recurrence_type,
    interval_days: fields.interval_days !== undefined ? fields.interval_days : current.interval_days,
    days_of_week:
      fields.days_of_week !== undefined
        ? Array.isArray(fields.days_of_week)
          ? fields.days_of_week.join(',') || null
          : fields.days_of_week
        : current.days_of_week,
    time_of_day: fields.time_of_day ?? current.time_of_day,
    paused: fields.active !== undefined ? !Number(fields.active) : current.active === 0,
  };

  const scheduleChanged =
    merged.recurrence_type !== current.recurrence_type ||
    merged.interval_days !== current.interval_days ||
    merged.days_of_week !== current.days_of_week ||
    merged.time_of_day !== current.time_of_day;

  const patch = {
    title: fields.title ?? raw.title,
    notes: setScheduleLine(raw.notes, serializeSchedule(merged)),
  };
  if (scheduleChanged || !raw.due) {
    const due = firstDueAt({ type: merged.recurrence_type, daysOfWeek: merged.days_of_week }, merged.time_of_day, now);
    patch.due = dueField(due);
  }

  const updated = await api.patchTask(listId, id, patch);
  invalidate();
  return shapeTask(updated);
}

export async function completeTask(id, now = new Date()) {
  const { raw: rawMap } = await refresh();
  const raw = rawMap.get(id);
  if (!raw) return { error: 'not_found' };
  if (raw.status !== 'needsAction') return { error: 'inactive' };

  const meta = parseSchedule(raw.notes);
  if (meta && !meta.logged && meta.paused) return { error: 'inactive' };

  const { successor, recurring } = await completeRaw(raw, now);
  invalidate();
  return {
    task: successor ? shapeTask(successor) : { ...shapeTask(raw), active: 0 },
    completion: { id: raw.id, title: raw.title, completed_at: now, recurring },
  };
}

export async function undoCompletion(id) {
  const { raw: rawMap } = await refresh();
  const raw = rawMap.get(id);
  if (!raw || raw.status !== 'completed') return { error: 'not_found' };
  if (parseSchedule(raw.notes)?.logged) return { error: 'recurring' }; // successor already exists

  await api.patchTask(listId, id, { status: 'needsAction', completed: null });
  invalidate();
  return { ok: true };
}

export async function deleteTaskById(id) {
  const { raw: rawMap } = await refresh();
  if (!rawMap.has(id)) return false;
  await api.deleteTask(listId, id);
  invalidate();
  return true;
}

export function invalidate() {
  cache = null;
}

export async function ping() {
  await refresh();
  return true;
}

// Keeps voice entries flowing into the console even when nobody is watching it.
// `onRefresh(tasks)` runs after each successful tick with the fresh shaped tasks.
export function startBackgroundRefresh(onRefresh) {
  if (!isConfigured()) {
    console.warn(
      'Google Tasks not configured (GOOGLE_CLIENT_ID/SECRET unset or tokens file missing) — the console has no data source until scripts/google-auth.js is run.'
    );
    return null;
  }
  const interval = Number(process.env.GOOGLE_POLL_INTERVAL_MS) || 60_000;
  const tick = () =>
    refresh(true)
      .then((c) =>
        Promise.resolve(onRefresh?.(c.tasks)).catch((err) =>
          console.error('post-refresh hook failed:', err.message)
        )
      )
      .catch((err) => console.error('background refresh failed:', err.message));
  tick();
  console.log(`Google Tasks store started: list "${listName()}", refresh every ${interval / 1000}s`);
  return setInterval(tick, interval);
}
