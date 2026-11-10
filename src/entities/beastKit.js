import * as THREE from 'three';
import { VoxelModel, clamp, hash3, valueNoise } from '../engine/voxel.js';

export const noise3 = (x, y, z, seed = 0) => hash3(Math.floor(x), Math.floor(y), Math.floor(z), seed);
export const smooth2 = (a, b, seed = 0) => valueNoise(a, b, seed);

const SOLID = 1 << 24;
const GLOW = 1 << 25;

/**
 * A single master voxel grid in creature space (+y up, +z forward, x = 0 on the midline).
 * Every public method takes "design units"; the grid is k times finer than a design unit, so a
 * creature can be sketched with simple numbers and still be carved from very small voxels.
 * Every voxel remembers which rig part drew it last, so a creature is sculpted and painted
 * as one continuous body and then cut at its joints.
 */
export class Rig {
  constructor(x0, y0, z0, x1, y1, z1, k = 1) {
    this.k = k;
    this.x0 = Math.floor(x0 * k);
    this.y0 = Math.floor(y0 * k);
    this.z0 = Math.floor(z0 * k);
    this.sx = Math.ceil(x1 * k) - this.x0;
    this.sy = Math.ceil(y1 * k) - this.y0;
    this.sz = Math.ceil(z1 * k) - this.z0;
    this.data = new Int32Array(this.sx * this.sy * this.sz);
    this.owner = new Uint8Array(this.sx * this.sy * this.sz);
    this.ids = ['_'];
    this.cur = 0;
    this.xf = null;
  }

  /** Runs fn with every shape scaled by s about centre c; colour callbacks still see unscaled coordinates. */
  scaled(s, c, fn) {
    const prev = this.xf;
    this.xf = { s, c };
    fn();
    this.xf = prev;
  }

  T(p) {
    const f = this.xf;
    return f ? [f.c[0] + (p[0] - f.c[0]) * f.s, f.c[1] + (p[1] - f.c[1]) * f.s, f.c[2] + (p[2] - f.c[2]) * f.s] : p;
  }

  R(r) {
    const f = this.xf;
    return f ? r * f.s : r;
  }

  idx(x, y, z) {
    return x - this.x0 + this.sx * (y - this.y0 + this.sy * (z - this.z0));
  }

  inside(x, y, z) {
    const a = x - this.x0;
    const b = y - this.y0;
    const c = z - this.z0;
    return a >= 0 && b >= 0 && c >= 0 && a < this.sx && b < this.sy && c < this.sz;
  }

  own(id) {
    let i = this.ids.indexOf(id);
    if (i < 0) {
      this.ids.push(id);
      i = this.ids.length - 1;
    }
    this.cur = i;
    return this;
  }

  /** Grid-level voxel access: gx, gy, gz are integer grid cells. */
  has(gx, gy, gz) {
    return this.inside(gx, gy, gz) && this.data[this.idx(gx, gy, gz)] !== 0;
  }

  color(gx, gy, gz) {
    return this.inside(gx, gy, gz) ? this.data[this.idx(gx, gy, gz)] & 0xffffff : 0;
  }

  setG(gx, gy, gz, color, glow = false) {
    if (!this.inside(gx, gy, gz)) return;
    const i = this.idx(gx, gy, gz);
    this.data[i] = (color & 0xffffff) | SOLID | (glow ? GLOW : 0);
    this.owner[i] = this.cur;
  }

  tintG(gx, gy, gz, color, glow) {
    if (!this.inside(gx, gy, gz)) return;
    const i = this.idx(gx, gy, gz);
    if (!this.data[i]) return;
    this.data[i] = (color & 0xffffff) | SOLID | (glow === undefined ? this.data[i] & GLOW : glow ? GLOW : 0);
  }

  exposed(gx, gy, gz) {
    return !this.has(gx + 1, gy, gz) || !this.has(gx - 1, gy, gz) || !this.has(gx, gy + 1, gz) || !this.has(gx, gy - 1, gz) || !this.has(gx, gy, gz + 1) || !this.has(gx, gy, gz - 1);
  }

  /** One voxel at a design position. */
  set(x, y, z, color, glow = false) {
    const k = this.k;
    this.setG(Math.floor(x * k), Math.floor(y * k), Math.floor(z * k), color, glow);
  }

  clearG(gx, gy, gz) {
    if (this.inside(gx, gy, gz)) this.data[this.idx(gx, gy, gz)] = 0;
  }

  putG(gx, gy, gz, fn, t = 0, u = 0, glow = false) {
    const k = this.k;
    let x = (gx + 0.5) / k;
    let y = (gy + 0.5) / k;
    let z = (gz + 0.5) / k;
    const f = this.xf;
    if (f) {
      x = f.c[0] + (x - f.c[0]) / f.s;
      y = f.c[1] + (y - f.c[1]) / f.s;
      z = f.c[2] + (z - f.c[2]) / f.s;
    }
    const c = typeof fn === 'function' ? fn(x, y, z, t, u) : fn;
    if (c === null || c === undefined) return;
    this.setG(gx, gy, gz, c, glow);
  }

  ell(c, r, fn, glow = false) {
    const k = this.k;
    const [cx, cy, cz] = this.T(c).map((v) => v * k);
    const [rx, ry, rz] = (typeof r === 'number' ? [r, r, r] : r).map((v) => this.R(v) * k);
    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const dz = (z + 0.5 - cz) / rz;
          const d = dx * dx + dy * dy + dz * dz;
          if (d <= 1) this.putG(x, y, z, fn, 0, Math.sqrt(d), glow);
        }
  }

  /** Tapered capsule from a to b. squash scales the cross-section per axis. */
  cap(a, b, ra, rb, fn, squash = [1, 1, 1], glow = false) {
    const k = this.k;
    a = this.T(a).map((v) => v * k);
    b = this.T(b).map((v) => v * k);
    ra = this.R(ra) * k;
    rb = this.R(rb) * k;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1;
    const R = Math.max(ra, rb) * Math.max(squash[0], squash[1], squash[2]) + 1;
    const lo = [0, 1, 2].map((i) => Math.floor(Math.min(a[i], b[i]) - R));
    const hi = [0, 1, 2].map((i) => Math.ceil(Math.max(a[i], b[i]) + R));
    for (let z = lo[2]; z <= hi[2]; z++)
      for (let y = lo[1]; y <= hi[1]; y++)
        for (let x = lo[0]; x <= hi[0]; x++) {
          const px = x + 0.5 - a[0];
          const py = y + 0.5 - a[1];
          const pz = z + 0.5 - a[2];
          const t = clamp((px * ab[0] + py * ab[1] + pz * ab[2]) / len2, 0, 1);
          const dx = (px - ab[0] * t) / squash[0];
          const dy = (py - ab[1] * t) / squash[1];
          const dz = (pz - ab[2] * t) / squash[2];
          const r = ra + (rb - ra) * t;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d <= r) this.putG(x, y, z, fn, t, d / r, glow);
        }
  }

  /** A one voxel thick line between two design points. */
  line(a, b, color, glow = false) {
    const k = this.k;
    a = this.T(a);
    b = this.T(b);
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])) * k * 1.5) + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.setG(Math.floor((a[0] + (b[0] - a[0]) * t) * k), Math.floor((a[1] + (b[1] - a[1]) * t) * k), Math.floor((a[2] + (b[2] - a[2]) * t) * k), typeof color === 'function' ? color(t) : color, glow);
    }
  }

  box(x0, y0, z0, x1, y1, z1, fn, glow = false) {
    const k = this.k;
    for (let z = Math.floor(z0 * k); z < Math.ceil(z1 * k); z++)
      for (let y = Math.floor(y0 * k); y < Math.ceil(y1 * k); y++) for (let x = Math.floor(x0 * k); x < Math.ceil(x1 * k); x++) this.putG(x, y, z, fn, 0, 0, glow);
  }

  reown(from, to, pred) {
    const a = this.ids.indexOf(from);
    if (a < 0) return;
    let b = this.ids.indexOf(to);
    if (b < 0) {
      this.ids.push(to);
      b = this.ids.length - 1;
    }
    const k = this.k;
    for (let z = this.z0; z < this.z0 + this.sz; z++)
      for (let y = this.y0; y < this.y0 + this.sy; y++)
        for (let x = this.x0; x < this.x0 + this.sx; x++) {
          const i = this.idx(x, y, z);
          if (this.data[i] && this.owner[i] === a && pred((x + 0.5) / k, (y + 0.5) / k, (z + 0.5) / k)) this.owner[i] = b;
        }
  }

  /** Recolours existing voxels inside an ellipsoid; by default only those on the surface. */
  stamp(c, r, fn, exposedOnly = true, glow) {
    const k = this.k;
    const [cx, cy, cz] = this.T(c).map((v) => v * k);
    const [rx, ry, rz] = (typeof r === 'number' ? [r, r, r] : r).map((v) => this.R(v) * k);
    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          if (!this.has(x, y, z) || (exposedOnly && !this.exposed(x, y, z))) continue;
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const dz = (z + 0.5 - cz) / rz;
          const d = dx * dx + dy * dy + dz * dz;
          if (d > 1) continue;
          let px = (x + 0.5) / k;
          let py = (y + 0.5) / k;
          let pz = (z + 0.5) / k;
          const f = this.xf;
          if (f) {
            px = f.c[0] + (px - f.c[0]) / f.s;
            py = f.c[1] + (py - f.c[1]) / f.s;
            pz = f.c[2] + (pz - f.c[2]) / f.s;
          }
          const col = typeof fn === 'function' ? fn(px, py, pz, Math.sqrt(d), this.color(x, y, z)) : fn;
          if (col !== null && col !== undefined) this.tintG(x, y, z, col, glow);
        }
  }

  /** Visit every filled voxel; fn(x, y, z, color, ownerId, gx, gy, gz) may return a new colour. */
  paint(fn) {
    const k = this.k;
    const edits = [];
    for (let z = this.z0; z < this.z0 + this.sz; z++)
      for (let y = this.y0; y < this.y0 + this.sy; y++)
        for (let x = this.x0; x < this.x0 + this.sx; x++) {
          const i = this.idx(x, y, z);
          if (!this.data[i]) continue;
          const c = fn((x + 0.5) / k, (y + 0.5) / k, (z + 0.5) / k, this.data[i] & 0xffffff, this.ids[this.owner[i]], x, y, z);
          if (c !== null && c !== undefined) edits.push(x, y, z, c);
        }
    for (let n = 0; n < edits.length; n += 4) this.tintG(edits[n], edits[n + 1], edits[n + 2], edits[n + 3]);
  }

  /** Cuts one part out of the master grid, plus a one voxel collar of its neighbours so joints overlap. */
  extract(id, pivot, size, margin = 1) {
    const oi = this.ids.indexOf(id);
    if (oi < 0) return null;
    let x0 = 1e9;
    let y0 = 1e9;
    let z0 = 1e9;
    let x1 = -1e9;
    let y1 = -1e9;
    let z1 = -1e9;
    const mine = [];
    for (let z = this.z0; z < this.z0 + this.sz; z++)
      for (let y = this.y0; y < this.y0 + this.sy; y++)
        for (let x = this.x0; x < this.x0 + this.sx; x++) {
          const i = this.idx(x, y, z);
          if (this.data[i] && this.owner[i] === oi) {
            mine.push(x, y, z);
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            z0 = Math.min(z0, z);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
            z1 = Math.max(z1, z);
          }
        }
    if (!mine.length) return null;
    const pad = margin + 1;
    x0 -= pad;
    y0 -= pad;
    z0 -= pad;
    const M = new VoxelModel(x1 - x0 + 1 + pad, y1 - y0 + 1 + pad, z1 - z0 + 1 + pad);
    const put = (x, y, z) => {
      const v = this.data[this.idx(x, y, z)];
      if (!v) return;
      M.set(x - x0, y - y0, z - z0, v & 0xffffff, !!(v & GLOW));
    };
    for (let n = 0; n < mine.length; n += 3) put(mine[n], mine[n + 1], mine[n + 2]);
    if (margin > 0) {
      for (let n = 0; n < mine.length; n += 3) {
        for (let dz = -margin; dz <= margin; dz++)
          for (let dy = -margin; dy <= margin; dy++)
            for (let dx = -margin; dx <= margin; dx++) {
              const x = mine[n] + dx;
              const y = mine[n + 1] + dy;
              const z = mine[n + 2] + dz;
              if (!this.inside(x, y, z) || M.has(x - x0, y - y0, z - z0)) continue;
              put(x, y, z);
            }
      }
    }
    const k = this.k;
    const geo = M.build(size / k, pivot[0] * k - x0, pivot[1] * k - y0, pivot[2] * k - z0);
    return { geo, voxels: mine.length / 3 };
  }
}

/**
 * Turns a rig into reusable geometry. spec: [{ id, parent, pivot:[x,y,z] }] listed parent first.
 * Geometry is built once per creature kind and shared by every spawn.
 */
export function makeKind(rig, spec, size) {
  const geos = {};
  let tris = 0;
  for (const p of spec) {
    const e = rig.extract(p.id, p.pivot, size);
    geos[p.id] = e ? e.geo : null;
    if (e) for (const kk of ['solid', 'glow']) if (e.geo[kk]) tris += e.geo[kk].index.count / 3;
  }
  return { spec, geos, size, tris };
}

const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });

export function instantiate(kind, mat) {
  const root = new THREE.Group();
  const groups = {};
  const pivots = {};
  for (const p of kind.spec) {
    const g = new THREE.Group();
    const par = p.parent ? pivots[p.parent] : [0, 0, 0];
    g.position.set((p.pivot[0] - par[0]) * kind.size, (p.pivot[1] - par[1]) * kind.size, (p.pivot[2] - par[2]) * kind.size);
    pivots[p.id] = p.pivot;
    groups[p.id] = g;
    (p.parent ? groups[p.parent] : root).add(g);
    const geo = kind.geos[p.id];
    if (!geo) continue;
    for (const kk of ['solid', 'glow']) {
      if (!geo[kk]) continue;
      const mesh = new THREE.Mesh(geo[kk], kk === 'solid' ? mat : glowMat);
      mesh.userData.sharedGeo = true;
      mesh.castShadow = kk === 'solid';
      g.add(mesh);
    }
  }
  return { root, groups };
}

export const angDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
