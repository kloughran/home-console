import type { AgendaEvent } from '../api/types';

const RECENT_WINDOW_MS = 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

export type EventState = 'ended' | 'active' | 'normal';

export function eventEnd(event: AgendaEvent): Date {
  return new Date(event.end ?? event.start);
}

// Timed events vanish an hour after they end; within that hour they linger
// highlighted purple ('ended'). Timed events happening right now show green
// ('active') — unless they span a day or more. All-day events always show,
// unhighlighted.
export function isVisible(event: AgendaEvent, now: Date): boolean {
  if (event.allDay) return true;
  return eventEnd(event).getTime() >= now.getTime() - RECENT_WINDOW_MS;
}

export function eventState(event: AgendaEvent, now: Date): EventState {
  if (event.allDay) return 'normal';
  const start = new Date(event.start);
  const end = eventEnd(event);
  if (end < now) return 'ended';
  if (start <= now && end.getTime() - start.getTime() < DAY_MS) return 'active';
  return 'normal';
}
