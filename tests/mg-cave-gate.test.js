import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CAVE_MOUTH, CAVE_MOUTH_Y, SOUTH_Z } from '../src/world/southford.js';

const source = readFileSync(new URL('../src/world/southford.js', import.meta.url), 'utf8');

test('Darksycle entrance gate is anchored to the cut valley floor, not the surrounding bluff', () => {
  assert.deepEqual(CAVE_MOUTH, { x: 104, z: SOUTH_Z + 44 });
  assert.equal(CAVE_MOUTH_Y, 3.2);
  assert.match(source, /placeRuneGate\(world, \{ name: 'darksycle-gate', x: CAVE_MOUTH\.x, y: CAVE_MOUTH_Y, z: CAVE_MOUTH\.z, yaw: -Math\.PI \/ 2 \}\)/);
});

test('Darksycle cave transition still uses the same entrance coordinates and approach threshold', () => {
  const cave = readFileSync(new URL('../src/world/cave.js', import.meta.url), 'utf8');
  assert.match(cave, /const dx = P\.x - m\.x;/);
  assert.match(cave, /Math\.abs\(dz\) < 2\.3 && dx > -0\.6 && dx < 2/);
});
