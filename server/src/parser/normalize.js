// Text normalization shared by title storage (tasks.title_normalized) and the
// fuzzy completion matcher. Both sides must use the same rules, and normalized
// text must never be normalized a second time (stemming is not idempotent).

const STOPWORDS = new Set(['the', 'a', 'an', 'my', 'our', 'to', 'please', 'i', 'of', 'for']);
const VOWELS = 'aeiou';

// Light stemmer: watered→water, dishes→dish, gutters→gutter, running→run.
export function stem(token) {
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (token.length > suffix.length && token.endsWith(suffix)) {
      let stemmed = token.slice(0, -suffix.length);
      if (stemmed.length < 3) continue;
      const last = stemmed[stemmed.length - 1];
      if (stemmed.length >= 4 && last === stemmed[stemmed.length - 2] && !VOWELS.includes(last)) {
        stemmed = stemmed.slice(0, -1); // stopped→stopp→stop
      }
      return stemmed;
    }
  }
  return token;
}

export function normalizeTokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t))
    .map(stem);
}

export function normalize(text) {
  return normalizeTokens(text).join(' ');
}
