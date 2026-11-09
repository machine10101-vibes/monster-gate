import * as THREE from 'three';
import { VoxelModel, RNG, hash3, jitter, shade, clamp } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { meshFrom, splitLimb, relief } from './humanoid.js';
import { YETI } from '../data/yeti.js';

/**
 * Ravenous Snow Yeti, built like the hero and the orc: a barrel torso, a head with a
 * hinged jaw, and arms and legs that split at the elbow and knee. Shapes are sculpted
 * from ellipsoids, then covered in shaggy fur clumps with ice-crystal tips, then the
 * leather strap, tattered loincloth, fangs and claws are painted on top.
 */
export const YETI_S = 0.04;
const S = YETI_S;
const TAU = Math.PI * 2;

const FURS = [YETI.furLo, YETI.fur, YETI.fur, YETI.furHi, YETI.furHi, YETI.furWhite];
const CRYSTAL = [YETI.ice, YETI.iceDeep, YETI.iceHi];

const fur = (x, y, z, tip = 0) => {
  if (hash3(x >> 1, y >> 1, z >> 1, 5) < 0.12) return jitter(CRYSTAL[Math.floor(hash3(x, y, z, 6) * 3)], 0.04, hash3(x, y, z, 7));
  const i = clamp(Math.floor(hash3(x, y, z, 21) * 4) + Math.min(2, tip), 0, FURS.length - 1);
  return jitter(FURS[i], 0.04, hash3(x, y, z, 22));
};
const skin = (x, y, z, k = 0) => jitter(hash3(x >> 1, y >> 1, z >> 1, 31 + k) < 0.5 ? YETI.skin : shade(YETI.skin, 0.88), 0.03, hash3(x, y, z, 32));
const leather = (x, y, z, k = 0) => jitter(k ? YETI.leatherHi : hash3(x >> 1, y, z >> 1, 41) < 0.5 ? YETI.leather : shade(YETI.leather, 0.84), 0.05, hash3(x, y, z, 42));
const hide = (x, y, z) => jitter(hash3(x >> 1, y >> 1, z, 51) < 0.5 ? YETI.hide : shade(YETI.hide, 0.82), 0.05, hash3(x, y, z, 52));
const iceCol = (x, y, z, t = 0) => jitter(t > 0.7 ? YETI.iceHi : t > 0.3 ? YETI.ice : YETI.iceDeep, 0.03, hash3(x, y, z, 61));

const furBlob = (M, cx, cy, cz, rx, ry, rz, tone = 1) =>
  M.ellipsoid(cx, cy, cz, rx, ry, rz, (x, y, z) => shade(fur(x, y, z), tone * (1 + ((y - cy) / ry) * 0.05)));

function frontZ(M, x, y) {
  for (let z = M.sz - 1; z >= 0; z--) if (M.has(x, y, z)) return z;
  return -1;
}
function backZ(M, x, y) {
  for (let z = 0; z < M.sz; z++) if (M.has(x, y, z)) return z;
  return -1;
}
const colorAt = (M, x, y, z) => M.get(x, y, z) & 0xffffff;

/** Shaggy fur: a noisy ellipsoid plus tufts that stick out along the surface normal. */
function furClump(M, cx, cy, cz, rx, ry, rz, seed, spike = 3, up = 0, density = 4.5) {
  const rng = new RNG(seed);
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        if (dx * dx + dy * dy + dz * dz <= 1 + (hash3(x, y, z, seed) - 0.5) * 0.5) M.set(x, y, z, fur(x, y, z));
      }
  const count = Math.round((rx + ry + rz) * density);
  for (let i = 0; i < count; i++) {
    const u = rng.range(-1, 1);
    const a = rng.range(0, TAU);
    const s = Math.sqrt(1 - u * u);
    let ux = s * Math.cos(a);
    let uy = u + up;
    let uz = s * Math.sin(a);
    const len = Math.hypot(ux, uy, uz) || 1;
    ux /= len;
    uy /= len;
    uz /= len;
    const px = cx + s * Math.cos(a) * rx;
    const py = cy + u * ry;
    const pz = cz + s * Math.sin(a) * rz;
    const L = rng.int(1, spike);
    for (let k = 0; k <= L; k++) {
      const x = Math.round(px + ux * k);
      const y = Math.round(py + uy * k);
      const z = Math.round(pz + uz * k);
      M.set(x, y, z, fur(x, y, z, k));
    }
  }
}

/** A tapering ice crystal spike. */
function iceSpike(M, x0, y0, z0, dx, dy, dz, len, r0) {
  const n = Math.hypot(dx, dy, dz) || 1;
  for (let k = 0; k <= len; k++) {
    const t = k / len;
    const r = Math.max(0.55, r0 * (1 - t));
    const cx = x0 + (dx / n) * k;
    const cy = y0 + (dy / n) * k;
    const cz = z0 + (dz / n) * k;
    const R = Math.ceil(r);
    for (let a = -R; a <= R; a++)
      for (let b = -R; b <= R; b++)
        for (let c = -R; c <= R; c++) {
          if (Math.hypot(a, b, c) > r) continue;
          const x = Math.round(cx + a);
          const y = Math.round(cy + b);
          const z = Math.round(cz + c);
          M.set(x, y, z, iceCol(x, y, z, t));
        }
  }
}

function band(M, y0, y1, color, pred = null) {
  const add = [];
  for (let y = y0; y < y1; y++) {
    for (let z = 0; z < M.sz; z++) {
      let lo = -1;
      let hi = -1;
      for (let x = 0; x < M.sx; x++) {
        if (M.has(x, y, z)) {
          if (lo < 0) lo = x;
          hi = x;
        }
      }
      if (lo >= 0) add.push([lo - 1, y, z], [hi + 1, y, z]);
    }
    for (let x = 0; x < M.sx; x++) {
      let lo = -1;
      let hi = -1;
      for (let z = 0; z < M.sz; z++) {
        if (M.has(x, y, z)) {
          if (lo < 0) lo = z;
          hi = z;
        }
      }
      if (lo >= 0) add.push([x, y, lo - 1], [x, y, hi + 1]);
    }
  }
  for (const [x, y, z] of add) if (!pred || pred(x, y, z)) M.set(x, y, z, typeof color === 'function' ? color(x, y, z) : color);
}

function segDist(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = clamp(((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x + 0.5 - (x0 + t * dx), y + 0.5 - (y0 + t * dy));
}

/* ------------------------------- torso ------------------------------- */
const OY = 8;
function paintTorso() {
  const T = new VoxelModel(68, 64, 44);
  const CX = 34;
  const CZ = 22;
  const ty = (y) => y + OY;
  furBlob(T, CX, ty(1), CZ, 12.5, 7, 9.5, 0.92);
  furBlob(T, CX, ty(10), CZ + 0.6, 15.5, 8.5, 11.5, 0.97);
  furBlob(T, CX, ty(21), CZ + 1, 19.5, 10.5, 13.5, 1.02);
  for (const s of [-1, 1]) furBlob(T, CX + s * 9, ty(23.5), CZ + 6.5, 9, 6.2, 6, 1.08);
  furBlob(T, CX, ty(31), CZ - 1.2, 22, 6.2, 11, 0.98);
  furBlob(T, CX, ty(36), CZ + 1, 6.5, 3.6, 6, 1);

  const before = T.data.slice();

  const A = [CX - 15, ty(33), CX + 12, ty(3)];
  const B = [CX + 15, ty(33), CX - 12, ty(3)];
  for (let y = ty(1); y < ty(34); y++) {
    for (let x = 0; x < T.sx; x++) {
      const onA = segDist(x, y, A[0], A[1], A[2], A[3]) < 2.2;
      const onB = segDist(x, y, B[0], B[1], B[2], B[3]) < 2.2;
      if (!onA && !onB) continue;
      const fz = frontZ(T, x, y);
      if (fz >= 0) {
        T.set(x, y, fz + 1, leather(x, y, fz + 1, (x + y) % 5 === 0 ? 1 : 0));
        T.set(x, y, fz + 2, shade(leather(x, y, fz + 2), 0.9));
      }
      const bz = backZ(T, x, y);
      if (bz >= 0) T.set(x, y, bz - 1, leather(x, y, bz - 1));
    }
  }
  for (let y = ty(1); y < ty(34); y += 3) {
    for (const [seg, off] of [[A, 0], [B, 0]]) {
      const t = (y - seg[1]) / (seg[3] - seg[1]);
      const x = Math.round(seg[0] + (seg[2] - seg[0]) * t);
      const fz = frontZ(T, x, y);
      if (fz >= 0) T.set(x + off, y, fz, 0x1d150f);
    }
  }
  const bz = frontZ(T, CX, ty(14)) + 1;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > 3) continue;
      T.set(CX + dx, ty(14) + dy, bz, Math.abs(dx) + Math.abs(dy) >= 3 ? YETI.trim : YETI.leatherLo);
    }
  relief(T, before);

  for (const s of [-1, 1]) {
    furClump(T, CX + s * 18, ty(33), CZ - 1, 8, 4.5, 8.5, 211 + s, 6, 0.9, 5);
    furClump(T, CX + s * 12, ty(35.4), CZ - 2, 6, 3, 6.5, 221 + s, 5, 1, 5);
    for (let k = 0; k < 4; k++) {
      iceSpike(T, CX + s * (13 + k * 3.4), ty(36 + (k % 2) * 1.5), CZ - 2 + k * 1.2, s * 0.55, 1, -0.25 + k * 0.1, 8 + (k % 3) * 2.5, 2.5);
    }
  }
  furClump(T, CX, ty(36.4), CZ - 5.5, 11, 3.4, 4.6, 231, 5, 1, 5);
  for (let k = 0; k < 7; k++) {
    const x = CX - 12 + k * 4;
    iceSpike(T, x, ty(37.5), CZ - 6 + (k % 2), (k - 3) * 0.12, 1, -0.5, 9 + ((k * 7) % 4) * 1.8, 2.6);
  }
  furClump(T, CX, ty(34.6), CZ + 5, 9, 2.4, 3.6, 232, 4, 0.8, 5);
  furClump(T, CX, ty(15), CZ - 9.5, 14, 11, 4, 233, 4, 0.2, 4);
  furClump(T, CX, ty(5), CZ + 8, 11, 5, 3, 234, 3, 0, 4);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    iceSpike(T, CX + Math.cos(a) * 16, ty(20 + (i % 3) * 3), CZ + 5 + Math.sin(a) * 6, Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9, 4 + (i % 3), 1.6);
  }
  return T;
}

/* ------------------------------- skirt ------------------------------- */
function paintSkirt() {
  const K = new VoxelModel(50, 30, 40);
  const CX = 25;
  const CZ = 20;
  const top = 28;
  for (let y = 18; y <= top; y++) {
    const r = 1 + (y > 25 ? 0.2 * (y - 25) : 0);
    const rx = 16 * r;
    const rz = 12 * r;
    for (let z = 0; z < K.sz; z++)
      for (let x = 0; x < K.sx; x++) {
        const ox = x + 0.5 - CX;
        const oz = z + 0.5 - CZ;
        const out = (ox / rx) ** 2 + (oz / rz) ** 2;
        const inn = (ox / (rx - 3.4)) ** 2 + (oz / (rz - 3.4)) ** 2;
        if (out > 1 || inn < 1) continue;
        if (y < 21 && hash3(x, y, z, 71) < 0.3) continue;
        K.set(x, y, z, fur(x, y, z, y < 21 ? 1 : 0));
      }
  }
  const rng = new RNG(91);
  for (let i = 0; i < 70; i++) {
    const a = rng.range(0, TAU);
    const y = rng.int(19, 27);
    const x = Math.round(CX + Math.cos(a) * 16.5);
    const z = Math.round(CZ + Math.sin(a) * 12.5);
    const L = rng.int(2, 5);
    for (let k = 0; k <= L; k++) K.set(Math.round(x + Math.cos(a) * k * 0.8), Math.round(y - k * 0.5), Math.round(z + Math.sin(a) * k * 0.8), fur(x, y, z, k));
  }
  for (let y = 4; y < 20; y++) {
    const half = 1.6 + (y - 4) * 0.52;
    for (let x = 0; x < K.sx; x++) {
      const dx = Math.abs(x + 0.5 - CX);
      if (dx > half) continue;
      const edge = dx > half - 1.5;
      if (y < 9 && edge && hash3(x, y, 1, 72) < 0.35) continue;
      if (y < 6 && hash3(x, y, 2, 73) < 0.25) continue;
      const z = CZ + 12;
      K.set(x, y, z, edge ? shade(hide(x, y, z), 0.7) : hide(x, y, z));
      K.set(x, y, z + 1, edge ? shade(leather(x, y, z + 1), 0.7) : hide(x, y, z + 1));
      if (!edge && (x + y) % 6 === 0) K.set(x, y, z + 2, shade(hide(x, y, z + 2), 0.78));
    }
  }
  for (let k = 0; k < 14; k++) {
    const y = 18 - k;
    for (const x of [CX - 1 - Math.round(k * 0.45), CX + Math.round(k * 0.45)]) K.set(x, y, CZ + 14, shade(leather(x, y, 14), 0.72));
  }
  for (const [ox, y0, len] of [[-9, 13, 9], [-6, 9, 7], [-3, 6, 6], [4, 6, 6], [7, 9, 8], [10, 13, 9]]) {
    iceSpike(K, CX + ox, y0, CZ + 14, ox * 0.04, -1, 0.15, len, 1.5);
  }
  return K;
}

/* -------------------------------- head -------------------------------- */
const HCX = 22;
function paintHead() {
  const H = new VoxelModel(44, 44, 44);
  const CX = HCX;
  furBlob(H, CX, 20, 17, 12.4, 11, 11.6, 1);
  furBlob(H, CX, 14, 21, 10, 7, 9, 0.96);
  furBlob(H, CX, 24.4, 24, 10, 3.2, 4.2, 0.9);

  const before = H.data.slice();
  for (let z = 23; z < 34; z++)
    for (let y = 8; y < 26; y++)
      for (let x = CX - 10; x <= CX + 9; x++) {
        if (!H.has(x, y, z)) continue;
        const ax = x + 0.5 - CX;
        const muzzle = (ax / 7.6) ** 2 + ((y + 0.5 - 13.4) / 5.8) ** 2 <= 1;
        const socket = [-1, 1].some((s) => ((ax - s * 4.7) / 3.5) ** 2 + ((y + 0.5 - 20.3) / 2.7) ** 2 <= 1);
        const bridge = Math.abs(ax) < 1.7 && y > 13 && y < 21;
        if (muzzle || socket || bridge) H.set(x, y, z, skin(x, y, z, y > 18 ? 1 : 0));
      }
  H.ellipsoid(CX, 13.2, 27.5, 6.2, 3.8, 5.0, (x, y, z) => shade(skin(x, y, z, 2), 1.1));
  for (const s of [-1, 1]) {
    H.ellipsoid(CX + s * 4.7, 20.4, 26.9, 2.5, 1.7, 2.1, (x, y, z) => shade(skin(x, y, z, 4), 0.55));
    for (let k = 0; k < 6; k++) {
      const bx = CX + s * (2 + k * 1.5);
      const by = 22.7 + k * 0.62;
      H.ellipsoid(bx, by, 27.4, 2, 1.5, 2.6, (x, y, z) => shade(fur(x, y, z, 1), 0.82));
    }
  }
  H.ellipsoid(CX, 10.2, 24.6, 6.4, 1.1, 4.6, YETI.mouth);
  for (const s of [-1, 1]) {
    const eyeX = CX + s * 4.6 - (s < 0 ? 2 : 0) - (s < 0 ? 0 : 1);
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 3; dx++) {
        const x = eyeX + dx;
        const y = 20 + dy;
        const fz = frontZ(H, x, y);
        if (fz < 0) continue;
        const inner = s < 0 ? dx === 2 : dx === 0;
        const lid = dy === 1 && (s < 0 ? dx === 0 : dx === 2);
        if (lid) continue;
        H.set(x, y, fz, dy === 1 && inner ? YETI.eyeHi : YETI.eye, true);
        H.set(x, y, fz - 1, YETI.eye, true);
      }
  }
  relief(H, before);

  for (const s of [-1, 1]) {
    furClump(H, CX + s * 11.4, 16, 15, 4.6, 6.4, 6.4, 301 + s, 5, -0.2, 5);
    furClump(H, CX + s * 9, 23, 15, 5, 3.4, 6, 311 + s, 6, 1, 5);
    iceSpike(H, CX + s * 9, 28, 14, s * 0.6, 1, -0.2, 9, 2.4);
    iceSpike(H, CX + s * 5, 31, 12, s * 0.2, 1, -0.4, 10, 2.2);
    iceSpike(H, CX + s * 12.5, 25, 12, s * 1, 0.6, -0.2, 7, 1.9);
  }
  furClump(H, CX, 27.6, 14, 8.8, 3.4, 8.6, 321, 6, 1, 5);
  furClump(H, CX, 21, 6.5, 9.5, 8, 4.4, 322, 5, 0.1, 5);
  for (let k = 0; k < 5; k++) iceSpike(H, CX - 4 + k * 2, 30, 12 - (k % 2) * 3, 0, 1, -0.6, 8 + (k % 3) * 2, 2.1);

  const upFang = (cx, len, r) => {
    for (let k = 0; k < len; k++) {
      const rr = Math.max(0.55, r * (1 - k / len));
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (Math.hypot(dx, dz) > rr) continue;
          const x = cx + dx;
          const z = 28 + dz + Math.round(k * 0.12);
          const y = 11 - k;
          H.set(x, y, z, jitter(k > len - 2 ? YETI.fang : YETI.fangLo, 0.02, hash3(x, y, z, 81)));
        }
    }
  };
  upFang(CX - 5, 7, 1.6);
  upFang(CX + 4, 7, 1.6);
  for (const x of [CX - 3, CX - 1, CX + 1, CX + 2]) upFang(x, 3, 0.9);
  return H;
}

function paintJaw() {
  const J = new VoxelModel(34, 22, 34);
  const CX = 17;
  J.ellipsoid(CX, 5, 15.5, 8.2, 3.2, 10, (x, y, z) => shade(skin(x, y, z, 6), 0.8));
  J.ellipsoid(CX, 7.2, 14.5, 5.6, 1.5, 6.4, 0x1e2a4a);
  J.ellipsoid(CX, 4, 22, 5.2, 2.5, 4, (x, y, z) => shade(skin(x, y, z, 7), 0.9));
  furClump(J, CX, 1.5, 19, 6, 2.6, 5, 331, 5, -0.5, 5);
  const loFang = (cx, len, r, zz) => {
    for (let k = 0; k < len; k++) {
      const rr = Math.max(0.55, r * (1 - k / len));
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (Math.hypot(dx, dz) > rr) continue;
          const x = cx + dx;
          const z = zz + dz;
          const y = 6 + k;
          J.set(x, y, z, jitter(k > len - 2 ? YETI.fang : YETI.fangLo, 0.02, hash3(x, y, z, 82)));
        }
    }
  };
  loFang(CX - 5, 6, 1.5, 22);
  loFang(CX + 4, 6, 1.5, 22);
  for (const x of [CX - 3, CX - 1, CX + 1, CX + 2]) loFang(x, 3, 0.9, 24);
  for (const s of [-1, 1]) for (let z = 10; z < 21; z += 3) loFang(CX + s * 6, 2, 0.8, z);
  return J;
}

/* -------------------------------- arms -------------------------------- */
const ARM_PIVOT = 54;
const ARM_ELBOW = 30;
function paintArm(seed) {
  const A = new VoxelModel(34, 62, 36);
  const CX = 17;
  const CZ = 15;
  furBlob(A, CX, 49, CZ, 9.5, 8, 9.2, 1.06);
  furBlob(A, CX, 40, CZ, 8.6, 9.5, 8.4, 1);
  furBlob(A, CX, 41, CZ + 3.4, 5.4, 5, 4, 1.08);
  furBlob(A, CX, 31, CZ, 7.6, 4.4, 7.4, 0.96);
  furBlob(A, CX, 21, CZ + 0.5, 9.2, 10, 8.8, 1);
  furBlob(A, CX, 10.5, CZ + 0.5, 7, 3.4, 6.8, 0.94);
  furBlob(A, CX, 6, CZ + 1.4, 9.6, 5.6, 8.2, 1.04);
  const before = A.data.slice();
  furClump(A, CX, 42, CZ, 9.4, 4.6, 9.2, seed, 4, 0.1, 5);
  furClump(A, CX, 22, CZ, 10.2, 5.4, 9.8, seed + 4, 4, -0.2, 5);
  furClump(A, CX, 52, CZ, 9.4, 4, 9, seed + 9, 5, 0.9, 5);
  for (let k = 0; k < 3; k++) iceSpike(A, CX - 4 + k * 4, 56, CZ - 1 + (k % 2) * 2, (k - 1) * 0.3, 1, -0.2, 6 + k, 2.1);
  for (let k = 0; k < 3; k++) iceSpike(A, CX + (k - 1) * 4, 31, CZ - 7.5, (k - 1) * 0.3, 0.1, -1, 6 + k, 1.9);
  iceSpike(A, CX, 31, CZ - 7, 0, 0.1, -1, 9, 2.1);
  for (let i = 0; i < 4; i++) {
    const fx = CX - 5.4 + i * 3.6;
    furBlob(A, fx, 2.4, CZ + 6.6, 2, 2.4, 3, 1.05);
    const dirx = (i - 1.5) * 0.12;
    for (let k = 0; k < 10; k++) {
      const t = k / 9;
      const r = Math.max(0.55, 2 * (1 - t));
      const px = fx + dirx * k;
      const py = 2.4 - Math.sin(t * 1.4) * 2.6 - t * 0.6;
      const pz = CZ + 8 + t * 6.6 + Math.sin(t * 1.5) * 1.2;
      const R = Math.ceil(r);
      for (let a = -R; a <= R; a++)
        for (let b = -R; b <= R; b++)
          for (let c = -R; c <= R; c++) {
            if (Math.hypot(a, b, c) > r) continue;
            const x = Math.round(px + a);
            const y = Math.round(py + b);
            const z = Math.round(pz + c);
            A.set(x, Math.max(0, y), z, jitter(t > 0.65 ? YETI.clawTip : t > 0.25 ? YETI.claw : YETI.clawDark, 0.03, hash3(x, y, z, 91)));
          }
    }
  }
  const thumbDir = seed % 2 ? 1 : -1;
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const r = Math.max(0.55, 1.8 * (1 - t));
    const px = CX + thumbDir * (8 + t * 4);
    const py = 5 - t * 3;
    const pz = CZ + 3 + t * 5;
    const R = Math.ceil(r);
    for (let a = -R; a <= R; a++)
      for (let b = -R; b <= R; b++)
        for (let c = -R; c <= R; c++) {
          if (Math.hypot(a, b, c) > r) continue;
          const x = Math.round(px + a);
          const y = Math.round(py + b);
          const z = Math.round(pz + c);
          A.set(x, Math.max(0, y), z, jitter(t > 0.6 ? YETI.clawTip : YETI.claw, 0.03, hash3(x, y, z, 92)));
        }
  }
  relief(A, before);
  return A;
}

/* -------------------------------- legs -------------------------------- */
const LEG_PIVOT = 38;
const LEG_KNEE = 19;
function paintLeg(seed) {
  const L = new VoxelModel(32, 46, 44);
  const CX = 16;
  const CZ = 15;
  furBlob(L, CX, 31, CZ, 10, 9.4, 9.6, 1);
  furBlob(L, CX, 20.5, CZ + 0.8, 8, 4.4, 7.8, 0.96);
  furBlob(L, CX, 13.5, CZ - 0.2, 7.6, 7.6, 7.2, 0.98);
  furBlob(L, CX, 13, CZ - 3.2, 5, 4.4, 3.2, 1.02);
  furBlob(L, CX, 6, CZ, 6.6, 3.4, 6.2, 0.94);
  furBlob(L, CX, 3.4, CZ + 4.2, 8.6, 3.6, 9.4, 1.02);
  for (let i = 0; i < 4; i++) {
    const tx = CX - 5.6 + i * 3.8;
    furBlob(L, tx, 2, CZ + 12.6, 2.2, 2.2, 3.4, 1.04);
    for (let k = 0; k < 10; k++) {
      const t = k / 9;
      const r = Math.max(0.6, 2.1 * (1 - t));
      const px = tx + (i - 1.5) * 0.18 * k;
      const py = 2 - t * 1.6;
      const pz = CZ + 15 + t * 6.6;
      const R = Math.ceil(r);
      for (let a = -R; a <= R; a++)
        for (let b = -R; b <= R; b++)
          for (let c = -R; c <= R; c++) {
            if (Math.hypot(a, b, c) > r) continue;
            const x = Math.round(px + a);
            const y = Math.round(py + b);
            const z = Math.round(pz + c);
            L.set(x, Math.max(0, y), z, jitter(t > 0.62 ? YETI.clawTip : t > 0.2 ? YETI.claw : YETI.clawDark, 0.03, hash3(x, y, z, 93)));
          }
    }
  }
  const before = L.data.slice();
  furClump(L, CX, 30, CZ, 10.2, 5.4, 10, seed, 4, -0.1, 5);
  furClump(L, CX, 14, CZ, 8.4, 4.4, 8, seed + 4, 4, -0.3, 5);
  furClump(L, CX, 4, CZ + 4, 9, 3, 9.6, seed + 8, 3, 0, 4);
  for (let k = 0; k < 3; k++) iceSpike(L, CX - 3 + k * 3, 21, CZ + 6.5, (k - 1) * 0.3, 0.2, 1, 6 + k, 2);
  relief(L, before);
  return L;
}

/** Rigged yeti: parts mirror the orc rig, plus a hinged jaw. */
export function buildSnowYeti() {
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const root = new THREE.Group();

  const hip = new THREE.Group();
  hip.position.y = LEG_PIVOT * S;
  root.add(hip);
  const upper = new THREE.Group();
  hip.add(upper);
  upper.add(meshFrom(paintTorso(), 34, OY, 22, mat, S));

  const headG = new THREE.Group();
  headG.position.set(0, 35 * S, 3.2 * S);
  headG.add(meshFrom(paintHead(), HCX, 5, 17, mat, S));
  const jawG = new THREE.Group();
  jawG.position.set(0, 4.6 * S, 7.2 * S);
  jawG.add(meshFrom(paintJaw(), 17, 4, 6, mat, S));
  headG.add(jawG);
  upper.add(headG);

  const cloth = new THREE.Group();
  cloth.position.y = 3 * S;
  cloth.add(meshFrom(paintSkirt(), 25, 28, 20, mat, S));
  hip.add(cloth);

  const arms = [];
  for (const [side, seed] of [[-1, 501], [1, 502]]) {
    const A = paintArm(seed);
    const pieces = splitLimb(A, 17, ARM_PIVOT, 15, mat, ARM_ELBOW);
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 21.5 * S, 30.4 * S, 0.8 * S);
    const elbow = new THREE.Group();
    elbow.position.y = -(ARM_PIVOT - ARM_ELBOW) * S;
    elbow.add(pieces.lower);
    shoulder.add(pieces.upper, elbow);
    upper.add(shoulder);
    arms.push({ shoulder, elbow });
  }
  const [armL, armR] = arms;

  const legs = [];
  for (const [side, seed] of [[-1, 601], [1, 602]]) {
    const L = paintLeg(seed);
    const pieces = splitLimb(L, 16, LEG_PIVOT, 15, mat, LEG_KNEE);
    const thigh = new THREE.Group();
    thigh.position.set(side * 8.4 * S, 0, 0);
    const knee = new THREE.Group();
    knee.position.y = -(LEG_PIVOT - LEG_KNEE) * S;
    knee.add(pieces.lower);
    thigh.add(pieces.upper, knee);
    hip.add(thigh);
    legs.push({ thigh, knee });
  }
  const [legL, legR] = legs;

  root.traverse((o) => {
    if (o.isMesh) o.frustumCulled = true;
  });
  return {
    root,
    mat,
    parts: {
      body: upper,
      head: headG,
      jaw: jawG,
      cloth,
      armL: armL.shoulder,
      armR: armR.shoulder,
      elbowL: armL.elbow,
      elbowR: armR.elbow,
      legL: legL.thigh,
      legR: legR.thigh,
      kneeL: legL.knee,
      kneeR: legR.knee,
    },
  };
}
