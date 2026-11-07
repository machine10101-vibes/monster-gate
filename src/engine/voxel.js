import * as THREE from 'three';

export class RNG {
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }
  chance(p) {
    return this.next() < p;
  }
}

export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash3(x, y, z, seed = 0) {
  return hash2(x + Math.imul(z | 0, 7919), y, seed + (z | 0) * 31);
}

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, y, seed = 0, oct = 4) {
  let amp = 0.5;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += valueNoise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

const _c = new THREE.Color();

export function hex(r, g, b) {
  return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
}

export function shade(color, f) {
  const r = clamp(((color >> 16) & 255) * f, 0, 255);
  const g = clamp(((color >> 8) & 255) * f, 0, 255);
  const b = clamp((color & 255) * f, 0, 255);
  return hex(r, g, b);
}

export function mix(c1, c2, t) {
  const r = lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t);
  const g = lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t);
  const b = lerp(c1 & 255, c2 & 255, t);
  return hex(r, g, b);
}

export function jitter(color, amount, rnd) {
  return shade(color, 1 + (rnd - 0.5) * 2 * amount);
}

const SOLID = 1 << 24;
const GLOW = 1 << 25;
const WIN = 1 << 26;

const FACE_DEFS = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];
const AO_LEVELS = [0.5, 0.68, 0.84, 1.0];

/**
 * Dense voxel grid with face culling, per-vertex ambient occlusion and
 * emissive voxel support. Colours are baked into vertex colours.
 */
export class VoxelModel {
  constructor(sx, sy, sz) {
    this.sx = sx;
    this.sy = sy;
    this.sz = sz;
    this.data = new Int32Array(sx * sy * sz);
  }

  idx(x, y, z) {
    return x + this.sx * (y + this.sy * z);
  }

  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }

  set(x, y, z, color, glow = false) {
    x |= 0;
    y |= 0;
    z |= 0;
    if (!this.inside(x, y, z)) return;
    this.data[this.idx(x, y, z)] = (color & 0xffffff) | SOLID | (glow === 2 ? GLOW | WIN : glow ? GLOW : 0);
  }

  clear(x, y, z) {
    if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = 0;
  }

  get(x, y, z) {
    if (!this.inside(x, y, z)) return 0;
    return this.data[this.idx(x, y, z)];
  }

  has(x, y, z) {
    return this.get(x, y, z) !== 0;
  }

  /** Fill [x0,x1) x [y0,y1) x [z0,z1). colour may be a number or fn(x,y,z)->number|null */
  box(x0, y0, z0, x1, y1, z1, color, glow = false) {
    for (let z = z0; z < z1; z++)
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const c = typeof color === 'function' ? color(x, y, z) : color;
          if (c === null || c === undefined) continue;
          this.set(x, y, z, c, glow);
        }
  }

  carve(x0, y0, z0, x1, y1, z1) {
    for (let z = z0; z < z1; z++)
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.clear(x, y, z);
  }

  ellipsoid(cx, cy, cz, rx, ry, rz, color, glow = false) {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    const z0 = Math.floor(cz - rz);
    const z1 = Math.ceil(cz + rz);
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) {
            const c = typeof color === 'function' ? color(x, y, z) : color;
            if (c === null || c === undefined) continue;
            this.set(x, y, z, c, glow);
          }
        }
  }

  line(x0, y0, z0, x1, y1, z1, color, thickness = 1, glow = false) {
    const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0))) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const z = z0 + (z1 - z0) * t;
      const h = Math.floor(thickness / 2);
      for (let a = -h; a < thickness - h; a++)
        for (let b = -h; b < thickness - h; b++)
          for (let c = -h; c < thickness - h; c++) {
            const col = typeof color === 'function' ? color(Math.floor(x) + a, Math.floor(y) + b, Math.floor(z) + c) : color;
            if (col === null || col === undefined) continue;
            this.set(Math.floor(x) + a, Math.floor(y) + b, Math.floor(z) + c, col, glow);
          }
    }
  }

  count() {
    let n = 0;
    for (let i = 0; i < this.data.length; i++) if (this.data[i]) n++;
    return n;
  }

  /**
   * Build geometry. origin (ox,oy,oz) is in voxel units and becomes (0,0,0).
   * Returns { solid, glow } BufferGeometry (either may be null).
   */
  build(size = 1, ox = 0, oy = 0, oz = 0, aoStrength = 1) {
    const out = {
      solid: { p: [], n: [], c: [], i: [] },
      glow: { p: [], n: [], c: [], i: [] },
      window: { p: [], n: [], c: [], i: [] },
    };
    const { sx, sy, sz, data } = this;
    const col = new THREE.Color();
    const solidAt = (x, y, z) => {
      if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return 0;
      const v = data[x + sx * (y + sy * z)];
      return v && !(v & GLOW) ? 1 : 0;
    };
    const ao = [0, 0, 0, 0];

    for (let z = 0; z < sz; z++) {
      for (let y = 0; y < sy; y++) {
        for (let x = 0; x < sx; x++) {
          const v = data[x + sx * (y + sy * z)];
          if (!v) continue;
          const isGlow = (v & GLOW) !== 0;
          const target = isGlow ? ((v & WIN) ? out.window : out.glow) : out.solid;
          col.setRGB(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, THREE.SRGBColorSpace);
          for (let f = 0; f < 6; f++) {
            const fd = FACE_DEFS[f];
            const nx = x + fd.n[0];
            const ny = y + fd.n[1];
            const nz = z + fd.n[2];
            if (nx >= 0 && ny >= 0 && nz >= 0 && nx < sx && ny < sy && nz < sz) {
              const nv = data[nx + sx * (ny + sy * nz)];
              if (nv && (isGlow || !(nv & GLOW))) continue;
            }
            const base = target.p.length / 3;
            const cx = x + 0.5 + fd.n[0] * 0.5;
            const cy = y + 0.5 + fd.n[1] * 0.5;
            const cz = z + 0.5 + fd.n[2] * 0.5;
            for (let k = 0; k < 4; k++) {
              const su = CORNERS[k][0];
              const sv = CORNERS[k][1];
              target.p.push(
                (cx + su * 0.5 * fd.u[0] + sv * 0.5 * fd.v[0] - ox) * size,
                (cy + su * 0.5 * fd.u[1] + sv * 0.5 * fd.v[1] - oy) * size,
                (cz + su * 0.5 * fd.u[2] + sv * 0.5 * fd.v[2] - oz) * size
              );
              target.n.push(fd.n[0], fd.n[1], fd.n[2]);
              let a = 3;
              if (!isGlow) {
                const bx = x + fd.n[0];
                const by = y + fd.n[1];
                const bz = z + fd.n[2];
                const s1 = solidAt(bx + su * fd.u[0], by + su * fd.u[1], bz + su * fd.u[2]);
                const s2 = solidAt(bx + sv * fd.v[0], by + sv * fd.v[1], bz + sv * fd.v[2]);
                const cc = solidAt(
                  bx + su * fd.u[0] + sv * fd.v[0],
                  by + su * fd.u[1] + sv * fd.v[1],
                  bz + su * fd.u[2] + sv * fd.v[2]
                );
                a = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
              }
              ao[k] = a;
              const m = isGlow ? 1 : 1 - (1 - AO_LEVELS[a]) * aoStrength;
              target.c.push(col.r * m, col.g * m, col.b * m);
            }
            if (ao[0] + ao[2] > ao[1] + ao[3]) {
              target.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
            } else {
              target.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
            }
          }
        }
      }
    }
    return { solid: toGeometry(out.solid), glow: toGeometry(out.glow), window: toGeometry(out.window) };
  }
}

function toGeometry(d) {
  if (!d.p.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
  g.setIndex(d.i);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** Merge many geometries, baking a matrix into each. All must share attributes. */
export class GeometryBatch {
  constructor() {
    this.p = [];
    this.n = [];
    this.c = [];
    this.u = [];
    this.i = [];
    this.hasUV = false;
  }

  add(geo, matrix, tint = null) {
    if (!geo) return;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const col = geo.attributes.color;
    const base = this.p.length / 3;
    const v = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const nv = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(matrix);
      this.p.push(v.x, v.y, v.z);
      nv.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
      this.n.push(nv.x, nv.y, nv.z);
      if (tint) this.c.push(col.getX(k) * tint[0], col.getY(k) * tint[1], col.getZ(k) * tint[2]);
      else this.c.push(col.getX(k), col.getY(k), col.getZ(k));
    }
    const idx = geo.index;
    for (let k = 0; k < idx.count; k++) this.i.push(base + idx.getX(k));
  }

  get empty() {
    return this.p.length === 0;
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export { _c };
