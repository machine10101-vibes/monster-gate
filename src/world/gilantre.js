import * as THREE from 'three';
import { VoxelModel, hash2, lerp, clamp } from '../engine/voxel.js';
import { TILE } from '../engine/materials.js';
import { W, ZONE } from './terrain.js';
import { J, bundle, buildHouse, buildStall } from './models.js';
import { buildSmithy } from './smithy.js';

/**
 * Gilantre sits on the shared corner of tiles 57, 58, 67 and 68.
 * World (432, 144) is that corner. A brick wall and a moat ring the
 * streets. Drawbridges break the moat on the east and the west.
 * Outside the wall the ground stays prairie on the east tiles and
 * forest on the west tiles, the same mix Oakhollow's ring uses.
 *
 * Names below are the ones GPT-6 Luna gave for the town.
 */

export const CX = 432;
export const CZ = 144;
const FLOOR = 3;
const CITY_R = 26;
const MOAT_IN = 33;
const MOAT_OUT = 42;
const BRIDGE = 4.6;

export const GILANTRE_SPOTS = {
  arena: { x: 446, z: 130 },
  westgate: { x: 396, z: 144 },
  eastgate: { x: 468, z: 144 },
  grove: { x: 352, z: 128 },
  oak: { x: 506, z: 156 },
  reed: { x: 486, z: 156 },
  hall: { x: 422, z: 120 },
  smithy: { x: 410, z: 166 },
  forge: { x: 422, z: 154 },
  mine: { x: 408, z: 126 },
  wood: { x: 424, z: 122 },
  potion: { x: 450, z: 162 },
};

const ARENA = GILANTRE_SPOTS.arena;

function quarter(seed, forest, line) {
  return {
    banner: [line, 'Gilantre'],
    shade: 0.02,
    forest,
    amp: 1.45,
    base: 3.45,
    seed,
    rim: {},
    knolls: [[36, 48, 14, 1.6], [108, 78, 16, 1.8], [70, 24, 10, 1.1]],
    roads: [],
  };
}

export const GILANTRE_SPECS = {
  gilantreNw: quarter(57, 0.62, 'West Gate'),
  gilantreNe: quarter(58, 0.32, 'The Arena'),
  gilantreSw: quarter(67, 0.56, 'Ironhaven'),
  gilantreSe: quarter(68, 0.28, 'East Gate'),
};

const BRICKS = [0x8d3a32, 0xa3483c, 0x6e2c28, 0xb85a48, 0x7a342e];

function brickAt(x, y, z, seed) {
  const row = Math.floor(y / 2);
  const col = Math.floor((x + (row % 2) * 2) / 3);
  let c = BRICKS[Math.abs(col + row * 3) % BRICKS.length];
  if (y % 4 === 3) c = 0x5c4038;
  return J(c, x, y, z, seed, 0.05);
}

function stoneAt(x, y, z, seed) {
  const c = [0xc2b8a6, 0xd4cbb8, 0xaea492, 0xe4dcc8][Math.abs(x + y * 3 + z) % 4];
  return J(c, x, y, z, seed, 0.05);
}

let models;

function cityModels() {
  if (models) return models;
  const wall = new VoxelModel(28, 46, 8);
  wall.box(0, 0, 0, 28, 36, 8, (x, y, z) => brickAt(x, y, z, 3));
  for (let x = 0; x < 28; x += 4) wall.box(x, 36, 0, x + 2, 44, 8, (a, y, z) => brickAt(a, y, z, 3));
  wall.box(0, 34, 0, 28, 36, 1, 0x6a5a48);

  const tower = new VoxelModel(18, 68, 18);
  tower.box(0, 0, 0, 18, 54, 18, (x, y, z) => brickAt(x, y, z, 5));
  tower.box(0, 54, 0, 18, 58, 18, (x, y, z) => stoneAt(x, y, z, 5));
  for (let x = 0; x < 18; x += 4) {
    tower.box(x, 58, 0, x + 2, 66, 4, (a, y, z) => brickAt(a, y, z, 5));
    tower.box(x, 58, 14, x + 2, 66, 18, (a, y, z) => brickAt(a, y, z, 5));
  }
  tower.box(6, 40, 0, 12, 48, 2, 0xf2ead0);
  tower.box(7, 42, 0, 11, 46, 2, 0x87b4d4);

  const lintel = new VoxelModel(78, 10, 8);
  lintel.box(0, 0, 0, 78, 8, 8, (x, y, z) => brickAt(x, y, z, 7));
  lintel.box(0, 8, 0, 78, 10, 8, (x, y, z) => stoneAt(x, y, z, 7));

  const deck = new VoxelModel(22, 3, 16);
  deck.box(0, 0, 0, 22, 2, 16, (x, y, z) => J(z % 2 ? 0x8a5a34 : 0xa87244, x, y, z, 9, 0.06));
  deck.box(0, 2, 0, 22, 3, 2, 0x5c3a22);
  deck.box(0, 2, 14, 22, 3, 16, 0x5c3a22);

  const post = new VoxelModel(4, 16, 4);
  post.box(0, 0, 0, 4, 14, 4, (x, y, z) => J(0x6a4328, x, y, z, 11, 0.06));
  post.box(0, 14, 0, 4, 16, 4, 0xc8b070);

  const arch = new VoxelModel(22, 40, 8);
  arch.box(0, 0, 0, 22, 36, 8, (x, y, z) => stoneAt(x, y, z, 13));
  arch.carve(5, 0, 0, 17, 22, 8);
  for (let x = 5; x < 17; x++) {
    const rise = Math.sin(((x - 5) / 12) * Math.PI) * 8;
    arch.carve(x, 0, 0, x + 1, 14 + Math.floor(rise), 8);
  }
  arch.box(0, 34, 0, 22, 40, 8, (x, y, z) => stoneAt(x, y, z, 14));

  const seat = new VoxelModel(16, 14, 12);
  seat.box(0, 0, 0, 16, 4, 12, (x, y, z) => stoneAt(x, y, z, 15));
  seat.box(0, 4, 4, 16, 8, 12, (x, y, z) => stoneAt(x, y, z, 16));
  seat.box(0, 8, 8, 16, 12, 12, (x, y, z) => stoneAt(x, y, z, 17));

  const banner = new VoxelModel(14, 36, 4);
  banner.box(1, 0, 1, 3, 30, 3, (x, y, z) => J(0x6a4328, x, y, z, 19, 0.05));
  banner.box(3, 20, 1, 13, 29, 3, 0x8a1e1e);
  banner.box(3, 22, 1, 12, 27, 3, 0xa82828);
  banner.box(4, 23, 1, 10, 26, 3, 0xd4c07a);

  const chain = new VoxelModel(36, 10, 3);
  for (let x = 0; x < 36; x++) {
    const y = 7 - Math.round(Math.sin((x / 35) * Math.PI) * 6);
    chain.set(x, y, 1, 0x4a4e56);
    chain.set(x, y + 1, 1, 0x8a9098);
  }

  models = {
    wall: bundle([[wall, 0.075, 14, 0, 4]]),
    tower: bundle([[tower, 0.09, 9, 0, 9]]),
    lintel: bundle([[lintel, 0.16, 39, 0, 4]]),
    deck: bundle([[deck, 0.1, 11, 0, 8]]),
    post: bundle([[post, 0.08, 2, 0, 2]]),
    arch: bundle([[arch, 0.09, 11, 0, 4]]),
    seat: bundle([[seat, 0.1, 8, 0, 6]]),
    banner: bundle([[banner, 0.08, 2, 0, 2]]),
    chain: bundle([[chain, 0.12, 0, 0, 1]]),
  };
  return models;
}

function snap(h) {
  return Math.round(h * 2) / 2;
}

function reslope(H, slope) {
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const h = H[i];
      let s = 0;
      if (x + 1 < W) s = Math.max(s, Math.abs(H[i + 1] - h));
      if (x > 0) s = Math.max(s, Math.abs(H[i - 1] - h));
      if (z + 1 < W) s = Math.max(s, Math.abs(H[i + W] - h));
      if (z > 0) s = Math.max(s, Math.abs(H[i - W] - h));
      slope[i] = s;
    }
  }
}

function paintCell(data, i, tag) {
  const h = data.H[i];
  const { zone, top, tint, pathMask, forest } = data;
  if (tag === 'path') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.PATH;
    pathMask[i] = 1;
    forest[i] = 0;
    tint[i * 3] = 0.86;
    tint[i * 3 + 1] = 0.78;
    tint[i * 3 + 2] = 0.7;
    return;
  }
  if (tag === 'sand') {
    zone[i] = ZONE.FIELD;
    top[i] = TILE.SAND;
    pathMask[i] = 1;
    forest[i] = 0;
    tint[i * 3] = 0.92;
    tint[i * 3 + 1] = 0.84;
    tint[i * 3 + 2] = 0.62;
    return;
  }
  if (tag === 'water' || h < 0.35) {
    zone[i] = ZONE.WATER;
    top[i] = TILE.SAND;
    pathMask[i] = 0;
    forest[i] = 0;
    tint[i * 3] = 0.55;
    tint[i * 3 + 1] = 0.72;
    tint[i * 3 + 2] = 0.78;
    return;
  }
  if (h >= 8) {
    zone[i] = ZONE.MOUNTAIN;
    top[i] = TILE.STONE;
    pathMask[i] = 0;
    forest[i] = 0;
    tint[i * 3] = 0.9;
    tint[i * 3 + 1] = 0.91;
    tint[i * 3 + 2] = 0.97;
    return;
  }
  zone[i] = ZONE.FIELD;
  top[i] = TILE.GRASS;
  pathMask[i] = 0;
  forest[i] = Math.min(forest[i] || 0.2, 0.45);
  tint[i * 3] = 0.78;
  tint[i * 3 + 1] = 0.92;
  tint[i * 3 + 2] = 0.58;
}

function borderPin(pin) {
  for (let x = 0; x < W; x++) {
    pin[x] = 1;
    pin[(W - 1) * W + x] = 1;
  }
  for (let z = 0; z < W; z++) {
    pin[z * W] = 1;
    pin[z * W + W - 1] = 1;
  }
}

function shaveNear(data, pin) {
  const H = data.H;
  const dist = new Int16Array(W * W);
  dist.fill(-1);
  const q = [];
  for (let i = 0; i < pin.length; i++) {
    if (!pin[i]) continue;
    dist[i] = 0;
    q.push(i);
  }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    if (dist[i] >= 20) continue;
    const x = i % W;
    const z = (i / W) | 0;
    for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
      const j = nz * W + nx;
      if (dist[j] >= 0) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  for (let iter = 0; iter < 28; iter++) {
    for (const j of q) {
      if (pin[j]) continue;
      const x = j % W;
      const z = (j / W) | 0;
      let cap = H[j];
      let floor = -99;
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
        const n = nz * W + nx;
        cap = Math.min(cap, H[n] + 0.5);
        const border = nx === 0 || nz === 0 || nx === W - 1 || nz === W - 1;
        if (pin[n] && border) floor = Math.max(floor, H[n] - 0.5);
      }
      let h = Math.min(H[j], cap);
      if (h < floor) h = floor;
      H[j] = h;
    }
  }
}

function retintChanged(data, before) {
  for (let i = 0; i < data.H.length; i++) {
    if (Math.abs(data.H[i] - before[i]) < 0.02 && !data.pathMask[i]) continue;
    data.H[i] = snap(data.H[i]);
    paintCell(data, i, data.pathMask[i] ? 'path' : 'grass');
  }
  reslope(data.H, data.slope);
}

function cutRoad(data, pin, pts, half, endH) {
  const H = data.H;
  const x0 = Math.round(pts[0][0]);
  const z0 = Math.round(pts[0][1]);
  const startH = H[z0 * W + x0];
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let s = 0; s <= n; s++) samples.push([ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n, (i + s / n) / (pts.length - 1)]);
  }
  for (const [x, z, t] of samples) {
    const h = lerp(startH, endH, t);
    for (let dz = -half; dz <= half; dz++) {
      for (let dx = -half; dx <= half; dx++) {
        if (dx * dx + dz * dz > half * half) continue;
        const xx = Math.round(x + dx);
        const zz = Math.round(z + dz);
        if (xx <= 0 || zz <= 0 || xx >= W || zz >= W) continue;
        const i = zz * W + xx;
        H[i] = h;
        pin[i] = 1;
        data.pathMask[i] = 1;
      }
    }
  }
}

function fillPad(data, pin, x0, x1, z0, z1) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (x <= 0 || z < 0 || x >= W || z >= W) continue;
      const i = z * W + x;
      data.H[i] = FLOOR;
      pin[i] = 1;
      data.pathMask[i] = 1;
    }
  }
}

/** A walkable lane from Eastleas and Hayfield onto the west drawbridge. */
export function openGilantreWest(eastleas, hayfield) {
  const beforeE = Float32Array.from(eastleas.H);
  const beforeH = Float32Array.from(hayfield.H);
  const pinE = new Uint8Array(W * W);
  const pinH = new Uint8Array(W * W);
  borderPin(pinE);
  borderPin(pinH);
  cutRoad(eastleas, pinE, [[70, 70], [98, 102], [122, 122], [136, 132]], 6, FLOOR);
  fillPad(eastleas, pinE, 116, W - 1, 122, W - 1);
  shaveNear(eastleas, pinE);
  for (let x = 0; x < W; x++) {
    hayfield.H[x] = eastleas.H[(W - 1) * W + x];
    hayfield.pathMask[x] = eastleas.pathMask[(W - 1) * W + x];
    pinH[x] = 1;
  }
  cutRoad(hayfield, pinH, [[70, 60], [102, 36], [124, 18], [136, 10]], 6, FLOOR);
  fillPad(hayfield, pinH, 116, W - 1, 0, 18);
  shaveNear(hayfield, pinH);
  for (let x = 0; x < W; x++) {
    hayfield.H[x] = eastleas.H[(W - 1) * W + x];
    hayfield.pathMask[x] = eastleas.pathMask[(W - 1) * W + x];
  }
  retintChanged(eastleas, beforeE);
  retintChanged(hayfield, beforeH);
  for (let x = 0; x < W; x++) {
    const s = (W - 1) * W + x;
    hayfield.H[x] = eastleas.H[s];
    hayfield.pathMask[x] = eastleas.pathMask[s];
    hayfield.zone[x] = eastleas.zone[s];
    hayfield.top[x] = eastleas.top[s];
    hayfield.forest[x] = eastleas.forest[s];
    hayfield.tint[x * 3] = eastleas.tint[s * 3];
    hayfield.tint[x * 3 + 1] = eastleas.tint[s * 3 + 1];
    hayfield.tint[x * 3 + 2] = eastleas.tint[s * 3 + 2];
  }
  reslope(hayfield.H, hayfield.slope);
}

function landBy(lands, kind) {
  return lands.find((l) => l.kind === kind);
}

function copySeam(src, dst, dstKind, read, write) {
  for (let n = 0; n < W; n++) {
    const d = write(n);
    const lx = d % W;
    const lz = (d / W) | 0;
    if (locked(dstKind, lx, lz)) continue;
    const s = read(n);
    dst.H[d] = src.H[s];
    dst.zone[d] = src.zone[s];
    dst.top[d] = src.top[s];
    dst.pathMask[d] = src.pathMask[s];
    dst.forest[d] = src.forest[s];
    dst.tint[d * 3] = src.tint[s * 3];
    dst.tint[d * 3 + 1] = src.tint[s * 3 + 1];
    dst.tint[d * 3 + 2] = src.tint[s * 3 + 2];
  }
}

function tagAt(dx, dz, r, original) {
  const bridge = Math.abs(dz) < BRIDGE && Math.abs(dx) > CITY_R && Math.abs(dx) < MOAT_OUT + 6;
  const westRoad = dz > -BRIDGE && dz < BRIDGE && dx < -MOAT_OUT;
  const eastRoad = dz > -BRIDGE && dz < BRIDGE && dx > MOAT_OUT && dx < 78;
  if (r < CITY_R) {
    const ax = dx - (ARENA.x - CX);
    const az = dz - (ARENA.z - CZ);
    if ((ax * ax) / (8 * 8) + (az * az) / (6.2 * 6.2) < 1) return { h: FLOOR, tag: 'sand' };
    return { h: FLOOR, tag: 'path' };
  }
  if (r < MOAT_IN) return { h: FLOOR, tag: 'path' };
  if (bridge) return { h: FLOOR, tag: 'path' };
  if (r < MOAT_OUT) return { h: 0, tag: 'water' };
  if (westRoad) {
    const t = clamp((Math.abs(dx) - MOAT_OUT) / 90, 0, 1);
    return { h: lerp(FLOOR, original, t), tag: 'path' };
  }
  if (eastRoad) {
    const t = clamp((dx - MOAT_OUT) / 28, 0, 1);
    return { h: lerp(FLOOR, original, t), tag: t > 0.82 ? 'grass' : 'path' };
  }
  if (r < 56) {
    const t = clamp((r - MOAT_OUT) / 14, 0, 1);
    return { h: lerp(0.9, original, t), tag: 'grass' };
  }
  return null;
}

function locked(kind, lx, lz) {
  if (kind === 'gilantreNw' && (lx === 0 || lz === 0)) return true;
  if (kind === 'gilantreNe' && lz === 0) return true;
  if (kind === 'gilantreSw' && lx === 0) return true;
  return false;
}

/** Flatten the city, dig the moat, and keep the stitched borders. */
export function carveGilantre(lands) {
  const four = ['gilantreNw', 'gilantreNe', 'gilantreSw', 'gilantreSe'].map((k) => landBy(lands, k)).filter(Boolean);
  if (four.length !== 4) return;
  const original = new Map(four.map((l) => [l, Float32Array.from(l.data.H)]));
  const touched = new Map(four.map((l) => [l, new Uint8Array(W * W)]));
  for (const land of four) {
    const data = land.data;
    const base = original.get(land);
    for (let lz = 0; lz < W; lz++) {
      for (let lx = 0; lx < W; lx++) {
        if (locked(land.kind, lx, lz)) continue;
        const dx = land.x0 + lx + 0.5 - CX;
        const dz = land.z0 + lz + 0.5 - CZ;
        const hit = tagAt(dx, dz, Math.hypot(dx, dz), base[lz * W + lx]);
        if (!hit) continue;
        const i = lz * W + lx;
        data.H[i] = hit.h;
        paintCell(data, i, hit.tag);
        touched.get(land)[i] = hit.tag === 'water' ? 2 : 1;
      }
    }
  }
  for (const land of four) {
    const data = land.data;
    const pin = touched.get(land);
    for (let i = 0; i < pin.length; i++) if (locked(land.kind, i % W, (i / W) | 0)) pin[i] = 1;
    shaveNear(data, pin);
    for (let i = 0; i < data.H.length; i++) {
      const lx = i % W;
      const lz = (i / W) | 0;
      if (locked(land.kind, lx, lz)) continue;
      if (!pin[i] && Math.abs(data.H[i] - original.get(land)[i]) < 0.02) continue;
      if (pin[i] === 2) continue;
      data.H[i] = snap(data.H[i]);
      if (!data.pathMask[i] && data.zone[i] !== ZONE.WATER) paintCell(data, i, 'grass');
    }
    reslope(data.H, data.slope);
  }
  const nw = landBy(four, 'gilantreNw');
  const ne = landBy(four, 'gilantreNe');
  const sw = landBy(four, 'gilantreSw');
  const se = landBy(four, 'gilantreSe');
  copySeam(nw.data, ne.data, 'gilantreNe', (n) => n * W + (W - 1), (n) => n * W);
  copySeam(nw.data, sw.data, 'gilantreSw', (n) => (W - 1) * W + n, (n) => n);
  copySeam(ne.data, se.data, 'gilantreSe', (n) => (W - 1) * W + n, (n) => n);
  copySeam(sw.data, se.data, 'gilantreSe', (n) => n * W + (W - 1), (n) => n * W);
  for (const land of four) reslope(land.data.H, land.data.slope);
}

function gateGap(x, z) {
  const dx = x - CX;
  const dz = z - CZ;
  return Math.abs(dz) < 6.4 && Math.abs(dx) > 22 && Math.abs(dx) < 38;
}

function inArena(x, z, pad) {
  const ax = x - ARENA.x;
  const az = z - ARENA.z;
  return (ax * ax) / ((12 + pad) * (12 + pad)) + (az * az) / ((10 + pad) * (10 + pad)) < 1;
}

function dressWall(world, parts) {
  const count = 84;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = CX + Math.cos(a) * 29.2;
    const z = CZ + Math.sin(a) * 29.2;
    if (gateGap(x, z)) continue;
    world.putAt(parts.wall, x, z, a + Math.PI / 2, 1);
    world.circle(x, z, 0.85);
    world.occupy(x, z, 1.1);
  }
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const x = CX + sign * 28.4;
      const z = CZ + side * 7.1;
      world.putAt(parts.tower, x, z, 0, 1);
      world.circle(x, z, 1.05);
      world.occupy(x, z, 1.3);
      world.lightSpots.push({ x, y: world.heightAt(x, z) + 4.6, z, color: 0xffc870 });
    }
    const lx = CX + sign * 28.2;
    world.putAt(parts.lintel, lx, CZ, Math.PI / 2, 1, { y: world.heightAt(lx, CZ) + 3.15 });
    world.putAt(parts.chain, CX + sign * 26.2, CZ - 2.4, sign > 0 ? 0.15 : Math.PI - 0.15, 1, { y: world.heightAt(CX + sign * 26, CZ) + 1.2 });
    world.putAt(parts.chain, CX + sign * 26.2, CZ + 2.4, sign > 0 ? -0.15 : Math.PI + 0.15, 1, { y: world.heightAt(CX + sign * 26, CZ) + 1.2 });
    for (let i = 0; i < 8; i++) {
      const x = CX + sign * (24.5 + i * 2.35);
      world.putAt(parts.deck, x, CZ - 1.5, sign > 0 ? 0 : Math.PI, 1);
      world.putAt(parts.deck, x, CZ + 1.5, sign > 0 ? 0 : Math.PI, 1);
      if (i % 2 === 0) {
        world.putAt(parts.post, x, CZ - 3.6, 0, 1);
        world.putAt(parts.post, x, CZ + 3.6, 0, 1);
        world.circle(x, CZ - 3.6, 0.16);
        world.circle(x, CZ + 3.6, 0.16);
      }
    }
  }
}

function dressArena(world, parts) {
  const arches = 20;
  for (let i = 0; i < arches; i++) {
    const a = (i / arches) * Math.PI * 2;
    const gap = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
    if (Math.abs(gap) < 0.42) continue;
    const x = ARENA.x + Math.cos(a) * 11.4;
    const z = ARENA.z + Math.sin(a) * 9.2;
    world.putAt(parts.arch, x, z, a, 1);
    world.circle(x, z, 0.72);
    world.occupy(x, z, 0.9);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    const gap = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
    if (Math.abs(gap) < 0.48) continue;
    const x = ARENA.x + Math.cos(a) * 8.1;
    const z = ARENA.z + Math.sin(a) * 6.4;
    world.putAt(parts.seat, x, z, a + Math.PI, 1);
    world.circle(x, z, 0.85);
  }
  world.putAt(parts.banner, ARENA.x - 3.4, ARENA.z + 10.6, 0, 1);
  world.putAt(parts.banner, ARENA.x + 3.4, ARENA.z + 10.6, 0, 1);
  world.circle(ARENA.x - 3.4, ARENA.z + 10.6, 0.22);
  world.circle(ARENA.x + 3.4, ARENA.z + 10.6, 0.22);
  for (let i = 0; i < 6; i++) {
    const a = -0.8 + i * 0.32;
    const x = ARENA.x + Math.cos(a) * 4.2;
    const z = ARENA.z + 6.2 + Math.sin(a) * 1.2;
    world.torch(x, z, 0xffa040);
  }
}

function house(world, spec) {
  const parts = buildHouse({
    w: spec.w,
    d: spec.d,
    wh: spec.wh || 22,
    seed: spec.seed,
    wall: spec.wall,
    roof: spec.roof,
    shutters: spec.shutters,
    sign: spec.sign || null,
    pitch: spec.pitch || 1.05,
    chimney: spec.chimney !== false,
  });
  world.putAt(parts, spec.x, spec.z, spec.rot || 0, 1);
  const turned = spec.rot && Math.abs(spec.rot) > 0.2;
  const hw = (turned ? spec.d : spec.w) * 0.42;
  const hd = (turned ? spec.w : spec.d) * 0.42;
  world.box(spec.x, spec.z, hw, hd);
  world.occupy(spec.x, spec.z, Math.max(hw, hd) + 0.4);
}

function dressTown(world, parts) {
  const m = world.models;
  const roofs = {
    rust: [0xa8452f, 0xb9553a, 0x93402c, 0xc66443, 0x7d3a2b],
    gold: [0xc9a14a, 0xd9b45a, 0xb88f3c, 0xe6c76a, 0xa8802f],
    moss: [0x4f7f3a, 0x5d9444, 0x44702f, 0x6aa650, 0x3d5f2b],
    slate: [0x5c6370, 0x6a7280, 0x4a5160, 0x7d8694, 0x3e4552],
  };
  house(world, { x: 422, z: 120, w: 8, d: 5, seed: 57, wall: 0x8d4038, roof: roofs.rust, shutters: 0xd4c07a, sign: 'GILANTRE', pitch: 1.02 });
  house(world, { x: 408, z: 158, w: 5, d: 4, seed: 58, wall: 0x6e4634, roof: roofs.slate, shutters: 0x8d4038, rot: 0 });
  house(world, { x: 436, z: 156, w: 4, d: 5, seed: 59, wall: 0xc4b49a, roof: roofs.gold, shutters: 0x3f6f86, rot: Math.PI });
  house(world, { x: 418, z: 136, w: 4, d: 4, seed: 60, wall: 0x9a6a3c, roof: roofs.moss, shutters: 0xa8452f });
  house(world, { x: 454, z: 146, w: 4, d: 4, seed: 61, wall: 0x8a5a34, roof: roofs.rust, shutters: 0x4a8c86, rot: -Math.PI / 2 });

  const sx = GILANTRE_SPOTS.smithy.x;
  const sz = GILANTRE_SPOTS.smithy.z;
  const sy = world.heightAt(sx, sz);
  const g = new THREE.Group();
  g.name = 'ironhaven';
  g.position.set(sx, sy, sz);
  g.rotation.y = Math.PI;
  for (const p of buildSmithy(57)) {
    const mat = p.kind === 'solid' ? world.mats.solid : p.kind === 'glow' ? world.mats.glow : world.mats.window;
    const mesh = new THREE.Mesh(p.geo, mat);
    mesh.castShadow = p.kind === 'solid';
    mesh.receiveShadow = p.kind === 'solid';
    g.add(mesh);
  }
  world.group.add(g);
  world.box(sx, sz, 2.4, 2.1);
  world.occupy(sx, sz, 2.8);
  world.lightSpots.push({ x: sx, y: sy + 1.6, z: sz - 1.4, color: 0xff9a3a });
  world.gilantreSmithy = { x: sx, y: sy, z: sz - 1.6, name: 'Ironhaven', group: g };

  const fx = GILANTRE_SPOTS.forge.x;
  const fz = GILANTRE_SPOTS.forge.z;
  const fy = world.heightAt(fx, fz);
  world.putAt(m.forge, fx, fz, 0.4, 1.15);
  world.box(fx, fz, 0.85, 1.15);
  world.putAt(m.anvil, fx + 1.6, fz + 0.2, 0.5, 1);
  world.circle(fx + 1.6, fz + 0.2, 0.4);
  world.lightSpots.push({ x: fx + 0.4, y: fy + 0.9, z: fz, color: 0xff7a22 });
  world.gilantreForge = { x: fx, y: fy, z: fz, name: 'Ironhaven Forge' };

  const stalls = [
    { spot: GILANTRE_SPOTS.mine, seed: 4, awning: [0x6e7680, 0xd7c4a4], goods: 'pick', rot: 0 },
    { spot: GILANTRE_SPOTS.wood, seed: 5, awning: [0x6a8a3a, 0xe7d3a3], goods: 'timber', rot: 0 },
    { spot: GILANTRE_SPOTS.potion, seed: 6, awning: [0x5b3d86, 0xe4d4f6], goods: 'potion', rot: Math.PI },
  ];
  for (const s of stalls) {
    world.putAt(buildStall(s.seed, s.awning, s.goods), s.spot.x, s.spot.z, s.rot, 1);
    world.box(s.spot.x, s.spot.z, 1.8, 1.3);
    world.occupy(s.spot.x, s.spot.z, 2);
  }
  const px = GILANTRE_SPOTS.potion.x;
  const pz = GILANTRE_SPOTS.potion.z - 1.8;
  const py = world.heightAt(px, pz);
  world.putAt(m.cauldron, px, pz, 0.2, 1.1);
  world.circle(px, pz, 0.4);
  world.lightSpots.push({ x: px, y: py + 0.7, z: pz, color: 0x5dffb0 });
  world.gilantreAlchemy = { x: px, y: py, z: pz, name: "Lyra's Stall" };

  world.putAt(m.well, CX, CZ + 2.2, 0.2, 1);
  world.circle(CX, CZ + 2.2, 0.85);
  world.occupy(CX, CZ + 2.2, 1.1);
  world.putAt(m.sign, GILANTRE_SPOTS.westgate.x - 2, CZ - 5.2, -0.4, 1.15);
  world.putAt(m.sign, GILANTRE_SPOTS.eastgate.x + 2, CZ - 5.2, 0.6, 1.15);

  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    world.lamp(CX + i * 8, CZ - 5.4);
    world.lamp(CX + i * 8, CZ + 5.4);
    world.lamp(CX - 5.4, CZ + i * 8);
    world.lamp(CX + 5.4, CZ + i * 8);
  }
  world.lamp(ARENA.x, ARENA.z + 12.2);

  for (let n = 0; n < 14; n++) {
    const x = 414 + hash2(n, 2, 57) * 36;
    const z = 134 + hash2(n, 5, 57) * 22;
    if (Math.hypot(x - CX, z - CZ) > 22) continue;
    if (inArena(x, z, 1)) continue;
    if (Math.abs(x - CX) < 3 || Math.abs(z - CZ) < 3) continue;
    if (!world.free(x, z, 0.6)) continue;
    const roll = hash2(n, 1, 57);
    if (roll > 0.66) world.putAt(m.crate[n % 2], x, z, roll * 4, 1);
    else if (roll > 0.33) world.putAt(m.barrel[n % 2], x, z, roll * 4, 1);
    else world.putAt(m.pots[n % 4], x, z, roll * 4, 1);
    world.circle(x, z, 0.32);
  }
  for (let n = 0; n < 18; n++) {
    const a = hash2(n, 3, 58) * Math.PI * 2;
    const rad = 8 + hash2(n, 6, 58) * 12;
    const x = CX + Math.cos(a) * rad;
    const z = CZ + Math.sin(a) * rad;
    if (inArena(x, z, 0)) continue;
    if (!world.free(x, z, 0.4)) continue;
    world.putAt(n % 2 ? m.flowers[n % m.flowers.length] : m.tufts[n % m.tufts.length], x, z, a, 1, { cover: true });
  }
}

function dressWild(world, land) {
  const m = world.models;
  const spec = GILANTRE_SPECS[land.kind];
  const data = land.data;
  let trees = 0;
  for (let n = 0; n < 180 && trees < 52; n++) {
    const lx = 8 + Math.floor(hash2(n, 2, spec.seed) * (W - 16));
    const lz = 8 + Math.floor(hash2(n, 5, spec.seed) * (W - 16));
    const i = lz * W + lx;
    const h = data.H[i];
    if (data.pathMask[i] || data.zone[i] === ZONE.WATER || h < 1.15 || h > 7.4) continue;
    const x = land.x0 + lx + 0.5;
    const z = land.z0 + lz + 0.5;
    if (Math.hypot(x - CX, z - CZ) < 48) continue;
    if (!world.free(x, z, 1.5)) continue;
    const roll = hash2(n, 4, spec.seed);
    const wooded = (data.forest[i] || 0) > 0.28;
    if (!wooded) {
      if (roll > 0.45) {
        const parts = roll > 0.75 ? m.flowers[n % m.flowers.length] : m.tuftsGold[n % m.tuftsGold.length];
        world.putAt(parts, x, z, roll * 6, 1, { cover: true });
      }
      continue;
    }
    let parts = m.oaks[n % m.oaks.length];
    if (roll > 0.78) parts = m.pines[n % m.pines.length];
    else if (roll > 0.62) parts = m.blossoms[n % m.blossoms.length];
    world.putAt(parts, x, z, roll * 6, 0.66 + hash2(n, 1, spec.seed) * 0.36);
    world.circle(x, z, 0.38);
    world.occupy(x, z, 1.25);
    world.treeDots.push({ x, z });
    trees++;
  }
  for (let n = 0; n < 36; n++) {
    const a = hash2(n, 8, spec.seed) * Math.PI * 2;
    const rad = MOAT_IN + 0.8 + hash2(n, 3, spec.seed) * (MOAT_OUT - MOAT_IN - 1.6);
    const x = CX + Math.cos(a) * rad;
    const z = CZ + Math.sin(a) * rad;
    if (x < land.x0 + 1 || z < land.z0 + 1 || x >= land.x0 + W - 1 || z >= land.z0 + W - 1) continue;
    if (Math.abs(z - CZ) < BRIDGE + 1.4 && Math.abs(x - CX) > 20) continue;
    if (world.heightAt(x, z) > 0.45) continue;
    world.putAt(m.reeds[n % m.reeds.length], x, z, a, 1, { y: 0.36, cover: true });
  }
}

function cluster(world, x, z, n, scale) {
  const m = world.models;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 2.2 + (i % 3);
    const px = x + Math.cos(a) * rad;
    const pz = z + Math.sin(a) * rad;
    if (!world.free(px, pz, 1.1)) continue;
    world.putAt(i % 2 ? m.oaks[i % m.oaks.length] : m.pines[i % m.pines.length], px, pz, a, scale);
    world.circle(px, pz, 0.36);
    world.occupy(px, pz, 1.15);
    world.treeDots.push({ x: px, z: pz });
  }
}

const ROAM = [
  { x0: 424, z0: 136, x1: 442, z1: 150 },
  { x0: 416, z0: 140, x1: 430, z1: 152 },
];

const PEOPLE = [
  {
    id: 'grimbold',
    name: 'Grimbold Ironfist',
    title: 'Blacksmith',
    spot: 'grimbold',
    service: 'forge',
    x: 418, z: 156, yaw: 0.4,
    look: { skin: 0xc58a5e, hair: 0x1a120e, hairStyle: 'short', beard: true, tunic: 0x6a3030, sleeve: 0x4a4038, apron: 0x2e2c2a, pants: 0x2a2420, boots: 0x1c1612, bracer: true, seed: 57 },
    lines: [
      'Ironhaven is the hall. The anvil out front is mine. Bring bars if you want a weapon, the same as Bram asks on the pit road.',
      'The wall keeps the prairie out. It does not keep a bad edge out. Mind the heat.',
    ],
  },
  {
    id: 'ragnar',
    name: 'Ragnar Stonebeard',
    title: 'Mining tools',
    spot: 'ragnar',
    x: 408, z: 129.2, yaw: 2.4,
    look: { skin: 0xd0a078, hair: 0x8a8e94, hairStyle: 'short', beard: true, tunic: 0x4a5560, sleeve: 0x6a5438, pants: 0x3a342c, boots: 0x2a241c, hat: 'cap', hatColor: 0x3a4048, seed: 58 },
    lines: [
      'Picks, lanterns, and a head that stays on. The iron on this bench is for rock, not for boasting.',
      'Greyrock, Deepwell, the ash country. A pick from Gilantre works in all of them. Yours already does, if you have been swinging it.',
    ],
  },
  {
    id: 'elara',
    name: 'Elara Moonwhisper',
    title: 'Woodworking tools',
    spot: 'elara',
    x: 424, z: 125.4, yaw: 1.2,
    look: { skin: 0xf0c8a4, hair: 0x6a3a28, hairStyle: 'short', hairLen: 8, tunic: 0x3f6a38, sleeve: 0xe4d2b0, pants: 0x4a3a2c, boots: 0x3a2a1c, belt: true, seed: 59, eye: 0x3a6a40 },
    lines: [
      'The axe on the bench is for trees. Birch and oak to start, maple when your arm learns the difference.',
      'I mark the timber before anyone else claims it. The east road has one with my cut in the bark.',
    ],
  },
  {
    id: 'lyra',
    name: 'Lyra Swiftfoot',
    title: 'Potions',
    spot: 'lyra',
    service: 'alchemy',
    x: 450, z: 158.6, yaw: -1.6,
    look: { skin: 0xe8c0a0, hair: 0x243044, hairStyle: 'short', hairLen: 7, tunic: 0x3a2460, sleeve: 0x4c3278, apron: 0x1d3a32, pants: 0x241c30, boots: 0x1a141c, hat: 'hood', hatColor: 0x2a1848, belt: true, seed: 60, eye: 0x3ecf7a },
    lines: [
      'Draughts and philters. The fumes are the same work Lira does. I dry the herbs she does not have time for.',
      'The reed on the east bank is the one I cut. Look, do not pull. The water tells you if the moat is still clean.',
    ],
  },
  {
    id: 'marcellus',
    name: 'Marcellus Valerius',
    title: 'Arena master',
    spot: 'marcellus',
    x: 446, z: 142.4, yaw: -0.2,
    look: { skin: 0xe0b090, hair: 0x2a2218, hairStyle: 'short', tunic: 0xf2efe6, sleeve: 0xe6e0d4, vest: true, strap: 0x8a1e1e, pants: 0x4a3030, boots: 0x2a1c18, belt: true, seed: 61, eye: 0x4a3828 },
    lines: [
      'The bowl is older than the wall. Walk onto the sand if you want to know whether the gate turns you around.',
      'Steel and skill. The crowd will tell you which one you brought. I only keep the doors.',
    ],
  },
  {
    id: 'thrain',
    name: 'Thrain Blackwood',
    title: 'Citizen',
    spot: 'thrain',
    x: 430, z: 140, yaw: 1.1,
    roam: ROAM,
    look: { skin: 0xc89870, hair: 0x241810, hairStyle: 'short', beard: true, tunic: 0x3a3a40, sleeve: 0x5a4030, pants: 0x2c2824, boots: 0x1e1814, seed: 62 },
    lines: [
      'The guards count heads at the bridges. They do not count grudges.',
      'Stay on the cobbles after dark. The moat looks shallow and it is not.',
    ],
  },
  {
    id: 'elwynn',
    name: 'Elwynn Starseeker',
    title: 'Citizen',
    spot: 'elwynn',
    x: 436, z: 146, yaw: -0.6,
    roam: ROAM,
    look: { skin: 0xf2d0b0, hair: 0xd8d2c8, hairStyle: 'short', hairLen: 7, tunic: 0x2f4f6a, sleeve: 0xe8dcc8, pants: 0x3a342c, boots: 0x2a2420, hat: 'hood', hatColor: 0x243848, seed: 63 },
    lines: [
      'There is stone under the arena that was not cut by us. I have not found the stair, and Marcellus will not lend me a lamp.',
      'If you stand on the sand, look at the lowest course of blocks. The joints are older than the seats.',
    ],
  },
  {
    id: 'gwyneth',
    name: 'Gwyneth Earthsong',
    title: 'Citizen',
    spot: 'gwyneth',
    x: 428, z: 148, yaw: 2.2,
    roam: ROAM,
    look: { skin: 0xe8b892, hair: 0x6a4428, hairStyle: 'short', hairLen: 8, tunic: 0xb8452f, sleeve: 0xf0e2c8, pants: 0x3d4f78, boots: 0x3a2a1f, hat: 'straw', seed: 64 },
    lines: [
      'The fields outside the west bridge are thin this season. Something in the grass is eating the roots.',
      'Walk out to the trees and tell me if the soil is bare. I will not cross the moat with a basket.',
    ],
  },
  {
    id: 'osta',
    name: 'Osta',
    title: 'Gate guard',
    spot: 'osta',
    x: 412, z: 138.2, yaw: -0.8,
    look: { skin: 0xd8b090, hair: 0x3a2a20, hairStyle: 'short', tunic: 0x8a9098, sleeve: 0x6a5438, pants: 0x3a342c, boots: 0x2a221c, hat: 'cap', hatColor: 0x4a4038, bracer: true, seed: 65 },
    lines: ['West bridge is down. Do not try the moat. The reeds hide the drop.', 'Name and business, if you have either. Gilantre counts who comes in.'],
  },
  {
    id: 'bren',
    name: 'Bren',
    title: 'Gate guard',
    spot: 'bren',
    x: 452, z: 138.2, yaw: -2.4,
    look: { skin: 0xc8a080, hair: 0x241c16, hairStyle: 'short', beard: true, tunic: 0x8a9098, sleeve: 0x5a4634, pants: 0x2e2a26, boots: 0x1c1612, hat: 'cap', hatColor: 0x3e3a36, seed: 66 },
    lines: ['East bridge. Prairie that way, forest if you keep north of the road.', 'The arena is inside, on the north side of the well. Marcellus is loud enough to follow.'],
  },
];

function placePeople(world) {
  if (!world.npcSpots) world.npcSpots = {};
  world.townsfolk = [];
  for (const p of PEOPLE) {
    world.npcSpots[p.spot] = { x: p.x, z: p.z };
    world.townsfolk.push({
      id: p.id,
      name: p.name,
      title: p.title,
      spot: p.spot,
      yaw: p.yaw,
      service: p.service,
      roam: p.roam,
      look: p.look,
      lines: p.lines,
    });
  }
}

/** Buildings, the wall, the arena, and the prairie and forest outside it. */
export function dressGilantre(world) {
  if (!world.lands?.some((l) => l.kind === 'gilantreNw')) return;
  const parts = cityModels();
  dressWall(world, parts);
  dressArena(world, parts);
  dressTown(world, parts);
  for (const land of world.lands) if (String(land.kind || '').startsWith('gilantre')) dressWild(world, land);
  cluster(world, GILANTRE_SPOTS.grove.x, GILANTRE_SPOTS.grove.z, 7, 0.95);
  const oak = GILANTRE_SPOTS.oak;
  world.putAt(world.models.oaks[0], oak.x, oak.z, 0.4, 1.2);
  world.circle(oak.x, oak.z, 0.45);
  world.occupy(oak.x, oak.z, 1.3);
  world.treeDots.push({ x: oak.x, z: oak.z });
  world.putAt(world.models.sign, oak.x + 1.5, oak.z + 0.4, 0.8, 1.05);
  placePeople(world);
  world.gilantre = { ...GILANTRE_SPOTS };
}
