// parseCommand(text, now) — turn a voice/text command into a structured intent.
//
//   "water my coleus every other day at 9am"
//     → { intent: 'add_task', title, recurrence, timeOfDay, firstDueAt }
//   "I watered my coleus"
//     → { intent: 'complete_task', phrase: 'watered my coleus' }
//
// Pure: `now` is injected, no DB access. Matching the phrase against real
// tasks happens in commands.service.js via fuzzyMatch.

import { classifyIntent } from './intent.js';
import { extractRecurrence } from './recurrence.js';
import { extractTime } from './timeOfDay.js';
import { atTime, firstDueAt } from '../time/schedule.js';

const DEFAULT_TIME = '09:00:00';

function cleanupTitle(s) {
  let t = s.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2; i++) {
    t = t
      .replace(/^(?:to|and|,|-|:)\s+/i, '')
      .replace(/\s+(?:at|on|in|by|and|,|-)$/i, '')
      .trim();
  }
  return t.replace(/^["']+|["']+$/g, '').trim();
}

export function parseCommand(text, now = new Date()) {
  const raw = String(text || '');
  const trimmed = raw.trim();
  if (!trimmed) return { intent: 'unknown', reason: 'empty command', raw };

  const classified = classifyIntent(trimmed);
  let { intent, remainder } = classified;

  if (intent === 'complete_task') {
    // Completion statements never carry schedules — "mark the calendar every
    // monday" is an add. First-person adds ("I water my coleus every other
    // day") drop the pronoun; explicit verbs stay in the title.
    if (extractRecurrence(remainder).matched) {
      intent = 'add_task';
      remainder = classified.firstPerson ? remainder : classified.cleaned;
    } else {
      const phrase = cleanupTitle(remainder);
      if (!phrase) return { intent: 'unknown', reason: 'nothing to complete', raw };
      return { intent: 'complete_task', phrase, raw };
    }
  }

  const { recurrence, defaultTime, remaining: afterRecurrence, matched } = extractRecurrence(remainder);
  const { remaining: afterTime, timeOfDay: parsedTime, explicitDate } = extractTime(afterRecurrence, now);

  // Bare text with no command lead-in, no recurrence phrase, and no date/time
  // is not a command we can act on.
  if (intent === 'implicit' && !matched && !parsedTime && !explicitDate) {
    return { intent: 'unknown', reason: 'no recognizable command pattern', raw };
  }

  const timeOfDay = parsedTime ?? defaultTime ?? DEFAULT_TIME;
  const title = cleanupTitle(afterTime);
  if (!title) return { intent: 'unknown', reason: 'empty title', raw };

  let due;
  if (explicitDate && recurrence.type !== 'weekly') {
    due = atTime(explicitDate, timeOfDay); // "clean gutters on saturday at 10am"
  } else {
    due = firstDueAt(recurrence, timeOfDay, now);
  }

  return {
    intent: 'add_task',
    title,
    recurrence,
    timeOfDay,
    firstDueAt: due,
    raw,
    // How confident an add this is — normalization only rewrites Google Tasks
    // entries when the schedule was spelled out or the lead-in was explicit,
    // never on a bare chrono date ("may flowers" must stay untouched).
    hadRecurrence: Boolean(matched),
    explicitAdd: classified.intent === 'add_task',
  };
}
