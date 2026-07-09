import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeWmoCode } from '../src/services/weather.service.js';
import { mergeAgenda } from '../src/services/agenda.service.js';

test('WMO codes map to labels and icon kinds', () => {
  assert.deepEqual(describeWmoCode(0), { label: 'Clear', kind: 'sun' });
  assert.deepEqual(describeWmoCode(2), { label: 'Partly cloudy', kind: 'cloud' });
  assert.deepEqual(describeWmoCode(45), { label: 'Fog', kind: 'fog' });
  assert.deepEqual(describeWmoCode(63), { label: 'Rain', kind: 'rain' });
  assert.deepEqual(describeWmoCode(75), { label: 'Heavy snow', kind: 'snow' });
  assert.deepEqual(describeWmoCode(95), { label: 'Thunderstorm', kind: 'storm' });
  assert.deepEqual(describeWmoCode(9999), { label: '—', kind: 'cloud' }); // unknown
});

test('mergeAgenda: all-day first, timed events chronological across calendars', () => {
  const perCalendar = [
    {
      calendar: { name: 'Personal', color: '#16a765' },
      items: [
        { id: 'p1', summary: 'Dentist', start: { dateTime: '2026-07-09T15:00:00-05:00' }, end: { dateTime: '2026-07-09T16:00:00-05:00' } },
        { id: 'p2', summary: 'Trash day', start: { date: '2026-07-09' }, end: { date: '2026-07-10' } },
      ],
    },
    {
      calendar: { name: 'Family', color: '#4986e7' },
      items: [
        { id: 'f1', summary: 'School pickup', start: { dateTime: '2026-07-09T14:30:00-05:00' }, end: { dateTime: '2026-07-09T15:00:00-05:00' } },
        { id: 'f2', summary: 'Cancelled thing', status: 'cancelled', start: { dateTime: '2026-07-09T10:00:00-05:00' } },
      ],
    },
  ];

  const events = mergeAgenda(perCalendar);
  assert.deepEqual(
    events.map((e) => e.id),
    ['p2', 'f1', 'p1'] // all-day first, then 14:30 before 15:00; cancelled dropped
  );
  assert.equal(events[0].allDay, true);
  assert.equal(events[1].calendar, 'Family');
  assert.equal(events[2].color, '#16a765');
});

test('mergeAgenda: untitled events get a placeholder', () => {
  const events = mergeAgenda([
    { calendar: { name: 'X', color: null }, items: [{ id: 'e', start: { dateTime: '2026-07-09T09:00:00-05:00' } }] },
  ]);
  assert.equal(events[0].title, '(untitled)');
});
