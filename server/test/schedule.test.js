import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceNextDue, nextWeeklyOccurrence, firstDueAt, atTime } from '../src/time/schedule.js';

// Wednesday, July 8 2026, noon local time
const NOW = new Date(2026, 6, 8, 12, 0, 0);
const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0);

test('once tasks return null (deactivate)', () => {
  assert.equal(advanceNextDue({ recurrence_type: 'once' }, NOW), null);
});

test('interval advances from the scheduled time, not completion time', () => {
  const task = {
    recurrence_type: 'interval',
    interval_days: 2,
    time_of_day: '09:00:00',
    next_due_at: local(2026, 7, 8, 9),
  };
  assert.deepEqual(advanceNextDue(task, NOW), local(2026, 7, 10, 9));
});

test('interval catches up when completed long overdue', () => {
  const task = {
    recurrence_type: 'interval',
    interval_days: 2,
    time_of_day: '09:00:00',
    next_due_at: local(2026, 7, 1, 9),
  };
  // Jul 3, 5, 7 are all <= now; first future occurrence is Jul 9
  assert.deepEqual(advanceNextDue(task, NOW), local(2026, 7, 9, 9));
});

test('interval crosses month boundaries', () => {
  const task = {
    recurrence_type: 'interval',
    interval_days: 1,
    time_of_day: '09:00:00',
    next_due_at: local(2026, 7, 31, 9),
  };
  assert.deepEqual(advanceNextDue(task, local(2026, 7, 31, 12)), local(2026, 8, 1, 9));
});

test('weekly advances to next scheduled weekday', () => {
  const task = {
    recurrence_type: 'weekly',
    days_of_week: 'mon,thu',
    time_of_day: '19:00:00',
    next_due_at: local(2026, 7, 2, 19), // last Thursday, overdue
  };
  assert.deepEqual(advanceNextDue(task, NOW), local(2026, 7, 9, 19)); // Thu Jul 9
});

test('weekly completed early skips to the occurrence after next_due_at', () => {
  const task = {
    recurrence_type: 'weekly',
    days_of_week: 'mon,thu',
    time_of_day: '19:00:00',
    next_due_at: local(2026, 7, 9, 19), // due Thursday, completed Wednesday
  };
  assert.deepEqual(advanceNextDue(task, NOW), local(2026, 7, 13, 19)); // Mon Jul 13
});

test('nextWeeklyOccurrence allows today if the time has not passed', () => {
  assert.deepEqual(
    nextWeeklyOccurrence('wed', '20:00:00', NOW),
    local(2026, 7, 8, 20)
  );
});

test('firstDueAt: today at time if still future, else tomorrow', () => {
  assert.deepEqual(firstDueAt({ type: 'interval' }, '15:00:00', NOW), local(2026, 7, 8, 15));
  assert.deepEqual(firstDueAt({ type: 'interval' }, '09:00:00', NOW), local(2026, 7, 9, 9));
});

test('firstDueAt weekly picks the next matching weekday', () => {
  assert.deepEqual(
    firstDueAt({ type: 'weekly', daysOfWeek: ['mon', 'thu'] }, '19:00:00', NOW),
    local(2026, 7, 9, 19)
  );
});

test('atTime sets the local wall-clock time', () => {
  assert.deepEqual(atTime(local(2026, 7, 8), '09:30:00'), local(2026, 7, 8, 9, 30));
});
