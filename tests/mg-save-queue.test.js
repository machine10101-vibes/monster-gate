import assert from 'node:assert/strict';
import { test } from 'node:test';

/**
 * The account save queue (src/wallet/cloud.js), driven end to end through the real account code
 * against a scripted guild endpoint. Isolated test data only: no network, no live records.
 */

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const calls = [];
let script = [];
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.endsWith('supabase.json')) return { ok: true, json: async () => ({ url: 'https://test.supabase.co', key: 'publishable-test-key' }) };
  if (href.includes('/functions/v1/hunter')) {
    const body = JSON.parse(init.body);
    calls.push(body);
    const next = script.shift() || { status: 200, json: { revision: calls.length, savedAt: body.progress?.savedAt || 1 } };
    if (next.throw) throw new Error(next.throw);
    return { status: next.status, json: async () => next.json };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

const { schedulePush, flushCloud } = await import('../src/wallet/cloud.js');

const session = { kind: 'email', userId: '00000000-0000-4000-8000-000000000001', accessToken: 'test-access', expiresAt: new Date(Date.now() + 3600e3).toISOString() };
const OUTBOX = `mg-cloud-outbox:${session.userId}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000) => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timed out');
    await wait(25);
  }
};

test('a save is written to the outbox first, retried after a failure, and acknowledged once stored', async () => {
  calls.length = 0;
  script = [{ status: 503, json: { error: 'The guild record could not be saved.' } }];
  const results = [];
  schedulePush(session, { chars: [{ id: 'a', gold: 10 }], savedAt: 1000 }, (r) => results.push(r));
  // Durable before any network: a crash now still leaves the save on this device.
  assert.deepEqual(JSON.parse(localStorage.getItem(OUTBOX)), { chars: [{ id: 'a', gold: 10 }], savedAt: 1000 });
  await until(() => results.length >= 1);
  assert.equal(results[0].error, true, 'the failed attempt is reported');
  assert.ok(localStorage.getItem(OUTBOX), 'the outbox survives a failed attempt');
  // The queue retries on its own after a short delay.
  await until(() => results.length >= 2);
  assert.equal(calls.length, 2);
  assert.ok(results[1].revision > 0 && !results[1].error, 'the retry is stored');
  assert.equal(localStorage.getItem(OUTBOX), null, 'the outbox is cleared only after the guild acknowledges');
});

test('one save at a time: changes made during a save are sent once, newest only, after it', async () => {
  calls.length = 0;
  script = [];
  const done = [];
  schedulePush(session, { chars: [{ id: 'a', gold: 1 }], savedAt: 2000 }, (r) => done.push(['first', r]));
  const first = flushCloud();
  schedulePush(session, { chars: [{ id: 'a', gold: 2 }], savedAt: 2001 }, (r) => done.push(['second', r]));
  schedulePush(session, { chars: [{ id: 'a', gold: 3 }], savedAt: 2002 }, (r) => done.push(['third', r]));
  await first;
  await until(() => done.length >= 2);
  await wait(300);
  assert.equal(calls.length, 2, 'the in-flight save plus one follow-up, not three');
  assert.equal(calls[1].progress.chars[0].gold, 3, 'the follow-up carries the newest hunt');
  assert.deepEqual(done.map((d) => d[0]), ['first', 'third']);
  assert.equal(localStorage.getItem(OUTBOX), null);
});

test('a stale save rejected by the guild (409, newer hunt stored) is not retried in a loop', async () => {
  calls.length = 0;
  script = [{ status: 409, json: { error: 'A newer hunt is already saved to this account.', revision: 9, savedAt: 9000, progress: { chars: [{ id: 'a', gold: 99 }] } } }];
  const results = [];
  schedulePush(session, { chars: [{ id: 'a', gold: 1 }], savedAt: 3000 }, (r) => results.push(r));
  await until(() => results.length >= 1);
  await wait(2600);
  assert.equal(calls.length, 1, 'no retry after a conflict');
  assert.equal(results[0].conflict, true);
  assert.deepEqual(results[0].progress, { chars: [{ id: 'a', gold: 99 }] }, 'the newer stored hunt is handed back for merging');
});

test('a network error (offline) keeps the save and sends it when the queue is flushed again', async () => {
  calls.length = 0;
  script = [{ throw: 'Failed to fetch' }];
  const results = [];
  schedulePush(session, { chars: [{ id: 'b', gold: 5 }], savedAt: 4000 }, (r) => results.push(r));
  await until(() => results.length >= 1);
  assert.equal(results[0].error, true);
  assert.ok(localStorage.getItem(OUTBOX), 'still on the device while offline');
  // Back online: the 'online' handler calls flushCloud(); the timer would retry too.
  await flushCloud();
  await until(() => results.length >= 2);
  assert.equal(results[1].error, undefined);
  assert.equal(calls.at(-1).progress.chars[0].id, 'b');
  assert.equal(localStorage.getItem(OUTBOX), null);
});

test('signed-in hunts checkpoint every 30 seconds and flush as soon as the browser is back online', async () => {
  const { readFileSync } = await import('node:fs');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const cloud = readFileSync(new URL('../src/wallet/cloud.js', import.meta.url), 'utf8');
  assert.match(main, /const CLOUD_AUTOSAVE_MS = 30000;/);
  assert.match(main, /this\.autosaveTimer = setInterval\(\(\) => \{\n\s*this\.autosaveCloud\(\);/);
  assert.match(cloud, /window\.addEventListener\('online', \(\) => \{ flushCloud\(\); \}\)/);
});
