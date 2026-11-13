import { VoxelModel, hash3, jitter, shade } from '../engine/voxel.js';
import { bundle } from './models.js';
import { KS, cyl, ringV, cone, pyramid, masonry, carveArch, archHalf, windowZ } from './keepKit.js';

/**
 * Dawnspire: the Holy Knight's castle. White marble, gold trim, blue glass and a cross on every roof.
 * Every piece faces +z; the world rotates them.
 */

const MARBLE = [0xeceae4, 0xe1ded6, 0xd5d1c8, 0xf4f2ed, 0xdcd8cf];
const MORTAR = 0xa7a296;
const GOLD = [0xe6b94a, 0xf3cf63, 0xc8962c, 0xffe08a];
const GLASS = [0x3f86e8, 0x5aa0f4, 0x7fc0ff, 0xbfe4ff];
const ROOF = [0x3c5d9a, 0x34528a, 0x4a6cae, 0x2e4a80];
const CLOTH = [0xf2f0ea, 0xe3e1e8];
const goldAt = (x, y, z, s = 0) => jitter(GOLD[Math.floor(hash3(x >> 1, y >> 1, z >> 1, 700 + s) * 3)], 0.03, hash3(x, y, z, 701 + s));
const roofAt = (x, y, z, s = 0) => jitter(ROOF[Math.floor(hash3(x, y >> 1, z, 710 + s) * ROOF.length)], 0.03, hash3(x, y, z, 711 + s));
const glassAt = (yy, h) => GLASS[Math.min(3, Math.floor((yy / Math.max(1, h)) * 3.4))];

function finial(M, cx, y0, cz, size = 1) {
  const s = size;
  M.box(cx - 1, y0, cz - 1, cx + 2, y0 + 3, cz + 2, (x, y, z) => goldAt(x, y, z, 1));
  M.box(cx, y0 + 3, cz, cx + 1, y0 + 3 + Math.round(10 * s), cz + 1, (x, y, z) => goldAt(x, y, z, 2));
  const yy = y0 + 3 + Math.round(6 * s);
  M.box(cx - Math.round(3 * s), yy, cz, cx + Math.round(3 * s) + 1, yy + 1, cz + 1, (x, y, z) => goldAt(x, y, z, 3));
  M.set(cx, y0 + 3 + Math.round(10 * s), cz, 0xfff0b0, true);
}

function crossRelief(M, cx, cy, z, h, color = 0xffe08a, glow = true) {
  const w = Math.max(3, Math.round(h * 0.55));
  M.box(cx - 1, cy - Math.round(h / 2), z, cx + 1, cy + Math.round(h / 2), z + 1, color, glow);
  M.box(cx - Math.round(w / 2), cy + Math.round(h * 0.12), z, cx + Math.round(w / 2) + 1, cy + Math.round(h * 0.12) + 2, z + 1, color, glow);
}

function pinnacle(M, cx, y0, cz, h, r) {
  for (let k = 0; k < h; k++) {
    const rr = Math.max(0.5, r * (1 - k / h));
    cyl(M, cx, cz, y0 + k, y0 + k + 1, rr, (x, y, z) => MARBLE[(x + y + z) % 5 < 0 ? 0 : Math.floor(hash3(x, y, z, 5) * 5)]);
  }
  M.box(Math.floor(cx), y0 + h, Math.floor(cz), Math.floor(cx) + 1, y0 + h + 2, Math.floor(cz) + 1, 0xe6b94a);
  M.set(Math.floor(cx), y0 + h + 2, Math.floor(cz), 0xfff0b0, true);
}

/* --------------------------------- walls --------------------------------- */

export function buildHolyWall(len, seed = 2) {
  const M = new VoxelModel(len, 66, 28);
  const brick = masonry(MARBLE, MORTAR, seed, 8, 4);
  const Z0 = 4;
  const ZO = Z0 + 18;
  M.box(0, 0, Z0 - 1, len, 6, ZO + 1, (x, y, z) => (y === 5 ? goldAt(x, y, z) : brick(x, y, z)));
  M.box(0, 6, Z0, len, 40, ZO, brick);
  for (let x = 0; x < len; x++) if (x % 6 < 4) M.box(x, 35, ZO, x + 1, 40, ZO + 2, (xx, y, z) => (y === 35 ? goldAt(xx, y, z, 2) : brick(xx, y, z)));
  M.box(0, 40, Z0, len, 41, ZO + 2, (x, y, z) => jitter(0xd8d4ca, 0.03, hash3(x, y, z, 3)));
  M.box(0, 41, ZO, len, 47, ZO + 2, brick);
  M.box(0, 41, Z0, len, 44, Z0 + 2, brick);
  M.box(0, 46, ZO, len, 47, ZO + 2, (x, y, z) => goldAt(x, y, z, 4));
  for (let x = 0; x < len; x++)
    if (x % 8 < 5) {
      M.box(x, 47, ZO, x + 1, 51, ZO + 2, brick);
      if (x % 8 === 0 || x % 8 === 4) M.box(x, 51, ZO, x + 1, 52, ZO + 2, (xx, y, z) => goldAt(xx, y, z, 5));
    }
  M.box(0, 33, ZO, len, 34, ZO + 1, (x, y, z) => goldAt(x, y, z, 6));
  M.box(0, 10, ZO, len, 11, ZO + 1, (x, y, z) => goldAt(x, y, z, 7));
  for (let x0 = 8; x0 < len - 10; x0 += 18) {
    windowZ(M, x0, 14, ZO - 1, 5, 17, 2, (xx, yy) => glassAt(yy, 17));
    for (let y = 14; y < 31; y++) {
      const half = y > 26 ? 2.5 - (y - 26) * 0.55 : 2.5;
      if (half < 0) continue;
      M.set(x0 - 1, y, ZO, goldAt(x0, y, 1, 8));
      M.set(x0 + 5, y, ZO, goldAt(x0, y, 2, 8));
    }
    M.box(x0 + 2, 15, ZO - 1, x0 + 3, 28, ZO, 0xe6b94a);
  }
  for (let x0 = 26; x0 < len - 10; x0 += 36) {
    M.box(x0, 0, ZO, x0 + 8, 16, ZO + 5, (x, y, z) => (y > 14 ? goldAt(x, y, z, 9) : brick(x, y, z)));
    M.box(x0, 16, ZO, x0 + 8, 28, ZO + 4, brick);
    M.box(x0 + 1, 28, ZO, x0 + 7, 36, ZO + 3, brick);
    pinnacle(M, x0 + 4, 36, ZO + 1.5, 18, 3.4);
    for (let y = 16; y < 34; y += 3) M.box(x0 + 3, y, ZO + 4, x0 + 5, y + 1, ZO + 5, 0xe6b94a);
    const bx = x0 - 8;
    void bx;
  }
  for (let x0 = 8; x0 < len - 20; x0 += 36) {
    const bx = x0 + 9;
    M.box(bx, 42, ZO + 2, bx + 10, 44, ZO + 3, (x, y, z) => goldAt(x, y, z, 10));
    for (let y = 18; y < 42; y++) {
      const tatter = y < 24 ? Math.floor(hash3(y, bx, 1, 4) * 3) : 0;
      for (let x = bx + 1; x < bx + 9; x++) {
        if (y < 22 + ((x - bx) % 3 === 1 ? 2 : 0)) continue;
        M.set(x, y, ZO + 2, y === 22 || x === bx + 1 || x === bx + 8 ? 0xe6b94a : 0x3a6ec8);
        void tatter;
      }
    }
    crossRelief(M, bx + 4, 32, ZO + 3, 12, 0xf2f0ea, false);
  }
  return { parts: bundle([[M, KS, len / 2, 0, Z0 + 9]]), w: len * KS, d: 18 * KS, h: 52 * KS };
}

/* -------------------------------- towers --------------------------------- */

export function buildHolyTower(seed = 1) {
  const R = 19;
  const C = R + 7;
  const M = new VoxelModel(C * 2, 214, C * 2);
  const brick = masonry(MARBLE, MORTAR, seed, 7, 4);
  for (let y = 0; y < 12; y++) cyl(M, C, C, y, y + 1, R + 3 - (y / 12) * 3, (x, yy, z) => (y === 11 ? goldAt(x, yy, z) : brick(x, yy, z)));
  cyl(M, C, C, 12, 86, R, (x, y, z) => brick(x, y, z));
  for (const y of [28, 56, 80]) {
    ringV(M, C, C, y, y + 2, R - 0.2, R + 1.4, (x, yy, z) => goldAt(x, yy, z, 3));
  }
  const slit = (a, y, h) => {
    for (let d = 0; d < 4; d++) {
      const r = R + 1 - d;
      for (let w = 0; w < 4; w++) {
        const px = Math.round(C + Math.cos(a) * r - Math.sin(a) * (w - 1.5));
        const pz = Math.round(C + Math.sin(a) * r + Math.cos(a) * (w - 1.5));
        for (let yy = 0; yy < h; yy++) {
          const half = yy > h - 3 ? 1.5 - (yy - (h - 3)) * 0.6 : 1.8;
          if (Math.abs(w - 1.5) > half) continue;
          if (d < 3) M.clear(px, y + yy, pz);
          else M.set(px, y + yy, pz, glassAt(yy, h), 2);
        }
      }
    }
  };
  [[18, 0], [42, 0.4], [66, 0.8]].forEach(([y, off], row) => {
    for (let k = 0; k < 4; k++) slit((k / 4) * Math.PI * 2 + off + row * 0.3, y, 14);
  });
  ringV(M, C, C, 84, 90, R - 1, R + 4, (x, y, z) => (y < 86 ? goldAt(x, y, z, 4) : brick(x, y, z)));
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const px = Math.round(C + Math.cos(a) * (R + 3));
    const pz = Math.round(C + Math.sin(a) * (R + 3));
    M.set(px, 89, pz, goldAt(px, 89, pz, 5));
  }
  cyl(M, C, C, 90, 91, R + 1, (x, y, z) => jitter(0xd8d4ca, 0.03, hash3(x, y, z, 9)));
  ringV(M, C, C, 91, 95, R + 2, R + 4, (x, y, z) => brick(x, y, z));
  for (let k = 0; k < 28; k += 2) {
    const a = (k / 28) * Math.PI * 2;
    const px = Math.round(C + Math.cos(a) * (R + 3));
    const pz = Math.round(C + Math.sin(a) * (R + 3));
    M.box(px, 95, pz, px + 2, 99, pz + 2, brick);
    M.box(px, 99, pz, px + 2, 100, pz + 2, (x, y, z) => goldAt(x, y, z, 6));
  }
  const roofBase = 91;
  cone(M, C, C, roofBase, 78, R + 1.5, 0.8, (x, y, z, d, t) => {
    const ang = Math.atan2(z + 0.5 - C, x + 0.5 - C);
    const rib = Math.abs((((ang / (Math.PI * 2)) * 16) % 2 + 2) % 2 - 1) < 0.1;
    if (rib && t > 0.02) return goldAt(x, y, z, 7);
    const scale = ((y >> 1) + Math.floor((ang / (Math.PI * 2)) * 48)) & 1;
    return shade(roofAt(x, y, z, seed), scale ? 0.92 : 1);
  });
  ringV(M, C, C, roofBase, roofBase + 2, R + 0.5, R + 2, (x, y, z) => goldAt(x, y, z, 8));
  finial(M, C, roofBase + 76, C, 1.5);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.round(C + Math.cos(a) * (R + 2.4));
    const pz = Math.round(C + Math.sin(a) * (R + 2.4));
    M.box(px, 88, pz, px + 1, 104, pz + 1, goldAt(px, 90, pz, 11));
  }
  return { parts: bundle([[M, KS, C, 0, C]]), r: (R + 3) * KS, h: 205 * KS };
}

/* ------------------------------- gatehouse ------------------------------- */

export function buildHolyGate(seed = 3) {
  const SX = 108;
  const M = new VoxelModel(SX, 190, 56);
  const brick = masonry(MARBLE, MORTAR, seed, 8, 4);
  const cx = SX / 2;
  M.box(10, 0, 4, 98, 6, 50, (x, y, z) => (y === 5 ? goldAt(x, y, z) : brick(x, y, z)));
  M.box(12, 6, 6, 96, 82, 48, brick);
  for (const x0 of [4, 80]) {
    M.box(x0, 0, 24, x0 + 24, 8, 54, (x, y, z) => brick(x, y, z));
    M.box(x0 + 1, 8, 25, x0 + 23, 116, 53, brick);
    for (let y = 40; y < 112; y += 28) M.box(x0, y, 24, x0 + 24, y + 2, 54, (xx, yy, z) => goldAt(xx, yy, z, 7));
    M.box(x0 - 1, 116, 23, x0 + 25, 119, 55, (x, y, z) => (y === 116 ? goldAt(x, y, z, 3) : brick(x, y, z)));
    for (let x = x0 - 1; x < x0 + 25; x += 4) {
      M.box(x, 119, 23, x + 2, 123, 25, brick);
      M.box(x, 119, 53, x + 2, 123, 55, brick);
    }
    pyramid(M, x0 + 12, 39, 119, 46, 13, 15, (x, y, z) => roofAt(x, y, z, 2));
    finial(M, x0 + 12, 163, 39, 1.2);
    windowZ(M, x0 + 8, 62, 52, 8, 26, 2, (xx, yy) => glassAt(yy, 26));
    windowZ(M, x0 + 8, 96, 52, 8, 14, 2, (xx, yy) => glassAt(yy, 14));
    crossRelief(M, x0 + 12, 50, 53, 10, 0xe6b94a, false);
    for (const s of [0, 1]) for (let y = 8; y < 36; y += 4) M.set(x0 + 4 + s * 16, y, 53, goldAt(s, y, x0));
  }
  carveArch(M, cx, 0, 16, 28, 16, 0, 56);
  const topAt = (x) => {
    for (let y = 80; y > 0; y--) if (!M.has(x, y, 30) && M.has(x, y + 1, 30)) return y;
    return 0;
  };
  for (let x = cx - 15; x <= cx + 15; x += 4) {
    const yt = topAt(x);
    if (!yt) continue;
    for (let k = 0; k < 11; k++) M.box(x, yt - k, 31, x + 1, yt - k + 1, 33, (xx, y, z) => (k > 8 ? 0xfff0b0 : goldAt(xx, y, z, 12)));
  }
  for (let y = 24; y < 40; y += 6) for (let x = cx - 14; x <= cx + 14; x++) if (!M.has(x, y, 20)) M.set(x, y, 31, goldAt(x, y, 31, 4));
  for (let ring = 0; ring < 3; ring++) {
    for (let y = 0; y < 28 + 16 + 2; y++) {
      const half = y < 28 ? 16 : archHalf(16, y - 28, 16);
      if (half < 0) continue;
      const edge = Math.ceil(cx + half) + ring;
      const edge2 = Math.floor(cx - half) - 1 - ring;
      const color = ring === 1 ? goldAt(y, ring, 1, 13) : brick(edge, y, 50);
      M.set(edge, y, 49 + ring, color);
      M.set(edge2, y, 49 + ring, color);
    }
  }
  for (let x = cx - 19; x <= cx + 19; x++) {
    const yt = topAt(x);
    if (!yt) continue;
    M.set(x, yt + 2, 50, goldAt(x, yt, 1, 14));
    M.set(x, yt + 3, 50, goldAt(x, yt, 2, 14));
  }
  const R0 = 11;
  const rcx = cx;
  const rcy = 70;
  for (let y = -R0 - 2; y <= R0 + 2; y++)
    for (let x = -R0 - 2; x <= R0 + 2; x++) {
      const d = Math.hypot(x, y);
      if (d <= R0 + 2 && d > R0) M.set(rcx + x, rcy + y, 49, goldAt(x, y, 3, 15));
      else if (d <= R0) {
        const ang = Math.atan2(y, x);
        const spoke = Math.abs((((ang / (Math.PI * 2)) * 12) % 1 + 1) % 1 - 0.5) < 0.07 || d < 2.4;
        const hub = d < 3;
        const col = hub ? 0xfff0b0 : spoke ? 0xe6b94a : GLASS[Math.floor((d / R0) * 3.4) % 4];
        M.set(rcx + x, rcy + y, 49, col, !spoke);
        M.set(rcx + x, rcy + y, 50, col, !spoke);
      }
    }
  crossRelief(M, cx, 70, 51, 16, 0xfff0b0, true);
  for (let x = 12; x < 96; x++) {
    M.box(x, 82, 44, x + 1, 83, 50, (xx, y, z) => jitter(0xd8d4ca, 0.03, hash3(xx, y, z, 2)));
    M.box(x, 82, 49, x + 1, 83, 51, (xx, y, z) => goldAt(xx, y, z, 16));
    if (x % 6 < 4) M.box(x, 83, 46, x + 1, 90, 50, brick);
    if (x % 6 === 1) M.box(x, 90, 47, x + 1, 91, 50, (xx, y, z) => goldAt(xx, y, z, 17));
  }
  finial(M, cx - 20, 91, 48, 1);
  finial(M, cx + 20, 91, 48, 1);
  for (const s of [-1, 1]) {
    for (let y = 84; y < 100; y++) M.box(cx + s * 6, y, 42, cx + s * 6 + 1, y + 1, 43, goldAt(s, y, 5, 18));
  }
  return { parts: bundle([[M, KS, cx, 0, 30]]), w: 88 * KS, d: 50 * KS, passage: 32 * KS, h: 120 * KS };
}

/* ---------------------------------- keep --------------------------------- */

export function buildHolyKeep(seed = 5) {
  const SX = 132;
  const SY = 240;
  const SZ = 116;
  const M = new VoxelModel(SX, SY, SZ);
  const brick = masonry(MARBLE, MORTAR, seed, 8, 4);
  const cx = SX / 2;
  const X0 = 22;
  const X1 = SX - 22;
  const FZ = 104;
  const WH = 70;
  M.box(X0 - 4, 0, 8, X1 + 4, 6, FZ + 2, (x, y, z) => (y === 5 ? goldAt(x, y, z) : brick(x, y, z)));
  M.box(X0 - 2, 6, 10, X1 + 2, WH, FZ, brick);
  M.box(X0 - 3, WH - 2, 9, X1 + 3, WH, FZ + 1, (x, y, z) => goldAt(x, y, z, 21));
  M.box(X0 - 3, 40, 9, X1 + 3, 41, FZ + 1, (x, y, z) => goldAt(x, y, z, 22));
  const ridgeH = 46;
  for (let k = 0; k < ridgeH; k++) {
    const half = (X1 - X0) / 2 + 3 - k * ((X1 - X0) / 2 / ridgeH) * 1.0;
    if (half < 1.2) break;
    M.box(Math.round(cx - half), WH + k, 10, Math.round(cx + half), WH + k + 1, FZ, (x, y, z) => shade(roofAt(x, y, z, seed), ((y >> 1) + (z >> 1)) & 1 ? 0.93 : 1));
  }
  for (let z = 10; z < FZ; z++) M.set(Math.round(cx), WH + ridgeH - 1, z, goldAt(z, 1, 1, 24));
  for (let k = 0; k < 6; k++) M.box(X0 - 2 + k * 2, WH - 4 - k, FZ, X1 + 2 - k * 2, WH - 3 - k + 4, FZ + 1, brick);
  const gableTop = WH + ridgeH;
  for (let y = WH; y < gableTop; y++) {
    const half = (X1 - X0) / 2 + 1 - (y - WH) * (((X1 - X0) / 2) / ridgeH);
    if (half < 1) break;
    M.box(Math.round(cx - half), y, FZ, Math.round(cx + half), y + 1, FZ + 2, (x, yy, z) => (x < cx - half + 1.5 || x > cx + half - 1.5 ? goldAt(x, yy, z, 25) : brick(x, yy, z)));
  }
  const R0 = 12;
  const rcy = WH + 18;
  for (let y = -R0 - 2; y <= R0 + 2; y++)
    for (let x = -R0 - 2; x <= R0 + 2; x++) {
      const d = Math.hypot(x, y);
      if (d <= R0 + 2 && d > R0) M.set(cx + x, rcy + y, FZ + 1, goldAt(x, y, 4, 26));
      else if (d <= R0) {
        const ang = Math.atan2(y, x);
        const spoke = Math.abs((((ang / (Math.PI * 2)) * 16) % 1 + 1) % 1 - 0.5) < 0.06 || d < 2.5;
        const col = d < 3 ? 0xfff0b0 : spoke ? 0xe6b94a : GLASS[Math.floor((d / R0) * 3.4) % 4];
        M.set(cx + x, rcy + y, FZ + 1, col, !spoke);
        M.set(cx + x, rcy + y, FZ + 2, col, !spoke);
      }
    }
  carveArch(M, cx, 0, 14, 28, 22, FZ - 10, FZ + 4);
  for (let y = 0; y < 28 + 22; y++) {
    const half = y < 28 ? 14 : archHalf(14, y - 28, 22);
    if (half < 0) continue;
    for (let x = Math.ceil(cx - half); x < Math.floor(cx + half); x++) M.set(x, y, FZ - 10, hash3(x, y, 2, 3) > 0.45 ? 0xfff0c8 : 0xbfe4ff, true);
  }
  for (let ring = 0; ring < 4; ring++)
    for (let y = 0; y < 28 + 22 + 2; y++) {
      const half = y < 28 ? 14 : archHalf(14, y - 28, 22);
      if (half < 0) continue;
      const col = ring % 2 === 0 ? goldAt(y, ring, 1, 27) : brick(ring, y, 3);
      M.set(Math.ceil(cx + half) + ring, y, FZ - ring * 0 + 1, col);
      M.set(Math.floor(cx - half) - 1 - ring, y, FZ - ring * 0 + 1, col);
    }
  for (let k = 0; k < 5; k++) {
    M.box(cx - 24 - (5 - k), k * 3, FZ + 2, cx + 24 + (5 - k), k * 3 + 3, FZ + 12 - k * 2, (x, y, z) => jitter(0xdcd8cf, 0.03, hash3(x, y, z, 51)));
    M.box(cx - 24 - (5 - k), k * 3 + 2, FZ + 11 - k * 2, cx + 24 + (5 - k), k * 3 + 3, FZ + 12 - k * 2, (x, y, z) => goldAt(x, y, z, 28));
  }
  for (const sx of [X0 - 14, X1 + 14]) {
    M.box(sx - 14, 0, 14, sx + 14, 8, 50, (x, y, z) => (y > 6 ? goldAt(x, y, z, 29) : brick(x, y, z)));
    M.box(sx - 13, 8, 15, sx + 13, 128, 49, brick);
    for (let y = 40; y < 124; y += 28) M.box(sx - 14, y, 14, sx + 14, y + 2, 50, (x, yy, z) => goldAt(x, yy, z, 30));
    M.box(sx - 15, 128, 13, sx + 15, 132, 51, (x, y, z) => (y === 128 ? goldAt(x, y, z, 31) : brick(x, y, z)));
    pyramid(M, sx, 32, 132, 52, 14, 17, (x, y, z) => roofAt(x, y, z, 5));
    finial(M, Math.round(sx), 184, 32, 1.6);
    for (const wx of [sx - 4, sx + 1]) {
      windowZ(M, wx, 70, 49, 4, 28, 2, (xx, yy) => glassAt(yy, 28));
      windowZ(M, wx, 106, 49, 4, 16, 2, (xx, yy) => glassAt(yy, 16));
    }
    crossRelief(M, Math.round(sx), 60, 50, 12, 0xe6b94a, false);
  }
  const lantern = (cz, wh, hw) => {
    M.box(cx - hw, WH + 18, cz - hw, cx + hw, WH + wh, cz + hw, (x, y, z) => (y % 24 < 2 ? goldAt(x, y, z, 32) : brick(x, y, z)));
  };
  const tcz = 56;
  lantern(tcz, 100, 22);
  M.box(cx - 24, WH + 100, tcz - 24, cx + 24, WH + 104, tcz + 24, (x, y, z) => (y === WH + 100 ? goldAt(x, y, z, 33) : brick(x, y, z)));
  cone(M, cx, tcz, WH + 104, 66, 25, 1.2, (x, y, z, d, t) => {
    const ang = Math.atan2(z + 0.5 - tcz, x + 0.5 - cx);
    const rib = Math.abs((((ang / (Math.PI * 2)) * 16) % 2 + 2) % 2 - 1) < 0.1;
    if (rib && t > 0.02) return goldAt(x, y, z, 34);
    return shade(roofAt(x, y, z, 9), ((y >> 1) + Math.floor((ang / (Math.PI * 2)) * 48)) & 1 ? 0.92 : 1);
  });
  finial(M, cx, WH + 168, tcz, 2.2);
  for (let i = 0; i < 4; i++) windowZ(M, cx - 17 + i * 9, WH + 38, tcz + 22, 5, 36, 2, (xx, yy) => glassAt(yy, 36));
  for (let i = 0; i < 6; i++) windowZ(M, X0 + 6 + i * 13, 22, FZ - 1, 5, 30, 2, (xx, yy) => glassAt(yy, 30));
  for (let i = 0; i < 6; i++) {
    const wx = X0 + 6 + i * 13;
    for (let y = 22; y < 52; y++) {
      M.set(wx - 1, y, FZ, goldAt(wx, y, 1, 35));
      M.set(wx + 5, y, FZ, goldAt(wx, y, 2, 35));
    }
  }
  for (let z = 20; z < FZ - 20; z += 24) {
    for (const [x, s] of [[X0 - 3, -1], [X1 + 2, 1]]) {
      for (let k = 0; k < 14; k++) {
        const t = k / 13;
        const px = x + s * Math.round(t * 9);
        const py = 56 + Math.round(Math.sin(t * Math.PI * 0.5) * 12 - t * 52);
        if (py < 0) continue;
        M.box(px, py, z, px + 1, py + 3, z + 3, (xx, y, zz) => (k % 3 === 0 ? goldAt(xx, y, zz, 36) : brick(xx, y, zz)));
      }
      pinnacle(M, x + s * 9, 0, z + 1.5, 24, 3);
    }
  }
  for (let z = 14; z < FZ - 14; z += 20) {
    const wz = z;
    for (const side of [X0 - 2, X1 + 1]) {
      const wy = 26;
      for (let y = wy; y < wy + 24; y++) {
        const half = y > wy + 16 ? 2.4 - (y - wy - 16) * 0.55 : 2.4;
        if (half < 0) continue;
        for (let dz = 0; dz < 5; dz++) if (Math.abs(dz - 2) <= half) M.set(side, y, wz + dz, glassAt(y - wy, 24), 2);
      }
    }
  }
  return { parts: bundle([[M, KS, cx, 0, 58]]), w: (X1 - X0 + 4 + 56) * KS, d: (FZ - 10) * KS, bodyW: (X1 - X0 + 6) * KS, h: 205 * KS, front: 58 };
}

export function buildHolyFountain(seed = 7) {
  const M = new VoxelModel(60, 60, 60);
  const brick = masonry(MARBLE, MORTAR, seed, 6, 4);
  ringV(M, 30, 30, 0, 9, 22, 26, (x, y, z) => (y === 8 ? goldAt(x, y, z, 3) : brick(x, y, z)));
  cyl(M, 30, 30, 0, 5, 22, (x, y, z) => brick(x, y, z));
  cyl(M, 30, 30, 5, 7, 22, (x, y, z) => GLASS[Math.floor(hash3(x, y, z, 2) * 3)], true);
  cyl(M, 30, 30, 0, 22, 5, (x, y, z) => brick(x, y, z));
  ringV(M, 30, 30, 22, 26, 6, 11, (x, y, z) => (y === 25 ? goldAt(x, y, z, 4) : brick(x, y, z)));
  cyl(M, 30, 30, 24, 26, 10, (x, y, z) => GLASS[Math.floor(hash3(x, y, z, 3) * 3)], true);
  cyl(M, 30, 30, 26, 40, 2.2, (x, y, z) => brick(x, y, z));
  for (let y = 40; y < 54; y++) {
    const r = Math.max(0.8, 4.4 - (y - 40) * 0.3);
    cyl(M, 30, 30, y, y + 1, r, (x, yy, z) => (hash3(x, yy, z, 3) > 0.3 ? GLASS[2] : 0xffffff), true);
  }
  M.box(29, 54, 29, 31, 58, 31, 0xe6b94a);
  M.box(27, 56, 29, 33, 57, 31, 0xe6b94a);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    pinnacle(M, Math.round(30 + Math.cos(a) * 24), 9, Math.round(30 + Math.sin(a) * 24), 12, 2.4);
  }
  return { parts: bundle([[M, KS, 30, 0, 30]]), r: 26 * KS };
}

export function buildHolyStatue(seed = 9) {
  const M = new VoxelModel(34, 84, 34);
  const brick = masonry(MARBLE, MORTAR, seed, 5, 4);
  const c = 17;
  M.box(5, 0, 5, 29, 8, 29, (x, y, z) => (y === 7 ? goldAt(x, y, z, 1) : brick(x, y, z)));
  M.box(8, 8, 8, 26, 22, 26, (x, y, z) => brick(x, y, z));
  M.box(7, 22, 7, 27, 24, 27, (x, y, z) => goldAt(x, y, z, 2));
  const stone = (x, y, z) => MARBLE[Math.floor(hash3(x, y, z, 3) * 5)];
  M.box(c - 5, 24, c - 3, c - 1, 40, c + 2, stone);
  M.box(c + 1, 24, c - 3, c + 5, 40, c + 2, stone);
  cyl(M, c, c, 40, 58, 6, stone);
  cyl(M, c, c, 58, 62, 3, stone);
  cyl(M, c, c, 62, 72, 4, stone);
  M.box(c - 5, 66, c + 4, c + 5, 68, c + 6, (x, y, z) => goldAt(x, y, z, 4));
  M.line(c - 8, 52, c, c - 9, 44, c + 3, stone, 3);
  M.line(c + 8, 52, c, c + 9, 44, c + 3, stone, 3);
  M.line(c, 24, c + 7, c, 80, c + 7, (x, y, z) => (y % 6 < 2 ? goldAt(x, y, z, 5) : 0xcfd2da), 2);
  M.box(c - 3, 46, c + 6, c + 4, 47, c + 8, (x, y, z) => goldAt(x, y, z, 6));
  M.set(c, 58, c + 7, 0xbfe4ff, true);
  M.set(c - 2, 68, c + 3, 0x6fb2ff, true);
  M.set(c + 1, 68, c + 3, 0x6fb2ff, true);
  return { parts: bundle([[M, KS, c, 0, c]]), r: 6 * KS };
}
