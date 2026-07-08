import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecurrence } from '../src/parser/recurrence.js';

const cases = [
  ['water plants every other day', { type: 'interval', intervalDays: 2 }, 'water plants'],
  ['mow lawn every other week', { type: 'interval', intervalDays: 14 }, 'mow lawn'],
  ['water plants every 3 days', { type: 'interval', intervalDays: 3 }, 'water plants'],
  ['water plants every three days', { type: 'interval', intervalDays: 3 }, 'water plants'],
  ['change filter every 2 weeks', { type: 'interval', intervalDays: 14 }, 'change filter'],
  ['feed fish every day', { type: 'interval', intervalDays: 1 }, 'feed fish'],
  ['feed fish daily', { type: 'interval', intervalDays: 1 }, 'feed fish'],
  ['vacuum weekly', { type: 'interval', intervalDays: 7 }, 'vacuum'],
  ['vacuum once a week', { type: 'interval', intervalDays: 7 }, 'vacuum'],
  ['trash every monday', { type: 'weekly', daysOfWeek: ['mon'] }, 'trash'],
  ['trash every monday and thursday', { type: 'weekly', daysOfWeek: ['mon', 'thu'] }, 'trash'],
  ['trash every mon, wed and fri', { type: 'weekly', daysOfWeek: ['mon', 'wed', 'fri'] }, 'trash'],
  ['trash each tuesday', { type: 'weekly', daysOfWeek: ['tue'] }, 'trash'],
  ['clean gutters once', { type: 'once' }, 'clean gutters'],
  ['clean gutters', { type: 'once' }, 'clean gutters'],
];

for (const [input, expected, remaining] of cases) {
  test(`"${input}"`, () => {
    const result = extractRecurrence(input);
    assert.deepEqual(result.recurrence, expected);
    assert.equal(result.remaining.replace(/\s+/g, ' ').trim(), remaining);
  });
}

test('every morning sets a default time hint', () => {
  const r = extractRecurrence('take vitamins every morning');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 1 });
  assert.equal(r.defaultTime, '09:00:00');
});

test('every night sets an evening default time', () => {
  const r = extractRecurrence('lock the doors every night');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 1 });
  assert.equal(r.defaultTime, '20:00:00');
});
