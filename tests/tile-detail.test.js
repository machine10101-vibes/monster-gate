import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BIOME_DETAIL, TILE_DETAIL, enrichTile } from '../src/world/enrich.js';
import { TILES, originOf } from '../src/world/tiles.js';
import { W, ZONE } from '../src/world/terrain.js';
import { TILE } from '../src/engine/materials.js';

const list = (name, n = 3) => Array.from({ length: n }, (_, i) => [{ kind: 'solid', geo: { uuid: `${name}${i}` } }]);
const models = () => ({
  oaks: list('oak', 4), pines: list('pine', 4), blossoms: list('blossom', 2), autumn: list('autumn', 2), giants: list('giant', 2), teal: list('teal', 2),
  bushes: list('bush'), ferns: list('fern'), tuftsForest: list('tf'), mushRed: list('mr'), mushBrown: list('mb'), flowers: list('flower', 4), tuftsGold: list('tg'),
  tufts: list('tuft'), rocks: list('rock'), boulders: list('boulder'), logs: list('log'), stumps: list('stump'), snowPines: list('sp'), crate: list('crate', 2), barrel: list('barrel', 2), pots: list('pot', 2),
  arctic: {}, volcanic: {}, desert: {}, jungle: {},
});

/** A flat meadow tile with a road down column 70 and a pond in one corner. */
function world(tile) {
  const o = originOf(tile);
  const data = { pathMask: new Uint8Array(W * W), zone: new Uint8Array(W * W).fill(ZONE.FIELD), top: new Uint8Array(W * W).fill(TILE.GRASS) };
  for (let z = 100; z < 120; z++) for (let x = 20; x < 50; x++) data.top[z * W + x] = TILE.FARMLAND;
  for (let z = 0; z < W; z++) data.pathMask[z * W + 70] = 1;
  for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) data.zone[z * W + x] = ZONE.WATER;
  const land = { x0: o.x, z0: o.z, data };
  const placed = [];
  return {
    placed, o,
    models: models(), quality: { scatter: 1 }, npcSpots: { keeper: { x: o.x + 100, z: o.z + 100 } }, treeDots: [],
    landAt: (x, z) => (x >= o.x && z >= o.z && x < o.x + W && z < o.z + W ? land : null),
    heightAt: () => 3, playable: () => true, free: () => true, overLedge: () => false,
    putAt: (parts, x, z) => placed.push({ parts, x, z }), occupy() {}, circle() {},
  };
}

test('every built tile has a detail recipe for its biome', () => {
  for (const t of TILES.filter((tt) => tt.built)) assert.ok(BIOME_DETAIL[t.biome], `${t.n} ${t.biome}`);
  assert.ok(TILE_DETAIL[24].grove < BIOME_DETAIL.volcanic.grove, 'the Endless Field battlefield stays open');
});

test('the detail pass fills a tile without touching roads, their verges, water or clearings', () => {
  const tile = TILES.find((t) => t.n === 44);
  const w = world(tile);
  const n = enrichTile(w, tile, 1);
  assert.ok(n > 800, `a full tile (${n} props)`);
  for (const p of w.placed) {
    const lx = Math.floor(p.x) - w.o.x;
    const lz = Math.floor(p.z) - w.o.z;
    assert.ok(Math.abs(lx - 70) > 1, `off the road and its verge (${lx})`);
    assert.ok(!(lx < 20 && lz < 20), 'not in the water');
    assert.ok(!(lx >= 18 && lx < 52 && lz >= 98 && lz < 122), 'not on ploughed farm strips or their margin');
    assert.ok(Math.hypot(p.x - (w.o.x + 100), p.z - (w.o.z + 100)) >= 4, 'clear of NPC posts');
  }
  // Deterministic: the same tile dresses the same way every load.
  const again = world(tile);
  enrichTile(again, tile, 1);
  assert.deepEqual(again.placed.map((p) => [p.x, p.z]), w.placed.map((p) => [p.x, p.z]));
  // Lower graphics quality keeps a share of the same scene.
  const low = world(tile);
  const nLow = enrichTile(low, tile, 0.4);
  assert.ok(nLow < n * 0.55 && nLow > n * 0.25, `low quality ${nLow} vs ${n}`);
});

test('detail draws near the hunter only, and the World Creator streams in the tile it photographs', () => {
  const world = readFileSync(new URL('../src/world/world.js', import.meta.url), 'utf8');
  assert.match(world, /export const DETAIL_RADIUS = \{ low: 54, medium: 78, high: 100 \};/);
  assert.match(world, /enrichWorld\(this\);/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /this\.world\.updateDetail\?\.\(px, pz, DETAIL_RADIUS\[this\.quality\?\.id\]/);
  const view = readFileSync(new URL('../src/world/tileview.js', import.meta.url), 'utf8');
  assert.match(view, /W\.streamAround\(cx, cz, TILE_SIZE \* 0\.75, 100000\)/);
  assert.match(view, /W\?\.updateDetail\?\.\(cx, cz, TILE_SIZE \* 0\.75, true\)/);
});
