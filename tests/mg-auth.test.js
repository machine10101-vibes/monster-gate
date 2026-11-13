import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  RETIRED_HUNTER_ERROR,
  RETIRED_HUNTER_OPS,
  RETIRED_HUNTER_STATUS,
  isRetiredHunterOp,
} from '../supabase/functions/_shared/retiredHunter.js';
import { cloudHuntAllowed, pushHunt, syncHunt } from '../src/wallet/cloud.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('MG-AUTH-1 retired hunter ops are gone with a 410', () => {
  assert.deepEqual(RETIRED_HUNTER_OPS, ['auth', 'load', 'save']);
  assert.equal(RETIRED_HUNTER_STATUS, 410);
  assert.match(RETIRED_HUNTER_ERROR, /Sign in with email/);
  for (const op of RETIRED_HUNTER_OPS) assert.equal(isRetiredHunterOp(op), true);
  assert.equal(isRetiredHunterOp('account-load'), false);
  assert.equal(isRetiredHunterOp('account-save'), false);
});

test('MG-AUTH-1 hunter function no longer writes wallet-keyed hunters', () => {
  const hunter = src('../supabase/functions/hunter/index.ts');
  const cloud = src('../src/wallet/cloud.js');
  assert.match(hunter, /isRetiredHunterOp/);
  assert.match(hunter, /RETIRED_HUNTER_STATUS/);
  assert.match(hunter, /account-load/);
  assert.match(hunter, /account-save/);
  assert.match(hunter, /hunter_accounts/);
  assert.match(hunter, /save_account_hunt/);
  assert.doesNotMatch(hunter, /hunter_sessions/);
  assert.doesNotMatch(hunter, /from\("hunters"\)/);
  assert.doesNotMatch(hunter, /save_hunt/);
  assert.doesNotMatch(hunter, /p_address/);
  assert.doesNotMatch(hunter, /sessionAddress/);
  assert.doesNotMatch(hunter, /op === "auth"/);
  assert.doesNotMatch(hunter, /op === "load"/);
  assert.doesNotMatch(hunter, /op === "save"/);
  assert.doesNotMatch(cloud, /op:\s*'auth'/);
  assert.doesNotMatch(cloud, /op:\s*'load'/);
  assert.doesNotMatch(cloud, /op:\s*'save'/);
  assert.doesNotMatch(cloud, /ensureToken/);
  assert.doesNotMatch(cloud, /pullHunt/);
  assert.match(cloud, /cloudHuntAllowed/);
  assert.match(cloud, /kind === 'email'/);
});

test('MG-AUTH-1 a leftover wallet session cannot push or pull a hunt', async () => {
  const wallet = {
    kind: 'klever',
    address: 'klv1fpwjz234gy8aaae3gx0e8q9f52vymzzn3z5q0s5h60pvktzx0n0qwvtux5',
    message: 'old',
    signature: 'deadbeef',
  };
  assert.equal(cloudHuntAllowed(wallet), false);
  assert.equal(cloudHuntAllowed({ kind: 'email', userId: 'u1' }), true);
  assert.equal(cloudHuntAllowed({ kind: 'guest' }), false);
  const pushed = await pushHunt(wallet, { gold: 9 });
  assert.equal(pushed.error, true);
  const synced = await syncHunt(wallet, { data: {} });
  assert.equal(synced.state, 'off');
  assert.equal(synced.replaced, false);
});
