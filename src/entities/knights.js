import * as THREE from 'three';
import { VoxelModel, RNG, hash3, shade, mix } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { meshFrom, splitLimb, relief, buildHeld } from './humanoid.js';
import { buildShieldModel, gripRoll } from './weaponModels.js';
import { HOLY, DEMON } from '../data/knights.js';
import { J, pick, frontZ, backZ, topY, ell, spike, tube, skin, edgeOf, inlay, crossAt } from './knightKit.js';

/**
 * The Holy Knight and the Demon Knight, rigged like the orc and the yeti:
 * torso, head, two-piece arms and legs, plus a tabard and cape or a shard skirt.
 * Everything is sculpted to the two reference paintings in docs/reference.
 */
export const S = 0.03;

/* ================================================================== */
/* HOLY KNIGHT                                                         */
/* ================================================================== */

const wh = (tone = 1, s = 3) => (x, y, z) => shade(pick(HOLY.plate, x, y, z, s), tone);
const gold = (x, y, z, s = 0) => (((x * 3 + y * 5 + z) & 3) === 0 ? J(HOLY.goldHi, x, y, z, 20 + s, 0.03) : J(HOLY.gold, x, y, z, 21 + s, 0.04));
const goldLo = (x, y, z, s = 0) => J(HOLY.goldLo, x, y, z, 22 + s, 0.05);
const mailC = (x, y, z, s = 0) => J(pick([HOLY.mail, HOLY.mailHi, HOLY.mailLo, HOLY.mail], x, y, z, 23 + s), x, y, z, 24 + s, 0.06);
const XCROSS = (o = {}) => ({ col: HOLY.glow, core: HOLY.glowCore, glow: true, ...o });

const H_OY = 10;
function holyTorso() {
  const T = new VoxelModel(64, 56, 40);
  const CX = 32;
  const CZ = 20;
  const ty = (y) => y + H_OY;
  const before = T.data.slice();
  ell(T, CX, ty(0), CZ, 13, 7, 9, wh(0.94));
  ell(T, CX, ty(8), CZ, 11.5, 6.5, 8.5, wh(0.98));
  ell(T, CX, ty(15), CZ + 0.3, 13, 6.5, 9, wh(1));
  ell(T, CX, ty(22), CZ + 0.8, 15, 8.5, 10, wh(1.03));
  for (const s of [-1, 1]) ell(T, CX + s * 7, ty(23), CZ + 5, 8, 6.5, 5.5, wh(1.07));
  ell(T, CX, ty(29), CZ, 17, 4, 9, wh(0.98));
  ell(T, CX, ty(32.5), CZ, 8.5, 3.5, 7, wh(1.0));
  ell(T, CX, ty(36), CZ, 5.8, 3, 5.2, mailC);
  ell(T, CX, ty(21), CZ - 5, 13, 9, 5, wh(0.92));

  for (let y = ty(-3); y <= ty(6); y++) for (let x = 0; x < 64; x++) {
    const fz = frontZ(T, x, y);
    if (fz >= 0 && y >= ty(3) && y <= ty(4)) T.set(x, y, fz, gold(x, y, fz, 1));
  }
  skin(T, ty(3), ty(4), (x, y, z) => gold(x, y, z, 2));
  inlay(T, CX, ty(3.5), 4.2, 4.2, { base: (x, y, z) => goldLo(x, y, z, 3), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 1, down: 1, side: 1, t: 1 }) });

  skin(T, ty(12), ty(12), (x, y, z) => gold(x, y, z, 4));
  skin(T, ty(17), ty(17), (x, y, z) => goldLo(x, y, z, 5));
  for (const s of [-1, 1]) {
    for (let k = 0; k <= 11; k++) {
      const x = CX + s * (3 + k);
      const y = ty(12 + Math.round(k * 0.5));
      const z = frontZ(T, x, y);
      if (z >= 0) {
        T.set(x, y, z, gold(x, y, z, 6));
        T.set(x, y + 1, z, goldLo(x, y + 1, z, 7));
      }
    }
    for (let k = 0; k <= 9; k++) {
      const x = CX + s * (2 + Math.round(k * 0.45));
      const y = ty(18 + k);
      const z = frontZ(T, x, y);
      if (z >= 0 && k > 7) T.set(x, y, z, gold(x, y, z, 8));
    }
  }
  inlay(T, CX, ty(22.5), 8.5, 10.5, { base: wh(1.08), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 8, down: 7, side: 5, t: 3, hy: 2 }) });
  for (const s of [-1, 1]) {
    inlay(T, CX + s * 14.5, ty(26), 3, 3.4, { base: wh(1.1), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 2, down: 2, side: 1, t: 2 }), seed: 9 });
    for (let k = 0; k < 10; k++) {
      const z = backZ(T, CX + s * (1 + (k & 1)), ty(8 + k * 2));
      if (z >= 0) T.set(CX + s * (1 + (k & 1)), ty(8 + k * 2), z, gold(k, 3, 4, 10));
    }
  }
  for (let y = ty(5); y <= ty(32); y++) for (const x of [CX - 1, CX]) {
    const z = backZ(T, x, y);
    if (z >= 0) T.set(x, y, z, y % 3 === 0 ? goldLo(x, y, z, 11) : gold(x, y, z, 12));
  }
  for (let y = ty(14); y <= ty(30); y += 4) for (let x = CX - 10; x <= CX + 9; x++) {
    const z = backZ(T, x, y);
    if (z >= 0) T.set(x, y, z, shade(pick(HOLY.plate, x, y, z, 13), 0.82));
  }
  for (const s of [-1, 1]) {
    ell(T, CX + s * 12, ty(31), CZ - 1, 5, 4.4, 7, wh(1.02));
    ell(T, CX + s * 13, ty(33.5), CZ - 1.5, 3.4, 3.4, 5.5, wh(1.06));
    spike(T, CX + s * 14.5, ty(35), CZ - 1.5, s * 0.35, 1, -0.1, 7, 2.1, (x, y, z, t) => (t > 0.6 ? HOLY.goldHi : gold(x, y, z, 14)), 0.5);
    spike(T, CX + s * 10.5, ty(34.5), CZ + 2, s * 0.15, 1, 0.1, 5, 1.6, (x, y, z, t) => (t > 0.6 ? HOLY.goldHi : gold(x, y, z, 15)), 0.5);
    ell(T, CX + s * 10.5, ty(-4), CZ + 1, 3.6, 5.5, 8.2, wh(0.95));
    skin(T, ty(-9), ty(-8), (x, y, z) => gold(x, y, z, 16), (x) => Math.abs(x - (CX + s * 10.5)) < 5);
  }
  for (let y = ty(28); y <= ty(33); y++) for (let x = CX - 14; x <= CX + 14; x++) {
    const z = frontZ(T, x, y);
    if (z >= 0 && (y === ty(28) || (y === ty(31) && (x + y) % 2 === 0))) T.set(x, y, z, goldLo(x, y, z, 17));
  }
  relief(T, before);
  return T;
}

function holyHead() {
  const H = new VoxelModel(48, 56, 42);
  const CX = 24;
  const CZ = 21;
  const before = H.data.slice();
  ell(H, CX, 19, CZ - 1, 9.6, 9.4, 10.4, wh(1.02));
  ell(H, CX, 15, CZ + 3, 8, 9, 8.6, wh(1.04));
  ell(H, CX, 9.5, CZ + 4, 6, 4, 6.6, wh(0.98));
  for (const s of [-1, 1]) ell(H, CX + s * 7.6, 14, CZ + 2, 3, 7, 7, wh(1));
  ell(H, CX, 15, CZ - 6, 9, 10, 7, wh(0.94));
  ell(H, CX, 7, CZ - 2, 8.4, 4, 7.4, wh(0.92));
  ell(H, CX, 3.5, CZ, 6.2, 3, 5.6, mailC);

  for (let y = 13; y <= 20; y++) for (let x = CX - 7; x <= CX + 6; x++) {
    const z = frontZ(H, x, y);
    if (z < 0) continue;
    const dx = Math.abs(x + 0.5 - CX);
    const slit = y >= 14 && y <= 19 && dx <= 3.4 + (y >= 17 ? 1.2 : 0);
    if (slit) {
      H.clear(x, y, z);
      H.set(x, y, z - 1, J(0x0f1116, x, y, z, 31, 0.15));
      if (z - 2 >= 0) H.set(x, y, z - 2, 0x06070a);
    }
  }
  for (const s of [-1, 1]) {
    for (const [dx, y] of [[1, 17], [2, 17], [3, 18], [4, 18]]) {
      const x = s > 0 ? CX + dx : CX - dx - 1;
      const z = frontZ(H, x, y);
      if (z >= 0) H.set(x, y, z, dx < 3 ? HOLY.glowCore : 0xffffff, true);
    }
  }
  for (let x = CX - 8; x <= CX + 7; x++) {
    for (const [y, c] of [[13, 0], [20, 1]]) {
      const z = frontZ(H, x, y);
      if (z >= 0 && Math.abs(x + 0.5 - CX) < 7.4 && Math.abs(x + 0.5 - CX) > 4.2) H.set(x, y, z, c ? gold(x, y, z, 20) : goldLo(x, y, z, 21));
    }
  }
  for (const s of [-1, 1]) for (let y = 12; y <= 21; y++) {
    const x = s > 0 ? CX + 7 : CX - 8;
    const z = frontZ(H, x, y);
    if (z >= 0) H.set(x, y, z, gold(x, y, z, 22));
  }
  for (let y = 8; y <= 14; y++) for (const x of [CX - 1, CX]) {
    const z = frontZ(H, x, y);
    if (z >= 0) H.set(x, y, z + 1, shade(pick(HOLY.plate, x, y, z, 32), 1.12));
  }
  for (const dx of [-5, -3, 3, 5]) for (let y = 9; y <= 12; y++) {
    const x = CX + dx - (dx > 0 ? 0 : 0);
    const z = frontZ(H, x, y);
    if (z >= 0) {
      H.clear(x, y, z);
      H.set(x, y, z - 1, 0x1a1c22);
    }
  }
  for (let x = CX - 5; x <= CX + 4; x++) {
    const z = frontZ(H, x, 7);
    if (z >= 0 && (x + 7) % 2 === 0) H.set(x, 7, z, goldLo(x, 7, z, 23));
  }
  inlay(H, CX, 23.5, 3.6, 4.2, { base: wh(1.1), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 3, down: 2, side: 2, t: 2, hy: 0 }), seed: 4 });

  for (let z = CZ - 10; z <= CZ + 7; z++) {
    const y0 = topY(H, CX, z);
    if (y0 < 0) continue;
    const h = Math.max(1, Math.round(4.2 - Math.abs(z - (CZ - 1)) * 0.22));
    for (let k = 1; k <= h; k++) for (const x of [CX - 1, CX]) H.set(x, y0 + k, z, k === h ? HOLY.goldHi : gold(x, y0 + k, z, 24));
  }
  spike(H, CX - 0.5, topY(H, CX, CZ + 6) + 1, CZ + 6, 0, 1, 0.5, 8, 1.9, (x, y, z, t) => (t > 0.5 ? HOLY.goldHi : gold(x, y, z, 25)), 0.5);
  for (const s of [-1, 1]) {
    const xs = (v) => CX + s * v;
    tube(H, [[xs(9), 21, CZ + 1], [xs(12.4), 26, CZ], [xs(13.4), 33, CZ - 1], [xs(11.6), 39, CZ - 1.5], [xs(8.4), 43, CZ - 2]], 2.3, 0.7, (x, y, z, t) => (t > 0.75 ? HOLY.goldHi : t % 0.16 < 0.05 ? goldLo(x, y, z, 26) : gold(x, y, z, 27)));
    tube(H, [[xs(10), 17, CZ + 0.5], [xs(15), 19.5, CZ], [xs(16.4), 25, CZ - 0.5]], 1.5, 0.55, (x, y, z, t) => (t > 0.7 ? HOLY.goldHi : gold(x, y, z, 28)));
    tube(H, [[xs(7), 24, CZ - 3], [xs(8.6), 29, CZ - 5], [xs(7), 33, CZ - 6.5]], 1.2, 0.5, (x, y, z) => gold(x, y, z, 29));
  }
  relief(H, before);
  return H;
}

const CAPE_H = 64;
function holyCape() {
  const K = new VoxelModel(92, CAPE_H + 8, 30);
  const CX = 46;
  const top = CAPE_H + 3;
  const rng = new RNG(5521);
  const strips = [];
  for (let i = 0; i < 40; i++) strips.push(rng.range(0, 1));
  for (let y = top; y >= 2; y--) {
    const t = (top - y) / (top - 2);
    const half = 15 + 31 * t ** 0.85;
    const zc = 12 + t * 4;
    for (let x = Math.floor(CX - half); x <= Math.ceil(CX + half); x++) {
      const dx = x + 0.5 - CX;
      const u = dx / half;
      if (Math.abs(u) > 1) continue;
      const col = Math.floor((x + 100) / 3) % 40;
      const hem = 3 + (1 - Math.abs(u) ** 1.4) * 15 + strips[col] * 15 * Math.abs(u) ** 1.5 * 0 + (strips[col] > 0.55 ? -2 : strips[col] * 9) + (Math.abs(u) > 0.8 ? -5 + strips[(col + 7) % 40] * 5 : 0);
      if (y < hem) continue;
      const slit = Math.abs(u) > 0.35 && ((col * 13 + 5) % 9 === 0) && y < hem + 15 + strips[col] * 8;
      if (slit && (x + 100) % 3 === 1) continue;
      const z = Math.round(zc - (1 - Math.abs(u) ** 2) * 2 + u * u * 8);
      const fold = 0.88 + 0.12 * Math.sin(x * 0.55 + y * 0.04);
      const edge = Math.abs(u) > 1 - 1.9 / half || y < hem + 1.6 || y > top - 2;
      for (let k = 0; k < 2; k++) {
        const c = edge ? (k === 1 ? gold(x, y, z, 30) : goldLo(x, y, z, 31)) : shade(pick(HOLY.plate, x, y, z + k, 32), fold * (k === 0 ? 0.9 : 1));
        K.set(x, y, z + k, c);
      }
    }
  }
  return K;
}

function holyTabard() {
  const K = new VoxelModel(54, 40, 10);
  const CX = 27;
  const rng = new RNG(3377);
  const jag = [];
  for (let i = 0; i < 60; i++) jag.push(rng.range(0, 1));
  const panel = (cx, top, halfTop, halfBot, hemFn, z0, th, chevrons) => {
    for (let y = top; y >= 0; y--) {
      const t = (top - y) / top;
      const half = halfTop + (halfBot - halfTop) * t;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half) - 1; x++) {
        const dx = x + 0.5 - cx;
        if (Math.abs(dx) > half) continue;
        const hem = hemFn(dx, x);
        if (y < hem) continue;
        const edge = Math.abs(dx) > half - 1.6 || y < hem + 1.6 || y > top - 1.4;
        for (let k = 0; k < th; k++) {
          const front = k === th - 1;
          const c = edge ? (front ? gold(x, y, z0 + k, 40) : goldLo(x, y, z0 + k, 41)) : shade(pick(HOLY.plate, x, y, z0 + k, 42), front ? 1.04 : 0.92);
          K.set(x, y, z0 + k, c);
        }
      }
    }
    if (chevrons) {
      for (const y0 of chevrons) {
        for (let dx = -Math.floor(halfBot) + 2; dx <= Math.floor(halfBot) - 2; dx++) {
          const y = Math.round(y0 - Math.abs(dx) * 0.85);
          const x = Math.round(cx + dx);
          if (y < hemFn(dx, x) + 2 || y > top - 3) continue;
          if (Math.abs(dx) > halfTop + (halfBot - halfTop) * ((top - y) / top) - 2.2) continue;
          K.set(x, y, z0 + th - 1, gold(x, y, z0 + th, 43));
          K.set(x, y - 1, z0 + th - 1, goldLo(x, y, z0 + th, 44));
        }
      }
    }
  };
  const jg = (dx, x) => jag[(Math.floor(x) + 100) % 60];
  panel(CX, 31, 8, 11.5, (dx, x) => 1.5 + Math.abs(dx) * 1.35 + jg(dx, x) * 3.5 + ((Math.floor(x) & 3) === 0 ? 2.5 : 0), 3, 3, [23, 17, 11]);
  for (const s of [-1, 1]) panel(CX + s * 17, 28, 4.5, 6, (dx, x) => 9 + Math.abs(dx) * 1.0 + jg(dx, x + 9) * 5 + ((Math.floor(x) % 5) === 0 ? 3 : 0), 1, 2, [18, 12]);
  inlay(K, CX, 25.5, 4.2, 4.8, { base: wh(1.08), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 3, down: 3, side: 2, t: 2 }), seed: 6 });
  return K;
}

const HA_PIVOT = 42;
const HA_ELBOW = 24;
function holyArm(side) {
  const A = new VoxelModel(44, 64, 44);
  const CX = 22;
  const CZ = 22;
  const s = side;
  const before = A.data.slice();
  ell(A, CX + s * 2.5, 49, CZ, 12.4, 7.4, 12, wh(1.03));
  ell(A, CX + s * 3, 44.5, CZ, 12.6, 3.2, 12, wh(0.97));
  ell(A, CX + s * 3, 41.2, CZ, 11.4, 3, 11, wh(0.92));
  ell(A, CX + s * 6, 56, CZ - 1, 1.6, 6.2, 7.2, wh(1.02));
  ell(A, CX, 34, CZ, 6.6, 9.4, 6.4, wh(0.96));
  ell(A, CX, 24.5, CZ + 0.4, 7.5, 4.8, 7.3, wh(1.0));
  ell(A, CX, 17.5, CZ, 6.8, 6.2, 6.7, wh(0.98));
  ell(A, CX, 10.5, CZ, 7.4, 6.2, 7.2, wh(1.02));
  ell(A, CX, 4.6, CZ + 0.8, 6.4, 3.6, 6.8, mailC);
  for (let i = 0; i < 4; i++) ell(A, CX - 4.5 + i * 3, 3.2, CZ + 7, 1.8, 2.8, 1.9, (x, y, z) => J(HOLY.mailHi, x, y, z, 50, 0.08));
  ell(A, CX, 8.6, CZ + 1, 5.6, 1.6, 6.4, wh(0.9));
  for (let y = 2; y <= 7; y += 2) skin(A, y, y, (x, yy, z) => shade(mailC(x, yy, z, 1), 0.7), (x, yy, z) => Math.hypot(x - CX, z - CZ) < 7 && yy < 8);

  const dxz = (x, z) => Math.hypot(x - (CX + s * 2.8), z - CZ);
  skin(A, 40, 41, (x, y, z) => gold(x, y, z, 51), (x, y, z) => dxz(x, z) > 10);
  skin(A, 46, 47, (x, y, z) => goldLo(x, y, z, 52), (x, y, z) => dxz(x, z) > 11);
  for (let y = 50; y <= 54; y++) skin(A, y, y, (x, yy, z) => (yy % 2 ? gold(x, yy, z, 53) : goldLo(x, yy, z, 54)), (x) => Math.abs(x - (CX + s * 6)) < 3);
  edgeOf(A, (x, y) => y >= 52 && Math.abs(x - (CX + s * 6)) <= 2, (x, y, z) => (y > 60 ? HOLY.goldHi : gold(x, y, z, 55)));
  inlay(A, CX + s * 2.5, 49, 5.6, 5.6, { base: wh(1.1), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 3, down: 3, side: 2, t: 2 }), seed: 1 });
  skin(A, 21, 22, (x, y, z) => gold(x, y, z, 56), (x, y, z) => Math.hypot(x - CX, z - CZ) > 6.6);
  skin(A, 27, 27, (x, y, z) => goldLo(x, y, z, 57), (x, y, z) => Math.hypot(x - CX, z - CZ) > 6.8);
  skin(A, 14, 14, (x, y, z) => goldLo(x, y, z, 58), (x, y, z) => Math.hypot(x - CX, z - CZ) > 6.5);
  skin(A, 8, 9, (x, y, z) => gold(x, y, z, 59), (x, y, z) => Math.hypot(x - CX, z - CZ) > 6.8);
  inlay(A, CX, 17, 4.4, 6.6, { base: wh(1.1), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 4, down: 3, side: 2, t: 2 }), seed: 2 });
  relief(A, before);
  return A;
}

const HL_PIVOT = 38;
const HL_KNEE = 19;
function holyLeg() {
  const L = new VoxelModel(40, 46, 46);
  const CX = 20;
  const CZ = 17;
  const before = L.data.slice();
  ell(L, CX, 32, CZ, 9.4, 9, 8.8, wh(1.0));
  ell(L, CX, 25, CZ, 8.4, 5.4, 8.2, wh(0.96));
  ell(L, CX, 20.5, CZ + 3.4, 7.5, 5.2, 6.6, wh(1.04));
  ell(L, CX, 13.5, CZ + 0.5, 6.8, 7.4, 7.2, wh(0.98));
  ell(L, CX, 8, CZ + 0.5, 6.2, 4.6, 6.8, wh(0.95));
  ell(L, CX, 3.4, CZ + 5.6, 7.5, 3.5, 10.6, wh(0.97));
  ell(L, CX, 3.1, CZ + 13, 5.2, 2.6, 4.4, wh(1.0));
  ell(L, CX, 3.6, CZ - 4.4, 6.2, 3.5, 4.2, wh(0.92));
  for (let z = CZ + 2; z <= CZ + 16; z += 3) skin(L, 3, 5, (x, y, zz) => shade(pick(HOLY.plate, x, y, zz, 61), 0.78), (x, y, zz) => zz === z);
  skin(L, 0, 2, (x, y, z) => gold(x, y, z, 62), (x, y, z) => z >= CZ + 12);
  skin(L, 5, 5, (x, y, z) => goldLo(x, y, z, 63), (x, y, z) => z > CZ + 1);
  skin(L, 6, 7, (x, y, z) => gold(x, y, z, 64), (x, y, z) => Math.hypot(x - CX, z - (CZ + 0.5)) > 5.6);
  skin(L, 11, 11, (x, y, z) => goldLo(x, y, z, 65), (x, y, z) => Math.hypot(x - CX, z - (CZ + 0.5)) > 6.2);
  for (let y = 6; y <= 18; y++) for (const x of [CX - 1, CX]) {
    const z = frontZ(L, x, y);
    if (z >= 0) L.set(x, y, z + 1, y % 3 === 0 ? goldLo(x, y, z, 66) : gold(x, y, z, 67));
  }
  skin(L, 18, 19, (x, y, z) => gold(x, y, z, 68), (x, y, z) => z >= CZ + 5);
  for (const [dx, dz, dy] of [[0, 0, 0]]) {
    const z = frontZ(L, CX, 21);
    for (let a = -1; a <= 0; a++) for (let b = -1; b <= 1; b++) L.set(CX + a, 20 + b, z + 1, b === 0 ? HOLY.goldHi : HOLY.gold);
    void dx; void dz; void dy;
  }
  skin(L, 24, 24, (x, y, z) => goldLo(x, y, z, 69), (x, y, z) => Math.hypot(x - CX, z - CZ) > 7.6);
  skin(L, 39, 40, (x, y, z) => gold(x, y, z, 70), (x, y, z) => Math.hypot(x - CX, z - CZ) > 8);
  inlay(L, CX, 31, 5.2, 8.4, { base: wh(1.1), rim: HOLY.gold, rimHi: HOLY.goldHi, cross: XCROSS({ up: 5, down: 4, side: 3, t: 2, hy: 1 }), seed: 3 });
  relief(L, before);
  return L;
}

/* ================================================================== */
/* DEMON KNIGHT                                                        */
/* ================================================================== */

const dk = (tone = 1, s = 5) => (x, y, z) => shade(pick(DEMON.plate, x >> 1, y >> 1, z >> 1, s), tone * (0.94 + hash3(x, y, z, 77) * 0.12));
const spikeC = (s = 0) => (x, y, z, t) => (t > 0.82 ? DEMON.spike[2] : J(pick(DEMON.spike, x, y, z, 70 + s), x, y, z, 71 + s, 0.05));
const glowC = (x, y, z, t) => (t > 0.5 ? DEMON.glowHi : DEMON.glow);
const redEye = (x, y, z) => ((x + y) & 1 ? DEMON.glowHi : DEMON.glowCore);
const D_OY = 10;
const dRng = new RNG(8801);

function demonTorso() {
  const T = new VoxelModel(76, 66, 48);
  const CX = 38;
  const CZ = 24;
  const ty = (y) => y + D_OY;
  const before = T.data.slice();
  ell(T, CX, ty(0), CZ, 14, 7.5, 10, dk(0.9));
  ell(T, CX, ty(8), CZ, 12.5, 7, 9.5, dk(0.95));
  ell(T, CX, ty(15), CZ + 0.5, 14.5, 7, 10, dk(1));
  ell(T, CX, ty(22.5), CZ + 1, 17, 9, 11.5, dk(1.04));
  for (const s of [-1, 1]) ell(T, CX + s * 8, ty(23.5), CZ + 6, 8.5, 7, 6, dk(1.08));
  ell(T, CX, ty(30), CZ, 19, 4.5, 10, dk(0.96));
  ell(T, CX, ty(33.5), CZ, 9.5, 3.6, 7.6, dk(0.9));
  ell(T, CX, ty(37), CZ, 6, 3, 5.4, (x, y, z) => J(DEMON.steel[3], x, y, z, 80, 0.1));
  ell(T, CX, ty(22), CZ - 5.5, 15, 10, 6, dk(0.86));

  for (let i = 0; i < 420; i++) {
    const x = Math.round(CX + dRng.range(-17, 17));
    const y = Math.round(ty(dRng.range(3, 32)));
    const z = frontZ(T, x, y);
    if (z < 0) continue;
    const len = 4 + dRng.range(0, 5) + (y > ty(18) ? 1.5 : 0);
    spike(T, x, y, z, dRng.range(-0.3, 0.3), -0.8, 0.6, len, 1.7, spikeC(i & 3), 0.2);
  }
  for (let y = ty(3); y <= ty(30); y += 4) for (let x = CX - 17; x <= CX + 17; x++) {
    const z = frontZ(T, x, y);
    if (z >= 0) T.set(x, y, z, J(DEMON.edge, x, y, z, 81, 0.08));
  }
  for (let y = ty(14); y <= ty(33); y += 3) for (let x = CX - 15; x <= CX + 15; x++) {
    const z = backZ(T, x, y);
    if (z >= 0 && ((x + y) & 1)) T.set(x, y, z, shade(pick(DEMON.plate, x, y, z, 83), 0.8));
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const x = CX + s * (3.5 + k * 3.6);
      spike(T, x, ty(31 + (k % 2) * 0.5), CZ - 5.5, s * 0.25, 1, -0.75, 17 - k * 1.2 - (k % 2) * 2, 3.8 - k * 0.15, spikeC(k), 0.4);
    }
    spike(T, CX + s * 2, ty(33), CZ - 5.5, 0, 1, -0.55, 20, 4, spikeC(9), 0.4);
    for (let k = 0; k < 4; k++) spike(T, CX + s * (12 + k * 1.6), ty(30 - k * 4), CZ - 8.5, s * 0.8, 0.2 + k * 0.15, -0.9, 10 - k, 2.8, spikeC(10 + k), 0.4);
  }
  spike(T, CX, ty(24), CZ - 5, 0, 1, -0.9, 13, 3.2, spikeC(8), 0.4);
  for (const s of [-1, 1]) {
    ell(T, CX + s * 12.5, ty(31.5), CZ - 0.5, 6.2, 5, 8, dk(1.02));
    ell(T, CX + s * 11.5, ty(-4.5), CZ + 1, 4, 6.2, 9, dk(0.9));
    for (let k = 0; k < 6; k++) spike(T, CX + s * (11.5 + (k - 2.5) * 0.7), ty(-7), CZ + 1 + (k - 2.5) * 3.3, 0, -1, 0.15, 6 + (k % 2) * 3, 1.8, spikeC(20 + k), 0.2);
  }
  for (let k = 0; k < 14; k++) spike(T, CX + (k - 6.5) * 2.4, ty(-5.5), CZ + 7.5, 0, -1, 0.4, 3 + (k % 3) * 1.4, 1.1, spikeC(30 + k), 0.2);
  relief(T, before);
  return T;
}

function demonHead() {
  const H = new VoxelModel(56, 62, 48);
  const CX = 28;
  const CZ = 24;
  const before = H.data.slice();
  ell(H, CX, 19, CZ - 1, 10, 10, 11, dk(1.02));
  ell(H, CX, 15, CZ + 3, 8.4, 9, 9, dk(1.05));
  ell(H, CX, 8.5, CZ + 4, 6.4, 4.5, 7, dk(0.9));
  ell(H, CX, 14, CZ - 6, 9.5, 10, 7, dk(0.88));
  ell(H, CX, 5, CZ - 1, 8.8, 4, 7.6, dk(0.82));
  ell(H, CX, 3, CZ, 6, 3, 5.6, (x, y, z) => J(DEMON.steel[3], x, y, z, 84, 0.1));
  for (let y = 14; y <= 20; y++) for (let x = CX - 8; x <= CX + 7; x++) {
    const z = frontZ(H, x, y);
    if (z < 0) continue;
    const dx = Math.abs(x + 0.5 - CX);
    const slit = (y >= 16 && y <= 19 && dx <= 6) || (y === 15 && dx <= 3);
    if (slit) {
      H.clear(x, y, z);
      H.set(x, y, z - 1, 0x050506);
      if (z - 2 >= 0) H.set(x, y, z - 2, 0x020203);
    }
  }
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = s > 0 ? CX + 2 + k : CX - 3 - k;
    const y = 17 + (k >= 2 ? 1 : 0) + (k === 3 ? 0 : 0);
    const z = frontZ(H, x, y);
    if (z >= 0) H.set(x, y, z, k < 2 ? DEMON.glowHi : DEMON.glow, true);
    const z2 = frontZ(H, x, y + 1);
    if (z2 >= 0 && k >= 1) H.set(x, y + 1, z2, DEMON.glow, true);
  }
  for (let y = 7; y <= 13; y++) for (const dx of [-4, -2, 1, 3]) {
    const x = CX + dx;
    const z = frontZ(H, x, y);
    if (z >= 0) {
      H.clear(x, y, z);
      H.set(x, y, z - 1, 0x0b0b0d);
    }
  }
  for (let y = 12; y <= 22; y++) for (const x of [CX - 1, CX]) {
    const z = frontZ(H, x, y);
    if (z >= 0 && (y < 14 || y > 19)) H.set(x, y, z + 1, J(DEMON.edge, x, y, z, 85, 0.08));
  }
  for (let k = 0; k < 9; k++) {
    const a = -1 + k * 0.25;
    const rr = 8.5;
    const x = CX + Math.sin(a * 1.5) * rr;
    const z = CZ - 1 + Math.cos(a * 1.5) * rr * 0.45 - 2;
    const hgt = 10 + (k === 4 ? 8 : k % 2 ? -1 : 3) + dRng.range(0, 2);
    spike(H, x, 26.5, z, Math.sin(a * 1.5) * 0.9, 1, -0.2 + a * 0.2, hgt, 3.1, spikeC(40 + k), 0.4);
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) spike(H, CX + s * (9.5 + k * 0.6), 19 + k * 3.2, CZ - 1 - k * 1.2, s * 1, 0.55, -0.15, 6 - k, 2, spikeC(50 + k), 0.4);
    spike(H, CX + s * 6, 22.5, CZ + 6.5, s * 0.35, 1, 0.4, 5, 1.7, spikeC(55), 0.4);
    spike(H, CX + s * 8.5, 11, CZ + 1.5, s * 0.9, -0.5, 0.2, 5, 1.8, spikeC(56), 0.4);
  }
  for (let k = 0; k < 5; k++) spike(H, CX + (k - 2) * 3.4, 22, CZ - 8, 0, 0.7, -1, 8 - Math.abs(k - 2) * 1.4, 1.9, spikeC(60 + k), 0.4);
  relief(H, before);
  return H;
}

function demonSkirt() {
  const K = new VoxelModel(64, 44, 16);
  const CX = 32;
  const rng = new RNG(6609);
  for (let layer = 0; layer < 2; layer++) {
    const n = layer === 0 ? 11 : 9;
    for (let i = 0; i < n; i++) {
      const cx = CX + (i - (n - 1) / 2) * (layer === 0 ? 4.6 : 5.4) + rng.range(-0.6, 0.6);
      const len = (layer === 0 ? 24 : 34) + rng.range(0, 8) - Math.abs(i - (n - 1) / 2) * 1.5;
      const w = layer === 0 ? 3.6 : 3.4;
      const z0 = layer === 0 ? 8 : 5;
      for (let y = 43; y > 43 - len; y--) {
        const t = (43 - y) / len;
        const half = Math.max(0.3, w * (1 - t * 0.92));
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
          if (Math.abs(x + 0.5 - cx) > half) continue;
          const c = t > 0.8 ? DEMON.spike[2] : J(pick(DEMON.plate, x >> 1, y >> 1, layer, 90), x, y, layer, 91, 0.06);
          K.set(x, y, z0 + (Math.abs(x - cx) < 1 ? 1 : 0), shade(c, layer === 0 ? 1.12 : 0.9));
          if (Math.abs(x + 0.5 - cx) < half * 0.4) K.set(x, y, z0 + 2, shade(c, 1.08));
        }
      }
    }
  }
  for (let x = 4; x < 60; x++) for (let y = 41; y <= 43; y++) K.set(x, y, 7, (x + y) & 1 ? DEMON.plate[2] : DEMON.plate[1]);
  return K;
}

function demonArm(side) {
  const A = new VoxelModel(52, 66, 48);
  const CX = 26;
  const CZ = 24;
  const s = side;
  const before = A.data.slice();
  ell(A, CX + s * 3, 50, CZ, 14, 8.4, 13, dk(1.04));
  ell(A, CX + s * 3.5, 44.5, CZ, 14.6, 3.4, 13.6, dk(0.96));
  ell(A, CX + s * 3, 41.2, CZ, 12.4, 3, 11.8, dk(0.9));
  ell(A, CX, 34, CZ, 7, 9.6, 6.8, dk(0.94));
  ell(A, CX, 24.5, CZ + 0.5, 8.4, 5.2, 8, dk(1.02));
  ell(A, CX, 17.5, CZ, 7.4, 6.4, 7.2, dk(0.96));
  ell(A, CX, 10.5, CZ, 8.2, 6.4, 7.8, dk(1.0));
  ell(A, CX, 4.6, CZ + 0.8, 7, 3.8, 7.2, (x, y, z) => J(DEMON.steel[0], x, y, z, 95, 0.1));
  const at = (cx, y, z, dx, dy, dz, len, r, k) => spike(A, cx, y, z, dx, dy, dz, len, r, spikeC(k), 0.4);
  for (let k = 0; k < 7; k++) {
    const a = (k / 6) * Math.PI;
    at(CX + s * 3 + Math.cos(a) * s * 10, 53 + Math.sin(a) * 4, CZ + (k % 2 ? 2 : -3), s * Math.cos(a) * 0.9, 0.5 + Math.sin(a), 0, 15 - Math.abs(k - 3) * 2, 3.5, 100 + k);
  }
  at(CX + s * 3, 56, CZ, 0, 1, 0, 20, 4, 120);
  at(CX + s * 3, 54, CZ + 6, 0, 0.8, 0.8, 13, 3.2, 121);
  at(CX + s * 3, 54, CZ - 6, 0, 0.8, -0.8, 13, 3.2, 122);
  for (let k = 0; k < 5; k++) at(CX + s * (8 + k * 1.2), 46 - k * 1.5, CZ + (k - 2) * 3.6, s * 1, -0.1, (k - 2) * 0.2, 9 - k * 0.5, 2.6, 130 + k);
  at(CX, 27, CZ + 6.5, 0, 0.3, 1, 8, 2.8, 140);
  at(CX, 20.5, CZ + 6, 0, 0.1, 1, 5, 1.8, 141);
  for (const z of [CZ - 4, CZ + 4]) at(CX + s * 5.5, 12, z, s * 1, 0.4, 0, 6, 1.7, 142);
  skin(A, 21, 21, (x, y, z) => J(DEMON.edge, x, y, z, 96, 0.08), (x, y, z) => Math.hypot(x - CX, z - CZ) > 6.8);
  skin(A, 8, 9, (x, y, z) => J(DEMON.edge, x, y, z, 97, 0.08), (x, y, z) => Math.hypot(x - CX, z - CZ) > 7);
  skin(A, 14, 14, (x, y, z) => J(DEMON.steel[0], x, y, z, 98, 0.08), (x, y, z) => Math.hypot(x - CX, z - CZ) > 6.8);
  for (let i = 0; i < 4; i++) ell(A, CX - 5 + i * 3.3, 3, CZ + 7, 1.8, 2.6, 1.9, (x, y, z) => J(DEMON.steel[2], x, y, z, 99, 0.08));
  relief(A, before);
  return A;
}

function demonLeg() {
  const L = new VoxelModel(46, 50, 52);
  const CX = 23;
  const CZ = 19;
  const before = L.data.slice();
  ell(L, CX, 33, CZ, 10.4, 9.4, 9.8, dk(1.0));
  ell(L, CX, 26, CZ, 9.4, 5.6, 9, dk(0.94));
  ell(L, CX, 20.5, CZ + 3.6, 8.6, 5.4, 7.2, dk(1.06));
  ell(L, CX, 13.5, CZ + 0.5, 7.8, 7.6, 8, dk(0.96));
  ell(L, CX, 8, CZ + 0.5, 7.2, 4.8, 7.6, dk(0.92));
  ell(L, CX, 3.6, CZ + 6, 8.6, 3.8, 12, dk(0.9));
  ell(L, CX, 3.2, CZ + 14, 6, 2.8, 5, dk(0.96));
  ell(L, CX, 3.8, CZ - 4.4, 7, 3.6, 4.6, dk(0.84));
  const at = (x, y, z, dx, dy, dz, len, r, k) => spike(L, x, y, z, dx, dy, dz, len, r, spikeC(k), 0.4);
  at(CX, 21, CZ + 9, 0, 0.35, 1, 10, 3.4, 150);
  at(CX - 4, 22, CZ + 8, -0.4, 0.5, 1, 6, 2, 151);
  at(CX + 4, 22, CZ + 8, 0.4, 0.5, 1, 6, 2, 152);
  for (const sd of [-1, 1]) {
    at(CX + sd * 9, 30, CZ, sd, 0.5, 0, 8, 2.6, 153 + sd);
    at(CX + sd * 8.4, 12, CZ, sd, 0.3, 0, 6, 2, 156 + sd);
    at(CX + sd * 7, 4, CZ + 9, sd, 0.2, 1, 5, 1.8, 158 + sd);
  }
  for (let k = 0; k < 5; k++) at(CX + (k - 2) * 2.4, 4.5, CZ + 17, 0, 0.1, 1, 4 - Math.abs(k - 2) * 0.5, 1.4, 160 + k);
  for (let z = CZ + 1; z <= CZ + 16; z += 4) skin(L, 3, 5, (x, y, zz) => shade(J(DEMON.plate[0], x, y, zz, 161, 0.1), 0.7), (x, y, zz) => zz === z);
  skin(L, 6, 7, (x, y, z) => J(DEMON.edge, x, y, z, 162, 0.08), (x, y, z) => Math.hypot(x - CX, z - (CZ + 0.5)) > 6.6);
  skin(L, 18, 19, (x, y, z) => J(DEMON.edge, x, y, z, 163, 0.08), (x, y, z) => z >= CZ + 5);
  skin(L, 39, 40, (x, y, z) => J(DEMON.steel[0], x, y, z, 164, 0.1), (x, y, z) => Math.hypot(x - CX, z - CZ) > 9);
  relief(L, before);
  return L;
}

function demonCape() {
  const K = new VoxelModel(70, 46, 16);
  const CX = 35;
  const rng = new RNG(1313);
  for (let i = 0; i < 16; i++) {
    const cx = CX + (i - 7.5) * 4.2;
    const len = 26 + rng.range(0, 16) - Math.abs(i - 7.5) * 0.6;
    for (let y = 45; y > 45 - len; y--) {
      const t = (45 - y) / len;
      const half = Math.max(0.4, 3 * (1 - t * 0.9));
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) if (Math.abs(x + 0.5 - cx) <= half) K.set(x, y, 5 + (i & 1) * 2, shade(J(DEMON.plate[(i + y) % 3], x, y, 0, 170, 0.08), 0.78));
    }
  }
  return K;
}

const DM_HOLD = { pos: [-0.66, 0.2, 0.74], dir: [-0.12, 1, 0.12] };

export function buildDemonKnight() {
  const arm = (side) => demonArm(side);
  Object.assign(arm, { cx: 26, pivot: 42, cz: 24, elbow: 24, sx: 21, sy: 27, sz: 0, handY: 4 });
  const leg = () => demonLeg();
  Object.assign(leg, { cx: 23, pivot: 38, cz: 19, knee: 19, sx: 8.6, sy: 1.22 });
  const rig = assemble({
    hipY: 38 * 1.22,
    torso: done(demonTorso(), 38, D_OY, 24),
    head: { ...done(demonHead(), 28, 5, 24), pos: [0, 32, 0.5] },
    arm,
    leg,
    cloth: { pos: [0, 8, 12.5], parts: [done(demonSkirt(), 32, 43, 8)] },
  });
  rig.dims = { upperArm: 18 * S, foreArm: 20 * S };
  const sword = buildHeld('demonsword');
  const sw = new THREE.Group();
  sword.scale.setScalar(0.78);
  sw.add(sword);
  rig.parts.body.add(sw);
  rig.parts.weapon = sw;

  const sm = buildShieldModel('demonset');
  const shieldMesh = meshFrom(sm.M, sm.ox, sm.oy, sm.oz, toonMaterial({ vertexColors: true }), sm.size);
  shieldMesh.rotation.x = Math.PI / 2;
  shieldMesh.scale.setScalar(2.05);
  const sh = new THREE.Group();
  sh.add(shieldMesh);
  sh.position.set(1.0, 0.02, 0.5);
  sh.rotation.y = 0.22;
  rig.parts.body.add(sh);
  rig.parts.shield = sh;

  const edge = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), gripRoll('demonsword'));
  rig.holdGear = (p = DM_HOLD) => {
    sw.position.set(...p.pos);
    sw.quaternion.copy(aimHammer(p.dir, p.face || [0, 0, 1])).multiply(edge);
    const grip = _v(0, 0, 8 * 0.015 * 0.78).applyQuaternion(sw.quaternion).add(sw.position);
    reachArm(rig, 'L', grip, _v(-0.8, -0.5, -0.3));
    const back = _v(0.78, 0.18, 0.28);
    reachArm(rig, 'R', back, _v(0.9, -0.6, -0.2));
  };
  rig.holdGear();
  return rig;
}

/** Rigged pieces shared by both knights. Returns the meshes and a part table the AI poses. */
function assemble(o) {
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const root = new THREE.Group();
  const hip = new THREE.Group();
  hip.position.y = o.hipY * S;
  root.add(hip);
  const upper = new THREE.Group();
  hip.add(upper);
  upper.add(meshFrom(o.torso.M, o.torso.ox, o.torso.oy, o.torso.oz, mat, S));

  const headG = new THREE.Group();
  headG.position.set(...o.head.pos.map((v) => v * S));
  headG.add(meshFrom(o.head.M, o.head.ox, o.head.oy, o.head.oz, mat, S));
  upper.add(headG);

  const limbs = {};
  for (const side of [-1, 1]) {
    const a = o.arm(side);
    const pieces = splitLimb(a, o.arm.cx, o.arm.pivot, o.arm.cz, mat, o.arm.elbow);
    const shoulder = new THREE.Group();
    shoulder.position.set(side * o.arm.sx * S, o.arm.sy * S, o.arm.sz * S);
    const elbow = new THREE.Group();
    elbow.position.y = -(o.arm.pivot - o.arm.elbow) * S;
    elbow.add(pieces.lower);
    shoulder.add(pieces.upper, elbow);
    upper.add(shoulder);
    const hand = new THREE.Group();
    hand.position.set(0, (o.arm.handY - o.arm.elbow) * S, 0);
    elbow.add(hand);
    limbs[side < 0 ? 'armL' : 'armR'] = { shoulder, elbow, hand };
  }
  for (const side of [-1, 1]) {
    const l = o.leg(side);
    const pieces = splitLimb(l, o.leg.cx, o.leg.pivot, o.leg.cz, mat, o.leg.knee);
    const thigh = new THREE.Group();
    thigh.position.set(side * o.leg.sx * S, 0, 0);
    thigh.scale.y = o.leg.sy || 1;
    const knee = new THREE.Group();
    knee.position.y = -(o.leg.pivot - o.leg.knee) * S;
    knee.add(pieces.lower);
    thigh.add(pieces.upper, knee);
    hip.add(thigh);
    limbs[side < 0 ? 'legL' : 'legR'] = { thigh, knee };
  }
  const cloth = new THREE.Group();
  cloth.position.set(...o.cloth.pos.map((v) => v * S));
  cloth.scale.y = o.leg.sy || 1;
  for (const c of o.cloth.parts) cloth.add(meshFrom(c.M, c.ox, c.oy, c.oz, mat, S));
  hip.add(cloth);

  let cape = null;
  if (o.cape) {
    cape = new THREE.Group();
    cape.position.set(...o.cape.pos.map((v) => v * S));
    cape.add(meshFrom(o.cape.M, o.cape.ox, o.cape.oy, o.cape.oz, mat, S));
    upper.add(cape);
  }
  root.traverse((m) => {
    if (m.isMesh) m.frustumCulled = true;
  });
  return {
    root,
    mat,
    parts: {
      hip,
      body: upper,
      head: headG,
      cloth,
      cape,
      armL: limbs.armL.shoulder,
      armR: limbs.armR.shoulder,
      elbowL: limbs.armL.elbow,
      elbowR: limbs.armR.elbow,
      handL: limbs.armL.hand,
      handR: limbs.armR.hand,
      legL: limbs.legL.thigh,
      legR: limbs.legR.thigh,
      kneeL: limbs.legL.knee,
      kneeR: limbs.legR.knee,
    },
  };
}


const _v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DOWN = _v(0, -1, 0);

/**
 * Two-bone reach for a rig arm. The target is in the body (upper) frame.
 * Twist-free: only the swing needed to put the hand on the target.
 */
export function reachArm(rig, key, target, pole) {
  const sh = rig.parts[key === 'L' ? 'armL' : 'armR'];
  const el = rig.parts[key === 'L' ? 'elbowL' : 'elbowR'];
  const L1 = rig.dims.upperArm;
  const L2 = rig.dims.foreArm;
  const sp = sh.position;
  const to = target.clone().sub(sp);
  let D = to.length();
  const maxD = (L1 + L2) * 0.995;
  if (D > maxD) { to.multiplyScalar(maxD / D); D = maxD; }
  const dir = to.clone().normalize();
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E = dir.clone().multiplyScalar(a).add(pl.multiplyScalar(h));
  const qs = new THREE.Quaternion().setFromUnitVectors(DOWN, E.clone().normalize());
  sh.quaternion.copy(qs);
  const lowerDir = to.clone().sub(E).normalize();
  const ql = new THREE.Quaternion().setFromUnitVectors(DOWN, lowerDir);
  el.quaternion.copy(qs.clone().invert().multiply(ql));
}

/** Weapon grip point in body space: the weapon group's own z axis, scaled. */
export function gripPoint(weapon, zVoxels, unit = 0.015) {
  return _v(0, 0, zVoxels * unit * weapon.scale.x).applyQuaternion(weapon.quaternion).add(weapon.position);
}

const done = (M, ox, oy, oz) => ({ M, ox, oy, oz });

export function buildHolyKnight() {
  const arm = (side) => holyArm(side);
  Object.assign(arm, { cx: 22, pivot: HA_PIVOT, cz: 22, elbow: HA_ELBOW, sx: 19.5, sy: 26, sz: 0, handY: 4 });
  const leg = () => holyLeg();
  Object.assign(leg, { cx: 20, pivot: HL_PIVOT, cz: 17, knee: HL_KNEE, sx: 8, sy: 1.22 });
  const rig = assemble({
    hipY: 38 * 1.22,
    torso: done(holyTorso(), 32, H_OY, 20),
    head: { ...done(holyHead(), 24, 5, 21), pos: [0, 31, 0.5] },
    arm,
    leg,
    cloth: { pos: [0, 3, 10.5], parts: [done(holyTabard(), 27, 31 + 0, 3)] },
    cape: { ...done(holyCape(), 46, CAPE_H + 3, 9), pos: [0, 29, -11] },
  });
  rig.dims = { upperArm: 18 * S, foreArm: 20 * S };
  const hammer = buildHeld('holyhammer');
  hammer.scale.setScalar(1.55);
  const wp = new THREE.Group();
  wp.add(hammer);
  rig.parts.body.add(wp);
  rig.parts.weapon = wp;
  rig.holdHammer = (p = HOLD_POSE) => {
    wp.position.set(...p.pos);
    wp.quaternion.copy(aimHammer(p.dir, p.face));
    wp.scale.setScalar(1);
    const hi = gripPoint(hammer, 44, 0.015).applyQuaternion(wp.quaternion).add(wp.position);
    const lo = gripPoint(hammer, 6, 0.015).applyQuaternion(wp.quaternion).add(wp.position);
    reachArm(rig, 'L', hi, _v(-0.7, -0.4, -0.5));
    reachArm(rig, 'R', lo, _v(0.9, -0.4, -0.3));
  };
  rig.holdHammer();
  return rig;
}

const HOLD_POSE = { pos: [0.3, 0.4, 0.62], dir: [-0.8, 0.52, 0.3], face: [0, 0, 1] };

/** Orient the hammer's haft along dir and roll it so the big cross faces face the viewer. */
function aimHammer(dir, face) {
  const d = _v(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(_v(0, 0, 1), d);
  const y1 = _v(0, 1, 0).applyQuaternion(q);
  const n = _v(...face);
  n.sub(d.clone().multiplyScalar(n.dot(d))).normalize();
  let ang = Math.acos(Math.min(1, Math.max(-1, y1.dot(n))));
  if (y1.clone().cross(n).dot(d) < 0) ang = -ang;
  return new THREE.Quaternion().setFromAxisAngle(d, ang).multiply(q);
}

export const VIEW = { holyknight: buildHolyKnight, demonknight: buildDemonKnight };
