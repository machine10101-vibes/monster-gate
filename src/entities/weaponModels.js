import { VoxelModel, hash3, jitter, shade } from '../engine/voxel.js';
import { BUDGE } from '../data/budge.js';
import { DARK } from '../data/darksycle.js';

const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));

/** Held kinds that wield a matching blade in each hand. */
export const DUAL_KINDS = new Set(['dual', 'budgedual', 'darkdual']);
/** Held kinds whose model is taller than wide (bows). */
export const TALL_KINDS = new Set(['budgebow', 'darkbow', 'budgeshortbow', 'darkshortbow']);

const THEMES = {
  budge: {
    wrap: BUDGE.scale, wrapLo: BUDGE.scaleLo, wrapHi: BUDGE.scaleHi, blade: BUDGE.horn, edge: BUDGE.claw, dark: BUDGE.hornDark,
    guard: BUDGE.bellyDark, guardHi: BUDGE.belly, glow: BUDGE.vein, glow2: BUDGE.ember, wood: 0x7a4e2c, string: 0xe8e0c8,
    membrane: BUDGE.membrane, membraneHi: BUDGE.membraneHi, claw: BUDGE.claw,
  },
  dark: {
    wrap: 0x3d3378, wrapLo: 0x2b2450, wrapHi: 0x6a5cb8, blade: DARK.blade, edge: DARK.edge, dark: DARK.bladeDark,
    guard: DARK.trim, guardHi: DARK.blade, glow: DARK.glow, glow2: DARK.glowHi, wood: DARK.scale, string: DARK.glow,
    membrane: DARK.membrane, membraneHi: DARK.membraneHi, claw: DARK.claw,
  },
};

function ctx(w, h, d, cx, cy, oz = 0) {
  const M = new VoxelModel(w, h, d);
  const set = (x, y, z, c, g = false) => M.set(cx + x, cy + y, oz + z, c, g);
  const bx = (x0, x1, y0, y1, z0, z1, fn) => {
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn);
  };
  return { M, set, bx, cx, cy, oz };
}

const out = (c) => ({ M: c.M, ox: c.cx, oy: c.cy, oz: c.oz });

/** Round 2x2 shaft with alternating bands. */
function shaft(c, T, z0, z1, ringEvery = 0, ringCol = null, band = true) {
  for (let z = z0; z <= z1; z++)
    for (let x = -1; x <= 0; x++)
      for (let y = -1; y <= 0; y++) {
        const ring = ringEvery && z % ringEvery === ringEvery - 1;
        c.set(x, y, z, ring ? J(ringCol || T.guard, x, y, z, 3) : J(band && (z >> 1) % 2 ? T.wrapLo : T.wrap, x, y, z, 1, 0.05));
      }
}

function guard(c, T, z, half, sweep = 1, thick = 2, col = null) {
  for (let x = -half; x < half; x++) {
    const k = Math.max(0, Math.abs(x + 0.5) - half * 0.55);
    const zz = z + Math.round(k * sweep);
    for (let y = -Math.floor(thick / 2); y < thick - Math.floor(thick / 2); y++) c.set(x, y, zz, J(col || (Math.abs(x + 0.5) > half * 0.7 ? T.guardHi : T.guard), x, y, zz, 5));
  }
}

/** A tapering blade along +z with optional curve toward -x, glowing fuller and back teeth. */
function blade(c, T, o) {
  const { z0, z1, w0, curve = 0, exp = 2, tip = 0.72, glowEvery = 0, serr = 0, glowCol = T.glow, thick = 2 } = o;
  for (let z = z0; z <= z1; z++) {
    const t = (z - z0) / (z1 - z0);
    const w = t < tip ? w0 : Math.max(1, Math.round(w0 * (1 - (t - tip) / (1 - tip)) + 0.4));
    const off = -Math.round(curve * t ** exp);
    const x0 = off - Math.floor(w / 2);
    for (let xi = x0; xi < x0 + w; xi++) {
      const right = xi === x0 + w - 1;
      const left = xi === x0;
      for (let y = 0; y < thick; y++) {
        const yy = y - Math.floor(thick / 2);
        c.set(xi, yy, z, right && w > 1 ? J(T.edge, xi, yy, z, 7, 0.02) : left && w > 2 ? J(T.dark, xi, yy, z, 8, 0.03) : J(T.blade, xi, yy, z, 9, 0.04));
      }
    }
    if (serr && z % serr === 0 && w >= 4 && t > 0.12 && t < 0.86) {
      for (let y = -1; y <= 0; y++) c.set(x0 + w, y, z, J(T.dark, x0, y, z, 10, 0.03));
      for (let y = -1; y <= 0; y++) c.set(x0 + w, y, z + 1, J(T.dark, x0, y, z, 11, 0.03));
      for (let y = -1; y <= 0; y++) c.set(x0 + w + 1, y, z + 1, J(T.edge, x0, y, z, 12, 0.03));
    }
    if (glowEvery && w >= 3 && t > 0.08 && t < tip && z % glowEvery !== glowEvery - 1) {
      for (let y = -1; y <= 0; y++) c.set(off, y, z, glowCol, true);
    }
  }
}

/* ------------------------------ swords ------------------------------ */

function darkSword() {
  const T = THEMES.dark;
  const c = ctx(16, 16, 56, 8, 8);
  shaft(c, T, 1, 7, 4);
  c.bx(-1, 0, -1, 0, 0, 0, () => J(T.glow2, 0, 0, 0, 3));
  guard(c, T, 8, 6, 1.4);
  c.set(0, 0, 9, T.glow, true);
  c.set(-1, 0, 9, T.glow, true);
  blade(c, T, { z0: 9, z1: 49, w0: 5, curve: 5, exp: 2.2, glowEvery: 5 });
  return out(c);
}

function twoSword(T, budge) {
  const c = ctx(20, 16, 76, 10, 8);
  shaft(c, T, 1, 15, 5);
  c.bx(-2, 1, -2, 1, 0, 0, (x, y, z) => J(T.guardHi, x, y, z, 14));
  c.set(-1, 0, 0, T.glow2, true);
  c.set(0, 0, 0, T.glow2, true);
  guard(c, T, 16, 9, 1.0, 3);
  if (budge) {
    for (const dir of [-1, 1]) for (let k = 0; k < 5; k++) for (let y = -1; y <= 0; y++) c.set(dir * (8 + (k > 2 ? 0 : 0)) + (dir < 0 ? -1 : 0), y, 16 + 1 + k, J(T.blade, k, y, dir, 15));
    blade(c, T, { z0: 17, z1: 58, w0: 7, glowEvery: 4, serr: 4, tip: 0.8 });
  } else {
    blade(c, T, { z0: 17, z1: 60, w0: 7, curve: 6, exp: 2.4, glowEvery: 4, tip: 0.74 });
    for (let y = -1; y <= 0; y++) c.set(-3, y, 40, T.glow, true);
  }
  return out(c);
}

function dualBlade(T, budge) {
  const c = ctx(16, 16, 40, 8, 8);
  shaft(c, T, 0, 5, 3);
  guard(c, T, 6, 4, 1.2);
  if (budge) {
    for (let z = 7; z <= 30; z++) {
      const t = (z - 7) / 23;
      const w = t < 0.6 ? 3 : Math.max(1, Math.round(3 * (1 - (t - 0.6) / 0.4) + 0.4));
      const off = Math.round(t * t * 5);
      for (let xi = off - 1; xi < off - 1 + w; xi++) for (let y = -1; y <= 0; y++) c.set(xi, y, z, xi === off - 1 + w - 1 && w > 1 ? J(T.edge, xi, y, z, 20, 0.02) : z % 6 === 5 ? J(T.dark, xi, y, z, 21) : J(T.blade, xi, y, z, 22));
      if (z > 9 && z < 24 && z % 4 !== 3) c.set(off, 0, z, T.glow, true);
    }
  } else {
    for (let z = 7; z <= 32; z++) {
      const t = (z - 7) / 25;
      const w = t < 0.5 ? 3 : Math.max(1, Math.round(3 * (1 - (t - 0.5) / 0.5) + 0.4));
      const off = -Math.round(t ** 1.7 * 9);
      for (let xi = off - 1; xi < off - 1 + w; xi++) for (let y = -1; y <= 0; y++) c.set(xi, y, z, xi === off - 1 && w > 1 ? J(T.edge, xi, y, z, 23, 0.02) : J(T.blade, xi, y, z, 24));
      if (z > 9 && z < 24 && z % 4 !== 3) c.set(off, 0, z, T.glow, true);
    }
  }
  return out(c);
}

/* ------------------------------ hammer ------------------------------ */

function darkHammer() {
  const T = THEMES.dark;
  const c = ctx(26, 16, 56, 13, 8);
  shaft(c, T, 0, 33, 8);
  c.bx(-2, 1, -2, 1, 0, 0, (x, y, z) => J(T.blade, x, y, z, 30));
  c.bx(-4, 3, -4, 3, 27, 41, (x, y, z) => {
    const band = z === 27 || z === 41 || z === 34;
    return band ? J(T.guard, x, y, z, 31) : (x + y + z) % 3 === 0 ? J(T.wrapLo, x, y, z, 32) : J(T.wrap, x, y, z, 32);
  });
  for (const x of [-5, 4]) for (let z = 32; z <= 36; z++) for (let y = -1; y <= 0; y++) c.set(x, y, z, J(z === 34 ? T.glow2 : T.glow, x, y, z, 33), true);
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const w = k < 4 ? 3 : k < 7 ? 2 : 1;
      const xx = dir < 0 ? -5 - k : 4 + k;
      const zz = 33 + Math.round(k * k * 0.07);
      for (let y = 0; y < w; y++) for (let q = 0; q < w; q++) c.set(xx, y - Math.floor(w / 2), zz + q - Math.floor(w / 2), k > 6 ? T.edge : J(k % 3 === 2 ? T.dark : T.blade, xx, y, k, 34, 0.03));
    }
  }
  for (let k = 0; k < 9; k++) {
    const w = k < 3 ? 3 : k < 6 ? 2 : 1;
    for (let x = 0; x < w; x++) for (let y = 0; y < w; y++) c.set(x - Math.floor(w / 2) - 1, y - Math.floor(w / 2) - 1, 42 + k, k > 6 ? T.edge : J(k % 3 === 2 ? T.dark : T.blade, x, y, k, 35, 0.03));
  }
  return out(c);
}

/* ------------------------------ spears ------------------------------ */

function spear(T, budge) {
  const c = ctx(20, 20, 96, 10, 10, 16);
  for (let z = -14; z <= 52; z++)
    for (let x = -1; x <= 0; x++)
      for (let y = -1; y <= 0; y++) {
        const grip = z >= 4 && z <= 20;
        const ring = z % 11 === 10;
        c.set(x, y, z, ring ? J(T.guard, x, y, z, 40) : grip ? J((z >> 1) % 2 ? T.wrapLo : T.wrap, x, y, z, 41, 0.05) : J(budge ? T.wood : T.wrapLo, x, y, z, 42, 0.06));
      }
  c.bx(-2, 1, -2, 1, -16, -14, (x, y, z) => J(T.guardHi, x, y, z, 43));
  c.bx(-2, 1, -2, 1, 50, 52, (x, y, z) => J(T.guard, x, y, z, 44));
  if (budge) {
    for (let z = 53; z <= 72; z++) {
      const t = (z - 53) / 19;
      const w = t < 0.35 ? 2 + Math.round(t * 8) : Math.max(1, Math.round(5 * (1 - (t - 0.35) / 0.65) + 0.3));
      const x0 = -Math.floor(w / 2);
      for (let xi = x0; xi < x0 + w; xi++) for (let y = -1; y <= 0; y++) c.set(xi, y, z, xi === x0 + w - 1 && w > 1 ? J(T.edge, xi, y, z, 45, 0.02) : J(T.blade, xi, y, z, 46));
      if (z > 54 && z < 66 && z % 3 !== 2) for (let y = -1; y <= 0; y++) c.set(0, y, z, T.glow, true);
    }
    for (const dir of [-1, 1]) for (let k = 0; k < 4; k++) c.set(dir * (2 + k), 0, 52 + k, J(T.edge, k, dir, 0, 47, 0.02));
  } else {
    for (let z = 53; z <= 74; z++) {
      const t = (z - 53) / 21;
      const w = Math.max(1, Math.round(3 * (1 - t) + 0.4));
      const x0 = -Math.floor(w / 2);
      for (let xi = x0; xi < x0 + w; xi++) for (let y = -1; y <= 0; y++) c.set(xi, y, z, xi === x0 + w - 1 && w > 1 ? J(T.edge, xi, y, z, 48, 0.02) : J(T.blade, xi, y, z, 49));
      if (z > 54 && z < 68 && z % 3 !== 2) for (let y = -1; y <= 0; y++) c.set(0, y, z, T.glow, true);
    }
    for (const dir of [-1, 1]) {
      for (let k = 0; k < 11; k++) {
        const t = k / 10;
        const x = dir * Math.round(2 + Math.sin(t * 1.3) * 5);
        const z = 51 + Math.round(t * 4 + t * t * 9);
        const w = k < 6 ? 2 : 1;
        for (let a = 0; a < w; a++) for (let y = -1; y <= 0; y++) c.set(x + (dir < 0 ? -a : a), y, z, k > 8 ? T.edge : J(k % 3 === 2 ? T.dark : T.blade, k, y, dir, 50, 0.03));
      }
    }
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) c.set(x, y, 53, T.glow2, true);
    for (let k = 0; k < 14; k++) {
      const w = Math.max(1, 5 - Math.floor(k / 3));
      for (let q = 0; q < w; q++) {
        const xx = -2 - k;
        c.set(xx, 0, 40 + q + Math.round(k * 0.2), J(k % 4 === 3 ? T.membraneHi : T.membrane, xx, q, k, 51, 0.05));
      }
    }
  }
  return out(c);
}

/* ------------------------------ staffs ------------------------------ */

function budgeStaff() {
  const T = THEMES.budge;
  const c = ctx(20, 20, 70, 10, 10);
  shaft(c, T, 0, 44, 9, T.guardHi);
  c.bx(-2, 1, -2, 1, 0, 0, (x, y, z) => J(T.blade, x, y, z, 60));
  c.bx(-2, 1, -2, 1, 44, 46, (x, y, z) => J(T.guard, x, y, z, 61));
  for (let z = 47; z <= 58; z++)
    for (let y = -4; y <= 3; y++)
      for (let x = -4; x <= 3; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5, z - 52.5);
        if (d <= 3.9) c.set(x, y, z, d < 2.1 ? 0xfff2a0 : d < 3 ? T.glow2 : 0xff7a1a, true);
      }
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 16; k++) {
      const t = k / 15;
      const x = dir * Math.round(3 + Math.sin(t * 1.35) * 4.6);
      const z = 45 + Math.round((1 - Math.cos(t * 1.6)) * 14 + t * 6);
      const w = k < 5 ? 3 : k < 11 ? 2 : 1;
      for (let a = 0; a < w; a++) for (let y = -Math.floor(w / 2); y < w - Math.floor(w / 2); y++) c.set(x + (dir < 0 ? -a : a) * 0, y, z + a, k % 5 === 4 ? J(T.dark, k, y, dir, 62, 0.03) : J(T.blade, k, y, dir, 63, 0.03));
    }
  }
  return out(c);
}

/* ------------------------------- wands ------------------------------ */

function budgeWand() {
  const T = THEMES.budge;
  const c = ctx(12, 12, 40, 6, 6);
  for (let z = 0; z <= 9; z++) for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) c.set(x, y, z, J((z >> 1) % 2 ? T.wrapLo : T.wrap, x, y, z, 70, 0.05));
  c.bx(-2, 1, -2, 1, 10, 10, (x, y, z) => J(T.guard, x, y, z, 71));
  for (let z = 11; z <= 26; z++) {
    const t = (z - 11) / 15;
    const r = Math.max(0.5, 2.4 * (1 - t) + 0.4);
    const bend = Math.round(t * t * 3);
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) {
      if (Math.hypot(x + 0.5 - bend * 0.5, y + 0.5) > r) continue;
      c.set(x, y, z, z % 6 === 5 ? J(T.dark, x, y, z, 72) : J(T.blade, x, y, z, 73));
    }
  }
  for (let z = 27; z <= 31; z++) for (let y = -2; y <= 1; y++) for (let x = -2; x <= 1; x++) {
    const d = Math.hypot(x + 0.5 + 1.5, y + 0.5, z - 29);
    if (d <= 2.3) c.set(x + 1, y, z, d < 1.3 ? 0xfff2a0 : T.glow2, true);
  }
  return out(c);
}

function darkWand() {
  const T = THEMES.dark;
  const c = ctx(12, 12, 44, 6, 6);
  for (let z = 0; z <= 9; z++) for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) c.set(x, y, z, J(z % 4 === 3 ? T.guard : (z >> 1) % 2 ? T.wrapLo : T.wrap, x, y, z, 80, 0.05));
  c.bx(-1, 0, -1, 0, 0, 0, (x, y, z) => J(T.glow2, x, y, z, 81));
  for (let z = 10; z <= 20; z++) c.set(0, 0, z, J(T.wrapHi, 0, 0, z, 82)), c.set(-1, 0, z, J(T.wrapLo, 0, 0, z, 83));
  for (const dir of [-1, 1]) for (let k = 0; k < 5; k++) c.set(dir < 0 ? -2 - k : 1 + k, 0, 10 + Math.round(k * 0.9), k > 3 ? T.edge : J(T.blade, k, dir, 0, 84, 0.03));
  for (let z = 20; z <= 34; z++) {
    const t = (z - 20) / 14;
    const r = Math.max(0.4, 3.0 * Math.sin(Math.min(1, t * 1.1) * Math.PI * 0.95));
    for (let x = -4; x <= 3; x++) for (let y = -4; y <= 3; y++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d > r) continue;
      c.set(x, y, z, d < r * 0.5 ? T.glow2 : T.glow, true);
    }
  }
  return out(c);
}

/* -------------------------------- bows ------------------------------ */

function shortBow(T, budge) {
  const c = ctx(16, 56, 48, 8, 28);
  const L = 16;
  for (let y = -L; y <= L; y++) {
    const bend = Math.round((1 - (y / L) ** 2) * 7);
    const grip = Math.abs(y) <= 3;
    const thick = grip ? 3 : 2;
    for (let k = 0; k < thick; k++) {
      const ring = Math.abs(y) % 5 === 0;
      const col = grip ? J(k === 1 ? T.wrapLo : T.wrap, y, k, 0, 90, 0.05) : ring ? T.dark : J(budge ? T.blade : Math.abs(y) > 9 ? T.blade : T.wrapHi, y, k, 0, 91);
      c.set(0, y, 16 + bend + k, col);
      if (grip) c.set(-1, y, 16 + bend + k, col);
    }
    c.set(0, y, 16, budge ? (Math.abs(y) % 4 === 0 ? 0xf4f0dc : T.string) : T.glow, !budge);
  }
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const yy = dir * (L + 1 + k);
      const zz = 16 + (budge ? (k < 2 ? 0 : -1) : -Math.round(k * k * 0.15));
      for (let q = 0; q < 2; q++) c.set(0, yy, zz + q, k === 4 && !budge ? T.edge : J(budge ? T.claw : T.blade, k, dir, q, 92, 0.03));
    }
  }
  if (budge) for (let z = 20; z < 28; z += 2) c.set(-1, 0, z, T.glow, true);
  return out(c);
}

/* ----------------------------- crossbows ---------------------------- */

function crossbow(T, budge) {
  const c = ctx(28, 16, 48, 14, 8);
  const span = budge ? 10 : 12;
  for (let z = 0; z <= 36; z++)
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++) {
        if (z > 12 && (Math.abs(x) + Math.abs(y) > 1 || y < 0)) continue;
        c.set(x, y, z, z < 12 ? J((z >> 1) % 2 ? T.wrapLo : T.wrap, x, y, z, 100, 0.05) : J(budge ? T.wood : T.wrapHi, x, y, z, 101, 0.06));
      }
  c.bx(-1, 1, -4, -2, 2, 9, (x, y, z) => J(T.wrapLo, x, y, z, 102));
  c.bx(-2, 2, -2, 2, 0, 1, (x, y, z) => J(T.guardHi, x, y, z, 103));
  c.bx(-2, 2, -1, 2, 27, 33, (x, y, z) => J(T.guard, x, y, z, 104));
  for (let x = -span; x < span; x++) {
    const k = (Math.abs(x + 0.5) / span) ** 1.8;
    const z = 30 + Math.round(k * 4);
    const tipCol = Math.abs(x + 0.5) > span - 3;
    const mid = Math.abs(x + 0.5) < 5;
    for (let y = -1; y <= (mid ? 1 : 0); y++)
      for (let q = 0; q < 2; q++) c.set(x, y, z + q, tipCol ? J(budge ? T.claw : T.edge, x, y, z, 105, 0.03) : J(budge ? T.blade : mid ? T.wrapHi : T.blade, x, y, z, 106));
    if (!budge && Math.abs(x + 0.5) > 2 && Math.abs(x + 0.5) < span - 2 && x % 3 === 0) c.set(x, 1 - (mid ? 1 : 1), z, T.glow, true);
  }
  for (const side of [-1, 1]) {
    const x = side < 0 ? -span : span - 1;
    const z = 30 + 4;
    for (let q = 0; q <= 8; q++) {
      const t = q / 8;
      c.set(Math.round(x + (0 - x) * t), 0, Math.round(z + (20 - z) * t), T.string, !budge);
    }
  }
  for (let z = 14; z <= 42; z++) {
    c.set(0, 2, z, z > 38 ? T.edge : budge ? J(0x7a4e2c, 0, 2, z, 107, 0.06) : J(T.dark, 0, 2, z, 108), false);
    if (z <= 38) c.set(0, 3, z, z % 5 === 0 ? T.wrapHi : J(T.dark, 0, 3, z, 109), false);
  }
  if (!budge) for (let z = 18; z <= 36; z += 4) c.set(0, 3, z, T.glow, true);
  c.set(0, 3, 40, T.edge);
  return out(c);
}

/* ------------------------------ registry ---------------------------- */

const BUILDERS = {
  darksword: () => darkSword(),
  budgegreatsword: () => twoSword(THEMES.budge, true),
  darkgreatsword: () => twoSword(THEMES.dark, false),
  budgedual: () => dualBlade(THEMES.budge, true),
  darkdual: () => dualBlade(THEMES.dark, false),
  darkhammer: () => darkHammer(),
  budgespear: () => spear(THEMES.budge, true),
  darkspear: () => spear(THEMES.dark, false),
  budgestaff: () => budgeStaff(),
  budgewand: () => budgeWand(),
  darkwand: () => darkWand(),
  budgeshortbow: () => shortBow(THEMES.budge, true),
  darkshortbow: () => shortBow(THEMES.dark, false),
  budgecrossbow: () => crossbow(THEMES.budge, true),
  darkcrossbow: () => crossbow(THEMES.dark, false),
};

/** Voxel model for the themed held weapons; null for kinds built elsewhere. */
export function buildWeaponVoxels(kind) {
  return BUILDERS[kind] ? BUILDERS[kind]() : null;
}

/* ----------------------------- shields/books ------------------------ */

const themeOf = (setId) => (setId.startsWith('dark') ? THEMES.dark : THEMES.budge);

/** Flat shield (face up on +y) in the same 24x6x24 layout as the hero shield. */
export function buildShieldModel(setId) {
  const T = themeOf(setId);
  const dark = T === THEMES.dark;
  const M = new VoxelModel(24, 6, 24);
  for (let z = 0; z < 24; z++)
    for (let x = 0; x < 24; x++) {
      const dx = Math.abs(x + 0.5 - 12);
      const dz = z + 0.5 - 12;
      const shape = dark ? (dx / 9.4) ** 2.3 + (Math.abs(dz) / (dz > 0 ? 11.4 : 10.6)) ** 1.7 : (dx / 11) ** 2 + (dz / 11.3) ** 2;
      if (shape > 1) continue;
      const rim = shape > 0.74;
      const boss = Math.hypot(dx, dz) < (dark ? 2.6 : 3.2);
      let col;
      if (boss) col = dark ? T.glow : T.blade;
      else if (rim) col = (x + z) % 4 === 0 ? J(T.blade, x, 1, z, 110) : J(T.guard, x, 1, z, 111);
      else {
        const p = (x + z * 1 + (z >> 1 & 1) * 2) % 4;
        col = J(p === 0 ? T.wrapLo : p === 3 ? T.wrapHi : T.wrap, x, 1, z, 112, 0.05);
      }
      M.set(x, 1, z, shade(J(T.wrapLo, x, 1, z, 113), 0.8));
      M.set(x, 2, z, col, boss && dark);
      if (rim || boss) M.set(x, 3, z, boss ? (dark ? T.glow2 : J(T.blade, x, 3, z, 114)) : shade(col, 1.12), boss && dark);
      if (boss && !dark && Math.hypot(dx, dz) < 1.9) M.set(x, 4, z, J(T.edge, x, 4, z, 115));
      if (!boss && !rim && dx < 1.6) M.set(x, 3, z, J(T.guard, x, 3, z, 116));
    }
  if (dark) {
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) {
      const x = sx < 0 ? 1 - k : 22 + k;
      if (x < 0 || x > 23) continue;
      M.set(x, 2, 12 - Math.round(k * 0.2), k > 4 ? T.edge : J(T.blade, k, sx, 0, 117, 0.03));
    }
  } else {
    for (const [x, z] of [[2, 12], [21, 12], [12, 1], [12, 22]]) M.set(x, 4, z, J(T.blade, x, 4, z, 118));
  }
  return { M, ox: 12, oy: 3, oz: 12 };
}

/** Closed spell book lying flat; spine on -x, length along +z. */
export function buildBookModel(setId) {
  const T = themeOf(setId);
  const dark = T === THEMES.dark;
  const M = new VoxelModel(14, 8, 20);
  const set = (x, y, z, c, g = false) => M.set(x + 7, y + 3, z + 2, c, g);
  for (let z = 0; z < 16; z++)
    for (let x = -5; x <= 5; x++) {
      for (let y = -1; y <= 2; y++) {
        const cover = y === -1 || y === 2;
        const col = cover ? J(dark ? T.wrap : T.wrapLo, x, y, z, 120, 0.05) : J(0xf0e4c0, x, y, z, 121, 0.03);
        const spine = x === -5;
        set(x, y, z, spine ? J(T.wrapLo, x, y, z, 122) : col);
      }
      const edge = x === 5 || z === 0 || z === 15;
      if (edge) set(x, 2, z, J(T.guard, x, 2, z, 123));
    }
  for (let z = 1; z < 15; z++) set(-5, 3, z, J(T.guard, 0, 3, z, 124));
  for (let y = 0; y < 2; y++) for (let x = -2; x <= 2; x++) {
    if (Math.abs(x) + y > 3) continue;
    const gem = Math.abs(x) + Math.abs(y - 0.5) < 2.4;
    set(x, 3, 6 + y * 3, gem ? (dark ? T.glow : T.glow2) : J(T.guardHi, x, y, 0, 125), gem);
  }
  set(0, 3, 7, dark ? T.glow2 : 0xfff2a0, true);
  set(0, 3, 8, dark ? T.glow2 : 0xfff2a0, true);
  for (const z of [3, 12]) for (let y = -1; y <= 2; y++) set(5, y, z, J(T.guard, 5, y, z, 126));
  return { M, ox: 7, oy: 3, oz: 2 + 8 };
}
