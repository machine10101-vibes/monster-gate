import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { paintMonsterGateMarker, visibleMonsterGates } from '../src/ui/gateMarkers.js';

test('Monster Gate map markers stay tied to their realm while streamed meshes detach', () => {
  const overworld = {};
  const cave = {};
  const outside = { x: 104, z: 220, mapParent: overworld, group: { parent: null } };
  const inside = { x: 820, z: 828.4, mapParent: cave, group: { parent: null } };
  const world = { group: overworld, cave: { group: cave }, runeGates: [outside, inside], realm: 'over' };

  assert.deepEqual(visibleMonsterGates(world), [outside]);
  world.realm = 'cave';
  assert.deepEqual(visibleMonsterGates(world), [inside]);
  world.realm = 'rift';
  assert.deepEqual(visibleMonsterGates(world), []);
});

test('Monster Gate canvas marker is red, layered, and pulses with time', () => {
  const arcs = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, fill() {}, stroke() {},
    arc(_x, _y, radius) { arcs.push(radius); },
  };
  paintMonsterGateMarker(ctx, 12, 18, 3, 0);
  const first = [...arcs];
  arcs.length = 0;
  paintMonsterGateMarker(ctx, 12, 18, 3, Math.PI / 8.4);
  assert.equal(first.length, 4);
  assert.equal(arcs.length, 4);
  assert.notEqual(first[0], arcs[0], 'outer beacon radius should pulse');
});

test('both the minimap and full map render Monster Gate markers with an animated red pin', () => {
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(hud, /for \(const gate of visibleMonsterGates\(world\)\)/);
  assert.match(hud, /paintMonsterGateMarker\(ctx, toX\(gate\.x\), toZ\(gate\.z\)/);
  assert.match(hud, /className = 'playmap-gate-pin'/);
  assert.match(hud, /visibleMonsterGates\(game\.world\)/);
  assert.match(css, /\.playmap-gate-pin[\s\S]*animation: monster-gate-pulse/);
  assert.match(css, /@keyframes monster-gate-ripple/);
});
