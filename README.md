# Home Console

A kiosk-style frontend for your **normal Google Tasks list**. Recurring chores
("water my coleus every other day at 9am") show up on the dashboard when due and get
marked complete by voice or touch. Google Tasks is the only data store — there is no
database.

## How it works

The Google Tasks API can't express recurrence, and its due dates are date-only. The
console works around both by keeping a schedule line in each managed task's notes:

```
[hc every 2 days at 09:00]      [hc every mon,thu at 19:00]      [hc once at 10:00]
```

- **Completing a recurring task** (from the console *or* the Google Tasks app) marks the
  old copy completed (its notes become `[hc logged]` — the history record) and inserts a
  successor at the next occurrence.
- **Voice/raw entries** are normalized on the next refresh (≤60s): a title containing a
  schedule phrase ("sweep the garage every saturday at 10am") is rewritten in place into
  a managed task; a completion statement ("I swept the garage") completes the matching
  task and the statement is consumed.
- **Personal items are never touched.** Entries that don't parse as commands stay
  exactly as they are; dated ones ("remind me to X on friday") appear on the dashboard
  as one-time tasks, undated ones only under All Tasks.

Voice usage from any Google Home speaker — no special phrasing needed:

- *"Hey Google, remind me to check the mailbox"* → appears on the console
- *"Hey Google, add 'water my coleus every other day at 9am' to my tasks"* → recurring console task
- *"Hey Google, add 'I watered my coleus' to my tasks"* → completes the task

## Stack

| Piece | Tech |
|---|---|
| Server | Node 22, Express 4 (ESM), chrono-node; Google Tasks API v1 over raw fetch |
| Client | React 19 + TypeScript + Vite + Tailwind 4 + TanStack Query |
| Store | The user's `@default` Google Tasks list (OAuth2 refresh token) |

## Command grammar (typed into the console or spoken via Google)

- Recurrence: `every other day`, `every 3 days`, `every two weeks`, `daily`,
  `every morning/evening/night`, `weekly`, `every monday and thursday`, `once` (default)
- Time: `at 9am`, `at 7:30 pm` (default 9:00 AM); one-shot dates: `on saturday`, `tomorrow`
- Complete: `I watered the coleus`, `finished the dishes`, `mark the trash as done`

Parse results (including near-miss scores) are on **History → Command log** (in-memory,
resets with the server).

## API

| Route | What |
|---|---|
| `GET /api/health` | liveness + Google connectivity |
| `GET /api/dashboard` | `{ overdue, dueToday, dueSoon, doneToday, now }` |
| `GET/POST /api/tasks`, `PUT/DELETE /api/tasks/:id` | CRUD over the Google list (ids are Google task ids) |
| `POST /api/tasks/:id/complete` | complete; recurring tasks advance + leave a history copy |
| `GET /api/completions` | completed tasks (last 30 days), `DELETE /:id` undoes non-recurring ones |
| `POST /api/commands {text}` | natural-language command (same parser as voice normalization) |
| `GET /api/command-log` | in-memory parse audit trail (since restart) |

Notes: all day-boundary math runs in the Node process (`TZ=America/Chicago` in the
container); the store caches Google reads for ~20s and background-refreshes every 60s,
so voice entries appear within a minute. If the internet is down the console has no
data source until connectivity returns.
