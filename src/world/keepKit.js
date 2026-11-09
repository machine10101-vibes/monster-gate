import { hash3, jitter, shade } from '../engine/voxel.js';

/** Shared voxel helpers for the Hellspire fortress and the Dawnspire castle. One voxel is KS world units. */

export const KS = 0.2;

export function cyl(m, cx, cz, y0, y1, r, color, glow = false) {
  const R = Math.ceil(r) + 1;
  for (let y = y0; y < y1; y++)
    for (let z = Math.floor(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz <= r * r) {
          const c = typeof color === 'function' ? color(x, y, z, Math.hypot(dx, dz)) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c, glow);
        }
      }
}

/** Hollow ring: radii in [r0, r1]. */
export function ringV(m, cx, cz, y0, y1, r0, r1, color, glow = false) {
  const R = Math.ceil(r1) + 1;
  for (let y = y0; y < y1; y++)
    for (let z = Math.floor(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d <= r1 && d >= r0) {
          const c = typeof color === 'function' ? color(x, y, z, d) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c, glow);
        }
      }
}

/** Solid cone, radius r0 at y0 shrinking to r1 over h layers. */
export function cone(m, cx, cz, y0, h, r0, r1, color, glow = false) {
  for (let k = 0; k < h; k++) {
    const t = k / Math.max(1, h - 1);
    const r = r0 + (r1 - r0) * t;
    cyl(m, cx, cz, y0 + k, y0 + k + 1, Math.max(0.6, r), (x, y, zz, d) => (typeof color === 'function' ? color(x, y, zz, d, t) : color), glow);
  }
}

/** Square pyramid. */
export function pyramid(m, cx, cz, y0, h, hw, hd, color) {
  for (let k = 0; k < h; k++) {
    const t = k / h;
    const w = Math.max(0.6, hw * (1 - t));
    const d = Math.max(0.6, hd * (1 - t));
    for (let z = Math.floor(cz - d); z < Math.ceil(cz + d); z++)
      for (let x = Math.floor(cx - w); x < Math.ceil(cx + w); x++) {
        if (x + 0.5 < cx - w || x + 0.5 > cx + w || z + 0.5 < cz - d || z + 0.5 > cz + d) continue;
        m.set(x, y0 + k, z, typeof color === 'function' ? color(x, y0 + k, z, t) : color);
      }
  }
}

/** Ashlar blocks: courses `h` tall, blocks `w` long, staggered; mortar lines are darker. */
export function masonry(pal, mortar, seed, w = 6, h = 3) {
  return (x, y, z) => {
    const course = Math.floor(y / h);
    const u = x + z + (course & 1) * (w >> 1);
    const bx = Math.floor(u / w);
    const joint = y % h === 0 || ((u % w) + w) % w === 0;
    if (joint) return jitter(mortar, 0.04, hash3(x, y, z, seed));
    const base = pal[Math.floor(hash3(bx, course, seed, 3) * pal.length)];
    const worn = hash3(x, y, z, seed + 4) > 0.9 ? 0.9 : 1;
    return shade(jitter(base, 0.035, hash3(x, y, z, seed + 1)), worn);
  };
}

/** Half width (in voxels) of a pointed arch of total half width `hw` at height `y` above the springline. */
export function archHalf(hw, y, rise) {
  if (y < 0) return hw;
  if (y > rise) return -1;
  const t = y / rise;
  return hw * (1 - t * t * 0.9) * Math.sqrt(1 - t * 0.55) * 1.0;
}

/** Carve a pointed-arch passage through the model along z. */
export function carveArch(m, cx, y0, hw, spring, rise, z0, z1) {
  for (let y = y0; y < y0 + spring + rise; y++) {
    const half = y < y0 + spring ? hw : archHalf(hw, y - y0 - spring, rise);
    if (half < 0) continue;
    for (let x = Math.ceil(cx - half); x < Math.floor(cx + half); x++) for (let z = z0; z < z1; z++) m.clear(x, y, z);
  }
}

/** A small stained slit or arched window facing +z, carved `depth` deep from z, then lit from behind. */
export function windowZ(m, x, y, z, w, h, depth, glowColor, pointed = true) {
  for (let yy = 0; yy < h; yy++) {
    const half = pointed && yy > h - 1 - Math.ceil(w / 2) ? Math.max(0, w / 2 - (yy - (h - 1 - Math.ceil(w / 2))) - 0.2) : w / 2;
    for (let xx = 0; xx < w; xx++) {
      if (Math.abs(xx + 0.5 - w / 2) > half + 0.01) continue;
      for (let d = 0; d < depth; d++) m.clear(x + xx, y + yy, z - d);
      m.set(x + xx, y + yy, z - depth, typeof glowColor === 'function' ? glowColor(xx, yy) : glowColor, 2);
    }
  }
}

export function flipHash(x, y, z, s) {
  return hash3(x, y, z, s);
}
