import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ACCOUNT_SESSION_TAKEN,
  ACCOUNT_SESSION_TAKEN_STATUS,
  decideSession,
  readSessionId,
  othersLogoutRequest,
  takenBody,
} from '../supabase/functions/_shared/accountSession.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const SEAT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

test('a new sign-in takes the seat and a mismatched device is dropped', () => {
  assert.equal(readSessionId(SEAT), SEAT);
  assert.equal(readSessionId('nope'), '');
  assert.deepEqual(decideSession('', ''), { adopt: true, sessionId: '' });
  assert.deepEqual(decideSession('', SEAT), { adopt: true, sessionId: SEAT });
  assert.deepEqual(decideSession(SEAT, SEAT), { ok: true, sessionId: SEAT });
  assert.deepEqual(decideSession(SEAT, OTHER), { taken: true });
  assert.deepEqual(decideSession(SEAT, ''), { taken: true });
  assert.equal(ACCOUNT_SESSION_TAKEN_STATUS, 409);
  assert.match(ACCOUNT_SESSION_TAKEN, /another device/);
  assert.deepEqual(takenBody(), { taken: true, error: ACCOUNT_SESSION_TAKEN });
});

test('hunter claim overwrites the seat; load/save/check refuse the other device', () => {
  const hunter = src('../supabase/functions/hunter/index.ts');
  const account = src('../src/wallet/account.js');
  const main = src('../src/main.js');
  const admin = src('../supabase/functions/admin/index.ts');
  const adminApi = src('../src/admin/api.js');
  const adminMain = src('../src/admin/main.js');
  const migration = src('../supabase/migrations/20261116053000_account_sessions.sql');
  assert.match(hunter, /account-claim/);
  assert.match(hunter, /account-check/);
  assert.match(hunter, /seatAccount/);
  assert.match(hunter, /takenBody/);
  assert.match(hunter, /revokeOtherAuthSessions/);
  assert.match(hunter, /othersLogoutRequest/);
  assert.match(account, /claimDevice/);
  assert.match(account, /checkDevice/);
  assert.match(account, /op: 'account-claim'/);
  assert.match(account, /throwIfTaken/);
  assert.match(account, /othersLogoutRequest/);
  assert.match(account, /sessionId: keep\?\.sessionId/);
  assert.match(src('../supabase/functions/_shared/accountSession.js'), /logout\?scope=others/);
  const logout = othersLogoutRequest('https://abc.supabase.co/', 'a'.repeat(24), 'anon-key');
  assert.equal(logout.url, 'https://abc.supabase.co/auth/v1/logout?scope=others');
  assert.equal(logout.init.headers.authorization, `Bearer ${'a'.repeat(24)}`);
  assert.equal(logout.init.method, 'POST');
  assert.equal(othersLogoutRequest('https://abc.supabase.co', 'short', 'anon-key'), null);
  assert.match(account, /sessionId/);
  const save = account.indexOf('export async function pushEmailHunt');
  const conflict = account.indexOf('conflict: true', save);
  const taken = account.indexOf('throwIfTaken');
  assert.ok(taken > 0 && conflict > save);
  assert.match(main, /dropTakenAccount/);
  assert.match(main, /watchDevice/);
  assert.match(main, /consumeTakenNotice/);
  assert.match(main, /err\?\.code === 'taken' \|\| err\?\.code === 'rejected'/);
  assert.match(main, /else this\.watchDevice\(\)/);
  assert.match(admin, /seatStaff/);
  assert.match(admin, /takenBody/);
  assert.match(adminApi, /json\.taken/);
  assert.match(adminMain, /watchSeat/);
  assert.match(adminMain, /err\.code !== 'taken'/);
  assert.match(migration, /create table public.account_sessions/);
  assert.doesNotMatch(hunter, /hunter_sessions/);
});
