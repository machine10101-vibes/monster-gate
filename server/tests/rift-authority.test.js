import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../world.js';

function makeWorld({ x = 80, z = 98 } = {}) {
  let now = 10_000;
  const frames = [];
  const grants = [];
  const grantIds = new Set();
  const ws = { readyState: 1, send: (raw) => frames.push(JSON.parse(raw)) };
  const session = {
    id: 'hunter-1', userId: 'user-1', name: 'Hunter', guest: false,
    x, y: 3, z, yaw: 0, zone: 'Oakhollow', hp: 20, weapon: 'blade',
    ws, gone: false,
  };
  const social = {
    features: [],
    parties: { partyOf: () => null, parties: new Map() },
    onZone() {}, onPose() {}, onLeave() {}, onHp() {},
  };
  const world = new World({
    env: {},
    now: () => now,
    social,
    persist: {
      grantOnce: async (reward) => {
        if (grantIds.has(reward.rewardId)) return { granted: false };
        grantIds.add(reward.rewardId);
        grants.push(reward);
        return { granted: true };
      },
    },
  });
  world.players.set(session.id, session);
  return {
    world, session, frames, grants,
    advance(ms) { now += ms; return now; },
    setNow(value) { now = value; return now; },
  };
}

test('Rift entry is server-validated and all waves are server-owned', async () => {
  const f = makeWorld();
  await assert.rejects(() => f.world.enterRift({ ...f.session, x: 500 }), /Stand beside/);
  await f.world.enterRift(f.session);
  const run = [...f.world.riftRuns.values()][0];
  assert.equal(run.wave, 1);
  assert.equal(f.session.zone, 'rift');
  assert.ok(f.world.monsters.some((m) => m.riftRunId === run.id && m.hp > 0));

  while (!run.completed) {
    for (const monster of f.world.monsters) {
      if (monster.riftRunId === run.id) {
        monster.hp = 0;
        monster.dead = true;
        monster.respawnAt = 0;
      }
    }
    const start = f.advance(1);
    f.world.tickRiftRuns(start);
    f.setNow(run.pendingAt + 1);
    f.world.tickRiftRuns(run.pendingAt + 1);
  }
  assert.equal(run.wave, 3);
  assert.ok(f.frames.some((frame) => frame.type === 'rift_chest_ready'));
});

test('Rift chest claims distribute gold and each item once through reward persistence', async () => {
  const f = makeWorld();
  await f.world.enterRift(f.session);
  const run = [...f.world.riftRuns.values()][0];
  run.completed = true;
  run.chest = { x: 1617.5, z: 817.5 };
  f.session.x = run.chest.x;
  f.session.z = run.chest.z;

  await f.world.claimRiftChest(f.session);
  assert.equal(f.grants.filter((g) => g.kind === 'gold').length, 1);
  assert.equal(f.grants.filter((g) => g.kind === 'good').length, 2);
  assert.equal(run.claimed, true);
  await assert.rejects(() => f.world.claimRiftChest(f.session), /not ready/);
  assert.ok(f.frames.some((frame) => frame.type === 'rift_chest_result' && frame.ok));
});
