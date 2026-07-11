import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inPokeWindow, pendingRecurringTasks, formatPokeMessage, decidePoke } from '../src/time/poke.js';

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
