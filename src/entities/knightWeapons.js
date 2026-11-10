import { VoxelModel, RNG, hash3, shade, mix } from '../engine/voxel.js';
import { HOLY, DEMON } from '../data/knights.js';
import { J, pick, spike } from './knightKit.js';

/** Weapon-scale voxel models for the knights' dropped gear: Holy hammer, Demon sword, Demon shield. */
const SIZE = 0.015;

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
    clear: (x, y, z) => cells.delete(key(Math.floor(x), Math.floor(y), Math.floor(z))),
    each(fn) {
      for (const v of [...cells.values()]) fn(v[0], v[1], v[2], v[3], v[4]);
    },
    done(pad = 1) {
      let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
      for (const [x, y, z] of cells.values()) {
        mnx = Math.min(mnx, x); mxx = Math.max(mxx, x);
        mny = Math.min(mny, y); mxy = Math.max(mxy, y);
        mnz = Math.min(mnz, z); mxz = Math.max(mxz, z);
      }
      const M = new VoxelModel(mxx - mnx + 1 + pad * 2, mxy - mny + 1 + pad * 2, mxz - mnz + 1 + pad * 2);
      for (const [x, y, z, col, glow] of cells.values()) M.set(x - mnx + pad, y - mny + pad, z - mnz + pad, col, glow);
      return { M, ox: -mnx + pad, oy: -mny + pad, oz: -mnz + pad, size: SIZE };
    },
  };
  return api;
}

function rod(c, z0, z1, r, fn, glow = false) {
  const n = Math.ceil(r);
  for (let z = z0; z <= z1; z++)
    for (let y = -n; y < n; y++)
      for (let x = -n; x < n; x++) {
        if (Math.hypot(x + 0.5, y + 0.5) > r) continue;
        c.set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn, glow);
      }
}

function ball(c, cx, cy, cz, r, fn, glow = false) {
  const n = Math.ceil(r) + 1;
  for (let z = Math.floor(cz - n); z <= Math.ceil(cz + n); z++)
    for (let y = Math.floor(cy - n); y <= Math.ceil(cy + n); y++)
      for (let x = Math.floor(cx - n); x <= Math.ceil(cx + n); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz);
        if (d <= r) c.set(x, y, z, typeof fn === 'function' ? fn(x, y, z, d / r) : fn, glow);
      }
}

/**
 * The holy hammer's blunt ends sit on ±x and the broad cross faces down the haft.
 * Turn the head so a blunt face points forward.
 */
function turnStrike(c, zMin, bulge = 0) {
  const head = [];
  let mnz = 1e9;
  let mxz = -1e9;
  c.each((x, y, z, col, glow) => {
    const proud = bulge > 0 && z >= zMin - 6 && (Math.abs(x) > bulge || Math.abs(y) > bulge);
    if (z < zMin && !proud) return;
    head.push([x, y, z, col, glow]);
    mnz = Math.min(mnz, z);
    mxz = Math.max(mxz, z);
  });
  if (!head.length) return;
  const cz = Math.round((mnz + mxz) / 2);
  for (const [x, y, z] of head) c.clear(x, y, z);
  for (const [x, y, z, col, glow] of head) c.set(-(z - cz), y, x + cz, col, glow);
}

/** Stamps a rectilinear glyph (list of [a,b] corners) as a 2-voxel stroke via put(a,b). */
function strokePath(pts, put, w = 2) {
  for (let i = 1; i < pts.length; i++) {
    const [a0, b0] = pts[i - 1];
    const [a1, b1] = pts[i];
    const n = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0));
    for (let k = 0; k <= n; k++) {
      const a = Math.round(a0 + ((a1 - a0) * k) / n);
      const b = Math.round(b0 + ((b1 - b0) * k) / n);
      for (let da = 0; da < w; da++) for (let db = 0; db < w; db++) put(a + da, b + db);
    }
  }
}

/* ---------------------------------------------------------------- */
/* Holy Knight war hammer: stone head, gold frame, blue runes        */
/* ---------------------------------------------------------------- */

const HAMMER_RUNES = [
  [[-8, -10], [-8, -3], [-2, -3], [-2, -9], [4, -9], [4, -1], [-5, -1], [-5, 5], [2, 5], [2, 10], [8, 10]],
  [[-9, 9], [-9, 2], [-3, 2], [-3, 8], [3, 8], [3, 0], [8, 0], [8, -8], [0, -8], [0, -3]],
];

export function holyHammerVoxels() {
  const H = HOLY;
  const c = ctx();
  const gold = (x, y, z, s = 0) => (((x + y + z) & 3) === 0 ? J(H.goldHi, x, y, z, 60 + s, 0.03) : J(H.gold, x, y, z, 61 + s, 0.04));
  const goldLo = (x, y, z, s = 0) => J(H.goldLo, x, y, z, 62 + s, 0.05);
  const stone = (x, y, z, k = 0) => J(pick(H.stone, x >> 1, y >> 1, z >> 1, 41 + k), x, y, z, 42 + k, 0.05);

  for (let z = -18; z <= 66; z++)
    for (let y = -3; y < 3; y++)
      for (let x = -3; x < 3; x++) {
        if (Math.hypot(x + 0.5, y + 0.5) > 2.7) continue;
        const ang = Math.atan2(y + 0.5, x + 0.5);
        let col;
        if (z < 36) {
          const ph = Math.floor(z * 0.55 + ang * 1.05) & 1;
          col = ph ? H.haftLo : H.haft;
          if (z % 7 === 6) col = H.haftHi;
        } else col = (z & 3) === 0 ? H.haftLo : x + y > 0 ? H.haft : H.haftHi;
        c.set(x, y, z, J(col, x, y, z, 31, 0.07));
      }
  for (const z of [-14, 36, 37, 52, 53]) rod(c, z, z, 3.3, (x, y, zz) => gold(x, y, zz, 1));
  ball(c, 0, 0, -20, 4.2, (x, y, z, d) => (d > 0.72 ? goldLo(x, y, z) : gold(x, y, z, 2)));
  rod(c, 25, 31, 3.6, (x, y, z) => (z === 25 || z === 31 ? goldLo(x, y, z, 3) : gold(x, y, z, 4)));
  for (const y of [3, -4]) {
    for (let z = 26; z <= 30; z++) for (const x of [-1, 0]) c.set(x, y, z, z === 28 ? H.glowCore : H.glowHi, true);
    for (const x of [-2, 1]) c.set(x, y, 28, H.glowHi, true);
  }

  for (let z = 60; z <= 88; z++)
    for (let y = -13; y <= 12; y++)
      for (let x = -28; x <= 27; x++) {
        const ax = Math.abs(x + 0.5) / 28;
        const ay = Math.abs(y + 0.5) / 13;
        const az = Math.abs(z + 0.5 - 74) / 14;
        if (ax ** 10 + ay ** 10 + az ** 10 > 1) continue;
        const near = (ax > 0.93) + (ay > 0.86) + (az > 0.9);
        const ring = Math.abs(x + 0.5) > 18 && Math.abs(x + 0.5) < 20.6;
        if (near >= 2) c.set(x, y, z, gold(x, y, z, 5));
        else if (ring) c.set(x, y, z, goldLo(x, y, z, 6));
        else c.set(x, y, z, stone(x, y, z));
      }
  const faces = [];
  c.each((x, y, z) => {
    if (z < 60 || z > 88 || y < -13 || y > 12 || x < -28 || x > 27) return;
    if (!c.has(x, y + 1, z)) faces.push(['+y', x, y, z]);
    if (!c.has(x, y - 1, z)) faces.push(['-y', x, y, z]);
    if (!c.has(x + 1, y, z)) faces.push(['+x', x, y, z]);
    if (!c.has(x - 1, y, z)) faces.push(['-x', x, y, z]);
    if (!c.has(x, y, z + 1)) faces.push(['+z', x, y, z]);
  });
  const crossAt = (x, z) => {
    const dx = x + 0.5;
    const dz = z + 0.5 - 75;
    const v = Math.abs(dx) <= 2 && Math.abs(dz) <= 11;
    const h = Math.abs(dz - 3) <= 2 && Math.abs(dx) <= 10;
    if (!v && !h) return null;
    const core = (v && Math.abs(dx) < 1.1) || (h && Math.abs(dz - 3) < 1.1);
    return core ? H.glowCore : H.glow;
  };
  for (const [f, x, y, z] of faces) {
    if (f === '+y' || f === '-y') {
      const u = Math.abs(x + 0.5) / 17 + Math.abs(z + 0.5 - 74) / 12.8;
      if (Math.abs(x + 0.5) > 19 || u > 1) continue;
      const cr = crossAt(x, z);
      if (cr) c.set(x, y, z, cr, true);
      else if (u > 0.86) c.set(x, y + (f === '+y' ? 1 : -1), z, gold(x, y, z, 7));
      else c.set(x, y, z, shade(stone(x, y, z, 3), 1.1));
    } else if (f === '+x' || f === '-x') {
      const dy = y + 0.5;
      const dz = z + 0.5 - 74;
      if (Math.abs(dy) > 10.5 || Math.abs(dz) > 12) continue;
      const sgn = f === '+x' ? 1 : -1;
      const border = Math.abs(dy) > 8.8 || Math.abs(dz) > 10.4;
      if (border) c.set(x + sgn, y, z, gold(x, y, z, 8));
      else c.set(x, y, z, J(H.stoneDeep, x, y, z, 9, 0.08));
    } else if (f === '+z') {
      const dx = x + 0.5;
      const dy = y + 0.5;
      if (Math.abs(dx) > 17 || Math.abs(dy) > 9.5) continue;
      const border = Math.abs(dx) > 15.2 || Math.abs(dy) > 7.8;
      const v = Math.abs(dx) <= 1.6 && Math.abs(dy) <= 6;
      const h = Math.abs(dy) <= 1.6 && Math.abs(dx) <= 8;
      if (v || h) c.set(x, y, z, (v && Math.abs(dx) < 0.9) || (h && Math.abs(dy) < 0.9) ? H.glowCore : H.glow, true);
      else if (border) c.set(x, y, z + 1, gold(x, y, z, 10));
    }
  }
  for (const sgn of [1, -1]) {
    const gx = sgn > 0 ? 28 : -29;
    HAMMER_RUNES.forEach((pts, i) => {
      if ((i === 0) !== (sgn > 0)) return;
      strokePath(pts, (a, b) => {
        const y = a;
        const z = 74 + b;
        if (Math.abs(y + 0.5) < 8.2 && Math.abs(b) < 10) c.set(sgn > 0 ? 27 : -28, y, z, (a + b) & 1 ? H.glowHi : H.glow, true);
      });
    });
    void gx;
  }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const z of [60, 88]) ball(c, sx * 26.5, sy * 11.5, z, 2.4, (x, y, zz, d) => (d > 0.7 ? goldLo(x, y, zz, 11) : gold(x, y, zz, 12)));
  rod(c, 57, 61, 4.6, (x, y, z) => (z === 61 || z === 57 ? goldLo(x, y, z, 13) : gold(x, y, z, 14)));
  turnStrike(c, 60, 5);
  return c.done();
}

/* ---------------------------------------------------------------- */
/* Demon Knight greatsword: serrated black blade, red cracks         */
/* ---------------------------------------------------------------- */

export function demonSwordVoxels() {
  const D = DEMON;
  const c = ctx();
  const steel = (x, y, z, k = 0) => J(pick(D.steel, x, y, z, 71 + k), x, y, z, 72 + k, 0.05);
  const dark = (x, y, z, k = 0) => J(pick(D.plate, x, y, z, 73 + k), x, y, z, 74 + k, 0.06);

  rod(c, -10, 17, 2.5, (x, y, z) => {
    const ph = Math.floor(z * 0.6 + Math.atan2(y + 0.5, x + 0.5) * 1.1) & 1;
    return J(ph ? D.leatherLo : D.leather, x, y, z, 75, 0.07);
  });
  for (const z of [-4, 4, 12]) rod(c, z, z, 2.9, (x, y, zz) => J(D.crack, x, y, zz, 76, 0.1));
  ball(c, 0, 0, -14, 3.8, (x, y, z, d) => (d > 0.8 ? dark(x, y, z) : steel(x, y, z)));
  for (const [dx, dy, dz] of [[0, 0, -1], [1, 0, -0.4], [-1, 0, -0.4], [0, 1, -0.4], [0, -1, -0.4]]) spike(c, dx * 3, dy * 3, -14 + dz * 3, dx, dy, dz, 5, 1.6, (x, y, z, t) => (t > 0.7 ? D.edge : dark(x, y, z)), 0.5);

  for (let x = -16; x <= 15; x++) {
    const u = Math.abs(x + 0.5) / 16;
    const drop = Math.round(u * u * 4);
    for (let y = -3; y <= 2; y++) for (let z = 17; z <= 21; z++) {
      if (y < -2 + (z - 17 < 2 ? 0 : 1) && u > 0.55) continue;
      c.set(x, y, z - (u > 0.6 ? drop : 0), dark(x, y, z, 1));
    }
  }
  for (const s of [-1, 1]) {
    spike(c, s * 15.5, -0.5, 18, s * 0.8, 0, -1, 11, 2.4, (x, y, z, t) => (t > 0.75 ? D.edge : dark(x, y, z, 2)), 0.5);
    spike(c, s * 14, 1.5, 21, s * 0.5, 0.4, 1, 7, 2, (x, y, z, t) => (t > 0.7 ? D.edge : dark(x, y, z, 3)), 0.5);
  }
  ball(c, 0, 0, 19.5, 3.4, (x, y, z, d) => (d < 0.5 ? D.glow : dark(x, y, z)), false);
  c.set(-1, 3, 19, D.glowMid, true);
  c.set(0, 3, 19, D.glowMid, true);

  const Z0 = 22;
  const Z1 = 150;
  const hwAt = (z) => {
    const t = (z - Z0) / (Z1 - Z0);
    if (t < 0.86) return 11;
    return Math.max(1, 11 * (1 - ((t - 0.86) / 0.14) ** 1.25));
  };
  const tooth = (z, phase) => {
    const t = (z - Z0) / (Z1 - Z0);
    if (t < 0.06 || t > 0.9) return 0;
    const k = (z + phase) % 9;
    const depth = 3 + Math.floor(hash3(Math.floor((z + phase) / 9), phase, 0, 77) * 3);
    return Math.max(0, depth - k * 0.78);
  };
  for (let z = Z0; z <= Z1; z++) {
    const hw = hwAt(z);
    const eL = tooth(z, 0);
    const eR = tooth(z, 5);
    for (let x = Math.floor(-hw - eL); x <= Math.ceil(hw + eR) - 1; x++) {
      const ax = x + 0.5;
      const lim = ax < 0 ? hw + eL : hw + eR;
      if (Math.abs(ax) > lim) continue;
      const inTooth = Math.abs(ax) > hw;
      const edge = lim - Math.abs(ax) < 1.6;
      const ridge = Math.abs(ax) < 2.4;
      const mid = Math.abs(ax) < hw - 3;
      const lo = ridge ? -3 : mid ? -2 : -1;
      const hi = ridge ? 2 : mid ? 1 : 0;
      for (let y = lo; y <= hi; y++) {
        let col;
        if (inTooth || edge) col = J(D.steelHi, x, y, z, 78, 0.06);
        else if (ridge) col = steel(x, y, z, 2);
        else if (Math.abs(Math.abs(ax) - 3.4) < 0.9 && z < Z0 + 90 && hash3(x, z, 2, 83) < 0.7) col = J(shade(D.steel[3], 0.8), x, y, z, 79, 0.1);
        else col = steel(x, y, z);
        c.set(x, y, z, col);
      }
    }
  }
  const rng = new RNG(913);
  const surfY = (x, z, top) => {
    for (let y = top ? 4 : -5; top ? y >= -4 : y <= 3; y += top ? -1 : 1) if (c.has(x, y, z)) return y;
    return null;
  };
  for (let k = 0; k < 7; k++) {
    let x = Math.round(rng.range(-6, 6));
    let z = Math.round(Z0 + 3 + rng.range(0, 26));
    const len = Math.round(rng.range(22, 62));
    for (let i = 0; i < len; i++) {
      z += 1;
      if (rng.chance(0.45)) x += rng.chance(0.5) ? 1 : -1;
      x = Math.max(-8, Math.min(7, x));
      const hot = i < len * 0.5;
      for (const top of [true, false]) {
        const y = surfY(x, z, top);
        if (y === null) continue;
        c.set(x, y, z, hot ? (i % 3 === 0 ? D.glowHi : D.glow) : D.crack, true);
        if (i % 5 === 0) c.set(x + 1, y, z, D.crack, true);
      }
      if (k < 3 && i % 11 === 6) for (let b = 1; b <= 4; b++) for (const top of [true, false]) {
        const y = surfY(x + b, z + (b >> 1), top);
        if (y !== null) c.set(x + b, y, z + (b >> 1), D.crack, true);
      }
    }
  }
  for (let z = Z0; z < Z0 + 7; z++) for (const top of [true, false]) for (let x = -3; x <= 2; x++) {
    const y = surfY(x, z, top);
    if (y !== null && hash3(x, z, 3, 81) < 0.6) c.set(x, y, z, hash3(x, z, 5, 82) < 0.4 ? D.glowHi : D.glow, true);
  }
  return c.done();
}

/* ---------------------------------------------------------------- */
/* Demon Knight shield: tall jagged kite with a glowing demon face   */
/* ---------------------------------------------------------------- */

export function demonShieldVoxels() {
  const D = DEMON;
  const c = ctx();
  const dark = (x, y, z, k = 0) => J(pick(D.plate, x, y, z, 91 + k), x, y, z, 92 + k, 0.07);
  const ZT = -27;
  const ZB = 33;
  const ZC = -3;
  const hwAt = (z) => {
    if (z < ZT || z > ZB) return 0;
    const u = (z - ZC) / (z < ZC ? ZC - ZT : ZB - ZC);
    const p = z < ZC ? 2.6 : 1.55;
    return 19 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), p)), 1 / p);
  };
  const inside = (x, z) => Math.abs(x + 0.5) <= hwAt(z);
  const edgeDist = (x, z) => {
    for (let d = 1; d <= 5; d++) if (!inside(x + d, z) || !inside(x - d, z) || !inside(x, z + d) || !inside(x, z - d)) return d;
    return 9;
  };
  for (let z = ZT; z <= ZB; z++)
    for (let x = -20; x <= 19; x++) {
      if (!inside(x, z)) continue;
      const ed = edgeDist(x, z);
      const rim = ed <= 2;
      const rim2 = ed <= 4 && !rim;
      const top = rim ? 4 : rim2 ? 3 : 2;
      for (let y = 0; y < top; y++) c.set(x, y, z, y === top - 1 ? (rim ? J(D.spike[2], x, y, z, 93, 0.08) : dark(x, y, z, 1)) : shade(dark(x, y, z, 2), 0.7));
      if (!rim && !rim2) {
        const row = Math.floor((z + 40) / 4);
        const off = (row & 1) * 3;
        const plateEdge = (x + off + 40) % 6 === 0 || (z + 40) % 4 === 0;
        if (plateEdge) c.set(x, 2, z, shade(dark(x, 2, z, 3), 0.62));
        else if (hash3(x, z, 1, 94) < 0.12) c.set(x, 2, z, J(D.plateHi, x, 2, z, 95, 0.1));
      }
      if (Math.abs(x + 0.5) < 1.6 && !rim) c.set(x, 3, z, J(D.spike[0], x, 3, z, 96, 0.08));
    }
  const rng = new RNG(477);
  const bound = [];
  for (let z = ZT; z <= ZB; z++) for (let x = -20; x <= 19; x++) if (inside(x, z) && edgeDist(x, z) === 1) bound.push([x, z]);
  for (const [x, z] of bound) {
    const topness = Math.max(0, 1 - (z - ZT) / 26);
    if (rng.next() > 0.13 + topness * 0.12) continue;
    const nx = x + 0.5;
    const nz = z + 0.5 - ZC;
    const nl = Math.hypot(nx, nz) || 1;
    const len = 3 + Math.floor(rng.next() * 5) + Math.round(topness * 6);
    spike(c, x, 1.5, z, nx / nl, 0, nz / nl, len, 2.1, (xx, yy, zz, t) => (t > 0.7 ? D.edge : J(pick(D.spike, xx, yy, zz, 97), xx, yy, zz, 98, 0.08)), 0.5);
  }
  for (const s of [-1, 1]) spike(c, s * 11, 1.5, ZT + 2, s * 0.5, 0, -1, 15, 2.8, (x, y, z, t) => (t > 0.7 ? D.edge : dark(x, y, z, 4)), 0.5);
  spike(c, 0, 1.5, ZT + 1, 0, 0, -1, 17, 3, (x, y, z, t) => (t > 0.7 ? D.edge : dark(x, y, z, 4)), 0.5);

  const Y = 4;
  const glow = (x, z, hot) => {
    for (let y = 2; y <= 4; y++) if (c.has(x, y + 1, z) && !c.has(x, y + 2, z)) { c.set(x, y + 1, z, hot ? D.glowHi : D.glow, true); return; }
    c.set(x, Y, z, hot ? D.glowHi : D.glow, true);
  };
  for (const s of [-1, 1]) {
    strokePath([[s * 3, -3], [s * 8, -9], [s * 13, -11]], (a, b) => glow(a, b - 1, false), 3);
    strokePath([[s * 4, -3], [s * 8, -7], [s * 12, -9]], (a, b) => glow(a, b - 1, true), 1);
    strokePath([[s * 3, -8], [s * 8, -15], [s * 12, -18]], (a, b) => c.set(a, 4, b, shade(D.plateHi, 1.2)), 2);
  }
  for (let i = 0; i < 9; i++) {
    const x = -10 + i * 2.5;
    const up = i % 2 === 0;
    for (let k = 0; k < (up ? 5 : 4); k++) c.set(Math.round(x), 4, 12 + (up ? k : 5 - k + 2), shade(D.steelHi, 1 - k * 0.05));
  }
  strokePath([[-12, 11], [-6, 12], [0, 11], [6, 12], [12, 11]], (a, b) => glow(a, b, false), 2);
  strokePath([[-11, 20], [-5, 19], [0, 21], [5, 19], [11, 20]], (a, b) => glow(a, b, false), 2);
  strokePath([[0, 0], [0, 6]], (a, b) => glow(a, b, true), 2);
  for (let k = 0; k < 6; k++) {
    let x = Math.round(rng.range(-9, 8));
    let z = Math.round(rng.range(-20, 24));
    const len = Math.round(rng.range(8, 18));
    for (let i = 0; i < len; i++) {
      z += rng.chance(0.6) ? 1 : 0;
      x += rng.chance(0.55) ? (rng.chance(0.5) ? 1 : -1) : 0;
      if (inside(x, z) && edgeDist(x, z) > 3) glow(x, z, i % 4 === 0);
    }
  }
  void mix;
  const r = c.done();
  r.oy += 2;
  return r;
}
