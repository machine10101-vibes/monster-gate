import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import {
  DEBUG_AUTO_CADENCE, DEBUG_LOOT_ID, DEBUG_LOOT_SIT, DEBUG_SPOTS, DEBUG_ONLINE_CODE, DEBUG_STARTER_DMG, DEBUG_TANK_CADENCE, DEBUG_TANK_HP_CAP, DEBUG_TANK_HP_MUL, OASIS_CAM, acquireAutoAttackTarget, applyDebugTank, attachDebug, canonicalSpot, debugOnlineBlocked, debugOnlineReject, debugSpawnSpot, debugSpotKeys, debugTankHp, debugTankHpLabel, debugTankKillBudget, ensureDebugStarterWeapon, grantDebugTankLoot, grantDebugUnlock, monsterIsHostile, oasisHudName, parseDebugFlags, pickDebugMonsterType, resolveSpot, setDebugAutoAttack, spawnDebugMonster, teleportDebug, tickDebugAutoAttack, tickDebugTank,
} from '../src/debug/flags.js';
import { DEBUG_LOOT_ID as TRANSIENT_LOOT_ID, DEBUG_STARTER_ID, huntSavePayload } from '../src/debug/transient.js';
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
  assert.match(hud, /Spawn tanky monster \(debug\)/);
  assert.match(hud, /Auto-attack \(debug\)/);
  const flagsSrc = readFileSync(new URL('../src/debug/flags.js', import.meta.url), 'utf8');
  assert.match(flagsSrc, /F9/);
  assert.match(flagsSrc, /shiftKey/);
  assert.match(flagsSrc, /debugSpawnTank/);
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
    monsters: [{ type: 'slime', x: 74, z: 73, dead: false }],
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

test('debug tank spawn is capped HP, hits back, and stays out of saves', () => {
  const spawned = [];
  const game = {
    debug: { enabled: true },
    rank: 0,
    zone: 'Oakhollow',
    player: { pos: { x: 72, y: 3, z: 73 }, yaw: 0 },
    world: { playable: () => true, isWater: () => false, zoneAt: () => 3, landAt: () => ({ kind: 'oakhollow' }) },
    spawner: {
      spawn(type, x, z) {
        const mon = { type, x, z, name: 'Gate Slime', hp: 18, maxHp: 18, cd: 0.4 };
        spawned.push(mon);
        return mon;
      },
    },
    hud: { toast() {} },
    mmo: null,
  };
  const mon = spawnDebugMonster(game, '?debug=1', { tank: true });
  assert.ok(mon.debugTank);
  assert.equal(mon.maxHp, 18 * DEBUG_TANK_HP_MUL);
  assert.equal(mon.hp, 18 * DEBUG_TANK_HP_MUL);
  assert.equal(mon.state, 'chase');
  assert.ok(mon.def.aggro >= 12);
  assert.ok(mon.tankCd > 0 && mon.tankCd < 1);
  assert.match(mon.name, /tank/i);
  assert.equal(monsterIsHostile(mon.type), true);
  const online = { ...game, mmo: { send() {} }, worldView: {} };
  const rejected = spawnDebugMonster(online, '?debug=1&mmo=1', { tank: true });
  assert.equal(rejected.code, 'debug');
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /set-spawn-tank/);
  assert.match(hud, /game\.debug && !game\.mmo && !game\.worldView/);
  const slim = applyDebugTank({ hp: 10, maxHp: 10, name: 'Boar', cd: 0 });
  assert.equal(slim.maxHp, debugTankHp(10));
  assert.ok(slim.maxHp <= DEBUG_TANK_HP_CAP);
  const fat = applyDebugTank({ hp: 80, maxHp: 80, name: 'Boar', cd: 0 });
  assert.equal(fat.maxHp, DEBUG_TANK_HP_CAP);
});

test('debug tank dies in ~20s of low-level auto-attack, shows HP, and drops loot', () => {
  const mon = applyDebugTank({
    type: 'slime',
    x: 73,
    z: 73,
    y: 3,
    name: 'Gate Slime',
    hp: 18,
    maxHp: 18,
    def: { gold: [2, 4], dmg: 2 },
  });
  assert.ok(mon.maxHp <= DEBUG_TANK_HP_CAP);
  const budget = debugTankKillBudget(mon.maxHp);
  assert.equal(DEBUG_AUTO_CADENCE, 1.15);
  assert.ok(budget.sec >= 18 && budget.sec <= 24, `kill time ${budget.sec}s`);
  assert.equal(debugTankHpLabel({ hp: 87, maxHp: 160 }), '87/160');
  assert.equal(debugTankHpLabel(mon), `${mon.maxHp}/${mon.maxHp}`);
  const monstersSrc = readFileSync(new URL('../src/entities/monsters.js', import.meta.url), 'utf8');
  assert.match(monstersSrc, /debugTankHpLabel/);
  assert.match(monstersSrc, /this\.debugTank && !this\.dead/);
  const coins = [];
  const bags = [];
  const payload = huntSavePayload({ gold: 4, debugGranted: { items: [] } });
  assert.equal(payload.debugGranted, undefined);

  const live = {
    type: 'slime',
    x: 73.6,
    z: 73,
    dead: false,
    debugTank: true,
    hp: mon.maxHp,
    maxHp: mon.maxHp,
  };
  const attacks = [];
  const game = {
    debug: { enabled: true, autoAttack: true },
    started: true,
    uiBlocking: false,
    player: { pos: { x: 72, y: 3, z: 73 }, yaw: 0, dead: false, state: 'idle' },
    items: [{ reach: 2.4, kind: 'melee', dmg: DEBUG_STARTER_DMG }],
    sel: 0,
    monsters: [live],
    carried(it) { return it; },
    nearestMonster() { return live.dead ? null : live; },
    doAttack() {
      attacks.push('hit');
      live.hp -= DEBUG_STARTER_DMG;
      if (live.hp <= 0) live.dead = true;
    },
    dropCoin(x, y, z, n) { coins.push({ x, y, z, n }); },
    dropLootBag(x, y, z, opts) { bags.push({ x, y, z, ...opts }); },
    mmo: null,
  };
  setDebugAutoAttack(game, true);
  let ticks = 0;
  while (!live.dead && ticks < 80) {
    game.player.state = 'idle';
    const swung = tickDebugAutoAttack(game);
    assert.equal(swung, true);
    game.player.state = 'attack';
    assert.equal(tickDebugAutoAttack(game), false, 'waits out the swing');
    ticks++;
  }
  assert.equal(live.dead, true);
  assert.ok(attacks.length >= 8);
  assert.ok(grantDebugTankLoot(game, { ...mon, debugTank: true }));
  assert.ok(coins.length >= 1);
  assert.equal(bags.length, 1);
  assert.equal(bags[0].session, true);
  assert.equal(bags[0].label, 'Loot bag');
  assert.equal(bags[0].pickupAfter, DEBUG_LOOT_SIT);
  assert.ok(bags[0].pickupAfter >= 1.5);
  assert.equal(bags[0].item, DEBUG_LOOT_ID);
  assert.equal(DEBUG_LOOT_ID, TRANSIENT_LOOT_ID);
  const stripped = huntSavePayload({ gold: 9, goods: { [DEBUG_LOOT_ID]: 1, copper_ore: 2 }, debugGranted: { items: [DEBUG_LOOT_ID] } });
  assert.equal(stripped.goods[DEBUG_LOOT_ID], undefined);
  assert.equal(stripped.goods.copper_ore, 2);
  assert.ok(!JSON.stringify(payload).includes('debugTank'));
  assert.ok(!JSON.stringify(payload).includes('lootbag'));
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /grantDebugTankLoot/);
  assert.match(main, /m\.debugTank/);
  assert.match(main, /0xd4892a/);
  assert.match(main, /bag\.scale\.setScalar\(1\.45\)/);
  assert.match(main, /label \|\| 'Loot bag', 3600/);
  assert.match(main, /if \(!m\.debugTank\) this\.hud\.toast\(line/);
  const playerSrc = readFileSync(new URL('../src/entities/player.js', import.meta.url), 'utf8');
  assert.match(playerSrc, /auto \? 0 : knock/);
  assert.match(playerSrc, /if \(!auto && \(this\.state === 'attack'/);
  live.dead = false;
  live.hp = 90;
  game.player.state = 'idle';
  game.player.stamina = 40;
  game.debug.autoAtkCd = 0;
  assert.equal(tickDebugAutoAttack(game, 0.05), true);
  assert.equal(game.player.stamina, 40);
  assert.ok(game.debug.autoAtkCd >= 1);
  assert.equal(tickDebugAutoAttack(game, 0.2), false, 'cadence holds the next swing');
});

test('auto-attack ON, no input, tank dies in about 20s of simulated time', () => {
  const live = applyDebugTank({
    type: 'slime',
    x: 73.4,
    z: 73,
    y: 3,
    name: 'Gate Slime',
    hp: 18,
    maxHp: 18,
    dead: false,
    def: { gold: [2, 4], dmg: 2 },
  });
  const crate = { x: 67.4, z: 74.2, kind: 'storage' };
  const stolen = [];
  const attacks = [];
  const P = { pos: { x: 72, y: 3, z: 73 }, yaw: 0, dead: false, state: 'idle', stateT: 0, stateDur: 0, stamina: 40 };
  const game = {
    debug: { enabled: true, autoAttack: true },
    started: true,
    uiBlocking: false,
    player: P,
    items: [{ reach: 2.4, kind: 'melee', dmg: DEBUG_STARTER_DMG }],
    sel: 0,
    monsters: [live],
    world: { storage: crate },
    carried(it) { return it; },
    nearestMonster() { return crate; },
    clickStorage() { stolen.push('crate'); return true; },
    doAttack() {
      attacks.push({ t: sim, yaw: P.yaw });
      live.hp -= DEBUG_STARTER_DMG;
      if (live.hp <= 0) live.dead = true;
      P.state = 'attack';
      P.stateT = 0;
      P.stateDur = 0.4;
    },
    mmo: null,
  };
  setDebugAutoAttack(game, true);
  const budget = debugTankKillBudget(live.maxHp);
  let sim = 0;
  const dt = 0.05;
  while (!live.dead && sim < 28) {
    sim += dt;
    if (P.state === 'attack') {
      P.stateT += dt;
      if (P.stateT >= P.stateDur) P.state = 'idle';
    }
    tickDebugAutoAttack(game, dt, sim * 1000);
  }
  assert.equal(live.dead, true);
  assert.ok(sim >= 16 && sim <= 24, `died at ${sim.toFixed(2)}s, budget ${budget.sec}s`);
  assert.ok(Math.abs(sim - budget.sec) < 3, `kill time ${sim.toFixed(2)}s near budget ${budget.sec}s`);
  assert.ok(attacks.length >= 8);
  assert.equal(stolen.length, 0, 'interactables do not steal the lock');
  const lock = acquireAutoAttackTarget({ ...game, debug: { ...game.debug, autoAttack: true } });
  assert.equal(lock, null);
  const chicken = { type: 'chicken', x: 72.4, z: 73, dead: false };
  const tank = applyDebugTank({ type: 'slime', x: 73.5, z: 73, hp: 18, maxHp: 18, dead: false });
  const hold = {
    debug: { enabled: true, autoAttack: true, autoLock: tank },
    started: true,
    uiBlocking: false,
    player: { pos: { x: 72, z: 73 }, dead: false, state: 'idle' },
    items: [{ reach: 2.4 }],
    sel: 0,
    monsters: [chicken, tank],
    carried(it) { return it; },
    mmo: null,
  };
  assert.equal(acquireAutoAttackTarget(hold), tank);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /acquireAutoAttackTarget/);
  assert.match(main, /dropLootBag/);
  assert.match(main, /kind === 'lootbag'/);
  assert.match(main, /performance\.now\(\)/);
  assert.doesNotMatch(main, /else if \(!blocked\) tickDebugAutoAttack/);
});

test('MG-UI-22 oasis landing frames the pool above the hotbar clearance', () => {
  const oasis = resolveSpot('oasis');
  assert.ok(Math.hypot(oasis.x - 0, oasis.z - 432) > 70, 'stand back from the water');
  assert.ok(oasis.z >= 432 + 32 + 48, 'south / bottom side of the pool');
  const cam = { yaw: 0, targetYaw: 0, pitch: 0.8, dist: 12, targetDist: 12, lookAhead: 0 };
  const game = {
    world: { realm: 'over', heightAt: () => 3.2, revealAround() {} },
    player: { pos: { set(x, y, z) { this.x = x; this.y = y; this.z = z; }, x: 0, y: 0, z: 0 }, yaw: 0, syncObj() {} },
    cam,
    hud: { toast() {} },
    snapCamera() { this.snapped = true; },
  };
  const spot = teleportDebug(game, 'oasis');
  assert.ok(spot);
  assert.equal(cam.pitch, OASIS_CAM.pitch);
  assert.equal(cam.dist, OASIS_CAM.dist);
  assert.equal(cam.lookAhead, OASIS_CAM.lookAhead);
  assert.ok(cam.pitch <= 0.34, 'look toward the horizon so the pool sits above --hud-clear-bottom');
  assert.ok(OASIS_CAM.lookAhead >= 16);
  assert.ok(game.snapped);
  const flagsSrc = readFileSync(new URL('../src/debug/flags.js', import.meta.url), 'utf8');
  assert.match(flagsSrc, /hud-clear-bottom/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /lookAhead/);
});

test('debug tank standing next to the hunter drops HP on a 1.5-2s cadence', () => {
  const player = {
    pos: { x: 0, z: 0 },
    hp: 20,
    maxHp: 20,
    dead: false,
    hurt(dmg) { this.hp -= dmg; return true; },
  };
  const mon = applyDebugTank({
    type: 'slime',
    x: 1.1,
    z: 0,
    name: 'Gate Slime',
    hp: 18,
    maxHp: 18,
    cd: 4,
    state: 'idle',
    def: { aggro: 9, dmg: 5 },
  });
  const game = { debug: { enabled: true }, player, monsters: [mon], mmo: null };
  assert.equal(mon.state, 'chase');
  assert.equal(mon.def.dmg, 2);
  assert.equal(tickDebugTank(game, 0.1), 0);
  assert.equal(player.hp, 20);
  assert.equal(tickDebugTank(game, 0.2), 1);
  assert.ok(player.hp < 20, 'first melee lands');
  const after = player.hp;
  assert.equal(tickDebugTank(game, 0.5), 0);
  assert.equal(player.hp, after);
  assert.ok(DEBUG_TANK_CADENCE >= 1.5 && DEBUG_TANK_CADENCE <= 2);
  assert.equal(tickDebugTank(game, DEBUG_TANK_CADENCE), 1);
  assert.ok(player.hp < after, 'second hit after the cadence');
  const online = { ...game, mmo: { send() {} } };
  player.hp = 20;
  assert.equal(tickDebugTank(online, 2), 0);
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
