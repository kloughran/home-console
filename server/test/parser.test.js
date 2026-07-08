import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../src/parser/index.js';

// Wednesday, July 8 2026, noon local time
const NOW = new Date(2026, 6, 8, 12, 0, 0);
const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0);

test('canonical add: "water my coleus every other day at 9am"', () => {
  const r = parseCommand('water my coleus every other day at 9am', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'water my coleus');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 2 });
  assert.equal(r.timeOfDay, '09:00:00');
  assert.deepEqual(r.firstDueAt, local(2026, 7, 9, 9)); // 9am already passed today
});

test('full phrasing with app name: "add a task to my home console to water my coleus every other day at 9am"', () => {
  const r = parseCommand('add a task to my home console to water my coleus every other day at 9am', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'water my coleus');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 2 });
  assert.equal(r.timeOfDay, '09:00:00');
});

test('canonical complete: "I watered my coleus"', () => {
  const r = parseCommand('I watered my coleus', NOW);
  assert.equal(r.intent, 'complete_task');
  assert.equal(r.phrase, 'watered my coleus');
});

test('weekly multi-day: "remind me to take out the trash every monday and thursday at 7pm"', () => {
  const r = parseCommand('remind me to take out the trash every monday and thursday at 7pm', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'take out the trash');
  assert.deepEqual(r.recurrence, { type: 'weekly', daysOfWeek: ['mon', 'thu'] });
  assert.equal(r.timeOfDay, '19:00:00');
  assert.deepEqual(r.firstDueAt, local(2026, 7, 9, 19)); // Thursday
});

test('daily with time still ahead today: "feed the fish every day at 8pm"', () => {
  const r = parseCommand('feed the fish every day at 8pm', NOW);
  assert.equal(r.intent, 'add_task');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 1 });
  assert.deepEqual(r.firstDueAt, local(2026, 7, 8, 20));
});

test('one-shot with explicit date: "clean the gutters on saturday at 10am"', () => {
  const r = parseCommand('clean the gutters on saturday at 10am', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'clean the gutters');
  assert.deepEqual(r.recurrence, { type: 'once' });
  assert.deepEqual(r.firstDueAt, local(2026, 7, 11, 10)); // Saturday Jul 11
});

test('every morning default time', () => {
  const r = parseCommand('take vitamins every morning', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'take vitamins');
  assert.equal(r.timeOfDay, '09:00:00');
});

test('complete variants', () => {
  assert.equal(parseCommand('mark the dishes as done', NOW).intent, 'complete_task');
  assert.equal(parseCommand('finished the dishes', NOW).intent, 'complete_task');
  assert.equal(parseCommand('did the laundry', NOW).intent, 'complete_task');
  assert.equal(parseCommand('done with the dishes', NOW).intent, 'complete_task');
  assert.equal(parseCommand('i just fed the fish', NOW).intent, 'complete_task');
  assert.equal(parseCommand("I've finished the laundry", NOW).phrase, 'the laundry');
});

test('"check" is a task verb, not a completion: "check the mailbox every day at 5pm"', () => {
  const r = parseCommand('check the mailbox every day at 5pm', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'check the mailbox');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 1 });
  assert.equal(r.timeOfDay, '17:00:00');
});

test('past tense "checked" still completes', () => {
  assert.equal(parseCommand('checked the mailbox', NOW).intent, 'complete_task');
  assert.equal(parseCommand('check off the laundry', NOW).intent, 'complete_task');
});

test('completion lead-in with a schedule is an add: "mark the calendar every monday"', () => {
  const r = parseCommand('mark the calendar every monday', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'mark the calendar');
  assert.deepEqual(r.recurrence, { type: 'weekly', daysOfWeek: ['mon'] });
});

test('first-person add drops the pronoun: "I water my coleus every other day at 9am"', () => {
  const r = parseCommand('I water my coleus every other day at 9am', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'water my coleus');
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 2 });
});

test('word numbers: "change hvac filter every two weeks"', () => {
  const r = parseCommand('change hvac filter every two weeks', NOW);
  assert.deepEqual(r.recurrence, { type: 'interval', intervalDays: 14 });
});

test('bare text with no schedule or lead-in is unknown', () => {
  assert.equal(parseCommand('hello world', NOW).intent, 'unknown');
  assert.equal(parseCommand('', NOW).intent, 'unknown');
  assert.equal(parseCommand('   ', NOW).intent, 'unknown');
});

test('explicit add without schedule defaults to once', () => {
  const r = parseCommand('add a task to clean the garage', NOW);
  assert.equal(r.intent, 'add_task');
  assert.equal(r.title, 'clean the garage');
  assert.deepEqual(r.recurrence, { type: 'once' });
});

test('title stripping leaves no dangling connectors', () => {
  const r = parseCommand('water the plants every 3 days at 9am', NOW);
  assert.equal(r.title, 'water the plants');
});
