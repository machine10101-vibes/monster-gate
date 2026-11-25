/**
 * Sculpting toolkit for the bespoke monster weapons.
 *
 * Every helper paints into a sparse voxel canvas from weaponModels' ctx().
 * Conventions match the other held weapons: the grip sits at the origin and
 * the weapon runs along +z; flat blades lie in the x-z plane (width on x,
 * thickness on y); bows run along y with the belly toward +z.
 */
import { hash3, jitter, shade, mix } from '../engine/voxel.js';

export const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export { shade, mix, hash3 };

/* ------------------------------------------------------------------ */
/* noise                                                              */
/* ------------------------------------------------------------------ */

const fade = (t) => t * t * (3 - 2 * t);

/** Smooth 3D value noise in [0, 1]. */
export function vnoise(x, y, z, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = fade(x - xi);
  const fy = fade(y - yi);
  const fz = fade(z - zi);
  const h = (a, b, d) => hash3(xi + a, yi + b, zi + d, seed);
  const x00 = lerp(h(0, 0, 0), h(1, 0, 0), fx);
  const x10 = lerp(h(0, 1, 0), h(1, 1, 0), fx);
  const x01 = lerp(h(0, 0, 1), h(1, 0, 1), fx);
  const x11 = lerp(h(0, 1, 1), h(1, 1, 1), fx);
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

/** Thin ridged lines through space: near 0 on the ridge. */
export function ridge(x, y, z, scale, seed) {
  const n = vnoise(x * scale, y * scale, z * scale, seed) * 0.65 + vnoise(x * scale * 2.1, y * scale * 2.1, z * scale * 2.1, seed + 7) * 0.35;
  return Math.abs(n - 0.5);
}

/* ------------------------------------------------------------------ */
/* blades                                                             */
/* ------------------------------------------------------------------ */

/**
 * General blade along +z from z0 to z1.
 *  right(t)/left(t)  half-widths on +x / -x (0 gives a spine on that side)
 *  bend(t)           centreline offset on x
 *  thick             max layers (y), thinning toward the edges
 *  paint(p)          colour for a voxel: p = { t, u, side, ed, y, n, x, z, top }
 *                    (u 0 at the centreline -> 1 at the edge, ed = voxels to the edge);
 *                    return a colour, { c, g } for glow, or null to skip
 *  teeth             [{ side, from, to, every, len, base, col, tip }] saw teeth past an edge
 */
export function sweep(c, o) {
  const { z0, z1, right, left, bend = () => 0, thick = 4, paint, teeth = [] } = o;
  const span = Math.max(1, z1 - z0);
  for (let z = z0; z <= z1; z++) {
    const t = (z - z0) / span;
    const xc = bend(t);
    const wr = Math.max(0, right(t));
    const wl = Math.max(0, left(t));
    if (wr + wl < 0.5) continue;
    const xa = Math.floor(xc - wl);
    const xb = Math.ceil(xc + wr) - 1;
    for (let x = xa; x <= xb; x++) {
      const dx = x + 0.5 - xc;
      const side = dx >= 0 ? 1 : -1;
      const w = side > 0 ? wr : wl;
      const other = side > 0 ? wl : wr;
      if (Math.abs(dx) > w + (w < 0.5 && other > 0 ? 0.6 : 0)) continue;
      const u = w > 0.5 ? clamp01(Math.abs(dx) / w) : 0;
      const th = typeof thick === 'function' ? thick(t, u, side) : thick;
      let n = Math.max(1, Math.round(th * (1 - u ** 2.4 * 0.72)));
      if (n > 1 && n % 2) n += 1;
      const ed = w - Math.abs(dx);
      for (let l = 0; l < n; l++) {
        const y = l - Math.floor(n / 2);
        const r = paint({ t, u, side, ed, y, n, x, z, top: l === n - 1, bot: l === 0, xc });
        if (r == null) continue;
        if (typeof r === 'object') c.set(x, y, z, r.c, !!r.g);
        else c.set(x, y, z, r);
      }
    }
  }
  for (const tq of teeth) {
    const { side, from, to, every, len, base = 3, col, tip, rake = 0.6 } = tq;
    for (let z = Math.ceil(z0 + from * span); z <= z0 + to * span; z += every) {
      const t = (z - z0) / span;
      const ex = bend(t) + side * (side > 0 ? right(t) : left(t));
      for (let k = 0; k < len; k++) {
        const w = Math.max(1, Math.round(base * (1 - k / len)));
        for (let q = 0; q < w; q++) {
          const zz = z + q + Math.round(k * rake);
          const xx = Math.round(ex + side * (k + 0.2)) - (side > 0 ? 0 : 1);
          for (let y = -1; y <= 0; y++) c.set(xx, y, zz, k >= len - 2 ? tip : J(col, xx, y, zz, 140, 0.04));
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* curved solids                                                      */
/* ------------------------------------------------------------------ */

/** Sample a parametric curve into points about half a voxel apart. */
export function curve(fn, approxLen) {
  const n = Math.max(2, Math.ceil(approxLen * 1.5));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  return pts;
}

/**
 * Round solid swept along points [x, y, z]. r(t) radius; col(t, d, x, y, z)
 * colour (d 0 at the core -> 1 at the skin); flatY squashes the section.
 */
export function tube(c, pts, r, col, glow = false, flatY = 1) {
  const n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    const [cx, cy, cz] = pts[i];
    const rr = typeof r === 'function' ? r(t) : r;
    if (rr <= 0) continue;
    const m = Math.ceil(rr) + 1;
    for (let z = Math.floor(cz - m); z <= Math.ceil(cz + m); z++)
      for (let y = Math.floor(cy - m * flatY); y <= Math.ceil(cy + m * flatY); y++)
        for (let x = Math.floor(cx - m); x <= Math.ceil(cx + m); x++) {
          const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) / flatY, z + 0.5 - cz);
          if (d > rr) continue;
          const v = col(t, d / rr, x, y, z);
          if (v == null) continue;
          if (typeof v === 'object') c.set(x, y, z, v.c, !!v.g);
          else c.set(x, y, z, v, glow);
        }
  }
}

/** Horn: tapering tube with growth ridges, darker at the root and bright at the tip. */
export function horn(c, pts, r0, r1, cols, o = {}) {
  const { ridges = 7, tipFrom = 0.86, seed = 150, glow = null } = o;
  tube(c, pts, (t) => lerp(r0, r1, t ** 0.9), (t, d, x, y, z) => {
    if (t > tipFrom) return J(cols.tip, x, y, z, seed, 0.02);
    const ring = Math.floor(t * ridges * 4) % 4 === 0 && t > 0.06;
    if (glow && d < 0.35 && t > 0.1 && t < tipFrom - 0.05) return { c: glow, g: true };
    const base = t < 0.25 ? mix(cols.root, cols.body, t / 0.25) : cols.body;
    return J(ring ? shade(base, 0.8) : d > 0.78 ? shade(base, 1.06) : base, x, y, z, seed + 1, 0.035);
  });
}

/** Row of small fangs/teeth between two points, each pointing along dir. */
export function teethRow(c, a, b, count, dir, len, r, cols, seed = 160) {
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const p = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const l = len * (0.75 + hash3(i, 3, 5, seed) * 0.5);
    tube(c, curve((s) => [p[0] + dir[0] * l * s, p[1] + dir[1] * l * s, p[2] + dir[2] * l * s], l), (s) => lerp(r, 0.45, s), (s, d, x, y, z) => J(s > 0.65 ? cols.tip : cols.body, x, y, z, seed + 1, 0.03));
  }
}

/**
 * Fur ring around the z axis at height z: strands that splay out and droop.
 * cols: [deep, mid, light, tip].
 */
export function furRing(c, z, R, len, cols, seed = 170, density = 1, droop = 0.5) {
  const strands = Math.round((10 + R * 9) * density);
  for (let s = 0; s < strands; s++) {
    const a = (s / strands) * Math.PI * 2 + hash3(s, 1, 0, seed) * 0.5;
    const l = len * (0.6 + hash3(s, 2, 0, seed) * 0.7);
    let x = Math.cos(a) * R;
    let y = Math.sin(a) * R;
    let zz = z + (hash3(s, 3, 0, seed) - 0.5) * 3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    for (let k = 0; k < l; k++) {
      const f = k / l;
      const col = f > 0.8 ? cols[3] : f > 0.5 ? cols[2] : f > 0.2 ? cols[1] : cols[0];
      c.set(Math.round(x), Math.round(y), Math.round(zz), J(col, s, k, 0, seed + 1, 0.04));
      if (k < l * 0.5) c.set(Math.round(x - dx * 0.7), Math.round(y - dy * 0.7), Math.round(zz), J(cols[0], s, k, 1, seed + 2, 0.04));
      x += dx * 0.85;
      y += dy * 0.85;
      zz -= droop * f * 1.6;
    }
  }
}

/**
 * Faceted crystal (bipyramid) along an arbitrary axis.
 * cols: { core, mid, skin }; core and mid glow.
 */
export function crystal(c, p, axis, len, r, cols, o = {}) {
  const { seed = 180, sides = 4, skinGlow = false } = o;
  const al = Math.hypot(...axis) || 1;
  const ax = axis.map((v) => v / al);
  const ref = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = [ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]];
  const ul = Math.hypot(...u);
  for (let i = 0; i < 3; i++) u[i] /= ul;
  const v = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
  const R = Math.ceil(Math.max(len, r)) + 1;
  for (let z = Math.floor(p[2] - R); z <= p[2] + R; z++)
    for (let y = Math.floor(p[1] - R); y <= p[1] + R; y++)
      for (let x = Math.floor(p[0] - R); x <= p[0] + R; x++) {
        const d = [x + 0.5 - p[0], y + 0.5 - p[1], z + 0.5 - p[2]];
        const w = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2];
        const a = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
        const b = d[0] * v[0] + d[1] * v[1] + d[2] * v[2];
        const rad = sides === 4 ? Math.abs(a) + Math.abs(b) : Math.max(Math.abs(a), Math.abs(b), Math.abs(a * 0.5 + b * 0.866), Math.abs(a * 0.5 - b * 0.866)) * 1.08;
        const m = rad / r + Math.abs(w) / len;
        if (m > 1) continue;
        if (m < 0.42) c.set(x, y, z, cols.core, true);
        else if (m < 0.78) c.set(x, y, z, cols.mid, true);
        else c.set(x, y, z, J(cols.skin, x, y, z, seed, 0.03), skinGlow);
      }
}

/** Eye gem: glowing iris with a vertical slit pupil, facing +y. */
export function eyeGem(c, p, r, iris, pupil, rim) {
  const R = Math.ceil(r) + 1;
  for (let z = Math.floor(p[2] - R); z <= p[2] + R; z++)
    for (let y = Math.floor(p[1] - R); y <= p[1] + R; y++)
      for (let x = Math.floor(p[0] - R); x <= p[0] + R; x++) {
        const dx = x + 0.5 - p[0];
        const dz = z + 0.5 - p[2];
        const d = Math.hypot(dx, (y + 0.5 - p[1]) * 1.4, dz) / r;
        if (d > 1) continue;
        if (d > 0.82 && rim) c.set(x, y, z, rim);
        else if (Math.abs(dx) < 0.55 && Math.abs(dz) < r * 0.75) c.set(x, y, z, pupil);
        else c.set(x, y, z, d < 0.45 ? shade(iris, 1.25) : iris, true);
      }
}

/**
 * Flat membrane (one voxel thick) filling the region between x = a(z) and
 * x = b(z) on layer y, with veins every `vein` voxels along z.
 */
export function membrane(c, z0, z1, a, b, y, cols, o = {}) {
  const { vein = 6, seed = 190, glowVein = false } = o;
  for (let z = z0; z <= z1; z++) {
    const t = (z - z0) / Math.max(1, z1 - z0);
    const xa = Math.round(Math.min(a(t), b(t)));
    const xb = Math.round(Math.max(a(t), b(t)));
    for (let x = xa; x <= xb; x++) {
      const v = vein && (z + Math.round(Math.abs(x) * 0.6)) % vein === 0;
      const edge = x === xa || x === xb;
      c.set(x, y, z, v ? cols.vein : edge ? cols.edge : J(cols.body, x, y, z, seed, 0.06), v && glowVein);
    }
  }
}

/* ------------------------------------------------------------------ */
/* surface treatments                                                 */
/* ------------------------------------------------------------------ */

/** Overlapping scale pattern: rows of rounded scales with a dark lower lip. */
export function scaleCol(lo, mid, hi, x, y, z, size = 3, seed = 200) {
  const row = Math.floor(z / size);
  const off = row & 1 ? size / 2 : 0;
  const cell = Math.floor((x + y + off) / size);
  const vz = ((z % size) + size) % size;
  const h = hash3(cell, row, 0, seed);
  if (vz === 0) return J(lo, x, y, z, seed + 1, 0.04);
  if (vz === size - 1) return J(h < 0.5 ? hi : mid, x, y, z, seed + 2, 0.04);
  return J(h < 0.3 ? shade(mid, 0.9) : mid, x, y, z, seed + 3, 0.04);
}

/**
 * Lava / rune veins: recolour voxels accepted by `test` where ridged noise
 * forms thin cracks. Hot cores glow brighter.
 */
export function veins(c, test, o) {
  const { scale = 0.16, width = 0.045, glow, hot, seed = 210 } = o;
  c.each((x, y, z, col, g) => {
    if (g || !test(x, y, z, col)) return;
    const r = ridge(x, y, z, scale, seed);
    if (r < width) c.set(x, y, z, r < width * 0.45 && hot ? hot : glow, true);
  });
}

/** Frost rime: scatter pale crystals over voxels accepted by `test` on the +y/-y faces. */
export function rime(c, test, cols, o = {}) {
  const { chance = 0.12, seed = 220 } = o;
  const adds = [];
  c.each((x, y, z, col, g) => {
    if (g || !test(x, y, z, col)) return;
    for (const dy of [1, -1]) {
      if (c.has(x, y + dy, z)) continue;
      const h = hash3(x, y + dy, z, seed);
      if (h < chance) adds.push([x, y + dy, z, h < chance * 0.35 ? cols[1] : cols[0]]);
    }
  });
  for (const [x, y, z, col] of adds) c.set(x, y, z, col);
}

/* ------------------------------------------------------------------ */
/* grips                                                              */
/* ------------------------------------------------------------------ */

/** Grip wrapped in scaled hide with metal/bone rings at each end. */
export function scaleGrip(K, c, z0, z1, r, cols, ring) {
  K.rod(c, z0, z1, r, (x, y, z) => scaleCol(cols[0], cols[1], cols[2], x + 2, y + 2, z, 2, 230));
  K.ringAt(c, z0, r, ring, 1);
  K.ringAt(c, z1, r, ring, 2);
}

/** Grip spiral-wrapped in two colours of cord or hide strip. */
export function spiralGrip(K, c, z0, z1, r, a, b, ring) {
  K.rod(c, z0, z1, r, (x, y, z) => {
    const ang = Math.atan2(y + 0.5, x + 0.5);
    return J(Math.floor(z * 0.5 + ang * 1.3) & 1 ? a : b, x, y, z, 231, 0.05);
  });
  if (ring) {
    K.ringAt(c, z0, r, ring, 3);
    K.ringAt(c, z1, r, ring, 4);
  }
}

/* ------------------------------------------------------------------ */
/* bows and crossbows                                                 */
/* ------------------------------------------------------------------ */

/**
 * Bow along y (belly toward +z, string at -z). limb(a) for a = |y|/L gives
 * { z, hw, dz } (centre depth, half width on x, depth in z); paint(p) colours
 * a limb voxel ({ a, x, y, z, k, dz, grip }). tips(c, dir, y, z) decorates each
 * end; decor(c) adds anything else. Returns the voxel model with bowString.
 */
export function bowShape(K, o) {
  const { L, grip = 6, limb, paint, tips = null, decor = null, string } = o;
  const c = K.ctx();
  let tipZ = 0;
  for (let y = -L; y <= L; y++) {
    const a = Math.abs(y + 0.5) / L;
    const g = Math.abs(y + 0.5) <= grip;
    const { z, hw, dz } = limb(a, g);
    if (a > 0.97) tipZ = z;
    const n = Math.ceil(hw);
    for (let x = -n; x < n; x++) {
      if (Math.abs(x + 0.5) > hw) continue;
      for (let k = 0; k < dz; k++) {
        const zz = Math.round(z) + k - Math.floor(dz / 2);
        const col = paint({ a, x, y, z: zz, k, dz, grip: g, hw });
        if (col == null) continue;
        if (typeof col === 'object') c.set(x, y, zz, col.c, !!col.g);
        else c.set(x, y, zz, col);
      }
    }
  }
  const stringZ = Math.round(tipZ) - 1;
  if (tips) for (const dir of [-1, 1]) tips(c, dir, dir * L, tipZ);
  if (decor) decor(c);
  const out = c.done();
  const v = (n) => (n + 0.5) * K.WEAPON_SIZE;
  out.bowString = { top: [v(0), v(L), v(stringZ)], bottom: [v(0), v(-L - 1), v(stringZ)], color: string.color, glow: !!string.glow };
  return out;
}

/**
 * Crossbow along +z with the hand at the origin. Fixed layout so it shoots
 * and animates like the others: stock -12..68, prod at prodZ ~60, nut at 22.
 *  stock(x, y, z)       colour of a stock voxel (or null)
 *  prod(a)              { z, th } prod centreline and thickness for a = |x|/span
 *  prodPaint(p)         colour for a prod voxel
 *  stringCol / stringGlow
 *  decor(c)             extra sculpting
 */
export function crossbowShape(K, o) {
  const { span = 24, prodZ = 60, stock, prod, prodPaint, stringCol, stringGlow = false, decor = null, rail = null } = o;
  const c = K.ctx();
  for (let z = -10; z <= 68; z++) {
    const h = z < 2 ? 2 : 3;
    for (let x = -2; x <= 1; x++)
      for (let y = -h; y <= 2; y++) {
        if (z > 14 && y < -1) continue;
        if (z < 4 && Math.abs(x + 0.5) > 1.5 && y < 0) continue;
        const col = stock(x, y, z);
        if (col != null) c.set(x, y, z, col);
      }
  }
  // pistol grip under the hand
  for (let z = -1; z <= 8; z++) for (let x = -2; x <= 1; x++) for (let y = -10; y <= -4; y++) {
    if (Math.hypot(x + 0.5, (y + 7) * 0.55) > 2.3) continue;
    const col = stock(x, y, z, true);
    if (col != null) c.set(x, y, z, col);
  }
  let tipZ = prodZ;
  for (let x = -span; x < span; x++) {
    const a = Math.abs(x + 0.5) / span;
    const { z: zc, th } = prod(a);
    if (a > 0.95) tipZ = zc;
    for (let y = -Math.floor(th / 2); y < th - Math.floor(th / 2); y++)
      for (let q = 0; q < 3; q++) {
        const zz = Math.round(zc) + q - 1;
        const col = prodPaint({ a, x, y, z: zz, q, th });
        if (col == null) continue;
        if (typeof col === 'object') c.set(x, y, zz, col.c, !!col.g);
        else c.set(x, y, zz, col);
      }
  }
  const nutZ = 22;
  for (const dir of [-1, 1]) {
    const tipX = dir < 0 ? -span : span - 1;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      c.set(Math.round(lerp(tipX, 0, t)), 0, Math.round(lerp(tipZ + 1, nutZ, t)), stringCol, stringGlow);
    }
  }
  if (rail) rail(c);
  if (decor) decor(c);
  return c.done();
}

/* ------------------------------------------------------------------ */
/* curved-path blades, wings, glyphs                                  */
/* ------------------------------------------------------------------ */

/**
 * Blade that grows sideways from a curved spine walking through the x-z plane.
 * Starts at (x0, z0) heading a0 (0 = +z, positive turns toward +x) and turns a
 * total of `turn` radians over `len` voxels (turn may be a function of f).
 * width(f) is how far the blade reaches from the spine toward `side`
 * (+1 right of the heading, -1 left). paint(p) as in sweep, with u 0 at the
 * spine -> 1 at the edge.
 */
export function pathBlade(c, o) {
  const { x0, z0, a0, len, turn, width, paint, thick = 4, side = 1, step = 0.35, y0 = 0 } = o;
  let x = x0;
  let z = z0;
  let a = a0;
  for (let s = 0; s <= len; s += step) {
    const f = s / len;
    const wd = width(f);
    const nx = Math.cos(a) * side;
    const nz = -Math.sin(a) * side;
    for (let d = 0; d <= wd; d += 0.5) {
      const px = Math.round(x + nx * d);
      const pz = Math.round(z + nz * d);
      const u = wd > 0.5 ? d / wd : 0;
      const th = typeof thick === 'function' ? thick(f, u) : thick;
      let n = Math.max(1, Math.round(th * (1 - u ** 2.4 * 0.7)));
      if (n > 1 && n % 2) n += 1;
      for (let l = 0; l < n; l++) {
        const y = y0 + l - Math.floor(n / 2);
        const r = paint({ f, t: f, u, ed: wd - d, y, n, x: px, z: pz, top: l === n - 1, bot: l === 0 });
        if (r == null) continue;
        if (typeof r === 'object') c.set(px, y, pz, r.c, !!r.g);
        else c.set(px, y, pz, r);
      }
    }
    x += Math.sin(a) * step;
    z += Math.cos(a) * step;
    a += (typeof turn === 'function' ? turn(f) : turn) * step / len;
  }
  return { x, z, a };
}

/**
 * Bat wing in the x-z plane (layer y): finger bones fanning from `o` with a
 * scalloped membrane stretched between them.
 * fingers: [[angle, length], ...] with angle 0 = +z, positive toward +x.
 */
export function batWing(c, o, fingers, cols, y = 0, seed = 240) {
  const tips = fingers.map(([ang, l]) => [o[0] + Math.sin(ang) * l, o[1] + Math.cos(ang) * l]);
  for (let i = 0; i < tips.length - 1; i++) {
    const [ax, az] = tips[i];
    const [bx, bz] = tips[i + 1];
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const scallop = Math.hypot(ax - bx, az - bz) * 0.42;
    const minX = Math.floor(Math.min(o[0], ax, bx));
    const maxX = Math.ceil(Math.max(o[0], ax, bx));
    const minZ = Math.floor(Math.min(o[1], az, bz));
    const maxZ = Math.ceil(Math.max(o[1], az, bz));
    const sign = (px, pz, qx, qz, rx, rz) => (px - rx) * (qz - rz) - (qx - rx) * (pz - rz);
    // scallop centre pushed outward past the edge midpoint
    const ox = mx + (mx - o[0]) * 0.18;
    const oz = mz + (mz - o[1]) * 0.18;
    for (let z = minZ; z <= maxZ; z++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const pz = z + 0.5;
        const d1 = sign(px, pz, o[0], o[1], ax, az);
        const d2 = sign(px, pz, ax, az, bx, bz);
        const d3 = sign(px, pz, bx, bz, o[0], o[1]);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (neg && pos) continue;
        const ds = Math.hypot(px - ox, pz - oz);
        if (ds < scallop) continue;
        const rim = ds < scallop + 1.1;
        const vein = hash3(x, 0, z, seed) < 0.05;
        c.set(x, y, z, rim ? cols.edge : vein ? cols.vein : J(cols.body, x, y, z, seed + 1, 0.06));
      }
  }
  for (const [tx, tz] of tips) {
    tube(c, curve((t) => [lerp(o[0], tx, t), y, lerp(o[1], tz, t)], Math.hypot(tx - o[0], tz - o[1])), (t) => lerp(1.4, 0.55, t), (t, d, x, yy, z) => J(t > 0.85 ? cols.claw : cols.bone, x, yy, z, seed + 2, 0.04));
  }
}

const GLYPHS = [
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [1, 1], [2, 2], [0, 2], [2, 0]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 1], [1, 2], [0, 2]],
  [[0, 0], [0, 1], [1, 2], [2, 1], [2, 0]],
];

/** A small glowing rune glyph on layer y, centred at (x, z). */
export function rune(c, x, y, z, col, seed = 0) {
  const g = GLYPHS[Math.floor(hash3(x, y, z, seed + 250) * GLYPHS.length) % GLYPHS.length];
  for (const [dx, dz] of g) c.set(x + dx - 1, y, z + dz - 1, col, true);
}
