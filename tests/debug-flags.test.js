import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import {
  DEBUG_SPOTS, DEBUG_ONLINE_CODE, attachDebug, canonicalSpot, debugOnlineBlocked, debugOnlineReject, debugSpawnSpot, debugSpotKeys, ensureDebugStarterWeapon, grantDebugUnlock, monsterIsHostile, oasisHudName, parseDebugFlags, pickDebugMonsterType, resolveSpot, setDebugAutoAttack, spawnDebugMonster, tickDebugAutoAttack,
} from '../src/debug/flags.js';
import { DEBUG_STARTER_ID, huntSavePayload } from '../src/debug/transient.js';
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
  const keys = ['oakhollow', 'goldenmeadow', 'greyrock', 'forge', 'oasis', 'deepwell', 'cinderfall', 'glimmerfrost', 'hellspire', 'dawnspire', 'endlessfield'];
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
  const oasis = resolveSpot('oasis');
  assert.ok(Math.hypot(oasis.x - 0, oasis.z - 432) > 32, 'oasis spawn is outside the pool');
  assert.ok(oasis.z > 432, 'oasis spawn is on the Oasis (greenbowl) tile');
  assert.equal(oasisHudName(oasis.x, oasis.z), 'Oasis');
  assert.equal(oasisHudName(0, 432), 'Oasis');
});

test('debug monster spawn is inert without ?debug=1 and picks a zone mob with the flag', () => {
  const spawned = [];
  const game = {
    debug: null,
    rank: 0,
    zone: 'Oakhollow',
    player: { pos: { x: 72, y: 3, z: 73 }, yaw: 0 },
    world: { playable: () => true, isWater: () => false, zoneAt: () => 3, landAt: () => ({ kind: 'oakhollow', banner: ['Village', 'Oakhollow'] }) },
    spawner: { spawn(type, x, z) { spawned.push({ type, x, z }); return { name: type }; } },
    hud: { toast() {} },
  };
  assert.equal(spawnDebugMonster(game), null);
  assert.equal(spawned.length, 0);
  game.debug = { enabled: true };
  const mon = spawnDebugMonster(game);
  assert.ok(mon);
  assert.equal(spawned[0].type, 'slime');
  assert.equal(monsterIsHostile(spawned[0].type), true);
  assert.equal(monsterIsHostile('chicken'), false);
  const dist = Math.hypot(spawned[0].x - game.player.pos.x, spawned[0].z - game.player.pos.z);
  assert.ok(dist >= 2 && dist <= 3.6, dist);
  const spot = debugSpawnSpot(game);
  assert.ok(spot.dist <= 3.4);
  assert.equal(pickDebugMonsterType({ zone: 'Oakhollow', player: { pos: { x: 72, z: 73 } }, world: { landAt: () => ({ kind: 'oakhollow' }) } }), 'slime');
  assert.equal(pickDebugMonsterType({ zone: 'Oasis', player: { pos: { x: 0, z: 400 } }, world: { landAt: () => ({ kind: 'greenbowl' }) } }), 'scorpion');
  assert.equal(pickDebugMonsterType({ zone: 'Endless Field', player: { pos: { x: 0, z: 0 } }, world: { landAt: () => ({ kind: 'warfield' }) } }), 'keepwarden');
  assert.equal(parseDebugFlags('?debug=1').enabled, true);
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /game\.debug && !game\.mmo && !game\.worldView/);
  assert.match(hud, /Spawn monster/);
  assert.match(hud, /Auto-attack \(debug\)/);
  const flagsSrc = readFileSync(new URL('../src/debug/flags.js', import.meta.url), 'utf8');
  assert.match(flagsSrc, /F9/);
  assert.match(flagsSrc, /debugSpawn/);
});

test('debug spawn is offline-only; World 1 rejects debug messages with code debug', () => {
  const spawned = [];
  const game = {
    debug: { enabled: true },
    mmo: { send() {} },
    worldView: {},
    player: { pos: { x: 72, y: 3, z: 73 }, yaw: 0 },
    spawner: { spawn(type, x, z) { spawned.push({ type, x, z }); return { name: type }; } },
    hud: { toast() {} },
  };
  assert.equal(debugOnlineBlocked(game, '?debug=1&mmo=1'), true);
  const rejected = debugOnlineReject();
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, DEBUG_ONLINE_CODE);
  assert.equal(rejected.code, 'debug');
  const res = spawnDebugMonster(game, '?debug=1&mmo=1');
  assert.equal(res.code, 'debug');
  assert.equal(spawned.length, 0);
  assert.equal(game.debugSpawn, undefined);
  freezeSaves(false);
  const attached = attachDebug({ progress: { sessionOnly: false } }, '?debug=1&mmo=1');
  assert.equal(attached, null);
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /!game\.mmo && !game\.worldView/);
  const docs = readFileSync(new URL('../docs/debug-flags.md', import.meta.url), 'utf8');
  assert.match(docs, /error code `debug`/);
});

test('debug spawn is hostile and adjacent; auto-attack toggle is debug-gated', () => {
  const attacks = [];
  const game = {
    debug: { enabled: true, autoAttack: false },
    started: true,
    uiBlocking: false,
    rank: 0,
    zone: 'Oakhollow',
    player: { pos: { x: 72, y: 3, z: 73 }, yaw: 0, dead: false, state: 'idle' },
    world: { playable: () => true, isWater: () => false, zoneAt: () => 3, landAt: () => ({ kind: 'oakhollow' }) },
    items: [{ reach: 2.4, kind: 'melee' }],
    sel: 0,
    carried(it) { return it; },
    nearestMonster() { return { type: 'slime', x: 74, z: 73 }; },
    doAttack() { attacks.push('hit'); },
    spawner: { spawn(type, x, z) { return { type, x, z, name: type }; } },
    hud: { toast() {} },
  };
  const mon = spawnDebugMonster(game);
  assert.equal(monsterIsHostile(mon.type), true);
  assert.notEqual(mon.type, 'chicken');
  const d = Math.hypot(mon.x - 72, mon.z - 73);
  assert.ok(d >= 2 && d <= 3.6, d);
  assert.equal(setDebugAutoAttack({ debug: null }, true), false);
  assert.equal(setDebugAutoAttack({ debug: { enabled: true }, mmo: {} }, true), false);
  assert.equal(setDebugAutoAttack(game, true), true);
  assert.equal(game.debug.autoAttack, true);
  assert.equal(tickDebugAutoAttack(game), true);
  assert.equal(attacks.length, 1);
  game.debug.autoAttack = false;
  assert.equal(tickDebugAutoAttack(game), false);
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /set-autoatk/);
  assert.match(hud, /game\.debug && !game\.mmo && !game\.worldView/);
});

test('debug-granted starter weapon is stripped from a save written in a debug session', () => {
  installStorage();
  mem.clear();
  freezeSaves(false);
  try {
    const p = new Progress();
    const game = { debug: { enabled: true }, progress: p, items: [{ id: 'empty', kind: 'none' }], applyGear() {}, selectSlot() {} };
    assert.equal(p.data.weapon, null);
    const granted = ensureDebugStarterWeapon(game);
    assert.ok(granted);
    assert.equal(p.data.weapon, DEBUG_STARTER_ID);
    assert.equal(p.data.crafted[DEBUG_STARTER_ID], true);
    const payload = huntSavePayload(p.data);
    assert.equal(payload.weapon, null);
    assert.equal(payload.debugGranted, undefined);
    assert.equal(payload.crafted[DEBUG_STARTER_ID], undefined);
    p.sessionOnly = false;
    freezeSaves(false);
    p.save(false);
    const stored = JSON.parse(localStorage.getItem(saveKey(null)));
    assert.equal(stored.weapon, null);
    assert.equal(stored.debugGranted, undefined);
    assert.ok(!stored.crafted[DEBUG_STARTER_ID]);
    assert.equal(p.data.weapon, DEBUG_STARTER_ID, 'in-memory grant stays for the session');
    p.loadRaw({ weapon: DEBUG_STARTER_ID, crafted: { [DEBUG_STARTER_ID]: true, knife: true }, debugGranted: { weapon: DEBUG_STARTER_ID, items: [DEBUG_STARTER_ID] } });
    assert.equal(p.data.weapon, null);
    assert.equal(p.data.debugGranted, undefined);
    assert.ok(!p.data.crafted[DEBUG_STARTER_ID]);
  } finally {
    freezeSaves(false);
  }
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
