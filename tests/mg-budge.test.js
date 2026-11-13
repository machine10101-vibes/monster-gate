import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  BUDGE_BLOCKED_ZONES, BUDGE_CAP, BUDGE_LEVEL, BUDGE_RESPAWN_MS, BUDGE_STR,
  budgeSpawnAllowance, consumeBudgeReady, isOverworldBudge, liveOverworldBudgeCount,
  pickBudgeWorldSpot, scheduleBudgeRespawn,
} from '../src/data/budgeSpawn.js';
import { GEAR, MONSTERS, SETS, gearById } from '../src/data/catalog.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

class StepRng {
  constructor(seed = 0.13) {
    this.s = seed;
  }
  next() {
    this.s = (this.s * 1.7 + 0.17) % 1;
    return this.s;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
}

function fakeWorld(over = {}) {
  return {
    lands: over.lands || [
      { x0: 0, z0: 0 },
      { x0: 144, z0: 0 },
      { x0: 0, z0: 144 },
      { x0: 288, z0: 288 },
    ],
    playable: over.playable || (() => true),
    isWater: () => false,
    zoneAt: over.zoneAt || (() => 0),
    heightAt: () => 2,
    free: () => true,
    rift: { contains: () => false },
    cave: { contains: () => false },
    ...over,
  };
}

test('Budge dragons cap at 10 overworld and refill 30 minutes after a kill', () => {
  assert.equal(BUDGE_CAP, 10);
  assert.equal(BUDGE_RESPAWN_MS, 30 * 60 * 1000);
  const now = 1_000_000;
  assert.equal(budgeSpawnAllowance(now, 10, []), 0);
  assert.equal(budgeSpawnAllowance(now, 7, []), 3);
  const afterKill = scheduleBudgeRespawn(now, [], undefined);
  assert.equal(afterKill[0], now + BUDGE_RESPAWN_MS);
  assert.equal(budgeSpawnAllowance(now + 1000, 9, afterKill), 0);
  assert.equal(budgeSpawnAllowance(now + BUDGE_RESPAWN_MS, 9, afterKill), 1);
  const consumed = consumeBudgeReady(now + BUDGE_RESPAWN_MS, afterKill);
  assert.equal(consumed.length, 0);
  assert.deepEqual(scheduleBudgeRespawn(now, [], 'rift'), []);
  assert.deepEqual(scheduleBudgeRespawn(now, [], 'cave'), []);
});

test('Rift and cave budges do not count toward the overworld cap', () => {
  const pack = [
    { type: 'budgedragon', dead: false },
    { type: 'budgedragon', dead: false, realm: 'rift' },
    { type: 'budgedragon', dead: false, realm: 'cave' },
    { type: 'budgedragon', dead: true },
    { type: 'slime', dead: false },
  ];
  assert.equal(pack.filter(isOverworldBudge).length, 1);
  assert.equal(liveOverworldBudgeCount(pack), 1);
});

test('Budge dragons pick random playable lands and skip towns, water, and clumps', () => {
  const world = fakeWorld();
  const spots = [];
  const live = [];
  for (let i = 0; i < 8; i++) {
    const at = pickBudgeWorldSpot(world, new StepRng(0.05 + i * 0.11), { x: 40, z: 40 }, live, 22);
    assert.ok(at, `spot ${i}`);
    spots.push(at);
    live.push({ type: 'budgedragon', dead: false, x: at.x, z: at.z });
  }
  const lands = new Set(spots.map((s) => `${Math.floor(s.x / 144)},${Math.floor(s.z / 144)}`));
  assert.ok(lands.size >= 2, 'spread across more than one land');
  const town = fakeWorld({ zoneAt: () => 3 });
  assert.equal(pickBudgeWorldSpot(town, new StepRng(), { x: 0, z: 0 }, [], 0), null);
  const wet = fakeWorld({ isWater: () => true });
  assert.equal(pickBudgeWorldSpot(wet, new StepRng(), { x: 0, z: 0 }, [], 0), null);
  const blocked = BUDGE_BLOCKED_ZONES;
  assert.ok(blocked.has(3) && blocked.has(4) && blocked.has(7) && blocked.has(8));
});

test('Green Budge Dragon is a level 8 hunt and its gear gates on Strength', () => {
  const m = MONSTERS.find((row) => row.id === 'budgedragon');
  assert.equal(m.level, BUDGE_LEVEL);
  assert.equal(m.level, 8);
  assert.match(m.habitat, /whole world/i);
  assert.match(m.habitat, /ten/i);
  const blade = gearById('budgeblade');
  assert.equal(blade.item.dmg, 18);
  assert.equal(blade.reqLevel, BUDGE_STR);
  const iron = gearById('ironsword');
  const ashen = gearById('ashenbrand');
  assert.ok(iron.item.dmg < blade.item.dmg);
  assert.ok(blade.item.dmg < ashen.item.dmg);
  const budgeGear = GEAR.filter((g) => g.monster === 'budgedragon');
  assert.ok(budgeGear.length > 12);
  for (const g of budgeGear) {
    assert.ok((g.reqLevel | 0) >= BUDGE_STR, g.id);
  }
  assert.equal(gearById('budgemaul').reqLevel, 10);
  assert.equal(gearById('budgechest').def, 4);
  const plate = SETS.find((s) => s.id === 'budgeset');
  assert.equal(plate.hp, 6);
});

test('Spawner seeds world budges, caps them, and waits 30 minutes after a kill', () => {
  const monsters = src('../src/entities/monsters.js');
  assert.match(monsters, /seedBudges\(\)/);
  assert.match(monsters, /fillBudges\(\)/);
  assert.match(monsters, /noteBudgeDeath/);
  assert.match(monsters, /hp: 148,[\s\S]*dmg: 6/);
  assert.doesNotMatch(monsters, /\['budgedragon', 120, 74\]/);
  assert.doesNotMatch(monsters, /drakes < 2/);
  assert.match(monsters, /m\.type !== 'budgedragon'/);
  assert.match(monsters, /Lv \$\{this\.level\}/);
});
