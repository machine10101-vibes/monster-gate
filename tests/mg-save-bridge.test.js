import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { ANON_KEY } from '../src/systems/progress.js';
import { META_KEY } from '../src/systems/roster.js';
import { importRaw } from '../src/systems/saveio.js';
import {
  MIGRATED_KEY, HOME_ORIGIN,
  allowedReturn, applyBundle, collectSaves, decodeBundle, encodeBundle,
  hasLocalSave, isHuntKey, isSaveKey, parseImportHash, shouldAutoHop,
} from '../src/systems/savebridge.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function memoryStorage() {
  const mem = new Map();
  return {
    get length() { return mem.size; },
    key(i) { return [...mem.keys()][i] ?? null; },
    getItem(k) { return mem.has(k) ? mem.get(k) : null; },
    setItem(k, v) { mem.set(String(k), String(v)); },
    removeItem(k) { mem.delete(String(k)); },
    clear() { mem.clear(); },
  };
}

function install(ls = memoryStorage()) {
  globalThis.localStorage = ls;
  return ls;
}

afterEach(() => {
  delete globalThis.localStorage;
});

test('save keys match the hunt, roster, and account prefixes the game uses', () => {
  assert.equal(ANON_KEY, 'monster-gate-hunter-v1');
  assert.equal(META_KEY, 'monster-gate-roster-v1');
  assert.equal(isHuntKey(ANON_KEY), true);
  assert.equal(isHuntKey(`${ANON_KEY}:guest:local#c1`), true);
  assert.equal(isHuntKey(`${META_KEY}:guest:local`), true);
  assert.equal(isSaveKey('monster-gate-accounts-v1'), true);
  assert.equal(isSaveKey('monster-gate-account-session'), true);
  assert.equal(isSaveKey('mg-name'), true);
  assert.equal(isSaveKey('mg-quality'), true);
  assert.equal(isSaveKey(MIGRATED_KEY), false);
  assert.equal(isSaveKey('mg-boot'), false);
  assert.match(src('../src/systems/saveio.js'), /export function importRaw/);
});

test('payload encode and decode round-trip hunter JSON', async () => {
  const ls = install();
  ls.setItem(ANON_KEY, JSON.stringify({ gold: 42, hunter: { name: 'Rowan' } }));
  ls.setItem('mg-name', 'Rowan');
  ls.setItem(MIGRATED_KEY, '1');
  const bundle = collectSaves();
  assert.equal(bundle.ls[ANON_KEY].includes('Rowan'), true);
  assert.equal(bundle.ls[MIGRATED_KEY], undefined);
  const token = await encodeBundle(bundle);
  assert.equal(token.includes('+'), false);
  assert.equal(token.includes('/'), false);
  const back = await decodeBundle(token);
  assert.deepEqual(back.ls[ANON_KEY], bundle.ls[ANON_KEY]);
  assert.equal(await decodeBundle('none'), null);
});

test('no-loop guard: migrated flag, hash return, local save, and non-live host', () => {
  install();
  assert.equal(shouldAutoHop({ hash: '', host: 'monstergate.online', migrated: false }), true);
  assert.equal(shouldAutoHop({ hash: '', host: 'www.monstergate.online', migrated: false }), true);
  assert.equal(shouldAutoHop({ hash: '', host: 'monstergate.online', migrated: true }), false);
  assert.equal(shouldAutoHop({ hash: '#mgimport=none', host: 'monstergate.online', migrated: false }), false);
  assert.equal(shouldAutoHop({ hash: '#mgimport=abc', host: 'monstergate.online', migrated: false }), false);
  assert.equal(shouldAutoHop({ hash: '', host: 'localhost', migrated: false }), false);
  assert.equal(shouldAutoHop({ hash: '', host: 'machine10101-vibes.github.io', migrated: false }), false);
  const ls = install();
  ls.setItem(ANON_KEY, '{"gold":1}');
  assert.equal(hasLocalSave(), true);
  assert.equal(shouldAutoHop({ hash: '', host: 'monstergate.online', migrated: false }), false);
});

test('import refuses to overwrite an existing hunt without confirmation', () => {
  const ls = install();
  ls.setItem(ANON_KEY, '{"gold":9}');
  const incoming = { v: 1, ls: { [ANON_KEY]: '{"gold":1}', 'mg-name': 'Bea' } };
  assert.deepEqual(applyBundle(incoming, { overwrite: false }), { applied: false, reason: 'exists' });
  assert.equal(ls.getItem(ANON_KEY), '{"gold":9}');
  const ok = applyBundle(incoming, { overwrite: true });
  assert.equal(ok.applied, true);
  assert.equal(ls.getItem(ANON_KEY), '{"gold":1}');
  assert.equal(ls.getItem('mg-name'), 'Bea');
});

test('importRaw is the write path a confirmed import uses', () => {
  const ls = install();
  assert.equal(importRaw(`${ANON_KEY}:guest:local#c1`, '{"gold":3}'), true);
  assert.equal(ls.getItem(`${ANON_KEY}:guest:local#c1`), '{"gold":3}');
});

test('hash parse and return allowlist only accept monstergate.online', () => {
  assert.deepEqual(parseImportHash('#mgimport=none'), { present: true, value: 'none' });
  assert.equal(parseImportHash('#other').present, false);
  assert.equal(allowedReturn('https://evil.example/'), `${HOME_ORIGIN}/`);
  assert.equal(allowedReturn('http://monstergate.online/'), `${HOME_ORIGIN}/`);
  assert.equal(allowedReturn('https://monstergate.online/secret'), `${HOME_ORIGIN}/`);
  assert.equal(allowedReturn('https://machine10101-vibes.github.io/monster-gate/'), `${HOME_ORIGIN}/`);
});

test('bridge page is a top-level redirect with no iframe', () => {
  const html = src('../tools/mg-save-bridge/index.html');
  assert.doesNotMatch(html, /iframe/i);
  assert.match(html, /location\.replace/);
  assert.match(html, /hostname === 'monstergate\.online'/);
  assert.match(html, /monster-gate-/);
  assert.match(html, /mg-name/);
  assert.match(html, /CompressionStream\('gzip'\)/);
});
