import { VoxelModel, RNG, hash3, jitter, mix, shade } from '../engine/voxel.js';
import { bundle, J } from './models.js';

/** Props for the four Arctic tiles: frosted pines, ice, drifts, igloos, bones and the yeti nest. */

const SNOW = [0xf4f8ff, 0xe8f0fa, 0xdce8f6, 0xffffff];
const ICE = [0xa9dcff, 0xcdeeff, 0x7fc4f0, 0xe6f9ff];
const ICE_DEEP = 0x4f8fc8;
const FROST_G = [0x1c5a45, 0x24684f, 0x1d4f48, 0x2a7456];
const snowCol = (x, y, z, s = 0) => jitter(SNOW[Math.floor(hash3(x, y, z, 700 + s) * SNOW.length)], 0.025, hash3(x, y, z, 701 + s));
const iceCol = (x, y, z, t = 0.5, s = 0) => jitter(t > 0.8 ? ICE[3] : t > 0.45 ? ICE[1] : hash3(x, y, z, 710 + s) > 0.5 ? ICE[0] : ICE[2], 0.03, hash3(x, y, z, 711 + s));

function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.35, glow = false) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1 + (hash3(x, y, z, seed) - 0.5) * noise) {
          const c = typeof color === 'function' ? color(x, y, z, d) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c, glow);
        }
      }
}

/** A tapering prism that leans: the crystal building block. */
function prism(m, bx, by, bz, dx, dy, dz, len, r0, colorFn, glowTip = true) {
  const n = Math.hypot(dx, dy, dz) || 1;
  for (let k = 0; k <= len; k++) {
    const t = k / len;
    const r = Math.max(0.5, r0 * (1 - t * t * 0.9));
    const cx = bx + (dx / n) * k;
    const cy = by + (dy / n) * k;
    const cz = bz + (dz / n) * k;
    const R = Math.ceil(r);
    for (let a = -R; a <= R; a++)
      for (let c = -R; c <= R; c++) {
        if (Math.max(Math.abs(a), Math.abs(c)) > r + 0.3 && Math.hypot(a, c) > r) continue;
        const x = Math.round(cx + a);
        const y = Math.round(cy);
        const z = Math.round(cz + c);
        const tip = glowTip && t > 0.86;
        m.set(x, y, z, tip ? 0xf2fcff : colorFn(x, y, z, t), tip && hash3(x, y, z, 5) > 0.3);
      }
  }
}

/* -------------------------------- trees -------------------------------- */

export function buildFrostPine(seed, tiers = 5, r0 = 6) {
  const rng = new RNG(seed * 131 + 7);
  const trunkH = 10 + tiers * 2;
  const T = new VoxelModel(6, trunkH, 6);
  T.box(1, 0, 1, 5, trunkH, 5, (x, y, z) => shade(J(0x4c3524, x, y, z, seed, 0.1), hash3(x, 0, z, seed) > 0.6 ? 0.82 : 1));
  T.box(0, 0, 1, 1, 2, 5, (x, y, z) => J(0x42301f, x, y, z, seed));
  T.box(5, 0, 1, 6, 2, 5, (x, y, z) => J(0x42301f, x, y, z, seed));
  const layers = tiers * 2 + 3;
  const F = new VoxelModel(r0 * 2 + 5, layers + 3, r0 * 2 + 5);
  const c = r0 + 2.5;
  const droop = rng.range(0.1, 0.35);
  for (let ly = 0; ly < layers; ly++) {
    const tier = Math.floor(ly / 2);
    const inTier = ly % 2;
    const base = r0 - tier * ((r0 - 1) / tiers);
    const r = inTier === 0 ? base : base - 1.3;
    if (r < 0.5) continue;
    for (let z = 0; z < F.sz; z++)
      for (let x = 0; x < F.sx; x++) {
        const dx = x + 0.5 - c;
        const dz = z + 0.5 - c;
        const d = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        const edge = hash3(x, ly, z, seed) * 0.9 + Math.sin(ang * 6 + ly) * 0.4;
        if (d > r + edge * 0.5) continue;
        let col = FROST_G[Math.floor(hash3(x, ly, z, seed + 3) * FROST_G.length)];
        col = shade(col, inTier === 0 ? 0.8 : 1.0);
        const snowy = inTier === 1 || d < r - 1.2 - tier * 0.15;
        if (snowy && d < r - 0.2 + droop) col = snowCol(x, ly, z, seed);
        F.set(x, ly + 1, z, J(col, x, ly, z, seed, 0.05));
        if (inTier === 0 && d > r - 0.6 && hash3(x, ly, z, seed + 9) > 0.62) F.set(x, ly, z, J(ICE[Math.floor(hash3(x, ly, z, seed + 10) * 3)], x, ly, z, seed, 0.04));
      }
  }
  F.set(Math.floor(c), layers + 1, Math.floor(c), 0xffffff);
  return bundle([
    [T, 0.125, 3, 0, 3],
    [F, 0.25, c, -trunkH * 0.5 * 0.5 - 0.9, c],
  ]);
}

export function buildDeadTree(seed) {
  const rng = new RNG(seed * 53 + 3);
  const M = new VoxelModel(30, 38, 30);
  const bark = (x, y, z) => shade(J(0x5a4a42, x, y, z, seed, 0.08), hash3(x, y, z, seed + 1) > 0.7 ? 0.8 : 1);
  M.box(13, 0, 13, 17, 26, 17, bark);
  M.box(12, 0, 13, 13, 3, 17, bark);
  M.box(17, 0, 13, 18, 3, 17, bark);
  M.box(13, 0, 12, 17, 3, 13, bark);
  M.box(13, 0, 17, 17, 3, 18, bark);
  M.box(14, 26, 14, 16, 33, 16, bark);
  const limbs = 5;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.range(0, 1);
    const y0 = 12 + i * 3;
    const len = rng.range(7, 12);
    const tx = 15 + Math.cos(a) * len;
    const tz = 15 + Math.sin(a) * len;
    M.line(15, y0, 15, tx, y0 + rng.range(4, 8), tz, bark, 2);
    const mx = 15 + Math.cos(a) * len * 0.6;
    const mz = 15 + Math.sin(a) * len * 0.6;
    M.line(mx, y0 + 3, mz, mx + Math.cos(a + 0.7) * 4, y0 + 8, mz + Math.sin(a + 0.7) * 4, bark, 1);
  }
  for (let z = 0; z < 30; z++)
    for (let x = 0; x < 30; x++) {
      for (let y = 37; y > 3; y--) {
        if (M.has(x, y, z) && !M.has(x, y + 1, z)) {
          if (hash3(x, y, z, seed + 4) > 0.3) M.set(x, y + 1, z, snowCol(x, y, z, seed));
          break;
        }
      }
    }
  return bundle([[M, 0.125, 15, 0, 15]]);
}

export function buildFrostBush(seed) {
  const M = new VoxelModel(14, 10, 14);
  blob(M, 7, 3.4, 7, 5.2, 3.2, 5.2, (x, y, z) => J(hash3(x, y, z, seed) > 0.5 ? 0x3d6b48 : 0x2f5a3e, x, y, z, seed, 0.06), seed, 0.6);
  blob(M, 7, 5.4, 7, 4.2, 1.8, 4.2, (x, y, z) => snowCol(x, y, z, seed), seed + 1, 0.6);
  for (let i = 0; i < 7; i++) {
    const x = 3 + Math.floor(hash3(i, 1, seed, 3) * 8);
    const z = 3 + Math.floor(hash3(i, 2, seed, 3) * 8);
    for (let y = 6; y >= 1; y--) {
      if (M.has(x, y, z)) {
        M.set(x, y, z, J(0xd8313b, x, y, z, seed, 0.05));
        break;
      }
    }
  }
  return bundle([[M, 0.125, 7, 0, 7]]);
}

export function buildFrostFlower(seed) {
  const M = new VoxelModel(10, 9, 10);
  for (let i = 0; i < 4; i++) {
    const x = 2 + Math.floor(hash3(i, seed, 1, 8) * 6);
    const z = 2 + Math.floor(hash3(i, seed, 2, 8) * 6);
    const h = 3 + Math.floor(hash3(i, seed, 3, 8) * 3);
    for (let y = 0; y < h; y++) M.set(x, y, z, J(0x3c7a5a, x, y, z, seed));
    M.set(x, h, z, 0xcff2ff, true);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) M.set(x + dx, h - 1, z + dz, hash3(x + dx, h, z + dz, seed) > 0.4 ? 0x7fd0ff : 0xaee8ff, true);
  }
  blob(M, 5, 0.5, 5, 4.5, 1.1, 4.5, (x, y, z) => snowCol(x, y, z, seed), seed, 0.9);
  return bundle([[M, 0.125, 5, 0, 5]]);
}

/* ---------------------------------- ice --------------------------------- */

export function buildIceCluster(seed, scale = 1) {
  const rng = new RNG(seed * 29 + 11);
  const M = new VoxelModel(26, 34, 26);
  const n = rng.int(4, 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const rad = i === 0 ? 0 : rng.range(2, 6) * scale;
    const bx = 13 + Math.cos(a) * rad;
    const bz = 13 + Math.sin(a) * rad;
    const len = (i === 0 ? rng.range(17, 24) : rng.range(8, 17)) * scale;
    const tilt = i === 0 ? 0.1 : rng.range(0.2, 0.55);
    prism(M, bx, 0, bz, Math.cos(a) * tilt, 1, Math.sin(a) * tilt, len, (i === 0 ? 3.2 : rng.range(1.6, 2.6)) * scale, (x, y, z, t) => iceCol(x, y, z, t, seed));
  }
  blob(M, 13, 0.6, 13, 8, 1.5, 8, (x, y, z) => snowCol(x, y, z, seed), seed, 0.9);
  return bundle([[M, 0.125, 13, 0, 13]]);
}

export function buildIceSpire(seed) {
  const rng = new RNG(seed * 41 + 13);
  const M = new VoxelModel(34, 60, 34);
  prism(M, 17, 0, 17, 0.08, 1, 0.05, 50, 5.4, (x, y, z, t) => iceCol(x, y, z, t * 0.8, seed));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.range(0, 1);
    prism(M, 17 + Math.cos(a) * 4, 0, 17 + Math.sin(a) * 4, Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4, rng.range(16, 32), rng.range(2.2, 3.4), (x, y, z, t) => iceCol(x, y, z, t, seed + 3));
  }
  for (let y = 4; y < 38; y += 3)
    for (let k = 0; k < 6; k++) {
      const x = 12 + Math.floor(hash3(y, k, seed, 6) * 10);
      const z = 12 + Math.floor(hash3(y, k, seed, 7) * 10);
      if (M.has(x, y, z) && !M.has(x, y, z + 1) && hash3(x, y, z, 9) > 0.6) M.set(x, y, z, ICE_DEEP);
    }
  blob(M, 17, 1, 17, 10, 2, 10, (x, y, z) => snowCol(x, y, z, seed), seed, 0.9);
  return bundle([[M, 0.125, 17, 0, 17]]);
}

export function buildIcicleRow(seed) {
  const M = new VoxelModel(40, 14, 8);
  for (let x = 1; x < 39; x++) {
    if (hash3(x, seed, 1, 4) < 0.28) continue;
    const len = 2 + Math.floor(hash3(x, seed, 2, 4) * 8);
    for (let y = 0; y < len; y++) M.set(x, 13 - y, 4, iceCol(x, y, 4, 1 - y / len, seed), y === len - 1);
  }
  M.box(0, 13, 3, 40, 14, 6, (x, y, z) => snowCol(x, y, z, seed));
  return bundle([[M, 0.125, 20, 0, 4]]);
}

/* ------------------------------ rocks & drifts ---------------------------- */

export function buildSnowRock(seed, big = false) {
  const rng = new RNG(seed * 17 + 2);
  const M = new VoxelModel(18, 14, 18);
  const rx = rng.range(3.5, big ? 7.5 : 5.2);
  const rz = rng.range(3.5, big ? 7.5 : 5.2);
  const ry = rng.range(2.6, big ? 6 : 3.8);
  blob(
    M, 9, ry * 0.8, 9, rx, ry, rz,
    (x, y, z) => {
      if (y > ry * 1.25 && hash3(x, y, z, seed + 5) > 0.22) return snowCol(x, y, z, seed);
      return J(mix(0x6f7b8a, 0x93a1b2, hash3(x >> 1, y >> 1, z >> 1, seed)), x, y, z, seed, 0.08);
    },
    seed, 0.45
  );
  return bundle([[M, 0.125, 9, 0, 9]]);
}

export function buildSnowMound(seed) {
  const rng = new RNG(seed * 19 + 4);
  const M = new VoxelModel(30, 10, 30);
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    const rx = rng.range(5, 10);
    const rz = rng.range(5, 10);
    blob(M, 15 + rng.range(-5, 5), 1.2, 15 + rng.range(-5, 5), rx, rng.range(2.4, 4.4), rz, (x, y, z) => snowCol(x, y, z, seed), seed + i, 0.7);
  }
  for (let z = 0; z < 30; z++)
    for (let x = 0; x < 30; x++) if (M.has(x, 0, z) && hash3(x, 0, z, seed + 9) > 0.8) M.set(x, 0, z, iceCol(x, 0, z, 0.6, seed));
  return bundle([[M, 0.125, 15, 0, 15]]);
}

export function buildCairn(seed) {
  const M = new VoxelModel(14, 16, 14);
  let y = 0;
  let r = 5.2;
  while (r > 1.3 && y < 14) {
    const h = 2 + Math.floor(hash3(y, seed, 1, 5) * 2);
    const ox = (hash3(y, seed, 2, 5) - 0.5) * 1.2;
    const oz = (hash3(y, seed, 3, 5) - 0.5) * 1.2;
    blob(M, 7 + ox, y + h / 2, 7 + oz, r, h / 2 + 0.2, r * 0.9, (x, yy, z) => J(mix(0x6f7b8a, 0x9aa8b8, hash3(x, yy, z, seed)), x, yy, z, seed, 0.06), seed + y, 0.2);
    y += h;
    r -= 1.0;
  }
  blob(M, 7, y + 0.2, 7, 2.2, 1, 2.2, (x, yy, z) => snowCol(x, yy, z, seed), seed, 0.5);
  return bundle([[M, 0.125, 7, 0, 7]]);
}

export function buildSnowman(seed) {
  const M = new VoxelModel(20, 34, 20);
  const body = (x, y, z) => snowCol(x, y, z, seed);
  blob(M, 10, 5.5, 10, 6.4, 5.6, 6.4, body, seed, 0.15);
  blob(M, 10, 15, 10, 4.9, 4.6, 4.9, body, seed + 1, 0.15);
  blob(M, 10, 23.5, 10, 3.8, 3.6, 3.8, body, seed + 2, 0.15);
  M.set(9, 24, 14, 0x15161a);
  M.set(11, 24, 14, 0x15161a);
  for (let k = 0; k < 4; k++) M.set(10, 22, 14 + (k < 2 ? k : 1), 0xff7a1a);
  M.set(10, 22, 15, 0xff7a1a);
  M.set(10, 22, 16, 0xff9a3a);
  for (const [dx, y] of [[-1, 21.2], [0, 20.6], [1, 21.2], [2, 22]]) M.set(10 + dx * 1.4, y, 14, 0x15161a);
  M.box(6, 13, 6, 14, 15, 14, (x, y, z) => (Math.hypot(x + 0.5 - 10, z + 0.5 - 10) < 5.2 && Math.hypot(x + 0.5 - 10, z + 0.5 - 10) > 4.1 ? J(0xc8402f, x, y, z, seed, 0.05) : null));
  M.box(12, 11, 13, 14, 15, 15, (x, y, z) => J(0xc8402f, x, y, z, seed, 0.05));
  M.box(7, 27, 7, 13, 28, 13, (x, y, z) => J(0x2a2a34, x, y, z, seed, 0.04));
  M.box(8, 28, 8, 12, 32, 12, (x, y, z) => J(0x2a2a34, x, y, z, seed, 0.04));
  M.box(8, 28, 8, 12, 29, 12, (x, y, z) => J(0xc8402f, x, y, z, seed, 0.04));
  M.line(5, 15, 10, -1, 21, 10, 0x5a3a22, 1);
  M.line(15, 15, 10, 21, 21, 10, 0x5a3a22, 1);
  for (const [dx, y] of [[9, 8], [9, 11]]) M.set(dx, y, 16, 0x15161a);
  return bundle([[M, 0.1, 10, 0, 10]]);
}

export function buildIgloo(seed) {
  const M = new VoxelModel(44, 28, 52);
  const R = 14;
  const cx = 22;
  const cz = 22;
  for (let y = 0; y <= R; y++)
    for (let z = 0; z < 52; z++)
      for (let x = 0; x < 44; x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        const d = Math.sqrt(dx * dx + y * y + dz * dz);
        if (d > R || d < R - 3.2) continue;
        const row = Math.floor(y / 3);
        const off = row % 2 ? 3 : 0;
        const ang = Math.atan2(dz, dx);
        const col = Math.floor((ang * (R - row * 0.6) + off) / 5);
        const seam = y % 3 === 2 || Math.abs(((ang * (R - row * 0.6) + off) % 5 + 5) % 5) < 0.55;
        let c = snowCol(x, y, z, seed);
        if (seam) c = shade(c, 0.82);
        if (hash3(col, row, seed, 4) > 0.86) c = shade(c, 0.92);
        M.set(x, y, z, c);
      }
  const tx0 = cx - 4;
  const tx1 = cx + 4;
  for (let z = cz + 6; z < cz + 24; z++)
    for (let y = 0; y < 9; y++)
      for (let x = tx0 - 2; x < tx1 + 2; x++) {
        const dx = x + 0.5 - cx;
        const arch = Math.hypot(dx, y);
        if (arch > 6.8 || arch < 3.6 + (z > cz + 20 ? 0 : 0)) continue;
        if (y === 0 && Math.abs(dx) < 3.6) continue;
        let c = snowCol(x, y, z, seed + 2);
        if (y % 3 === 2 || (z + y) % 5 === 0) c = shade(c, 0.84);
        M.set(x, y, z, c);
      }
  for (let z = cz + 4; z < cz + 26; z++)
    for (let y = 0; y < 5; y++)
      for (let x = tx0 + 1; x < tx1 - 0; x++) {
        const dx = x + 0.5 - cx;
        if (Math.hypot(dx, y) < 3.6 && !(y === 0 && false)) M.clear(x, y, z);
      }
  for (let y = 0; y < 6; y++)
    for (let z = cz + 3; z < cz + 8; z++)
      for (let x = cx - 4; x < cx + 4; x++) {
        const dx = x + 0.5 - cx;
        if (Math.hypot(dx, y) < 3.6) M.clear(x, y, z);
      }
  for (let y = 0; y < 5; y++)
    for (let z = cz + 3; z < cz + 5; z++)
      for (let x = cx - 4; x < cx + 4; x++) if (Math.hypot(x + 0.5 - cx, y) < 3.4 && !M.has(x, y, z)) M.set(x, y, z, 0x1d2430);
  for (let x = cx - 4; x < cx + 4; x++) M.set(x, 0, cz + 6, 0xffb347, hash3(x, 0, 6, 1) > 0.5);
  return bundle([[M, 0.125, cx, 0, cz]]);
}

/* ------------------------------ bones & nest ------------------------------ */

const BONE = [0xe9e1cf, 0xdcd2bb, 0xf3ecdc, 0xcdbf9f];
const boneCol = (x, y, z, s = 0) => jitter(BONE[Math.floor(hash3(x, y, z, 740 + s) * BONE.length)], 0.03, hash3(x, y, z, 741 + s));

export function buildRibCage(seed) {
  const M = new VoxelModel(46, 30, 40);
  M.line(2, 3, 20, 44, 3, 20, (x, y, z) => boneCol(x, y, z, seed), 3);
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 5;
    const hh = 22 - Math.abs(i - 3) * 3.2;
    for (let s = -1; s <= 1; s += 2) {
      let px = x;
      let py = 3;
      let pz = 20;
      for (let k = 1; k <= 14; k++) {
        const t = k / 14;
        const nx = x + Math.sin(t * 0.6) * 1.5;
        const ny = 3 + Math.sin(t * Math.PI * 0.62) * hh * 0.85;
        const nz = 20 + s * Math.sin(t * Math.PI * 0.5) * (9 - Math.abs(i - 3) * 0.8);
        M.line(px, py, pz, nx, ny, nz, (xx, yy, zz) => boneCol(xx, yy, zz, seed), t < 0.7 ? 2 : 1);
        px = nx;
        py = ny;
        pz = nz;
      }
    }
  }
  for (let z = 0; z < 40; z++)
    for (let x = 0; x < 46; x++) for (let y = 29; y > 2; y--) if (M.has(x, y, z) && !M.has(x, y + 1, z)) { if (hash3(x, y, z, seed) > 0.55) M.set(x, y + 1, z, snowCol(x, y, z, seed)); break; }
  return bundle([[M, 0.125, 23, 0, 20]]);
}

export function buildTusk(seed) {
  const M = new VoxelModel(26, 34, 14);
  for (let k = 0; k < 30; k++) {
    const t = k / 29;
    const x = 4 + Math.sin(t * 1.7) * 14;
    const y = k;
    const r = Math.max(0.6, 2.4 * (1 - t * 0.85));
    for (let a = -2; a <= 2; a++)
      for (let b = -2; b <= 2; b++) if (Math.hypot(a, b) <= r) M.set(Math.round(x + a), y, 7 + b, boneCol(Math.round(x + a), y, b, seed));
  }
  return bundle([[M, 0.125, 5, 0, 7]]);
}

export function buildYetiNest(seed) {
  const rng = new RNG(seed * 61 + 5);
  const M = new VoxelModel(70, 22, 70);
  const c = 35;
  const furCol = (x, y, z) => jitter([0xdcecf8, 0xb4d0e6, 0xf2f9ff, 0x9bbbd6][Math.floor(hash3(x, y, z, 21) * 4)], 0.03, hash3(x, y, z, 22));
  for (let z = 0; z < 70; z++)
    for (let x = 0; x < 70; x++) {
      const d = Math.hypot(x + 0.5 - c, z + 0.5 - c);
      const edge = hash3(x, z, seed, 5) * 3;
      if (d > 28 + edge * 0.5) continue;
      const lip = d > 17 ? Math.min(6, (d - 17) * 0.55) : 0;
      const h = 2 + lip + (d > 24 ? -(d - 24) * 0.6 : 0) + hash3(x, z, seed, 6) * 1.4;
      for (let y = 0; y < h; y++) M.set(x, y, z, y > h - 1.6 ? furCol(x, y, z) : J(0x7a8aa0, x, y, z, seed, 0.06));
    }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const rad = 21 + rng.range(-1.5, 2);
    const bx = c + Math.cos(a) * rad;
    const bz = c + Math.sin(a) * rad;
    prism(M, bx, 2, bz, Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5, rng.range(8, 18), rng.range(1.4, 2.4), (x, y, z, t) => iceCol(x, y, z, t, seed));
  }
  for (let i = 0; i < 5; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rad = rng.range(3, 12);
    const bx = c + Math.cos(a) * rad;
    const bz = c + Math.sin(a) * rad;
    M.line(bx, 4, bz, bx + rng.range(-7, 7), 4, bz + rng.range(-7, 7), (x, y, z) => boneCol(x, y, z, seed), 2);
    M.ellipsoid(bx, 5, bz, 2.4, 1.8, 2.2, (x, y, z) => boneCol(x, y, z, seed + 2));
  }
  blob(M, c, 4, c, 6, 2.4, 6, furCol, seed, 0.9);
  return bundle([[M, 0.125, c, 0, c]]);
}

export function buildFrozenLogs(seed) {
  const M = new VoxelModel(40, 12, 24);
  for (let i = 0; i < 3; i++) {
    const z0 = 4 + i * 7;
    const len = 24 + Math.floor(hash3(i, seed, 1, 3) * 14);
    for (let x = 0; x < len; x++)
      for (let y = 0; y < 6; y++)
        for (let z = 0; z < 6; z++) {
          const d = Math.hypot(y + 0.5 - 2.8, z + 0.5 - 3);
          if (d > 2.9) continue;
          let c = shade(J(0x5a4535, x, y, z + z0, seed, 0.1), hash3(x, y, z, seed) > 0.7 ? 0.82 : 1);
          if (y > 3 && hash3(x, y, z, seed + 3) > 0.25) c = snowCol(x, y, z, seed);
          M.set(x + 1, y, z + z0, c);
        }
  }
  return bundle([[M, 0.125, 20, 0, 12]]);
}

export function buildWindbreak(seed) {
  const M = new VoxelModel(34, 22, 12);
  for (let i = 0; i < 6; i++) {
    const x = 3 + i * 5;
    const h = 14 + Math.floor(hash3(i, seed, 1, 3) * 6);
    M.line(x, 0, 6, x + 1, h, 6, (xx, yy, zz) => J(0x5a4535, xx, yy, zz, seed, 0.08), 2);
  }
  for (const y of [6, 11]) M.line(2, y, 6, 31, y + 1, 6, (x, yy, z) => J(0x6a5440, x, yy, z, seed, 0.08), 2);
  for (let x = 2; x < 32; x++) for (let y = 3; y < 18; y++) if (M.has(x, y, 6) && !M.has(x, y + 1, 6) && hash3(x, y, 6, seed) > 0.3) M.set(x, y + 1, 6, snowCol(x, y, 6, seed));
  return bundle([[M, 0.125, 17, 0, 6]]);
}

/** Ice sheet laid over a pond, a slab with cracks and frozen bubbles. */
export function buildIceFloe(seed, r = 7) {
  const sz = Math.ceil(r * 2 + 4);
  const M = new VoxelModel(sz, 4, sz);
  const c = sz / 2;
  for (let z = 0; z < sz; z++)
    for (let x = 0; x < sz; x++) {
      const d = Math.hypot(x + 0.5 - c, z + 0.5 - c);
      if (d > r + (hash3(x, z, seed, 3) - 0.5) * 2) continue;
      const crack = hash3(x >> 1, z >> 1, seed, 8) > 0.9;
      M.set(x, 0, z, crack ? ICE_DEEP : iceCol(x, 0, z, hash3(x, z, seed, 9), seed));
      if (hash3(x, z, seed, 11) > 0.93) M.set(x, 1, z, snowCol(x, 1, z, seed));
    }
  return bundle([[M, 0.125, c, 0, c]]);
}

/** A round hole cut through the ice: dark water inside a lip of chipped ice and shaved snow. */
export function buildIceHole(seed = 1) {
  const n = 32;
  const c = n / 2;
  const M = new VoxelModel(n, 4, n);
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - c;
      const dz = z + 0.5 - c;
      const d = Math.hypot(dx, dz) + (hash3(x, z, seed, 21) - 0.5) * 1.3;
      if (d < 7) {
        const glint = hash3(x >> 1, z >> 1, seed, 22) > 0.86;
        M.set(x, 0, z, glint ? 0x2f78ae : hash3(x, z, seed, 23) > 0.5 ? 0x0c3a5e : 0x0a2f4e);
      } else if (d < 8.6) {
        M.set(x, 0, z, ICE_DEEP);
        M.set(x, 1, z, iceCol(x, 1, z, hash3(x, z, seed, 24), seed));
        if (hash3(x, z, seed, 25) > 0.55) M.set(x, 2, z, iceCol(x, 2, z, 0.9, seed));
      } else if (d < 12.5) {
        const k = hash3(x, z, seed, 26);
        if (k > 0.38) M.set(x, 0, z, k > 0.82 ? iceCol(x, 0, z, 0.9, seed) : snowCol(x, 0, z, seed));
        if (k > 0.78 && d < 11) M.set(x, 1, z, snowCol(x, 1, z, seed + 2));
      }
    }
  for (let k = 0; k < 5; k++) {
    const a = hash3(k, seed, 5, 27) * Math.PI * 2;
    const r = 9.6 + hash3(k, seed, 6, 28) * 2.2;
    const x = Math.round(c + Math.cos(a) * r);
    const z = Math.round(c + Math.sin(a) * r);
    M.box(x, 0, z, x + 2, 2, z + 2, (xx, yy, zz) => iceCol(xx, yy, zz, 0.7 + yy * 0.2, seed + 3));
  }
  return bundle([[M, 0.12, c, 0, c]]);
}

export function buildArcticModels() {
  return {
    frostPines: [buildFrostPine(1, 5, 6), buildFrostPine(2, 6, 7), buildFrostPine(3, 4, 5), buildFrostPine(4, 7, 7)],
    deadTrees: [1, 2, 3].map((s) => buildDeadTree(s)),
    frostBushes: [1, 2, 3].map((s) => buildFrostBush(s)),
    frostFlowers: [1, 2, 3].map((s) => buildFrostFlower(s)),
    iceClusters: [1, 2, 3, 4].map((s) => buildIceCluster(s, s === 4 ? 1.3 : 1)),
    iceSpires: [1, 2, 3].map((s) => buildIceSpire(s)),
    icicleRows: [1, 2].map((s) => buildIcicleRow(s)),
    snowRocks: [1, 2, 3].map((s) => buildSnowRock(s)),
    snowBoulders: [1, 2].map((s) => buildSnowRock(s + 10, true)),
    snowMounds: [1, 2, 3, 4].map((s) => buildSnowMound(s)),
    cairn: [1, 2].map((s) => buildCairn(s)),
    snowman: [1, 2].map((s) => buildSnowman(s)),
    igloo: [1, 2].map((s) => buildIgloo(s)),
    ribCage: [1, 2].map((s) => buildRibCage(s)),
    tusks: [1, 2].map((s) => buildTusk(s)),
    yetiNest: [1, 2].map((s) => buildYetiNest(s)),
    frozenLogs: [1, 2].map((s) => buildFrozenLogs(s)),
    windbreak: [1].map((s) => buildWindbreak(s)),
    floes: [buildIceFloe(1, 5), buildIceFloe(2, 8)],
    iceHoles: [buildIceHole(1), buildIceHole(2)],
  };
}

