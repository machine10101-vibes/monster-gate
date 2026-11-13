import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import {
  DEBUG_SPOTS, attachDebug, canonicalSpot, debugSpotKeys, grantDebugUnlock, parseDebugFlags, resolveSpot,
} from '../src/debug/flags.js';
import { freezeSaves, savesFrozen, writeJson, readJson } from '../src/systems/saveio.js';
import { Progress, saveKey } from '../src/systems/progress.js';

const mem = new Map();

function installStorage() {
  const ls = {
    getItem(k) { return mem.has(k) ? mem.get(k) : null; },
    setItem(k, v) { mem.set(k, String(v)); },
    removeItem(k) { mem.delete(k); },
  };
  globalThis.localStorage = ls;
}

after(() => {
  freezeSaves(false);
});

test('debug flags are inert without ?debug=1', () => {
  assert.deepEqual(parseDebugFlags(''), { enabled: false, tp: '', unlock: false, blocked: false });
  assert.deepEqual(parseDebugFlags('?tp=oakhollow&unlock=1'), { enabled: false, tp: '', unlock: false, blocked: false });
  assert.equal(parseDebugFlags('?debug=true').enabled, false);
  const on = parseDebugFlags('?debug=1&tp=Hellspire&unlock=1');
  assert.equal(on.enabled, true);
  assert.equal(on.tp, 'Hellspire');
  assert.equal(on.unlock, true);
  assert.equal(on.blocked, false);
  freezeSaves(false);
  const game = { progress: { sessionOnly: false } };
  assert.equal(attachDebug(game, '?tp=oakhollow&unlock=1'), null);
  assert.equal(savesFrozen(), false);
  assert.equal(game.progress.sessionOnly, false);
  assert.equal(game.debug, undefined);
});

test('debug combined with mmo=1 changes nothing', () => {
  freezeSaves(false);
  const flags = parseDebugFlags('?debug=1&mmo=1&unlock=1&tp=hellspire');
  assert.deepEqual(flags, { enabled: false, tp: '', unlock: false, blocked: true });
  assert.deepEqual(parseDebugFlags('?mmo=1&debug=1&tp=oakhollow'), { enabled: false, tp: '', unlock: false, blocked: true });

  const warns = [];
  const orig = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  const game = {
    progress: { sessionOnly: false, data: { gold: 12, weapon: null, armor: {} } },
    journal: { state: { quests: {} } },
    started: true,
    player: { pos: { set() { this.moved = true; } } },
    start() { this.started = true; },
  };
  try {
    const r = attachDebug(game, '?mmo=1&debug=1&unlock=1&tp=oakhollow');
    assert.equal(r, null);
    assert.equal(savesFrozen(), false);
    assert.equal(game.progress.sessionOnly, false);
    assert.equal(game.debug, undefined);
    assert.equal(game._debugStartWrapped, undefined);
    assert.equal(game.progress.data.gold, 12);
    assert.equal(game.progress.data.weapon, null);
    assert.equal(game.player.pos.moved, undefined);
    assert.ok(warns.some((w) => /mmo=1/.test(w) && /debug/i.test(w)));
  } finally {
    console.warn = orig;
    freezeSaves(false);
  }
});

test('every documented tp key resolves', () => {
  const keys = ['oakhollow', 'goldenmeadow', 'greyrock', 'forge', 'oasis', 'deepwell', 'hellspire', 'dawnspire', 'endlessfield'];
  assert.deepEqual(debugSpotKeys().sort(), [...keys].sort());
  for (const key of keys) {
    const spot = resolveSpot(key);
    assert.ok(spot, key);
    assert.equal(spot.id, canonicalSpot(key));
    assert.ok(Number.isFinite(spot.x) && Number.isFinite(spot.z), key);
  }
  assert.equal(resolveSpot('greyrock pit').id, 'greyrock');
  assert.equal(resolveSpot("Bram's forge").id, 'forge');
  assert.equal(resolveSpot('endless field').id, 'endlessfield');
  assert.equal(resolveSpot('dawnspire keep').id, 'dawnspire');
  assert.equal(resolveSpot('nope'), null);
  assert.ok(DEBUG_SPOTS.oakhollow);
});

test('debug freeze does not write the hunter save', () => {
  installStorage();
  mem.clear();
  freezeSaves(false);
  try {
    const p = new Progress();
    p.data.gold = 3;
    p.save(false);
    const key = saveKey(null);
    assert.ok(readJson(key).data);
    const before = localStorage.getItem(key);
    freezeSaves(true);
    p.sessionOnly = true;
    p.data.gold = 9999;
    grantDebugUnlock(p, null);
    p.save();
    writeJson(key, { gold: 1 });
    assert.equal(localStorage.getItem(key), before);
    assert.equal(p.data.gold, 9999);
    assert.equal(savesFrozen(), true);
  } finally {
    freezeSaves(false);
  }
});
