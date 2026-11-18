import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enterRift } from '../src/world/rift.js';

test('rift entry clears momentum and spawns safely inside the arena', () => {
  const calls = [];
  const player = {
    pos: { x: 12, y: 3, z: 40, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    vel: { x: 5, y: 0, z: 8, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    knock: { x: 2, y: 0, z: 3, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    setState(state) { calls.push(['state', state]); },
    syncObj() { calls.push(['sync']); },
  };
  const rift = {
    group: { visible: false },
    spawn: { x: 1617.5, z: 830 },
    heightAt: () => 2,
    cool: 0,
  };
  const game = {
    world: { realm: 'over', group: { visible: true }, rift },
    player,
    cam: { targetYaw: 0 },
    sky: { indoors: false },
    snapCamera() { calls.push(['camera']); },
    hud: { setArea() {}, banner() {}, toast() {} },
  };

  assert.equal(enterRift(game, { follow: true }), true);
  assert.equal(game.world.realm, 'rift');
  assert.equal(player.pos.x, rift.spawn.x);
  assert.equal(player.pos.z, rift.spawn.z - 1.5);
  assert.deepEqual([player.vel.x, player.vel.y, player.vel.z], [0, 0, 0]);
  assert.deepEqual([player.knock.x, player.knock.y, player.knock.z], [0, 0, 0]);
  assert.ok(calls.some(([kind, value]) => kind === 'state' && value === 'idle'));
  assert.ok(calls.some(([kind]) => kind === 'sync'));
});
