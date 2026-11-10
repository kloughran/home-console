import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inPokeWindow,
  pendingRecurringTasks,
  formatPokeMessage,
  decidePoke,
  isLongWindow,
  longWindowDoneToday,
} from '../src/time/poke.js';

// Wednesday, July 8 2026, noon local time
const NOW = new Date(2026, 6, 8, 12, 0, 0);
const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0);

const CONFIG = { days: 'mon,tue,wed,thu,fri', start: '09:00', end: '17:00', intervalMs: 7_200_000 };

const task = (over = {}) => ({
  title: 'Water plants',
  managed: true,
  active: 1,
  recurrence_type: 'interval',
  interval_days: 2,
  time_of_day: '09:00:00',
  next_due_at: local(2026, 7, 8, 9),
  ...over,
});

// ---------- inPokeWindow ----------

test('weekday inside the window pokes', () => {
  assert.equal(inPokeWindow(local(2026, 7, 8, 10), CONFIG), true);
});

test('window boundaries are inclusive, just outside is not', () => {
  assert.equal(inPokeWindow(local(2026, 7, 8, 8, 59), CONFIG), false);
  assert.equal(inPokeWindow(local(2026, 7, 8, 9, 0), CONFIG), true);
  assert.equal(inPokeWindow(local(2026, 7, 8, 17, 0), CONFIG), true);
  assert.equal(inPokeWindow(local(2026, 7, 8, 17, 1), CONFIG), false);
});

test('weekends are silent', () => {
  assert.equal(inPokeWindow(local(2026, 7, 11, 10), CONFIG), false); // Saturday
  assert.equal(inPokeWindow(local(2026, 7, 12, 10), CONFIG), false); // Sunday
});

test('custom day set is respected', () => {
  assert.equal(inPokeWindow(local(2026, 7, 11, 10), { ...CONFIG, days: 'sat,sun' }), true);
});

// ---------- pendingRecurringTasks ----------

test('overdue interval and due-earlier-today weekly tasks are pending', () => {
  const tasks = [
    task({ next_due_at: local(2026, 7, 6, 9) }),
    task({ recurrence_type: 'weekly', days_of_week: 'mon,wed', next_due_at: local(2026, 7, 8, 9) }),
  ];
  assert.equal(pendingRecurringTasks(tasks, NOW).length, 2);
});

test('task due later today is not pending yet', () => {
  assert.equal(pendingRecurringTasks([task({ next_due_at: local(2026, 7, 8, 15) })], NOW).length, 0);
});

test('once, paused, unmanaged, and undated tasks never poke', () => {
  const tasks = [
    task({ recurrence_type: 'once' }),
    task({ active: 0 }),
    task({ managed: false }),
    task({ next_due_at: null }),
  ];
  assert.equal(pendingRecurringTasks(tasks, NOW).length, 0);
});

// ---------- decidePoke ----------

test('sends on fresh start with a pending task', () => {
  const decision = decidePoke({ now: NOW, tasks: [task()], lastSentAt: null, config: CONFIG });
  assert.equal(decision.send, true);
  assert.equal(decision.title, '1 task waiting');
  assert.match(decision.message, /Water plants/);
});

test('nothing pending means no send even in-window', () => {
  const decision = decidePoke({ now: NOW, tasks: [], lastSentAt: null, config: CONFIG });
  assert.deepEqual(decision, { send: false, reason: 'nothing-pending' });
});

test('overdue tasks stay silent on the weekend', () => {
  const decision = decidePoke({
    now: local(2026, 7, 11, 10), // Saturday
    tasks: [task({ next_due_at: local(2026, 7, 6, 9) })],
    lastSentAt: null,
    config: CONFIG,
  });
  assert.deepEqual(decision, { send: false, reason: 'outside-window' });
});

test('re-pokes only after the cadence interval', () => {
  const args = { now: NOW, tasks: [task()], config: CONFIG };
  assert.equal(decidePoke({ ...args, lastSentAt: local(2026, 7, 8, 11) }).reason, 'too-soon');
  assert.equal(decidePoke({ ...args, lastSentAt: local(2026, 7, 8, 10) }).send, true); // exactly 2h
  assert.equal(decidePoke({ ...args, lastSentAt: local(2026, 7, 8, 9) }).send, true);
});

test('lastSentAt revived from persisted ISO string still counts', () => {
  const revived = new Date(local(2026, 7, 8, 11, 30).toISOString()); // restart 30min after a send
  const decision = decidePoke({ now: NOW, tasks: [task()], lastSentAt: revived, config: CONFIG });
  assert.equal(decision.reason, 'too-soon');
});

// ---------- long-window daily cap ----------

// Overdue long-window chore (interval > 7 days)
const gutters = () => task({ title: 'Clean gutters', interval_days: 14, next_due_at: local(2026, 7, 1, 9) });
// Successor of a long-window chore completed earlier today — due far in the future
const mowSuccessor = () => task({ title: 'Mow lawn', interval_days: 14, next_due_at: local(2026, 7, 22, 9) });
const mowedToday = () => ({ id: 'c1', title: 'Mow lawn', completed_at: local(2026, 7, 8, 10), recurring: true });

test('isLongWindow: over a week only, interval type only', () => {
  assert.equal(isLongWindow(task({ interval_days: 8 })), true);
  assert.equal(isLongWindow(task({ interval_days: 7 })), false);
  assert.equal(isLongWindow(task({ recurrence_type: 'weekly', interval_days: null, days_of_week: 'mon' })), false);
});

test('completing a long-window chore silences other long-window chores for the day', () => {
  const decision = decidePoke({
    now: NOW,
    tasks: [mowSuccessor(), gutters()],
    completions: [mowedToday()],
    lastSentAt: null,
    config: CONFIG,
  });
  assert.deepEqual(decision, { send: false, reason: 'nothing-pending' });
});

test('short-cadence chores still poke after a long-window completion', () => {
  const decision = decidePoke({
    now: NOW,
    tasks: [mowSuccessor(), gutters(), task()],
    completions: [mowedToday()],
    lastSentAt: null,
    config: CONFIG,
  });
  assert.equal(decision.send, true);
  assert.match(decision.message, /Water plants/);
  assert.doesNotMatch(decision.message, /Clean gutters/);
});

test('a long-window completion from yesterday does not suppress today', () => {
  const decision = decidePoke({
    now: NOW,
    tasks: [mowSuccessor(), gutters()],
    completions: [{ ...mowedToday(), completed_at: local(2026, 7, 7, 10) }],
    lastSentAt: null,
    config: CONFIG,
  });
  assert.equal(decision.send, true);
  assert.match(decision.message, /Clean gutters/);
});

test('completing a short-cadence chore does not suppress long-window chores', () => {
  const completions = [{ id: 'c2', title: 'Water plants', completed_at: local(2026, 7, 8, 10), recurring: true }];
  const tasks = [task({ next_due_at: local(2026, 7, 10, 9) }), gutters()];
  assert.equal(longWindowDoneToday(completions, tasks, NOW), false);
  const decision = decidePoke({ now: NOW, tasks, completions, lastSentAt: null, config: CONFIG });
  assert.equal(decision.send, true);
  assert.match(decision.message, /Clean gutters/);
});

test('a non-recurring completion with a matching title does not suppress', () => {
  const tasks = [mowSuccessor(), gutters()];
  assert.equal(longWindowDoneToday([{ ...mowedToday(), recurring: false }], tasks, NOW), false);
});

// ---------- formatPokeMessage ----------

test('title counts tasks and stays ASCII', () => {
  const one = formatPokeMessage([task()], NOW);
  assert.equal(one.title, '1 task waiting');
  const two = formatPokeMessage([task(), task({ title: 'Take out trash' })], NOW);
  assert.equal(two.title, '2 tasks waiting');
  assert.match(two.title, /^[\x20-\x7e]+$/);
});

test('message lines show due time today and overdue days', () => {
  const { message } = formatPokeMessage(
    [
      task({ next_due_at: local(2026, 7, 8, 9) }),
      task({ title: 'Take out trash', next_due_at: local(2026, 7, 7, 19) }),
      task({ title: 'Clean litter box', next_due_at: local(2026, 7, 6, 9) }),
    ],
    NOW
  );
  assert.deepEqual(message.split('\n'), [
    '• Water plants (due 9:00 AM)',
    '• Take out trash (overdue 1 day)',
    '• Clean litter box (overdue 2 days)',
  ]);
});

// ---------- poke lines (trash-talk tiers) ----------

const LINES = {
  tiers: [
    { minDays: 0, priority: 'default', titles: ['T0a', 'T0b'], insults: ['I0a', 'I0b'] },
    { minDays: 1, priority: 'high', titles: ['T1'], insults: ['I1'] },
    { minDays: 3, priority: 'urgent', titles: ['T3'], insults: ['I3'] },
  ],
};
const first = () => 0;
const last = () => 0.999;

test('due-today tasks draw from tier 0 with its priority, tasks first', () => {
  const out = formatPokeMessage([task()], NOW, LINES, first);
  assert.deepEqual(out, { title: 'T0a', message: '• Water plants (due 9:00 AM)\n\nI0a', priority: 'default' });
});

test('rng picks across the tier lists', () => {
  const out = formatPokeMessage([task()], NOW, LINES, last);
  assert.equal(out.title, 'T0b');
  assert.match(out.message, /\n\nI0b$/);
});

test('tier escalates with the most-overdue pending task', () => {
  const twoDays = formatPokeMessage([task({ next_due_at: local(2026, 7, 6, 9) })], NOW, LINES, first);
  assert.equal(twoDays.title, 'T1');
  assert.equal(twoDays.priority, 'high');

  const mixed = formatPokeMessage(
    [task(), task({ title: 'Take out trash', next_due_at: local(2026, 7, 4, 9) })], // due today + 4 days over
    NOW,
    LINES,
    first
  );
  assert.equal(mixed.title, 'T3');
  assert.equal(mixed.priority, 'urgent');
  assert.deepEqual(mixed.message.split('\n'), [
    '• Water plants (due 9:00 AM)',
    '• Take out trash (overdue 4 days)',
    '',
    'I3',
  ]);
});

test('decidePoke carries lines through to the sent payload', () => {
  const decision = decidePoke({ now: NOW, tasks: [task()], lastSentAt: null, config: CONFIG, lines: LINES, rng: first });
  assert.equal(decision.send, true);
  assert.equal(decision.title, 'T0a');
  assert.equal(decision.priority, 'default');
});

test('null or malformed lines fall back to the plain format', () => {
  const plain = formatPokeMessage([task()], NOW);
  for (const bad of [null, {}, { tiers: 'x' }, { tiers: [{ priority: 'high' }] }]) {
    assert.deepEqual(formatPokeMessage([task()], NOW, bad, first), plain);
  }
});

test('tier without titles keeps the plain count title; without insults keeps plain bullets', () => {
  const noTitles = formatPokeMessage([task()], NOW, { tiers: [{ minDays: 0, insults: ['I'] }] }, first);
  assert.equal(noTitles.title, '1 task waiting');
  assert.match(noTitles.message, /\n\nI$/);

  const noInsults = formatPokeMessage([task()], NOW, { tiers: [{ minDays: 0, titles: ['T'] }] }, first);
  assert.equal(noInsults.title, 'T');
  assert.equal(noInsults.message, '• Water plants (due 9:00 AM)');
});

test('non-latin-1 title chars are stripped; empty result falls back', () => {
  const emoji = formatPokeMessage([task()], NOW, { tiers: [{ minDays: 0, titles: ['DO 💢 IT'], insults: ['I'] }] }, first);
  assert.equal(emoji.title, 'DO  IT');

  const allEmoji = formatPokeMessage([task()], NOW, { tiers: [{ minDays: 0, titles: ['💢💢'], insults: ['I'] }] }, first);
  assert.equal(allEmoji.title, '1 task waiting');
});
