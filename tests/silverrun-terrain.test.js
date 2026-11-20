import assert from 'node:assert/strict';
import test from 'node:test';
import { World } from '../src/world/world.js';
import { buildForestBridge } from '../src/world/models.js';
import { generateRing, silverrunRiverCenterX } from '../src/world/ring.js';
import { W, ZONE } from '../src/world/terrain.js';
import { TILES } from '../src/world/tiles.js';

const flat = { H: new Float32Array(W * W).fill(3) };
const lands = generateRing(flat, flat);
const byKind = Object.fromEntries(lands.map((land) => [land.kind, land]));

function assertNorthSouth(a, b) {
  for (let x = 0; x < W; x++) {
    assert.equal(a.data.H[(W - 1) * W + x], b.data.H[x], `${a.kind}/${b.kind} north-south seam at ${x}`);
  }
}

function assertEastWest(a, b) {
  for (let z = 0; z < W; z++) {
    assert.equal(a.data.H[z * W + W - 1], b.data.H[z * W], `${a.kind}/${b.kind} east-west seam at ${z}`);
  }
}

test('tiles 77, 78, 87 and 88 are built as the Silverrun forest region', () => {
  const expected = new Map([[76, 'silverrunWest'], [77, 'silverrunNorth'], [78, 'silverrunEast'], [87, 'silverrunRiver'], [88, 'silverrunPeak']]);
  for (const [number, kind] of expected) {
    const tile = TILES.find((entry) => entry.n === number);
    assert.ok(tile, `tile ${number} exists`);
    assert.equal(tile.kind, kind);
    assert.equal(tile.biome, 'forest');
    assert.equal(tile.built, true);
  }
});

test('all four Silverrun tile seams meet exactly, including the Gilantre boundary', () => {
  assertEastWest(byKind.glassroad, byKind.silverrunWest);
  assertEastWest(byKind.silverrunWest, byKind.silverrunNorth);
  assertNorthSouth(byKind.silverrunNorth, byKind.silverrunRiver);
  assertNorthSouth(byKind.silverrunEast, byKind.silverrunPeak);
  assertEastWest(byKind.silverrunNorth, byKind.silverrunEast);
  assertEastWest(byKind.silverrunRiver, byKind.silverrunPeak);
  assertNorthSouth(byKind.gilantreSw, byKind.silverrunNorth);
  assertNorthSouth(byKind.gilantreSe, byKind.silverrunEast);
});

test('Silverrun river runs from the southern ocean through tiles 87 and 77', () => {
  const lower = byKind.silverrunRiver;
  const upper = byKind.silverrunNorth;
  const west = byKind.silverrunWest;
  const crossingZ = Array.from({ length: W }, (_, z) => z + west.z0).find((z) => Math.abs(silverrunRiverCenterX(z) - (west.x0 + W - 1)) < 0.6);
  assert.ok(crossingZ, 'river centerline crosses the Reedford/Silverrun seam');
  const westEdgeIndex = (crossingZ - west.z0) * W + (W - 1);
  const northEdgeIndex = (crossingZ - upper.z0) * W;
  assert.ok(west.data.H[westEdgeIndex] < 0.35, 'river water reaches Reedford seam');
  assert.ok(upper.data.H[northEdgeIndex] < 0.35, 'river water continues across Silverrun seam');
  assert.equal(west.data.zone[westEdgeIndex], ZONE.WATER);
  assert.equal(upper.data.zone[northEdgeIndex], ZONE.WATER);
  const lowerX = Math.floor(silverrunRiverCenterX(504) - lower.x0);
  const upperX = Math.floor(silverrunRiverCenterX(360) - upper.x0);
  assert.ok(lower.data.H[72 * W + lowerX] < 0.35, 'river water is present in tile 87');
  assert.ok(upper.data.H[72 * W + upperX] < 0.35, 'river water is present in tile 77');
  assert.ok(lower.data.H[143 * W + Math.floor(silverrunRiverCenterX(575) - lower.x0)] < 0.35, 'river mouth reaches the ocean edge');
  assert.equal(lower.data.zone[72 * W + lowerX], ZONE.WATER);
  assert.equal(upper.data.zone[72 * W + upperX], ZONE.WATER);
});

test('Greystone has a flat, climbable summit and a marked switchback trail', () => {
  const peak = byKind.silverrunPeak;
  for (const z of [67, 72, 78, 84, 89]) {
    for (const x of [1, 5, 9, 13, 17]) {
      const i = z * W + x;
      assert.equal(peak.data.H[i], 29);
      assert.equal(peak.data.climb[i], 1);
    }
  }
  const trail = 88 * W + 34;
  assert.equal(peak.data.climb[trail], 1);
  assert.notEqual(peak.data.H[40 * W + 8], peak.data.H[78 * W + 38], 'rock profile varies around the mountain rather than forming a smooth radial mound');
  const world = new World('high');
  world.lands = [peak];
  const wx = peak.x0 + 8.5;
  const wz = peak.z0 + 76.5;
  assert.equal(world.playable(wx, wz), true);
  assert.equal(world.canStep(wx, wz, 28.5), true);
  assert.equal(world.canStep(wx, wz, 26.5), false);
});

test('the timber bridge is modelled and treated as walkable ground above the river', () => {
  const parts = buildForestBridge(87);
  assert.ok(parts.length > 0);
  assert.ok(parts.some((part) => part.geo?.attributes?.position?.count > 0));
  const river = byKind.silverrunRiver;
  const world = new World('high');
  world.lands = [river];
  const x = silverrunRiverCenterX(504) + 0.5;
  const z = river.z0 + 72.5;
  world.forestBridge = {
    x, z, deckY: 2.5, halfX: 10.5, halfZ: 4.5,
    contains(px, pz) { return Math.abs(px - this.x) <= this.halfX && Math.abs(pz - this.z) <= this.halfZ; },
  };
  assert.equal(world.heightAt(x, z), 2.5);
  assert.equal(world.zoneAt(x, z), ZONE.FIELD);
  assert.equal(world.playable(x, z), true);
  assert.equal(world.canStep(x, z, 2.0), true);
  for (const [lx, lz] of [[30, 72], [23, 72], [17, 68], [13, 60]]) {
    const i = lz * W + lx;
    assert.equal(river.data.pathMask[i], 1, `western bridge approach path at ${lx},${lz}`);
    assert.equal(world.playable(river.x0 + lx + 0.5, river.z0 + lz + 0.5), true);
  }
});
