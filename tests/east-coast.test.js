import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { TILE } from '../src/engine/materials.js';
import { W, ZONE, generateTile, buildTerrainMeshes } from '../src/world/terrain.js';
import { generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { TILES } from '../src/world/tiles.js';
import { EAST_COAST_KINDS, OCEAN_FLOOR } from '../src/world/eastCoast.js';

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
const top = (l, x, z) => l.data.top[z * W + x];

test('tiles 39, 49 and 59 are built and 40, 50 and 60 are open ocean', () => {
  const want = { 39: ['glacierbay', 'arctic'], 49: ['frostshore', 'arctic'], 59: ['seawind', 'meadow'] };
  for (const [n, [kind, biome]] of Object.entries(want)) {
    const t = TILES.find((x) => x.n === Number(n));
    assert.equal(t.kind, kind, `tile ${n}`);
    assert.equal(t.built, true);
    assert.equal(t.biome, biome, `tile ${n} biome`);
  }
  for (const n of [40, 50, 60]) assert.equal(TILES.find((x) => x.n === n).biome, 'sea', `tile ${n} is sea`);
  assert.deepEqual(EAST_COAST_KINDS, ['glacierbay', 'frostshore', 'seawind']);
});

test('coast tiles share every border exactly with their neighbours, and the east edge is open sea floor', () => {
  const pairs = [
    ['glacierbay', 'w', 'glimmerfrost'],
    ['frostshore', 'w', 'icewind'],
    ['frostshore', 'n', 'glacierbay'],
    ['seawind', 'w', 'gilantreNe'],
    ['seawind', 'n', 'frostshore'],
    ['icewind', 'n', 'glimmerfrost'],
  ];
  for (const [a, side, b] of pairs) {
    const A = land(a);
    const B = land(b);
    for (let k = 0; k < W; k++) {
      const [ax, az, bx, bz] = side === 'w' ? [0, k, W - 1, k] : [k, 0, k, W - 1];
      assert.equal(H(A, ax, az), H(B, bx, bz), `${a} ${side} edge with ${b} at ${k}`);
    }
  }
  for (const kind of EAST_COAST_KINDS) {
    const l = land(kind);
    for (let z = 1; z < W - 1; z++) assert.equal(H(l, W - 1, z), Math.fround(OCEAN_FLOOR), `${kind} east edge at ${z}`);
  }
});

test('every row of the coast runs from land through a shore into the sea', () => {
  for (const kind of EAST_COAST_KINDS) {
    const l = land(kind);
    for (let z = 20; z < W - 20; z += 6) {
      let firstWater = -1;
      for (let x = 60; x < W; x++)
        if (l.data.zone[z * W + x] === ZONE.WATER) {
          firstWater = x;
          break;
        }
      assert.ok(firstWater > 80 && firstWater < 128, `${kind} row ${z} shore at ${firstWater}`);
      for (let x = firstWater; x < W; x++) assert.equal(l.data.zone[z * W + x], ZONE.WATER, `${kind} row ${z} sea at ${x}`);
      const beach = top(l, firstWater - 3, z);
      assert.ok(kind === 'seawind' ? beach === TILE.SAND : [TILE.GRAVEL, TILE.SNOW, TILE.ICE].includes(beach), `${kind} beach at row ${z} is ${beach}`);
    }
  }
});

test('Frostshore thaws to grass toward Seawind Leas and Seawind Leas is frosted along its north edge', () => {
  const snowy = (l, z0, z1) => {
    let s = 0;
    let g = 0;
    for (let z = z0; z < z1; z++)
      for (let x = 10; x < 70; x++) {
        const t = top(l, x, z);
        if (t === TILE.SNOW) s++;
        if (t === TILE.GRASS || t === TILE.FLOWER_GRASS || t === TILE.FROST_GRASS) g++;
      }
    return { s, g };
  };
  const fs = land('frostshore');
  const north = snowy(fs, 10, 40);
  const south = snowy(fs, W - 14, W - 2);
  assert.ok(north.s > north.g, `Frostshore north is snow (${north.s} snow, ${north.g} grass)`);
  assert.ok(south.g > south.s, `Frostshore south is grass (${south.s} snow, ${south.g} grass)`);
  const sw = land('seawind');
  const edge = snowy(sw, 1, 12);
  const mid = snowy(sw, 70, 90);
  assert.ok(edge.s + 0 > mid.s, 'more frost along the north edge than in the middle');
  assert.equal(mid.s, 0, 'no snow in the middle of the leas');
});

/** Walks a polyline of local cells across tiles: steepest step and highest point. */
function walk(path) {
  let worst = 0;
  let high = 0;
  let prev = null;
  for (let i = 0; i < path.length - 1; i++) {
    const A = land(path[i][0]);
    const B = land(path[i + 1][0]);
    const ax = A.x0 + path[i][1];
    const az = A.z0 + path[i][2];
    const bx = B.x0 + path[i + 1][1];
    const bz = B.z0 + path[i + 1][2];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az));
    for (let s = 0; s <= n; s++) {
      const gx = Math.round(ax + ((bx - ax) * s) / n);
      const gz = Math.round(az + ((bz - az) * s) / n);
      const L = ring().find((l) => gx >= l.x0 && gz >= l.z0 && gx < l.x0 + W && gz < l.z0 + W);
      const h = H(L, gx - L.x0, gz - L.z0);
      if (prev !== null) worst = Math.max(worst, Math.abs(h - prev));
      high = Math.max(high, h);
      prev = h;
    }
  }
  return { worst, high };
}

test('passes from Glimmerfrost and Icewind Reach, and the roads between the coast tiles, are walkable', () => {
  const routes = {
    glimmerfrost: [['glimmerfrost', 70, 112], ['glimmerfrost', 143, 112], ['glacierbay', 0, 112], ['glacierbay', 30, 112], ['glacierbay', 62, 112], ['glacierbay', 90, 120], ['glacierbay', 96, 143]],
    icewind: [['icewind', 100, 50], ['icewind', 143, 50], ['frostshore', 0, 50], ['frostshore', 40, 58], ['frostshore', 70, 84]],
    bayToShore: [['frostshore', 70, 84], ['frostshore', 84, 44], ['frostshore', 96, 0], ['glacierbay', 96, 143]],
    shoreToLeas: [['frostshore', 70, 84], ['frostshore', 86, 116], ['frostshore', 92, 143], ['seawind', 92, 0], ['seawind', 82, 40], ['seawind', 60, 66]],
    leasWest: [['seawind', 60, 66], ['seawind', 32, 74], ['seawind', 0, 72]],
  };
  for (const [name, path] of Object.entries(routes)) {
    const { worst, high } = walk(path);
    assert.ok(worst <= 1, `${name} steepest step ${worst}`);
    assert.ok(high < 8.6, `${name} highest point ${high}`);
  }
});

test('the coast ground meshes have no cracks on gentle terraces', () => {
  for (const kind of EAST_COAST_KINDS) {
    const l = land(kind);
    const ys = new Map();
    buildTerrainMeshes(l.data, new THREE.MeshBasicMaterial(), { ox: l.x0, oz: l.z0 }).traverse((m) => {
      const pos = m.geometry?.attributes?.position;
      const nor = m.geometry?.attributes?.normal;
      if (!pos || !nor) return;
      for (let i = 0; i < pos.count; i++) {
        if (nor.getY(i) < 0.3) continue;
        const gx = Math.round(pos.getX(i));
        const gz = Math.round(pos.getZ(i));
        if (Math.abs(pos.getX(i) - gx) > 0.02 || Math.abs(pos.getZ(i) - gz) > 0.02) continue;
        const k = `${gx},${gz}`;
        const s = ys.get(k) || [];
        if (!s.some((v) => Math.abs(v - pos.getY(i)) < 0.02)) s.push(pos.getY(i));
        ys.set(k, s);
      }
    });
    let cracks = 0;
    let samples = 0;
    for (let z = 1; z < W - 1; z++)
      for (let x = 1; x < W - 1; x++) {
        let lo = 1e9;
        let hi = -1e9;
        for (const [cx, cz] of [[x - 1, z - 1], [x - 1, z], [x, z - 1], [x, z]]) {
          lo = Math.min(lo, H(l, cx, cz));
          hi = Math.max(hi, H(l, cx, cz));
        }
        if (hi - lo > 1.001 || hi - lo < 0.05) continue;
        const got = ys.get(`${x + l.x0},${z + l.z0}`);
        if (!got) continue;
        samples++;
        if (got.length > 1) cracks++;
      }
    assert.ok(samples > 200, `${kind} samples ${samples}`);
    assert.equal(cracks, 0, `${kind} cracks ${cracks}/${samples}`);
  }
});
