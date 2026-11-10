import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade, mix } from '../engine/voxel.js';
import { BUDGE } from '../data/budge.js';
import { DARK } from '../data/darksycle.js';
import { YETI } from '../data/yeti.js';
import { holyHammerVoxels, demonSwordVoxels, demonShieldVoxels } from './knightWeapons.js';
import { jungleWeapons, jungleShield, jungleBook, JUNGLE_DUAL, JUNGLE_TALL, JUNGLE_EDGE, JUNGLE_SHIELD_SETS, JUNGLE_BOOK_SETS } from './weaponsJungle.js';

/** Weapons, shields and books are sculpted at half the character voxel size for finer detail. */
export const WEAPON_SIZE = 0.015;

const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));
const lerp = (a, b, t) => a + (b - a) * t;

/** Held kinds that wield a matching blade in each hand. */
export const DUAL_KINDS = new Set(['dual', 'budgedual', 'darkdual', 'yetidual', ...JUNGLE_DUAL]);
/** Held kinds whose model is taller than wide (bows). */
export const TALL_KINDS = new Set(['bow', 'budgebow', 'darkbow', 'budgeshortbow', 'darkshortbow', 'yetilongbow', 'yetishortbow', ...JUNGLE_TALL]);

/**
 * Swords are sculpted flat in the horizontal plane. Rolled a quarter turn,
 * the edge faces a side swing instead of the flat slapping into it.
 */
const EDGE_HOLD = new Set([
  'blade', 'dual',
  'budgeblade', 'budgegreatsword', 'budgedual',
  'darksword', 'darkgreatsword', 'darkdual',
  'orcblade',
  'yetisword', 'yetigreatsword', 'yetidual',
  'demonsword',
  'ironsword', 'irongreatsword',
  ...JUNGLE_EDGE,
]);

/**
 * Resting roll of a weapon in the hand, around the grip.
 * Swords stand on their edge. Hammers are turned in the sculpt so the blunt
 * face already leads; rolling them would swing that flat cheek toward the viewer.
 */
export function gripRoll(kind) {
  return EDGE_HOLD.has(kind) ? -Math.PI / 2 : 0;
}

const sheathTip = new THREE.Vector3();
const sheathBack = new THREE.Vector3(0, 0, -1);
const sheathX = new THREE.Vector3();
const sheathY = new THREE.Vector3();
const sheathBasis = new THREE.Matrix4();

/**
 * Hang a carried weapon on the back slot.
 * Hafted models run along +z. Seen from behind, the grip clears the
 * right shoulder and the blade angles down toward the left hip.
 */
export function placeSheath(group, kind) {
  if (TALL_KINDS.has(kind)) {
    group.position.set(-0.08, 0.56, -0.02);
    group.rotation.set(0.08, -0.15, 0.48);
    return;
  }
  const lean = 0.42;
  group.position.set(-0.08, 0.52, -0.05);
  sheathTip.set(Math.sin(lean), -Math.cos(lean), -0.04).normalize();
  sheathX.crossVectors(sheathBack, sheathTip).normalize();
  sheathY.crossVectors(sheathTip, sheathX).normalize();
  sheathBasis.makeBasis(sheathX, sheathY, sheathTip);
  group.quaternion.setFromRotationMatrix(sheathBasis);
}

const THEMES = {
  budge: {
    wrap: BUDGE.scale, wrapLo: BUDGE.scaleLo, wrapHi: BUDGE.scaleHi, blade: BUDGE.horn, edge: BUDGE.claw, dark: BUDGE.hornDark,
    guard: BUDGE.bellyDark, guardHi: BUDGE.belly, glow: BUDGE.vein, glow2: BUDGE.ember, wood: 0x7a4e2c, string: 0xe8e0c8,
    membrane: BUDGE.membrane, membraneHi: BUDGE.membraneHi, claw: BUDGE.claw, horn: BUDGE.horn, hornDark: BUDGE.hornDark,
  },
  dark: {
    wrap: 0x3d3378, wrapLo: 0x2b2450, wrapHi: 0x6a5cb8, blade: DARK.blade, edge: DARK.edge, dark: DARK.bladeDark,
    guard: DARK.trim, guardHi: DARK.blade, glow: DARK.glow, glow2: DARK.glowHi, wood: 0x3d3378, string: DARK.glow,
    membrane: DARK.membrane, membraneHi: DARK.membraneHi, claw: DARK.claw, horn: DARK.blade, hornDark: DARK.bladeDark,
  },
  frost: {
    wrap: 0x8fb0cf, wrapLo: 0x5d84ac, wrapHi: 0xcfe6f6, blade: 0xa9dcff, edge: 0xf2fbff, dark: 0x5d84ac,
    guard: YETI.skin, guardHi: YETI.claw, glow: YETI.glow, glow2: YETI.glowHi, wood: YETI.leather, string: 0xdfeaf4,
    membrane: YETI.fur, membraneHi: YETI.furWhite, claw: YETI.clawTip, horn: YETI.claw, hornDark: YETI.furLo,
  },
  iron: {
    wrap: 0x6a4325, wrapLo: 0x4a2c16, wrapHi: 0x8a5a30, blade: 0xb4b8c0, edge: 0xe8eaf0, dark: 0x7a7e88,
    guard: 0xb8923a, guardHi: 0xe0bb52, glow: 0xffc94a, glow2: 0xfff0b0, wood: 0x7a4e2c, string: 0xe8e0c8,
    membrane: 0x8a3a2a, membraneHi: 0xb04a36, claw: 0xdfe2e8, horn: 0xb4b8c0, hornDark: 0x7a7e88,
  },
  orc: {
    wrap: 0x4a3018, wrapLo: 0x2a1a0e, wrapHi: 0x6a4830, blade: 0x7a7f88, edge: 0xb4b9c1, dark: 0x4e5258,
    guard: 0x6a655c, guardHi: 0x9a9488, glow: 0xc8ccd2, glow2: 0xe6dcc4, wood: 0x4a3018, string: 0xe8e0c8,
    membrane: 0x6a4030, membraneHi: 0x8a6848, claw: 0xd5d8de, horn: 0xe6dcc4, hornDark: 0xb7a88e,
  },
};

/* ------------------------------------------------------------------ */
/* Sparse voxel canvas that sizes its model to whatever gets painted    */
/* ------------------------------------------------------------------ */

function ctx() {
  const cells = new Map();
  const key = (x, y, z) => x + 512 + 1024 * (y + 512 + 1024 * (z + 512));
  const api = {
    set(x, y, z, col, glow = false) {
      if (col === null || col === undefined) return;
      x = Math.floor(x);
      y = Math.floor(y);
      z = Math.floor(z);
      cells.set(key(x, y, z), [x, y, z, col, glow]);
    },
    has: (x, y, z) => cells.has(key(Math.floor(x), Math.floor(y), Math.floor(z))),
    get: (x, y, z) => cells.get(key(Math.floor(x), Math.floor(y), Math.floor(z)))?.[3],
    each(fn) {
      for (const cell of [...cells.values()]) fn(cell[0], cell[1], cell[2], cell[3], cell[4]);
    },
    clear: (x, y, z) => cells.delete(key(Math.floor(x), Math.floor(y), Math.floor(z))),
    done(pad = 1) {
      let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
      for (const [x, y, z] of cells.values()) {
        mnx = Math.min(mnx, x); mxx = Math.max(mxx, x);
        mny = Math.min(mny, y); mxy = Math.max(mxy, y);
        mnz = Math.min(mnz, z); mxz = Math.max(mxz, z);
      }
      const M = new VoxelModel(mxx - mnx + 1 + pad * 2, mxy - mny + 1 + pad * 2, mxz - mnz + 1 + pad * 2);
      for (const [x, y, z, col, glow] of cells.values()) M.set(x - mnx + pad, y - mny + pad, z - mnz + pad, col, glow);
      return { M, ox: -mnx + pad, oy: -mny + pad, oz: -mnz + pad, size: WEAPON_SIZE };
    },
  };
  return api;
}

/* ------------------------------ primitives ------------------------------ */

/** Round shaft along +z centred on the origin. */
function rod(c, z0, z1, r, fn, glow = false) {
  const n = Math.ceil(r);
  for (let z = z0; z <= z1; z++)
    for (let y = -n; y < n; y++)
      for (let x = -n; x < n; x++) {
        if (Math.hypot(x + 0.5, y + 0.5) > r) continue;
        c.set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn, glow);
      }
}

function ball(c, cx, cy, cz, r, fn, glow = false, sz = 1, sy = 1) {
  const n = Math.ceil(r) + 1;
  for (let z = Math.floor(cz - n * sz); z <= Math.ceil(cz + n * sz); z++)
    for (let y = Math.floor(cy - n * sy); y <= Math.ceil(cy + n * sy); y++)
      for (let x = Math.floor(cx - n); x <= Math.ceil(cx + n); x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) / sy, (z + 0.5 - cz) / sz);
        if (d <= r) c.set(x, y, z, typeof fn === 'function' ? fn(x, y, z, d / r) : fn, glow);
      }
}

/** Glowing orb with a hot core. */
function orb(c, cx, cy, cz, r, core, mid, outer) {
  ball(c, cx, cy, cz, r, (x, y, z, d) => {
    const q = d + (hash3(x, y, z, 77) - 0.5) * 0.26;
    return q < 0.4 ? core : q < 0.76 ? mid : outer;
  }, true);
}

const ringAt = (c, z, r, col, seed = 0) => rod(c, z, z, r + 0.45, (x, y, zz) => J(col, x, y, zz, 30 + seed, 0.04));

/** Cord-wrapped grip with diagonal binding. */
function wrapRod(c, T, z0, z1, r, a = T.wrap, b = T.wrapLo) {
  rod(c, z0, z1, r, (x, y, z) => {
    const ang = Math.atan2(y + 0.5, x + 0.5);
    const ph = Math.floor(z * 0.55 + ang * 1.05) & 1;
    return J(ph ? b : a, x, y, z, 1, 0.05);
  });
}

/** Wooden haft with grain rings. */
function haft(c, T, z0, z1, r, col = T.wood, ringEvery = 0, ringCol = T.guard) {
  rod(c, z0, z1, r, (x, y, z) => {
    if (ringEvery && z % ringEvery === 0) return J(ringCol, x, y, z, 31, 0.04);
    const side = x + y > 0 ? 1.06 : 0.94;
    return J(shade(col, side * (((z >> 2) & 1) ? 1 : 0.95)), x, y, z, 2, 0.06);
  });
}

/** Shaft following a path of [x, z, r] samples. */
function pathRod(c, pts, fn, glow = false) {
  for (const [px, pz, r] of pts) {
    const n = Math.ceil(r);
    for (let y = -n; y < n; y++)
      for (let x = -n; x < n; x++) {
        if (Math.hypot(x + 0.5, y + 0.5) > r) continue;
        c.set(Math.round(px) + x, y, Math.round(pz), typeof fn === 'function' ? fn(x, y, pz) : fn, glow);
      }
  }
}

/** Tapered spike along an arbitrary axis ('x' or 'z'). */
function spike(c, axis, dir, a0, len, base, r0, r1, bend, fn, glow = false) {
  for (let k = 0; k <= len; k++) {
    const t = k / len;
    const r = lerp(r0, r1, t);
    const off = Math.round(bend * t * t);
    const n = Math.ceil(r);
    for (let u = -n; u < n; u++)
      for (let v = -n; v < n; v++) {
        if (Math.hypot(u + 0.5, v + 0.5) > r) continue;
        if (axis === 'x') c.set(a0 + dir * k, v, base + off + u, typeof fn === 'function' ? fn(k, u, v) : fn, glow);
        else c.set(base + u, v, a0 + dir * k + off * 0, typeof fn === 'function' ? fn(k, u, v) : fn, glow);
      }
  }
}

/* ------------------------------ blades ------------------------------ */

/**
 * Bevelled blade along +z. Width follows `w0` (or `wf(t)`), optional sideways
 * curve, a four-layer ridge with edge highlights, and a fuller groove that can glow.
 */
function blade(c, T, o) {
  const { z0, z1, w0, wf = null, curve = 0, exp = 2, tip = 0.72, thick = 4, fuller = 'groove', fz = [0.06, 0.8], glowEvery = 0, serr = 0, runes = 0 } = o;
  const len = z1 - z0;
  for (let z = z0; z <= z1; z++) {
    const t = (z - z0) / len;
    let w = wf ? wf(t) : t < tip ? w0 : Math.max(1, Math.round(w0 * (1 - ((t - tip) / (1 - tip)) ** 1.15)));
    if (!wf && t < 0.04) w = Math.max(2, Math.round(w0 * 0.72));
    if (w > 1) w = Math.max(2, 2 * Math.round(w / 2));
    const off = -Math.round(curve * t ** exp);
    const x0 = off - Math.floor(w / 2);
    const cxm = x0 + w / 2;
    for (let xi = x0; xi < x0 + w; xi++) {
      const u = w > 1 ? (xi + 0.5 - cxm) / (w / 2) : 0;
      const au = Math.abs(u);
      const inFuller = fuller && w >= 6 && t > fz[0] && t < Math.min(fz[1], tip + 0.06) && au < 0.2;
      const n = w <= 2 ? 2 : inFuller ? 2 : au < 0.55 && thick === 4 ? 4 : 2;
      for (let l = 0; l < n; l++) {
        const yy = l - n / 2;
        let col;
        let g = false;
        if (inFuller) {
          if (fuller === 'glow' && (!glowEvery || z % glowEvery !== glowEvery - 1)) {
            col = T.glow;
            g = true;
          } else col = J(shade(T.dark, 0.88), xi, yy, z, 13, 0.03);
        } else if (w >= 3 && au > 0.74) col = J(T.edge, xi, yy, z, 7, 0.02);
        else {
          const f = (u < 0 ? 0.88 : 1.05) * (yy < 0 ? 0.94 : 1);
          const base = w >= 5 && au < 0.22 ? mix(T.blade, T.edge, 0.45) : T.blade;
          col = J(shade(base, f), xi, yy, z, 9, 0.03);
        }
        c.set(xi, yy, z, col, g);
      }
    }
    if (serr && w >= 6 && t > 0.14 && t < 0.88) {
      const k = z % serr;
      if (k < 3) {
        for (let q = 0; q < 3 - k; q++) for (let y = -1; y <= 0; y++) c.set(x0 + w + q, y, z, q === 2 - k ? J(T.edge, q, y, z, 14, 0.02) : J(T.dark, q, y, z, 15, 0.03));
      }
    }
    if (runes && w >= 8 && t > 0.22 && t < 0.72 && z % runes === 0) {
      const rx = Math.floor(cxm) + 3;
      c.set(rx, 1, z, T.glow, true);
      c.set(rx, -2, z, T.glow, true);
      c.set(rx - 6, 1, z + 1, T.glow, true);
      c.set(rx - 6, -2, z + 1, T.glow, true);
    }
  }
}

const leaf = (wmax, pow = 0.75, sharp = 0.7) => (t) =>
  Math.max(1, Math.round(wmax * Math.pow(Math.sin(Math.PI * Math.pow(t, pow)), sharp)));

/** Guard bar with domed centre block, swept quillons and shaped caps. */
function crossguard(c, T, z, half, o = {}) {
  const { sweep = 0, cap = 'ball', gem = null } = o;
  for (let x = -half; x < half; x++) {
    const u = Math.abs(x + 0.5) / half;
    const zz = z + Math.round(sweep * u * u);
    const mid = u < 0.28;
    const ny = mid ? 4 : u < 0.62 ? 3 : 2;
    const y0 = -Math.floor(ny / 2);
    for (let y = y0; y < y0 + ny; y++) {
      const top = y === y0 + ny - 1;
      const col = u > 0.8 ? T.guardHi : top ? shade(T.guardHi, 0.95) : T.guard;
      for (let d = mid ? -1 : 0; d < (mid ? 3 : 2); d++) c.set(x, y, zz + d, J(col, x, y, zz + d, 5, 0.04));
    }
  }
  for (const dir of [-1, 1]) {
    const ex = dir < 0 ? -half : half - 1;
    const ez = z + Math.round(sweep);
    if (cap === 'ball') ball(c, ex + dir * 0.5, 0, ez + 0.5, 2.5, (x, y, zz) => J(T.guardHi, x, y, zz, 16, 0.05));
    else if (cap === 'fang') spike(c, 'x', dir, ex + dir, 5, ez, 1.8, 1.6, 0, T.guardHi);
    if (cap === 'fang') {
      for (let k = 0; k < 9; k++) {
        const r = lerp(2.2, 0.6, k / 8);
        ball(c, ex + dir * (1 + k * 0.25), 0, ez + 2 + k, r, (x, y, zz) => J(k > 6 ? T.edge : T.horn, x, y, zz, 17, 0.03));
      }
    }
  }
  if (gem) {
    for (const [y, dy] of [[2, 0], [-3, 0]]) {
      c.set(-1, y, z, gem, true);
      c.set(0, y, z, gem, true);
      c.set(-1, y, z + 1, shade(gem, 0.85), true);
      c.set(0, y, z + 1, shade(gem, 0.85), true);
      void dy;
    }
  }
}

function pommelAt(c, T, z, kind, gem) {
  if (kind === 'ball') {
    ball(c, 0, 0, z - 1, 3.2, (x, y, zz) => J(T.guardHi, x, y, zz, 14, 0.04));
    if (gem) ball(c, 0, 0, z - 3.6, 1.4, gem, true);
  } else if (kind === 'horn') {
    for (let k = 0; k < 8; k++) rod(c, z - k, z - k, Math.max(0.8, 3.4 - k * 0.38), (x, y, zz) => J(k % 3 === 2 ? T.hornDark : T.horn, x, y, zz, 18, 0.03));
    if (gem) c.set(0, 0, z - 8, gem, true);
  } else if (kind === 'claw') {
    ball(c, 0, 0, z - 1, 3, (x, y, zz) => J(T.guardHi, x, y, zz, 19, 0.04));
    for (const dir of [-1, 1]) for (let k = 0; k < 5; k++) c.set(dir < 0 ? -2 - Math.floor(k * 0.4) : 1 + Math.floor(k * 0.4), 0, z - 3 - k, J(T.horn, k, dir, 0, 20, 0.03));
    if (gem) ball(c, 0, 0, z - 3.5, 1.3, gem, true);
  }
}

/* ------------------------------ swords ------------------------------ */

function sword(T, o) {
  const c = ctx();
  const { g0 = -6, g1 = 10, gr = 2, guardHalf = 8, sweep = 0, cap = 'ball', pommel = 'ball', gem = null, pgem = null, b, after = null } = o;
  wrapRod(c, T, g0, g1, gr);
  ringAt(c, g0 + 1, gr, T.guard, 1);
  ringAt(c, g1, gr, T.guard, 2);
  pommelAt(c, T, g0 - 1, pommel, pgem);
  crossguard(c, T, g1 + 2, guardHalf, { sweep, cap, gem });
  blade(c, T, { z0: g1 + 5, ...b });
  if (after) after(c);
  return c.done();
}

const SWORDS = {
  blade: () => sword(THEMES.iron, { guardHalf: 8, b: { z1: 82, w0: 8, tip: 0.84 } }),
  orcblade: () =>
    sword(THEMES.orc, {
      g0: -8, g1: 12, gr: 2.2, guardHalf: 11, cap: 'ball', pommel: 'ball',
      b: { z1: 74, w0: 15, tip: 0.8, fuller: 'groove' },
      after: (c) => {
        for (let z = 24; z < 82; z++) {
          const h = hash3(z, 1, 0, 61);
          if (h < 0.2) for (let y = -3; y <= 2; y++) { c.clear(-6, y, z); if (h < 0.08) c.clear(-5, y, z); }
          const h2 = hash3(z, 2, 0, 62);
          if (h2 < 0.2) for (let y = -3; y <= 2; y++) { c.clear(5, y, z); if (h2 < 0.08) c.clear(4, y, z); }
        }
      },
    }),
  darksword: () =>
    sword(THEMES.dark, { guardHalf: 11, sweep: 5, cap: 'fang', gem: THEMES.dark.glow2, pgem: THEMES.dark.glow2, b: { z1: 93, w0: 10, curve: 10, exp: 2.2, fuller: 'glow', glowEvery: 5, runes: 7, tip: 0.74 } }),
  yetisword: () =>
    sword(THEMES.frost, { guardHalf: 11, sweep: 4, cap: 'fang', pommel: 'claw', gem: THEMES.frost.glow2, pgem: THEMES.frost.glow2, b: { z1: 94, w0: 11, curve: 8, exp: 2, fuller: 'glow', glowEvery: 4, serr: 6, tip: 0.76 } }),
  yetigreatsword: () =>
    sword(THEMES.frost, { g0: -10, g1: 28, gr: 2.4, guardHalf: 16, sweep: 5, cap: 'fang', pommel: 'claw', gem: THEMES.frost.glow2, pgem: THEMES.frost.glow2, b: { z1: 122, w0: 15, curve: 6, exp: 2.2, fuller: 'glow', glowEvery: 5, serr: 6, tip: 0.8 } }),
  yetidual: () =>
    sword(THEMES.frost, { g0: -4, g1: 8, gr: 1.8, guardHalf: 8, sweep: 3, cap: 'fang', pommel: 'claw', pgem: THEMES.frost.glow2, b: { z1: 64, w0: 7, curve: 14, exp: 1.7, tip: 0.5, thick: 2, fuller: 'glow', glowEvery: 5, serr: 5 } }),
  budgeblade: () =>
    sword(THEMES.budge, { g1: 12, guardHalf: 10, cap: 'fang', pommel: 'horn', gem: THEMES.budge.glow, pgem: THEMES.budge.glow, b: { z1: 92, w0: 10, fuller: 'glow', glowEvery: 6, serr: 7, tip: 0.8 } }),
  budgegreatsword: () =>
    sword(THEMES.budge, { g0: -10, g1: 28, gr: 2.4, guardHalf: 16, cap: 'fang', pommel: 'claw', gem: THEMES.budge.glow, pgem: THEMES.budge.glow, b: { z1: 116, w0: 14, fuller: 'glow', glowEvery: 5, serr: 6, tip: 0.82 } }),
  darkgreatsword: () =>
    sword(THEMES.dark, { g0: -10, g1: 28, gr: 2.4, guardHalf: 16, sweep: 7, cap: 'fang', pommel: 'claw', gem: THEMES.dark.glow2, pgem: THEMES.dark.glow2, b: { z1: 120, w0: 14, curve: 12, exp: 2.4, fuller: 'glow', glowEvery: 5, runes: 8, tip: 0.76 } }),
  budgedual: () =>
    sword(THEMES.budge, { g0: -4, g1: 8, gr: 1.8, guardHalf: 7, cap: 'ball', pommel: 'horn', pgem: THEMES.budge.glow, b: { z1: 62, w0: 7, curve: -10, exp: 1.8, tip: 0.5, thick: 2, fuller: 'glow', glowEvery: 5, serr: 0 } }),
  darkdual: () =>
    sword(THEMES.dark, { g0: -4, g1: 8, gr: 1.8, guardHalf: 8, sweep: 4, cap: 'ball', pommel: 'ball', pgem: THEMES.dark.glow2, b: { z1: 62, w0: 7, curve: 16, exp: 1.7, tip: 0.5, thick: 2, fuller: 'glow', glowEvery: 5 } }),
  dual: () => sword(THEMES.iron, { g0: -4, g1: 8, gr: 1.8, guardHalf: 6, b: { z1: 58, w0: 6, tip: 0.6, thick: 2, fuller: null } }),
};

/* ------------------------------ hafted weapons ------------------------------ */

/**
 * Maul heads carry their spikes out to the sides, with a broad cheek facing
 * down the haft. Turn the head a quarter around its middle so a spike points
 * forward, the way a sword's edge leads a cut. The iron mallet's caps already
 * face down the haft, so it is left alone.
 */
function turnStrike(c, zMin) {
  const head = [];
  let mnz = 1e9;
  let mxz = -1e9;
  c.each((x, y, z, col, glow) => {
    if (z < zMin) return;
    head.push([x, y, z, col, glow]);
    mnz = Math.min(mnz, z);
    mxz = Math.max(mxz, z);
  });
  if (!head.length) return;
  const cz = Math.round((mnz + mxz) / 2);
  for (const [x, y, z] of head) c.clear(x, y, z);
  for (const [x, y, z, col, glow] of head) c.set(-(z - cz), y, x + cz, col, glow);
}

/** Banded block head with rounded corners. */
function blockHead(c, T, o) {
  const { z0, z1, hx, hy, bands, scale = true, glow = false } = o;
  for (let z = z0; z <= z1; z++)
    for (let y = -hy; y < hy; y++)
      for (let x = -hx; x < hx; x++) {
        const ax = Math.abs(x + 0.5) / hx;
        const ay = Math.abs(y + 0.5) / hy;
        if (ax ** 3 + ay ** 3 > 1.02) continue;
        const band = bands.some((b) => z >= b[0] && z <= b[1]);
        let col;
        if (band) col = (z === bands[0][0] || z === bands[0][1]) && (x + y) % 3 === 0 ? J(T.guardHi, x, y, z, 32, 0.05) : J(T.guard, x, y, z, 33, 0.05);
        else if (scale) col = J((((x >> 1) + (y >> 1) + (z >> 1)) & 1) ? T.wrapLo : T.wrap, x, y, z, 34, 0.05);
        else col = J(o.fill ?? T.blade, x, y, z, 35, 0.09);
        const edge = ax > 0.82 || ay > 0.82;
        c.set(x, y, z, edge && !band ? shade(col, 1.12) : col);
      }
  if (glow) {
    const zm = Math.round((z0 + z1) / 2);
    for (const [x, y] of [[-hx, 0], [hx - 1, 0], [-1, hy - 1], [-1, -hy], [0, hy - 1], [0, -hy]]) for (let q = -1; q <= 1; q++) c.set(x, y, zm + q, T.glow, true);
  }
}

function maul(T, o) {
  const c = ctx();
  const dark = T === THEMES.dark || T === THEMES.frost;
  haft(c, T, -14, 62, 2, T.wood, 0);
  wrapRod(c, T, -12, 26, 2.2);
  for (const z of [-12, 26, 40]) ringAt(c, z, 2.2, T.guard, z & 3);
  for (let z = 44; z <= 56; z += 6) ringAt(c, z, 2.2, T.guard, z & 3);
  pommelAt(c, T, -14, dark ? 'ball' : 'horn', T.glow);
  blockHead(c, T, { z0: 54, z1: 84, hx: 8, hy: 9, bands: [[54, 57], [66, 69], [81, 84]], glow: true });
  for (const dir of [-1, 1]) {
    const ex = dir < 0 ? -8 : 7;
    spike(c, 'x', dir, ex + dir, dark ? 18 : 15, 68, 3.4, 0.7, dark ? 6 : 8, (k) => (k > (dark ? 14 : 11) ? T.edge : k % 5 === 4 ? T.hornDark : T.horn));
  }
  spike(c, 'z', 1, 85, 20, 0, 3.2, 0.7, 0, (k) => (k > 16 ? T.edge : k % 6 === 5 ? T.hornDark : T.horn));
  if (dark) for (const y of [-1, 0]) for (let z = 88; z <= 96; z += 2) c.set(-1, y, z, T.glow, true);
  else for (let z = 90; z <= 100; z += 3) c.set(-1, -1, z, T.glow, true);
  turnStrike(c, 54);
  return c.done();
}

function ironHammer() {
  const T = THEMES.iron;
  const c = ctx();
  haft(c, T, -6, 62, 2, T.wood, 0);
  wrapRod(c, T, -6, 18, 2.2);
  ringAt(c, 18, 2.2, T.guard, 1);
  ringAt(c, 56, 2.4, T.guard, 2);
  blockHead(c, T, { z0: 50, z1: 76, hx: 7, hy: 9, bands: [[50, 52], [74, 76]], scale: false, fill: 0x8d939c });
  for (let z = 53; z < 74; z++) for (const [x, y] of [[-7, 0], [6, 0]]) c.set(x, y, z, J(shade(T.dark, 1.1), x, y, z, 36, 0.05));
  for (const x of [-4, 3]) for (const z of [51, 75]) c.set(x, 8, z, T.edge);
  return c.done();
}

function ironAxe() {
  const T = THEMES.iron;
  const c = ctx();
  haft(c, T, -6, 70, 2, T.wood, 0);
  wrapRod(c, T, -6, 18, 2.2);
  ringAt(c, 18, 2.2, T.guard, 1);
  rod(c, 52, 62, 3.2, (x, y, z) => J(T.dark, x, y, z, 37, 0.05));
  for (let z = 50; z <= 76; z++) {
    const t = (z - 50) / 26;
    const ext = Math.round(4 + Math.sin(Math.min(1, t * 1.1) * Math.PI * 0.62) * 11);
    const bev = z > 70 ? 1 : 2;
    for (let y = -ext; y < ext; y++) {
      const edgeCol = Math.abs(y + 0.5) > ext - 3;
      for (let x = -1; x <= 0; x++) {
        if (z > 58 && Math.abs(y + 0.5) < 3 && x === 0) continue;
        c.set(x, y, z, edgeCol ? J(T.edge, x, y, z, 38, 0.02) : J(shade(T.blade, x < 0 ? 0.92 : 1.04), x, y, z, 39, 0.04));
      }
      void bev;
    }
  }
  for (let z = 50; z <= 56; z++) for (let y = -3; y < 3; y++) c.set(-2, y, z, J(T.dark, y, z, 0, 40, 0.04));
  return c.done();
}

function ironPick() {
  const T = THEMES.iron;
  const c = ctx();
  haft(c, T, -6, 66, 2, T.wood, 0);
  wrapRod(c, T, -6, 16, 2.2);
  ringAt(c, 16, 2.2, T.guard, 1);
  rod(c, 58, 66, 3.2, (x, y, z) => J(T.dark, x, y, z, 41, 0.05));
  for (let y = -20; y < 20; y++) {
    const a = Math.abs(y + 0.5) / 20;
    const zc = 62 - Math.round(a * a * 9);
    const th = Math.max(1, Math.round(3.4 * (1 - a * 0.85)));
    for (let q = 0; q < th; q++) for (let x = -1; x <= 0; x++) c.set(x, y, zc + q - Math.floor(th / 2), a > 0.8 ? J(T.edge, y, q, 0, 42, 0.02) : J(shade(T.blade, x < 0 ? 0.92 : 1.04), x, y, q, 43, 0.04));
  }
  return c.done();
}

function fishingPole() {
  const T = THEMES.iron;
  const c = ctx();
  rod(c, -10, 20, 2.4, (x, y, z) => J(z % 6 < 3 ? 0xc79a62 : 0xb58852, x, y, z, 50, 0.05));
  wrapRod(c, T, 21, 30, 2.3, 0xd23a3a, 0x8f2323);
  ringAt(c, 20, 2.4, T.guard, 2);
  ball(c, 3.4, 0, 14, 3.4, (x, y, z, d) => (d > 0.78 ? J(0x4a4e58, x, y, z, 51, 0.05) : J(0xb8bcc6, x, y, z, 52, 0.05)), false, 0.6, 1);
  for (let z = 12; z <= 17; z++) c.set(2, -2, z, 0x4a4e58);
  c.set(5, 0, 14, 0x2f3238);
  c.set(6, 0, 14, 0xc9a24a);
  for (let z = 30; z <= 128; z++) {
    const t = (z - 30) / 98;
    const r = Math.max(0.9, 2.1 * (1 - t * 0.7));
    const bend = Math.round(t * t * 5);
    for (let y = -2; y < 2; y++) for (let x = -2; x < 2; x++) {
      if (Math.hypot(x + 0.5, y + 0.5) > r) continue;
      c.set(x, y + bend, z, J(z % 14 < 7 ? 0xd9b177 : 0xc9a066, x, y, z, 53, 0.04));
    }
    if (z % 20 === 8 && z < 120) {
      const gy = Math.round(t * t * 5) + 2;
      c.set(0, gy, z, 0xc9ccd4);
      c.set(-1, gy, z, 0xc9ccd4);
      c.set(0, gy + 1, z, 0xc9ccd4);
    }
  }
  c.set(0, 5 + 1, 129, 0xffffff);
  c.set(-1, 5 + 1, 129, 0xc9ccd4);
  ball(c, 0, 0, -12, 2.6, (x, y, z) => J(0x6b4325, x, y, z, 54, 0.06));
  return c.done();
}

function fishingNet() {
  const T = THEMES.iron;
  const c = ctx();
  haft(c, T, -10, 64, 2.2, 0x8a5a30, 0);
  wrapRod(c, T, 8, 24, 2.4, 0x6b4a2c, 0x4a3220);
  ringAt(c, 52, 2.3, T.guard, 3);
  const cz = 82;
  const R = 17;
  for (let a = 0; a < 140; a++) {
    const ang = (a / 140) * Math.PI * 2;
    const x = Math.cos(ang) * R;
    const z = cz + Math.sin(ang) * R;
    for (let dy = 0; dy <= 1; dy++) c.set(Math.round(x), dy, Math.round(z), J(0xb58852, a, dy, 0, 55, 0.05));
  }
  for (let t = 0; t < 14; t++) c.set(0, 0, 64 + t, J(0x8a5a30, t, 0, 0, 56, 0.05));
  for (let y = 0; y > -15; y--) {
    const rr = R * Math.sqrt(Math.max(0, 1 - (y / -15) ** 2)) ;
    for (let x = -R; x <= R; x++)
      for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d > rr || d < rr - 1.2) continue;
        const lat = ((x + z + y * 3) & 3) === 0 || ((x - z + y * 3) & 3) === 0;
        if (!lat) continue;
        c.set(x, y - 1, cz + z, J(0xe6d9b0, x, y, z, 57, 0.05));
      }
  }
  c.set(3, -6, cz + 2, 0xff7a4a);
  c.set(2, -6, cz + 2, 0xff9a6a);
  return c.done();
}

function scythe(T = THEMES.dark, o = {}) {
  const c = ctx();
  haft(c, T, -14, 88, 2, T.wrapLo, 0);
  wrapRod(c, T, -10, 22, 2.2);
  wrapRod(c, T, 40, 54, 2.2);
  for (const z of [-10, 22, 40, 54, 70]) ringAt(c, z, 2.2, T.guard, z & 3);
  c.set(2, 0, 34, T.guard);
  for (let k = 0; k < 6; k++) ball(c, 3.5 + k * 1.2, -0.5, 34.5, 1.3 - k * 0.12, (x, y, z) => J(k > 3 ? T.edge : T.guardHi, x, y, z, 44, 0.03));
  pommelAt(c, T, -14, 'ball', T.glow2);
  rod(c, 84, 94, 3.3, (x, y, z) => J(z === 89 ? T.guardHi : T.guard, x, y, z, 45, 0.04));
  ball(c, 0, 0, 96, 2.6, (x, y, z, d) => (d < 0.5 ? T.glow2 : T.glow), true);
  ball(c, 0, 0, 100.5, 1.2, T.edge);
  const L = 54;
  const dth = 1.75 / L;
  let x = -3;
  let z = 90;
  let th = 0.42;
  const ds = 0.4;
  for (let s = 0; s <= L; s += ds) {
    const f = s / L;
    const wd = Math.max(1, Math.round(15 * (1 - f ** 1.15)));
    const nx = -Math.sin(th);
    const nz = -Math.cos(th);
    for (let d = 0; d < wd; d += 0.7) {
      const px = Math.round(x + nx * d);
      const pz = Math.round(z + nz * d);
      const spine = d < 1.2;
      const lip = d > wd - 1.7 && wd > 2;
      const nlayers = spine ? 4 : 2;
      for (let l = 0; l < nlayers; l++) {
        const yy = l - nlayers / 2;
        let col;
        let g = false;
        if (spine) col = J(T.dark, px, yy, pz, 46, 0.03);
        else if (lip) col = J(T.edge, px, yy, pz, 47, 0.02);
        else if (Math.abs(d - Math.min(wd * 0.45, 5)) < 0.55 && f > 0.1 && f < 0.82) {
          col = o.plain ? J(shade(T.blade, 0.8), px, yy, pz, 49, 0.03) : T.glow;
          g = !o.plain && (((px + pz) & 1) === 0 || f < 0.55);
        } else col = J(shade(T.blade, d < wd * 0.5 ? 1.02 : 0.9), px, yy, pz, 48, 0.03);
        c.set(px, yy, pz, col, g);
      }
    }
    x -= Math.cos(th) * ds;
    z += Math.sin(th) * ds;
    th -= dth * ds;
  }
  if (o.after) o.after(c);
  return c.done();
}

/* ------------------------------ spears ------------------------------ */

function spear(T, budge) {
  const c = ctx();
  haft(c, T, -30, 104, 2, budge ? T.wood : T.wrapLo, 0);
  wrapRod(c, T, -6, 30, 2.2);
  for (const z of [-6, 30, 52, 74]) ringAt(c, z, 2.2, T.guard, z & 3);
  pommelAt(c, T, -30, budge ? 'horn' : 'ball', T.glow);
  rod(c, 100, 108, 3.2, (x, y, z) => J(z === 104 ? T.guardHi : T.guard, x, y, z, 49, 0.04));
  blade(c, T, { z0: 109, z1: 150, w0: 0, wf: leaf(budge ? 12 : 9, 0.7, 0.75), fuller: 'glow', fz: [0.08, 0.85], glowEvery: 5, thick: 4 });
  if (budge) {
    for (const dir of [-1, 1]) for (let k = 0; k < 11; k++) {
      const r = lerp(2.2, 0.6, k / 10);
      ball(c, dir * (3 + k * 0.7), 0, 106 + k * 0.5 + (k > 6 ? (k - 6) * 0.8 : 0), r, (x, y, z) => J(k > 8 ? T.edge : T.horn, x, y, z, 50, 0.03));
    }
  } else {
    for (const dir of [-1, 1]) {
      for (let k = 0; k < 18; k++) {
        const t = k / 17;
        const px = dir * Math.round(3 + Math.sin(t * 1.35) * 9);
        const pz = 106 + Math.round(t * 8 + t * t * 20);
        const r = lerp(2.0, 0.6, t);
        ball(c, px + (dir < 0 ? 0 : 1) * 0.5, 0, pz, r, (x, y, z) => J(k > 14 ? T.edge : k % 4 === 3 ? T.dark : T.blade, x, y, z, 51, 0.03));
      }
    }
    for (let k = 0; k < 26; k++) {
      const w = Math.max(2, 9 - Math.floor(k / 3));
      const sway = Math.round(Math.sin(k * 0.42) * 2.4);
      for (let q = 0; q < w; q++) c.set(-4 - k, 0, 62 + q + sway - Math.floor(k * 0.15), q === w - 1 || q === 0 ? J(T.membraneHi, k, q, 0, 52, 0.05) : J(T.membrane, k, q, 0, 53, 0.05));
    }
  }
  return c.done();
}

/* ------------------------------ staffs ------------------------------ */

function budgeStaff() {
  const T = THEMES.budge;
  const c = ctx();
  haft(c, T, -14, 90, 2, T.wood, 0);
  wrapRod(c, T, -6, 28, 2.2);
  for (const z of [-6, 28, 46, 64, 82]) ringAt(c, z, 2.2, T.guard, z & 3);
  pommelAt(c, T, -14, 'horn', T.glow);
  rod(c, 88, 96, 3.4, (x, y, z) => J(z === 92 ? T.guardHi : T.guard, x, y, z, 54, 0.04));
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    for (let k = 0; k < 28; k++) {
      const t = k / 27;
      const rad = 4.4 + Math.sin(t * 1.9) * 5.4 - t * t * 4.2;
      const px = dx * rad;
      const py = dy * rad;
      const pz = 96 + t * 26 + t * t * 2;
      ball(c, px + (dx > 0 ? 0.5 : dx < 0 ? -0.5 : 0), py + (dy > 0 ? 0.5 : dy < 0 ? -0.5 : 0), pz, lerp(2.3, 0.7, t), (x, y, z) => J(k > 24 ? T.edge : k % 6 === 5 ? T.hornDark : T.horn, x, y, z, 55, 0.03));
    }
  }
  orb(c, 0, 0, 111, 7.4, 0xfff2a0, T.glow2, 0xff7a1a);
  for (const [x, y, z] of [[-9, 2, 118], [9, -3, 106], [3, 8, 122], [-4, -9, 114]]) ball(c, x, y, z, 1.3, T.glow2, true);
  return c.done();
}

function darkStaff() {
  const T = THEMES.dark;
  const c = ctx();
  haft(c, T, -14, 82, 2, T.wrapLo, 0);
  wrapRod(c, T, -6, 24, 2.2);
  for (const z of [-6, 24, 44, 62, 80]) ringAt(c, z, 2.2, T.guard, z & 3);
  pommelAt(c, T, -14, 'ball', T.glow2);
  rod(c, 80, 88, 3.4, (x, y, z) => J(z === 84 ? T.guardHi : T.guard, x, y, z, 56, 0.04));
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 34; k++) {
      const t = k / 33;
      const px = dir * (3 + Math.sin(t * 1.5) * 10);
      const pz = 88 + (1 - Math.cos(t * 1.7)) * 26 + t * 12;
      ball(c, px + (dir > 0 ? 0.5 : -0.5), 0, pz, lerp(2.4, 0.6, t ** 0.8), (x, y, z) => J(k > 30 ? T.edge : k % 4 === 3 ? T.dark : T.blade, x, y, z, 57, 0.03));
    }
  }
  orb(c, 0, 0, 108, 7.2, T.glow2, T.glow, shade(T.glow, 0.75));
  for (let a = 0; a < 6; a++) ball(c, Math.cos(a * 1.05) * 10.5, Math.sin(a * 1.05) * 10.5, 108 + Math.sin(a * 2) * 3, 1.1, T.glow2, true);
  return c.done();
}

/* ------------------------------- wands ------------------------------ */

function budgeWand() {
  const T = THEMES.budge;
  const c = ctx();
  wrapRod(c, T, -6, 22, 1.8);
  ringAt(c, -6, 1.8, T.guard, 1);
  ringAt(c, 22, 1.8, T.guard, 2);
  pommelAt(c, T, -7, 'horn', T.glow);
  rod(c, 23, 27, 2.8, (x, y, z) => J(z === 25 ? T.guardHi : T.guard, x, y, z, 58, 0.04));
  const pts = [];
  for (let z = 28; z <= 58; z++) {
    const t = (z - 28) / 30;
    pts.push([-Math.round(t * t * 7), z, Math.max(0.8, 2.6 * (1 - t) + 0.7)]);
  }
  pathRod(c, pts, (x, y, z) => J(Math.floor(z) % 7 === 6 ? T.hornDark : T.horn, x, y, z, 59, 0.03));
  for (let z = 30; z < 56; z += 4) c.set(0 - Math.round(((z - 28) / 30) ** 2 * 7) - 1, 0, z, T.glow, true);
  orb(c, -7, 0, 63, 4.2, 0xfff2a0, T.glow2, 0xff7a1a);
  for (const [x, y, z] of [[-12, 3, 66], [-3, -4, 67], [-10, -4, 59]]) ball(c, x, y, z, 1, T.glow2, true);
  return c.done();
}

function darkWand() {
  const T = THEMES.dark;
  const c = ctx();
  wrapRod(c, T, -6, 20, 1.8);
  ringAt(c, -6, 1.8, T.guard, 1);
  ringAt(c, 20, 1.8, T.guard, 2);
  pommelAt(c, T, -7, 'ball', T.glow2);
  rod(c, 21, 26, 2.6, (x, y, z) => J(z === 23 ? T.guardHi : T.guard, x, y, z, 60, 0.04));
  for (const dir of [-1, 1]) for (let k = 0; k < 10; k++) ball(c, dir * (3 + k * 0.9), 0, 22 + k * 1.1 + k * k * 0.04, lerp(1.6, 0.5, k / 9), (x, y, z) => J(k > 7 ? T.edge : T.blade, x, y, z, 61, 0.03));
  rod(c, 27, 42, 1.5, (x, y, z) => J(z % 5 === 4 ? T.guard : T.wrapHi, x, y, z, 62, 0.04));
  ball(c, 0, 0, 50, 6.2, (x, y, z, d) => {
    const m = Math.abs(x + 0.5) + Math.abs(y + 0.5) + Math.abs(z + 0.5 - 50) * 0.7;
    return m < 6.2 ? (d < 0.45 ? T.glow2 : T.glow) : null;
  }, true);
  for (let a = 0; a < 4; a++) ball(c, Math.cos(a * 1.57 + 0.4) * 8.5, Math.sin(a * 1.57 + 0.4) * 8.5, 50 + (a % 2) * 5 - 2, 1, T.glow2, true);
  return c.done();
}

/** Octahedral ice crystal stretched along z, hot core and pale edges. */
function crystalAt(c, T, cx, cy, cz, r, stretch = 1.6) {
  ball(c, cx, cy, cz, r * 1.1, (x, y, z, d) => {
    const m = (Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy) + Math.abs(z + 0.5 - cz) / stretch) / r;
    if (m > 1) return null;
    return m < 0.4 ? T.glow2 : m < 0.78 ? T.glow : J(T.blade, x, y, z, 80, 0.03);
  }, true, stretch, 1);
}

function frostStaff() {
  const T = THEMES.frost;
  const c = ctx();
  haft(c, T, -14, 82, 2, T.wood, 0);
  wrapRod(c, T, -6, 26, 2.2);
  for (const z of [-6, 26, 46, 64, 80]) ringAt(c, z, 2.2, T.guard, z & 3);
  pommelAt(c, T, -14, 'claw', T.glow2);
  rod(c, 80, 88, 3.4, (x, y, z) => J(z === 84 ? T.guardHi : T.guard, x, y, z, 56, 0.04));
  for (let a = 0; a < 3; a++) {
    const ang = a * 2.094 + 0.5;
    for (let k = 0; k < 34; k++) {
      const t = k / 33;
      const rad = 3 + Math.sin(t * 1.5) * 9.5;
      const pz = 88 + (1 - Math.cos(t * 1.7)) * 22 + t * 14;
      ball(c, Math.cos(ang) * rad, Math.sin(ang) * rad, pz, lerp(2.5, 0.6, t ** 0.8), (x, y, z) => J(k > 30 ? T.edge : k % 4 === 3 ? T.hornDark : T.horn, x, y, z, 57, 0.03));
    }
  }
  crystalAt(c, T, 0, 0, 110, 9, 1.7);
  for (let a = 0; a < 6; a++) crystalAt(c, T, Math.cos(a * 1.05) * 12, Math.sin(a * 1.05) * 12, 106 + Math.sin(a * 2.3) * 7, 2.4, 1.8);
  return c.done();
}

function frostWand() {
  const T = THEMES.frost;
  const c = ctx();
  wrapRod(c, T, -6, 20, 1.8);
  ringAt(c, -6, 1.8, T.guard, 1);
  ringAt(c, 20, 1.8, T.guard, 2);
  pommelAt(c, T, -7, 'claw', T.glow2);
  rod(c, 21, 26, 2.6, (x, y, z) => J(z === 23 ? T.guardHi : T.guard, x, y, z, 60, 0.04));
  for (let a = 0; a < 3; a++) {
    const ang = a * 2.094 + 1.1;
    for (let k = 0; k < 11; k++) ball(c, Math.cos(ang) * (3 + k * 0.7), Math.sin(ang) * (3 + k * 0.7), 22 + k * 1.3, lerp(1.6, 0.5, k / 10), (x, y, z) => J(k > 8 ? T.edge : T.horn, x, y, z, 61, 0.03));
  }
  rod(c, 27, 40, 1.5, (x, y, z) => J(z % 5 === 4 ? T.guard : T.wrapHi, x, y, z, 62, 0.04));
  crystalAt(c, T, 0, 0, 50, 6.4, 1.7);
  for (let a = 0; a < 4; a++) crystalAt(c, T, Math.cos(a * 1.57 + 0.4) * 8.5, Math.sin(a * 1.57 + 0.4) * 8.5, 48 + (a % 2) * 6, 1.4, 1.6);
  return c.done();
}

function ashWand() {
  const T = THEMES.iron;
  const c = ctx();
  haft(c, T, -6, 50, 1.4, T.wood, 0);
  wrapRod(c, T, -6, 14, 1.8);
  ringAt(c, 14, 1.8, T.guard, 1);
  for (let k = 0; k < 4; k++) c.set(k % 2 ? 1 : -2, k - 1, 26 + k * 6, J(T.wood, k, 0, 0, 63, 0.1));
  for (const dir of [-1, 1]) for (let k = 0; k < 6; k++) c.set(dir < 0 ? -2 - k : 1 + k, 0, 48 + k, J(T.wrapHi, k, dir, 0, 64, 0.05));
  orb(c, 0, 0, 56, 3.8, 0xf4fbff, 0x6fd4ff, 0x3a9ae0);
  return c.done();
}

function fieldTome() {
  const T = THEMES.iron;
  const c = ctx();
  for (let z = 4; z < 40; z++)
    for (let x = -11; x <= 10; x++)
      for (let y = -2; y <= 2; y++) {
        const cover = y === -2 || y === 2;
        const rim = x === -11 || x === 10 || z === 4 || z === 39;
        const col = cover ? J(rim ? T.guard : x === -11 ? T.wrapLo : T.wrapHi, x, y, z, 65, 0.05) : J(0xf2e2b8, x, y, z, 66, 0.03);
        c.set(x, y, z, col);
      }
  for (let z = 10; z < 34; z += 6) for (let y = -2; y <= 2; y++) c.set(-11, y, z, J(T.guardHi, y, z, 0, 67, 0.04));
  ball(c, 0, 3, 21, 2.2, T.glow2, true, 1);
  for (let x = -5; x <= 4; x++) c.set(x, 3, 12, J(T.guard, x, 0, 0, 68, 0.04));
  return c.done();
}

/* -------------------------------- bows ------------------------------ */

/**
 * Bow built along y, riser in the hand at z=0, belly facing +z (the target)
 * and the string drawn straight behind at -z (the archer).
 */
function bow(T, o) {
  const { L, D, recurve = 6, grip = 6, style = 'wood', nock = null, after = null } = o;
  const c = ctx();
  const stringZ = -D + recurve - 1;
  for (let y = -L; y <= L; y++) {
    const a = Math.abs(y + 0.5) / L;
    const zc = -Math.round(D * a ** 1.65) + (a > 0.8 ? Math.round(((a - 0.8) / 0.2) ** 1.4 * recurve) : 0);
    const isGrip = Math.abs(y + 0.5) <= grip;
    const hw = isGrip ? 3 : a < 0.5 ? 2.2 : a < 0.85 ? 1.7 : 1.3;
    const dz = isGrip ? 3 : a < 0.7 ? 3 : 2;
    const n = Math.ceil(hw);
    for (let x = -n; x < n; x++) {
      if (Math.abs(x + 0.5) > hw) continue;
      for (let k = 0; k < dz; k++) {
        const zz = zc + k - 1;
        const belly = k === 0;
        let col;
        if (isGrip) col = J(((Math.floor(y / 2) + k) & 1) ? T.wrapLo : T.wrap, x, y, zz, 90, 0.05);
        else if (Math.floor(Math.abs(y + 0.5)) % 8 === 7) col = J(T.guard, x, y, zz, 91, 0.04);
        else if (belly) col = J(T.wrapLo === T.wrap ? T.dark : shade(style === 'horn' ? T.hornDark : T.wrapLo, 1.0), x, y, zz, 92, 0.04);
        else col = J(style === 'horn' ? (a > 0.55 ? T.horn : T.hornDark) : a > 0.62 ? T.blade : T.wrapHi, x, y, zz, 93, 0.04);
        if (!isGrip && x === -n && a > 0.2) col = shade(col, 0.9);
        c.set(x, y, zz, col);
      }
    }
    c.set(0, y, stringZ, T.glow && style === 'dark' ? (Math.floor(y / 3) % 2 ? T.glow2 : T.glow) : (Math.abs(y) % 4 === 0 ? 0xf4f0dc : T.string), style === 'dark');
  }
  const tipZ = -D + recurve;
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      const yy = dir * (L + k) + (dir < 0 ? -1 : 0);
      const zz = tipZ - 1 + (style === 'horn' ? Math.round(k * 0.5) : Math.round(k * 0.3));
      const col = style === 'horn' ? J(k > 5 ? T.edge : T.claw, k, dir, 0, 94, 0.03) : J(k > 5 ? T.edge : T.blade, k, dir, 0, 95, 0.03);
      c.set(0, yy, zz, col);
      c.set(-1, yy, zz, shade(col, 0.9));
      c.set(0, yy, zz + 1, shade(col, 1.04));
    }
    const ny = dir * (L + 1);
    c.set(0, ny, stringZ, nock || T.guardHi);
  }
  for (let z = 1; z <= 4; z++) for (const x of [-2, 1]) c.set(x, 2, z, J(T.guard, x, 2, z, 96, 0.04));
  c.set(0, 0, 3, J(T.guardHi, 0, 0, 3, 97, 0.03));
  for (const y of [-2, 1]) for (let z = 0; z < 2; z++) c.set(-1, y, 2 + z, T.glow, style !== 'wood');
  if (after) after(c);
  return c.done();
}

const BOWS = {
  bow: () => bow(THEMES.iron, { L: 34, D: 15, recurve: 4, style: 'wood' }),
  budgebow: () => bow(THEMES.budge, { L: 40, D: 20, recurve: 6, style: 'horn' }),
  darkbow: () => bow(THEMES.dark, { L: 44, D: 22, recurve: 7, style: 'dark' }),
  budgeshortbow: () => bow(THEMES.budge, { L: 32, D: 14, recurve: 5, style: 'horn', grip: 5 }),
  darkshortbow: () => bow(THEMES.dark, { L: 32, D: 14, recurve: 5, style: 'dark', grip: 5 }),
  yetilongbow: () => bow(THEMES.frost, { L: 44, D: 21, recurve: 7, style: 'horn' }),
  yetishortbow: () => bow(THEMES.frost, { L: 32, D: 14, recurve: 5, style: 'horn', grip: 5 }),
};

/* ----------------------------- crossbows ---------------------------- */

function crossbow(T, style, after = null) {
  const c = ctx();
  const budge = style === 'budge';
  const iron = style === 'iron';
  const span = iron ? 22 : budge ? 22 : 26;
  const prodZ = 60;
  const woodCol = iron ? T.wood : budge ? T.wood : T.wrapLo;
  for (let z = -10; z <= 68; z++) {
    const h = z < 2 ? 2 : 3;
    for (let x = -2; x <= 1; x++)
      for (let y = -h; y <= 2; y++) {
        if (z > 14 && y < -1) continue;
        if (z < 4 && Math.abs(x + 0.5) > 1.5 && y < 0) continue;
        const top = y === 2;
        let col = J(z < 14 && !iron ? ((z >> 1) & 1 ? T.wrapLo : T.wrap) : shade(woodCol, top ? 1.1 : (x < 0 ? 0.92 : 1)), x, y, z, 100, 0.06);
        if (z >= 14 && top && z % 9 === 0) col = J(T.guard, x, y, z, 101, 0.04);
        c.set(x, y, z, col);
      }
  }
  c.set(-1, 3, 20, T.dark);
  c.set(0, 3, 20, T.dark);
  for (let z = 22; z < 66; z++) for (const x of [-2, 1]) c.set(x, 3, z, J(shade(woodCol, 1.18), x, 3, z, 102, 0.05));
  rod(c, -12, -10, 3.6, (x, y, z) => J(T.guardHi, x, y, z, 103, 0.04));
  for (let z = -1; z <= 8; z++) for (let x = -2; x <= 1; x++) for (let y = -10; y <= -4; y++) {
    if (Math.hypot(x + 0.5, (y + 7) * 0.55) > 2.3) continue;
    c.set(x, y, z, J(((z + y) >> 1) & 1 ? T.wrapLo : T.wrap, x, y, z, 104, 0.05));
  }
  for (let q = 0; q < 8; q++) {
    const t = q / 7;
    c.set(0, -4 - Math.round(Math.sin(t * Math.PI) * 4), 10 + Math.round(t * 8), T.guard);
  }
  for (let y = -3; y <= -2; y++) c.set(0, y, 12, T.guardHi);
  for (let x = -5; x <= 4; x++) for (let y = -3; y <= 3; y++) for (let z = prodZ - 3; z <= prodZ + 3; z++) {
    if (y < -1 && Math.abs(x + 0.5) > 2.6) continue;
    c.set(x, y, z, J(Math.abs(x + 0.5) > 3.5 ? T.guardHi : T.guard, x, y, z, 105, 0.04));
  }
  for (let x = -span; x < span; x++) {
    const a = Math.abs(x + 0.5) / span;
    const zc = prodZ - Math.round(8 * a ** 1.7) + (a > 0.85 ? Math.round(((a - 0.85) / 0.15) * 4) : 0);
    const mid = a < 0.22;
    const th = mid ? 5 : a < 0.7 ? 4 : 3;
    for (let y = -Math.floor(th / 2); y < th - Math.floor(th / 2); y++)
      for (let q = 0; q < 3; q++) {
        const zz = zc + q - 1;
        const col = a > 0.9 ? J(T.edge, x, y, zz, 106, 0.03) : Math.floor(Math.abs(x + 0.5)) % 7 === 6 ? J(T.guard, x, y, zz, 107, 0.04) : J(iron ? T.blade : budge ? (q === 0 ? T.hornDark : T.horn) : q === 0 ? T.wrapLo : a < 0.5 ? T.wrapHi : T.blade, x, y, zz, 108, 0.04);
        c.set(x, y, zz, col);
      }
    if (style === 'dark' && a > 0.25 && a < 0.8 && x % 4 === 0) c.set(x, 2, zc, T.glow, true);
  }
  const nutZ = 22;
  for (const dir of [-1, 1]) {
    const tipX = dir < 0 ? -span : span - 1;
    const tipZ = prodZ - 8 + 4;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      c.set(Math.round(lerp(tipX, 0, t)), 0, Math.round(lerp(tipZ, nutZ, t)), style === 'dark' ? T.glow : T.string, style === 'dark');
    }
  }
  for (let y = -1; y <= 1; y++) for (let z = prodZ + 4; z <= prodZ + 12; z++) for (const x of [-5, 4]) c.set(x, y, z, J(T.guard, x, y, z, 109, 0.04));
  for (let x = -5; x <= 4; x++) for (let y = -1; y <= 1; y++) c.set(x, y, prodZ + 12, J(T.guardHi, x, y, 0, 110, 0.04));
  for (let z = 24; z <= 70; z++) {
    c.set(0, 4, z, z > 64 ? T.edge : J(budge || iron ? 0x7a4e2c : T.wrapHi, z, 4, 0, 111, 0.05));
    if (z > 64) {
      c.set(-1, 4, z, T.edge);
      if (z < 68) c.set(0, 5, z, T.edge);
    }
  }
  for (let k = 0; k < 4; k++) {
    c.set(-1, 4, 25 + k * 2, J(budge ? T.vein ?? T.glow : T.membraneHi, k, 0, 0, 112, 0.05));
    c.set(1, 4, 25 + k * 2, J(budge ? T.vein ?? T.glow : T.membraneHi, k, 1, 0, 113, 0.05));
  }
  if (style === 'dark') for (let z = 24; z < 56; z += 4) c.set(-1, 3, z, T.glow, true);
  else if (budge) for (let z = 26; z < 56; z += 6) c.set(-1, 3, z, T.glow, true);
  if (after) after(c);
  return c.done();
}

function carvingKnife() {
  const c = ctx();
  for (let z = 0; z < 14; z++)
    for (let x = -2; x <= 1; x++)
      for (let y = -2; y <= 1; y++) c.set(x, y, z, z < 2 ? 0x3c444c : 0x6a4328);
  for (let x = -4; x <= 3; x++) for (let y = -1; y <= 0; y++) c.set(x, y, 14, 0x9aa3ab);
  for (let z = 15; z < 36; z++) {
    const w = z > 30 ? 0 : 1;
    for (let x = -w; x <= w; x++) c.set(x, 0, z, z > 28 ? 0xffffff : 0xd5dde4);
    if (z < 32) c.set(0, -1, z, 0x8d969e);
  }
  return c.done();
}

function tinderbox() {
  const c = ctx();
  for (let z = 0; z < 12; z++)
    for (let x = -4; x <= 3; x++)
      for (let y = -3; y <= 2; y++) {
        const shell = x === -4 || x === 3 || y === -3 || y === 2 || z === 0 || z === 11;
        const lid = y >= 1;
        c.set(x, y, z, shell ? (lid ? 0xb7bcc4 : 0x8d939c) : lid ? 0xd23a32 : 0x6a4030);
      }
  for (let z = 4; z <= 8; z++) c.set(-1, 3, z, 0x2c3038);
  c.set(0, 3, 6, 0xe8e4dc);
  c.set(1, 3, 7, 0xffe08a);
  return c.done();
}

/* ------------------------------ registry ---------------------------- */

const KIT = { ctx, rod, ball, orb, ringAt, wrapRod, haft, pathRod, spike, blade, leaf, crossguard, pommelAt, sword, scythe, bow, crossbow, spearShaft: spear };

const BUILDERS = {
  ...SWORDS,
  ...jungleWeapons(KIT),
  ...BOWS,
  axe: ironAxe,
  knife: carvingKnife,
  ironsword: () => sword(THEMES.iron, { guardHalf: 8, b: { z1: 86, w0: 9, tip: 0.82 } }),
  irongreatsword: () => sword(THEMES.iron, { guardHalf: 12, b: { z1: 108, w0: 12, tip: 0.78 } }),
  ironspear: () => spear(THEMES.iron, false),
  ironhammer: ironHammer,
  pick: ironPick,
  fishrod: fishingPole,
  fishnet: fishingNet,
  tinder: tinderbox,
  hammer: ironHammer,
  wand: ashWand,
  tome: fieldTome,
  crossbow: () => crossbow(THEMES.iron, 'iron'),
  budgemaul: () => maul(THEMES.budge),
  darkhammer: () => maul(THEMES.dark),
  darkscythe: scythe,
  budgespear: () => spear(THEMES.budge, true),
  darkspear: () => spear(THEMES.dark, false),
  budgestaff: budgeStaff,
  darkstaff: darkStaff,
  budgewand: budgeWand,
  darkwand: darkWand,
  budgecrossbow: () => crossbow(THEMES.budge, 'budge'),
  darkcrossbow: () => crossbow(THEMES.dark, 'dark'),
  yetihammer: () => maul(THEMES.frost),
  yetiscythe: () => scythe(THEMES.frost),
  yetispear: () => spear(THEMES.frost, false),
  yetistaff: frostStaff,
  yetiwand: frostWand,
  yeticrossbow: () => crossbow(THEMES.frost, 'dark'),
  holyhammer: holyHammerVoxels,
  demonsword: demonSwordVoxels,
};

/** Voxel model for the held weapons; null for kinds built elsewhere. */
export function buildWeaponVoxels(kind) {
  return BUILDERS[kind] ? BUILDERS[kind]() : null;
}

/* ----------------------------- shields/books ------------------------ */

const themeOf = (setId) => (setId === 'iron' ? THEMES.iron : setId.startsWith('dark') ? THEMES.dark : setId.startsWith('yeti') ? THEMES.frost : THEMES.budge);

/** Flat shield (face up on +y), 48 wide and deep with raised rim, boss and relief. */
export function buildShieldModel(setId) {
  if (setId === 'demonset') return demonShieldVoxels();
  if (JUNGLE_SHIELD_SETS.has(setId)) return jungleShield(KIT, setId);
  const T = themeOf(setId);
  const dark = T === THEMES.dark || T === THEMES.frost;
  const c = ctx();
  const R = 24;
  for (let z = 0; z < 48; z++)
    for (let x = 0; x < 48; x++) {
      const dx = Math.abs(x + 0.5 - R);
      const dz = z + 0.5 - R;
      const shape = dark ? (dx / 18.8) ** 2.3 + (Math.abs(dz) / (dz > 0 ? 22.8 : 21.2)) ** 1.7 : (dx / 22) ** 2 + (dz / 22.6) ** 2;
      if (shape > 1) continue;
      const rim = shape > 0.8;
      const rim2 = shape > 0.72 && !rim;
      const rb = Math.hypot(dx, dz);
      const boss = rb < (dark ? 5.4 : 6.6);
      const bossRing = !boss && rb < (dark ? 8.2 : 9.4);
      const hh = rim ? 4 : rim2 ? 3 : 2;
      for (let y = 0; y < hh; y++) c.set(x - R, y, z - R, shade(J(T.wrapLo, x, y, z, 113, 0.05), 0.75));
      let col;
      if (rim) col = (x + z) % 5 === 0 ? J(T.edge, x, 4, z, 111, 0.03) : J(T.guard, x, 4, z, 111, 0.04);
      else if (rim2) col = J(shade(T.wrapLo, 0.9), x, 3, z, 112, 0.05);
      else {
        const p = (Math.floor((x + (z >> 2 & 1) * 2) / 3) + (z >> 1)) & 3;
        col = J(p === 0 ? T.wrapLo : p === 3 ? T.wrapHi : T.wrap, x, 2, z, 112, 0.05);
        if (dx < 2.2) col = J(T.guard, x, 2, z, 116, 0.04);
        if (bossRing) col = J(T.guard, x, 2, z, 117, 0.04);
      }
      if (!boss) c.set(x - R, hh, z - R, col);
      if (!boss && !rim && !rim2 && dx < 2.2) c.set(x - R, hh + 1, z - R, J(T.guardHi, x, 3, z, 119, 0.04));
      if (bossRing) c.set(x - R, hh + 1, z - R, J(T.guard, x, 3, z, 118, 0.04));
    }
  const bossR = dark ? 5.4 : 6.6;
  ball(c, 0, 4, 0, bossR, (x, y, z, d) => (dark ? (d < 0.5 ? T.glow2 : T.glow) : d < 0.35 ? T.edge : J(T.blade, x, y, z, 114, 0.03)), dark, 1, 0.6);
  if (!dark) for (let a = 0; a < 8; a++) ball(c, Math.cos(a * 0.785) * 12.5, 4.5, Math.sin(a * 0.785) * 12.5, 1.3, (x, y, z) => J(T.blade, x, y, z, 115, 0.03));
  else for (let a = 0; a < 6; a++) ball(c, Math.cos(a * 1.047 + 0.2) * 12, 4.5, Math.sin(a * 1.047 + 0.2) * 12, 1.2, T.glow2, true);
  for (let a = 0; a < 12; a++) {
    const ang = a * (Math.PI / 6) + 0.26;
    const ex = Math.cos(ang) * (dark ? 17.2 : 20);
    const ez = Math.sin(ang) * (dark ? 20.4 : 20.4);
    ball(c, ex, 4.6, ez, 1.6, (x, y, z, d) => (dark ? (a % 2 ? T.edge : T.guardHi) : d < 0.4 ? T.edge : J(T.horn, x, y, z, 121, 0.03)), false, 1, 0.8);
  }
  const r = c.done();
  r.oy += 2;
  return r;
}

/** Closed spell book lying flat; spine on -x, length along +z. */
export function buildBookModel(setId) {
  if (JUNGLE_BOOK_SETS.has(setId)) return jungleBook(KIT, setId);
  const T = themeOf(setId);
  const dark = T === THEMES.dark || T === THEMES.frost;
  const c = ctx();
  const W = 11;
  const Ln = 32;
  for (let z = 0; z < Ln; z++)
    for (let x = -W; x <= W; x++) {
      for (let y = -2; y <= 5; y++) {
        const cover = y === -2 || y === 5 || y === -1 || y === 4;
        const spine = x === -W;
        const coverCol = J(dark ? T.wrap : T.wrapLo, x, y, z, 120, 0.05);
        let col;
        if (spine) col = J(shade(T.wrapLo, 0.95), x, y, z, 122, 0.05);
        else if (cover) col = coverCol;
        else col = J(((y + z) & 1) ? 0xf0e4c0 : 0xe2d4a6, x, y, z, 121, 0.03);
        if (!cover && (x > W - 1 || z === 0 || z === Ln - 1)) col = J(0xf6ecc8, x, y, z, 124, 0.03);
        c.set(x, y, z, col);
      }
      const edge = x >= W - 1 || z <= 1 || z >= Ln - 2;
      if (edge) c.set(x, 6, z, J(T.guard, x, 6, z, 123, 0.04));
      else if (x > -W + 1 && x < W - 3 && z > 3 && z < Ln - 4 && (x === -W + 3 || x === W - 4 || z === 4 || z === Ln - 5)) c.set(x, 6, z, J(shade(T.guard, 0.9), x, 6, z, 125, 0.04));
      else c.set(x, 6, z, J(dark ? T.wrap : T.wrapLo, x, 6, z, 126, 0.05));
    }
  for (let z = 1; z < Ln - 1; z++) for (let y = -2; y <= 6; y++) if (y % 3 === 2) c.set(-W, y, z, J(T.guard, y, z, 0, 127, 0.04));
  for (const z of [3, 10, 21, 28]) for (let y = -2; y <= 6; y++) c.set(-W - 1, y, z, J(T.guard, y, z, 0, 128, 0.04));
  for (const [x, z] of [[W, 0], [W, Ln - 1], [-W + 1, 0], [-W + 1, Ln - 1]]) {
    for (let y = -2; y <= 6; y++) for (let a = 0; a < 3; a++) {
      c.set(x - Math.sign(x) * a * 0 - (x > 0 ? a : -a * 0), y, z + (z === 0 ? a : -a), J(T.guardHi, x, y, z, 129, 0.04));
    }
  }
  ball(c, 2, 6, 16, 5, (x, y, z, d) => (d < 0.4 ? (dark ? T.glow2 : 0xfff2a0) : dark ? T.glow : T.glow2), true, 0.9, 0.55);
  for (let a = 0; a < 8; a++) ball(c, 2 + Math.cos(a * 0.785) * 8.4, 7, 16 + Math.sin(a * 0.785) * 8.4, 1.1, J(T.guardHi, a, 0, 0, 130, 0.03));
  for (let x = W - 4; x <= W + 1; x++) for (let y = 0; y <= 3; y++) c.set(x, y, 16, J(T.guardHi, x, y, 16, 131, 0.04));
  for (let y = -2; y <= 5; y++) c.set(W + 1, y, 15, J(T.guard, y, 0, 0, 132, 0.04));
  for (let z = Ln; z < Ln + 5; z++) c.set(-W + 6, 0, z, J(dark ? T.glow : T.glow2, z, 0, 0, 133, 0.03), true);
  const r = c.done();
  r.oz += 16;
  r.oy += 2;
  return r;
}
