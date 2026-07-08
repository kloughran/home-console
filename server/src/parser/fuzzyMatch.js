// Fuzzy matching of a completion phrase ("watered my coleus") against active
// task titles. Pure: takes candidates as data, returns scores — no DB access.

import { normalizeTokens } from './normalize.js';

const ACCEPT_SCORE = 0.6;
const ACCEPT_MARGIN = 0.15;

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

function tokenSim(a, b) {
  if (a === b) return 1;
  return Math.max(0, 1 - levenshtein(a, b) / Math.max(a.length, b.length));
}

function directionalScore(from, to) {
  if (from.length === 0 || to.length === 0) return 0;
  let sum = 0;
  for (const t of from) {
    let best = 0;
    for (const u of to) best = Math.max(best, tokenSim(t, u));
    sum += best;
  }
  return sum / from.length;
}

export function scorePhrase(phraseTokens, titleTokens) {
  return (directionalScore(phraseTokens, titleTokens) + directionalScore(titleTokens, phraseTokens)) / 2;
}

// candidates: [{ id, title, title_normalized, ... }] — title_normalized is
// already normalized, so it is only split here, never re-normalized.
export function fuzzyMatch(phrase, candidates) {
  const phraseTokens = normalizeTokens(phrase);
  const scored = candidates
    .map((c) => ({
      id: c.id,
      title: c.title,
      score: Number(scorePhrase(phraseTokens, String(c.title_normalized || '').split(' ').filter(Boolean)).toFixed(3)),
    }))
    .sort((x, y) => y.score - x.score);

  const [best, second] = scored;
  if (!best || best.score < ACCEPT_SCORE) return { outcome: 'no_match', match: null, scored };
  if (second && second.score >= ACCEPT_SCORE && best.score - second.score < ACCEPT_MARGIN) {
    return { outcome: 'ambiguous', match: null, scored };
  }
  return { outcome: 'matched', match: best, scored };
}
