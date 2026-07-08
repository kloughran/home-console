import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeSchedule,
  parseSchedule,
  stripScheduleLine,
  setScheduleLine,
  LOGGED_LINE,
} from '../src/google/metadata.js';

const schedules = [
  { recurrence_type: 'once', interval_days: null, days_of_week: null, time_of_day: '09:00:00', paused: false },
  { recurrence_type: 'interval', interval_days: 1, days_of_week: null, time_of_day: '08:00:00', paused: false },
  { recurrence_type: 'interval', interval_days: 2, days_of_week: null, time_of_day: '09:00:00', paused: false },
  { recurrence_type: 'interval', interval_days: 14, days_of_week: null, time_of_day: '17:30:00', paused: true },
  { recurrence_type: 'weekly', interval_days: null, days_of_week: 'mon,thu', time_of_day: '19:00:00', paused: false },
  { recurrence_type: 'weekly', interval_days: null, days_of_week: 'sat', time_of_day: '11:00:00', paused: true },
];

for (const schedule of schedules) {
  test(`round-trip: ${serializeSchedule(schedule)}`, () => {
    assert.deepEqual(parseSchedule(serializeSchedule(schedule)), schedule);
  });
}

test('serialized lines are human-readable', () => {
  assert.equal(serializeSchedule(schedules[2]), '[hc every 2 days at 09:00]');
  assert.equal(serializeSchedule(schedules[4]), '[hc every mon,thu at 19:00]');
  assert.equal(serializeSchedule(schedules[3]), '[hc paused every 14 days at 17:30]');
});

test('logged marker parses and is distinct from schedules', () => {
  assert.deepEqual(parseSchedule(LOGGED_LINE), { logged: true });
});

test('parseSchedule finds the line among other note text', () => {
  const notes = 'buy the big bag\n[hc every 2 days at 09:00]\nfrom the garden store';
  assert.equal(parseSchedule(notes).interval_days, 2);
});

test('plain notes / garbage hc lines return null', () => {
  assert.equal(parseSchedule('just a normal note'), null);
  assert.equal(parseSchedule(''), null);
  assert.equal(parseSchedule(null), null);
  assert.equal(parseSchedule('[hc every 0 days at 09:00]'), null);
  assert.equal(parseSchedule('[hc every xyz at 09:00]'), null);
});

test('stripScheduleLine preserves other note text', () => {
  const notes = 'keep me\n[hc every 2 days at 09:00]\nand me';
  assert.equal(stripScheduleLine(notes), 'keep me\nand me');
  assert.equal(stripScheduleLine('[hc logged]'), '');
});

test('setScheduleLine replaces an existing hc line', () => {
  const notes = 'user note\n[hc once at 09:00]';
  const updated = setScheduleLine(notes, '[hc every 3 days at 10:00]');
  assert.equal(updated, '[hc every 3 days at 10:00]\nuser note');
  assert.equal(parseSchedule(updated).interval_days, 3);
});
