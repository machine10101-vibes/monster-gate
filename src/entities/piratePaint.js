import { VoxelModel, hash3, jitter, shade, mix, clamp, smoothstep } from '../engine/voxel.js';
import { relief } from './humanoid.js';
import { PAL as PAL_L, PAL_U } from '../data/pirates.js';

/**
 * Voxel painters for the Pirate and the Cursed Pirate. Every part is its own grid so the rig can
 * pivot it; `undead` swaps cloth, skin and flesh for rags and bone while keeping the same silhouette.
 */

const PAL_UNDEAD = { ...PAL_L, ...PAL_U };
let PAL = PAL_L;
export function usePal(undead) {
  PAL = undead ? PAL_UNDEAD : PAL_L;
}

const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const patchy = (arr, x, y, z, s, amt = 0.05) => {
  const k = hash3(x >> 1, y >> 1, z >> 1, s) * 0.6 + hash3(x, y, z, s + 1) * 0.4;
  return jitter(arr[Math.min(arr.length - 1, Math.floor(k * arr.length))], amt, hash3(x, y, z, s + 2));
};
const streak = (x, z, s) => 1 + (hash3(x, 0, z >> 1, s) - 0.5) * 0.2;

export const C = {
  navy: (x, y, z) => shade(patchy(PAL.navy, x, y, z, 11, 0.07), streak(x, z, 5)),
  navyDark: (x, y, z) => patchy(PAL.navyDark, x, y, z, 13, 0.05),
  gold: (x, y, z) => patchy(PAL.gold, x, y, z, 17, 0.05),
  goldDark: (x, y, z) => patchy(PAL.goldDark, x, y, z, 18, 0.05),
  leather: (x, y, z) => patchy(PAL.leather, x, y, z, 19, 0.06),
  leatherDark: (x, y, z) => patchy(PAL.leatherDark, x, y, z, 20, 0.05),
  pants: (x, y, z) => shade(patchy(PAL.pants, x, y, z, 23, 0.06), streak(x, z, 9)),
  boot: (x, y, z) => patchy(PAL.boot, x, y, z, 29, 0.07),
  skin: (x, y, z) => patchy(PAL.skin, x, y, z, 31, 0.035),
  hair: (x, y, z) => patchy(PAL.hair, x, y, z, 37, 0.1),
  shirt: (x, y, z) => patchy(PAL.shirt, x, y, z, 41, 0.04),
  red: (x, y, z) => patchy(PAL.red, x, y, z, 43, 0.06),
  hat: (x, y, z) => patchy(PAL.hat, x, y, z, 47, 0.07),
  steel: (x, y, z) => patchy(PAL.steel, x, y, z, 53, 0.05),
  bone: (x, y, z) => patchy(PAL.bone, x, y, z, 59, 0.035),
  boneDark: (x, y, z) => patchy(PAL.boneDark, x, y, z, 61, 0.05),
  blood: (x, y, z) => patchy(PAL.blood, x, y, z, 67, 0.08),
  hatTrim: (x, y, z) => patchy(PAL.hatTrim, x, y, z, 71, 0.05),
  rust: (x, y, z) => patchy(PAL.rust, x, y, z, 73, 0.08),
};
export const DARK = 0x120d0a;

const se = (dx, dz, rx, rz, p = 3.4) => Math.abs(dx / rx) ** p + Math.abs(dz / rz) ** p <= 1;

function proud(M, pred, color) {
  const add = [];
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        if (M.has(x, y, z) || !pred(x, y, z)) continue;
        if (N6.some(([a, b, c]) => M.has(x + a, y + b, z + c))) add.push([x, y, z]);
      }
  for (const [x, y, z] of add) {
    const c = typeof color === 'function' ? color(x, y, z) : color;
    if (c !== null && c !== undefined) M.set(x, y, z, c);
  }
}

function recolor(M, pred, color) {
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        if (!M.has(x, y, z) || !pred(x, y, z)) continue;
        const c = typeof color === 'function' ? color(x, y, z) : color;
        if (c !== null && c !== undefined) M.set(x, y, z, c);
      }
}

const isBlue = (v) => (v & 255) - ((v >> 16) & 255) > 12 && !(v >> 24);

/** Rags: blue cloth patches go brown or show bone, and exposed cloth edges get nibbled away. */
function tatter(M, { patch = 0.16, bone = 0.05, nibble = 0.1, seed = 0, keep = null } = {}) {
  const drop = [];
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        const v = M.get(x, y, z);
        if (!v || !isBlue(v & 0xffffff) || (keep && keep(x, y, z))) continue;
        const k = hash3((x + seed) >> 1, y >> 1, (z + seed) >> 1, 301);
        if (k < bone) M.set(x, y, z, shade(C.boneDark(x, y, z), 0.9));
        else if (k < patch) M.set(x, y, z, mix(C.leatherDark(x, y, z), C.navyDark(x, y, z), 0.3 + hash3(x, y, z, 302) * 0.3));
        const edge = N6.some(([a, b, c]) => (a || c) && !M.has(x + a, y + b, z + c));
        if (edge && hash3(x + seed, y, z, 303) < nibble) drop.push([x, y, z]);
      }
  for (const [x, y, z] of drop) M.clear(x, y, z);
}

function frontZ(M, x, y) {
  for (let z = M.sz - 1; z >= 0; z--) if (M.has(x, y, z)) return z;
  return -1;
}

function splitHalf(M, cx, side) {
  const out = new VoxelModel(M.sx, M.sy, M.sz);
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) if ((side > 0 ? x >= cx : x < cx) && M.has(x, y, z)) out.data[out.idx(x, y, z)] = M.data[M.idx(x, y, z)];
  return out;
}

/* -------------------------------------------------------------- torso */
export const TORSO = { ox: 15, oy: 2, oz: 9 };

export function paintTorso(undead) {
  usePal(undead);
  const M = new VoxelModel(30, 34, 18);
  const CX = 15;
  const CZ = 9;
  const hw = (y) => (undead ? 8.7 + 1.1 * smoothstep(4, 18, y) : 9.7 + 1.4 * smoothstep(4, 18, y));
  const hd = (y) => (undead ? 5.1 + 0.7 * smoothstep(4, 16, y) : 5.4 + 0.8 * smoothstep(4, 16, y));
  const op = (y) => (undead ? 6.2 : 3.2 + 1.4 * smoothstep(7, 24, y));
  const dxOf = (x) => x + 0.5 - CX;
  const dzOf = (z) => z + 0.5 - CZ;

  M.box(0, 0, 0, M.sx, 28, M.sz, (x, y, z) => {
    const dx = dxOf(x);
    if (y + 0.5 > 27 - Math.max(0, Math.abs(dx) - 6.5) * 0.45) return null;
    return se(dx, dzOf(z), hw(y), hd(y), 3.2) ? C.navy(x, y, z) : null;
  });
  M.box(0, 24, 0, M.sx, 32, M.sz, (x, y, z) => (se(dxOf(x), dzOf(z), 3.4, 3.1, 3) ? (undead ? C.boneDark(x, y, z) : shade(C.skin(x, y, z), 0.82)) : null));

  const inOpening = (x, y, z) => y >= 7 && y <= 26 && dzOf(z) > hd(y) - 3.4 && Math.abs(dxOf(x)) < op(y) + (undead ? (hash3(x, y, 0, 3) - 0.5) * 1.4 : 0);
  if (!undead) {
    for (let z = 0; z < M.sz; z++)
      for (let y = 7; y <= 26; y++)
        for (let x = 0; x < M.sx; x++) {
          if (!M.has(x, y, z) || !inOpening(x, y, z)) continue;
          const dz = dzOf(z);
          if (dz > hd(y) - 1.3) {
            M.clear(x, y, z);
            continue;
          }
          const dx = dxOf(x);
          const skinV = y >= 21 && Math.abs(dx) < (y - 19.2) * 0.62 && dz > hd(y) - 2.6;
          if (skinV) M.set(x, y, z, shade(C.skin(x, y, z), 0.9));
          else {
            const pleat = (Math.floor(dx * 0.9) + (y >> 2)) & 1 ? 0.9 : 1;
            M.set(x, y, z, shade(C.shirt(x, y, z), pleat * (dz > hd(y) - 2 ? 1 : 0.85)));
          }
        }
    for (let y = 11; y <= 21; y += 2) {
      const z = frontZ(M, 14, y);
      if (z < 0) continue;
      M.set(14, y, z, 0x8a7656);
      M.set(15, y, z, 0x8a7656);
      M.set(13 + ((y >> 1) & 1) * 3, y + 1, z, 0x9a8666);
    }
    for (const sx of [14, 15]) for (let y = 9; y < 12; y++) M.set(sx, y, frontZ(M, sx, y), 0x8a7656);
  } else {
    for (let z = 0; z < M.sz; z++)
      for (let y = 7; y <= 26; y++)
        for (let x = 0; x < M.sx; x++) if (M.has(x, y, z) && inOpening(x, y, z) && dzOf(z) > -3.2) M.clear(x, y, z);
    for (let y = 8; y <= 26; y++) {
      const wr = 5.5 + 1.6 * Math.sin(smoothstep(6, 17, y) * Math.PI * 0.5) - 0.5 * smoothstep(19, 26, y);
      for (let z = 0; z < M.sz; z++)
        for (let x = 0; x < M.sx; x++) {
          const dx = dxOf(x);
          const dz = dzOf(z) - 0.3;
          if (dz > -3.3 && (dx / wr) ** 2 + (dz / 4.3) ** 2 <= 1) M.set(x, y, z, shade(C.shirt(x, y, z), 0.7 + (x & 1) * 0.22 + (y % 3 === 2 ? -0.12 : 0)));
        }
    }
    for (const yr of [8, 10, 12, 14, 16, 18, 20]) {
      const wr = 5.5 + 1.6 * Math.sin(smoothstep(6, 17, yr) * Math.PI * 0.5) - 0.5 * smoothstep(19, 26, yr);
      for (let t = 0; t < Math.PI * 2; t += 0.04) {
        const x = Math.floor(CX + wr * Math.sin(t));
        const z = Math.floor(CZ + 0.3 + 4.3 * Math.cos(t));
        if (z < CZ - 3) continue;
        M.set(x, yr, z, C.bone(x, yr, z));
        M.set(x, yr + 1, z, C.bone(x, yr + 1, z));
        if (Math.cos(t) > 0.3) M.set(x, yr, z + 1, shade(C.bone(x, yr, z), 1.05));
      }
    }
    for (let y = 8; y <= 22; y++) {
      const z = frontZ(M, 14, y) + 1;
      const w = y < 12 ? 1 : 2;
      for (let x = 15 - w; x < 15 + w; x++) M.set(x, y, z, C.bone(x, y, z));
    }
    for (const s of [-1, 1])
      for (let k = 0; k < 8; k++) {
        const x = Math.floor(CX + s * (1 + k) - (s < 0 ? 0 : 0));
        const y = 24 - (k >> 2);
        const z = frontZ(M, x, y) + 1;
        M.set(x, y, z, C.bone(x, y, z));
        M.set(x, y + 1, z, shade(C.bone(x, y, z), 0.9));
      }
    for (let y = 8; y <= 25; y++) {
      const z = CZ - 3;
      const gap = (y & 3) === 0;
      for (let x = 14; x <= 15; x++) M.set(x, y, z, gap ? DARK : C.boneDark(x, y, z));
    }
  }

  const frontEdge = (x, y, z) => dzOf(z) > 1 && y >= 7 && y <= 26;
  const lapelAt = (x, y, z) => {
    if (!frontEdge(x, y, z)) return null;
    const dxa = Math.abs(dxOf(x)) - op(y);
    if (dxa < 0) return null;
    if (dxa < 1.1) {
      if (undead) return hash3(x, y >> 1, 0, 74) < 0.3 ? C.goldDark(x, y, z) : shade(C.navyDark(x, y, z), 1.25);
      return dxOf(x) > 0 ? C.gold(x, y, z) : C.goldDark(x, y, z);
    }
    if (undead) return null;
    if (y < 13 + dxa * 1.6 || dxa > 3.6) return null;
    if (dxa > 2.7 && dxOf(x) > 0 && hash3(x, y, 0, 72) < 0.7) return C.goldDark(x, y, z);
    return shade(C.navy(x, y, z), 1.14);
  };

  const before = M.data.slice();
  proud(M, (x, y, z) => lapelAt(x, y, z) !== null, (x, y, z) => lapelAt(x, y, z));
  for (const by of undead ? [] : [8, 11, 14, 17, 20, 23]) {
    const x = Math.floor(CX - op(by) - 2.5);
    const z = frontZ(M, x, by) + 1;
    M.set(x, by, z, C.gold(x, by, z));
    M.set(x, by + 1, z, shade(C.gold(x, by, z), 1.12));
  }
  if (undead)
    for (const sd of [-1, 1])
      for (const by of [9, 12, 15, 18, 21]) {
        if (hash3(sd, by, 0, 75) < 0.25) continue;
        const x = Math.floor(CX + sd * (op(by) + 1.2) - (sd < 0 ? 1 : 0));
        const z = frontZ(M, x, by);
        if (z < 0) continue;
        for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) M.set(x + k, by + j, z + 1, k + j === 1 ? C.goldDark(x, by, z) : C.gold(x, by, z));
      }

  const colTop = (x, y, z) => {
    const dx = dxOf(x);
    const dz = dzOf(z);
    if (y < 24 || y > 29) return null;
    if (!se(dx, dz, 6.3, 5.0, 3) || se(dx, dz, 4.6, 3.4, 3)) return null;
    if (dz > 0 && Math.abs(dx) < 2.6) return null;
    if (y > (dz > 0 ? 27 : 29) - (undead ? 2 : 0)) return null;
    return y === (dz > 0 ? 27 : 29) - (undead ? 2 : 0) ? (undead ? C.goldDark(x, y, z) : C.gold(x, y, z)) : y > 25 ? shade(C.navy(x, y, z), 1.12) : C.navy(x, y, z);
  };
  M.box(0, 24, 0, M.sx, 30, M.sz, colTop);
  M.box(0, 24, 0, M.sx, 30, M.sz, (x, y, z) => {
    const dx = dxOf(x);
    const dz = dzOf(z);
    if (!undead && dz > 0 && Math.abs(dx) >= 2.6 && Math.abs(dx) < 3.8 && y >= 24 && y <= 27 && se(dx, dz, 6.3, 5, 3)) return C.gold(x, y, z);
    return null;
  });

  const yc = (x) => 17.5 - (x + 0.5 - 12.5) * 0.95;
  const baldric = (x, y, z) => y >= 7 && y < 28 && Math.abs(y + 0.5 - yc(x)) < 1.9;
  const bColor = (x, y, z) => {
    const e = Math.abs(y + 0.5 - yc(x));
    if (e > 1.45) return C.leatherDark(x, y, z);
    return hash3(x, y, z, 81) < 0.07 ? shade(C.leather(x, y, z), 1.25) : C.leather(x, y, z);
  };
  proud(M, (x, y, z) => baldric(x, y, z) && inOpening(x, y, z), bColor);
  proud(M, baldric, bColor);

  const belt = (x, y, z) => y >= 2 && y < 7;
  proud(M, belt, (x, y, z) => {
    if (y === 2 || y === 6) return C.leatherDark(x, y, z);
    if (y === 4 && (x + z) % 3 === 0) return shade(C.leatherDark(x, y, z), 0.8);
    return C.leather(x, y, z);
  });
  proud(M, (x, y, z) => y >= 2 && y < 7 && (x + z) % 5 === 0 && y === 3, (x, y, z) => shade(C.leather(x, y, z), 1.2));

  const frame = (x0, y0, w, h, hx, hy, hw2, hh) => (x, y, z) => {
    if (dzOf(z) < 0) return null;
    if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return null;
    if (x >= hx && x < hx + hw2 && y >= hy && y < hy + hh) return null;
    const edge = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1;
    return edge ? shade(C.gold(x, y, z), 1.05) : C.gold(x, y, z);
  };
  const buckleW = frame(11, 1, 8, 7, 13, 3, 4, 3);
  proud(M, (x, y, z) => buckleW(x, y, z) !== null, buckleW);
  for (let x = 13; x < 16; x++) {
    const z = frontZ(M, x, 4) + 0;
    if (z >= 0 && M.get(x, 4, z) && ((M.get(x, 4, z) & 0xffffff) !== 0)) M.set(x, 4, z, C.goldDark(x, 4, z));
  }
  const chestB = frame(9, 14, 7, 7, 11, 16, 3, 3);
  proud(M, (x, y, z) => chestB(x, y, z) !== null, chestB);
  for (let x = 11; x < 14; x++) {
    const z = frontZ(M, x, 17);
    if (z >= 0) M.set(x, 17, z, C.leatherDark(x, 17, z));
  }

  proud(M, (x, y, z) => dzOf(z) > 0 && x >= 20 && x < 25 && y >= 0 && y < 8 && y > 1 + (x - 20) * 0.1, (x, y, z) => (y === 7 || x === 20 ? C.leatherDark(x, y, z) : C.leather(x, y, z)));
  proud(M, (x, y, z) => dzOf(z) > 0 && x >= 20 && x < 25 && y >= 1 && y < 8, (x, y, z) => (y >= 6 ? shade(C.leather(x, y, z), 0.8) : C.leather(x, y, z)));

  for (let y = 8; y < 26; y++) {
    for (let z2 = 0; z2 < M.sz; z2++) {
      if (!M.has(14, y, z2)) continue;
      if (dzOf(z2) < 0 && !baldric(14, y, z2)) {
        M.set(14, y, z2, shade(M.get(14, y, z2) & 0xffffff, 0.78));
        M.set(15, y, z2, shade(M.get(15, y, z2) & 0xffffff, 0.78));
      }
      break;
    }
  }

  relief(M, before);
  if (undead) tatter(M, { patch: 0.36, bone: 0.08, nibble: 0.15, seed: 1 });
  return M;
}

/* --------------------------------------------------------------- head */
export const HEAD = { ox: 11, oy: 4, oz: 11 };

export function paintHead(undead) {
  usePal(undead);
  const M = new VoxelModel(22, 26, 22);
  const CX = 11;
  const CZ = 11;
  const HY = 4;
  const dxOf = (x) => x + 0.5 - CX;
  const dzOf = (z) => z + 0.5 - CZ;
  const yrOf = (y) => y - HY;

  if (!undead) {
    M.box(0, HY, 0, M.sx, HY + 12, M.sz, (x, y, z) => {
      const yr = yrOf(y);
      const hwv = (yr < 1 ? 4.7 : yr < 2 ? 5.2 : 6) - Math.max(0, yr - 9.5) * 0.7;
      const hdv = 6 - Math.max(0, yr - 9.5) * 0.7;
      if (!se(dxOf(x), dzOf(z), hwv, hdv, 4)) return null;
      const dx = Math.abs(dxOf(x));
      let f = yr < 1 ? 0.8 : yr < 2 ? 0.9 : yr < 4 && dx > 3 ? 1.05 : 1;
      if (yr >= 3 && yr <= 4 && dx > 3.5 && dx < 5.5 && dzOf(z) > 2) f *= 1.06;
      return shade(C.skin(x, y, z), f);
    });
    const hairMask = (x, y, z) => {
      const yr = yrOf(y);
      const dz = dzOf(z);
      const dx = Math.abs(dxOf(x));
      return yr >= 2 && yr <= 11 && (dz < -2.3 || (dx > 4.9 && dz < 3.2) || yr >= 10);
    };
    recolor(M, hairMask, (x, y, z) => C.hair(x, y, z));
    for (let x = 5; x < 17; x++) {
      const low = -3 + Math.floor(hash3(x, 0, 0, 91) * 3.5);
      for (let yr = low; yr < 9; yr++) {
        const z = CZ - 7 + (hash3(x, yr, 0, 92) < 0.25 ? 1 : 0);
        for (let k = 0; k < 2; k++) M.set(x, HY + yr, z + k, C.hair(x, HY + yr, z + k));
      }
    }
    for (const s of [-1, 1])
      for (let yr = 1; yr < 9; yr++) {
        const lo = 1 + Math.floor(hash3(s, yr, 0, 93) * 2);
        if (yr < lo) continue;
        const x = s < 0 ? CX - 7 : CX + 6;
        for (let z = CZ - 5; z <= CZ + (yr > 5 ? 1 : 0); z++) {
          if ((z + yr) % 5 === 0) continue;
          M.set(x, HY + yr, z, C.hair(x, HY + yr, z));
        }
      }
    for (const s of [-1, 1]) {
      const x = s < 0 ? CX - 6 : CX + 5;
      for (const yr of [4, 5, 6]) {
        M.set(x + (s < 0 ? -1 : 1), HY + yr, CZ, shade(C.skin(x, yr, 0), 0.88));
      }
    }
    const fz = (x, yr) => frontZ(M, x, HY + yr);
    const put = (x, yr, c, dz = 0) => {
      const z = fz(x, yr);
      if (z >= 0) M.set(x, HY + yr, z + dz, c);
    };
    for (const xs of [[7, 8, 9], [14, 13, 12]]) {
      put(xs[0], 6, 0xe9e2d2);
      put(xs[1], 6, 0x1c120c);
      put(xs[2], 6, 0xd6cfbf);
      put(xs[0], 5, shade(C.skin(xs[0], 5, 0), 0.8));
      put(xs[1], 5, shade(C.skin(xs[1], 5, 0), 0.84));
      put(xs[2], 5, shade(C.skin(xs[2], 5, 0), 0.86));
    }
    for (const [x, d] of [[6, 0], [7, 0], [8, -0], [9, 0], [12, 0], [13, 0], [14, 0], [15, 0]]) {
      const inner = x === 9 || x === 12;
      put(x, 7, C.hair(x, 7, 0), 0);
      put(x, 7, shade(0x1a1210, 1 + d), 1);
      if (inner) put(x, 6, shade(C.skin(x, 6, 0), 0.6), 0);
    }
    for (const x of [10, 11]) {
      for (const yr of [4, 5, 6]) put(x, yr, shade(C.skin(x, yr, 0), 1.06), 1);
      put(x, 4, shade(C.skin(x, 4, 0), 1.1), 2);
      put(x, 3, shade(C.skin(x, 3, 0), 0.72), 1);
    }
    put(9, 4, shade(C.skin(9, 4, 0), 0.82), 0);
    put(12, 4, shade(C.skin(12, 4, 0), 0.82), 0);
    for (let x = 8; x <= 13; x++) put(x, 2, 0x6a3226, 0);
    put(13, 3, 0x7a4234, 0);
    put(8, 1, shade(C.skin(8, 1, 0), 0.9), 0);
    for (let x = 9; x <= 12; x++) put(x, 1, shade(C.skin(x, 1, 0), 0.9), 0);
    for (const x of [6, 7, 15, 16]) put(x, 3, shade(C.skin(x, 3, 0), 0.8), 0);
    for (const x of [9, 10, 11, 12]) put(x, 0, shade(C.skin(x, 0, 0), 0.75), 0);
  } else {
    M.box(0, HY + 2, 0, M.sx, HY + 14, M.sz, (x, y, z) => {
      const yr = yrOf(y);
      const dx = dxOf(x);
      const dz = dzOf(z);
      let ok;
      if (yr >= 5) ok = se(dx, dz, 6.4, 6.3, 2.7 + Math.max(0, yr - 11) * 0.35);
      else if (yr >= 3) ok = se(dx, dz, 5.9, 5.6, 3.4);
      else ok = se(dx, dz, 4.7, 5.1, 3.4);
      if (!ok) return null;
      const base = C.bone(x, y, z);
      const stain = hash3(x >> 1, y >> 1, z >> 1, 97);
      if (stain < 0.16) return mix(base, 0x4e4030, 0.42);
      if (stain > 0.93) return shade(base, 0.8);
      return yr < 3 ? shade(base, 0.9) : yr >= 9 ? shade(base, 0.85) : base;
    });
    const fz = (x, yr) => frontZ(M, x, HY + yr);
    const sockets = [[5, 9], [13, 17]];
    for (const [x0, x1] of sockets) {
      for (let yr = 4; yr <= 7; yr++)
        for (let x = x0; x < x1; x++) {
          const outer = x === (x0 === 5 ? x0 : x1 - 1);
          const corner = (x === x0 || x === x1 - 1) && (yr === 4 || yr === 7);
          if (corner || (yr === 4 && outer)) continue;
          const z = fz(x, yr);
          if (z < 0) continue;
          for (let k = 0; k < 3; k++) M.clear(x, HY + yr, z - k);
          for (let k = 3; k < 5; k++) M.set(x, HY + yr, z - k, 0x0b0705);
        }
      const gx = x0 === 5 ? 7 : 14;
      const gz = fz(gx, 5);
      M.set(gx, HY + 5, gz - 3, 0x2fbf6a, true);
      M.set(gx, HY + 5, gz - 2, 0x8cffb4, true);
    }
    for (const [x, yr] of [[10, 3], [11, 3], [10, 2], [11, 2], [9, 2], [12, 2]]) {
      const z = fz(x, yr);
      if (z < 0) continue;
      for (let k = 0; k < 3; k++) M.clear(x, HY + yr, z - k);
      for (let k = 3; k < 5; k++) M.set(x, HY + yr, z - k, 0x0b0705);
    }
    for (const x of [10, 11]) {
      const z = fz(x, 4);
      if (z >= 0) M.set(x, HY + 4, z, shade(C.bone(x, 4, z), 1.12));
    }
    for (let x = 5; x <= 16; x++) {
      const z = fz(x, 8);
      if (z >= 0 && !(x === 10 || x === 11)) M.set(x, HY + 8, z + 1, shade(C.bone(x, 8, z), 0.92));
    }
    for (const x of [4, 5, 16, 17]) {
      for (const yr of [3, 4]) {
        const z = fz(x, yr);
        if (z >= 0) M.set(x, HY + yr, z + 1, shade(C.bone(x, yr, z), 1.1));
      }
    }
    for (let x = 6; x <= 15; x++) {
      const z = fz(x, 2);
      if (z < 0) continue;
      M.set(x, HY + 2, z, x % 2 === 0 ? shade(C.bone(x, 2, z), 1.12) : 0x30261a);
      M.set(x, HY + 2, z + 1, x % 2 === 0 ? shade(C.bone(x, 2, z), 1.2) : 0x30261a);
      if (x > 6 && x < 15 && fz(x, 7) >= 0) M.set(x, HY + 7, fz(x, 7) + 1, shade(C.bone(x, 7, 0), 1.08));
    }
    for (let k = 0; k < 8; k++) {
      const x = 12 + (k >> 1);
      const yr = 13 - k;
      const z = fz(x, yr);
      if (yr >= 9 && z >= 0) M.set(x, HY + yr, z, 0x3a3022);
    }
    M.box(10, HY - 4, CZ - 4, 12, HY - 1, CZ - 2, (x, y, z) => ((y & 1) === 0 ? C.bone(x, y, z) : C.boneDark(x, y, z)));
  }

  const BY = undead ? 10 : 8;
  const bandana = (x, y, z) => {
    const yr = yrOf(y);
    return yr >= BY && yr <= BY + 3;
  };
  const before = M.data.slice();
  const band = (x, y, z) => {
    const yr = yrOf(y);
    if (undead && hash3(x, y, z, 5) < 0.08) return null;
    if (yr === BY || yr === BY + 3) return shade(C.red(x, y, z), 0.78);
    return C.red(x, y, z);
  };
  recolor(M, bandana, band);
  proud(M, bandana, band);
  proud(M, (x, y, z) => yrOf(y) === BY || yrOf(y) === BY + 3, (x, y, z) => shade(C.red(x, y, z), 0.7));
  for (let x = CX + 4; x <= CX + 7; x++)
    for (let y = HY + BY - 1; y <= HY + BY + 3; y++)
      for (let z = CZ - 8; z <= CZ - 4; z++) {
        const d = Math.hypot(x - (CX + 5.5), y - (HY + BY + 1), z - (CZ - 6));
        if (d < 2.6 && !M.has(x, y, z)) M.set(x, y, z, shade(C.red(x, y, z), d > 1.6 ? 0.82 : 1));
      }
  relief(M, before);
  return M;
}

export function paintJaw() {
  usePal(true);
  const M = new VoxelModel(14, 6, 14);
  const CX = 7;
  const CZ = 7;
  M.box(0, 0, 0, 14, 4, 14, (x, y, z) => {
    const dx = x + 0.5 - CX;
    const dz = z + 0.5 - CZ - 1.4;
    if (!se(dx, dz, 4.5, 5.6, 3)) return null;
    if (y >= 2 && se(dx, dz, 3.1, 4.3, 3)) return null;
    if (y === 3) return dz > -1 && ((x + z) & 1) === 0 ? 0x2a2218 : shade(C.bone(x, y, z), 1.08);
    return y === 0 ? shade(C.bone(x, y, z), 0.85) : C.bone(x, y, z);
  });
  for (let x = 4; x < 10; x += 2) {
    let zf = -1;
    for (let z = M.sz - 1; z >= 0 && zf < 0; z--) if (M.has(x, 3, z)) zf = z;
    if (zf >= 0) M.set(x, 4, zf, shade(C.bone(x, 4, zf), 1.2));
  }
  for (const s of [-1, 1])
    for (let y = 3; y < 6; y++) {
      const x = s < 0 ? 2 : 11;
      M.set(x, y, 3, C.bone(x, y, 3));
      M.set(x, y, 4, C.boneDark(x, y, 4));
    }
  return M;
}

/* ---------------------------------------------------------------- hat */
export const HAT = { ox: 20, oy: 2, oz: 21 };

export function paintHat(undead) {
  usePal(undead);
  const M = new VoxelModel(40, 26, 42);
  const CX = 20;
  const CZ = 21;
  const V = [[-18.4, 9.2], [18.4, 9.2], [0, -16.8]];
  const edges = [[0, 1], [1, 2], [2, 0]];
  const orient = (() => {
    const [x0, z0] = V[0];
    const [x1, z1] = V[1];
    const [x2, z2] = V[2];
    return (x1 - x0) * (z2 - z0) - (z1 - z0) * (x2 - x0) > 0 ? 1 : -1;
  })();
  const info = (px, pz) => {
    let dmin = 1e9;
    for (const [a, b] of edges) {
      const [x0, z0] = V[a];
      const [x1, z1] = V[b];
      const ex = x1 - x0;
      const ez = z1 - z0;
      const len = Math.hypot(ex, ez);
      dmin = Math.min(dmin, (((px - x0) * -ez + (pz - z0) * ex) / len) * orient);
    }
    let dv = 1e9;
    for (const [vx, vz] of V) dv = Math.min(dv, Math.hypot(px - vx, pz - vz));
    return { d: dmin, dv };
  };

  const H = [];
  for (let z = 0; z < M.sz; z++) {
    H[z] = [];
    for (let x = 0; x < M.sx; x++) {
      const px = x + 0.5 - CX;
      const pz = z + 0.5 - CZ;
      const { d, dv } = info(px, pz);
      const dd = d;
      if (dd < 0.2) {
        H[z][x] = null;
        continue;
      }
      const W = 4.6;
      const edge = clamp(1 - dd / W, 0, 1);
      const cf = smoothstep(1.5, 9, dv);
      const lift = 6.6 * cf * edge ** 1.7;
      H[z][x] = { h: 2 + lift, dd, dv, lift };
    }
  }
  const base = (x, z) => (H[z]?.[x] ? H[z][x].h : -1);
  for (let z = 0; z < M.sz; z++)
    for (let x = 0; x < M.sx; x++) {
      const c = H[z][x];
      if (!c) continue;
      const h = Math.floor(c.h);
      const nb = Math.min(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => (base(x + a, z + b) < 0 ? h : Math.floor(base(x + a, z + b)))));
      const lo = Math.max(0, Math.min(h - 2, nb));
      for (let y = lo; y <= h; y++) {
        const top = y === h;
        const trim = c.dd < 1.2 && top;
        const rim = c.dd < 1.6;
        const trimC = (xx, yy, zz) => (undead ? C.hatTrim(xx, yy, zz) : (xx + zz) % 4 === 0 ? C.goldDark(xx, yy, zz) : C.gold(xx, yy, zz));
        let col;
        if (trim && hash3(x, y, z, 5) < 0.95) col = trimC(x, y, z);
        else if (rim && y >= h - 1 && c.lift > 0.4 && hash3(x, y, z, 6) < 0.12) col = trimC(x, y, z);
        else {
          col = C.hat(x, y, z);
          if (c.lift > 1.5 && c.dd > 1.7) col = shade(col, 1 + (c.lift / 6.6) * 0.14);
          if (!top) col = shade(col, 0.82);
        }
        if (undead && hash3(x, y, z, 7) < 0.05 && c.dd < 2.5) continue;
        M.set(x, y, z, col);
      }
    }
  for (let z = 0; z < M.sz; z++)
    for (let x = 0; x < M.sx; x++) {
      const dx = x + 0.5 - CX;
      const dz = z + 0.5 - CZ - 0.6;
      const r = Math.hypot(dx / 8.4, dz / 8.4);
      if (r > 1) continue;
      const top = 2 + 6.6 - r ** 3.2 * 2.2;
      for (let y = 2; y < top; y++) {
        const band = y === 4 || y === 5;
        let col = C.hat(x, y, z);
        if (band) col = shade(col, 0.78);
        else if (y > 6) col = shade(col, 1 + (y - 6) * 0.025);
        if (y > top - 1.4 && hash3(x, y, z, 9) < 0.3) col = shade(col, 1.15);
        M.set(x, y, z, col);
      }
    }
  return M;
}

export function paintKnot(undead) {
  usePal(undead);
  const M = new VoxelModel(16, 24, 6);
  const tails = [
    { x0: 3, len: 15, tilt: 0.3, w: 3, seed: 1 },
    { x0: 6, len: 12, tilt: 0.05, w: 3, seed: 2 },
    { x0: 8, len: 9, tilt: -0.28, w: 2, seed: 3 },
  ];
  for (const { x0, len, tilt, w, seed } of tails)
    for (let k = 0; k < len; k++) {
      const x = Math.round(x0 + k * tilt);
      const fray = k > len - 5 && hash3(k, seed, 0, 5) < 0.4 ? 1 : 0;
      const ww = Math.max(1, w - (k > len - 4 ? 1 : 0) - fray);
      for (let i = 0; i < ww; i++) {
        const xx = x + i;
        const y = 23 - k;
        const c = shade(C.red(xx, y, 2), k > 2 ? 1 : 0.8);
        M.set(xx, y, 2, c);
        M.set(xx, y, 3, shade(c, 0.9));
      }
    }
  for (let x = 2; x < 10; x++) for (let y = 21; y < 24; y++) if (hash3(x, y, 0, 8) < 0.8) M.set(x, y, 2, shade(C.red(x, y, 2), 1.08)), M.set(x, y, 3, C.red(x, y, 3));
  return M;
}

/* ---------------------------------------------------------------- arm */
export const ARM = { ox: 6, pivot: 30, oz: 6, elbow: 17, hand: 3.5 };

export function paintArm(undead, side, grip) {
  usePal(undead);
  const M = new VoxelModel(12, 36, 12);
  const CX = 6;
  const CZ = 6;
  const dxOf = (x) => x + 0.5 - CX;
  const dzOf = (z) => z + 0.5 - CZ;
  const sleeveR = (y) => {
    if (y >= 18) return 4.05;
    if (y >= 12) return 3.7 + 0.35 * smoothstep(12, 10, y) + (y < 14 ? 0.4 : 0);
    return 3.7;
  };
  const sleeveBottom = 10;
  if (!undead) M.box(0, sleeveBottom, 0, M.sx, 34, M.sz, (x, y, z) => {
    if (!se(dxOf(x), dzOf(z), sleeveR(y), sleeveR(y), 3.4)) return null;
    const out = side * dxOf(x) + 4;
    if (y + 0.5 > 32.4 - out * 0.38 - (Math.abs(dzOf(z)) > 3 ? 0.8 : 0)) return null;
    if (undead && y < 17 + 3 && hash3(x, y, z, 21) < (20 - y) * 0.14 - 0.1 + (y <= sleeveBottom ? 0.4 : 0)) return null;
    let f = 1;
    if (y >= 16 && y <= 19) f = 0.88 + (y === 17 ? -0.1 : 0);
    if (!undead && y <= 14 && y >= 10) f *= 0.96;
    if (hash3(0, y, (x + z) >> 1, 22) < 0.1) f *= 0.88;
    return shade(C.navy(x, y, z), f);
  });

  if (!undead) {
    M.box(0, 7, 0, M.sx, 10, M.sz, (x, y, z) => {
      if (!se(dxOf(x), dzOf(z), 4.3, 4.3, 3)) return null;
      if (y === 7 && hash3(x, y, z, 23) < 0.45) return null;
      return shade(C.shirt(x, y, z), y === 7 ? 0.82 : 1);
    });
    M.box(0, 6, 0, M.sx, 8, M.sz, (x, y, z) => (se(dxOf(x), dzOf(z), 3.2, 3.2, 3) ? shade(C.skin(x, y, z), 0.9) : null));
    M.box(0, 0, 0, M.sx, 7, M.sz, (x, y, z) => {
      const dx = dxOf(x);
      const dz = dzOf(z);
      if (!(Math.abs(dx) < 2.6 && Math.abs(dz) < 3.2 && !(y >= 5 && Math.abs(dx) > 2.2 && Math.abs(dz) > 2.6))) return null;
      let f = y < 1 ? 0.84 : 1;
      if ((y === 3 || y === 5) && dz > 0) f *= 0.8;
      if (dx * side > 1.6) f *= 0.9;
      return shade(C.skin(x, y, z), f);
    });
    M.box(4, 2, 2, 8, 6, 3, (x, y, z) => shade(C.skin(x, y, z), y === 4 ? 0.75 : 0.92));
    for (const z of [4, 6, 8]) for (const x of [side > 0 ? 3 : 8]) for (let y = 1; y < 6; y++) if (M.has(x, y, z)) M.set(x, y, z, shade(C.skin(x, y, z), z === 6 ? 0.72 : 0.8));
    M.box(5, 5, 6, 7, 7, 9, (x, y, z) => shade(C.skin(x, y, z), 1.06));
  } else {
    const boneAt = (x, y, z) => C.bone(x, y, z);
    const cyl = (cx, cz, r, y0, y1, color) => {
      for (let y = y0; y < y1; y++)
        for (let z = 0; z < M.sz; z++)
          for (let x = 0; x < M.sx; x++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r) M.set(x, y, z, color(x, y, z));
    };
    const joint = (y) => (y % 5 === 0 ? 0.82 : 1);
    cyl(CX, CZ, 1.75, 18, 28, (x, y, z) => shade(boneAt(x, y, z), joint(y)));
    M.ellipsoid(CX, 28.5, CZ, 2.8, 2.6, 2.6, boneAt);
    M.ellipsoid(CX, 17.5, CZ, 2.7, 2.4, 2.5, (x, y, z) => shade(boneAt(x, y, z), 1.06));
    for (const [cx, cz] of [[CX - 1.2, CZ - 0.5], [CX + 1.2, CZ + 0.5]]) cyl(cx, cz, 1.05, 6, 16, (x, y, z) => (y === 11 ? C.boneDark(x, y, z) : boneAt(x, y, z)));
    cyl(CX, CZ, 1.7, 14, 17, (x, y, z) => shade(boneAt(x, y, z), 0.9));

    const shoulder = (x, y, z) => {
      if (!se(dxOf(x), dzOf(z), 3.5, 3.5, 3.2)) return null;
      const out = side * dxOf(x) + 4;
      if (y + 0.5 > 32.6 - out * 0.4 - (Math.abs(dzOf(z)) > 3 ? 0.8 : 0)) return null;
      const outer = side * dxOf(x) > -0.6;
      const hang = outer ? 21 + Math.floor(hash3(x, 0, z, 21) * 7) : 28 + Math.floor(hash3(x, 1, z, 21) * 3);
      if (y < hang) return null;
      return shade(C.navy(x, y, z), y >= 30 ? 1.08 : 0.94);
    };
    M.box(0, 18, 0, M.sx, 34, M.sz, shoulder);

    const cuffTop = 14;
    const cuffBot = 8;
    M.box(0, cuffBot, 0, M.sx, cuffTop + 1, M.sz, (x, y, z) => {
      const rr = 3.9 + (y < 11 ? 0.2 : 0);
      if (!se(dxOf(x), dzOf(z), rr, rr, 3)) return null;
      if (se(dxOf(x), dzOf(z), rr - 1.4, rr - 1.4, 3) && y < cuffTop) return null;
      if (y < cuffBot + Math.floor(hash3(x, 0, z, 26) * 3)) return null;
      if (y === cuffTop) return hash3(x, y, z, 27) < 0.65 ? C.gold(x, y, z) : C.leather(x, y, z);
      if (y === cuffTop - 1) return hash3(x, y, z, 28) < 0.5 ? shade(C.goldDark(x, y, z), 1.05) : C.leatherDark(x, y, z);
      if (y <= cuffBot + 1) return shade(C.leather(x, y, z), 0.9);
      return shade(C.navy(x, y, z), y < 11 ? 0.85 : 1);
    });
    M.box(0, 8, 0, M.sx, 9, M.sz, (x, y, z) => (se(dxOf(x), dzOf(z), 2.6, 2.6, 3) ? shade(C.boneDark(x, y, z), 1.1) : null));
    M.box(3, 5, 3, 9, 8, 9, (x, y, z) => (se(dxOf(x), dzOf(z), 2.7, 2.5, 2.4) ? ((x + z + y) & 1 ? C.bone(x, y, z) : C.boneDark(x, y, z)) : null));
    if (grip) {
      M.box(3, 0, 3, 9, 6, 9, (x, y, z) => {
        const dx = dxOf(x);
        const dz = dzOf(z);
        if (!(Math.abs(dx) < 2.7 && Math.abs(dz) < 3.4)) return null;
        if ((z & 1) === 1 && dx * side < 0.2 && y < 5) return 0x1c140e;
        return y < 1 ? shade(C.bone(x, y, z), 0.8) : (y + z) % 3 === 0 ? C.boneDark(x, y, z) : C.bone(x, y, z);
      });
      M.box(4, 5, 5, 8, 7, 9, (x, y, z) => shade(C.bone(x, y, z), 1.06));
    } else {
      M.box(3, 3, 3, 9, 6, 9, (x, y, z) => ((x + z + y) & 1 ? C.bone(x, y, z) : C.boneDark(x, y, z)));
    }
  }
  const before = M.data.slice();
  if (!undead) {
    const trim = (x, y, z) => y >= 11 && y <= 13 && Math.hypot(dxOf(x), dzOf(z)) < 5.4;
    proud(M, trim, (x, y, z) => {
      const a = Math.atan2(dzOf(z), dxOf(x));
      const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 9);
      if (y === 12 && seg % 3 === 1) return C.leatherDark(x, y, z);
      return seg % 3 === 1 ? C.goldDark(x, y, z) : C.gold(x, y, z);
    });
  }
  if (!undead) {
    proud(M, (x, y, z) => y >= 24 && y <= 25 && Math.hypot(dxOf(x), dzOf(z)) < 4.6, (x, y, z) => (y === 24 ? shade(C.navy(x, y, z), 0.75) : null));
  }
  relief(M, before);
  return M;
}

export function paintFingers(side) {
  usePal(true);
  const M = new VoxelModel(12, 8, 12);
  for (const z of [2, 4, 6, 8]) {
    const len = z === 2 || z === 8 ? 4 : 5;
    for (let k = 0; k < len; k++) {
      const x = 5 + (side > 0 ? 0 : 0) + (k > 2 ? (side > 0 ? 1 : -1) * 0 : 0) + (k > 3 ? 0 : 0);
      for (const dx of [0, 1]) M.set(x + dx - (z === 2 || z === 8 ? 0 : 0), 7 - k, z, k === 2 || k === 4 ? C.boneDark(x, k, z) : C.bone(x + dx, 7 - k, z));
    }
  }
  M.box(4, 6, 3, 8, 8, 8, (x, y, z) => ((x + y + z) & 1 ? C.bone(x, y, z) : C.boneDark(x, y, z)));
  return M;
}

/* ---------------------------------------------------------------- leg */
export const LEG = { ox: 7.5, pivot: 43, oz: 8, knee: 22 };

export function paintLeg(undead, seed) {
  usePal(undead);
  const M = new VoxelModel(15, 48, 22);
  const CX = 7.5;
  const CZ = 8;
  const dxOf = (x) => x + 0.5 - CX;
  const dzOf = (z) => z + 0.5 - CZ;
  const FOOT_FRONT = 17;

  M.box(0, 0, 0, M.sx, 48, M.sz, (x, y, z) => {
    const dx = dxOf(x);
    const dz = dzOf(z);
    if (y < 17) {
      const inCuff = y >= 12;
      const rr = undead ? (inCuff ? 5.1 : y >= 6 ? 4.45 : 5.0) : inCuff ? 5.35 : y >= 6 ? 4.95 : 5.0;
      const shaft = y >= 6 && se(dx, dz, rr, rr, 3.2);
      let foot = false;
      if (y < 6) {
        const zf = z + 0.5;
        const top = 5.6 - Math.max(0, zf - 12) * 0.6;
        const wid = 5.1 - Math.max(0, zf - 14) * 0.5;
        foot = y + 0.5 < top && zf > 2.5 && zf < FOOT_FRONT - (y < 1 ? 0 : 0.6 * (y < 2 ? 1 : 0)) && Math.abs(dx) < wid && (zf < 3.6 ? Math.abs(dx) < 4.4 : true);
      }
      if (!shaft && !foot) return null;
      let c = C.boot(x, y, z);
      if (y === 0) c = shade(C.leatherDark(x, y, z), 0.8);
      else if (y === 1) c = shade(C.leatherDark(x, y, z), 1.1);
      else if (inCuff) {
        c = shade(C.boot(x, y, z), 1.12);
        if (y === 12) c = shade(c, 0.6);
        if (y === 16) c = shade(c, 1.2);
        if (y === 13 && (x + z) % 4 === 0) c = shade(c, 0.78);
      } else if (y >= 6 && (y === 8 || y === 10) && hash3(x, y, z, 31) < 0.7) c = shade(c, 0.74);
      if (foot && z > 12 && y >= 2 && y < 5 && Math.abs(dx) < 3.4) c = shade(c, 1.12);
      if (foot && z === 13 && y >= 2) c = shade(c, 0.7);
      return c;
    }
    const knee = y >= 19 && y <= 24;
    const rr = y < 20 ? 5.3 : 4.5 + (knee ? 0.25 : 0);
    if (!se(dx, dz, rr, rr, 3)) return null;
    if (undead) {
      if (y < 27 + Math.floor(hash3(x, 0, z, 33) * 5) - (hash3(x, 1, z >> 1, 35) < 0.2 ? 6 : 0)) return null;
      const inner = se(dx, dz, 2.5, 2.5, 2.4);
      if (inner) return DARK;
    }
    let f = 1;
    if (knee && dz > 0) f *= y === 22 || y === 21 ? 0.82 : 1;
    if (y >= 17 && y <= 20) f *= y === 17 ? 0.75 : 0.92;
    if (hash3(0, y, (x + z) >> 1, 34) < 0.09) f *= 0.85;
    let c = shade(C.pants(x, y, z), f);
    if (seed === 1 && y >= 21 && y <= 25 && dz > 1 && dx < 0 && dx > -3.6) c = shade(PAL.pants[3], 1.25 + hash3(x, y, z, 5) * 0.1);
    return c;
  });

  if (undead) {
    const bone = (x, y, z) => C.bone(x, y, z);
    for (let y = 17; y < 46; y++) {
      const r = y > 40 ? 2.1 : y > 23 && y < 33 ? 1.55 : y > 23 ? 1.7 : 1.5;
      for (let z = 0; z < M.sz; z++)
        for (let x = 0; x < M.sx; x++) if (Math.hypot(dxOf(x), dzOf(z)) < r && y > 24) M.set(x, y, z, bone(x, y, z));
    }
    for (let y = 17; y <= 27; y++) {
      const r = y >= 22 ? 2.4 : 2.1;
      for (let z = 0; z < M.sz; z++)
        for (let x = 0; x < M.sx; x++) {
          const d = Math.hypot(dxOf(x), dzOf(z));
          if (d < r) M.set(x, y, z, y === 22 || y === 19 ? C.boneDark(x, y, z) : bone(x, y, z));
        }
    }
    M.ellipsoid(CX, 22.5, CZ + 2.2, 1.7, 1.7, 1.0, (x, y, z) => shade(bone(x, y, z), 1.08));
    M.ellipsoid(CX + 2.5, 19, CZ - 0.4, 0.8, 3, 0.8, bone);
    for (let b = 0; b < 3; b++) {
      const cy = 28 + b * 5 + hash3(b, seed, 0, 9) * 2;
      const ang = hash3(b, seed, 1, 9) * Math.PI * 2;
      const cx = CX + Math.cos(ang) * 4.5;
      const cz = CZ + Math.sin(ang) * 4.5;
      for (let z = 0; z < M.sz; z++)
        for (let y = 24; y < 46; y++)
          for (let x = 0; x < M.sx; x++) {
            if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz) < 2.7 && Math.hypot(dxOf(x), dzOf(z)) > 1.9) M.clear(x, y, z);
          }
    }
  }
  return M;
}

/* -------------------------------------------------------------- cloth */
export const CLOTH = { ox: 15, oy: 24, oz: 11 };

export function paintCloth(undead) {
  usePal(undead);
  const K = new VoxelModel(30, 25, 24);
  const CX = 15;
  const CZ = 12;
  const top = 23;
  for (let y = top; y >= 3; y--) {
    const hang = top - y;
    const rx = 11.9 + hang * 0.17;
    const rz = 7.2 + hang * 0.15;
    for (let z = 0; z < K.sz; z++)
      for (let x = 0; x < K.sx; x++) {
        const dx = x + 0.5 - CX;
        const dz = z + 0.5 - CZ;
        if (!se(dx, dz, rx, rz, 3.4) || se(dx, dz, rx - 1.7, rz - 1.7, 3.4)) continue;
        const opening = 3.4 + hang * 0.4;
        if (dz > 0 && Math.abs(dx) < opening) continue;
        if (dz < 0 && Math.abs(dx) < 0.9 && hang > 4) continue;
        const hem = 4 + Math.floor(hash3(x, 0, z, 41) * (undead ? 5 : 2)) + (undead && hash3(x, 1, z, 42) < 0.3 ? 2 : 0);
        if (y < hem) continue;
        if (undead && hash3(x, y, z, 43) < 0.06) continue;
        const inner = se(dx, dz, rx - 2.4, rz - 2.4, 3.4) && hang > 1;
        let c = inner ? C.navyDark(x, y, z) : C.navy(x, y, z);
        const nearOpen = dz > 0 && Math.abs(dx) - opening < 1.4;
        const nearVent = dz < 0 && Math.abs(dx) < 2.1 && hang > 4;
        if (undead && y < hem + 2 && !nearOpen) c = hash3(x, y, z, 44) < 0.4 ? C.goldDark(x, y, z) : shade(C.navyDark(x, y, z), 1.2);
        else if (y < hem + 2 || nearOpen || nearVent) c = hash3(x, y, z, 44) < 0.88 ? C.gold(x, y, z) : C.goldDark(x, y, z);
        else if (hang === 0 || hang === 1) c = shade(C.navy(x, y, z), 0.7);
        if (!inner && hang > 2 && hash3(x >> 1, 0, z >> 1, 45) < 0.12) c = shade(c, 0.88);
        K.set(x, y, z, c);
      }
  }
  const sash = (x, y, z) => {
    const dx = x + 0.5 - CX;
    const len = undead ? 8 : 12;
    if (y > top || y < top - len + Math.floor(hash3(x, 0, 0, 5) * 3)) return null;
    if (dx < 2.6 || dx > 6.1 || z < CZ + 4 || z > CZ + 6) return null;
    if (undead && hash3(x, y, z, 6) < 0.18) return null;
    const f = y < top - 7 ? 0.82 : 1;
    return shade(undead ? mix(C.red(x, y, z), 0x2a0a0c, 0.35) : C.red(x, y, z), f * (z === CZ + 6 ? 1 : 0.88));
  };
  K.box(0, 0, 0, K.sx, K.sy, K.sz, sash);
  if (undead) tatter(K, { patch: 0.36, bone: 0.0, nibble: 0.16, seed: 3 });
  return K;
}

export function halfCloth(K, side) {
  return splitHalf(K, 15, side);
}

/* -------------------------------------------------------------- sword */
export const SWORD = { ox: 8, oy: 14.5, oz: 10.5 };

export function paintSword(bloody) {
  usePal(bloody);
  const M = new VoxelModel(16, 72, 26);
  const L = 44;
  const y0 = 22;
  const zc = (t) => 10.5 - 9.5 * t ** 1.7;
  for (let j = 0; j < L; j++) {
    const t = j / (L - 1);
    const y = y0 + j;
    const W = (4 + 2.8 * smoothstep(0.1, 0.72, t)) * (t > 0.88 ? 1 - ((t - 0.88) / 0.12) * 0.85 : 1);
    const spine = zc(t) - W * 0.45;
    const edge = zc(t) + W * 0.55;
    for (let z = Math.floor(spine); z <= Math.ceil(edge); z++) {
      const u = (z + 0.5 - spine) / Math.max(0.01, edge - spine);
      if (u < -0.05 || u > 1.05) continue;
      const thick = u > 0.78 ? 1 : 2;
      for (let k = 0; k < thick; k++) {
        const x = 7 + k;
        let c = C.steel(x, y, z);
        let f = 1;
        if (u < 0.22) f = 0.8;
        else if (u > 0.8) f = 1.2;
        else if (Math.abs(u - 0.45) < 0.1) f = 0.88;
        if (k === 1) f *= 0.86;
        if (j < 3) f *= 0.82;
        c = shade(c, f);
        if (bloody) {
          const cluster = hash3(x >> 2, y >> 2, z >> 1, 78);
          if (cluster < 0.2 && hash3(x, y, z, 77) < 0.55) c = shade(cluster < 0.07 ? C.blood(x, y, z) : C.rust(x, y, z), f);
          else if (u > 0.85 && hash3(x, y, z, 80) < 0.18) c = shade(C.rust(x, y, z), f);
        }
        M.set(x, y, z, c);
      }
    }
  }
  M.box(7, 10, 9, 9, 22, 12, (x, y, z) => {
    if (y % 3 === 0) return shade(C.leather(x, y, z), 1.25);
    return C.leatherDark(x, y, z);
  });
  M.box(6, 7, 9, 10, 10, 13, (x, y, z) => (y === 7 && (x === 6 || x === 9) ? null : C.gold(x, y, z)));
  M.box(7, 5, 10, 9, 7, 12, C.goldDark);
  M.box(6, 20, 5, 10, 22, 16, (x, y, z) => (z < 6 && y === 20 ? null : C.gold(x, y, z)));
  M.box(7, 22, 8, 9, 23, 14, C.goldDark);
  M.box(6, 21, 4, 10, 24, 5, C.gold);
  M.box(6, 19, 15, 10, 21, 18, C.gold);
  for (let s = 0; s <= 1.001; s += 0.04) {
    const y = 19 - 12 * s;
    const z = 16 + 2.4 * Math.sin(Math.PI * s);
    for (let x = 7; x < 9; x++) {
      const ring = Math.round(s * 14) % 2 === 0;
      M.set(x, Math.round(y), Math.round(z), ring ? C.gold(x, y, z) : C.goldDark(x, y, z));
      M.set(x, Math.round(y), Math.round(z) + 1, ring ? C.goldDark(x, y, z) : C.gold(x, y, z));
    }
  }
  return M;
}
