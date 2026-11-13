import * as THREE from 'three';
import { VoxelModel, RNG, hash3, jitter, mix, shade, clamp } from '../engine/voxel.js';
import { J } from './models.js';
import { buildShips } from './jungleShips.js';

/**
 * Props for the tropical jungle oasis tiles and the pirate shipyard: palms, canopy giants,
 * undergrowth, mossy ruins, beach clutter, pirate gear, shacks. Ships and piers live in jungleShips.js.
 */

const flo = Math.floor;
const GLOW_F = 1 << 25;
const WIN_F = 1 << 26;
const SRGB_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const AO_LV = [0.5, 0.68, 0.84, 1.0];

/** Per-key level of detail: k = fine voxels per coarse voxel, thr = min filled fraction, tol = colour merge tolerance. */
export const LODS = {
  palms: { k: 1 },
  palmsLean: { k: 1 },
  palmsShort: { k: 1 },
  jungleGiants: { k: 2.5, thr: 0.15 },
  broadleaf: { k: 2, thr: 0.15 },
  bananas: { k: 2.5, thr: 0.15 },
  bamboo: { k: 2.5, thr: 0.2 },
  mangrove: [{ k: 2, thr: 0.2 }, { k: 2, thr: 0.2 }, { k: 2.12, thr: 0.2 }],
  bigLeaves: { k: 4, thr: 0.1 },
  ferns: { k: 3, thr: 0.1 },
  heliconia: [{ k: 2.25, thr: 0.1 }, { k: 2, thr: 0.1 }, { k: 2, thr: 0.1 }],
  orchids: [{ k: 1.79, thr: 0.1 }, { k: 1.5, thr: 0.1 }, { k: 1.79, thr: 0.1 }],
  hibiscus: { k: 2.5, thr: 0.15 },
  tropBush: { k: 2, thr: 0.15 },
  lotus: { k: 2, thr: 0.1 },
  vineCurtain: { k: 2.25, thr: 0.1 },
  ruinPillars: [{ k: 1.59, thr: 0.3 }, { k: 1.59, thr: 0.3 }, { k: 1.5, thr: 0.3 }],
  ruinArch: { k: 1.79, thr: 0.3 },
  idols: [{ k: 1.79, thr: 0.3 }, { k: 1.69, thr: 0.3 }],
  altar: { k: 1.79, thr: 0.3 },
  mossRocks: { k: 2.5, thr: 0.3 },
  mossBoulders: { k: 2, thr: 0.3 },
  driftwood: { k: 2, thr: 0.25 },
  shells: { k: 2, thr: 0.2 },
  starfish: { k: 2, thr: 0.2 },
  beachRocks: { k: 2.5, thr: 0.3 },
  crabs: [{ k: 1.69, thr: 0.2 }, { k: 1.59, thr: 0.2 }],
  cannon: { k: 2, thr: 0.3 },
  cannonPile: { k: 1.59, thr: 0.3 },
  ropeCoil: { k: 1.5, thr: 0.3 },
  anchor: { k: 2, thr: 0.25 },
  netRack: { k: 2, thr: 0.2 },
  rowboat: [{ k: 1.69, thr: 0.3 }, { k: 1.79, thr: 0.3 }],
  tikiTorch: { k: 1.5, thr: 0.25 },
  lanternPost: { k: 1.3, thr: 0.25 },
  pirateFlag: { k: 1.79, thr: 0.25 },
  cargoStack: { k: 2, thr: 0.3 },
  plankPile: { k: 1.79, thr: 0.3 },
  treasureChest: { k: 1.69, thr: 0.3 },
  skullTotems: { k: 2, thr: 0.25 },
  shack: { k: 2, thr: 0.3 },
  shipBlack: { k: 2, thr: 0.25 },
  shipBrown: { k: 2, thr: 0.25 },
  shipWreck: { k: 2, thr: 0.25 },
  pierSegment: { k: 3.2, thr: 0.12 },
  pierEnd: { k: 3.2, thr: 0.12 },
  pierPlatform: { k: 2, thr: 0.12 },
};
export const TIMES = {};
let curLod = null;
let curVariant = 0;

function setLod(key, fn) {
  curLod = LODS[key] || null;
  curVariant = 0;
  const t0 = performance.now();
  const r = fn();
  TIMES[key] = performance.now() - t0;
  curLod = null;
  return r;
}

function lodFor() {
  const l = curLod;
  const v = Array.isArray(l) ? l[Math.min(curVariant, l.length - 1)] : l;
  curVariant++;
  return v || {};
}

function downsample(m, k, thrFrac, ox, oy, oz) {
  const o = [ox, oy, oz];
  const dims = [m.sx, m.sy, m.sz];
  const mn = [0, 0, 0];
  const nn = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    mn[a] = flo((0.5 - o[a]) / k);
    nn[a] = flo((dims[a] - 0.5 - o[a]) / k) - mn[a] + 1;
  }
  const [nx, ny, nz] = nn;
  const N = nx * ny * nz;
  const cnt = new Uint16Array(N);
  const sr = new Float32Array(N);
  const sg = new Float32Array(N);
  const sb = new Float32Array(N);
  const gc = new Uint16Array(N);
  const gr = new Float32Array(N);
  const gg = new Float32Array(N);
  const gb = new Float32Array(N);
  const win = new Uint8Array(N);
  const { sx, sy, data } = m;
  for (let z = 0; z < m.sz; z++) {
    const cz = flo((z + 0.5 - oz) / k) - mn[2];
    for (let y = 0; y < sy; y++) {
      const cy = flo((y + 0.5 - oy) / k) - mn[1];
      for (let x = 0; x < sx; x++) {
        const v = data[x + sx * (y + sy * z)];
        if (!v) continue;
        const cx = flo((x + 0.5 - ox) / k) - mn[0];
        const i = cx + nx * (cy + ny * cz);
        const r = (v >> 16) & 255;
        const g = (v >> 8) & 255;
        const b = v & 255;
        if (v & GLOW_F) {
          gc[i]++;
          gr[i] += r;
          gg[i] += g;
          gb[i] += b;
          if (v & WIN_F) win[i] = 1;
        } else {
          cnt[i]++;
          sr[i] += r;
          sg[i] += g;
          sb[i] += b;
        }
      }
    }
  }
  const thr = Math.max(1, Math.ceil(thrFrac * k * k * k));
  const out = new VoxelModel(nx, ny, nz);
  for (let i = 0; i < N; i++) {
    let v = 0;
    if (gc[i]) v = (Math.round(gr[i] / gc[i]) << 16) | (Math.round(gg[i] / gc[i]) << 8) | Math.round(gb[i] / gc[i]) | GLOW_F | (win[i] ? WIN_F : 0) | (1 << 24);
    else if (cnt[i] >= thr) v = (Math.round(sr[i] / cnt[i]) << 16) | (Math.round(sg[i] / cnt[i]) << 8) | Math.round(sb[i] / cnt[i]) | (1 << 24);
    out.data[i] = v;
  }
  return { m: out, ox: -mn[0], oy: -mn[1], oz: -mn[2] };
}

class MeshOut {
  constructor() {
    this.np = 0;
    this.ni = 0;
    this.p = new Float32Array(3072);
    this.n = new Float32Array(3072);
    this.c = new Float32Array(3072);
    this.i = new Uint32Array(1536);
  }
  quad(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, nx, ny, nz, c0, c1, c2, c3, r, g, b, flip, sign) {
    if ((this.np + 4) * 3 > this.p.length) {
      const grow = (arr, T) => {
        const o = new T(arr.length * 2);
        o.set(arr);
        return o;
      };
      this.p = grow(this.p, Float32Array);
      this.n = grow(this.n, Float32Array);
      this.c = grow(this.c, Float32Array);
    }
    if (this.ni + 6 > this.i.length) {
      const o = new Uint32Array(this.i.length * 2);
      o.set(this.i);
      this.i = o;
    }
    const q = this.np * 3;
    const P = this.p;
    const N = this.n;
    const C = this.c;
    P[q] = x0; P[q + 1] = y0; P[q + 2] = z0;
    P[q + 3] = x1; P[q + 4] = y1; P[q + 5] = z1;
    P[q + 6] = x2; P[q + 7] = y2; P[q + 8] = z2;
    P[q + 9] = x3; P[q + 10] = y3; P[q + 11] = z3;
    for (let k = 0; k < 4; k++) {
      N[q + k * 3] = nx;
      N[q + k * 3 + 1] = ny;
      N[q + k * 3 + 2] = nz;
    }
    C[q] = r * c0; C[q + 1] = g * c0; C[q + 2] = b * c0;
    C[q + 3] = r * c1; C[q + 4] = g * c1; C[q + 5] = b * c1;
    C[q + 6] = r * c2; C[q + 7] = g * c2; C[q + 8] = b * c2;
    C[q + 9] = r * c3; C[q + 10] = g * c3; C[q + 11] = b * c3;
    const base = this.np;
    const I = this.i;
    const t = this.ni;
    if (sign > 0) {
      if (flip) { I[t] = base; I[t + 1] = base + 1; I[t + 2] = base + 2; I[t + 3] = base; I[t + 4] = base + 2; I[t + 5] = base + 3; }
      else { I[t] = base + 1; I[t + 1] = base + 2; I[t + 2] = base + 3; I[t + 3] = base + 1; I[t + 4] = base + 3; I[t + 5] = base; }
    } else if (flip) { I[t] = base; I[t + 1] = base + 2; I[t + 2] = base + 1; I[t + 3] = base; I[t + 4] = base + 3; I[t + 5] = base + 2; }
    else { I[t] = base + 1; I[t + 1] = base + 3; I[t + 2] = base + 2; I[t + 3] = base + 1; I[t + 4] = base; I[t + 5] = base + 3; }
    this.np += 4;
    this.ni += 6;
  }
  geo() {
    if (!this.np) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p.slice(0, this.np * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.n.slice(0, this.np * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.c.slice(0, this.np * 3), 3));
    const idx = this.i.slice(0, this.ni);
    g.setIndex(new THREE.BufferAttribute(this.np > 65535 ? idx : new Uint16Array(idx), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Face-culled mesher that merges coplanar, similarly coloured, unoccluded faces into larger quads. */
function greedyBuild(m, size, ox, oy, oz, tol) {
  const sx = m.sx;
  const sy = m.sy;
  const sz = m.sz;
  const data = m.data;
  const outs = [new MeshOut(), new MeshOut(), new MeshOut()];
  const sol = (x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return 0;
    const v = data[x + sx * (y + sy * z)];
    return v && !(v & GLOW_F) ? 1 : 0;
  };
  const dimsA = [sx, sy, sz];
  const mx = Math.max(sx, sy, sz);
  const col = new Int32Array(mx * mx);
  const kind = new Uint8Array(mx * mx);
  const aoM = new Uint8Array(mx * mx);
  const done = new Uint8Array(mx * mx);
  for (let d = 0; d < 3; d++) {
    const ua = (d + 1) % 3;
    const va = (d + 2) % 3;
    const nu = dimsA[ua];
    const nv = dimsA[va];
    const ux = ua === 0 ? 1 : 0, uy = ua === 1 ? 1 : 0, uz = ua === 2 ? 1 : 0;
    const vx = va === 0 ? 1 : 0, vy = va === 1 ? 1 : 0, vz = va === 2 ? 1 : 0;
    const dx = d === 0 ? 1 : 0, dy = d === 1 ? 1 : 0, dz = d === 2 ? 1 : 0;
    for (let sign = 1; sign >= -1; sign -= 2) {
      const sdx = dx * sign, sdy = dy * sign, sdz = dz * sign;
      for (let s = 0; s < dimsA[d]; s++) {
        let any = false;
        const n = nu * nv;
        col.fill(-1, 0, n);
        done.fill(0, 0, n);
        for (let j = 0; j < nv; j++) {
          for (let i = 0; i < nu; i++) {
            const x = dx * s + ux * i + vx * j;
            const y = dy * s + uy * i + vy * j;
            const z = dz * s + uz * i + vz * j;
            const v = data[x + sx * (y + sy * z)];
            if (!v) continue;
            const isGlow = (v & GLOW_F) !== 0;
            const bx = x + sdx, by = y + sdy, bz = z + sdz;
            if (bx >= 0 && by >= 0 && bz >= 0 && bx < sx && by < sy && bz < sz) {
              const nvx = data[bx + sx * (by + sy * bz)];
              if (nvx && (isGlow || !(nvx & GLOW_F))) continue;
            }
            const cell = i + nu * j;
            col[cell] = v & 0xffffff;
            kind[cell] = isGlow ? (v & WIN_F ? 2 : 1) : 0;
            let ao = 0xff;
            if (!isGlow) {
              const sU0 = sol(bx - ux, by - uy, bz - uz);
              const sU1 = sol(bx + ux, by + uy, bz + uz);
              const sV0 = sol(bx - vx, by - vy, bz - vz);
              const sV1 = sol(bx + vx, by + vy, bz + vz);
              if (sU0 | sU1 | sV0 | sV1) {
                const c00 = sol(bx - ux - vx, by - uy - vy, bz - uz - vz);
                const c10 = sol(bx + ux - vx, by + uy - vy, bz + uz - vz);
                const c11 = sol(bx + ux + vx, by + uy + vy, bz + uz + vz);
                const c01 = sol(bx - ux + vx, by - uy + vy, bz - uz + vz);
                const a0 = sU0 && sV0 ? 0 : 3 - (sU0 + sV0 + c00);
                const a1 = sU1 && sV0 ? 0 : 3 - (sU1 + sV0 + c10);
                const a2 = sU1 && sV1 ? 0 : 3 - (sU1 + sV1 + c11);
                const a3 = sU0 && sV1 ? 0 : 3 - (sU0 + sV1 + c01);
                ao = a0 | (a1 << 2) | (a2 << 4) | (a3 << 6);
              } else {
                const c00 = sol(bx - ux - vx, by - uy - vy, bz - uz - vz);
                const c10 = sol(bx + ux - vx, by + uy - vy, bz + uz - vz);
                const c11 = sol(bx + ux + vx, by + uy + vy, bz + uz + vz);
                const c01 = sol(bx - ux + vx, by - uy + vy, bz - uz + vz);
                if (c00 | c10 | c11 | c01) ao = (3 - c00) | ((3 - c10) << 2) | ((3 - c11) << 4) | ((3 - c01) << 6);
              }
            }
            aoM[cell] = ao;
            any = true;
          }
        }
        if (!any) continue;
        const plane = s + (sign > 0 ? 1 : 0);
        for (let j = 0; j < nv; j++) {
          for (let i = 0; i < nu; i++) {
            const cell = i + nu * j;
            if (col[cell] < 0 || done[cell]) continue;
            const c0 = col[cell];
            const k0 = kind[cell];
            const a0 = aoM[cell];
            let w = 1;
            let h = 1;
            const r0 = (c0 >> 16) & 255;
            const g0 = (c0 >> 8) & 255;
            const b0 = c0 & 255;
            let sr = r0, sg = g0, sb = b0;
            if (a0 === 0xff) {
              let c = cell + 1;
              while (i + w < nu) {
                const cc = col[c];
                if (cc < 0 || done[c] || kind[c] !== k0 || aoM[c] !== 0xff || Math.abs(((cc >> 16) & 255) - r0) > tol || Math.abs(((cc >> 8) & 255) - g0) > tol || Math.abs((cc & 255) - b0) > tol) break;
                sr += (cc >> 16) & 255; sg += (cc >> 8) & 255; sb += cc & 255;
                w++;
                c++;
              }
              let grow = true;
              while (grow && j + h < nv) {
                const row = cell + nu * h;
                for (let t = 0; t < w; t++) {
                  const cc = col[row + t];
                  if (cc < 0 || done[row + t] || kind[row + t] !== k0 || aoM[row + t] !== 0xff || Math.abs(((cc >> 16) & 255) - r0) > tol || Math.abs(((cc >> 8) & 255) - g0) > tol || Math.abs((cc & 255) - b0) > tol) { grow = false; break; }
                }
                if (grow) {
                  for (let t = 0; t < w; t++) {
                    const cc = col[row + t];
                    sr += (cc >> 16) & 255; sg += (cc >> 8) & 255; sb += cc & 255;
                  }
                  h++;
                }
              }
              const nc = w * h;
              sr /= nc; sg /= nc; sb /= nc;
            }
            for (let jj = 0; jj < h; jj++) for (let ii = 0; ii < w; ii++) done[cell + ii + nu * jj] = 1;
            const lr = SRGB_LIN[Math.round(sr)];
            const lg = SRGB_LIN[Math.round(sg)];
            const lb = SRGB_LIN[Math.round(sb)];
            const out = outs[k0];
            const iu = i + w, jv = j + h;
            const A0 = AO_LV[a0 & 3], A1 = AO_LV[(a0 >> 2) & 3], A2 = AO_LV[(a0 >> 4) & 3], A3 = AO_LV[(a0 >> 6) & 3];
            const flip = (a0 & 3) + ((a0 >> 4) & 3) > ((a0 >> 2) & 3) + ((a0 >> 6) & 3);
            const px = (u, v) => (dx * plane + ux * u + vx * v - ox) * size;
            const py = (u, v) => (dy * plane + uy * u + vy * v - oy) * size;
            const pz = (u, v) => (dz * plane + uz * u + vz * v - oz) * size;
            out.quad(
              px(i, j), py(i, j), pz(i, j),
              px(iu, j), py(iu, j), pz(iu, j),
              px(iu, jv), py(iu, jv), pz(iu, jv),
              px(i, jv), py(i, jv), pz(i, jv),
              sdx, sdy, sdz, A0, A1, A2, A3, lr, lg, lb, flip, sign
            );
          }
        }
      }
    }
  }
  return { solid: outs[0].geo(), glow: outs[1].geo(), window: outs[2].geo() };
}

function bundle(entries) {
  const lod = lodFor();
  const k = lod.k || 1;
  const parts = [];
  for (const [m0, size, ox0, oy0, oz0] of entries) {
    let m = m0;
    let ox = ox0;
    let oy = oy0;
    let oz = oz0;
    let sz = size;
    if (k > 1) {
      const d = downsample(m0, k, lod.thr ?? 0.25, ox0, oy0, oz0);
      m = d.m;
      ox = d.ox;
      oy = d.oy;
      oz = d.oz;
      sz = size * k;
    }
    const g = greedyBuild(m, sz, ox, oy, oz, lod.tol ?? 10);
    for (const kind of ['solid', 'glow', 'window']) if (g[kind]) parts.push({ geo: g[kind], kind });
  }
  return parts;
}

const lerp = (a, b, t) => a + (b - a) * t;
const pickC = (arr, x, y, z, s) => arr[flo(hash3(x, y, z, s) * arr.length) % arr.length];

const LEAF_DEEP = [0x0b4a36, 0x0f5a3c, 0x136a44];
const LEAF_MID = [0x1a8a48, 0x22a04e, 0x2ab056];
const LEAF_LIGHT = [0x55c64a, 0x7ad44a, 0xa6e05a];
const LEAF_TEAL = [0x0e7a64, 0x15927a, 0x1fa88a];
const STONE = [0x7d8a78, 0x6f7d6c, 0x8a9684, 0x657260];
const MOSS = [0x4a8a36, 0x5ba03e, 0x3c7a30, 0x78b848];
const ROPE = [0xd6c394, 0xc4ae7a, 0xb59f6e];
const WOOD = [0x9a6c3f, 0x8a5e35, 0xa5774a, 0x7f5530];
const WOOD_DARK = [0x5e3d22, 0x4f3220, 0x6b4627];
const IRON = [0x2c2f36, 0x363a42, 0x24272d];
const SAND = [0xe8d49a, 0xf0dca4, 0xdcc88c, 0xf6e6b4];

export function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.35, glow = false) {
  for (let z = flo(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = flo(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = flo(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1 + (hash3(x, y, z, seed) - 0.5) * noise) {
          const c = typeof color === 'function' ? color(x, y, z, d) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c, glow);
        }
      }
}

function cyl(m, cx, cz, y0, y1, r, color, glow = false) {
  const R = Math.ceil(r) + 1;
  for (let y = y0; y < y1; y++)
    for (let z = flo(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = flo(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz <= r * r) {
          const c = typeof color === 'function' ? color(x, y, z) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c, glow);
        }
      }
}

const bez = (a, b, c, t) => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], u * u * a[2] + 2 * u * t * b[2] + t * t * c[2]];
};

/** Thick curved tube along a quadratic bezier; colour fn gets (x,y,z,t). */
function tube(m, a, b, c, r0, r1, color, ringFn = null) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) + Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]);
  const steps = Math.ceil(len * 1.6);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [px, py, pz] = bez(a, b, c, t);
    const r = lerp(r0, r1, t) + (ringFn ? ringFn(py, t) : 0);
    const R = Math.ceil(r);
    for (let dz = -R; dz <= R; dz++)
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          if (dx * dx + dz * dz + dy * dy * 0.7 > r * r) continue;
          const x = flo(px + dx + 0.5);
          const y = flo(py + dy + 0.5);
          const z = flo(pz + dz + 0.5);
          const col = typeof color === 'function' ? color(x, y, z, t) : color;
          if (col !== null && col !== undefined) m.set(x, y, z, col);
        }
  }
}

/**
 * Generic leaf: a midrib that arcs (pitch0 rising, curl bending it down) with either a solid blade or
 * feathery leaflets along both sides. col(x,y,z,t,e): t along the leaf, e from midrib to edge.
 */
function leaf(m, bx, by, bz, ang, len, pitch0, curl, o) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const step = 0.5;
  const n = Math.ceil(len / step);
  const hw = o.width ?? 4;
  const shape = o.shape ?? ((t) => Math.sin(Math.PI * Math.min(1, t * 0.88 + 0.12)) ** 0.75);
  const ldroop = o.ldroop ?? 0.6;
  const sweep = o.sweep ?? 0.45;
  const vdepth = o.vdepth ?? 0.35;
  const spacing = (o.spacing ?? 2) * 2;
  const seed = o.seed ?? 1;
  let px = bx;
  let py = by;
  let pz = bz;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const pitch = pitch0 - curl * t;
    px += ca * Math.cos(pitch) * step;
    pz += sa * Math.cos(pitch) * step;
    py += Math.sin(pitch) * step;
    const mx = flo(px);
    const my = flo(py);
    const mz = flo(pz);
    const half = hw * shape(t) * (1 - (o.rag ?? 0) * hash3(i, mx, mz, seed));
    if (o.mid) m.set(mx, my, mz, o.mid(mx, my, mz, t));
    if (o.leaflets) {
      if (i % spacing >= (o.lthick ?? 1)) continue;
      const L = Math.max(1, Math.round(half));
      for (const side of [-1, 1]) {
        const jl = L - (hash3(i, side, mx + mz, seed + 4) > 0.7 ? 1 : 0);
        for (let k = 1; k <= jl; k++) {
          const lx = flo(px - sa * side * k * 0.95 + ca * k * sweep);
          const lz = flo(pz + ca * side * k * 0.95 + sa * k * sweep);
          const ly = flo(py - k * ldroop);
          m.set(lx, ly, lz, o.col(lx, ly, lz, t, k / L));
        }
      }
    } else {
      for (let s = -half; s <= half; s += 0.5) {
        const lx = flo(px - sa * s);
        const lz = flo(pz + ca * s);
        const ly = flo(py - Math.abs(s) * vdepth);
        const e = half > 0 ? Math.abs(s) / half : 0;
        if (o.holes && o.holes(lx, ly, lz, t, e)) continue;
        m.set(lx, ly, lz, o.col(lx, ly, lz, t, e));
      }
    }
  }
}

/** Clump of broad leaves: flat ellipsoid shaded dark underside to bright top. */
function clump(m, cx, cy, cz, rx, ry, rz, pal, seed, noise = 0.55) {
  blob(
    m, cx, cy, cz, rx, ry, rz,
    (x, y, z) => {
      const up = (y + 0.5 - cy) / ry;
      const idx = clamp(flo((up * 0.5 + 0.5) * 3.4 + (hash3(x, y, z, seed + 5) - 0.5) * 1.5), 0, 3);
      return J(pal[idx], x, y, z, seed, 0.05);
    },
    seed, noise
  );
}

const LEAF_PALS = {
  jade: [0x0e5a3e, 0x147a4a, 0x22a050, 0x7ad44a],
  emerald: [0x126b3a, 0x1d8f45, 0x35b84c, 0xa6e05a],
  teal: [0x0a5a56, 0x11807a, 0x1fa890, 0x6adcb0],
  lime: [0x1f7a38, 0x3fa044, 0x78cc48, 0xd0ee68],
  deep: [0x08402c, 0x0d5a3a, 0x167a48, 0x3aa55a],
};

/** Moss on exposed tops (and a bit on sides). Works on stone-like models. */
function mossify(m, seed, top = 0.55, side = 0.12, ymin = 0) {
  const jobs = [];
  for (let z = 0; z < m.sz; z++)
    for (let y = ymin; y < m.sy; y++)
      for (let x = 0; x < m.sx; x++) {
        if (!m.has(x, y, z) || m.get(x, y, z) & (1 << 25)) continue;
        const patch = hash3(x >> 2, y >> 2, z >> 2, seed + 40);
        if (!m.has(x, y + 1, z) && hash3(x, y, z, seed + 41) < top * clamp((patch - 0.3) * 2.4, 0, 1.5)) jobs.push([x, y, z, 1]);
        else if (
          (!m.has(x + 1, y, z) || !m.has(x - 1, y, z) || !m.has(x, y, z + 1) || !m.has(x, y, z - 1)) &&
          patch > 1 - side * 1.6 && hash3(x, y, z, seed + 42) < 0.6
        )
          jobs.push([x, y, z, 0]);
      }
  for (const [x, y, z, t] of jobs) {
    m.set(x, y, z, J(MOSS[flo(hash3(x, y, z, seed + 43) * 4)], x, y, z, seed, 0.06));
    if (t && hash3(x, y, z, seed + 44) > 0.8 && !m.has(x, y + 1, z)) m.set(x, y + 1, z, J(MOSS[3], x, y, z, seed, 0.06));
  }
}

/** Hanging vines from random side edges downward with the odd leaf. */
function vines(m, seed, count, minLen, maxLen, y0 = 0, region = null) {
  const rng = new RNG(seed * 17 + 5);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let placed = 0;
  for (let tries = 0; tries < count * 60 && placed < count; tries++) {
    const x = rng.int(0, m.sx - 1);
    const z = rng.int(0, m.sz - 1);
    let y = m.sy - 1;
    while (y > y0 && !m.has(x, y, z)) y--;
    if (y <= y0 + 3) continue;
    if (region && !region(x, y, z)) continue;
    const [dx, dz] = rng.pick(dirs);
    if (m.has(x + dx, y, z + dz)) continue;
    const len = rng.int(minLen, maxLen);
    const vx = x + dx;
    const vz = z + dz;
    for (let k = 0; k < len; k++) {
      const yy = y - k;
      if (yy < y0 || m.has(vx, yy, vz)) break;
      m.set(vx, yy, vz, J(k % 7 === 6 ? 0x3aa64a : 0x1f6a34, vx, yy, vz, seed, 0.1));
      if (k % 5 === 3) {
        const sd = hash3(vx, yy, vz, seed) > 0.5 ? 1 : -1;
        if (!m.has(vx + sd, yy, vz)) m.set(vx + sd, yy, vz, J(0x4cc050, vx, yy, vz, seed, 0.1));
        if (!m.has(vx, yy, vz + sd)) m.set(vx, yy, vz + sd, J(0x2fa046, vx, yy, vz, seed, 0.1));
      }
    }
    placed++;
  }
}

/* ---------------------------------- palms --------------------------------- */

const PALM_RING = [0x7d6c55, 0xc4a87c, 0xb69a6c, 0xaa8e62];

function palm(seed, { h, dx = 0, dz = 0, vox = 0.3, nf = 8, wobble = 0.07, crownDark = 1, wid = 3 }) {
  const rng = new RNG(seed * 41 + 9);
  const sc = 0.125 / vox;
  const H = Math.round(h / vox);
  const fl = Math.round((h * 0.42 + 0.5) / vox);
  const R = fl + 3;
  const ox = Math.round(dx / vox);
  const oz = Math.round(dz / vox);
  const bx = R + Math.max(0, -ox);
  const bz = R + Math.max(0, -oz);
  const M = new VoxelModel(R * 2 + Math.abs(ox) + 2, H + Math.round(fl * 0.55) + 4, R * 2 + Math.abs(oz) + 2);
  const wx = rng.range(-1, 1) * H * wobble;
  const wz = rng.range(-1, 1) * H * wobble;
  const top = [bx + ox + wx * 0.3, H, bz + oz + wz * 0.3];
  const p0 = [bx, 0, bz];
  const p1 = [bx + ox * 0.14 + wx, H * 0.58, bz + oz * 0.14 + wz];
  const rb = Math.max(1.0, H * 0.04);
  const rt = Math.max(0.75, H * 0.022);
  tube(
    M, p0, p1, top, rb + 0.7, rt,
    (x, y, z, t) => {
      let c = PALM_RING[y % 2];
      if (t > 0.94) c = 0xa6c04a;
      else if (hash3(x, 0, z, seed) > 0.78) c = shade(c, 0.86);
      return J(c, x, y, z, seed, 0.04);
    },
    (y) => Math.max(0, 0.9 - y * 0.4)
  );
  const nut = rng.int(4, 6);
  for (let i = 0; i < nut; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(1.1, 1.8);
    const green = rng.chance(0.35);
    const cx = top[0] + Math.cos(a) * rr;
    const cz = top[2] + Math.sin(a) * rr;
    const cy = top[1] - rng.range(0.8, 1.8);
    blob(M, cx, cy - 0.3, cz, 0.9, 1.0, 0.9, (x, y, z) => J(green ? 0x8a9a32 : 0x6a4426, x, y, z, seed, 0.1), seed + i, 0.1);
  }
  const fr = [];
  for (let i = 0; i < nf; i++) {
    const upper = i % 2 === 0;
    fr.push({
      a: ((i + rng.range(-0.25, 0.25)) / nf) * Math.PI * 2,
      len: fl * rng.range(0.9, 1.1),
      pitch: upper ? rng.range(1.0, 1.25) : rng.range(0.35, 0.55),
      curl: upper ? rng.range(1.7, 2.0) : rng.range(1.2, 1.5),
      tone: rng.range(0.85, 1.12) * (upper ? 1.08 : 0.92),
    });
  }
  fr.push({ a: rng.range(0, 6.28), len: fl * 0.55, pitch: 1.35, curl: 0.5, tone: 1.25 });
  for (const f of fr) {
    leaf(M, top[0], top[1] - 0.3, top[2], f.a, f.len, f.pitch, f.curl, {
      width: wid,
      vdepth: 0.55,
      seed,
      holes: (x, y, z, t, e) => e > 0.3 && (flo(t * f.len * 1.1) & 1) === 0 && t < 0.97,
      mid: (x, y, z, t) => J(shade(mix(0xd6e07a, 0x9ab84a, t), crownDark), x, y, z, seed, 0.04),
      col: (x, y, z, t, e) => {
        const hi = hash3(x, y, z, seed + 7) > 0.82 ? 0.25 : 0;
        const c = mix(mix(0x137a3a, 0x3cb048, e * 0.8 + hi), 0x9ad04a, Math.max(0, t - 0.55) * 0.9 + hi);
        return J(shade(c, f.tone * crownDark), x, y, z, seed, 0.05);
      },
    });
  }
  return bundle([[M, vox, bx, 0, bz]]);
}

export function buildPalms() {
  return [
    palm(1, { h: 6.2, nf: 9 }),
    palm(2, { h: 7.5, nf: 10, dx: 1.6, dz: 0.8 }),
    palm(3, { h: 5.4, nf: 8, dx: -1.2, dz: 1.5 }),
    palm(4, { h: 6.9, nf: 9, dx: 0.6, dz: -1.8 }),
  ];
}

export function buildPalmsLean() {
  return [
    palm(11, { h: 6.4, dx: 5.2, dz: 0.4, nf: 9, wobble: 0.04 }),
    palm(12, { h: 7, dx: 6.2, dz: -0.8, nf: 9, wobble: 0.04 }),
    palm(13, { h: 5.8, dx: 4.6, dz: 1, nf: 8, wobble: 0.05 }),
  ];
}

export function buildPalmsShort() {
  return [
    palm(21, { h: 2.3, vox: 0.22, nf: 6, wobble: 0.05, wid: 2.4 }),
    palm(22, { h: 2.7, vox: 0.22, nf: 6, dx: 0.5, dz: 0.3, wobble: 0.06, wid: 2.4 }),
  ];
}

/* ------------------------------ canopy trees ------------------------------ */

const BARK = [0x7a6e60, 0x6a5e52, 0x8a7e6e, 0x5e5448];

function buttress(m, cx, cz, rTrunk, rMax, hMax, nFins, seed, color, a0 = 0) {
  const R = Math.ceil(rMax) + 1;
  for (let y = 0; y < Math.min(m.sy, hMax + 4); y++) {
    const yy = y / hMax;
    const rt = rTrunk * (1 + Math.max(0, 0.35 - yy * 0.5)) - Math.min(yy, 1) * 0.0;
    for (let z = flo(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = flo(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz > (rMax + 1.5) * (rMax + 1.5)) continue;
        const d = Math.hypot(dx, dz);
        const a = Math.atan2(dz, dx);
        const f = Math.max(0, Math.cos(nFins * (a - a0) * 0.5 + 0.0)) ** 8;
        const fins = f > 0 ? (rMax - rTrunk) * f * Math.max(0, 1 - yy) ** 1.6 : 0;
        const wob = (hash3(x, y, z, seed) - 0.5) * 0.7;
        const rr = rt + fins + wob;
        if (d <= rr) m.set(x, y, z, color(x, y, z, d, fins));
      }
  }
}

function bromeliad(m, x, y, z, ang, col, seed) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const up = Math.cos(ang) * ca + Math.sin(ang) * sa;
    for (let k = 1; k <= 4; k++) m.set(flo(x + Math.cos(ang) * k * 0.9 + ca * k * 0.2 * (1 - up)), flo(y + sa * k * 0.7 + (k > 2 ? 1 : 0)), flo(z + Math.sin(ang) * k * 0.9), J(k > 3 ? 0x6ad850 : 0x239a46, x + k, y, z, seed, 0.08));
  }
  const cx = x + Math.cos(ang) * 3;
  const cz = z + Math.sin(ang) * 3;
  blob(m, cx, y, cz, 2.1, 2.1, 2.1, (xx, yy, zz) => J(col, xx, yy, zz, seed, 0.1), seed, 0.2);
  m.set(flo(cx + Math.cos(ang) * 2), flo(y), flo(cz + Math.sin(ang) * 2), 0xffe070);
}

function giant(seed, total) {
  const rng = new RNG(seed * 61 + 5);
  const vox = 0.125;
  const cbV = Math.round((total - 4.9) / vox);
  const trunkTop = cbV + 18;
  const Rc = 50;
  const T = new VoxelModel(Rc * 2, trunkTop + 24, Rc * 2);
  const cx = Rc;
  const cz = Rc;
  const rT = 6;
  const nb = rng.int(5, 7);
  buttress(T, cx, cz, rT, 26, 30, nb * 2, seed, (x, y, z, d, fins) => {
    let c = pickC(BARK, x >> 1, y >> 1, z >> 1, seed);
    if (hash3(x >> 1, flo(y / 5), z >> 1, seed + 3) > 0.9) c = shade(c, 0.78);
    const moss = hash3(x >> 2, y >> 2, z >> 2, seed + 9) > 0.62 && fins * 1 + d > rT * 0.9;
    return J(moss ? MOSS[flo(hash3(x, y, z, seed) * 3)] : c, x, y, z, seed, 0.07);
  }, rng.range(0, 2));
  for (let y = 30; y < trunkTop; y++) {
    const r = lerp(rT, rT * 0.8, (y - 30) / (trunkTop - 30));
    cyl(T, cx + Math.sin(y * 0.05 + seed) * 1.2, cz + Math.cos(y * 0.043) * 1.2, y, y + 1, r + (hash3(y, 0, 0, seed) > 0.8 ? 0.6 : 0), (x, yy, z) => {
      const moss = hash3(x >> 2, yy >> 2, z >> 2, seed + 9) > 0.7;
      let c = pickC(BARK, x >> 1, yy >> 1, z >> 1, seed + 1);
      if (hash3(x, flo(yy / 3), z, seed + 11) > 0.85) c = shade(c, 0.75);
      return J(moss ? MOSS[flo(hash3(x, yy, z, seed) * 3)] : c, x, yy, z, seed, 0.07);
    });
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.range(0, 1);
    const len = rng.range(18, 26);
    tube(T, [cx, cbV - 12, cz], [cx + Math.cos(a) * len * 0.5, cbV - 6, cz + Math.sin(a) * len * 0.5], [cx + Math.cos(a) * len, cbV + 2 + rng.range(0, 5), cz + Math.sin(a) * len], 3.2, 1.8, (x, y, z) => J(pickC(BARK, x, y, z, seed + 20), x, y, z, seed, 0.07));
  }
  const orchCols = [0xff5fa8, 0xff8a2a, 0xb050ee, 0xff6a50, 0xffd04a];
  for (let i = 0; i < 7; i++) {
    const a = rng.range(0, Math.PI * 2);
    const y = rng.int(36, cbV - 14);
    bromeliad(T, cx + Math.cos(a) * (rT + 0.5), y, cz + Math.sin(a) * (rT + 0.5), a, orchCols[i % 5], seed + i);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.28 + 0.4;
    const len = [rng.range(18, 24), 0][0];
    bromeliad(T, cx + Math.cos(a) * len * 0.8, cbV - 2 + Math.round(len * 0.25), cz + Math.sin(a) * len * 0.8, a + 1.5, orchCols[(i + 2) % 5], seed + 30 + i);
  }
  const C = new VoxelModel(50, 24, 50);
  const cc = 25;
  const layers = [
    { y: 2, r: 22, pal: LEAF_PALS.deep, n: 28 },
    { y: 6, r: 20, pal: LEAF_PALS.jade, n: 26 },
    { y: 10, r: 17, pal: LEAF_PALS.emerald, n: 20 },
    { y: 14, r: 13, pal: LEAF_PALS.teal, n: 14 },
    { y: 17.5, r: 8, pal: LEAF_PALS.lime, n: 8 },
  ];
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = L.r * (0.3 + 0.7 * Math.sqrt(rng.next())) * 0.85;
      clump(C, cc + Math.cos(a) * d, L.y + rng.range(-0.5, 1.2), cc + Math.sin(a) * d, rng.range(4, 6), rng.range(1.7, 2.5), rng.range(4, 6), L.pal, seed + i * 3 + flo(L.y));
    }
  }
  const cs = 0.25;
  const vineRng = new RNG(seed * 5);
  for (let i = 0; i < 30; i++) {
    const a = vineRng.range(0, Math.PI * 2);
    const d = (20 * cs * vineRng.range(0.45, 1.0)) / vox;
    const vx = flo(cx + Math.cos(a) * d);
    const vz = flo(cz + Math.sin(a) * d);
    const len = vineRng.int(14, 54);
    for (let k = 0; k < len; k++) {
      const yy = cbV + 1 - k;
      if (yy < 4) break;
      T.set(vx, yy, vz, J(k % 9 === 8 ? 0x3eaa4c : 0x1b5a2e, vx, yy, vz, seed, 0.1));
      if (k % 6 === 4) {
        const sd = vineRng.chance(0.5) ? 1 : -1;
        T.set(vx + sd, yy, vz, J(0x4cc050, vx, yy, vz, seed, 0.1));
        T.set(vx + sd, yy + 1, vz, J(0x2fa046, vx, yy, vz, seed, 0.1));
      }
    }
  }
  return bundle([
    [T, vox, cx, 0, cz],
    [C, cs, cc, -(cbV * vox) / cs, cc],
  ]);
}

export function buildJungleGiants() {
  return [giant(1, 12), giant(2, 13.4), giant(3, 11.4)];
}

function broadleaf(seed) {
  const rng = new RNG(seed * 71 + 3);
  const vox = 0.125;
  const T = new VoxelModel(30, 62, 30);
  const cx = 15;
  const cz = 15;
  const H = 30 + rng.int(0, 8);
  buttress(T, cx, cz, 4, 10, 12, 8, seed, (x, y, z, d) => {
    const c = pickC([0x6a5a48, 0x5c4e3e, 0x76664f], x >> 1, y >> 1, z >> 1, seed);
    return J(c, x, y, z, seed, 0.08);
  }, rng.range(0, 2));
  for (let y = 10; y < H - 3; y++) {
    const bendx = Math.sin(y * 0.09 + seed) * 2;
    cyl(T, cx + bendx, cz, y, y + 1, 4.2 - (y / H) * 0.9, (x, yy, z) => J(pickC([0x6a5a48, 0x5c4e3e, 0x76664f], x >> 1, yy >> 1, z >> 1, seed), x, yy, z, seed, 0.08));
  }
  for (let k = 0; k < 3; k++) {
    const ph = k * 2.1;
    for (let y = 3; y < H - 2; y++) {
      const a = y * 0.35 + ph;
      const r = (y < 10 ? 4.6 : 4.2 - (y / H) * 0.9) + 0.5;
      const bendx = y < 10 ? 0 : Math.sin(y * 0.09 + seed) * 2;
      const x = flo(cx + bendx + Math.cos(a) * r);
      const z = flo(cz + Math.sin(a) * r);
      T.set(x, y, z, J(0x1f6a34, x, y, z, seed, 0.12));
      T.set(x, y + 1, z, J(0x2a8040, x, y, z, seed, 0.12));
      if (y % 7 === 0) {
        T.set(x + (Math.cos(a) > 0 ? 1 : -1), y, z, 0x4cc050);
        T.set(x, y + 1, z + (Math.sin(a) > 0 ? 1 : -1), 0x3aa046);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const a = rng.range(0, 6.28);
    tube(T, [cx, H - 8, cz], [cx + Math.cos(a) * 6, H - 4, cz + Math.sin(a) * 6], [cx + Math.cos(a) * 11, H + 1, cz + Math.sin(a) * 11], 2, 1.2, (x, y, z) => J(0x5c4e3e, x, y, z, seed, 0.08));
  }
  const C = new VoxelModel(30, 18, 30);
  const g1 = [LEAF_PALS.jade, LEAF_PALS.teal, LEAF_PALS.emerald, LEAF_PALS.deep][seed % 4];
  const g2 = [LEAF_PALS.lime, LEAF_PALS.emerald, LEAF_PALS.lime, LEAF_PALS.jade][seed % 4];
  const cc = 15;
  const lay = [
    { y: 2, r: 11, n: 14, p: g1 },
    { y: 5.5, r: 10, n: 13, p: g2 },
    { y: 9, r: 8, n: 10, p: g1 },
    { y: 12, r: 5.5, n: 6, p: g2 },
  ];
  for (const L of lay)
    for (let i = 0; i < L.n; i++) {
      const a = rng.range(0, 6.28);
      const d = i === 0 ? 0 : L.r * Math.sqrt(rng.next()) * 0.8;
      clump(C, cc + Math.cos(a) * d, L.y + rng.range(-0.4, 1), cc + Math.sin(a) * d, rng.range(3, 4.4), rng.range(1.7, 2.5), rng.range(3, 4.4), L.p, seed + i * 7 + flo(L.y));
    }
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, 6.28);
    const d = rng.range(5, 9);
    const px = cc + Math.cos(a) * d;
    const pz = cc + Math.sin(a) * d;
    for (let k = 0; k < rng.int(2, 4); k++) C.set(flo(px), 1 - k, flo(pz), 0x2a7a3c);
  }
  return bundle([
    [T, vox, cx, 0, cz],
    [C, 0.25, cc, -(H - 8) * vox / 0.25, cc],
  ]);
}

export function buildBroadleaf() {
  return [broadleaf(1), broadleaf(2), broadleaf(3), broadleaf(4)];
}

/* --------------------------------- bananas -------------------------------- */

function banana(seed, purple) {
  const rng = new RNG(seed * 33 + 1);
  const vox = 0.115;
  const H = Math.round((2.2 + seed * 0.2) / vox);
  const M = new VoxelModel(46, 46, 46);
  const cx = 23;
  const cz = 23;
  for (let y = 0; y < H; y++) {
    const r = lerp(3.2, 2.3, y / H);
    cyl(M, cx, cz, y, y + 1, r, (x, yy, z) => {
      const sheath = (yy + flo(Math.atan2(z - cz, x - cx) * 2)) % 6 === 0;
      return J(shade(y < 5 ? 0x5a8a36 : mix(0x78b048, 0xa4cc58, y / H), sheath ? 0.85 : 1), x, yy, z, seed, 0.07);
    });
  }
  const nl = 7;
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const len = rng.range(24, 32);
    const hole = rng.chance(0.5);
    const up = i % 2 === 0;
    leaf(M, cx, H - 1, cz, a, len, up ? 1.15 : 0.6, up ? 1.7 : 1.9, {
      width: 5.4,
      shape: (t) => Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.03)) ** 0.5,
      vdepth: 0.55,
      rag: 0.2,
      seed: seed + i,
      mid: (x, y, z) => J(0xd8ee80, x, y, z, seed, 0.05),
      col: (x, y, z, t, e) => {
        const veins = (x + z + y * 2) % 4 === 0 && e > 0.15;
        const c = mix(mix(0x2a8a38, 0x5cc04c, 1 - e), 0xa6dc58, t * 0.25);
        return J(shade(c, (veins ? 0.85 : 1) * (0.88 + (i % 3) * 0.1)), x, y, z, seed, 0.06);
      },
      holes: (x, y, z, t, e) => e > 0.55 && t > 0.25 && hash3(x >> 1, y >> 1, z, seed + i) > 0.88 && (hole || e > 0.85),
    });
  }
  const ba = rng.range(0, 6.28);
  const bx = cx + Math.cos(ba) * 4;
  const bz = cz + Math.sin(ba) * 4;
  tube(M, [cx, H - 2, cz], [cx + Math.cos(ba) * 3.5, H + 2, cz + Math.sin(ba) * 3.5], [bx, H - 5, bz], 1, 0.9, (x, y, z) => J(0x4a7a30, x, y, z, seed, 0.08));
  const hands = 4;
  for (let hnd = 0; hnd < hands; hnd++) {
    const hy = H - 6 - hnd * 2.6;
    const ha = hnd * 0.7;
    for (let f = 0; f < 5; f++) {
      const fa = ha + (f / 5) * Math.PI * 2;
      for (let k = 0; k < 6; k++) {
        const out = 1.1 + Math.sin(k * 0.45) * 0.9;
        const x = flo(bx + Math.cos(fa) * out);
        const z = flo(bz + Math.sin(fa) * out);
        const y = flo(hy - k * 0.75 + Math.max(0, k - 3) * 0.5);
        const col = k < 1 ? 0x7ab040 : k > 4 ? 0x5a6a28 : hnd < 1 ? 0xc9d848 : 0xf6d83a;
        M.set(x, y, z, J(col, x, y, z, seed, 0.06));
        M.set(x + 1, y, z, J(shade(col, 0.88), x, y, z, seed + 1, 0.06));
      }
    }
  }
  if (purple) {
    const by = H - 6 - hands * 2.6;
    M.set(flo(bx), by + 3, flo(bz), 0x4a7a30);
    M.set(flo(bx), by + 4, flo(bz), 0x4a7a30);
    blob(M, bx + 0.5, by - 1.5, bz + 0.5, 2.4, 3.4, 2.4, (x, y, z, d) => J(d > 0.55 ? 0x6a1a7e : 0xa04aae, x, y, z, seed, 0.08), seed, 0.1);
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildBananas() {
  return [banana(1, true), banana(2, false), banana(3, true)];
}

/* ------------------------------ ground cover ------------------------------ */

function bigLeaves(seed, kind) {
  const rng = new RNG(seed * 19 + 4);
  const vox = 0.08;
  const M = new VoxelModel(60, 44, 60);
  const cx = 30;
  const cz = 30;
  const n = 4 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const len = rng.range(14, 19) * (kind === 0 ? 1.15 : 1);
    const stalk = rng.range(8, 17);
    const sx = cx + Math.cos(a) * 3;
    const sz = cz + Math.sin(a) * 3;
    const ex = sx + Math.cos(a) * stalk * 0.4;
    const ez = sz + Math.sin(a) * stalk * 0.4;
    tube(M, [cx, 0, cz], [sx, stalk * 0.6, sz], [ex, stalk, ez], 0.8, 0.6, (x, y, z) => J(0x4aa04a, x, y, z, seed, 0.08));
    const mons = kind === 1 || (kind === 3 && i % 2 === 0);
    leaf(M, ex, stalk, ez, a, len, 0.65, 1.15, {
      width: len * (kind === 0 ? 0.55 : 0.5),
      shape: (t) => (kind === 0 ? Math.sin(Math.PI * Math.min(1, t * 0.93 + 0.07)) ** 0.6 : Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)) ** 0.7),
      vdepth: 0.3,
      rag: mons ? 0.08 : 0.04,
      seed: seed + i,
      mid: (x, y, z) => J(0xb4e07a, x, y, z, seed, 0.05),
      col: (x, y, z, t, e) => {
        const c = mix(mix(0x1f7a3c, 0x44b048, 1 - e), 0x8ad65a, t * 0.3);
        const veins = Math.abs(Math.sin((e * 4 + t * 2) * 3.1)) < 0.12;
        return J(shade(c, veins ? 1.18 : 0.92 + (i % 3) * 0.08), x, y, z, seed, 0.07);
      },
      holes: mons
        ? (x, y, z, t, e) => (e > 0.3 && e < 0.75 && (flo(t * 6) % 2 === 0) && hash3(flo(t * 6), 0, i, seed) > 0.25 && t < 0.85 && t > 0.2) || (e > 0.78 && flo(t * 9) % 2 === 1)
        : null,
    });
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildBigLeaves() {
  return [bigLeaves(1, 0), bigLeaves(2, 1), bigLeaves(3, 0), bigLeaves(4, 3)];
}

function fern(seed) {
  const rng = new RNG(seed * 23 + 1);
  const vox = 0.075;
  const M = new VoxelModel(60, 34, 60);
  const cx = 30;
  const cz = 30;
  const n = 13 + (seed % 3) * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const up = rng.range(0.7, 1.4);
    const len = rng.range(18, 27) * (up > 1.1 ? 0.8 : 1);
    leaf(M, cx, 1, cz, a, len, up, rng.range(0.9, 1.5), {
      width: 5,
      shape: (t) => Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) ** 0.8 * (1 - t * 0.2),
      leaflets: true,
      spacing: 1,
      ldroop: 0.3,
      sweep: 0.6,
      seed,
      mid: (x, y, z) => J(0x8ad05a, x, y, z, seed, 0.05),
      col: (x, y, z, t, e) => J(mix(mix(0x198a3c, 0x45c04c, 1 - e * 0.5), 0xa4e060, t * 0.4 + (hash3(x, y, z, seed) > 0.85 ? 0.3 : 0)), x, y, z, seed, 0.07),
    });
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildFerns() {
  return [fern(1), fern(2), fern(3)];
}

/* --------------------------------- bamboo --------------------------------- */

function bambooCluster(seed) {
  const rng = new RNG(seed * 29 + 8);
  const vox = 0.125;
  const M = new VoxelModel(54, 76, 54);
  const cx = 27;
  const cz = 27;
  const n = 6 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, 6.28);
    const d = i === 0 ? 0 : rng.range(2, 8);
    const x0 = cx + Math.cos(a) * d;
    const z0 = cz + Math.sin(a) * d;
    const h = Math.round(rng.range(5, 8) / vox * (i === 0 ? 1 : 0.85));
    const la = rng.range(0, 6.28);
    const lean = rng.range(1, 5);
    const yellow = rng.chance(0.35);
    const seg = rng.int(8, 10);
    const seam = rng.range(0, 6);
    const tipx = x0 + Math.cos(la) * lean;
    const tipz = z0 + Math.sin(la) * lean;
    tube(
      M, [x0, 0, z0], [x0 + Math.cos(la) * lean * 0.1, h * 0.55, z0 + Math.sin(la) * lean * 0.1], [tipx, h, tipz], 1.7, 1.15,
      (x, y) => {
        const node = (y + flo(seam)) % seg;
        const base = yellow ? mix(0xe0c84a, 0xc8b040, hash3(x, y, 1, seed)) : mix(0x6ab83e, 0x3a9a40, hash3(x, 0, y, seed));
        if (node === 0) return J(shade(yellow ? 0x9a8a30 : 0x2f6a2a, 1.0), x, y, 0, seed, 0.06);
        return J(shade(base, node === 1 ? 1.1 : 1), x, y, 0, seed, 0.05);
      }
    );
    for (let k = 3; k < h - 3; k += seg) {
      if (k < h * 0.4) continue;
      const f = k / h;
      const [px, py, pz] = bez([x0, 0, z0], [x0 + Math.cos(la) * lean * 0.1, h * 0.55, z0 + Math.sin(la) * lean * 0.1], [tipx, h, tipz], f);
      for (let b = 0; b < 3; b++) {
        const ba = rng.range(0, 6.28);
        const bl = rng.range(4, 8);
        for (let q = 1; q <= bl; q++) M.set(flo(px + Math.cos(ba) * q * 0.7), flo(py + q * 0.5), flo(pz + Math.sin(ba) * q * 0.7), 0x4a8a3a);
        leaf(M, px + Math.cos(ba) * bl * 0.7, py + bl * 0.5, pz + Math.sin(ba) * bl * 0.7, ba, rng.range(5, 8), 0.1, 0.9, {
          width: 1.4,
          shape: (t) => Math.sin(Math.PI * Math.min(1, t * 0.8 + 0.1)) ** 0.8,
          vdepth: 0.1,
          seed,
          col: (x, y, z, t, e) => J(mix(0x2a9a40, 0x9ad850, t * 0.6 + e * 0.2), x, y, z, seed, 0.08),
        });
      }
    }
    leaf(M, tipx, h, tipz, la, 7, 1.0, 1.0, { width: 1.5, vdepth: 0.1, seed, col: (x, y, z, t) => J(mix(0x30a040, 0xa0e050, t), x, y, z, seed, 0.08) });
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildBamboo() {
  return [bambooCluster(1), bambooCluster(2), bambooCluster(3)];
}

/* -------------------------------- flowers --------------------------------- */

const HELI = [
  { bract: [0xe02a2a, 0xff5a2a], tip: 0xf2d43a },
  { bract: [0xf2c42a, 0xffdf55], tip: 0x8ac040 },
  { bract: [0xff5aa0, 0xff8ac0], tip: 0xe03a7a },
];

function heliconia(seed) {
  const rng = new RNG(seed * 47 + 6);
  const vox = 0.0625;
  const pal = HELI[(seed - 1) % 3];
  const M = new VoxelModel(40, 40, 40);
  const cx = 20;
  const cz = 20;
  const nl = 5;
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + rng.range(-0.3, 0.3);
    leaf(M, cx, 1, cz, a, rng.range(13, 17), 0.95, 1.4, {
      width: 3.6,
      vdepth: 0.3,
      rag: 0.08,
      seed: seed + i,
      mid: (x, y, z) => J(0xb0dc6a, x, y, z, seed, 0.05),
      col: (x, y, z, t, e) => J(mix(mix(0x1c7a3a, 0x40aa48, 1 - e), 0x88d058, t * 0.3), x, y, z, seed, 0.07),
    });
  }
  const H = 20 + seed * 3;
  const lean = rng.range(-3, 3);
  tube(M, [cx, 0, cz], [cx + lean * 0.3, H * 0.6, cz], [cx + lean, H, cz + 1], 1, 0.8, (x, y, z) => J(0x4aa040, x, y, z, seed, 0.08));
  const cl = (y0, dir, n) => {
    for (let k = 0; k < n; k++) {
      const y = y0 + k * 2.6;
      const px = cx + lean * (y / H) + (k % 2 ? 1 : -1) * 2;
      const pz = cz + 1 * (y / H) + dir * k * 0.3;
      const t = k / n;
      const col = (x, yy, z) => J(mix(pal.bract[0], pal.bract[1], t), x, yy, z, seed, 0.06);
      const sgn = k % 2 ? 1 : -1;
      for (let q = 0; q < 6; q++) {
        const x = flo(px - sgn * 0.3 + sgn * q * 0.8);
        const yy = flo(y + 1 + Math.sin(q / 5 * Math.PI) * 2.2 - q * 0.1);
        M.set(x, yy, flo(pz), col(x, yy, flo(pz)));
        M.set(x, yy - 1, flo(pz), col(x, yy - 1, flo(pz)));
        M.set(x, yy, flo(pz) + 1, shade(col(x, yy, flo(pz)), 0.88));
        M.set(x, yy - 1, flo(pz) + 1, shade(col(x, yy, flo(pz)), 0.88));
        if (q > 3) M.set(x, yy + 1, flo(pz), shade(col(x, yy, flo(pz)), 1.12));
      }
      M.set(flo(px + sgn * 5), flo(y + 1), flo(pz), pal.tip);
      M.set(flo(px), flo(y + 1), flo(pz), pal.tip);
    }
  };
  cl(H * 0.55, 1, 6);
  if (seed !== 2) {
    const l2 = 2 + seed;
    tube(M, [cx, 0, cz], [cx - 3, 14, cz + 2], [cx - 7, 16 + l2, cz + 3], 0.8, 0.7, 0x4aa040);
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildHeliconia() {
  return [heliconia(1), heliconia(2), heliconia(3)];
}

function orchidPlant(seed) {
  const rng = new RNG(seed * 13 + 6);
  const vox = 0.0625;
  const M = new VoxelModel(30, 22, 30);
  const cx = 15;
  const cz = 15;
  const cols = [[0xff6aae, 0xff9ccc], [0xa05aee, 0xc890ff], [0xffffff, 0xe8f0ff]][(seed - 1) % 3];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.28 + rng.range(0, 1);
    leaf(M, cx, 1, cz, a, rng.range(7, 10), 0.6, 1.0, {
      width: 1.8,
      vdepth: 0.2,
      seed,
      col: (x, y, z, t, e) => J(mix(0x1f7a3c, 0x4cb048, t * 0.5 + (1 - e) * 0.4), x, y, z, seed, 0.07),
    });
  }
  const spikes = 2 + (seed % 2);
  for (let s = 0; s < spikes; s++) {
    const a = (s / spikes) * 6.28 + 0.6;
    const H = rng.int(11, 15);
    const sx = cx + Math.cos(a) * 3;
    const sz = cz + Math.sin(a) * 3;
    tube(M, [cx, 0, cz], [cx + (sx - cx) * 0.4, H * 0.6, cz + (sz - cz) * 0.4], [sx, H, sz], 0.6, 0.5, (x, y, z) => J(0x4aa040, x, y, z, seed, 0.08));
    const nb = rng.int(3, 5);
    for (let b = 0; b < nb; b++) {
      const t = b / nb;
      const [px, py, pz] = bez([cx, 0, cz], [cx + (sx - cx) * 0.4, H * 0.6, cz + (sz - cz) * 0.4], [sx, H, sz], 0.55 + t * 0.45);
      const bx = flo(px);
      const by = flo(py);
      const bz = flo(pz);
      const c = (x, y, z) => J(mix(cols[0], cols[1], hash3(x, y, z, seed)), x, y, z, seed, 0.05);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [-1, 1, 0]]) {
        if (dz && Math.abs(dz) > 0) continue;
        M.set(bx + dx, by + dy, bz + dz, c(bx + dx, by + dy, bz));
      }
      M.set(bx, by - 1, bz + 1, shade(c(bx, by, bz), 0.9));
      M.set(bx, by, bz, 0xffd84a);
      M.set(bx, by, bz + 1, 0xffd84a);
    }
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildOrchids() {
  return [orchidPlant(1), orchidPlant(2), orchidPlant(3)];
}

function hibiscus(seed) {
  const rng = new RNG(seed * 9 + 2);
  const vox = 0.07;
  const M = new VoxelModel(34, 30, 34);
  const cx = 17;
  const cz = 17;
  const Rx = 11 + seed;
  const Ry = 7 + (seed % 3);
  blob(M, cx, Ry + 2, cz, Rx, Ry, Rx, (x, y, z, d) => J(mix(mix(0x1d6a3a, 0x2f9a48, 1 - d), 0x58c050, hash3(x, y, z, seed) > 0.9 ? 0.6 : 0), x, y, z, seed, 0.08), seed, 0.6);
  blob(M, cx - 2, Ry + 4, cz + 1, Rx * 0.6, Ry * 0.6, Rx * 0.6, (x, y, z) => J(0x58c050, x, y, z, seed, 0.1), seed + 1, 0.8);
  const cols = [[0xe02030, 0xff5060], [0xffd428, 0xfff070], [0xff7a58, 0xffa080]][(seed - 1) % 3];
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, 6.28);
    const ph = rng.range(0.2, 1);
    let x = flo(cx + Math.cos(a) * Rx * ph * 0.9);
    let z = flo(cz + Math.sin(a) * Rx * ph * 0.9);
    let y = 0;
    for (let yy = M.sy - 2; yy > 0; yy--) if (M.has(x, yy, z)) { y = yy + 1; break; }
    if (!y) continue;
    const c = (x2, y2, z2) => J(mix(cols[0], cols[1], hash3(x2, y2, z2, seed) * 0.8), x2, y2, z2, seed, 0.05);
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > 3 || (Math.abs(dx) === 2 && Math.abs(dz) === 2)) continue;
        const r = Math.hypot(dx, dz);
        M.set(x + dx, y + (r > 1.5 ? 0 : 1) - (r > 2 ? 1 : 0), z + dz, r < 1.2 ? shade(cols[0], 0.8) : c(x + dx, y, z + dz));
      }
    M.set(x, y + 1, z, shade(cols[0], 0.7));
    M.set(x, y + 2, z, 0xffe070);
    M.set(x + 1, y + 2, z, 0xffb030);
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildHibiscus() {
  return [hibiscus(1), hibiscus(2), hibiscus(3)];
}

function tropBush(seed) {
  const rng = new RNG(seed * 5 + 11);
  const vox = 0.09;
  const M = new VoxelModel(30, 26, 30);
  const cx = 15;
  const cz = 15;
  const pal = [LEAF_PALS.deep, LEAF_PALS.jade, LEAF_PALS.teal][seed - 1];
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, 6.28);
    const d = i === 0 ? 0 : rng.range(3, 7);
    clump(M, cx + Math.cos(a) * d, 5 + rng.range(-1, 3), cz + Math.sin(a) * d, rng.range(5, 7), rng.range(3.5, 5), rng.range(5, 7), pal, seed + i, 0.7);
  }
  const fc = [[0xff4a8a, 0xffd23a], [0xff7a2a, 0xff3a5a], [0xffffff, 0xff9ad0]][seed - 1];
  for (let i = 0; i < 16; i++) {
    const a = rng.range(0, 6.28);
    const d = rng.range(0, 9);
    const x = flo(cx + Math.cos(a) * d);
    const z = flo(cz + Math.sin(a) * d);
    for (let y = M.sy - 2; y > 0; y--)
      if (M.has(x, y, z)) {
        const c = fc[i % 2];
        M.set(x, y + 1, z, c);
        if (i % 3 === 0) M.set(x + 1, y + 1, z, c);
        if (i % 4 === 0) M.set(x, y + 2, z, shade(c, 1.15));
        break;
      }
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildTropBush() {
  return [tropBush(1), tropBush(2), tropBush(3)];
}

/* ------------------------------ water / shore ------------------------------ */

function mangrove(seed) {
  const rng = new RNG(seed * 37 + 2);
  const vox = 0.125;
  const M = new VoxelModel(60, 48, 60);
  const gy = 4;
  const cx = 30;
  const cz = 30;
  const th = Math.round((2.9 + seed * 0.4) / vox);
  tube(M, [cx, gy + 10, cz], [cx + 1, gy + 14, cz], [cx, th - 3, cz + 1], 3, 2.2, (x, y, z) => J(pickC([0x5a4030, 0x6a4a36, 0x4a3628], x >> 1, y >> 1, z, seed), x, y, z, seed, 0.08));
  const n = 7 + seed;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const d = rng.range(11, 19);
    const hy = rng.range(14, 24) + gy;
    const sx = cx + Math.cos(a) * 2;
    const sz = cz + Math.sin(a) * 2;
    tube(
      M, [sx, hy, sz], [cx + Math.cos(a) * d * 0.7, hy + 7, cz + Math.sin(a) * d * 0.7], [cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d], 2.2, 1.0,
      (x, y, z, t) => {
        const wet = y < gy + 3;
        return J(wet ? 0x3c4a2a : pickC([0x6b3f26, 0x7a4a2e, 0x5a3420], x, y, z, seed), x, y, z, seed, 0.1);
      }
    );
    if (i % 2 === 0) {
      const a2 = a + 0.5;
      tube(M, [cx + Math.cos(a2) * 3, hy + 6, cz + Math.sin(a2) * 3], [cx + Math.cos(a2) * 6, hy + 8, cz + Math.sin(a2) * 6], [cx + Math.cos(a2) * 8, hy - 4, cz + Math.sin(a2) * 8], 0.9, 0.5, 0x5a3a28);
    }
  }
  const crownY = th;
  const pal = [LEAF_PALS.emerald, LEAF_PALS.jade, LEAF_PALS.lime][seed - 1];
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, 6.28);
    const d = i === 0 ? 0 : rng.range(3, 8);
    clump(M, cx + Math.cos(a) * d, crownY + rng.range(-1, 3), cz + Math.sin(a) * d, rng.range(5, 8), rng.range(2.4, 3.6), rng.range(5, 8), pal, seed + i * 3, 0.6);
  }
  for (let i = 0; i < 8; i++) {
    const a = rng.range(0, 6.28);
    const d = rng.range(4, 9);
    const x = flo(cx + Math.cos(a) * d);
    const z = flo(cz + Math.sin(a) * d);
    for (let k = 0; k < rng.int(6, 12); k++) M.set(x, crownY - 1 - k, z, 0x5a3a28);
  }
  return bundle([[M, vox, cx, gy, cz]]);
}

export function buildMangrove() {
  return [mangrove(1), mangrove(2), mangrove(3)];
}

function lotus(seed) {
  const rng = new RNG(seed * 7 + 3);
  const vox = 0.1;
  const M = new VoxelModel(40, 8, 40);
  const cx = 20;
  const cz = 20;
  const pads = 4 + seed;
  const placed = [];
  for (let i = 0; i < pads; i++) {
    let px = 0;
    let pz = 0;
    let r = rng.range(4, 6.2);
    for (let t = 0; t < 30; t++) {
      const a = rng.range(0, 6.28);
      const d = i === 0 ? 0 : rng.range(3, 13);
      px = cx + Math.cos(a) * d;
      pz = cz + Math.sin(a) * d;
      if (placed.every((q) => Math.hypot(q[0] - px, q[1] - pz) > q[2] + r - 1.2)) break;
    }
    placed.push([px, pz, r]);
    const notch = rng.range(0, 6.28);
    cyl(M, px, pz, 0, 1, r, (x, y, z) => {
      const ang = Math.atan2(z + 0.5 - pz, x + 0.5 - px);
      const dd = Math.abs(((ang - notch + 9.42) % 6.283) - 3.14);
      if (dd > 3.14 - 0.22 && Math.hypot(x + 0.5 - px, z + 0.5 - pz) > 1) return null;
      const vein = Math.abs(Math.sin((ang - notch) * 4)) < 0.1;
      return J(vein ? 0x58b858 : mix(0x2f8f48, 0x46aa50, hash3(x, 0, z, seed)), x, y, z, seed, 0.06);
    });
  }
  const fl = seed === 2 ? 1 : 2;
  for (let f = 0; f < fl; f++) {
    const q = placed[1 + f] || placed[0];
    const fx = q[0] + rng.range(-1, 1);
    const fz = q[1] + rng.range(-1, 1);
    const pink = (f + seed) % 2 === 0;
    const petal = pink ? [0xff7ab0, 0xffb0d2] : [0xffffff, 0xfff0f6];
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 5 : 6;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 6.28 + ring * 0.5;
        const rr = ring ? 1.1 : 2.2;
        const x = flo(fx + Math.cos(a) * rr);
        const z = flo(fz + Math.sin(a) * rr);
        M.set(x, 1 + ring, z, J(petal[ring], x, ring, z, seed, 0.05));
        if (!ring) M.set(flo(fx + Math.cos(a) * 2.8), 1, flo(fz + Math.sin(a) * 2.8), J(petal[0], x, 0, z, seed, 0.05));
      }
    }
    M.set(flo(fx), 2, flo(fz), 0xffd84a);
    M.set(flo(fx), 3, flo(fz), 0xffd84a);
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildLotus() {
  return [lotus(1), lotus(2), lotus(3)];
}

function vineCurtain(seed) {
  const rng = new RNG(seed * 71 + 9);
  const vox = 0.0625;
  const W = 64;
  const M = new VoxelModel(W + 4, 66, 8);
  const z0 = 3;
  for (let x = 0; x < W; x++) {
    const y = 62 + Math.round(Math.sin(x * 0.4 + seed) * 1);
    for (let z = 2; z < 6; z++) M.set(x + 2, y, z, J(0x1f5a30, x, y, z, seed, 0.1));
    M.set(x + 2, y + 1, z0, J(0x2f7a3c, x, y, 3, seed, 0.1));
    if (hash3(x, 0, 0, seed) > 0.5) M.set(x + 2, y + 2, z0 + 1, 0x4cc050);
  }
  let x = 2;
  while (x < W + 2) {
    const len = rng.int(14, 60) * (0.6 + 0.4 * Math.sin((x / W) * Math.PI));
    const zz = z0 + rng.int(0, 1);
    const sway = rng.range(-0.05, 0.05);
    const thick = rng.chance(0.3) ? 2 : 1;
    for (let k = 0; k < len; k++) {
      const y = 62 - k;
      const vx = flo(x + Math.sin(k * 0.2 + x) * 0.8 + sway * k);
      for (let t = 0; t < thick; t++) M.set(vx + t, y, zz, J(k % 11 === 10 ? 0x4cc050 : 0x1f6a34, vx, y, zz, seed, 0.1));
      if (k % 4 === 2) {
        const s = hash3(vx, y, 1, seed) > 0.5 ? 1 : -1;
        for (let q = 1; q <= 2; q++) M.set(vx + s * (q + thick - 1), y - (q > 1 ? 1 : 0), zz, J(pickC([0x3aaa4a, 0x56c850, 0x2a8a40], vx, y, 3, seed), vx, y, 3, seed, 0.1));
        M.set(vx + s * 1, y + 1, zz + 1, J(0x4cc050, vx, y, 4, seed, 0.1));
      }
    }
    const fx = flo(x + sway * len);
    if (len > 24 && rng.chance(0.55)) {
      const fc = [0xff6aa8, 0xffd84a, 0xffffff, 0xff8a3a][rng.int(0, 3)];
      M.set(fx, 62 - len, zz, fc);
      M.set(fx + 1, 62 - len, zz, fc);
      M.set(fx, 61 - len, zz, shade(fc, 0.85));
    }
    x += rng.int(2, 4);
  }
  return bundle([[M, vox, (W + 4) / 2, 0, 4]]);
}

export function buildVineCurtain() {
  return [vineCurtain(1), vineCurtain(2)];
}

/* ---------------------------------- stone --------------------------------- */

const stoneC = (x, y, z, s, k = 0.5) => J(mix(0x667466, 0x92a08c, hash3(x >> 2, y >> 2, z >> 2, s) * k + (1 - k) * 0.4), x, y, z, s, 0.05);

function cracks(m, seed, n, len = 8) {
  const rng = new RNG(seed * 3 + 1);
  for (let i = 0; i < n; i++) {
    let x = rng.int(0, m.sx - 1);
    let y = rng.int(0, m.sy - 1);
    let z = rng.int(0, m.sz - 1);
    for (let k = 0; k < 40 && !m.has(x, y, z); k++) y = (y + 1) % m.sy;
    for (let k = 0; k < len; k++) {
      if (m.has(x, y, z) && !(m.get(x, y, z) & (1 << 25))) m.set(x, y, z, J(0x333c33, x, y, z, seed, 0.1));
      const r = rng.int(0, 5);
      if (r === 0) x++;
      else if (r === 1) x--;
      else if (r === 2 || r === 3) y--;
      else z += rng.chance(0.5) ? 1 : -1;
    }
  }
}

function pillar(seed, h, broken) {
  const rng = new RNG(seed * 11 + 4);
  const M = new VoxelModel(16, h + 8, 16);
  const s = (x, y, z) => stoneC(x, y, z, seed);
  M.box(2, 0, 2, 14, 3, 14, s);
  M.box(3, 3, 3, 13, 5, 13, s);
  const top = h - 5;
  const jag = (x, z) => (broken ? top - 6 + Math.floor(hash3(x, 0, z, seed + 8) * 10) : top);
  for (let z = 4; z < 12; z++)
    for (let x = 4; x < 12; x++) {
      if ((x === 4 || x === 11) && (z === 4 || z === 11)) continue;
      for (let y = 5; y < jag(x, z); y++) {
        let c = s(x, y, z);
        const band = y % 14 < 2;
        if (band) c = shade(c, 1.12);
        const front = (x === 4 || x === 11 || z === 4 || z === 11) && y % 14 > 4 && y % 14 < 10 && ((x + z) % 4 === 1 || (x + z) % 4 === 2) && y < top - 3;
        M.set(x, y, z, front ? shade(c, 0.62) : c);
      }
    }
  for (let y = 5; y < (broken ? top - 4 : top); y++) if (y % 14 < 2) M.box(3, y, 3, 13, y + 1, 13, (x, yy, z) => ((x === 3 || x === 12) && (z === 3 || z === 12) ? null : shade(s(x, yy, z), 1.08)));
  if (!broken) {
    M.box(3, top, 3, 13, top + 2, 13, s);
    M.box(2, top + 2, 2, 14, top + 4, 14, (x, y, z) => shade(s(x, y, z), 1.05));
    M.box(4, top + 4, 4, 12, top + 5, 12, s);
  } else {
    M.box(1, 0, 3, 3, 2, 8, s);
    for (let k = 0; k < 4; k++) M.set(rng.int(5, 10), top - 5, rng.int(5, 10), 0x4a4e48);
  }
  mossify(M, seed, 0.4, 0.1);
  cracks(M, seed, 3, 9);
  vines(M, seed, broken ? 2 : 4, 6, broken ? 14 : 30, 0);
  return M;
}

export function buildRuinPillars() {
  return [
    bundle([[pillar(1, 32, false), 0.125, 8, 0, 8]]),
    bundle([[pillar(2, 40, false), 0.125, 8, 0, 8]]),
    bundle([[pillar(3, 20, true), 0.125, 8, 0, 8]]),
  ];
}

export function buildRuinArch() {
  const seed = 5;
  const M = new VoxelModel(60, 58, 16);
  const cx = 30;
  const s = (x, y, z) => stoneC(x, y, z, seed);
  const y0 = 28;
  const gap = 12;
  const outer = 21;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? cx - 26 : cx + gap;
    const x1 = side < 0 ? cx - gap : cx + 26;
    const top = side < 0 ? y0 + 2 : y0 - 7;
    M.box(x0 - 1, 0, 2, x1 + 1, 4, 14, s);
    for (let z = 3; z < 13; z++)
      for (let x = x0; x < x1; x++) for (let y = 4; y < top + (side > 0 ? Math.floor(hash3(x, 0, z, seed) * 5) : 0); y++) {
        let c = s(x, y, z);
        if (y % 10 < 1) c = shade(c, 0.8);
        if ((x - x0) % 12 === 11 && y % 10 > 2 && y % 10 < 8) c = shade(c, 0.7);
        M.set(x, y, z, c);
      }
    for (let y = 8; y < top; y += 10) M.box(x0 - 1, y, 2, x1 + 1, y + 1, 14, (x, yy, z) => shade(s(x, yy, z), 1.1));
  }
  for (let z = 2; z < 14; z++)
    for (let y = y0; y < y0 + outer + 1; y++)
      for (let x = 0; x < 60; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - y0;
        const d = Math.hypot(dx, dy);
        if (d < gap || d > outer) continue;
        const ang = Math.atan2(dy, dx);
        if (ang < 0) continue;
        const deg = (ang * 180) / Math.PI;
        const keep = deg > 66 || deg < 24 || hash3(x, y, z, seed + 3) > 0.9 - (deg < 40 ? 0.5 : 0);
        if (!keep || (deg > 24 && deg < 66 && hash3(x, y, z, seed + 9) > 0.35)) continue;
        if (z === 2 || z === 13) if (d > outer - 1.5) continue;
        let c = s(x, y, z);
        const joint = Math.floor(deg / 15) !== Math.floor((deg + 2.2) / 15);
        if (joint) c = shade(c, 0.66);
        if (d > outer - 2.2) c = shade(c, 1.1);
        M.set(x, y, z, c);
      }
  M.box(cx - 3, y0 + gap - 1, 1, cx + 3, y0 + gap + 3, 15, (x, y, z) => shade(s(x, y, z), 1.12));
  for (let i = 0; i < 5; i++) M.box(10 + i * 11 + (i % 2) * 2, 4, 5, 14 + i * 11, 6 + (i % 3), 10, (x, y, z) => s(x, y, z));
  mossify(M, seed, 0.45, 0.12);
  cracks(M, seed, 8, 10);
  vines(M, seed, 16, 6, 36, 0);
  const rng = new RNG(77);
  for (let i = 0; i < 12; i++) {
    const x = rng.int(6, 54);
    for (let y = M.sy - 1; y > 0; y--)
      if (M.has(x, y, 8) && !M.has(x, y + 1, 8)) {
        blob(M, x, y + 2, 8, rng.range(2, 3.2), 1.5, rng.range(2, 3.2), (xx, yy, zz) => J(pickC([0x2f9a46, 0x58c050, 0x1f7a3c], xx, yy, zz, seed), xx, yy, zz, seed, 0.08), seed + i, 0.5);
        break;
      }
  }
  return [bundle([[M, 0.125, cx, 0, 8]])];
}

function tikiFace(M, cx, y0, zf, w, h, seed, kind) {
  const hw = w >> 1;
  const stone = (x, y, z) => J(mix(0x7a8878, 0x9aa890, hash3(x >> 1, y >> 1, z >> 1, seed)), x, y, z, seed, 0.05);
  M.box(cx - hw, y0, zf - 12, cx + hw, y0 + h, zf, stone);
  const dark = (x, y, z) => J(0x2c342e, x, y, z, seed, 0.08);
  M.box(cx - hw - 1, y0 + h - 5, zf - 11, cx - hw, y0 + h - 1, zf - 2, stone);
  M.box(cx + hw, y0 + h - 5, zf - 11, cx + hw + 1, y0 + h - 1, zf - 2, stone);
  M.box(cx - hw, y0 + h - 6, zf, cx + hw, y0 + h - 4, zf + 2, (x, y, z) => J(0x6a8a7a, x, y, z, seed, 0.06));
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 3;
    M.box(ex - 2, y0 + h - 10, zf - 1, ex + 2, y0 + h - 6, zf, dark);
    M.box(ex - 1, y0 + h - 9, zf - 1, ex + 1, y0 + h - 7, zf + 1, 0xffb02a, true);
  }
  M.box(cx - 1, y0 + 5, zf, cx + 1, y0 + h - 10, zf + 2, (x, y, z) => shade(stone(x, y, z), 1.1));
  M.box(cx - 2, y0 + 4, zf, cx + 2, y0 + 6, zf + 2, (x, y, z) => shade(stone(x, y, z), 1.05));
  M.box(cx - hw + 2, y0 + 1, zf - 1, cx + hw - 2, y0 + 4, zf, dark);
  if (kind === 0) {
    for (let x = cx - hw + 3; x < cx + hw - 3; x += 2) M.box(x, y0 + 2, zf - 1, x + 1, y0 + 4, zf, 0xe8e4d0);
  } else {
    M.box(cx - 2, y0, zf - 1, cx + 2, y0 + 3, zf + 1, 0xd8504a);
  }
}

function idol(seed, tiers, kind) {
  const M = new VoxelModel(28, 62, 22);
  const cx = 14;
  const s = (x, y, z) => stoneC(x, y, z, seed);
  M.box(3, 0, 3, 25, 4, 19, s);
  M.box(5, 4, 5, 23, 6, 17, (x, y, z) => shade(s(x, y, z), 1.08));
  let y = 6;
  for (let t = 0; t < tiers; t++) {
    const h = t === tiers - 1 ? 16 : 14;
    tikiFace(M, cx, y, 18, 16, h, seed + t * 5, (t + kind) % 2);
    y += h;
    M.box(cx - 7, y, 6, cx + 7, y + 1, 18, (x, yy, z) => shade(s(x, yy, z), 0.85));
    y += 1;
  }
  if (kind === 0) {
    for (let i = 0; i < 5; i++) {
      const x = cx - 6 + i * 3;
      M.box(x, y, 8, x + 2, y + 3 + (i % 2 ? 3 : 0) + (i === 2 ? 3 : 0), 16, (xx, yy, z) => J(mix(0x3aa090, 0xe0584a, i / 4), xx, yy, z, seed, 0.08));
    }
  } else {
    for (const sx of [-1, 1]) {
      M.line(cx + sx * 6, y, 12, cx + sx * 11, y + 7, 12, (x, yy, z) => J(0xd8d0b0, x, yy, z, seed, 0.06), 2);
    }
    M.box(cx - 5, y, 7, cx + 5, y + 3, 17, (x, yy, z) => shade(s(x, yy, z), 0.95));
  }
  mossify(M, seed, 0.3, 0.08);
  cracks(M, seed, 3, 7);
  vines(M, seed, 3, 6, 18, 0);
  return M;
}

export function buildIdols() {
  return [bundle([[idol(1, 3, 0), 0.0625, 14, 0, 11]]), bundle([[idol(2, 2, 1), 0.0625, 14, 0, 11]])];
}

export function skullPix(u, v) {
  const inCross = (Math.abs(v - u) < 0.12 || Math.abs(v + u) < 0.12) && Math.abs(u) < 0.95 && Math.abs(v) < 0.95;
  const knob = [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].some(([kx, ky]) => Math.hypot(u - kx, v - ky) < 0.16);
  const head = ((u / 0.5) ** 2 + ((v - 0.15) / 0.5) ** 2 <= 1) || (Math.abs(u) < 0.3 && v > -0.42 && v < 0.0);
  if (head) {
    if (Math.hypot(u - 0.2, v - 0.12) < 0.13 || Math.hypot(u + 0.2, v - 0.12) < 0.13) return 2;
    if (v < 0.02 && v > -0.1 && Math.abs(u) < 0.07 + (0.02 - v) * 0.4) return 2;
    if (v < -0.22 && v > -0.4 && (Math.abs(u) < 0.02 || Math.abs(Math.abs(u) - 0.14) < 0.02)) return 2;
    return 1;
  }
  return inCross || knob ? 3 : 0;
}

export function buildAltar() {
  const seed = 6;
  const M = new VoxelModel(58, 26, 58);
  const c = 29;
  const s = (x, y, z) => stoneC(x, y, z, seed);
  const tiers = [[25, 0, 2], [22, 2, 5], [18, 5, 14], [17, 14, 15], [15, 15, 16]];
  for (const [r, y0, y1] of tiers) M.box(c - r, y0, c - r, c + r, y1, c + r, (x, y, z) => (y === y1 - 1 ? shade(s(x, y, z), 1.1) : s(x, y, z)));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      M.box(c + sx * 14 - 2, 16, c + sz * 14 - 2, c + sx * 14 + 2, 21, c + sz * 14 + 2, s);
      M.box(c + sx * 14 - 3, 21, c + sz * 14 - 3, c + sx * 14 + 3, 22, c + sz * 14 + 3, (x, y, z) => shade(s(x, y, z), 1.1));
    }
  M.box(c - 5, 0, c + 25, c + 5, 1, c + 28, (x, y, z) => shade(s(x, y, z), 1.08));
  M.box(c - 5, 1, c + 22, c + 5, 2, c + 25, (x, y, z) => shade(s(x, y, z), 1.08));
  M.box(c - 5, 2, c + 22, c + 5, 3, c + 24, (x, y, z) => shade(s(x, y, z), 1.08));
  const SW = 11;
  const SH = 9;
  for (let j = 0; j < SH; j++)
    for (let i = 0; i < SW; i++) {
      const k = skullPix(((i + 0.5) / SW) * 2 - 1, ((j + 0.5) / SH) * 2 - 1);
      if (k === 0 || k === 3) continue;
      const x = c - 5 + i;
      const y = 14 - SH + j;
      M.set(x, y, c + 18, k === 1 ? J(0xdfe2cc, x, y, 1, seed, 0.04) : 0x1e241e);
    }
  M.box(c - 6, 16, c - 6, c + 6, 17, c + 6, (x, y, z) => shade(s(x, y, z), 0.9));
  M.box(c - 2, 17, c - 2, c + 2, 18, c + 2, 0x4a4036);
  M.set(c, 18, c, 0xffb02a, true);
  mossify(M, seed, 0.4, 0.1, 0);
  cracks(M, seed, 8, 10);
  vines(M, seed, 6, 4, 12, 0);
  return [bundle([[M, 0.1, c, 0, c]])];
}

function mossRock(seed, size, vox) {
  const rng = new RNG(seed * 9 + 1);
  const g = Math.round(size / vox) + 10;
  const M = new VoxelModel(g, g, g);
  const c = g / 2;
  const rx = (size / vox) * rng.range(0.55, 0.75);
  const rz = (size / vox) * rng.range(0.5, 0.7);
  const ry = (size / vox) * rng.range(0.35, 0.5);
  blob(M, c, ry * 0.9, c, rx, ry, rz, (x, y, z) => stoneC(x, y, z, seed, 0.9), seed, 0.5);
  blob(M, c + rx * 0.5, ry * 0.6, c - rz * 0.3, rx * 0.55, ry * 0.7, rz * 0.6, (x, y, z) => stoneC(x, y, z, seed + 1, 0.9), seed + 1, 0.5);
  mossify(M, seed, 0.85, 0.3);
  for (let i = 0; i < 4; i++) {
    const x = flo(c + rng.range(-rx * 0.6, rx * 0.6));
    const z = flo(c + rng.range(-rz * 0.6, rz * 0.6));
    for (let y = g - 1; y > 0; y--)
      if (M.has(x, y, z)) {
        M.set(x, y + 1, z, J(0x58c050, x, y, z, seed, 0.1));
        if (i % 2) M.set(x + 1, y + 1, z, 0x3aa046);
        break;
      }
  }
  return M;
}

export function buildMossRocks() {
  const r = (seed, size) => bundle([[mossRock(seed, size, 0.0625), 0.0625, 0, 0, 0]]);
  return [r(1, 0.8), r(2, 1.0), r(3, 1.2), r(4, 0.75)].map((_, i) => {
    const size = [0.9, 1.1, 1.3, 0.85][i];
    const vox = 0.0625;
    const M = mossRock(i + 1, size, vox);
    return bundle([[M, vox, M.sx / 2, 0, M.sz / 2]]);
  });
}

export function buildMossBoulders() {
  return [2.4, 2.9].map((size, i) => {
    const vox = 0.125;
    const M = mossRock(10 + i, size, vox);
    vines(M, 20 + i, 4, 4, 12, 0);
    return bundle([[M, vox, M.sx / 2, 0, M.sz / 2]]);
  });
}

/* ---------------------------------- beach --------------------------------- */

const DRIFT = [0xd8d0bc, 0xc8bea6, 0xe2dccc, 0xb0a68e];

function driftwood(seed) {
  const rng = new RNG(seed * 5 + 3);
  const vox = 0.0625;
  const M = new VoxelModel(60, 28, 36);
  const col = (x, y, z) => {
    const grain = (hash3(x, y >> 1, z, seed) > 0.8 ? 0.84 : 1) * (hash3(x >> 3, y, z, seed + 2) > 0.72 ? 0.92 : 1);
    return J(shade(DRIFT[flo(hash3(x >> 2, y >> 1, z >> 1, seed) * 4)], grain), x, y, z, seed, 0.04);
  };
  const sand = (cx, cz, r) => {
    for (let z = flo(cz - r); z < cz + r; z++) for (let x = flo(cx - r); x < cx + r; x++) if (Math.hypot(x - cx, z - cz) < r * (0.7 + hash3(x, 0, z, seed) * 0.4)) M.set(x, 0, z, J(SAND[flo(hash3(x, 1, z, seed) * 4)], x, 0, z, seed, 0.04));
  };
  if (seed === 1) {
    tube(M, [6, 5, 14], [26, 6.5, 18], [52, 4.5, 14], 4, 2.6, col);
    tube(M, [24, 6, 17], [28, 12, 16], [33, 16, 12], 1.6, 1.0, col);
    tube(M, [38, 6, 16], [40, 9, 20], [44, 12, 24], 1.4, 0.9, col);
    blob(M, 6, 5, 14, 5, 5, 5, col, seed, 0.6);
    for (let i = 0; i < 4; i++) M.set(rng.int(5, 8), rng.int(1, 4), rng.int(8, 18), 0x7a6a50);
    sand(30, 16, 16);
  } else if (seed === 2) {
    blob(M, 14, 9, 18, 8, 7, 8, col, seed, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.28 + rng.range(0, 1);
      tube(M, [14, 6, 18], [14 + Math.cos(a) * 8, 3 + rng.range(0, 6), 18 + Math.sin(a) * 8], [14 + Math.cos(a) * 14, rng.range(0, 6), 18 + Math.sin(a) * 14], 2.2, 0.8, col);
    }
    tube(M, [14, 12, 18], [24, 14, 18], [44, 6, 18], 2.8, 1.8, col);
    sand(28, 18, 18);
  } else {
    tube(M, [4, 4, 10], [20, 7, 16], [34, 5, 18], 3, 2.4, col);
    tube(M, [34, 5, 18], [40, 4, 22], [50, 7, 26], 2.4, 1.6, col);
    tube(M, [22, 7, 16], [26, 14, 14], [32, 20, 10], 1.6, 0.9, col);
    tube(M, [28, 6, 17], [32, 11, 21], [36, 15, 24], 1.2, 0.7, col);
    sand(28, 18, 17);
  }
  return bundle([[M, vox, 30, 0, 18]]);
}

export function buildDriftwood() {
  return [driftwood(1), driftwood(2), driftwood(3)];
}

function sandPatch(M, cx, cz, r, seed) {
  for (let z = flo(cz - r); z < cz + r; z++)
    for (let x = flo(cx - r); x < cx + r; x++)
      if (Math.hypot(x - cx, z - cz) < r * (0.75 + hash3(x, 0, z, seed) * 0.35)) M.set(x, 0, z, J(SAND[flo(hash3(x, 1, z, seed) * 4)], x, 0, z, seed, 0.04));
}

function shellCluster(seed) {
  const rng = new RNG(seed * 7 + 1);
  const vox = 0.03125;
  const M = new VoxelModel(28, 10, 28);
  const cx = 14;
  const cz = 14;
  sandPatch(M, cx, cz, 11, seed);
  const conch = (x0, z0, a, sc) => {
    for (let k = 0; k < 14; k++) {
      const t = k / 13;
      const r = (1 - t) * 3.4 * sc + 0.4;
      const px = x0 + Math.cos(a) * (k * 0.55 * sc - 3);
      const pz = z0 + Math.sin(a) * (k * 0.55 * sc - 3);
      const stripe = k % 4 < 2;
      blob(M, px, 1 + r * 0.7, pz, r, r * 0.8, r, (x, y, z) => J(stripe ? 0xf4d6c2 : 0xe8987a, x, y, z, seed, 0.06), seed + k, 0.1);
    }
    M.set(flo(x0 - Math.cos(a) * 4.5), 2, flo(z0 - Math.sin(a) * 4.5), 0xff8aa0);
    M.set(flo(x0 - Math.cos(a) * 3.8), 2, flo(z0 - Math.sin(a) * 3.8), 0xff8aa0);
    for (let k = 0; k < 4; k++) M.set(flo(x0 + Math.cos(a) * (6 + k * 0.4)), 2 + (k > 1 ? 1 : 0), flo(z0 + Math.sin(a) * (6 + k * 0.4)), 0xe8987a);
  };
  const scallop = (x0, z0, a, sc, pink) => {
    for (let r = 1; r <= 6 * sc; r++)
      for (let t = -1; t <= 1; t += 0.12) {
        const ang = a + t * 1.05;
        const x = flo(x0 + Math.cos(ang) * r);
        const z = flo(z0 + Math.sin(ang) * r);
        const rib = Math.abs(((t + 1) * 6) % 1 - 0.5) < 0.2;
        M.set(x, 1 + (rib ? 1 : 0) + (r < 3 ? 1 : 0), z, J(pink ? (rib ? 0xffb0c4 : 0xf08aa6) : rib ? 0xfff0dc : 0xf4c88a, x, r, z, seed, 0.05));
      }
    M.box(flo(x0) - 1, 1, flo(z0) - 1, flo(x0) + 1, 2, flo(z0) + 1, 0xd8a870);
  };
  const clam = (x0, z0, a, sc) => {
    blob(M, x0, 2, z0, 4 * sc, 2.2 * sc, 3 * sc, (x, y, z) => J(flo((x + z * 0.5) / 1.5) % 2 ? 0xf6ecd8 : 0xdccaa8, x, y, z, seed, 0.05), seed, 0.1);
    blob(M, x0, 1.2, z0, 3.4 * sc, 1.2, 2.4 * sc, 0xffb0a0, seed + 3, 0.1);
  };
  if (seed === 1) {
    conch(cx - 2, cz + 1, 0.4, 1.1);
    scallop(cx + 5, cz - 5, 1.2, 1, true);
    clam(cx - 6, cz - 5, 0, 0.7);
  } else if (seed === 2) {
    scallop(cx - 2, cz, 0.3, 1.1, false);
    scallop(cx + 5, cz + 3, 2.4, 0.8, true);
    conch(cx + 2, cz - 6, 2.0, 0.8);
  } else {
    clam(cx, cz, 0, 1.1);
    clam(cx + 6, cz + 4, 1, 0.65);
    scallop(cx - 5, cz + 4, 3.6, 0.8, true);
    conch(cx - 4, cz - 6, 1.0, 0.7);
  }
  for (let i = 0; i < 6; i++) M.set(rng.int(4, 24), 1, rng.int(4, 24), J(i % 2 ? 0xfff0e0 : 0xf8b8c0, i, 1, 1, seed, 0.05));
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildShells() {
  return [shellCluster(1), shellCluster(2), shellCluster(3)];
}

function starfish(seed) {
  const rng = new RNG(seed * 3 + 2);
  const vox = 0.04;
  const M = new VoxelModel(26, 8, 26);
  const cx = 13;
  const cz = 13;
  sandPatch(M, cx, cz, 11, seed);
  const base = seed === 1 ? 0xff8a2a : 0xd8302a;
  const dot = seed === 1 ? 0xd8302a : 0xff9a3a;
  const rot = rng.range(0, 1);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + rot;
    for (let k = 1; k <= 9; k++) {
      const w = k < 3 ? 2 : k < 6 ? 1.5 : 0.8;
      const x = cx + Math.cos(a) * k;
      const z = cz + Math.sin(a) * k;
      const ay = 1 + (k < 3 ? 1 : 0);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (Math.hypot(dx, dz) > w) continue;
          const px = flo(x + dx * 0.5 + 0.5);
          const pz = flo(z + dz * 0.5 + 0.5);
          M.set(px, ay, pz, J(k % 3 === 0 && dx === 0 && dz === 0 ? dot : base, px, ay, pz, seed, 0.06));
          if (k < 5) M.set(px, ay + 1, pz, J(base, px, ay, pz, seed + 1, 0.06));
        }
    }
  }
  blob(M, cx, 2.5, cz, 2.6, 1.6, 2.6, (x, y, z) => J(dot, x, y, z, seed, 0.06), seed, 0.1);
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildStarfish() {
  return [starfish(1), starfish(2)];
}

function beachRock(seed, size) {
  const rng = new RNG(seed * 13 + 5);
  const vox = 0.0625;
  const g = Math.round(size / vox) + 10;
  const M = new VoxelModel(g, g, g);
  const c = g / 2;
  const rx = (size / vox) * 0.5;
  const ry = (size / vox) * rng.range(0.28, 0.4);
  const rz = (size / vox) * rng.range(0.38, 0.48);
  blob(M, c, ry * 0.8, c, rx, ry, rz, (x, y, z, d) => {
    const wet = y < ry * 0.75;
    let col = mix(0x353b44, 0x58626c, hash3(x >> 1, y >> 1, z >> 1, seed));
    if (wet) col = shade(col, 1.15);
    return J(col, x, y, z, seed, 0.06);
  }, seed, 0.5);
  blob(M, c - rx * 0.6, ry * 0.5, c + rz * 0.5, rx * 0.5, ry * 0.7, rz * 0.5, (x, y, z) => J(mix(0x30363f, 0x4c5660, hash3(x >> 1, y >> 1, z >> 1, seed + 1)), x, y, z, seed, 0.06), seed + 1, 0.5);
  for (let i = 0; i < 40; i++) {
    const x = flo(c + rng.range(-rx, rx));
    const z = flo(c + rng.range(-rz, rz));
    for (let y = Math.floor(ry * 1.2); y > 0; y--)
      if (M.has(x, y, z)) {
        if (y < ry * 1.1) {
          const bc = i % 3 ? 0xe4e0d0 : 0xb8b4a4;
          M.set(x, y + 1, z, bc);
          if (i % 2) M.set(x + 1, y + 1, z, bc);
        }
        break;
      }
  }
  for (let i = 0; i < 12; i++) {
    const a = rng.range(0, 6.28);
    const x = flo(c + Math.cos(a) * rx * 0.85);
    const z = flo(c + Math.sin(a) * rz * 0.85);
    for (let k = 0; k < rng.int(2, 5); k++) M.set(x, 1 + k, z, J(0x3a7a3a, x, k, z, seed, 0.1));
  }
  return bundle([[M, vox, c, 0, c]]);
}

export function buildBeachRocks() {
  return [beachRock(1, 1.4), beachRock(2, 1.9), beachRock(3, 1.1)];
}

function crab(seed) {
  const vox = 0.03125;
  const M = new VoxelModel(24, 10, 20);
  const cx = 12;
  const cz = 10;
  const red = (x, y, z) => J(mix(0xd8281e, 0xff5a38, hash3(x, y, z, seed)), x, y, z, seed, 0.06);
  blob(M, cx, 3.2, cz, 5, 2.4, 4, red, seed, 0.15);
  blob(M, cx, 4.6, cz, 3.4, 1.2, 2.8, (x, y, z) => J(0xff6a3e, x, y, z, seed, 0.06), seed + 1, 0.1);
  for (const sz of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = cx - 3 + k * 2;
      M.set(x, 2, flo(cz + sz * 5), 0xc02218);
      M.set(x, 1, flo(cz + sz * 6), 0xc02218);
      M.set(x + (seed === 2 ? 1 : 0), 0, flo(cz + sz * 7), 0xa01a12);
    }
    const ax = cx + 5;
    for (let k = 0; k < 3; k++) M.set(ax, 3 + (seed === 1 ? k : 0), flo(cz + sz * (2 + k)), 0xe8301e);
    const up = seed === 1;
    const px = ax + (up ? 0 : 2);
    const py = up ? 7 : 4;
    M.box(px - 1, py, flo(cz + sz * 4) - 1, px + 2, py + 2, flo(cz + sz * 4) + 2, 0xf04028);
    M.box(px + 1, py, flo(cz + sz * 4) - 1, px + 3, py + 1, flo(cz + sz * 4) + 1, 0xfff0e0);
    M.set(cx + 4, 5, flo(cz + sz * 1.5), 0x181818);
    M.set(cx + 4, 6, flo(cz + sz * 1.5), 0xffffff);
  }
  return bundle([[M, vox, cx, 0, cz]]);
}

export function buildCrabs() {
  return [crab(1), crab(2)];
}

/* ------------------------------- pirate props ------------------------------ */

const woodC = (x, y, z, s, row = 0) => J(WOOD[(row + flo(hash3(x >> 3, y >> 1, z >> 3, s) * 4)) % 4], x, y, z, s, 0.06);

function wheel(M, cx, cy, cz, r, spokes, thick, wood, rim) {
  for (let t = 0; t < thick; t++) {
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      for (let rr = r - 1.4; rr <= r; rr += 0.5) M.set(flo(cx + Math.cos(ang) * rr), flo(cy + Math.sin(ang) * rr), cz + t, rim);
    }
    for (let k = 0; k < spokes; k++) {
      const ang = (k / spokes) * Math.PI * 2 + 0.2;
      for (let rr = 1.5; rr < r - 1; rr += 0.5) M.set(flo(cx + Math.cos(ang) * rr), flo(cy + Math.sin(ang) * rr), cz + t, wood);
    }
    blob(M, cx, cy, cz + t, 1.8, 1.8, 0.6, 0x4a4036, 1, 0);
  }
}

function cannon(seed) {
  const vox = 0.0625;
  const M = new VoxelModel(48, 26, 24);
  const cz = 12;
  const ship = seed === 1;
  const by = ship ? 9 : 11;
  const iron = (x, y, z) => J(mix(0x24272d, 0x3c4048, hash3(x >> 1, y, z, seed)), x, y, z, seed, 0.05);
  for (let x = 4; x < 42; x++) {
    const t = (x - 4) / 38;
    let r = lerp(3.8, 2.7, t);
    if (x > 36) r += 0.5 * Math.min(1, (x - 36) / 2);
    if (x === 14 || x === 15 || x === 27) r += 0.8;
    if (x < 6) r -= 1 - (x - 4) * 0.4;
    const R = Math.ceil(r);
    for (let y = -R; y <= R; y++)
      for (let z = -R; z <= R; z++) if (y * y + z * z <= r * r) M.set(x, by + y + (ship ? 0 : Math.floor(t * 2)), cz + z, y > r * 0.4 ? shade(iron(x, y, z), 1.5) : iron(x, y, z));
  }
  blob(M, 3, by, cz, 1.8, 1.8, 1.8, iron, seed, 0);
  M.carve(41, by - 1, cz - 1, 43, by + 1, cz + 1);
  M.box(41, by - 1, cz - 1, 42, by + 1, cz + 1, 0x0c0d10);
  if (!ship) {
    M.box(14, by + 3, cz - 1, 16, by + 4, cz + 1, 0xc9a23a);
    M.box(36, by + 3, cz - 1, 38, by + 4, cz + 1, 0xc9a23a);
  }
  for (const sz of [-1, 1]) {
    const zz = cz + sz * 5 - (sz > 0 ? 0 : 1);
    for (let x = 6; x < 30; x++) {
      const h = x < 12 ? 2 + (x - 6) : x < 24 ? 8 : 8 - (x - 24) * 0.8;
      const top = flo(by - 1 + Math.max(2, h - 4));
      M.box(x, Math.max(2, ship ? 2 : 3) , zz, x + 1, top, zz + 2, (xx, y, z) => (y === top - 1 ? 0x6a4627 : woodC(xx, y, z, seed)));
    }
    M.box(10, 6, zz, 12, 8, zz + 2, 0x3a2c1c);
    if (ship) wheel(M, 10, 4, cz + sz * 7 + (sz > 0 ? 0 : -1), 3.6, 6, 2, 0x7a5030, 0x4a3420);
    else wheel(M, 15, 8, cz + sz * 7 + (sz > 0 ? 0 : -1), 8, 8, 2, 0x8a5e35, 0x3a3a40);
  }
  if (ship) {
    M.box(8, 3, cz - 5, 9, 5, cz + 5, 0x3a2c1c);
    M.box(25, 2, cz - 5, 27, 4, cz + 5, 0x4a3420);
  } else {
    M.box(8, 7, cz - 5, 9, 9, cz + 5, 0x3a2c1c);
    M.box(0, 0, cz - 1, 8, 3, cz + 1, (x, y, z) => woodC(x, y, z, seed + 3));
    M.box(0, 3, cz - 1, 2, 4, cz + 1, 0x5a3a20);
  }
  return bundle([[M, vox, 22, 0, cz]]);
}

export function buildCannons() {
  return [cannon(1), cannon(2)];
}

function ball(M, cx, cy, cz, r, seed) {
  blob(M, cx, cy, cz, r, r, r, (x, y, z) => J(mix(0x22252b, 0x555a64, clamp((y - cy + r) / (2 * r) * (hash3(x, y, z, seed) * 0.4 + 0.6), 0, 1) ** 2), x, y, z, seed, 0.05), seed, 0);
}

export function buildCannonPile() {
  const vox = 0.0625;
  const M = new VoxelModel(20, 18, 20);
  M.box(1, 0, 1, 19, 2, 19, (x, y, z) => woodC(x, y, z, 3));
  for (const [a, b] of [[1, 3], [17, 19]]) {
    M.box(a, 2, 1, b, 4, 19, (x, y, z) => J(0x6a4627, x, y, z, 4, 0.08));
    M.box(1, 2, a, 19, 4, b, (x, y, z) => J(0x6a4627, x, y, z, 5, 0.08));
  }
  const r = 2.2;
  const step = r * 2;
  for (let l = 0; l < 3; l++) {
    const n = 3 - l;
    const off = 10 - (n * step) / 2 + r;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) ball(M, off + i * step, 4 + r + l * (r * 1.6), off + j * step, r, l * 9 + i * 3 + j);
  }
  ball(M, 10, 4 + r + 3 * r * 1.6 - 0.5, 10, r, 77);
  return [bundle([[M, vox, 10, 0, 10]])];
}

function ropeCoil(seed) {
  const vox = 0.0625;
  const M = new VoxelModel(22, 10, 22);
  const c = 11;
  const layers = seed === 1 ? 3 : 2;
  for (let l = 0; l < layers; l++) {
    const rings = [7.2 - l * 0.8, 5.4 - l * 0.8, 3.6 - l * 0.8];
    for (const rr of rings) {
      if (rr < 1.5) continue;
      for (let a = 0; a < 90; a++) {
        const ang = (a / 90) * Math.PI * 2;
        const x = flo(c + Math.cos(ang) * rr);
        const z = flo(c + Math.sin(ang) * rr);
        const tw = Math.sin(ang * 14 + rr) > 0;
        const col = seed === 1 ? (tw ? 0xd6c394 : 0xb59f6e) : tw ? 0x6a5a40 : 0x4a3e2c;
        for (let h = 0; h < 2; h++) M.set(x, l * 2 + h, z, J(col, x, h, z, seed, 0.05));
      }
    }
  }
  M.box(c - 1, 0, c - 1, c + 1, 1, c + 1, 0x8a7a54);
  for (let k = 0; k < 9; k++) M.set(c + 7 + (k > 4 ? 1 : 0) - 1, 0, c + k - 4 + 1, J(seed === 1 ? 0xd6c394 : 0x6a5a40, k, 0, 0, seed, 0.05));
  return bundle([[M, vox, c, 0, c]]);
}

export function buildRopeCoil() {
  return [ropeCoil(1), ropeCoil(2)];
}

function anchor(seed, lying) {
  const vox = 0.0625;
  const M = new VoxelModel(40, lying ? 10 : 56, lying ? 30 : 40);
  const iron = (x, y, z) => J(pickC([0x5a3a2a, 0x7a4a2a, 0x4a3a34, 0x8a5a30, 0x3a2e2a], x, y, z, seed), x, y, z, seed, 0.06);
  const P = (u, v, w) => (lying ? [u + 20, w + 1, v + 8] : [u + 20, v, w + 20]);
  const dot = (u, v, w, col = iron) => {
    const [x, y, z] = P(u, v, w);
    M.set(x, y, z, col(x, y, z));
  };
  const fat = (u, v, th, depth) => {
    for (let du = 0; du < th; du++) for (let dw = 0; dw < depth; dw++) dot(u + du - (th >> 1), v, dw - (depth >> 1));
  };
  const L = lying ? 36 : 44;
  for (let v = 8; v < L; v++) fat(0, v, 3, 3);
  for (let u = -9; u <= 9; u++) for (let dv = 0; dv < 2; dv++) for (let dw = 0; dw < 2; dw++) dot(u, L - 7 + dv, dw - 1, (x, y, z) => J(0x6a4a30, x, y, z, seed, 0.08));
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    fat(Math.round(Math.cos(ang) * 3), L + 2 + Math.round(Math.sin(ang) * 3), 2, 2);
  }
  fat(0, L, 3, 3);
  for (let t = -1; t <= 1; t += 0.03) {
    const ang = t * 1.9;
    const u = Math.sin(ang) * 15;
    const v = 15 - Math.cos(ang) * 11 + 3;
    fat(Math.round(u), Math.round(v), 3, 3);
    fat(Math.round(u), Math.round(v) + 1, 3, 3);
  }
  for (const sd of [-1, 1]) {
    const tu = Math.sin(1.9) * 15 * sd;
    const tv = 15 - Math.cos(1.9) * 11 + 3;
    for (let k = 0; k < 6; k++) for (let w = -2; w <= 2; w++) {
      const half = Math.max(0, 3 - k * 0.5);
      if (Math.abs(w) <= Math.min(2, half)) {
        dot(Math.round(tu - sd * k * 0.8), Math.round(tv + k * 0.8), w);
        dot(Math.round(tu - sd * k * 0.8), Math.round(tv + k * 0.8) + 1, w);
      }
    }
  }
  blob(M, lying ? 20 : 20, lying ? 3 : 8, lying ? 8 : 20, 3, 3, 3, iron, seed, 0.1);
  return M;
}

export function buildAnchors() {
  const vox = 0.0625;
  const lay = anchor(2, true);
  const up = anchor(1, false);
  for (let i = 0; i < 22; i++) {
    const ang = i * 0.7;
    up.set(flo(20 + Math.cos(ang) * 3.5), 41 + (i % 2), flo(20 + Math.sin(ang) * 3.5), J(0xd6c394, i, 0, 0, 3, 0.06));
  }
  up.box(30, 0, 18, 34, 54, 22, (x, y, z) => J(pickC(WOOD_DARK, x, y >> 2, z, 7), x, y, z, 7, 0.08));
  up.box(29, 52, 17, 35, 54, 23, 0x4a3420);
  for (let y = 30; y < 46; y++) {
    const t = (y - 30) / 16;
    up.set(flo(lerp(24, 30, t)), y, 20, J(0xd6c394, y, 0, 0, 3, 0.06));
    up.set(flo(lerp(24, 30, t)) + 1, y, 21, J(0xb59f6e, y, 0, 0, 3, 0.06));
  }
  const rope = [];
  for (let k = 0; k < 16; k++) lay.set(flo(26 + k * 0.5 + Math.sin(k) * 1), 0 + (k % 3 === 0 ? 1 : 0), flo(26 + Math.cos(k * 0.6) * 4), J(0xc4ae7a, k, 0, 0, 5, 0.06));
  void rope;
  return [bundle([[up, vox, 20, 0, 20]]), bundle([[lay, vox, 20, 0, 14]])];
}

export function buildNetRack() {
  const vox = 0.0625;
  const M = new VoxelModel(76, 56, 14);
  const wood = (x, y, z) => J(pickC([0x7a5638, 0x6a4a30, 0x8a6240], x >> 1, y >> 2, z, 4), x, y, z, 4, 0.08);
  for (const px of [4, 70]) {
    M.box(px, 0, 4, px + 3, 52, 7, wood);
    M.line(px + 1, 1, 2, px + 1, 16, 5, wood, 2);
    M.line(px + 1, 1, 10, px + 1, 16, 6, wood, 2);
    M.box(px - 1, 0, 3, px + 4, 2, 8, 0x5a3e28);
  }
  M.box(2, 46, 5, 74, 49, 8, wood);
  M.box(2, 28, 5, 74, 30, 7, (x, y, z) => J(0x6a4a30, x, y, z, 5, 0.08));
  for (let x = 6; x < 70; x += 3) {
    M.set(x, 47, 8, 0xd6c394);
    M.set(x + 1, 46, 8, 0xb59f6e);
  }
  const nets = [[7, 36, 46, 5, 0xc9b27c], [38, 69, 46, 4, 0xbfa870], [14, 60, 28, 7, 0x9a8a5a]];
  nets.forEach(([x0, x1, yt, z, col], k) => {
    for (let x = x0; x <= x1; x++) {
      const bottom = yt - 14 - flo(Math.sin(x * 0.35 + k) * 4 + hash3(x, 0, k, 6) * 6) - (k === 2 ? 0 : flo(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 6));
      for (let y = Math.max(2, bottom); y < yt; y++) {
        const mesh = (x + y) % 4 === 0 || (x - y + 400) % 4 === 0;
        if (!mesh) continue;
        if (hash3(x, y, k, 8) > 0.96) continue;
        M.set(x, y, z, J(col, x, y, z, 9, 0.07));
      }
    }
  });
  for (const [fx, fy, z] of [[10, 42, 8], [24, 36, 8], [41, 38, 8], [58, 40, 8], [66, 33, 8], [20, 24, 6], [48, 22, 6]]) {
    const red = (fx + fy) % 2 === 0;
    blob(M, fx, fy, z, 1.8, 1.8, 1.8, red ? 0xd8302a : 0xf0e8d0, 5, 0);
  }
  const fish = [[16, 26, 0x9ab8c8], [30, 26, 0xb0c8d8], [52, 26, 0x88a8c0], [62, 26, 0xa0c0d0]];
  fish.forEach(([x, y, col], k) => {
    M.line(x, y, 6, x, y - 3, 6, 0xd6c394, 1);
    for (let i = 0; i < 9; i++) {
      const w = i < 2 ? 2 : i < 7 ? 3 : 2;
      for (let dz = 0; dz < w; dz++) M.set(x + (dz - 1) * 0, y - 4 - i, 6 + dz - (w >> 1), i % 3 === 0 ? 0x5a7a98 : dz === 0 ? 0xe4eef2 : col);
    }
    M.set(x, y - 5, 7, 0x181818);
    M.box(x - 1, y - 14, 6, x + 2, y - 12, 7, 0x7a98b0);
  });
  return [bundle([[M, vox, 38, 0, 6]])];
}

function rowboat(seed, flip) {
  const vox = 0.0625;
  const L = 64;
  const D = 12;
  const M = new VoxelModel(72, 40, 34);
  const cz = 17;
  const x0 = 4;
  const hullHalf = (x, y) => {
    const u = ((x - x0) / L) * 2 - 1;
    let W = u > 0 ? Math.max(0, 1 - u ** 2.4) ** 0.6 : 1 - 0.2 * u * u;
    W *= 10.5;
    return W * (0.45 + 0.55 * (y / (D - 1)));
  };
  const planks = [0x8a5a32, 0x9a6a3e];
  const paint = seed === 2 ? [0x2a6aa8, 0x3a82c4] : planks;
  const inner = (x, y, z) => J(0xb08a58, x, y, z, seed, 0.06);
  const oy = flip ? 4 : 3;
  for (let x = x0; x < x0 + L; x++)
    for (let y = 0; y < D; y++) {
      const hw = hullHalf(x, y);
      if (hw < 0.6) continue;
      const bow = ((x - x0) / L) * 2 - 1;
      const rise = bow > 0 ? flo(bow ** 3 * 5) : 0;
      const rise2 = bow < 0 ? flo(bow * bow * 1.5) : 0;
      const yy = (flip ? D - 1 - y : y) + oy + (flip ? -rise : rise);
      for (let z = -flo(hw + 0.5); z <= flo(hw + 0.5); z++) {
        const edge = Math.abs(z) > hw - 1.5;
        const hollow = !edge && y >= 1 && hw > 2;
        if (hollow && y > 0 && !flip) {
          if (y === 1) M.set(x, yy, cz + z, inner(x, y, z));
          continue;
        }
        if (hollow && flip) {
          if (y === 1) M.set(x, yy, cz + z, inner(x, y, z));
          continue;
        }
        let c = J(paint[y % 2], x, y, z + Math.floor(x / 5), seed, 0.06);
        if (y >= D - 2) c = seed === 2 ? 0xf0ece0 : 0xb88a58;
        if (!flip && y === 0) c = shade(c, 0.8);
        M.set(x, yy, cz + z, c);
      }
      void rise2;
    }
  if (!flip) {
    for (const tx of [18, 34, 50]) M.box(tx, oy + 7, cz - flo(hullHalf(tx, 7)), tx + 3, oy + 8, cz + flo(hullHalf(tx, 7)) + 1, (x, y, z) => J(0xb08a58, x, y, z, 3, 0.06));
    M.box(x0 + 3, oy + 3, cz - 2, x0 + 8, oy + 5, cz + 3, 0x5a3e28);
    for (const sd of [-1, 1]) {
      const z = cz + sd * 7;
      M.line(10, oy + 9, z, 54, oy + 12, z + sd * 3, 0x9a6c3f, 1);
      M.box(54, oy + 11, z + sd * 3 - 1, 62, oy + 13, z + sd * 3 + 1, 0xb88a58);
      M.line(6, oy + 8, z + sd * 0, 18, oy + 9, z, 0x6a4a2c, 2);
    }
  } else {
    for (const sd of [-1, 1]) {
      M.line(12, 1, cz + sd * 14, 52, 1, cz + sd * 15, 0x9a6c3f, 2);
      M.box(52, 1, cz + sd * 15 - 2, 62, 2, cz + sd * 15 + 2, 0xb88a58);
    }
    M.box(x0 + 2, oy + D, cz - 1, x0 + L - 4, oy + D + 2, cz + 1, (x, y, z) => J(0x4a3420, x, y, z, 4, 0.08));
  }
  if (!flip) {
    M.box(x0 - 1, oy + 9, cz - 1, x0 + 2, oy + 11, cz + 2, 0x4a4036);
    for (let k = 0; k < 14; k++) M.set(x0 + 4 + k, oy + 1, cz + 2 + Math.round(Math.sin(k * 0.5) * 2), J(0xd6c394, k, 0, 0, 3, 0.06));
  }
  return bundle([[M, vox, 36, 0, cz]]);
}

export function buildRowboats() {
  return [rowboat(1, false), rowboat(2, true)];
}

export function buildTikiTorch() {
  const vox = 0.0625;
  const M = new VoxelModel(14, 46, 14);
  const c = 7;
  for (let y = 0; y < 31; y++) {
    const node = y % 8 === 0;
    cyl(M, c, c, y, y + 1, node ? 2.4 : 1.8, (x, yy, z) => J(node ? 0x8a7a30 : mix(0xd0b040, 0xa8a038, hash3(x, yy >> 2, z, 4)), x, yy, z, 4, 0.06));
  }
  for (let y = 4; y < 8; y++) cyl(M, c, c, y, y + 1, 2.6, J(0xd6c394, 0, y, 0, 5, 0.1));
  for (let y = 28; y < 31; y++) cyl(M, c, c, y, y + 1, 2.7, (x, yy, z) => J(0xb59f6e, x, yy, z, 6, 0.1));
  for (let y = 31; y < 35; y++) cyl(M, c, c, y, y + 1, 3 + (y - 31) * 0.7, (x, yy, z) => J(mix(0x6a4a2a, 0x8a6a3a, hash3(x, yy, z, 3)), x, yy, z, 3, 0.08));
  cyl(M, c, c, 35, 36, 3.6, 0x2a2018);
  cyl(M, c, c, 36, 37, 2.8, 0x4a3a28);
  M.box(c - 1, 36, c - 1, c + 1, 38, c + 1, 0xff8a1a, true);
  M.box(c - 1, 38, c - 1, c + 1, 41, c + 1, (x, y, z) => (y > 39 ? 0xffd44a : 0xffa022), true);
  M.box(c - 2, 36, c, c - 1, 38, c + 1, 0xff6a14, true);
  M.box(c + 1, 36, c - 1, c + 2, 38, c, 0xff6a14, true);
  M.set(c, 41, c, 0xfff2b0, true);
  M.set(c, 42, c, 0xffd44a, true);
  return [bundle([[M, vox, c, 0, c]])];
}

function lantern(M, cx, y0, cz, seed, hanging) {
  const brass = (x, y, z) => J(pickC([0xc9a23a, 0xb08a2a, 0xdcb848], x, y, z, seed), x, y, z, seed, 0.05);
  M.box(cx - 3, y0, cz - 3, cx + 3, y0 + 1, cz + 3, brass);
  M.box(cx - 2, y0 + 1, cz - 2, cx + 2, y0 + 8, cz + 2, 0xffc860, true);
  M.box(cx - 1, y0 + 2, cz - 1, cx + 1, y0 + 6, cz + 1, 0xfff0b0, true);
  for (const dx of [-3, 2]) for (const dz of [-3, 2]) M.box(cx + dx, y0 + 1, cz + dz, cx + dx + 1, y0 + 8, cz + dz + 1, brass);
  M.box(cx - 3, y0 + 8, cz - 3, cx + 3, y0 + 9, cz + 3, brass);
  M.box(cx - 2, y0 + 9, cz - 2, cx + 2, y0 + 10, cz + 2, brass);
  M.box(cx - 1, y0 + 10, cz - 1, cx + 1, y0 + 11, cz + 1, brass);
  if (hanging) for (let k = 0; k < 3; k++) M.set(cx, y0 + 11 + k, cz, IRON[0]);
}

export function buildLanternPost() {
  const vox = 0.0625;
  const out = [];
  for (let v = 0; v < 2; v++) {
    const M = new VoxelModel(30, 54, 14);
    const px = 8;
    const cz = 7;
    M.box(px - 3, 0, cz - 3, px + 3, 2, cz + 3, (x, y, z) => J(0x5a3e28, x, y, z, v, 0.08));
    M.box(px - 2, 2, cz - 2, px + 2, 48, cz + 2, (x, y, z) => J(pickC(WOOD_DARK, x >> 1, y >> 3, z >> 1, v + 2), x, y, z, v + 2, 0.08));
    for (let y = 6; y < 14; y += 3) M.box(px - 2, y, cz - 2, px + 2, y + 1, cz + 2, (x, yy, z) => J(0xd6c394, x, yy, z, 3, 0.06));
    M.box(px - 3, 47, cz - 3, px + 3, 49, cz + 3, 0x4a3420);
    if (v === 0) {
      M.box(px, 45, cz - 1, px + 16, 47, cz + 1, (x, y, z) => J(0x6a4a2c, x, y, z, 5, 0.08));
      M.line(px + 1, 38, cz, px + 11, 45, cz, 0x6a4a2c, 2);
      M.line(px + 14, 45, cz, px + 14, 44, cz, IRON[0], 1);
      lantern(M, px + 14, 33, cz, 4, true);
      M.box(px + 13, 44, cz, px + 14, 46, cz + 1, IRON[0]);
    } else {
      M.line(px, 46, cz, px + 12, 50, cz, 0x6a4a2c, 2);
      M.line(px + 12, 50, cz, px + 15, 44, cz, 0x3a3d44, 1);
      M.line(px + 15, 44, cz, px + 15, 43, cz, 0x3a3d44, 1);
      lantern(M, px + 15, 32, cz, 6, true);
      for (let k = 0; k < 5; k++) M.set(px - 3, 20 + k, cz + (k % 2), 0xd6c394);
    }
    out.push(bundle([[M, vox, px, 0, cz]]));
  }
  return out;
}

function flagPoleModel(seed) {
  const vox = 0.0625;
  const M = new VoxelModel(76, 122, 22);
  const px = 6;
  const cz = 11;
  M.box(px - 4, 0, cz - 4, px + 4, 3, cz + 4, (x, y, z) => stoneC(x, y, z, 9));
  M.box(px - 3, 3, cz - 3, px + 3, 5, cz + 3, (x, y, z) => stoneC(x, y, z, 10));
  for (let y = 3; y < 114; y++) {
    const r = y < 60 ? 2.4 : y < 100 ? 2 : 1.6;
    cyl(M, px, cz, y, y + 1, r, (x, yy, z) => J(mix(0x6a4a2c, 0x8a6238, hash3(x, yy >> 2, z, 2)), x, yy, z, 2, 0.07));
  }
  for (let y = 12; y < 20; y++) cyl(M, px, cz, y, y + 1, 2.8, J(0xd6c394, 0, y, 0, 3, 0.08));
  for (let y = 60; y < 63; y++) cyl(M, px, cz, y, y + 1, 2.8, J(0xb59f6e, 0, y, 0, 3, 0.08));
  blob(M, px, 116, cz, 2.6, 2.6, 2.6, (x, y, z) => J(0xdcb040, x, y, z, 4, 0.06), 4, 0);
  M.box(px - 1, 112, cz - 1, px + 1, 114, cz + 1, 0xdcb040);
  const black = seed === 1;
  const W = 48;
  const H = 30;
  const y0 = 108;
  const fabric = (x, y, z) => J(black ? mix(0x14141a, 0x24242e, hash3(x, y, z, 2)) : mix(0xb81c24, 0xd8302c, hash3(x, y, z, 2)), x, y, z, 5, 0.04);
  for (let i = 0; i < W; i++) {
    const tail = i / W;
    const hgt = H - (tail > 0.7 ? flo((tail - 0.7) * 20) : 0);
    const waveZ = Math.sin(i * 0.28 + 0.4) * (1.5 + i * 0.07);
    const waveY = Math.sin(i * 0.28 + 1.6) * 1.2 - i * 0.06;
    for (let j = 0; j < H; j++) {
      const fly = j < H - hgt + (i > W - 6 ? hash3(i, j, 0, seed) * 3 : 0);
      if (i > W - 12 && j < (H - hgt) + flo(hash3(i, 1, 2, seed) * (i - (W - 12)) * 0.4 * (j % 2 ? 1 : 0.4))) continue;
      void fly;
      const x = px + 2 + i;
      const y = flo(y0 - j + waveY);
      const z = cz + flo(waveZ);
      let c = fabric(x, y, z);
      if (black) {
        const u = ((i - 24) / 14);
        const v = ((H - 1 - j - 15) / 14);
        const k = skullPix(u, v);
        if (k === 1 || k === 3) c = J(0xf2f0e4, x, y, z, 3, 0.04);
        else if (k === 2) c = 0x0e0e12;
        if (i < 2 || j < 1 || j > H - 2) c = shade(c, 1);
      } else {
        const stripe = j > 11 && j < 15;
        if (stripe) c = J(0x14141a, x, y, z, 3, 0.04);
        const sx = i - 24;
        const sy = H - 1 - j - 15;
        if (Math.hypot(sx, sy) < 7 && Math.hypot(sx, sy) > 4.5) c = J(0xf0d060, x, y, z, 3, 0.05);
      }
      M.set(x, y, z, c);
      M.set(x, y, z + 1, c);
    }
  }
  for (let k = 0; k < 4; k++) {
    M.set(px + 2, 108 - k * 8, cz + 1, 0xd6c394);
    M.set(px + 2, 108 - k * 8 - 1, cz + 2, 0xd6c394);
  }
  return bundle([[M, vox, px, 0, cz]]);
}

export function buildPirateFlags() {
  return [flagPoleModel(1), flagPoleModel(2)];
}

function crate(M, x0, y0, z0, w, h, d, seed) {
  M.box(x0, y0, z0, x0 + w, y0 + h, z0 + d, (x, y, z) => {
    const ex = x < x0 + 2 || x >= x0 + w - 2;
    const ey = y < y0 + 2 || y >= y0 + h - 2;
    const ez = z < z0 + 2 || z >= z0 + d - 2;
    if (ex + ey + ez >= 2) return J(0x6a4527, x, y, z, seed, 0.08);
    return J(((y - y0) >> 2) % 2 ? 0x9a6b3d : 0xa87848, x, y, z, seed, 0.07);
  });
  for (let i = 2; i < Math.min(w, h) - 2; i++) {
    M.set(x0 + i, y0 + i, z0 + d, 0x6a4527);
    M.set(x0 + i, y0 + i, z0 - 1 < 0 ? 0 : z0, 0x6a4527);
  }
}

function barrelAt(M, cx, y0, cz, seed, h = 14) {
  const rad = [4.2, 5, 5.6, 5.9, 6, 6, 6, 6, 6, 5.9, 5.6, 5, 4.2].slice(0, 13);
  const scale = h / 13;
  for (let i = 0; i < h; i++) {
    const r = rad[Math.min(12, flo(i / scale))] * 0.88;
    cyl(M, cx, cz, y0 + i, y0 + i + 1, r, (x, y, z) => {
      const band = i === 2 || i === 3 || i === h - 4 || i === h - 3;
      if (band) return J(0x3a3d44, x, y, z, seed, 0.08);
      const staves = flo((Math.atan2(z + 0.5 - cz, x + 0.5 - cx) + Math.PI) * 3.2) % 2 === 0;
      return J(staves ? 0x8a5a30 : 0x764a28, x, y, z, seed, 0.07);
    });
  }
  cyl(M, cx, cz, y0 + h, y0 + h + 1, 4.8, (x, y, z) => J(0x9a6b3d, x, y, z, seed, 0.06));
}

function sack(M, cx, y0, cz, r, seed) {
  blob(M, cx, y0 + r * 0.75, cz, r, r * 0.8, r * 0.85, (x, y, z) => J(mix(0xc8aa72, 0xdcc088, hash3(x >> 1, y >> 1, z >> 1, seed)), x, y, z, seed, 0.07), seed, 0.2);
  M.box(flo(cx) - 1, flo(y0 + r * 1.5), flo(cz) - 1, flo(cx) + 1, flo(y0 + r * 1.5) + 2, flo(cz) + 1, 0xb8985c);
  M.set(flo(cx), flo(y0 + r * 1.5) + 1, flo(cz), 0x7a5a38);
}

function cargoStack(seed) {
  const vox = 0.0625;
  const M = new VoxelModel(54, 52, 54);
  const tarp = seed === 2;
  crate(M, 4, 0, 6, 18, 16, 16, seed);
  crate(M, 24, 0, 8, 16, 14, 16, seed + 1);
  crate(M, 8, 16, 8, 14, 12, 14, seed + 2);
  barrelAt(M, 36, 0, 36, seed, 18);
  barrelAt(M, 14, 0, 38, seed + 1, 16);
  barrelAt(M, 36, 0, 36 - 0, seed, 18);
  if (!tarp) {
    barrelAt(M, 22, 22, 15, seed + 2, 12);
    sack(M, 28, 0, 28, 6, seed);
    sack(M, 44, 0, 22, 5.5, seed + 1);
    sack(M, 42, 0, 44, 5.5, seed + 2);
    sack(M, 22, 0, 46, 5, seed + 3);
    sack(M, 31, 12, 32, 5, seed + 4);
    crate(M, 44, 0, 30, 8, 8, 8, seed + 5);
  } else {
    barrelAt(M, 44, 0, 20, seed + 2, 16);
    sack(M, 24, 0, 30, 6, seed + 3);
    const hf = (x, z) => {
      let h = 0;
      for (let y = M.sy - 1; y >= 0; y--) if (M.has(x, y, z)) { h = y + 1; break; }
      return h;
    };
    const H = new Float32Array(54 * 54);
    for (let z = 0; z < 54; z++) for (let x = 0; x < 54; x++) H[z * 54 + x] = hf(x, z);
    const blur = (src) => {
      const out = new Float32Array(src.length);
      for (let z = 1; z < 53; z++)
        for (let x = 1; x < 53; x++) {
          let mx = 0;
          for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) mx = Math.max(mx, src[(z + dz) * 54 + x + dx] - (dx || dz ? 1.1 : 0));
          out[z * 54 + x] = mx;
        }
      return out;
    };
    let T = blur(blur(H));
    T = blur(T);
    for (let z = 2; z < 52; z++)
      for (let x = 2; x < 52; x++) {
        const top = T[z * 54 + x];
        if (top <= 1 || x > 40 && z < 26 && false) continue;
        const y = flo(top);
        if (H[z * 54 + x] >= top - 0.5) {
          if (H[z * 54 + x] > 0 && !M.has(x, y, z)) {
            const fold = Math.sin(x * 0.6 + z * 0.4) > 0.3;
            M.set(x, y, z, J(fold ? 0xc8bf9c : 0xdcd4b4, x, y, z, 3, 0.04));
          }
        } else {
          const fold = Math.sin(x * 0.6 + z * 0.4) > 0.3;
          M.set(x, y, z, J(fold ? 0xc8bf9c : 0xdcd4b4, x, y, z, 3, 0.04));
          if (y > 1 && !M.has(x, y - 1, z)) M.set(x, y - 1, z, J(0xb8ae8c, x, y, z, 4, 0.04));
        }
      }
    for (let x = 4; x < 50; x++) {
      const top = flo(T[20 * 54 + x]);
      if (top > 2 && !(M.get(x, top, 20) & 0)) M.set(x, top + 1, 20, J(0x8a6a3c, x, top, 0, 5, 0.08));
    }
  }
  return bundle([[M, vox, 27, 0, 27]]);
}

export function buildCargoStack() {
  return [cargoStack(1), cargoStack(2)];
}

export function buildPlankPile() {
  const vox = 0.0625;
  const M = new VoxelModel(48, 22, 22);
  const rng = new RNG(31);
  for (const zz of [3, 20 - 5, 11]) M.box(zz === 3 ? 6 : 8, 0, zz, zz === 3 ? 8 : 10, 2, zz + 2, 0x4a3420);
  for (let l = 0; l < 7; l++) {
    const y = 2 + l * 2;
    for (let k = 0; k < 3; k++) {
      const len = rng.int(38, 44);
      const off = rng.int(0, 44 - len);
      const z0 = 3 + k * 5 + (l % 2);
      const tone = pickC(WOOD, k, l, 1, 8);
      M.box(2 + off, y, z0, 2 + off + len, y + 2, z0 + 5, (x, yy, z) => (x < 3 + off || x >= off + len ? shade(J(0xd8b27a, x, yy, z, 2, 0.06), 0.95) : yy === y + 1 && z === z0 ? shade(tone, 1.15) : J(tone, x, yy, z + l, 9, 0.07)));
    }
    if (l % 2 === 1 && l < 6) for (const sx of [8, 22, 36]) M.box(sx, y + 2, 4, sx + 2, y + 3, 19, 0x5a3e28);
  }
  for (let i = 0; i < 5; i++) M.box(5 + i * 8, 16, 6 + (i % 3) * 4, 6 + i * 8, 17, 7 + (i % 3) * 4, 0xe0c090);
  M.line(36, 16, 14, 44, 20, 20, 0x8a6238, 2);
  for (let i = 0; i < 4; i++) {
    const x = 4 + (i * 11) % 40;
    M.set(x, 16 + (i % 2), 5 + i * 3, 0x2a2420);
  }
  return [bundle([[M, vox, 24, 0, 11]])];
}

export function buildTreasureChest() {
  const vox = 0.05;
  const M = new VoxelModel(40, 40, 34);
  const cx = 20;
  const zb = 10;
  const wood = (x, y, z) => J(pickC([0x7a4a28, 0x8a5a32, 0x6a3e22], x >> 1, y >> 1, z >> 1, 5), x, y, z, 5, 0.07);
  const W = 15;
  M.box(cx - W, 0, zb, cx + W, 12, zb + 20, (x, y, z) => {
    const band = Math.abs(x - (cx - 9)) < 1.6 || Math.abs(x - (cx + 8)) < 1.6;
    if (band || y < 2 || y > 10) return J(0x2c2f36, x, y, z, 5, 0.1);
    return wood(x, y, z);
  });
  M.carve(cx - W + 2, 4, zb + 2, cx + W - 2, 12, zb + 18);
  blob(M, cx, 8, zb + 10, 12, 4, 7, (x, y, z) => J(pickC([0xf0c030, 0xffd84a, 0xd8a420], x, y, z, 3), x, y, z, 3, 0.1), 3, 0.5);
  for (let i = 0; i < 40; i++) {
    const x = flo(cx + hash3(i, 0, 1, 9) * 20 - 10);
    const z = flo(zb + 3 + hash3(i, 1, 1, 9) * 14);
    let y = 14;
    while (y > 4 && !M.has(x, y, z)) y--;
    if (i % 3 === 0) M.set(x, y + 1, z, [0xe83a3a, 0x3a7ae8, 0x3ad87a, 0xb04ae8][i % 4], false);
    if (i % 4 === 0) M.set(x, y, z, 0xfff6b0, true);
  }
  for (let i = 0; i < 5; i++) M.set(cx - 10 + i * 5, 12, zb + 10 + (i % 2) * 3, 0xfffbc8, true);
  const th = 1.78;
  for (let v = 0; v < 21; v++) {
    for (let t = 0; t < 3; t++) {
      for (let x = cx - W; x < cx + W; x++) {
        const y = flo(12 + (v + t * 0.5) * Math.sin(th) * 0.0 + v * 0.0);
        void y;
        const ang = th;
        const px = x;
        const py = 12 + v * Math.sin(ang) * 0.98 + t * Math.cos(ang) * -0.4;
        const pz = zb + 1 - v * Math.cos(ang) * 0.98 * -1 - t * Math.sin(ang) * 0.4;
        const band = Math.abs(x - (cx - 9)) < 1.6 || Math.abs(x - (cx + 8)) < 1.6;
        M.set(px, flo(py), flo(pz) - 0, v > 18 || band ? J(0x2c2f36, x, v, t, 6, 0.1) : wood(x, flo(py), flo(pz)));
      }
    }
  }
  const lidTop = 12 + 20;
  M.box(cx - 2, 22, zb - 4, cx + 2, 25, zb - 2, 0xc9a23a);
  M.set(cx, 24, zb - 3, 0xe8c050);
  M.box(cx - 2, 7, zb + 20, cx + 2, 10, zb + 21, 0xc9a23a);
  void lidTop;
  for (let i = 0; i < 24; i++) {
    const x = flo(cx - 12 + hash3(i, 3, 3, 4) * 24);
    const z = flo(zb + 21 + hash3(i, 4, 3, 4) * 10);
    const y = z < zb + 24 ? 3 : 0;
    M.set(x, y, z, J(i % 3 ? 0xf2c230 : 0xffd84a, x, y, z, 2, 0.08));
    M.set(x + 1, y, z, J(0xd8a420, x, y, z, 2, 0.08));
    if (i % 5 === 0) M.set(x, y + 1, z, 0xfff6b0, true);
  }
  M.box(cx - 15, 0, zb + 18, cx + 15, 3, zb + 24, (x, y, z) => (hash3(x, y, z, 1) > 0.5 ? J(0xf0c030, x, y, z, 3, 0.1) : null));
  const gx = cx + 17;
  const gz = zb + 24;
  for (let y = 0; y < 12; y++) {
    const r = y < 2 ? 3 : y < 5 ? 1 : y < 12 ? 2 + (y - 5) * 0.35 : 3;
    cyl(M, gx, gz, y, y + 1, y === 11 ? 3.6 : r, (x, yy, z) => (yy > 8 && Math.hypot(x + 0.5 - gx, z + 0.5 - gz) < 2 && yy < 11 ? 0x8a2a2a : J(0xe8c050, x, yy, z, 4, 0.06)));
  }
  M.set(gx + 3, 11, gz, 0xfff6b0, true);
  M.set(gx, 6, gz + 1, 0xff4a4a, true);
  for (let i = 0; i < 9; i++) M.set(cx - 14 + i * 2, 1, zb + 25 + (i % 3), J(0xfaf4e8, i, 0, 0, 2, 0.05));
  return [bundle([[M, vox, cx, 0, zb + 10]])];
}

function skullBlob(M, cx, cy, cz, s, seed) {
  blob(M, cx, cy, cz, 4 * s, 3.6 * s, 3.8 * s, (x, y, z) => J(mix(0xe6e0cc, 0xcfc8b0, hash3(x, y, z, seed)), x, y, z, seed, 0.05), seed, 0.1);
  blob(M, cx + 0.5 * s, cy - 2.6 * s, cz, 3 * s, 1.4 * s, 2.8 * s, (x, y, z) => J(0xd8d2bc, x, y, z, seed, 0.05), seed + 1, 0.1);
  for (const sz of [-1, 1]) {
    M.box(flo(cx + 3 * s), flo(cy - 0.5 * s), flo(cz + sz * 1.9 * s - 1), flo(cx + 5 * s), flo(cy + 1.5 * s), flo(cz + sz * 1.9 * s + 1), 0x1c1812);
  }
  M.box(flo(cx + 3.5 * s), flo(cy - 2 * s), flo(cz - 0.5), flo(cx + 5 * s), flo(cy - 0.8 * s), flo(cz + 0.5), 0x2a2418);
  for (let k = -2; k <= 2; k++) M.set(flo(cx + 4.4 * s), flo(cy - 3.2 * s), flo(cz + k * s * 0.8), k % 2 ? 0x2a2418 : 0xf2eedc);
}

function skullTotem(seed) {
  const vox = 0.0625;
  const M = new VoxelModel(34, 54, 34);
  const c = 17;
  for (let y = 0; y < 38; y++) {
    const r = y > 34 ? 1.2 : 1.8;
    cyl(M, c, c, y, y + 1, r, (x, yy, z) => J(mix(0x8a8478, 0x6a645a, hash3(x, yy >> 1, z, seed)), x, yy, z, seed, 0.08));
  }
  M.box(c - 3, 0, c - 3, c + 3, 3, c + 3, (x, y, z) => J(0x5e5a50, x, y, z, seed, 0.1));
  skullBlob(M, c, 41, c, 1, seed);
  const arm = 26;
  M.box(c - 8, arm, c - 1, c + 8, arm + 2, c + 1, (x, y, z) => J(0x7a6a52, x, y, z, seed, 0.08));
  M.box(c - 1, arm - 1, c - 2, c + 1, arm + 3, c + 2, 0xd6c394);
  for (const sd of [-1, 1]) {
    const bx = c + sd * 6;
    M.line(bx, arm - 1, c, bx, arm - 9, c, 0xd6c394, 1);
    M.box(bx - 1, arm - 12, c - 1, bx + 1, arm - 7, c + 1, 0xe8e0c8);
    M.box(bx - 2, arm - 13, c - 1, bx + 2, arm - 12, c + 1, 0xe8e0c8);
    M.box(bx - 2, arm - 7, c - 1, bx + 2, arm - 6, c + 1, 0xe8e0c8);
    const rx = c + sd * 3;
    for (let k = 0; k < 12; k++) M.set(rx + (k % 4 === 1 ? 1 : 0), arm - 1 - k, c + 1, J(0xb01c20, k, 0, 0, seed, 0.1));
    for (let k = 0; k < 9; k++) M.set(rx - sd * 2 + (k % 3 === 1 ? 1 : 0), arm - 1 - k, c - 2, J(0x8a1418, k, 0, 0, seed, 0.1));
  }
  if (seed === 2) {
    skullBlob(M, c + 8, arm + 5, c, 0.7, seed + 3);
    M.box(c - 8, arm + 2, c - 1, c - 6, arm + 12, c + 1, 0xe8e0c8);
  }
  for (let k = 0; k < 7; k++) M.set(c + (k % 2), 36 - k, c - 2, J(0xb01c20, k, 0, 0, seed, 0.1));
  for (let k = 0; k < 7; k++) M.set(c - 2, 36 - k, c + (k % 3 === 1 ? 1 : 0), J(0xd8302c, k, 1, 0, seed, 0.1));
  return bundle([[M, vox, c, 0, c]]);
}

export function buildSkullTotems() {
  return [skullTotem(1), skullTotem(2)];
}

export { mossify, vines, tube, leaf, clump, cyl, pickC, lerp, flo, WOOD, WOOD_DARK, IRON, SAND, STONE, MOSS, ROPE, LEAF_PALS };

export function buildJungleModels() {
  return {
    palms: setLod('palms', buildPalms),
    palmsLean: setLod('palmsLean', buildPalmsLean),
    palmsShort: setLod('palmsShort', buildPalmsShort),
    jungleGiants: setLod('jungleGiants', buildJungleGiants),
    broadleaf: setLod('broadleaf', buildBroadleaf),
    bananas: setLod('bananas', buildBananas),
    bigLeaves: setLod('bigLeaves', buildBigLeaves),
    ferns: setLod('ferns', buildFerns),
    bamboo: setLod('bamboo', buildBamboo),
    heliconia: setLod('heliconia', buildHeliconia),
    orchids: setLod('orchids', buildOrchids),
    hibiscus: setLod('hibiscus', buildHibiscus),
    tropBush: setLod('tropBush', buildTropBush),
    mangrove: setLod('mangrove', buildMangrove),
    lotus: setLod('lotus', buildLotus),
    vineCurtain: setLod('vineCurtain', buildVineCurtain),
    ruinPillars: setLod('ruinPillars', buildRuinPillars),
    ruinArch: setLod('ruinArch', buildRuinArch),
    idols: setLod('idols', buildIdols),
    altar: setLod('altar', buildAltar),
    mossRocks: setLod('mossRocks', buildMossRocks),
    mossBoulders: setLod('mossBoulders', buildMossBoulders),
    driftwood: setLod('driftwood', buildDriftwood),
    shells: setLod('shells', buildShells),
    starfish: setLod('starfish', buildStarfish),
    beachRocks: setLod('beachRocks', buildBeachRocks),
    crabs: setLod('crabs', buildCrabs),
    cannon: setLod('cannon', buildCannons),
    cannonPile: setLod('cannonPile', buildCannonPile),
    ropeCoil: setLod('ropeCoil', buildRopeCoil),
    anchor: setLod('anchor', buildAnchors),
    netRack: setLod('netRack', buildNetRack),
    rowboat: setLod('rowboat', buildRowboats),
    tikiTorch: setLod('tikiTorch', buildTikiTorch),
    lanternPost: setLod('lanternPost', buildLanternPost),
    pirateFlag: setLod('pirateFlag', buildPirateFlags),
    cargoStack: setLod('cargoStack', buildCargoStack),
    plankPile: setLod('plankPile', buildPlankPile),
    treasureChest: setLod('treasureChest', buildTreasureChest),
    skullTotems: setLod('skullTotems', buildSkullTotems),
    ...Object.fromEntries(
      Object.entries(buildShips({ blob, cyl, leaf, mossify, vines, skullPix, bundle, setLod })).map(([k, v]) => [k, Array.isArray(v[0]) ? v : [v]])
    ),
  };
}
