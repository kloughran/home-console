// Minimal Google Calendar API v3 client over raw fetch — read-only, for the
// sidebar agenda. https://developers.google.com/calendar/api/v3/reference

import { getAccessToken } from './auth.js';

const BASE = 'https://www.googleapis.com/calendar/v3';

async function gfetch(path) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Google Calendar API ${res.status} on ${path}: ${JSON.stringify(data)}`);
  return data;
}

// Calendars the user has checked in the Google Calendar sidebar.
export async function listVisibleCalendars() {
  const data = await gfetch('/users/me/calendarList?maxResults=100');
  return (data.items || [])
    .filter((c) => c.selected)
    .map((c) => ({ id: c.id, name: c.summaryOverride ?? c.summary, color: c.backgroundColor ?? null }));
}

export async function listEventsForDay(calendarId, dayStart, dayEnd) {
  const params = new URLSearchParams({
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  const data = await gfetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return data.items || [];
}
