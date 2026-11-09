import { hash3, jitter, shade } from '../engine/voxel.js';
import { BUDGE } from '../data/budge.js';
import { DARK } from '../data/darksycle.js';
import { YETI } from '../data/yeti.js';
import { SOFT_PALETTES } from './armorSoft.js';

const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));

const METAL = {
  budgeset: { a: BUDGE.horn, b: BUDGE.hornDark, g: BUDGE.belly, gd: BUDGE.bellyDark, glow: null, hot: BUDGE.vein, edge: BUDGE.claw, base: BUDGE.scale },
  yetiset: { a: YETI.iceHi, b: YETI.ice, g: YETI.leather, gd: YETI.leatherLo, glow: YETI.glow, hot: YETI.glowHi, edge: YETI.furWhite, base: 0x95b6d3 },
  darksyceset: { a: DARK.blade, b: DARK.bladeDark, g: DARK.trim, gd: DARK.bladeDark, glow: DARK.glow, hot: DARK.glowHi, edge: DARK.edge, base: DARK.scale },
};

/** Per-piece detail layers painted after the base painters: relief, stitching, plates and emblems. */
function metalDetail(M, id) {
  return {
    chest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2;
        const x = Math.round(12.5 + Math.cos(ang) * 4.2 - 0.5);
        const y = Math.round(11.5 + Math.sin(ang) * 4.2 - 0.5);
        set(x, y, 3, a % 5 === 0 ? J(M.edge, x, y, 3, id.length + a) : J(M.g, x, y, 3, id.length + a));
      }
      for (const [x, y] of [[12, 12], [13, 12], [12, 11], [13, 11]]) set(x, y, 3, M.glow ? M.glow : M.hot, !!M.glow);
      for (const [x, y] of [[12, 14], [13, 14], [12, 9], [13, 9], [10, 12], [15, 12]]) set(x, y, 3, J(M.a, x, y, 3, 5));
      for (let y = 5; y <= 18; y++) {
        set(5, y, 12, y % 2 ? J(M.gd, 5, y, 12, 6) : J(M.g, 5, y, 12, 7));
        set(20, y, 12, y % 2 ? J(M.gd, 20, y, 12, 8) : J(M.g, 20, y, 12, 9));
      }
    },
    arm(A, set) {
      for (let k = 0; k < 4; k++) {
        const col = k > 2 ? M.edge : k % 2 ? M.b : M.a;
        for (const z of [6, 7]) set(1 - Math.floor(k * 0.6), 15 + (k > 1 ? 0 : 0), z, J(col, k, z, 0, 10));
      }
      set(1, 16, 6, J(M.a, 1, 16, 6, 11));
      set(1, 14, 6, J(M.a, 1, 14, 6, 12));
      if (M.glow) set(1, 15, 8, M.glow, true);
      void A;
    },
    leg(set, flags) {
      if (flags.legs) {
        for (let y = 15; y <= 19; y++)
          for (let x = 4; x <= 8; x++) {
            const d = Math.abs(x - 6) + Math.abs(y - 17) * 0.8;
            if (d > 2.7) continue;
            set(x, y, 12, d > 1.8 ? J(M.g, x, y, 12, 13) : J(M.a, x, y, 12, 14));
          }
        set(6, 17, 13, J(M.edge, 6, 17, 13, 15, 0.02));
        set(6, 17, 14, J(M.edge, 6, 17, 14, 16, 0.02));
        if (M.glow) set(6, 18, 13, M.glow, true);
        for (let y = 12; y <= 23; y++) {
          set(1, y, 6, y % 2 ? J(M.gd, 1, y, 6, 17) : J(M.g, 1, y, 6, 18));
        }
      }
    },
    helm(H, rowY) {
      for (let x = 5; x <= 14; x++) {
        set3(H, x, rowY(4), 2, x % 2 ? J(M.g, x, 4, 2, 19) : J(M.gd, x, 4, 2, 20));
        set3(H, x, rowY(5), 2, J(M.base, x, 5, 2, 21));
      }
      for (const y of [rowY(5), rowY(6)]) for (const x of [3, 16]) set3(H, x, y, 11, J(M.g, x, y, 11, 22));
      set3(H, 9, rowY(8), 2, M.glow || M.hot, !!M.glow);
      set3(H, 10, rowY(8), 2, M.glow || M.hot, !!M.glow);
    },
  };
}

const set3 = (M, x, y, z, c, g) => M.set(x, y, z, c, g);

function softDetail(P, id, cloth) {
  const seed = id.length * 5;
  return {
    chest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      if (cloth) {
        for (let y = -9; y <= 4; y++) {
          for (const x of [8, 10, 15, 17]) {
            set(x, y, 14, J(P.lo, x, y, 14, seed + 1));
            set(x, y, 3, J(P.lo, x, y, 3, seed + 2));
          }
          if (y % 3 === 0) for (const x of [9, 16]) set(x, y, 14, J(P.hi, x, y, 14, seed + 3));
        }
        for (let x = 6; x <= 19; x++) set(x, -10, x % 2 ? 14 : 3, J(P.trim, x, -10, 14, seed + 4));
        for (let a = 0; a < 36; a++) {
          const ang = (a / 36) * Math.PI * 2;
          const x = Math.round(12.5 + Math.cos(ang) * 3.8 - 0.5);
          const y = Math.round(11.5 + Math.sin(ang) * 3.8 - 0.5);
          set(x, y, 2, J(P.trim, x, y, 2, seed + a), false);
        }
        for (const [x, y] of [[12, 12], [13, 12], [12, 11], [13, 11], [12, 13], [13, 10]]) set(x, y, 2, P.glow || P.accent, !!P.glow);
        for (const [x, y] of [[8, 11], [17, 11], [12, 16], [13, 7]]) set(x, y, 2, J(P.strapHi, x, y, 2, seed + 7));
      } else {
        for (let y = 5; y <= 18; y++) {
          set(12, y, 3, y % 2 ? J(P.strapHi, 12, y, 3, seed + 8) : J(P.lo, 12, y, 3, seed + 9));
          set(13, y, 3, y % 2 ? J(P.lo, 13, y, 3, seed + 10) : J(P.strapHi, 13, y, 3, seed + 11));
        }
        for (let y = 6; y <= 17; y++) set(3, y, y % 2 ? 7 : 9, J(P.strapHi, 3, y, 8, seed + 12));
        for (let y = 6; y <= 17; y++) set(22, y, y % 2 ? 7 : 9, J(P.strapHi, 22, y, 8, seed + 13));
        for (const [x, y] of [[8, 14], [17, 14], [8, 8], [17, 8]]) {
          set(x, y, 3, J(P.bone, x, y, 3, seed + 14));
          set(x + 1, y, 3, J(P.boneLo, x, y, 3, seed + 15));
        }
        for (let x = 5; x <= 20; x++) set(x, 4, 14, x % 4 === 0 ? J(P.bone, x, 4, 14, seed + 16) : J(P.strapHi, x, 4, 14, seed + 17));
        if (P.glow) for (const [x, y] of [[8, 14], [17, 14]]) set(x, y, 2, P.glow, true);
      }
    },
    arm(A, set) {
      if (cloth) {
        for (let y = 12; y <= 18; y++)
          for (let z = 4; z <= 9; z++) {
            const d = Math.abs(z - 6.5) + Math.abs(y - 15) * 0.9;
            if (d > 3) continue;
            set(1, y, z, d > 2 ? J(P.trim, 1, y, z, seed + 20) : J(P.glow || P.accent, 1, y, z, seed + 21), d < 1.2 && !!P.glow);
          }
        for (let z = 3; z <= 10; z++) set(2, 6, z, z % 2 ? J(P.trim, 2, 6, z, seed + 22) : J(P.strapHi, 2, 6, z, seed + 23));
      } else {
        for (let z = 4; z <= 9; z += 1) set(1, 10, z, z % 2 ? J(P.strapHi, 1, 10, z, seed + 24) : J(P.strap, 1, 10, z, seed + 25));
        for (const z of [5, 8]) {
          set(1, 9, z, J(P.bone, 1, 9, z, seed + 26));
          set(1, 11, z, J(P.bone, 1, 11, z, seed + 27));
        }
        for (let y = 15; y <= 19; y++) set(1, y, 6, y % 2 ? J(P.strapHi, 1, y, 6, seed + 28) : J(P.strap, 1, y, 6, seed + 29));
      }
      void A;
    },
    leg(set, flags) {
      if (flags.legs) {
        if (cloth) {
          for (let y = 11; y <= 22; y++) for (const x of [4, 8]) set(x, y, 11, y % 2 ? J(P.lo, x, y, 11, seed + 30) : J(P.hi, x, y, 11, seed + 31));
          for (let x = 3; x <= 9; x++) set(x, 11, 11, J(P.trim, x, 11, 11, seed + 32));
        } else {
          for (let y = 15; y <= 19; y++)
            for (let x = 4; x <= 8; x++) {
              const d = Math.abs(x - 6) + Math.abs(y - 17) * 0.8;
              if (d > 2.6) continue;
              set(x, y, 12, d > 1.7 ? J(P.strapHi, x, y, 12, seed + 33) : J(P.bone, x, y, 12, seed + 34));
            }
          set(6, 17, 13, J(P.boneLo, 6, 17, 13, seed + 35));
          for (let y = 12; y <= 22; y += 2) set(1, y, 6, J(P.strapHi, 1, y, 6, seed + 36));
        }
      }
      if (flags.boots) {
        if (cloth) {
          for (let x = 4; x <= 8; x++) set(x, 6, 11, x % 2 ? J(P.trim, x, 6, 11, seed + 37) : J(P.strapHi, x, 6, 11, seed + 38));
          set(6, 5, 12, J(P.glow || P.accent, 6, 5, 12, seed + 39), !!P.glow);
          set(6, 4, 12, J(P.trim, 6, 4, 12, seed + 40));
        } else {
          for (let y = 4; y <= 8; y++) set(y % 2 ? 5 : 7, y, 11, J(P.strapHi, 5, y, 11, seed + 41));
          for (let y = 4; y <= 8; y++) set(6, y, 11, J(P.strap, 6, y, 11, seed + 42));
          for (const y of [4, 6, 8]) set(8, y, 11, J(P.trim, 8, y, 11, seed + 43));
        }
      }
    },
    helm(H, rowY) {
      if (cloth) {
        for (let y = rowY(2); y <= rowY(10); y++) for (const x of [9, 10]) set3(H, x, y, 1, y % 2 ? J(P.trim, x, y, 1, seed + 44) : J(P.strapHi, x, y, 1, seed + 45));
        for (const x of [8, 11]) set3(H, x, rowY(8), 1, J(P.trim, x, 8, 1, seed + 46));
        set3(H, 9, rowY(7), 0, P.glow || P.accent, !!P.glow);
        set3(H, 10, rowY(7), 0, P.glow || P.accent, !!P.glow);
        for (const y of [rowY(1), rowY(0)]) for (const x of [9, 10]) set3(H, x, y, 1, J(P.strapHi, x, y, 1, seed + 47));
      } else {
        for (let y = rowY(4); y <= rowY(9); y++) {
          set3(H, y % 2 ? 9 : 10, y, 2, J(P.strapHi, 9, y, 2, seed + 48));
          set3(H, y % 2 ? 10 : 9, y, 2, J(P.strap, 10, y, 2, seed + 49));
        }
        for (const x of [3, 16]) for (const y of [rowY(5), rowY(7)]) set3(H, x, y, 9, J(P.bone, x, y, 9, seed + 50));
      }
    },
  };
}

const DETAIL = {};
function detailFor(setId) {
  if (DETAIL[setId]) return DETAIL[setId];
  let d = null;
  if (METAL[setId]) d = metalDetail(METAL[setId], setId);
  else if (SOFT_PALETTES[setId]) d = softDetail(SOFT_PALETTES[setId], setId, setId.endsWith('cloth'));
  DETAIL[setId] = d;
  return d;
}

/** Wraps a painter module so its pieces gain the detail layers for `setId`. */
export function withDetail(setId, mod) {
  const d = detailFor(setId);
  if (!d) return mod;
  return {
    paintHelm(H, rowY) {
      mod.paintHelm(H, rowY);
      d.helm(H, rowY);
    },
    paintChest(T, ty) {
      mod.paintChest(T, ty);
      d.chest(T, ty);
    },
    paintArm(A, set, parts) {
      mod.paintArm(A, set, parts);
      d.arm(A, set);
    },
    paintLeg(set, flags) {
      mod.paintLeg(set, flags);
      d.leg(set, flags);
    },
  };
}

void shade;
