import { VoxelModel, hash3, jitter, shade } from '../engine/voxel.js';
import { bundle } from './models.js';
import { KS, cyl, ringV, cone, pyramid, masonry, carveArch, archHalf, windowZ } from './keepKit.js';

/**
 * Hellspire: the Demon Knight's fortress. Black ashlar, iron bands, spikes on every edge,
 * lava in the cracks and a gate that is also a mouth. Every piece faces +z; the world rotates them.
 */

const STONE = [0x2a2a31, 0x33333b, 0x23232a, 0x3b3b44, 0x1e1e24];
const MORTAR = 0x111115;
const IRON = [0x45454f, 0x38383f, 0x52525c, 0x2f2f36];
const FANG = [0xd8d0bc, 0xc8bfa8, 0xe4dcc8];
const LAVA = [0xff4a14, 0xff6a1a, 0xff8a24, 0xffb236];
const OBS = [0x14141a, 0x1c1c25, 0x101015, 0x242432];
const lavaAt = (x, y, z, s = 0) => LAVA[Math.floor(hash3(x, y, z, 600 + s) * LAVA.length)];
const ironAt = (x, y, z, s = 0) => jitter(IRON[Math.floor(hash3(x >> 1, y >> 1, z >> 1, 610 + s) * IRON.length)], 0.03, hash3(x, y, z, 611 + s));
const obsAt = (x, y, z, s = 0) => jitter(OBS[Math.floor(hash3(x, y, z, 620 + s) * OBS.length)], 0.03, hash3(x, y, z, 621 + s));

function spike(M, cx, y0, cz, h, r, color) {
  for (let k = 0; k < h; k++) {
    const rr = Math.max(0.5, r * (1 - k / h));
    cyl(M, cx, cz, y0 + k, y0 + k + 1, rr, (x, y, z) => (typeof color === 'function' ? color(x, y, z) : color));
  }
}

function crack(M, x, y, z, len, seed, axis = 'z') {
  let xx = x;
  for (let k = 0; k < len; k++) {
    const yy = y + k;
    xx += Math.floor(hash3(k, seed, x, 5) * 3) - 1;
    const c = lavaAt(xx, yy, z, seed);
    if (axis === 'z' && M.has(xx, yy, z)) M.set(xx, yy, z, c, true);
    if (axis === 'x' && M.has(z, yy, xx)) M.set(z, yy, xx, c, true);
  }
}

function skullRelief(M, cx, cy, z, scale = 1) {
  const w = Math.round(6 * scale);
  const h = Math.round(7 * scale);
  for (let y = -h; y <= h; y++)
    for (let x = -w; x <= w; x++) {
      const e = (x * x) / (w * w) + (y * y) / (h * h);
      if (e > 1 + (y > 0 ? 0 : 0)) continue;
      M.set(cx + x, cy + y, z, FANG[Math.floor(hash3(x, y, z, 7) * 3)]);
      M.set(cx + x, cy + y, z + 1, FANG[Math.floor(hash3(x, y, z, 8) * 3)]);
    }
  const ex = Math.round(w * 0.5);
  const ey = Math.round(h * 0.15);
  const er = Math.max(2, Math.round(2.4 * scale));
  for (const s of [-1, 1])
    for (let a = -er; a <= er; a++)
      for (let b = -er; b <= er; b++) if (a * a + b * b <= er * er) M.set(cx + s * ex + a, cy + ey + b, z + 1, 0xff3a10, true);
  for (let k = 0; k < Math.round(3 * scale); k++) {
    M.set(cx - 1, cy - Math.round(h * 0.2) - k, z + 1, 0x16110f);
    M.set(cx + 1 - 1, cy - Math.round(h * 0.2) - k, z + 1, 0x16110f);
  }
  for (let t = -w + 2; t <= w - 2; t += 2) {
    for (let k = 0; k < Math.round(3 * scale); k++) M.set(cx + t, cy - h + 1 - k * 0 + k, z + 1, k === 0 ? FANG[1] : 0x1a1612);
  }
}

/* --------------------------------- walls --------------------------------- */

export function buildDemonWall(len, seed = 1) {
  const M = new VoxelModel(len, 60, 28);
  const brick = masonry(STONE, MORTAR, seed);
  const Z0 = 4;
  const ZO = Z0 + 18;
  M.box(0, 0, Z0 - 1, len, 6, ZO + 1, brick);
  M.box(0, 6, Z0, len, 40, ZO, brick);
  for (let x = 0; x < len; x++) {
    if (x % 6 < 4) M.box(x, 35, ZO, x + 1, 40, ZO + 2, (xx, y, z) => (y === 35 ? ironAt(xx, y, z) : brick(xx, y, z)));
  }
  M.box(0, 40, Z0, len, 41, ZO + 2, (x, y, z) => jitter(0x35353d, 0.05, hash3(x, y, z, 3)));
  M.box(0, 41, ZO, len, 47, ZO + 2, brick);
  M.box(0, 41, Z0, len, 44, Z0 + 2, brick);
  for (let x = 0; x < len; x++) {
    if (x % 8 < 5) M.box(x, 47, ZO, x + 1, 51, ZO + 2, brick);
    if (x % 8 === 2) spike(M, x + 0.5, 51, ZO + 1, 9, 1.4, (xx, y, z) => ironAt(xx, y, z));
  }
  M.box(0, 30, ZO, len, 32, ZO + 1, (x, y, z) => (x % 5 === 0 && y === 31 ? 0x6a6a76 : ironAt(x, y, z)));
  for (let x0 = 16; x0 < len - 10; x0 += 24) windowZ(M, x0, 14, ZO - 1, 2, 11, 5, (xx, yy) => (yy > 6 ? LAVA[3] : LAVA[1]));
  for (let x0 = 36; x0 < len - 18; x0 += 44) {
    for (let k = 0; k < 4; k++) M.box(x0, 0, ZO, x0 + 8, 14, ZO + 5, (x, y, z) => (y > 12 ? ironAt(x, y, z) : brick(x, y, z)));
    M.box(x0, 14, ZO, x0 + 8, 26, ZO + 4, brick);
    M.box(x0 + 1, 26, ZO, x0 + 7, 34, ZO + 3, brick);
    spike(M, x0 + 4, 34, ZO + 1.5, 20, 3.2, (x, y, z) => ironAt(x, y, z, 2));
    spike(M, x0 + 4, 54, ZO + 1.5, 2, 1, 0xff5a14);
    for (let s = 0; s < 3; s++) {
      const sx = x0 + 1 + s * 3;
      M.set(sx, 20, ZO + 4, FANG[s % 3]);
      M.set(sx, 21, ZO + 4, FANG[s % 3]);
    }
  }
  for (let x0 = 26; x0 < len - 8; x0 += 44) {
    M.box(x0, 24, ZO, x0 + 7, 29, ZO + 2, (x, y, z) => FANG[Math.floor(hash3(x, y, z, 11) * 3)]);
    M.set(x0 + 2, 26, ZO + 2, 0x16110f);
    M.set(x0 + 4, 26, ZO + 2, 0x16110f);
    M.set(x0 + 2, 26, ZO + 2, 0xff3a10, true);
    M.set(x0 + 4, 26, ZO + 2, 0xff3a10, true);
  }
  for (let k = 0; k < Math.floor(len / 9); k++) {
    const x = 4 + Math.floor(hash3(k, seed, 1, 12) * (len - 8));
    if (M.has(x, 8, ZO - 1) && !M.get(x, 8, ZO - 1)) continue;
    crack(M, x, 4 + Math.floor(hash3(k, seed, 2, 12) * 18), ZO - 1, 5 + Math.floor(hash3(k, seed, 3, 12) * 12), k);
  }
  return { parts: bundle([[M, KS, len / 2, 0, Z0 + 9]]), w: len * KS, d: 18 * KS, h: 51 * KS };
}

/* -------------------------------- towers --------------------------------- */

export function buildDemonTower(seed = 1) {
  const R = 19;
  const C = R + 7;
  const M = new VoxelModel(C * 2, 206, C * 2);
  const brick = masonry(STONE, MORTAR, seed, 5, 3);
  for (let y = 0; y < 12; y++) cyl(M, C, C, y, y + 1, R + 3 - (y / 12) * 3, (x, yy, z) => brick(x, yy, z));
  cyl(M, C, C, 12, 86, R, (x, y, z) => brick(x, y, z));
  for (const y of [26, 54, 80]) {
    ringV(M, C, C, y, y + 2, R - 0.2, R + 1.4, (x, yy, z) => ironAt(x, yy, z));
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      M.set(Math.round(C + Math.cos(a) * (R + 1.8)), y, Math.round(C + Math.sin(a) * (R + 1.8)), 0x6a6a76);
    }
  }
  const slit = (a, y, h) => {
    for (let d = 0; d < 5; d++) {
      const r = R + 1 - d;
      for (let w = 0; w < 2; w++) {
        const px = Math.round(C + Math.cos(a) * r - Math.sin(a) * w);
        const pz = Math.round(C + Math.sin(a) * r + Math.cos(a) * w);
        for (let yy = 0; yy < h; yy++) {
          if (d < 4) M.clear(px, y + yy, pz);
          else M.set(px, y + yy, pz, yy > h / 2 ? LAVA[3] : LAVA[1], 2);
        }
      }
    }
  };
  [[20, 0], [46, 0.4], [70, 0.8]].forEach(([y, off], row) => {
    for (let k = 0; k < 4; k++) slit((k / 4) * Math.PI * 2 + off + row * 0.3, y, 10);
  });
  for (let k = 0; k < 10; k++) {
    const a = hash3(k, seed, 1, 21) * Math.PI * 2;
    const y0 = 8 + Math.floor(hash3(k, seed, 2, 21) * 50);
    const len = 6 + Math.floor(hash3(k, seed, 3, 21) * 14);
    for (let i = 0; i < len; i++) {
      const aa = a + Math.sin(i * 0.9 + k) * 0.05;
      const px = Math.round(C + Math.cos(aa) * (R + 0.2));
      const pz = Math.round(C + Math.sin(aa) * (R + 0.2));
      if (M.has(px, y0 + i, pz)) M.set(px, y0 + i, pz, lavaAt(px, y0 + i, pz, k), true);
    }
  }
  ringV(M, C, C, 84, 90, R - 1, R + 4, (x, y, z) => (y < 86 ? ironAt(x, y, z, 3) : brick(x, y, z)));
  cyl(M, C, C, 90, 91, R + 1, (x, y, z) => jitter(0x33333b, 0.04, hash3(x, y, z, 9)));
  ringV(M, C, C, 91, 95, R + 2, R + 4, (x, y, z) => brick(x, y, z));
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    if (k % 2 === 0) {
      const px = Math.round(C + Math.cos(a) * (R + 3));
      const pz = Math.round(C + Math.sin(a) * (R + 3));
      M.box(px, 95, pz, px + 2, 99, pz + 2, brick);
      spike(M, px + 1, 99, pz + 1, 8, 1.4, (x, y, z) => ironAt(x, y, z, 4));
    }
  }
  const roofBase = 91;
  const ribs = 8;
  cone(M, C, C, roofBase, 84, R + 1, 0.8, (x, y, z, d, t) => {
    const ang = Math.atan2(z + 0.5 - C, x + 0.5 - C);
    const near = Math.abs(((ang / (Math.PI * 2)) * ribs * 2 + (t * 3 + 0.5)) % 2 - 1) < 0.1;
    if (near && t > 0.08 && t < 0.95) return null;
    return obsAt(x, y, z, seed);
  });
  for (let y = roofBase; y < roofBase + 84; y++) {
    const t = (y - roofBase) / 83;
    const r = R + 1 + (0.8 - R - 1) * t;
    for (let k = 0; k < ribs; k++) {
      const a = (k / ribs) * Math.PI * 2 + t * 3.0;
      const px = Math.round(C + Math.cos(a) * (r + 0.4));
      const pz = Math.round(C + Math.sin(a) * (r + 0.4));
      if (t > 0.04 && t < 0.97) M.set(px, y, pz, lavaAt(px, y, pz, 3), true);
    }
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const bx = C + Math.cos(a) * (R + 1);
    const bz = C + Math.sin(a) * (R + 1);
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const hx = bx + Math.cos(a) * t * 9;
      const hz = bz + Math.sin(a) * t * 9;
      const hy = roofBase + 2 + t * t * 20;
      cyl(M, hx, hz, Math.round(hy), Math.round(hy) + 2, Math.max(0.8, 2.6 - t * 1.8), (x, y, z) => (t > 0.85 ? 0xff6a1a : ironAt(x, y, z, 5)), t > 0.88);
    }
  }
  spike(M, C, roofBase + 70, C, 36, 2.4, (x, y, z) => ironAt(x, y, z, 6));
  M.set(C, roofBase + 105, C, 0xffb236, true);
  M.set(C, roofBase + 106, C, 0xffd870, true);
  return { parts: bundle([[M, KS, C, 0, C]]), r: (R + 3) * KS, h: 197 * KS };
}

/* ------------------------------- gatehouse ------------------------------- */

export function buildDemonGate(seed = 3) {
  const SX = 108;
  const M = new VoxelModel(SX, 190, 56);
  const brick = masonry(STONE, MORTAR, seed);
  const cx = SX / 2;
  M.box(10, 0, 4, 98, 6, 50, brick);
  M.box(12, 6, 6, 96, 82, 48, brick);
  for (const x0 of [4, 80]) {
    M.box(x0, 0, 24, x0 + 24, 8, 54, brick);
    M.box(x0 + 1, 8, 25, x0 + 23, 116, 53, brick);
    for (let y = 40; y < 112; y += 28) M.box(x0, y, 24, x0 + 24, y + 2, 54, (x, yy, z) => ironAt(x, yy, z, 7));
    ringBox(M, x0 - 1, 116, 23, x0 + 25, 119, 55, brick);
    pyramid(M, x0 + 12, 39, 119, 50, 13, 15, (x, y, z, t) => (hash3(x, y, z, 31) > 0.92 ? ironAt(x, y, z) : obsAt(x, y, z, 2)));
    for (let k = 0; k < 4; k++) spike(M, x0 + (k % 2 ? 22 : 2), 119, k < 2 ? 25 : 52, 12, 1.6, (x, y, z) => ironAt(x, y, z, 8));
    spike(M, x0 + 12, 168, 39, 20, 1.6, (x, y, z) => ironAt(x, y, z, 9));
    M.set(x0 + 12, 188, 39, 0xffb236, true);
    windowZ(M, x0 + 9, 64, 52, 6, 22, 5, (xx, yy) => LAVA[yy > 12 ? 3 : 1]);
    windowZ(M, x0 + 9, 94, 52, 6, 14, 5, (xx, yy) => LAVA[yy > 8 ? 2 : 0]);
    for (let y = 8; y < 36; y += 3) for (let k = 0; k < 6; k++) if (hash3(y, k, x0, 5) > 0.55) M.set(x0 + 4 + k * 3, y, 53, lavaAt(k, y, x0), true);
  }
  carveArch(M, cx, 0, 16, 28, 16, 0, 56);
  const topAt = (x) => {
    for (let y = 80; y > 0; y--) if (!M.has(x, y, 30) && M.has(x, y + 1, 30)) return y;
    return 0;
  };
  for (let x = cx - 15; x <= cx + 15; x += 4) {
    const yt = topAt(x);
    if (!yt) continue;
    for (let k = 0; k < 11; k++) M.box(x, yt - k, 31, x + 1, yt - k + 1, 33, (xx, y, z) => (k > 8 ? 0xb8bcc6 : ironAt(xx, y, z, 1)));
  }
  for (let y = 24; y < 40; y += 5) for (let x = cx - 14; x <= cx + 14; x++) if (M.has(x, y, 31) || !M.has(x, y, 20)) if (!M.has(x, y, 20)) M.set(x, y, 31, ironAt(x, y, 31, 4));
  for (let x = cx - 18; x < cx + 18; x += 2) {
    const yt = topAt(x);
    if (!yt) continue;
    const yy = yt + 1;
    M.box(x, yy - 1, 48, x + 1, yy + 1, 52, (xx, y, z) => ironAt(xx, y, z, 11));
    M.box(x, yy - 6, 51, x + 2, yy - 1, 53, (xx, y, z) => FANG[Math.floor(hash3(xx, y, z, 13) * 3)]);
    M.box(x, yy - 9, 51, x + 1, yy - 6, 52, (xx, y, z) => FANG[1]);
  }
  M.box(24, 70, 48, 84, 74, 52, (x, y, z) => ironAt(x, y, z, 12));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 14; k++) {
      const x = cx + s * (6 + k);
      const y = 62 + Math.round(k * 0.34);
      M.box(x, y, 50, x + 1, y + 3, 52, 0xff3a10, true);
      M.box(x, y + 3, 50, x + 1, y + 4, 52, 0xffb236, true);
    }
    for (let k = 0; k < 4; k++) M.box(cx + s * (20 + k) - (s > 0 ? 0 : 0), 66 + k * 2, 50, cx + s * (20 + k) + 1, 69 + k * 2, 53, ironAt(k, 66, s, 2));
  }
  M.carve(cx - 2, 54, 49, cx + 2, 60, 53);
  M.set(cx - 2, 54, 49, 0xff3a10, true);
  for (let x = 12; x < 96; x++) {
    M.box(x, 82, 44, x + 1, 83, 50, (xx, y, z) => jitter(0x35353d, 0.05, hash3(xx, y, z, 2)));
    if (x % 6 < 4) M.box(x, 83, 46, x + 1, 90, 50, brick);
    if (x % 6 === 1) spike(M, x + 0.5, 90, 48, 10, 1.4, (xx, y, z) => ironAt(xx, y, z, 14));
    if (x % 5 < 3) M.box(x, 76, 48, x + 1, 82, 50, brick);
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 40; k++) {
      const t = k / 39;
      const hx = cx + s * (22 + t * 18 + Math.sin(t * 1.9) * 4);
      const hy = 82 + t * 60 + Math.sin(t * 3.1) * 5;
      cyl(M, hx, 40, Math.round(hy), Math.round(hy) + 3, Math.max(0.9, 3.6 - t * 2.8), (x, y, z) => (t > 0.9 ? 0xff6a1a : ironAt(x, y, z, 15)), t > 0.92);
    }
  }
  return { parts: bundle([[M, KS, cx, 0, 30]]), w: 88 * KS, d: 50 * KS, passage: 32 * KS, h: 120 * KS };
}

function ringBox(M, x0, y0, z0, x1, y1, z1, brick) {
  M.box(x0, y0, z0, x1, y1, z1, (x, y, z) => (y === y0 ? ironAt(x, y, z, 5) : brick(x, y, z)));
  for (let x = x0; x < x1; x += 4) {
    M.box(x, y1, z0, x + 2, y1 + 3, z0 + 2, brick);
    M.box(x, y1, z1 - 2, x + 2, y1 + 3, z1, brick);
  }
}

/* ---------------------------------- keep --------------------------------- */

export function buildDemonKeep(seed = 5) {
  const SX = 128;
  const SY = 238;
  const SZ = 110;
  const M = new VoxelModel(SX, SY, SZ);
  const brick = masonry(STONE, MORTAR, seed);
  const cx = SX / 2;
  const X0 = 12;
  const X1 = SX - 12;
  const T1 = 62;
  const FZ = 100;
  M.box(X0 - 2, 0, 8, X1 + 2, 6, FZ + 2, brick);
  M.box(X0, 6, 10, X1, T1, FZ, brick);
  for (let y = 18; y < T1; y += 22) M.box(X0 - 1, y, 9, X1 + 1, y + 2, FZ + 1, (x, yy, z) => ironAt(x, yy, z, 21));
  for (let x = X0; x < X1; x += 2) {
    M.box(x, T1, 10, x + 1, T1 + 6, 12, brick);
    M.box(x, T1, FZ - 2, x + 1, T1 + 6, FZ, brick);
    if (x % 8 < 5) M.box(x, T1 + 6, FZ - 2, x + 1, T1 + 9, FZ, brick);
  }
  for (let z = 10; z < FZ; z += 2) {
    M.box(X0, T1, z, X0 + 2, T1 + 6, z + 1, brick);
    M.box(X1 - 2, T1, z, X1, T1 + 6, z + 1, brick);
  }
  const T2 = 104;
  M.box(X0 + 12, T1, 22, X1 - 12, T2, FZ - 16, (x, y, z) => (y % 24 === 0 ? ironAt(x, y, z, 22) : brick(x, y, z)));
  for (let x = X0 + 12; x < X1 - 12; x += 2) {
    M.box(x, T2, FZ - 18, x + 1, T2 + 5, FZ - 16, brick);
    if (x % 8 === 2) spike(M, x + 0.5, T2 + 5, FZ - 17, 10, 1.4, (xx, y, z) => ironAt(xx, y, z, 23));
  }
  const T3 = 150;
  M.box(X0 + 32, T2, 34, X1 - 32, T3, FZ - 36, (x, y, z) => (y % 22 === 0 ? ironAt(x, y, z, 24) : brick(x, y, z)));
  ringBox(M, X0 + 30, T3, 32, X1 - 30, T3 + 3, FZ - 34, brick);
  const spireCz = (32 + FZ - 34) / 2;
  cone(M, cx, spireCz, T3 + 3, 78, 18, 0.8, (x, y, z, d, t) => {
    const ang = Math.atan2(z + 0.5 - spireCz, x + 0.5 - cx);
    const near = Math.abs((((ang / (Math.PI * 2)) * 16 + t * 5) % 2 + 2) % 2 - 1) < 0.14;
    if (near && t > 0.04 && t < 0.95) return lavaAt(x, y, z, 5);
    return obsAt(x, y, z, 4);
  });
  for (let y = T3 + 3; y < T3 + 81; y++) {
    const t = (y - T3 - 3) / 77;
    const r = 18 * (1 - t) + 0.8 * t;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + t * 5 * 0.5;
      const px = Math.round(cx + Math.cos(a) * (r + 0.3));
      const pz = Math.round(spireCz + Math.sin(a) * (r + 0.3));
      if (t > 0.04 && t < 0.94 && M.has(px, y, pz)) M.set(px, y, pz, lavaAt(px, y, pz, 6), true);
    }
  }
  spike(M, cx, T3 + 80, spireCz, 34, 1.8, (x, y, z) => ironAt(x, y, z, 25));
  for (let k = 0; k < 3; k++) M.set(cx, T3 + 112 + k, spireCz, k ? 0xffd870 : 0xffb236, true);
  for (const s of [-1, 1])
    for (let k = 0; k < 44; k++) {
      const t = k / 43;
      const hx = cx + s * (16 + t * 22 - Math.sin(t * Math.PI) * 4);
      const hy = T3 + 6 + t * 56 + Math.sin(t * 2.5) * 8;
      cyl(M, hx, spireCz, Math.round(hy), Math.round(hy) + 3, Math.max(0.9, 4.2 - t * 3.2), (x, y, z) => (t > 0.9 ? 0xff6a1a : ironAt(x, y, z, 26)), t > 0.92);
    }
  for (const [sx, sz, y0, r, h] of [[X0 + 5, 17, T1, 9, 46], [X1 - 5, 17, T1, 9, 46], [X0 + 5, FZ - 7, T1, 9, 46], [X1 - 5, FZ - 7, T1, 9, 46], [X0 + 19, 28, T2, 7, 30], [X1 - 19, 28, T2, 7, 30], [X0 + 19, FZ - 23, T2, 7, 30], [X1 - 19, FZ - 23, T2, 7, 30]]) {
    cyl(M, sx, sz, y0 - 6, y0 + 12, r, (x, y, z) => brick(x, y, z));
    ringV(M, sx, sz, y0 + 12, y0 + 14, r - 1, r + 1.4, (x, y, z) => ironAt(x, y, z, 27));
    cone(M, sx, sz, y0 + 14, h, r + 0.4, 0.7, (x, y, z, d, t) => (hash3(x, y, z, 41) > 0.93 && t < 0.8 ? lavaAt(x, y, z, 7) : obsAt(x, y, z, 5)), false);
    spike(M, sx, y0 + 14 + h - 2, sz, 16, 1.4, (x, y, z) => ironAt(x, y, z, 28));
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      spike(M, sx + Math.cos(ang) * (r + 0.4), y0 + 8, sz + Math.sin(ang) * (r + 0.4), 8, 1.5, (x, y, z) => ironAt(x, y, z, 29));
    }
  }
  for (let k = 0; k < 5; k++) {
    const step = 5 - k;
    M.box(cx - 30 - step, k * 3, FZ, cx + 30 + step, k * 3 + 3, FZ + 10 - k * 2, (x, y, z) => jitter(0x34343c, 0.05, hash3(x, y, z, 51)));
    M.box(cx - 30 - step, k * 3 + 2, FZ + 9 - k * 2, cx + 30 + step, k * 3 + 3, FZ + 10 - k * 2, (x, y, z) => (x % 6 < 2 ? lavaAt(x, y, z, 8) : ironAt(x, y, z, 30)));
  }
  carveArch(M, cx, 15, 16, 24, 18, FZ - 14, FZ + 2);
  for (let y = 15; y < 15 + 24 + 18; y++) {
    const half = y < 39 ? 16 : archHalf(16, y - 39, 18);
    if (half < 0) continue;
    for (let x = Math.ceil(cx - half); x < Math.floor(cx + half); x++) M.set(x, y, FZ - 14, hash3(x, y, 5, 2) > 0.5 ? LAVA[2] : LAVA[3], true);
  }
  const archTop = (x) => {
    for (let y = 70; y > 14; y--) if (!M.has(x, y, FZ - 2) && M.has(x, y + 1, FZ - 2)) return y;
    return 0;
  };
  for (let x = cx - 16; x <= cx + 16; x += 3) {
    const yt = archTop(x);
    if (!yt) continue;
    for (let k = 0; k < 8; k++) M.box(x, yt - k, FZ - 3, x + 2 - (k > 5 ? 1 : 0), yt - k + 1, FZ - 1, FANG[x % 3]);
  }
  for (let x = cx - 19; x <= cx + 19; x += 3) {
    const yt = archTop(x) + 3;
    M.box(x, yt, FZ - 2, x + 2, yt + 3, FZ + 2, (xx, y, z) => ironAt(xx, y, z, 31));
    spike(M, x + 1, yt + 3, FZ, 7, 1.2, (xx, y, z) => ironAt(xx, y, z, 32));
  }
  skullRelief(M, cx, 56, FZ, 1.6);
  for (const [wx, row] of [[X0 + 8, 0], [X0 + 20, 0], [X1 - 14, 0], [X1 - 26, 0]]) {
    windowZ(M, wx, 24, FZ - 1, 5, 24, 6, (xx, yy) => LAVA[yy > 16 ? 3 : yy > 8 ? 2 : 1]);
    void row;
  }
  for (let i = 0; i < 6; i++) windowZ(M, X0 + 24 + i * 11, 70, FZ - 17, 4, 24, 6, (xx, yy) => LAVA[yy > 16 ? 3 : yy > 8 ? 2 : 1]);
  for (let i = 0; i < 4; i++) windowZ(M, X0 + 40 + i * 9, 114, FZ - 37, 4, 28, 6, (xx, yy) => LAVA[yy > 18 ? 3 : yy > 8 ? 2 : 1]);
  for (const x0 of [X0, X0 + 24, X1 - 30, X1 - 6]) {
    for (let y = 0; y < T1; y += 2) M.box(x0, y, FZ, x0 + 6, y + 2, FZ + 3 - (y > 40 ? 1 : 0), brick);
    spike(M, x0 + 3, T1, FZ + 1.5, 24, 3.2, (x, y, z) => ironAt(x, y, z, 33));
  }
  for (let k = 0; k < 30; k++) {
    const x = X0 + 3 + Math.floor(hash3(k, seed, 1, 61) * (X1 - X0 - 6));
    const y0 = 8 + Math.floor(hash3(k, seed, 2, 61) * 44);
    crack(M, x, y0, FZ - 1, 6 + Math.floor(hash3(k, seed, 3, 61) * 16), k + 40);
  }
  for (let k = 0; k < 18; k++) {
    const z = 14 + Math.floor(hash3(k, seed, 1, 62) * (FZ - 24));
    const y0 = 8 + Math.floor(hash3(k, seed, 2, 62) * 44);
    for (const side of [X0, X1 - 1]) {
      let zz = z;
      for (let i = 0; i < 6 + (k % 10); i++) {
        zz += Math.floor(hash3(i, k, side, 63) * 3) - 1;
        if (M.has(side, y0 + i, zz)) M.set(side, y0 + i, zz, lavaAt(side, y0 + i, zz, 9), true);
      }
    }
  }
  for (let z = 30; z < FZ - 20; z += 18) {
    for (const [x, s] of [[X0 - 2, -1], [X1 + 1, 1]]) {
      for (let k = 0; k < 18; k++) {
        const t = k / 17;
        const px = x + s * Math.round(t * 8);
        const py = 46 + Math.round(Math.sin(t * Math.PI * 0.5) * 8 - t * 40);
        if (py < 0) continue;
        M.box(px - (s > 0 ? 0 : 0), py, z, px + 1, py + 3, z + 3, (xx, y, zz) => ironAt(xx, y, zz, 34));
      }
      spike(M, x + s * 8, 8, z + 1.5, 6, 1.4, (xx, y, zz) => ironAt(xx, y, zz, 35));
    }
  }
  return { parts: bundle([[M, KS, cx, 0, 55]]), w: (X1 - X0 + 4) * KS, d: (FZ - 10 + 10) * KS, h: 230 * KS, front: 55 };
}

export function buildDemonFountain(seed = 7) {
  const M = new VoxelModel(60, 54, 60);
  const brick = masonry(STONE, MORTAR, seed);
  ringV(M, 30, 30, 0, 8, 22, 26, (x, y, z) => brick(x, y, z));
  cyl(M, 30, 30, 0, 5, 22, (x, y, z) => obsAt(x, y, z, seed));
  cyl(M, 30, 30, 5, 7, 22, (x, y, z) => lavaAt(x, y, z, seed), true);
  cyl(M, 30, 30, 0, 22, 5, (x, y, z) => ironAt(x, y, z, 3));
  cyl(M, 30, 30, 22, 25, 9, (x, y, z) => brick(x, y, z));
  cyl(M, 30, 30, 25, 27, 8, (x, y, z) => lavaAt(x, y, z, 5), true);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    spike(M, 30 + Math.cos(a) * 24, 8, 30 + Math.sin(a) * 24, 14, 2, (x, y, z) => ironAt(x, y, z, 6));
    for (let y = 8; y < 22; y++) M.set(Math.round(30 + Math.cos(a) * 6), y, Math.round(30 + Math.sin(a) * 6), lavaAt(k, y, 1), true);
  }
  for (let y = 27; y < 48; y++) {
    const r = Math.max(0.8, 3 - (y - 27) * 0.1);
    cyl(M, 30, 30, y, y + 1, r, (x, yy, z) => (hash3(x, yy, z, 3) > 0.35 ? lavaAt(x, yy, z, 2) : 0xffd870), true);
  }
  return { parts: bundle([[M, KS, 30, 0, 30]]), r: 26 * KS };
}

export function buildDemonStatue(seed = 9) {
  const M = new VoxelModel(34, 76, 34);
  const brick = masonry(STONE, MORTAR, seed, 4, 3);
  M.box(5, 0, 5, 29, 8, 29, (x, y, z) => brick(x, y, z));
  M.box(7, 8, 7, 27, 12, 27, (x, y, z) => ironAt(x, y, z, 1));
  const c = 17;
  cyl(M, c, c, 12, 38, 6, (x, y, z) => obsAt(x, y, z, 4));
  cyl(M, c, c, 38, 46, 8, (x, y, z) => obsAt(x, y, z, 5));
  cyl(M, c, c, 46, 56, 4.4, (x, y, z) => obsAt(x, y, z, 6));
  for (const s of [-1, 1]) {
    M.line(c + s * 6, 44, c, c + s * 14, 54, c, (x, y, z) => obsAt(x, y, z, 7), 3);
    M.line(c + s * 3, 56, c, c + s * 9, 70, c - 2, (x, y, z) => ironAt(x, y, z, 8), 2);
  }
  for (let k = 0; k < 6; k++) M.set(c - 3 + k, 52, c + 4, 0xff3a10, true);
  M.line(c, 12, c + 6, c, 70, c + 8, (x, y, z) => ironAt(x, y, z, 9), 2);
  for (let k = 0; k < 8; k++) M.set(c, 20 + k * 5, c + 9, lavaAt(k, 1, 1), true);
  M.set(c - 1, 52, c + 4, 0xff3a10, true);
  return { parts: bundle([[M, KS, c, 0, c]]), r: 6 * KS };
}
