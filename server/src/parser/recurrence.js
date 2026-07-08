// Recurrence phrase extraction. Ordered patterns; the first match wins and its
// text is removed from the string so the residue can become the task title.

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)';
const DAY = '(?:sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?';

function toNumber(s) {
  const n = WORD_NUMBERS[s.toLowerCase()];
  return n !== undefined ? n : parseInt(s, 10);
}

function toDayKey(token) {
  return token.toLowerCase().slice(0, 3); // monday→mon, thurs→thu, sat→sat
}

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const PATTERNS = [
  {
    re: /\bevery\s+other\s+day\b/i,
    make: () => ({ type: 'interval', intervalDays: 2 }),
  },
  {
    re: /\bevery\s+other\s+week\b/i,
    make: () => ({ type: 'interval', intervalDays: 14 }),
  },
  {
    re: new RegExp(`\\bevery\\s+${NUM}\\s+days?\\b`, 'i'),
    make: (m) => ({ type: 'interval', intervalDays: toNumber(m[1]) }),
  },
  {
    re: new RegExp(`\\bevery\\s+${NUM}\\s+weeks?\\b`, 'i'),
    make: (m) => ({ type: 'interval', intervalDays: toNumber(m[1]) * 7 }),
  },
  {
    re: /\b(?:every\s+day|everyday|daily|each\s+day)\b/i,
    make: () => ({ type: 'interval', intervalDays: 1 }),
  },
  {
    re: /\bevery\s+morning\b/i,
    make: () => ({ type: 'interval', intervalDays: 1, defaultTime: '09:00:00' }),
  },
  {
    re: /\bevery\s+evening\b/i,
    make: () => ({ type: 'interval', intervalDays: 1, defaultTime: '18:00:00' }),
  },
  {
    re: /\bevery\s+night\b/i,
    make: () => ({ type: 'interval', intervalDays: 1, defaultTime: '20:00:00' }),
  },
  {
    re: /\b(?:every\s+week|weekly|once\s+a\s+week)\b/i,
    make: () => ({ type: 'interval', intervalDays: 7 }),
  },
  {
    re: /\b(?:once|twice)\s+a\s+day\b/i,
    make: () => ({ type: 'interval', intervalDays: 1 }),
  },
  {
    re: new RegExp(`\\b(?:every|each)\\s+(${DAY}(?:\\s*(?:,|and|&)\\s*${DAY})*)\\b`, 'i'),
    make: (m) => {
      const tokens = m[1].match(new RegExp(DAY, 'gi')) || [];
      const days = [...new Set(tokens.map(toDayKey))].sort(
        (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
      );
      return { type: 'weekly', daysOfWeek: days };
    },
  },
  {
    re: /\b(?:just\s+once|one\s+time|once)\b/i,
    make: () => ({ type: 'once' }),
  },
];

// → { recurrence: {type, intervalDays?, daysOfWeek?}, defaultTime, remaining, matched }
export function extractRecurrence(text) {
  for (const { re, make } of PATTERNS) {
    const m = text.match(re);
    if (m) {
      const { defaultTime = null, ...recurrence } = make(m);
      const remaining = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).trim();
      return { recurrence, defaultTime, remaining, matched: m[0] };
    }
  }
  return { recurrence: { type: 'once' }, defaultTime: null, remaining: text, matched: null };
}
