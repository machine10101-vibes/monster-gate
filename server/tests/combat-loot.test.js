import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatLoot } from '../combat-loot.js';

function fixture(mode = 'round_robin') {
  let time = 10_000;
  const messages = [];
  const a = { id: 'a', userId: 'ua', zone: 'Oakhollow', x: 0, z: 0, serverDamage: 20 };
  const b = { id: 'b', userId: 'ub', zone: 'Oakhollow', x: 1, z: 0, serverDamage: 20 };
  const players = new Map([['a', a], ['b', b]]);
  const party = { id: 'p', loot: mode, members: [{ id: 'a', joinedAt: 1 }, { id: 'b', joinedAt: 2 }] };
  const parties = {
    partyOf: (id) => ['a','b'].includes(id) ? party : null,
    get: (id) => id === 'p' ? party : null,
  };
  const monster = { id: 'm1', type: 'testbeast', zone: 'Oakhollow', x: 2, z: 0, hp: 20, maxHp: 20, level: 2, respawn: 10, drops: [{ kind: 'good', id: 'hide', amount: 1 }] };
  const grants = [];
  const grantIds = new Set();
  const engine = createCombatLoot({
    monsters: [monster], players, parties, now: () => time,
    random: () => 50,
    persist: { grantOnce: async (g) => {
      if (grantIds.has(g.rewardId)) return { granted: false };
      grantIds.add(g.rewardId);
      grants.push(g);
      return { granted: true };
    } },
    broadcast: (m) => messages.push(m),
  });
  return { engine, a, b, monster, grants, messages, advance: (ms) => { time += ms; } };
}

test('server attack owns damage, kill, XP, gold, respawn and rejects forged range', async () => {
  const f = fixture();
  f.a.x = 100;
  await assert.rejects(() => f.engine.attack(f.a, 'm1'), /out of range/);
  f.a.x = 0;
  const hit = await f.engine.attack(f.a, 'm1');
  assert.deepEqual(hit, { monster_id: 'm1', damage: 20, hp: 0, killed: true });
  assert.equal(f.monster.dead, true);
  assert.equal(f.grants.filter((g) => g.kind === 'xp').length, 2);
  assert.equal(f.grants.filter((g) => g.kind === 'gold').length, 2);
  assert.equal(f.messages.filter((m) => m.type === 'reward_update' && m.kind === 'xp').length, 2);
  assert.equal(f.messages.filter((m) => m.type === 'reward_update' && m.kind === 'gold').length, 2);
  await assert.rejects(() => f.engine.attack(f.a, 'm1'), /not alive/);
  f.advance(10_001);
  await f.engine.tick();
  assert.equal(f.monster.dead, false);
  assert.equal(f.monster.hp, 20);
});

test('round robin assigns drops in stable party join order and never grants twice', async () => {
  const f = fixture();
  await f.engine.attack(f.a, 'm1');
  const drop = f.grants.find((g) => g.kind === 'good');
  assert.equal(drop.userId, 'ua');
  assert.equal(f.grants.filter((g) => g.kind === 'good').length, 1);
});

test('need beats greed; ties resolve by party join order', async () => {
  const f = fixture('need_greed');
  await f.engine.attack(f.a, 'm1');
  const roll = f.messages.find((m) => m.type === 'loot_roll');
  assert.ok(roll);
  await f.engine.choose(f.b, roll.roll_id, 'greed');
  await f.engine.choose(f.a, roll.roll_id, 'need');
  assert.equal(f.grants.find((g) => g.kind === 'good').userId, 'ua');
});

test('all-pass need/greed falls back to round robin; duplicate and forged choices fail', async () => {
  const f = fixture('need_greed');
  await f.engine.attack(f.a, 'm1');
  const roll = f.messages.find((m) => m.type === 'loot_roll');
  await assert.rejects(() => f.engine.choose({ id: 'intruder' }, roll.roll_id, 'need'), /Authenticated hunter/);
  await f.engine.choose(f.a, roll.roll_id, 'pass');
  await assert.rejects(() => f.engine.choose(f.a, roll.roll_id, 'need'), /Choice already/);
  await f.engine.choose(f.b, roll.roll_id, 'pass');
  assert.equal(f.grants.find((g) => g.kind === 'good').userId, 'ua');
});

test('expired rolls auto-pass missing members and resolve', async () => {
  const f = fixture('need_greed');
  await f.engine.attack(f.a, 'm1');
  const roll = f.messages.find((m) => m.type === 'loot_roll');
  await f.engine.choose(f.a, roll.roll_id, 'greed');
  f.advance(20_001);
  await f.engine.tick();
  assert.equal(f.grants.filter((g) => g.kind === 'good').length, 1);
  assert.equal(f.engine.pendingRolls(), 0);
});

test('equal Need rolls break ties by original party join order', async () => {
  const f = fixture('need_greed');
  await f.engine.attack(f.a, 'm1');
  const roll = f.messages.find((m) => m.type === 'loot_roll');
  await f.engine.choose(f.b, roll.roll_id, 'need');
  await f.engine.choose(f.a, roll.roll_id, 'need');
  assert.equal(f.grants.find((g) => g.kind === 'good').userId, 'ua');
});

test('forged session objects cannot attack or submit loot choices', async () => {
  const f = fixture('need_greed');
  await assert.rejects(() => f.engine.attack({ ...f.a }, 'm1'), /Authenticated hunter/);
  await f.engine.attack(f.a, 'm1');
  const roll = f.messages.find((m) => m.type === 'loot_roll');
  await assert.rejects(() => f.engine.choose({ ...f.b }, roll.roll_id, 'need'), /Authenticated hunter/);
});

test('Rift chest items use the same per-item round robin and durable replay protection', async () => {
  const f = fixture();
  const chest = [
    { kind: 'gold', id: 'gold', amount: 38 },
    { kind: 'good', id: 'copper_ore', amount: 2 },
    { kind: 'good', id: 'birch_logs', amount: 1 },
  ];
  await f.engine.distribute(chest, [f.a, f.b], 'p', 'rift:run-1:chest');
  assert.equal(f.grants.filter((g) => g.kind === 'gold').length, 2);
  assert.equal(f.grants.find((g) => g.id === 'copper_ore').userId, 'ua');
  assert.equal(f.grants.find((g) => g.id === 'birch_logs').userId, 'ub');
  const before = f.grants.length;
  await f.engine.distribute(chest, [f.a, f.b], 'p', 'rift:run-1:chest');
  assert.equal(f.grants.length, before);
});

test('Rift chest items honour Need/Greed when party loot mode is enabled', async () => {
  const f = fixture('need_greed');
  await f.engine.distribute([{ kind: 'good', id: 'copper_ore', amount: 2 }], [f.a, f.b], 'p', 'rift:run-2:chest');
  const roll = f.messages.find((m) => m.type === 'loot_roll');
  assert.ok(roll);
  await f.engine.choose(f.b, roll.roll_id, 'greed');
  await f.engine.choose(f.a, roll.roll_id, 'need');
  assert.equal(f.grants.find((g) => g.kind === 'good').userId, 'ua');
});
