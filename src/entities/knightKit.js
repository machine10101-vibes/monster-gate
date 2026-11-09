import { hash3, jitter, shade, mix, clamp } from '../engine/voxel.js';

/** Voxel sculpting helpers shared by the Demon Knight, the Holy Knight and their gear. */
export const J = (c, x, y, z, s = 0, a = 0.06) => jitter(c, a, hash3(x, y, z, s));
export const pick = (pal, x, y, z, s = 0) => pal[Math.floor(hash3(x, y, z, s) * pal.length) % pal.length];

export function frontZ(M, x, y) {
  for (let z = M.sz - 1; z >= 0; z--) if (M.has(x, y, z)) return z;
  return -1;
}
export function backZ(M, x, y) {
  for (let z = 0; z < M.sz; z++) if (M.has(x, y, z)) return z;
  return -1;
}
export function topY(M, x, z) {
  for (let y = M.sy - 1; y >= 0; y--) if (M.has(x, y, z)) return y;
  return -1;
}
export function botY(M, x, z) {
  for (let y = 0; y < M.sy; y++) if (M.has(x, y, z)) return y;
  return -1;
}
export const colorAt = (M, x, y, z) => M.get(x, y, z) & 0xffffff;

export const ell = (M, cx, cy, cz, rx, ry, rz, fn, glow = false) => M.ellipsoid(cx, cy, cz, rx, ry, rz, fn, glow);

/** Tapered cone from (x,y,z) along a direction. fn(x,y,z,t) gives the colour. */
export function spike(M, x, y, z, dx, dy, dz, len, r0, fn, r1 = 0.45, glow = false) {
  const n = Math.hypot(dx, dy, dz) || 1;
  const ux = dx / n;
  const uy = dy / n;
  const uz = dz / n;
  const steps = Math.ceil(len * 2);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const r = r0 + (r1 - r0) * t;
    const px = x + ux * len * t;
    const py = y + uy * len * t;
    const pz = z + uz * len * t;
    const R = Math.ceil(r) + 1;
    for (let iz = Math.floor(pz) - R; iz <= Math.floor(pz) + R; iz++)
      for (let iy = Math.floor(py) - R; iy <= Math.floor(py) + R; iy++)
        for (let ix = Math.floor(px) - R; ix <= Math.floor(px) + R; ix++) {
          const d = Math.hypot(ix + 0.5 - px, iy + 0.5 - py, iz + 0.5 - pz);
          if (d <= Math.max(r, 0.55)) M.set(ix, iy, iz, typeof fn === 'function' ? fn(ix, iy, iz, t) : fn, glow);
        }
  }
}

/** Smooth tube through control points [x,y,z], radius tapering r0 -> r1. */
export function tube(M, pts, r0, r1, fn, glow = false) {
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    seg.push(d);
    total += d;
  }
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(seg[i - 1] * 2));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const u = (run + seg[i - 1] * t) / total;
      const r = Math.max(0.55, r0 + (r1 - r0) * u);
      const px = a[0] + (b[0] - a[0]) * t;
      const py = a[1] + (b[1] - a[1]) * t;
      const pz = a[2] + (b[2] - a[2]) * t;
      const R = Math.ceil(r) + 1;
      for (let iz = Math.floor(pz) - R; iz <= Math.floor(pz) + R; iz++)
        for (let iy = Math.floor(py) - R; iy <= Math.floor(py) + R; iy++)
          for (let ix = Math.floor(px) - R; ix <= Math.floor(px) + R; ix++) {
            if (Math.hypot(ix + 0.5 - px, iy + 0.5 - py, iz + 0.5 - pz) <= r) M.set(ix, iy, iz, typeof fn === 'function' ? fn(ix, iy, iz, u) : fn, glow);
          }
    }
    run += seg[i - 1];
  }
}

/** Recolours voxels in rows y0..y1 that touch air sideways. Wraps a trim ring around a limb or plate. */
export function skin(M, y0, y1, fn, pred = null) {
  const hits = [];
  for (let y = y0; y <= y1; y++)
    for (let z = 0; z < M.sz; z++)
      for (let x = 0; x < M.sx; x++) {
        if (!M.has(x, y, z)) continue;
        if (M.has(x + 1, y, z) && M.has(x - 1, y, z) && M.has(x, y, z + 1) && M.has(x, y, z - 1)) continue;
        if (!pred || pred(x, y, z)) hits.push([x, y, z]);
      }
  for (const [x, y, z] of hits) M.set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn);
}

/** Recolours every voxel of a region (predicate) that touches air in any direction. */
export function edgeOf(M, region, fn) {
  const hits = [];
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        if (!M.has(x, y, z) || !region(x, y, z)) continue;
        const open = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !M.has(x + a, y + b, z + c));
        if (open) hits.push([x, y, z]);
      }
  for (const [x, y, z] of hits) M.set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn);
}

/** Plus-shaped cross lying on a z plane. Returns nothing; glow voxels with a bright core. */
export function crossAt(M, cx, cy, z, o) {
  const { up = 4, down = 4, side = 3, t = 2, hy = 0, col, core = null, glow = true, zOf = null } = o;
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const half = t / 2;
  const put = (x, y, c) => {
    const zz = zOf ? zOf(x, y) : z;
    if (zz < 0) return;
    M.set(x, y, zz, c, glow);
  };
  for (let y = y0 - down; y <= y0 + up; y++)
    for (let x = x0 - Math.ceil(half); x <= x0 + Math.ceil(half) - (t % 2 ? 0 : 1); x++) {
      const dx = x + 0.5 - cx;
      if (Math.abs(dx) > half) continue;
      put(x, y, core && Math.abs(dx) < 0.9 && t > 2 ? core : col);
    }
  for (let y = y0 + hy - Math.ceil(half) + 1; y <= y0 + hy + Math.ceil(half) - 1 + (t % 2 ? 0 : 0); y++)
    for (let x = x0 - side; x <= x0 + side; x++) {
      const dy = y + 0.5 - (y0 + hy + 0.5);
      if (Math.abs(dy) > half) continue;
      put(x, y, core && Math.abs(dy) < 0.9 && t > 2 ? core : col);
    }
}

/**
 * Diamond plate inlay on the front face: a raised gold rim, a flat base, and an optional glowing cross.
 * Follows whatever surface the voxels already form.
 */
export function inlay(M, cx, cy, hw, hh, o) {
  const { base, rim, rimHi = rim, cross = null, zOfs = 1, shape = 'diamond', seed = 0 } = o;
  const thick = 1.5 / Math.min(hw, hh);
  const zAt = (x, y) => frontZ(M, x, y);
  for (let y = Math.floor(cy - hh); y <= Math.ceil(cy + hh); y++)
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const ux = Math.abs(x + 0.5 - cx) / hw;
      const uy = Math.abs(y + 0.5 - cy) / hh;
      const u = shape === 'diamond' ? ux + uy : Math.max(ux, uy);
      if (u > 1) continue;
      const z = zAt(x, y);
      if (z < 0) continue;
      const edge = u > 1 - thick;
      if (edge) M.set(x, y, z + zOfs, ((x + y) & 1) === 0 ? J(rimHi, x, y, z, seed + 1, 0.04) : J(rim, x, y, z, seed + 2, 0.04));
      else if (base) M.set(x, y, z, typeof base === 'function' ? base(x, y, z) : base);
    }
  if (cross) crossAt(M, cx, cy, 0, { ...cross, zOf: (x, y) => zAt(x, y) });
}

export { shade, mix, clamp };
