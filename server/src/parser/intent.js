// Intent classification: is this command completing an existing task,
// adding a new one, or neither? Ordered rules; first match wins.

const COMPLETE_TAIL = /\s+(?:is|as)\s+(?:done|complete|completed|finished)\s*[.!]?$/i;
// Bare present-tense "check" is deliberately NOT a completion lead-in — it's a
// common task verb ("check the mailbox every day"). Past tense and "check off"
// are unambiguous completions.
const COMPLETE_LEAD = /^(?:mark|check(?:ed)?\s+off|checked|complete[d]?|finish(?:ed)?|done(?:\s+with)?|did)\s+/i;
const FIRST_PERSON = /^(?:i\s+just|i've|ive|i\s+have|i|we\s+just|we've|we\s+have|we|just)\s+/i;
const ADD_LEAD = /^(?:add(?:\s+a)?(?:\s+new)?\s+task(?:\s+to)?|add|create(?:\s+a)?(?:\s+new)?\s+task(?:\s+to)?|create|new\s+task:?|schedule|remind\s+me\s+to|remember\s+to)\s+/i;
// "add a task to my home console to water..." — the app name is noise
const CONSOLE_NOISE = /\b(?:to|on|in)\s+(?:my\s+|the\s+)?home\s+console(?:\s+list)?\s*(?:to\s+)?/i;

// → { intent: 'complete_task' | 'add_task' | 'implicit', remainder, cleaned, firstPerson? }
// `cleaned` is the full noise-stripped text, so the caller can reparse as an
// add when a "completion" turns out to carry a schedule.
export function classifyIntent(text) {
  let t = text.trim().replace(CONSOLE_NOISE, ' ').replace(/\s+/g, ' ').trim();

  const tail = t.match(COMPLETE_TAIL);
  if (tail) {
    let phrase = t.slice(0, tail.index);
    phrase = phrase.replace(COMPLETE_LEAD, '');
    return { intent: 'complete_task', remainder: phrase, cleaned: t };
  }

  const lead = t.match(COMPLETE_LEAD);
  if (lead) {
    return { intent: 'complete_task', remainder: t.slice(lead[0].length), cleaned: t };
  }

  const fp = t.match(FIRST_PERSON);
  if (fp) {
    let rest = t.slice(fp[0].length).replace(/^(?:already|finally|also)\s+/i, '');
    // "I need to add a task..." is an add despite the first-person opener
    const nestedAdd = rest.replace(/^(?:want\s+to|need\s+to|would\s+like\s+to)\s+/i, '').match(ADD_LEAD);
    if (nestedAdd) {
      const stripped = rest.replace(/^(?:want\s+to|need\s+to|would\s+like\s+to)\s+/i, '');
      return { intent: 'add_task', remainder: stripped.slice(nestedAdd[0].length), cleaned: t };
    }
    // "I've finished the laundry" — drop the completion verb too
    return {
      intent: 'complete_task',
      remainder: rest.replace(COMPLETE_LEAD, ''),
      cleaned: t,
      firstPerson: true,
    };
  }

  const add = t.match(ADD_LEAD);
  if (add) {
    return { intent: 'add_task', remainder: t.slice(add[0].length), cleaned: t };
  }

  // No explicit lead-in: caller decides based on recurrence/date content.
  return { intent: 'implicit', remainder: t, cleaned: t };
}
