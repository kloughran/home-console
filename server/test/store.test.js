import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideNormalization, shapeTask, composeDue, dueField } from '../src/google/store.js';

// Wednesday, July 8 2026, noon local time
const NOW = new Date(2026, 6, 8, 12, 0, 0);
const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0);

const raw = (over = {}) => ({
  id: 'g1',
  title: 'a task',
  notes: '',
  status: 'needsAction',
  due: null,
  updated: '2026-07-08T12:00:00.000Z',
  ...over,
});

test('voice add with schedule phrase → rewrite', () => {
  const d = decideNormalization(raw({ title: 'water my coleus every other day at 9am' }), NOW);
  assert.equal(d.action, 'rewrite');
  assert.equal(d.title, 'water my coleus');
  assert.equal(d.schedule.recurrence_type, 'interval');
  assert.equal(d.schedule.interval_days, 2);
  assert.equal(d.schedule.time_of_day, '09:00:00');
  assert.deepEqual(d.due, local(2026, 7, 9, 9));
});

test('completion statement → complete-statement', () => {
  const d = decideNormalization(raw({ title: 'I watered my coleus' }), NOW);
  assert.equal(d.action, 'complete-statement');
  assert.equal(d.phrase, 'watered my coleus');
});

test('personal items are never touched', () => {
  for (const title of [
    'Cancel Kindle Unlimited',
    'say we go',
    'get a firearm as a gift for housewarming',
    'may flowers', // chrono can see a month here — must still be left alone
    'buy milk',
  ]) {
    assert.equal(decideNormalization(raw({ title }), NOW).action, 'none', title);
  }
});

test('plain dated reminder (from "remind me to X on friday") is untouched', () => {
  const d = decideNormalization(raw({ title: 'pick up dry cleaning', due: '2026-07-10T00:00:00.000Z' }), NOW);
  assert.equal(d.action, 'none');
});

test('managed pending task is untouched', () => {
  const d = decideNormalization(
    raw({ title: 'water my coleus', notes: '[hc every 2 days at 09:00]', due: '2026-07-09T00:00:00.000Z' }),
    NOW
  );
  assert.equal(d.action, 'none');
});

test('recurring task completed in Google → resurrect with advanced due', () => {
  const d = decideNormalization(
    raw({
      title: 'water my coleus',
      notes: '[hc every 2 days at 09:00]',
      status: 'completed',
      due: '2026-07-08T00:00:00.000Z',
      completed: '2026-07-08T11:00:00.000Z',
    }),
    NOW
  );
  assert.equal(d.action, 'resurrect');
  assert.equal(d.successor.title, 'water my coleus');
  assert.deepEqual(d.successor.due, local(2026, 7, 10, 9)); // Jul 8 + 2 days
  assert.match(d.successor.notes, /\[hc every 2 days at 09:00\]/);
});

test('completed once/logged/plain tasks are not resurrected', () => {
  assert.equal(
    decideNormalization(raw({ notes: '[hc once at 09:00]', status: 'completed' }), NOW).action,
    'none'
  );
  assert.equal(
    decideNormalization(raw({ notes: '[hc logged]', status: 'completed' }), NOW).action,
    'none'
  );
  assert.equal(decideNormalization(raw({ status: 'completed' }), NOW).action, 'none');
});

test('shapeTask: managed task composes next_due_at from due date + metadata time', () => {
  const t = shapeTask(
    raw({ title: 'trash', notes: '[hc every mon,thu at 19:00]', due: '2026-07-09T00:00:00.000Z' })
  );
  assert.equal(t.managed, true);
  assert.equal(t.recurrence_type, 'weekly');
  assert.equal(t.days_of_week, 'mon,thu');
  assert.deepEqual(t.next_due_at, local(2026, 7, 9, 19));
  assert.equal(t.active, 1);
});

test('shapeTask: paused task is inactive', () => {
  const t = shapeTask(raw({ notes: '[hc paused every 2 days at 09:00]', due: '2026-07-09T00:00:00.000Z' }));
  assert.equal(t.active, 0);
  assert.equal(t.managed, true);
});

test('shapeTask: plain tasks are unmanaged one-shots', () => {
  const dated = shapeTask(raw({ title: 'dentist', due: '2026-07-10T00:00:00.000Z' }));
  assert.equal(dated.managed, false);
  assert.equal(dated.recurrence_type, 'once');
  assert.deepEqual(dated.next_due_at, local(2026, 7, 10, 9));

  const undated = shapeTask(raw({ title: 'someday item' }));
  assert.equal(undated.next_due_at, null);
});

test('due round-trip: local date → due field → composed datetime', () => {
  const due = dueField(local(2026, 7, 9, 19));
  assert.equal(due, '2026-07-09T00:00:00.000Z');
  assert.deepEqual(composeDue(due, '19:00:00'), local(2026, 7, 9, 19));
});
