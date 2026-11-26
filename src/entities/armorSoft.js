import { hash3, jitter } from '../engine/voxel.js';
import { BUDGE } from '../data/budge.js';
import { DARK } from '../data/darksycle.js';
import { VOLC } from '../data/volcanum.js';
import { YETI } from '../data/yeti.js';

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));

/** Colour sets for the soft armor families. `glow` is optional emissive trim. */
export const SOFT_PALETTES = {
  budgeleather: {
    main: 0x4f8f3c, lo: 0x376b2b, hi: 0x72b255, strap: 0x6b4a2a, strapHi: 0x8c6336, trim: BUDGE.belly, trimLo: BUDGE.bellyDark,
    bone: BUDGE.horn, boneLo: BUDGE.hornDark, scale: BUDGE.scale, scaleLo: BUDGE.scaleLo, glow: null, accent: BUDGE.ember,
  },
  budgecloth: {
    main: 0x2fae62, lo: 0x1f8a4c, hi: 0x66d890, strap: 0xe6d27a, strapHi: 0xf6e6a0, trim: BUDGE.belly, trimLo: BUDGE.bellyDark,
    bone: BUDGE.horn, boneLo: BUDGE.hornDark, scale: BUDGE.scale, scaleLo: BUDGE.scaleLo, glow: null, accent: BUDGE.ember,
  },
  darkleather: {
    main: 0x3b3268, lo: 0x251f48, hi: 0x574c9c, strap: 0x1d1736, strapHi: 0x372d62, trim: DARK.trim, trimLo: DARK.bladeDark,
    bone: DARK.blade, boneLo: DARK.bladeDark, scale: DARK.scale, scaleLo: DARK.scaleLo, glow: DARK.glow, accent: DARK.glowHi,
  },
  yetileather: {
    main: 0xaecbe3, lo: 0x7fa6c8, hi: 0xdcecf8, strap: YETI.leather, strapHi: YETI.leatherHi, trim: YETI.trim, trimLo: YETI.trimLo,
    bone: YETI.claw, boneLo: YETI.furLo, scale: 0x9ab8d4, scaleLo: 0x5d84ac, glow: null, accent: YETI.glow,
  },
  yeticloth: {
    main: 0xcfe2f1, lo: 0x9dbfdc, hi: 0xeef7ff, strap: 0x6fa0cf, strapHi: 0xa9dcff, trim: YETI.trim, trimLo: YETI.trimLo,
    bone: YETI.claw, boneLo: YETI.furLo, scale: 0x9ab8d4, scaleLo: 0x5d84ac, glow: YETI.glow, accent: YETI.glowHi,
  },
  darkcloth: {
    main: 0x4a3a9c, lo: 0x33296a, hi: 0x7a64d0, strap: 0x8a7ad0, strapHi: 0xb8aae8, trim: DARK.trim, trimLo: DARK.bladeDark,
    bone: DARK.blade, boneLo: DARK.bladeDark, scale: DARK.scale, scaleLo: DARK.scaleLo, glow: DARK.glow, accent: DARK.glowHi,
  },
  volcanumleather: {
    main: 0x2a2428, lo: 0x161214, hi: 0x4a4048, strap: 0x3a2014, strapHi: 0x6a3820, trim: VOLC.trim, trimLo: VOLC.bellyDark,
    bone: VOLC.claw, boneLo: VOLC.scale, scale: VOLC.scaleHi, scaleLo: VOLC.scale, glow: VOLC.glow, accent: VOLC.glowHi,
  },
  volcanumcloth: {
    main: 0x3a2068, lo: 0x241448, hi: 0x7a4cb0, strap: 0xff6a12, strapHi: 0xffe08a, trim: VOLC.trim, trimLo: VOLC.bellyDark,
    bone: VOLC.claw, boneLo: VOLC.scale, scale: VOLC.scaleHi, scaleLo: VOLC.scale, glow: VOLC.glow, accent: VOLC.glowHi,
  },
};

function fill(set, x0, y0, z0, x1, y1, z1, fn) {
  for (let z = z0; z < z1; z++)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const c = typeof fn === 'function' ? fn(x, y, z) : fn;
        if (c !== null && c !== undefined) set(x, y, z, c);
      }
}

/** Leather painters (hide caps, jerkins, bracers, straps) for a palette. */
function leather(P, id) {
  const seed = id.length * 11;
  const m = (x, y, z, s = 0) => J(((x + (y >> 2)) & 3) === 0 ? P.lo : P.main, x, y, z, seed + s, 0.05);
  const strap = (x, y, z, s = 0) => J(P.strap, x, y, z, seed + s, 0.05);
  const glow = P.glow;

  const paintHelm = (H, rowY) => {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(3); y <= rowY(14) + 3; y++)
      for (let z = 3; z <= 16; z++)
        for (let x = 3; x <= 16; x++) {
          const dx = (x + 0.5 - 10) / 8.1;
          const dz = (z + 0.5 - 10) / 8.1;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(7);
          const top = rowY(12) + Math.round(3.2 * (1 - d2 * 0.95) * (1 - d2 * 0.3));
          if (upper && y > top) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(3) + 1 && z > 11) continue;
          if (z >= 14 && y < rowY(9)) continue;
          const band = y === rowY(7) || (y === rowY(8) && z >= 12);
          const seam = upper && (x === 9 || x === 10 || (z + y) % 7 === 0);
          set(x, y, z, band ? strap(x, y, z, 1) : seam ? J(P.lo, x, y, z, seed + 2, 0.05) : m(x, y, z, 3));
        }
    for (let x = 5; x <= 14; x++) {
      set(x, rowY(8), 16, P.scale === BUDGE.scale ? J(P.scale, x, 8, 16, seed + 4, 0.05) : strap(x, 8, 16, 5));
      if (x % 3 === 0) set(x, rowY(7), 16, J(P.trim, x, 7, 16, seed + 6, 0.03));
    }
    if (glow) {
      for (const x of [9, 10]) set(x, rowY(9), 16, glow, true);
      for (let z = 4; z <= 14; z++) {
        const h = z % 3 === 0 ? 3 : 2;
        for (let k = 0; k < h; k++) for (const x of [9, 10]) set(x, rowY(12) + 2 + k, z, k === h - 1 ? DARK.edge : J(P.bone, x, k, z, seed + 7, 0.03));
      }
    } else {
      for (const sx of [4, 15]) {
        const dir = sx < 10 ? -1 : 1;
        for (let k = 0; k < 6; k++) {
          const w = k < 3 ? 2 : 1;
          for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) set(sx + dir * Math.floor(k * 0.5) + (dir < 0 ? a : -a), rowY(11) + k, 9 + b, k % 3 === 2 ? J(P.boneLo, k, a, b, seed + 8, 0.03) : J(P.bone, k, a, b, seed + 9, 0.03));
        }
      }
    }
  };

  const paintChest = (T, ty) => {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        const panel = x === 5 || x === 20 || x === 12 || x === 13;
        set(x, y, 13, m(x, y, 13, 11));
        set(x, y, 14, y >= 7 && x >= 7 && x <= 18 ? (panel ? J(P.lo, x, y, 14, seed + 12, 0.05) : m(x, y, 14, 13)) : m(x, y, 13, 14));
        set(x, y, 4, m(x, y, 4, 15));
      }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, m(x, y, z, 16));
    }
    for (let y = 8; y <= 17; y++) {
      if (y % 2) for (const x of [12, 13]) set(x, y, 15, strap(x, y, 15, 17));
      else for (const x of [11, 14]) set(x, y, 15, J(P.strapHi, x, y, 15, seed + 18, 0.04));
    }
    for (let y = 5; y <= 6; y++) {
      for (let x = 4; x <= 21; x++) {
        set(x, y, 14, y === 5 ? strap(x, y, 14, 19) : J(P.strapHi, x, y, 14, seed + 20, 0.04));
        set(x, y, 3, strap(x, y, 3, 21));
      }
      for (const x of [4, 21]) for (let z = 4; z <= 13; z++) set(x, y, z, strap(x, y, z, 22));
    }
    for (let x = 11; x <= 14; x++) for (let y = 5; y <= 6; y++) set(x, y, 15, J(P.trim, x, y, 15, seed + 23, 0.03));
    for (let x = 5; x <= 20; x++) for (let z = 3; z <= 14; z++) {
      const edge = x <= 7 || x >= 18 || z <= 4 || z >= 13;
      if (edge) set(x, 19, z, (x + z) % 4 === 0 ? J(P.trim, x, 19, z, seed + 24, 0.03) : strap(x, 19, z, 25));
    }
    for (let x = 4; x <= 21; x++) for (let z = 4; z <= 13; z++) {
      if (x > 7 && x < 18) continue;
      set(x, 19, z, m(x, 19, z, 26));
      if (x <= 5 || x >= 20) set(x, 20, z, J(P.strapHi, x, 20, z, seed + 27, 0.04));
    }
    for (let k = 0; k < 11; k++) {
      const x1 = 6 + k;
      const x2 = 19 - k;
      const y = 18 - Math.floor(k * 1.0);
      for (const x of [x1, x2]) {
        set(x, y, 3, strap(x, y, 3, 28));
        set(x, y, 2, J(P.strapHi, x, y, 2, seed + 29, 0.04));
      }
    }
    for (const x of [8, 17]) for (let y = 7; y <= 17; y += 2) set(x, y, 15, J(P.bone, x, y, 15, seed + 30, 0.03));
    if (glow) for (let y = 7; y <= 17; y += 2) for (const x of [10, 15]) set(x, y, 15, glow, true);
    else for (let y = 9; y <= 15; y += 3) for (const x of [10, 15]) set(x, y, 15, J(P.scale, x, y, 15, seed + 31, 0.04));
  };

  const paintArm = (A, set) => {
    fill(set, 3, 3, 3, 10, 6, 11, (x, y, z) => (y === 5 ? J(P.strapHi, x, y, z, seed + 40, 0.04) : m(x, y, z, 41)));
    for (const x of [4, 6, 8]) set(x, 4, 11, J(P.bone, x, 4, 11, seed + 42, 0.03));
    fill(set, 2, 6, 2, 11, 15, 12, (x, y, z) => (y === 8 || y === 11 || y === 14 ? strap(x, y, z, 43) : m(x, y, z, 44)));
    fill(set, 11, 8, 4, 12, 13, 9, (x, y, z) => ((y + z) % 2 ? J(P.bone, x, y, z, seed + 45, 0.03) : J(P.boneLo, x, y, z, seed + 46, 0.03)));
    for (const y of [9, 12]) set(2, y, 6, J(P.trim, 2, y, 6, seed + 47, 0.03));
    fill(set, 2, 21, 2, 11, 26, 12, (x, y, z) => (y === 21 ? strap(x, y, z, 48) : y === 25 ? J(P.strapHi, x, y, z, seed + 49, 0.04) : m(x, y, z, 50)));
    fill(set, 12, 21, 3, 13, 25, 11, (x, y, z) => ((y + z) % 2 ? J(P.strapHi, x, y, z, seed + 51, 0.04) : strap(x, y, z, 52)));
    for (let z = 4; z <= 9; z += 2) set(12, 23, z, J(P.trim, 12, 23, z, seed + 53, 0.03));
    if (glow) for (const y of [9, 12]) set(2, y, 8, glow, true);
  };

  const paintLeg = (set, flags) => {
    if (flags.legs) {
      fill(set, 2, 12, 2, 11, 24, 11, (x, y, z) => (y === 13 || y === 18 || y === 23 ? strap(x, y, z, 60) : m(x, y, z, 61)));
      fill(set, 2, 10, 2, 11, 12, 11, (x, y, z) => J(P.strapHi, x, y, z, seed + 62, 0.04));
      fill(set, 4, 19, 11, 9, 22, 12, (x, y, z) => ((x + y) % 2 ? J(P.scale, x, y, z, seed + 63, 0.04) : J(P.scaleLo, x, y, z, seed + 64, 0.04)));
      for (let y = 14; y <= 22; y += 4) set(6, y, 11, J(P.trim, 6, y, 11, seed + 65, 0.03));
      if (glow) for (let y = 14; y < 24; y += 5) set(9, y, 10, glow, true);
    }
    if (flags.boots) {
      fill(set, 2, 2, 2, 11, 10, 11, (x, y, z) => (y === 9 ? J(P.strapHi, x, y, z, seed + 70, 0.04) : m(x, y, z, 71)));
      fill(set, 2, 8, 2, 11, 10, 11, (x, y, z) => ((x + z) % 2 ? J(P.hi, x, y, z, seed + 72, 0.04) : J(P.main, x, y, z, seed + 73, 0.04)));
      fill(set, 2, 0, 2, 11, 1, 13, (x, y, z) => J(P.strap, x, y, z, seed + 74, 0.04));
      fill(set, 2, 1, 3, 11, 4, 13, (x, y, z) => m(x, y, z, 75));
      fill(set, 3, 4, 10, 10, 5, 12, (x, y, z) => m(x, y, z, 76));
      fill(set, 3, 1, 12, 10, 3, 14, (x, y, z) => J(P.boneLo, x, y, z, seed + 77, 0.04));
      for (let y = 4; y <= 7; y += 3) fill(set, 2, y, 2, 11, y + 1, 11, (x, yy, z) => ((x === 2 || x === 10 || z === 2 || z === 10) ? strap(x, yy, z, 78) : null));
      if (glow) for (let z = 4; z <= 11; z += 2) set(10, 1, z, glow, true);
    }
  };

  return { paintHelm, paintChest, paintArm, paintLeg };
}

/** Cloth painters (hoods, robes, flared cuffs, sashes) for a palette. */
function cloth(P, id) {
  const seed = id.length * 7 + 3;
  const m = (x, y, z, s = 0) => J(((x + y + (z >> 1)) & 3) === 0 ? P.lo : P.main, x, y, z, seed + s, 0.04);
  const trim = (x, y, z, s = 0) => J(P.strap, x, y, z, seed + s, 0.04);
  const glow = P.glow;

  const paintHelm = (H, rowY) => {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(0); y <= rowY(14) + 3; y++)
      for (let z = 2; z <= 17; z++)
        for (let x = 2; x <= 17; x++) {
          const dx = (x + 0.5 - 10) / 8.6;
          const dz = (z + 0.5 - 10) / 8.6;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(6);
          const top = rowY(12) + Math.round(3.6 * (1 - d2 * 0.9));
          if (upper && y > top) continue;
          const face = z >= 14 && x >= 5 && x <= 14 && y < rowY(10);
          if (face) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5.2;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(2) && !back) continue;
          set(x, y, z, m(x, y, z, 1));
        }
    for (let x = 4; x <= 15; x++) for (const z of [15, 16, 17]) {
      if (z === 17 && Math.abs(x - 9.5) > 3) continue;
      set(x, rowY(10), z, trim(x, 10, z, 2));
      set(x, rowY(11), z, z === 17 ? m(x, 11, z, 3) : trim(x, 11, z, 4));
    }
    for (let k = 0; k < 9; k++) {
      const y = rowY(12) + 2 + Math.round(k * 0.85);
      const z = 9 - Math.round(k * 0.95);
      const w = k < 3 ? 3 : k < 6 ? 2 : 1;
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) set(9 + a, y, z + b, k === 8 ? J(P.accent, k, a, b, seed + 5, 0.02) : m(9 + a, y, z + b, 6));
    }
    if (glow) {
      for (const x of [9, 10]) for (const y of [rowY(10), rowY(11)]) set(x, y, 17, y === rowY(10) ? DARK.glowHi : glow, true);
    } else {
      for (const x of [9, 10]) set(x, rowY(10), 17, J(P.accent, x, 0, 0, seed + 9, 0.02), true);
    }
  };

  const paintChest = (T, ty) => {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        set(x, y, 13, m(x, y, 13, 11));
        set(x, y, 14, y >= 8 && x >= 6 && x <= 19 ? m(x, y, 14, 12) : m(x, y, 13, 13));
        set(x, y, 4, m(x, y, 4, 14));
      }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, m(x, y, z, 15));
    }
    for (let k = 0; k < 7; k++) {
      const y = 18 - k;
      for (const x of [8 + k, 17 - k]) {
        set(x, y, 15, trim(x, y, 15, 16));
        set(x + (x < 12 ? 1 : -1), y, 15, J(P.strapHi, x, y, 15, seed + 17, 0.04));
      }
    }
    for (let x = 11; x <= 14; x++) for (let y = 11; y <= 14; y++) if (Math.abs(x - 12.5) + Math.abs(y - 12.5) < 2.6) set(x, y, 14, J(P.lo, x, y, 14, seed + 18, 0.04));
    for (let y = 5; y <= 7; y++) {
      for (let x = 4; x <= 21; x++) {
        set(x, y, 15 - (y === 7 ? 1 : 0), y === 6 ? J(P.trimLo, x, y, 15, seed + 19, 0.03) : trim(x, y, 15, 20));
        set(x, y, 3, trim(x, y, 3, 21));
      }
      for (const x of [3, 22]) for (let z = 4; z <= 13; z++) set(x, y, z, trim(x, y, z, 22));
    }
    for (let x = 11; x <= 14; x++) for (let y = 5; y <= 7; y++) for (let z = 15; z <= 16; z++) set(x, y, z, J(P.trim, x, y, z, seed + 23, 0.03));
    for (let y = -9; y <= 4; y++) {
      const edge = y === -9;
      for (let x = 7; x <= 18; x++) {
        set(x, y, 14, edge ? J(P.trim, x, y, 14, seed + 24, 0.03) : y % 4 === 0 ? J(P.lo, x, y, 14, seed + 25, 0.04) : m(x, y, 14, 26));
        set(x, y, 3, edge ? J(P.trim, x, y, 3, seed + 27, 0.03) : m(x, y, 3, 28));
      }
    }
    for (let y = -4; y <= 4; y++) for (const x of [12, 13]) set(x, y, 15, y < -3 ? J(P.accent, x, y, 15, seed + 29, 0.03) : trim(x, y, 15, 30));
    for (let x = 4; x <= 21; x++) for (let z = 3; z <= 14; z++) {
      const edge = x <= 6 || x >= 19 || z <= 4 || z >= 13;
      if (edge) set(x, 19, z, (x + z) % 3 === 0 ? J(P.trim, x, 19, z, seed + 31, 0.03) : m(x, 19, z, 32));
      if ((x <= 5 || x >= 20) && z >= 4 && z <= 13) set(x, 20, z, m(x, 20, z, 33));
      if (x <= 4 || x >= 21) if (z >= 4 && z <= 13) set(x, 19, z, trim(x, 19, z, 34));
    }
    if (glow) {
      for (const [x, y] of [[12, 15], [13, 15], [12, 16], [13, 16]]) set(x, y, 16, y === 15 ? DARK.glowHi : glow, true);
      for (let x = 6; x <= 19; x += 3) set(x, -9, 15, glow, true);
    } else {
      for (const [x, y] of [[12, 14], [13, 14], [12, 15], [13, 15]]) set(x, y, 16, J(P.accent, x, y, 16, seed + 35, 0.02), true);
    }
  };

  const paintArm = (A, set) => {
    fill(set, 3, 3, 3, 10, 7, 11, (x, y, z) => (y === 6 ? trim(x, y, z, 40) : J(P.hi, x, y, z, seed + 41, 0.04)));
    fill(set, 2, 7, 2, 11, 10, 12, (x, y, z) => (y === 7 ? trim(x, y, z, 42) : m(x, y, z, 43)));
    fill(set, 3, 10, 3, 10, 21, 11, (x, y, z) => (y === 15 ? J(P.lo, x, y, z, seed + 44, 0.04) : m(x, y, z, 45)));
    fill(set, 2, 9, 2, 11, 10, 12, (x, y, z) => trim(x, y, z, 46));
    fill(set, 2, 21, 2, 11, 24, 12, (x, y, z) => (y === 21 ? trim(x, y, z, 47) : m(x, y, z, 48)));
    for (const x of [3, 6, 9]) set(x, 25, 6, J(P.trim, x, 25, 6, seed + 49, 0.03));
    if (glow) for (const y of [7, 9]) for (const z of [4, 7, 10]) set(2, y, z, glow, true);
  };

  const paintLeg = (set, flags) => {
    if (flags.legs) {
      fill(set, 2, 12, 2, 11, 23, 11, (x, y, z) => (y === 17 ? J(P.strapHi, x, y, z, seed + 60, 0.04) : m(x, y, z, 61)));
      fill(set, 2, 10, 2, 11, 13, 11, (x, y, z) => (y === 10 ? trim(x, y, z, 62) : J(P.lo, x, y, z, seed + 63, 0.04)));
      fill(set, 2, 23, 2, 11, 24, 11, (x, y, z) => trim(x, y, z, 64));
      for (let y = 14; y <= 21; y += 2) set(6, y, 11, J(P.lo, 6, y, 11, seed + 65, 0.04));
      if (glow) for (const x of [3, 9]) set(x, 17, 11, glow, true);
    }
    if (flags.boots) {
      fill(set, 3, 1, 3, 10, 7, 10, (x, y, z) => m(x, y, z, 70));
      fill(set, 2, 5, 2, 11, 8, 11, (x, y, z) => (y === 5 ? trim(x, y, z, 71) : m(x, y, z, 72)));
      fill(set, 2, 0, 3, 11, 1, 13, (x, y, z) => J(P.lo, x, y, z, seed + 73, 0.04));
      fill(set, 2, 1, 3, 11, 4, 13, (x, y, z) => m(x, y, z, 74));
      fill(set, 4, 3, 13, 9, 4, 14, (x, y, z) => m(x, y, z, 75));
      fill(set, 5, 4, 13, 8, 5, 15, (x, y, z) => J(P.accent === BUDGE.ember ? P.hi : P.strapHi, x, y, z, seed + 76, 0.03));
      if (glow) for (let z = 4; z <= 11; z += 2) set(10, 1, z, glow, true);
    }
  };

  return { paintHelm, paintChest, paintArm, paintLeg };
}

export function makeSoftArmor(setId) {
  const P = SOFT_PALETTES[setId];
  return setId.endsWith('cloth') ? cloth(P, setId) : leather(P, setId);
}
