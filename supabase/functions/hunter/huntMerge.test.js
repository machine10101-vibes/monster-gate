import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeAccountProgress } from './huntMerge.js';

const char = (id, name, savedAt, gold) => ({
  id,
  name,
  look: {},
  createdAt: 1,
  playedAt: savedAt,
  hunt: { savedAt, gold },
});

test('a second device keeps the character it does not have yet', () => {
  const current = { savedAt: 500, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 500, 586)], deleted: [] } };
  const incoming = { savedAt: 200, roster: { v: 1, last: 'b', chars: [char('b', 'Bea', 200, 10)], deleted: [] } };
  const merged = mergeAccountProgress(current, incoming);
  const ids = merged.roster.chars.map((c) => c.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
  assert.equal(merged.roster.chars.find((c) => c.id === 'a').hunt.gold, 586);
  assert.equal(merged.savedAt, 500);
});

test('the later hunt wins for the same character', () => {
  const current = { savedAt: 100, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 100, 586)], deleted: [] } };
  const incoming = { savedAt: 300, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 300, 900)], deleted: [] } };
  const merged = mergeAccountProgress(current, incoming);
  assert.equal(merged.roster.chars.length, 1);
  assert.equal(merged.roster.chars[0].hunt.gold, 900);
});

test('an older copy does not replace a newer hunt', () => {
  const current = { savedAt: 500, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 500, 586)], deleted: [] } };
  const incoming = { savedAt: 100, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 100, 1)], deleted: [] } };
  const merged = mergeAccountProgress(current, incoming);
  assert.equal(merged.roster.chars[0].hunt.gold, 586);
});

test('a delete newer than the hunt removes the character', () => {
  const current = {
    savedAt: 400,
    roster: { v: 1, last: null, chars: [], deleted: [{ ...char('a', 'Ada', 100, 5), deletedAt: 400 }] },
  };
  const incoming = { savedAt: 100, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 100, 5)], deleted: [] } };
  const merged = mergeAccountProgress(current, incoming);
  assert.equal(merged.roster.chars.length, 0);
  assert.equal(merged.roster.deleted.length, 1);
});

test('play after a delete brings the character back', () => {
  const current = {
    savedAt: 300,
    roster: { v: 1, last: null, chars: [], deleted: [{ ...char('a', 'Ada', 100, 5), deletedAt: 300 }] },
  };
  const incoming = { savedAt: 450, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 450, 20)], deleted: [] } };
  const merged = mergeAccountProgress(current, incoming);
  assert.equal(merged.roster.chars.length, 1);
  assert.equal(merged.roster.chars[0].hunt.gold, 20);
  assert.equal(merged.roster.deleted.length, 0);
});

test('an empty roster does not delete characters saved on the other device', () => {
  const current = { savedAt: 500, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 500, 586)], deleted: [] } };
  const incoming = { savedAt: 900, roster: { v: 1, last: null, chars: [], deleted: [] } };
  const merged = mergeAccountProgress(current, incoming);
  assert.equal(merged.roster.chars.length, 1);
  assert.equal(merged.roster.chars[0].hunt.gold, 586);
});

test('a hunt with no roster does not wipe the account', () => {
  const current = { savedAt: 500, roster: { v: 1, last: 'a', chars: [char('a', 'Ada', 500, 586)], deleted: [] } };
  const incoming = { savedAt: 900, gold: 1, kills: { budge: 3 } };
  const merged = mergeAccountProgress(current, incoming);
  assert.equal(merged.roster.chars[0].id, 'a');
  assert.equal(merged.roster.chars[0].hunt.gold, 586);
});
