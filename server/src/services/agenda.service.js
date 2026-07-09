// Today's agenda across all visible Google Calendars, merged and cached.

import { listVisibleCalendars, listEventsForDay } from '../google/calendarApi.js';
import { addDays } from '../time/schedule.js';

const CACHE_TTL_MS = 5 * 60_000;
let cache = null; // { events, fetchedAt }

// Pure merge/sort: all-day events first (calendar order preserved), then
// timed events chronologically. Exported for tests.
export function mergeAgenda(perCalendar) {
  const events = [];
  for (const { calendar, items } of perCalendar) {
    for (const e of items) {
      if (e.status === 'cancelled') continue;
      const allDay = Boolean(e.start?.date);
      events.push({
        id: e.id,
        title: e.summary || '(untitled)',
        start: allDay ? e.start.date : e.start?.dateTime,
        end: allDay ? e.end?.date : e.end?.dateTime,
        allDay,
        calendar: calendar.name,
        color: calendar.color,
      });
    }
  }
  return events.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    if (a.allDay) return 0;
    return new Date(a.start) - new Date(b.start);
  });
}

export async function getTodayAgenda(now = new Date()) {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.events;

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);

  const calendars = await listVisibleCalendars();
  const perCalendar = await Promise.all(
    calendars.map(async (calendar) => ({
      calendar,
      items: await listEventsForDay(calendar.id, dayStart, dayEnd),
    }))
  );

  const events = mergeAgenda(perCalendar);
  cache = { events, fetchedAt: Date.now() };
  return events;
}
