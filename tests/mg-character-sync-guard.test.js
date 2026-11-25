import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditRoster } from '../src/systems/roster.js';

test('email character rosters stay read-only until cloud sync succeeds', () => {
  assert.equal(canEditRoster({ kind: 'email', cloudState: 'error' }), false);
  assert.equal(canEditRoster({ kind: 'email', cloudState: 'off' }), false);
  assert.equal(canEditRoster({ kind: 'email', cloudState: 'on' }), true);
});

test('local guest rosters remain editable without cloud sync', () => {
  assert.equal(canEditRoster({ kind: 'guest', cloudState: 'off' }), true);
  assert.equal(canEditRoster({ kind: 'guest', cloudState: 'error' }), true);
  assert.equal(canEditRoster({ kind: 'guest', cloudState: 'on' }), true);
});
