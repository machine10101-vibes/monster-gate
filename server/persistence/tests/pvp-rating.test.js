import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankState, sanitizeState } from '../schema.js';

test('Colosseum ratings are bounded and cannot be forged through save import', () => {
  const base = blankState('Ann');
  const stored = sanitizeState({ ...base, pvp: { rating: 99999, wins: 8, losses: 3 } });
  assert.deepEqual(stored.pvp, { rating: 3000, wins: 8, losses: 3 });
  const imported = sanitizeState({ ...base, pvp: { rating: 3000, wins: 99, losses: 1 } }, { importMode: true });
  assert.deepEqual(imported.pvp, { rating: 1000, wins: 0, losses: 0 });
});
