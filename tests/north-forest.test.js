import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { TILE } from '../src/engine/materials.js';
import { W, ZONE, generateTile, buildTerrainMeshes } from '../src/world/terrain.js';
import { generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { TILES } from '../src/world/tiles.js';
import { OCEAN_FLOOR } from '../src/world/eastCoast.js';
import { NORTH_FOREST_KINDS } from '../src/world/northForest.js';
import { TILE_DETAIL } from '../src/world/enrich.js';

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
const SNOWY = new Set([TILE.SNOW, TILE.FROST_GRASS, TILE.ICE]);
const GREEN = new Set([TILE.GRASS, TILE.FLOWER_GRASS]);

test('tiles 17, 18, 19, 27, 28 and 29 are built forest; 7, 8 and 9 (and 20, 30 off the east shore) are open ocean', () => {
  const want = { 17: 'pinestrand', 18: 'elmshade', 19: 'coldridge', 27: 'darkbough', 28: 'mossmere', 29: 'rimewood' };
  for (const [n, kind] of Object.entries(want)) {
    const t = TILES.find((x) => x.n === Number(n));
    assert.equal(t.kind, kind, `tile ${n}`);
    assert.equal(t.built, true, `tile ${n} built`);
    assert.equal(t.biome, 'forest', `tile ${n} biome`);
    assert.ok(land(kind), `${kind} is generated`);
  }
  for (const n of [7, 8, 9, 20, 30]) assert.equal(TILES.find((x) => x.n === n).biome, 'sea', `tile ${n} is sea`);
  assert.deepEqual(NORTH_FOREST_KINDS, ['darkbough', 'mossmere', 'rimewood', 'pinestrand', 'elmshade', 'coldridge']);
  for (const n of [17, 18, 19, 27, 28, 29]) assert.ok(TILE_DETAIL[n]?.groveSeed, `tile ${n} shares the forest grove field`);
});

test('the forest shares every border exactly with its neighbours, and the north and east edges are open sea floor', () => {
  const pairs = [
    ['darkbough', 'w', 'sunfeather'],
    ['darkbough', 's', 'rimefang'],
    ['mossmere', 'w', 'darkbough'],
    ['mossmere', 's', 'glimmerfrost'],
    ['rimewood', 'w', 'mossmere'],
    ['rimewood', 's', 'glacierbay'],
    ['pinestrand', 's', 'darkbough'],
    ['elmshade', 'w', 'pinestrand'],
    ['elmshade', 's', 'mossmere'],
    ['coldridge', 'w', 'elmshade'],
    ['coldridge', 's', 'rimewood'],
    // The Arctic seams the new passes run beside stay exact.
    ['glimmerfrost', 'w', 'rimefang'],
    ['icewind', 'n', 'glimmerfrost'],
    ['glacierbay', 'w', 'glimmerfrost'],
  ];
  for (const [a, side, b] of pairs) {
    const A = land(a);
    const B = land(b);
    for (let k = 0; k < W; k++) {
      // 'w': A's west column against B's east column; 'n': A's north row against B's south row; 's': the reverse.
      const [ax, az, bx, bz] = side === 'w' ? [0, k, W - 1, k] : side === 'n' ? [k, 0, k, W - 1] : [k, W - 1, k, 0];
      assert.equal(H(A, ax, az), H(B, bx, bz), `${a} ${side} edge with ${b} at ${k}`);
    }
  }
  const floor = Math.fround(OCEAN_FLOOR);
  for (const kind of ['pinestrand', 'elmshade', 'coldridge']) for (let x = 1; x < W - 1; x++) assert.equal(H(land(kind), x, 0), floor, `${kind} north edge at ${x}`);
  for (const kind of ['rimewood', 'coldridge']) for (let z = 1; z < W - 1; z++) assert.equal(H(land(kind), W - 1, z), floor, `${kind} east edge at ${z}`);
});

test('every column of 17 to 19 runs from open sea over a beach into the forest', () => {
  for (const kind of ['pinestrand', 'elmshade', 'coldridge']) {
    const l = land(kind);
    for (let x = 12; x < (kind === 'coldridge' ? 84 : W - 12); x += 6) {
      // The brook that runs out to the sea is the one gap in the sand.
      if (kind === 'pinestrand' && Math.abs(x - 30) < 6) continue;
      let firstLand = -1;
      for (let z = 0; z < W; z++) {
        const i = z * W + x;
        if (l.data.zone[i] !== ZONE.WATER && top(l, x, z) !== TILE.STONE && top(l, x, z) !== TILE.MOSS_STONE) {
          firstLand = z;
          break;
        }
      }
      assert.ok(firstLand > 30 && firstLand < 70, `${kind} column ${x} shore at ${firstLand}`);
      assert.ok([TILE.SAND, TILE.GRAVEL].includes(top(l, x, firstLand + 3)), `${kind} beach at column ${x} is ${top(l, x, firstLand + 3)}`);
      let green = 0;
      for (let z = 96; z < 130; z++) if (GREEN.has(top(l, x, z))) green++;
      assert.ok(green > 10, `${kind} column ${x} is forest inland (${green})`);
    }
  }
});

test('the Glacier Bay shore carries on up the east of Rimewood and Coldridge', () => {
  for (const kind of ['rimewood', 'coldridge']) {
    const l = land(kind);
    for (let z = kind === 'coldridge' ? 70 : 10; z < W - 10; z += 6) {
      let firstWater = -1;
      for (let x = 60; x < W; x++)
        if (l.data.zone[z * W + x] === ZONE.WATER) {
          firstWater = x;
          break;
        }
      assert.ok(firstWater > 84 && firstWater < 126, `${kind} row ${z} shore at ${firstWater}`);
    }
  }
});

test('snow creeps up from the Arctic along the south of 27 to 29, and the middle of the forest is green', () => {
  for (const kind of ['darkbough', 'mossmere', 'rimewood']) {
    const l = land(kind);
    let s = 0;
    let g = 0;
    for (let z = W - 12; z < W - 1; z++)
      for (let x = 4; x < 90; x++) {
        if (SNOWY.has(top(l, x, z))) s++;
        if (GREEN.has(top(l, x, z))) g++;
      }
    assert.ok(s > g * 4, `${kind} south edge is snow (${s} snow, ${g} grass)`);
    let ms = 0;
    for (let z = 40; z < 70; z++) for (let x = 10; x < 90; x++) if (SNOWY.has(top(l, x, z))) ms++;
    assert.equal(ms, 0, `${kind} has no snow in its middle`);
  }
  for (const kind of ['pinestrand', 'elmshade', 'coldridge']) {
    const l = land(kind);
    let s = 0;
    for (let i = 0; i < W * W; i++) if (SNOWY.has(l.data.top[i])) s++;
    assert.equal(s, 0, `${kind} has no snow`);
  }
});

test('Darkbough fades toward Sunfeather\'s jungle on the west, and Sunfeather toward the forest on the east', () => {
  const blue = (l, x0, x1) => {
    let sum = 0;
    let n = 0;
    for (let z = 10; z < 90; z++)
      for (let x = x0; x < x1; x++) {
        const i = z * W + x;
        if (!GREEN.has(l.data.top[i]) || l.data.pathMask[i]) continue;
        sum += l.data.tint[i * 3 + 2] / l.data.tint[i * 3 + 1];
        n++;
      }
    return sum / n;
  };
  const d = land('darkbough');
  assert.ok(blue(d, 1, 10) < blue(d, 60, 100) - 0.08, 'jungle-warm green at the west edge, cool forest green inside');
  assert.ok(land('sunfeather').detailBiome == null, 'Sunfeather keeps its own jungle kit');
  assert.equal(typeof d.detailBiome, 'function');
  assert.equal(d.detailBiome(70, W - 3), 'arctic', 'snow takes the frost kit');
  const p = land('pinestrand');
  let sand = null;
  for (let z = 30; z < 70 && !sand; z++) if (top(p, 80, z) === TILE.SAND) sand = z;
  assert.equal(p.detailBiome(80, sand), 'strand', 'the beach takes the strand kit');
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
      assert.ok(L.data.pathMask[(gz - L.z0) * W + (gx - L.x0)], `${path[i][0]}→${path[i + 1][0]}: road at ${gx},${gz}`);
      if (prev !== null) worst = Math.max(worst, Math.abs(h - prev));
      high = Math.max(high, h);
      prev = h;
    }
  }
  return { worst, high };
}

test('roads from Sunfeather and Glimmerfrost, and between all six forest tiles, are paved and walkable', () => {
  const routes = {
    sunfeatherGate: [['sunfeather', 97, 66], ['sunfeather', 143, 66], ['darkbough', 0, 66], ['darkbough', 40, 70], ['darkbough', 78, 76]],
    acrossSouth: [['darkbough', 78, 76], ['darkbough', 143, 74], ['mossmere', 0, 74], ['mossmere', 36, 78], ['mossmere', 72, 80], ['mossmere', 143, 72], ['rimewood', 0, 72], ['rimewood', 40, 70], ['rimewood', 66, 58]],
    glimmerfrostPass: [['glimmerfrost', 18, 70], ['glimmerfrost', 18, 0], ['mossmere', 18, 143], ['mossmere', 22, 118], ['mossmere', 36, 78]],
    toPinestrand: [['darkbough', 78, 76], ['darkbough', 84, 40], ['darkbough', 76, 0], ['pinestrand', 76, 143], ['pinestrand', 70, 110], ['pinestrand', 60, 84], ['pinestrand', 54, 66]],
    toElmshade: [['mossmere', 72, 80], ['mossmere', 66, 40], ['mossmere', 70, 0], ['elmshade', 70, 143], ['elmshade', 72, 110], ['elmshade', 92, 92], ['elmshade', 98, 66]],
    toColdridge: [['rimewood', 66, 58], ['rimewood', 70, 30], ['rimewood', 72, 0], ['coldridge', 72, 143], ['coldridge', 66, 112], ['coldridge', 40, 96], ['coldridge', 58, 70]],
    alongNorth: [['pinestrand', 70, 110], ['pinestrand', 110, 100], ['pinestrand', 143, 96], ['elmshade', 0, 96], ['elmshade', 40, 98], ['elmshade', 72, 110]],
    elmToCold: [['elmshade', 92, 92], ['elmshade', 143, 94], ['coldridge', 0, 94], ['coldridge', 40, 96]],
    rimewoodBeach: [['rimewood', 66, 58], ['rimewood', 88, 62]],
  };
  for (const [name, path] of Object.entries(routes)) {
    const { worst, high } = walk(path);
    assert.ok(worst <= 1, `${name} steepest step ${worst}`);
    assert.ok(high < 8.6, `${name} highest point ${high}`);
  }
});

test('the forest ground meshes have no cracks on gentle terraces', () => {
  for (const kind of NORTH_FOREST_KINDS) {
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
