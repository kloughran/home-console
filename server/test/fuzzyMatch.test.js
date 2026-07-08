import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyMatch, levenshtein } from '../src/parser/fuzzyMatch.js';
import { normalize } from '../src/parser/normalize.js';

// Candidates as they would come from the DB: title_normalized precomputed
const candidates = [
  { id: 1, title: 'water my coleus', title_normalized: normalize('water my coleus') },
  { id: 2, title: 'feed the fish', title_normalized: normalize('feed the fish') },
  { id: 3, title: 'take out the trash', title_normalized: normalize('take out the trash') },
  { id: 4, title: 'change furnace filter', title_normalized: normalize('change furnace filter') },
];

test('levenshtein basics', () => {
  assert.equal(levenshtein('water', 'water'), 0);
  assert.equal(levenshtein('water', 'watered'), 2);
  assert.equal(levenshtein('fed', 'feed'), 1);
});

test('past tense matches: "watered my coleus"', () => {
  const r = fuzzyMatch('watered my coleus', candidates);
  assert.equal(r.outcome, 'matched');
  assert.equal(r.match.id, 1);
});

test('tense + article variation: "fed the fish"', () => {
  const r = fuzzyMatch('fed the fish', candidates);
  assert.equal(r.outcome, 'matched');
  assert.equal(r.match.id, 2);
});

test('partial phrase: "took out the trash"', () => {
  const r = fuzzyMatch('took out the trash', candidates);
  assert.equal(r.outcome, 'matched');
  assert.equal(r.match.id, 3);
});

test('unrelated phrase does not match', () => {
  const r = fuzzyMatch('shoveled the driveway', candidates);
  assert.equal(r.outcome, 'no_match');
  assert.equal(r.match, null);
});

test('two near-identical titles are ambiguous', () => {
  const twins = [
    { id: 10, title: 'water the front plants', title_normalized: normalize('water the front plants') },
    { id: 11, title: 'water the back plants', title_normalized: normalize('water the back plants') },
  ];
  const r = fuzzyMatch('watered the plants', twins);
  assert.equal(r.outcome, 'ambiguous');
});

test('typos still match', () => {
  const r = fuzzyMatch('waterd my colius', candidates);
  assert.equal(r.outcome, 'matched');
  assert.equal(r.match.id, 1);
});
