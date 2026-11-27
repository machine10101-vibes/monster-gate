import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { TILE } from '../src/engine/materials.js';
import { W, ZONE, generateTile } from '../src/world/terrain.js';
import { generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { TILES, tileAt } from '../src/world/tiles.js';
import { NORTH_JUNGLE_KINDS, NORTH_JUNGLE_SPECS, northDensity, northFeature } from '../src/world/northJungle.js';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

let cached = null;
function ring() {
  if (cached) return cached;
  const oak = generateTile();
  openSouthPass(oak);
  openRingPasses(oak);
  const northEdge = new Float32Array(W);
  for (let x = 0; x < W; x++) northEdge[x] = oak.H[(W - 1) * W + x];
  const south = generateSouthford(northEdge);
  openValeSides(south);
  openSouthfordDesert(south);
  cached = generateRing(oak, south);
  return cached;
}
const land = (kind) => ring().find((l) => l.kind === kind);
const H = (l, x, z) => l.data.H[z * W + x];

test('tiles 25, 26, 35 and 36 are the built Northern Jungle', () => {
  const want = { 25: 'vinecrest', 26: 'sunfeather', 35: 'fernreach', 36: 'mistvale' };
  for (const [n, kind] of Object.entries(want)) {
    const t = TILES.find((x) => x.n === Number(n));
    assert.equal(t.kind, kind, `tile ${n}`);
    assert.equal(t.built, true, `tile ${n} built`);
    assert.equal(t.biome, 'jungle', `tile ${n} biome`);
  }
  assert.deepEqual(NORTH_JUNGLE_KINDS, ['fernreach', 'mistvale', 'vinecrest', 'sunfeather']);
  for (const k of NORTH_JUNGLE_KINDS) assert.equal(NORTH_JUNGLE_SPECS[k].banner[0], 'The Northern Jungle');
});

test('every Northern Jungle tile is generated and shares its borders exactly with its neighbours', () => {
  const pairs = [
    ['fernreach', 's', 'northleas'],
    ['fernreach', 'w', 'ashroad'],
    ['mistvale', 's', 'goldmead'],
    ['mistvale', 'w', 'fernreach'],
    ['mistvale', 'e', 'rimefang'],
    ['vinecrest', 's', 'fernreach'],
    ['vinecrest', 'w', 'warfield'],
    ['sunfeather', 's', 'mistvale'],
    ['sunfeather', 'w', 'vinecrest'],
  ];
  for (const [a, side, b] of pairs) {
    const A = land(a);
    const B = land(b);
    assert.ok(A && B, `${a} and ${b} exist`);
    for (let k = 0; k < W; k++) {
      const [ax, az, bx, bz] = side === 's' ? [k, W - 1, k, 0] : side === 'w' ? [0, k, W - 1, k] : [W - 1, k, 0, k];
      assert.equal(H(A, ax, az), H(B, bx, bz), `${a} ${side} edge with ${b} at ${k}`);
    }
  }
});

/** Walks a polyline of local cells across tiles and returns the steepest single step and the highest point. */
function walk(path) {
  let worst = 0;
  let high = 0;
  let prev = null;
  for (let i = 0; i < path.length - 1; i++) {
    const [ka, ax, az] = path[i];
    const [kb, bx, bz] = path[i + 1];
    const A = land(ka);
    const B = land(kb);
    const gax = A.x0 + ax;
    const gaz = A.z0 + az;
    const gbx = B.x0 + bx;
    const gbz = B.z0 + bz;
    const n = Math.ceil(Math.hypot(gbx - gax, gbz - gaz));
    for (let s = 0; s <= n; s++) {
      const gx = Math.round(gax + ((gbx - gax) * s) / n);
      const gz = Math.round(gaz + ((gbz - gaz) * s) / n);
      const L = ring().find((l) => gx >= l.x0 && gz >= l.z0 && gx < l.x0 + W && gz < l.z0 + W);
      const h = H(L, gx - L.x0, gz - L.z0);
      if (prev !== null) worst = Math.max(worst, Math.abs(h - prev));
      high = Math.max(high, h);
      prev = h;
    }
  }
  return { worst, high };
}

test('the passes from Northleas, Goldmead and the Endless Field are walkable into the jungle', () => {
  const routes = {
    northleas: [['northleas', 64, 55], ['northleas', 64, 0], ['fernreach', 64, 143], ['fernreach', 66, 120], ['fernreach', 76, 100], ['fernreach', 86, 84]],
    goldmead: [['goldmead', 84, 58], ['goldmead', 84, 0], ['mistvale', 84, 143], ['mistvale', 80, 120], ['mistvale', 66, 100], ['mistvale', 58, 80]],
    warfield: [['warfield', 72, 72], ['warfield', 143, 72], ['vinecrest', 0, 72], ['vinecrest', 30, 74], ['vinecrest', 56, 73], ['vinecrest', 74, 72]],
    fernToMist: [['fernreach', 110, 71], ['fernreach', 126, 74], ['fernreach', 143, 76], ['mistvale', 0, 76], ['mistvale', 30, 77], ['mistvale', 58, 80]],
    fernToVine: [['fernreach', 88, 48], ['fernreach', 82, 30], ['fernreach', 72, 0], ['vinecrest', 72, 143], ['vinecrest', 70, 112], ['vinecrest', 72, 90], ['vinecrest', 74, 72]],
    vineToSun: [['vinecrest', 74, 72], ['vinecrest', 104, 70], ['vinecrest', 143, 70], ['sunfeather', 0, 70], ['sunfeather', 30, 70], ['sunfeather', 55, 68]],
    mistToSun: [['mistvale', 58, 80], ['mistvale', 60, 50], ['mistvale', 60, 0], ['sunfeather', 60, 143], ['sunfeather', 62, 118], ['sunfeather', 68, 100], ['sunfeather', 72, 87]],
  };
  for (const [name, path] of Object.entries(routes)) {
    const { worst, high } = walk(path);
    assert.ok(worst <= 1, `${name} steepest step ${worst}`);
    assert.ok(high < 8.6, `${name} highest point ${high}`);
  }
});

test('both villages sit on a flat plaza of packed earth with roads entering through gates', () => {
  for (const kind of ['fernreach', 'sunfeather']) {
    const spec = NORTH_JUNGLE_SPECS[kind];
    const v = spec.village;
    const l = land(kind);
    assert.equal(northFeature(9, v.cx, v.cz, { ...spec, ox: l.x0, oz: l.z0 }).h, v.h);
    let dirt = 0;
    let water = 0;
    for (let z = v.cz - 10; z <= v.cz + 10; z++)
      for (let x = v.cx - 10; x <= v.cx + 10; x++) {
        const i = z * W + x;
        if (l.data.top[i] === TILE.DIRT || l.data.top[i] === TILE.PATH) dirt++;
        if (l.data.zone[i] === ZONE.WATER) water++;
        assert.ok(Math.abs(l.data.H[i] - v.h) <= 1, `${kind} plaza height at ${x},${z} is ${l.data.H[i]}`);
      }
    assert.equal(water, 0, `${kind} plaza is dry`);
    assert.ok(dirt > 150, `${kind} plaza earth cells ${dirt}`);
    const ends = spec.roads.flatMap((r) => [r[0], r[r.length - 1]]).filter((p) => Math.abs(Math.hypot(p[0] - v.cx, p[1] - v.cz) - v.r) < 4);
    assert.ok(ends.length >= 2, `${kind} has ${ends.length} gates`);
  }
});

test('the jungle thins and recolours toward the meadow, scorched and frozen borders', () => {
  const fern = { ...NORTH_JUNGLE_SPECS.fernreach, ox: 0, oz: -288 };
  const d = northDensity(fern);
  assert.ok(d(72, W - 3) < 0.6, 'thin beside Northleas');
  assert.ok(d(3, 60) < 0.6, 'thin beside Ashen Road');
  assert.equal(d(72, 60), 1, 'full in the middle');
  const mist = land('mistvale');
  const tintG = (l, x, z) => l.data.tint[(z * W + x) * 3 + 1];
  let edge = 0;
  let mid = 0;
  for (let x = 20; x < 50; x++) {
    edge += tintG(mist, x, W - 3);
    mid += tintG(mist, x, 30);
  }
  assert.ok(edge / 30 > mid / 30, 'the south edge is the lighter meadow green');
});

test('the Northern Jungle keeps out of the jungle monster lands and has villagers, smoke and gates', () => {
  const jungle = src('src/world/jungle.js');
  assert.match(jungle, /if \(spec\.north\) \(jun\.north \|\|= \[\]\)\.push\(land\);\s*else jun\.lands\.push\(land\);/);
  const north = src('src/world/northJungle.js');
  for (const key of ['tribeHut', 'tribeStiltHut', 'tribeLonghouse', 'tribeTotem', 'tribeFirePit', 'tribePalisade', 'tribeGate', 'tribeRack', 'tribePots', 'tribeDrum', 'tribeCanoe']) {
    assert.match(north, new RegExp(`J\\.${key}`), key);
  }
  assert.match(north, /tribe\.smoke\.push/);
  assert.match(src('src/entities/ambient.js'), /game\.world\.tribe\?\.folk/);
  assert.match(src('src/main.js'), /emitVillageSmoke\(dt\)/);
  assert.ok(tileAt(4, 2).built && tileAt(5, 2).built && tileAt(4, 3).built && tileAt(5, 3).built);
});
