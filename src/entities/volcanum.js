import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade, mix, clamp, RNG } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { vnoise } from './monsterKit.js';

/**
 * Volcanum: the dragon of the volcanic wasteland. Obsidian-black plate split
 * by liquid-lava veins, purple wing membranes, purple-blue dorsal spines,
 * orange eyes and a mouth that pours lava. Built on the same rig as the
 * Darksycle Dragon so the flight, jaw and wing beats stay as detailed.
 * Matches the volcanic dragon reference: charcoal plates, an orange Y of
 * lava on the chest, violet sails with lava finger bones, purple crystal
 * spines, orange slit eyes, and a mouth that pours fire cubes.
 */
const S = 0.05;

const C = {
  s0: 0x101014,
  s1: 0x1a1a20,
  s2: 0x282830,
  s3: 0x3c3c46,
  b0: 0x140e0c,
  b1: 0x241610,
  m0: 0x220c48,
  m1: 0x341466,
  m2: 0x4c2290,
  m3: 0x6c3cb4,
  c0: 0x4a2ad0,
  c1: 0x6a48ee,
  c2: 0x9470ff,
  c3: 0xd0c0ff,
  glow: 0xff5a12,
  glowHi: 0xffe08a,
  claw: 0xc8c4bc,
  clawHi: 0xf4f0e8,
  mouth: 0x1a0804,
  mouthGlow: 0xff6a18,
  tooth: 0xe8e4dc,
};

const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));

function meshFrom(model, ox, oy, oz, mat) {
  const g = model.build(S, ox, oy, oz);
  const grp = new THREE.Group();
  if (g.solid) {
    const m = new THREE.Mesh(g.solid, mat);
    m.castShadow = true;
    grp.add(m);
  }
  if (g.glow) grp.add(new THREE.Mesh(g.glow, new THREE.MeshBasicMaterial({ vertexColors: true })));
  return grp;
}

const plate = (x, y, z, seed = 3) => {
  const n = hash3(x >> 1, y >> 1, z >> 1, seed);
  if (hash3(x, y, z, seed + 11) > 0.972) return hash3(x, z, y, seed) > 0.45 ? C.glowHi : C.glow;
  let c = n > 0.84 ? C.s3 : n > 0.46 ? C.s2 : n > 0.12 ? C.s1 : C.s0;
  if (z % 4 === 0) c = shade(c, 0.76);
  else if (y % 3 === 0 && (x & 1) === 0) c = shade(c, 0.9);
  return J(c, x, y, z, seed, 0.035);
};

/** Turn lava-coloured surface voxels into emissive cracks. */
function ignite(M) {
  const hot = (c) => {
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    return r > 180 && g > 40 && g < 230 && b < 90 && r > g + 40;
  };
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        const v = M.get(x, y, z);
        if (!v || !hot(v & 0xffffff)) continue;
        const skin = !M.has(x + 1, y, z) || !M.has(x - 1, y, z) || !M.has(x, y + 1, z) || !M.has(x, y - 1, z) || !M.has(x, y, z + 1) || !M.has(x, y, z - 1);
        if (skin) M.set(x, y, z, v & 0xffffff, true);
      }
}
const belly = (x, y, z) => J(((z >> 1) & 1 ? C.b1 : C.b0), x, y, z, 5, 0.03);
const bellyRing = (x, y, z) => J((y & 1 ? C.b1 : C.b0), x, y, z, 6, 0.03);
const cryst = (t, x = 0, y = 0, z = 0) => J(t < 0.28 ? C.c0 : t < 0.58 ? C.c1 : t < 0.86 ? C.c2 : C.c3, x, y, z, 7, 0.03);

function blob(M, cx, cy, cz, rx, ry, rz, color, seed = 1, noise = 0.18, yFlat = -99) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        if (y < yFlat) continue;
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1 + (hash3(x, y, z, seed) - 0.5) * noise) M.set(x, y, z, typeof color === 'function' ? color(x, y, z, d, dx, dy, dz) : color);
      }
}

function stroke(M, x0, y0, z0, x1, y1, z1, thick, color, taper = 0, glow = false) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 2.2);
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    const th = Math.max(1, Math.round(thick * (1 - taper * t)));
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const z = z0 + (z1 - z0) * t;
    const bx = Math.round(x - th / 2 + 0.5);
    const by = Math.round(y - th / 2 + 0.5);
    const bz = Math.round(z - th / 2 + 0.5);
    for (let a = 0; a < th; a++)
      for (let b = 0; b < th; b++)
        for (let c = 0; c < th; c++) {
          const col = typeof color === 'function' ? color(t, bx + a, by + b, bz + c) : color;
          if (col === null || col === undefined) continue;
          const gl = typeof glow === 'function' ? glow(t) : glow;
          M.set(bx + a, by + b, bz + c, col, gl);
        }
  }
}

function frontZ(M, x, y) {
  for (let z = M.sz - 1; z >= 0; z--) if (M.has(x, y, z)) return z;
  return -1;
}
function topY(M, x, z) {
  for (let y = M.sy - 1; y >= 0; y--) if (M.has(x, y, z)) return y;
  return -1;
}

/**
 * Faceted crystal spine leaning back and up from a surface point: a diamond
 * cross-section that tapers to a glowing point, dark violet at the root and
 * pale blue-lilac at the tip, with a lit face and a shadowed face.
 */
function shard(M, x, y, z, h, lean = 0.6, wide = 2, side = 0) {
  const H = Math.round(h * 1.25);
  const R = wide * 0.95;
  for (let k = 0; k <= H; k++) {
    const t = k / H;
    const zz = z - Math.floor(k * lean);
    const xx = x + Math.floor(k * side);
    const r = R * (1 - t) ** 0.85;
    const n = Math.ceil(r);
    for (let dz = -n; dz <= n; dz++)
      for (let dx = -n; dx <= n; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > r + 0.25) continue;
        const face = dx > 0 ? 1.12 : dx < 0 ? 0.82 : 1;
        const edge = Math.abs(dx) + Math.abs(dz) > r - 0.8;
        const col = shade(cryst(Math.min(0.999, t * 0.9 + (edge ? 0.12 : 0)), xx + dx, y + k, zz + dz), face);
        M.set(xx + dx, y + k, zz + dz, col, t > 0.86);
      }
  }
}

/**
 * Lava seams: a network of glowing cracks between the obsidian plates, like
 * the reference where molten light shows at nearly every plate edge. Only
 * dark plate voxels on the surface crack; crystals, claws and membrane stay.
 */
function seams(M, seed, scale = 0.2, width = 0.06) {
  const dark = (c) => {
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    return r < 80 && g < 80 && b < 90 && Math.abs(r - b) < 40;
  };
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        const v = M.get(x, y, z);
        if (!v || !dark(v & 0xffffff)) continue;
        const skin = !M.has(x + 1, y, z) || !M.has(x - 1, y, z) || !M.has(x, y + 1, z) || !M.has(x, y - 1, z) || !M.has(x, y, z + 1) || !M.has(x, y, z - 1);
        if (!skin) continue;
        // One smooth octave: its 0.5 contour is a long, unbroken crack line.
        const rr = Math.abs(vnoise(x * scale, y * scale, z * scale, seed) - 0.5);
        if (rr < width) M.set(x, y, z, rr < width * 0.4 ? C.glowHi : C.glow, true);
      }
}

/* -------------------------------- body -------------------------------- */
const BO = { x: 14, y: 4, z: 21 };

function paintBody() {
  const B = new VoxelModel(30, 40, 58);
  const cx = 14;
  const body = (cy, ry, seed) => (x, y, z, d, dx, dy) => (dy < -0.42 ? belly(x, y, z) : plate(x, y, z, seed));
  blob(B, cx, 10, 9.5, 6.7, 5.9, 8.5, body(10, 5.8, 7), 7, 0.16);
  blob(B, cx, 10.5, 17, 7.4, 6.4, 9, body(10, 6, 8), 8, 0.16);
  blob(B, cx, 12, 26.5, 8.2, 7.4, 7.8, body(12, 7, 9), 9, 0.16);
  for (const s of [-1, 1]) {
    blob(B, cx + s * 6.6, 8.4, 10.5, 3.7, 4.9, 5.6, plate, 21, 0.2);
    blob(B, cx + s * 6.4, 14.2, 25.5, 3.4, 3.8, 4.4, plate, 22, 0.2);
    // Overlapping shoulder pauldrons give the forelimb roots a heavy,
    // armored silhouette and catch light as the shoulders roll.
    blob(B, cx + s * 8.8, 17.2, 25.4, 3.2, 3.7, 4.8, (x, y, z, d, dx, dy, dz) => {
      if (dy > 0.25 && Math.abs(dz) < 0.45 && hash3(x, y, z, 116) > 0.62) return C.glow;
      return plate(x, y, z, 116);
    }, 116, 0.12);
    stroke(B, cx + s * 8.6, 18, 28, cx + s * 10.5, 15, 23, 2, (t, x, y, z) => t > 0.72 ? C.glowHi : C.glow, 0.45, true);
    // Raised rib plates frame the molten sternum core.
    for (let r = 0; r < 3; r++) {
      const z = 14 + r * 5;
      stroke(B, cx + s * 2.2, 6 + r * 1.5, z, cx + s * 5.8, 8 + r * 1.3, z + 1, 2, (t, x, y, zz) => plate(x, y, zz, 117 + r), 0.55);
    }
  }
  for (let z = 4; z <= 30; z += 2) {
    const top = topY(B, cx, z);
    if (top < 0) continue;
    const h = z > 28 ? 5 : 7 + Math.round(Math.sin(z * 0.45));
    shard(B, cx, top, z, h, 0.55, 2);
    shard(B, cx + 1, top - 1, z, Math.max(3, h - 3), 0.55, 1);
  }
  for (const s of [-1, 1]) {
    stroke(B, cx + s * 7.4, 17, 26, cx + s * 11.5, 23, 20, 3, (t, x, y, z) => (t > 0.75 ? cryst(0.9, x, y, z) : plate(x, y, z, 31)), 0.66);
    stroke(B, cx + s * 6, 12, 34, cx + s * 9.5, 14, 30, 2, (t, x, y, z) => plate(x, y, z, 32), 0.5);
  }

  const paintFront = (x, y, col) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const fz = frontZ(B, ix, iy);
    if (fz < 0) return;
    B.set(ix, iy, fz, col, true);
    if (fz + 1 < B.sz) B.set(ix, iy, fz + 1, col, true);
  };
  // Sternum stem and two shoulder arms: the reference's orange Y, not a purple badge.
  for (let y = 6; y <= 15; y++) paintFront(cx, y, y >= 11 && y <= 13 ? C.glowHi : C.glow);
  for (let k = 1; k <= 7; k++) {
    const y = 12 + k * 0.65;
    paintFront(cx + k * 0.72, y, k < 3 ? C.glowHi : C.glow);
    paintFront(cx - k * 0.72, y, k < 3 ? C.glowHi : C.glow);
  }
  const cy0 = 10.5;
  const rng = new RNG(77);
  for (let v = 0; v < 6; v++) {
    let x = cx + rng.int(-2, 2);
    let y = Math.round(cy0) + rng.int(-3, 3);
    let dir = rng.int(0, 3);
    for (let k = 0; k < 8; k++) {
      const fz = frontZ(B, x, y);
      if (fz >= 0 && !B.get(x, y, fz + 1)) B.set(x, y, fz, k < 3 ? C.glowHi : C.glow, true);
      if (dir === 0) x += 1;
      else if (dir === 1) x -= 1;
      else if (dir === 2) y -= 1;
      else y += rng.chance(0.5) ? 1 : -1;
      if (rng.chance(0.4)) dir = rng.int(0, 3);
    }
  }
  for (const s of [-1, 1]) {
    for (let z = 13; z <= 27; z += 3) {
      const x = cx + s * 7;
      B.set(x, 9, z, C.glow, true);
    }
  }
  stroke(B, cx, 8, 14, cx, 18, 38, 2, (t) => (t > 0.62 ? C.glowHi : C.glow), 0.25, true);
  stroke(B, cx, 11, 16, cx, 22, 34, 1, () => C.glowHi, 0.35, true);
  for (const s of [-1, 1]) stroke(B, cx + s * 2, 9, 18, cx + s * 4, 16, 32, 1, () => C.glow, 0.4, true);
  // Molten chest: the reference's blazing Y, widened with a white-hot core.
  for (let y = 5; y <= 16; y++) {
    paintFront(cx - 1, y, C.glow);
    paintFront(cx + 1, y, y > 8 && y < 14 ? C.glowHi : C.glow);
    paintFront(cx, y, 0xfff2c0);
  }
  for (let k = 1; k <= 8; k++) {
    const y = 13 + k * 0.7;
    for (const sx of [-1, 1]) {
      paintFront(cx + sx * k * 0.75, y, k < 4 ? C.glowHi : C.glow);
      paintFront(cx + sx * k * 0.75, y + 1, C.glow);
    }
  }
  seams(B, 301, 0.17, 0.035);
  ignite(B);
  return B;
}

/* ------------------------------- neck -------------------------------- */
function paintNeck() {
  const N = new VoxelModel(30, 40, 58);
  const cx = 14;
  const neck = [
    [15.5, 33.2, 4.7, 4.9, 4.3, 10],
    [19.5, 36.8, 4.1, 4.3, 3.9, 11],
    [23.5, 39.8, 3.7, 3.9, 3.7, 12],
    [27, 42.6, 3.4, 3.7, 3.5, 13],
  ];
  for (const [cy, cz, rx, ry, rz, seed] of neck) {
    blob(N, cx, cy, cz, rx, ry, rz, (x, y, z, d, dx, dy, dz) => (dz > 0.4 ? bellyRing(x, y, z) : plate(x, y, z, seed)), seed, 0.14);
  }
  // Overlapping side scutes make the neck read as a flexible chain of armor,
  // rather than one smooth tube when it bends independently of the skull.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const z = 31 + i * 3;
      const y = 18 + i * 2.2;
      blob(N, cx + side * (4.0 - i * 0.16), y, z, 1.45, 2.25, 2.2, (x, yy, zz) => plate(x, yy, zz, 130 + i), 130 + i, 0.08);
      if (i % 2 === 0) stroke(N, cx + side * 4.4, y + 1, z + 1, cx + side * 4.9, y - 0.8, z - 1, 1, () => C.glow, 0.25, true);
    }
  }
  // Orange rings at each neck segment, the reference's glowing collars.
  for (const [cy, cz, rx] of neck) {
    const y = Math.round(cy);
    const z = Math.round(cz);
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      if (N.has(x, y, z)) N.set(x, y, z, (x + z) & 1 ? C.glowHi : C.glow, true);
      if (N.has(x, y, z + 1)) N.set(x, y, z + 1, C.glow, true);
    }
  }
  seams(N, 302, 0.19, 0.035);
  return N;
}

/* -------------------------------- head -------------------------------- */
const HO = { x: 15, y: 8, z: 10 };

function paintHead() {
  const H = new VoxelModel(32, 42, 44);
  const cx = 15;
  const skull = (seed) => (x, y, z, d, dx, dy) => (dy < -0.5 ? J(C.s0, x, y, z, seed, 0.03) : plate(x, y, z, seed));
  blob(H, cx, 13, 15, 7.6, 6.4, 8.4, skull(40), 40, 0.14);
  blob(H, cx, 11.4, 24, 5.6, 4.4, 6.6, skull(41), 41, 0.14, 7);
  blob(H, cx, 10.6, 30.5, 4.5, 3.6, 5, skull(42), 42, 0.12, 7);
  blob(H, cx, 10, 35.5, 3.6, 3.1, 4, skull(43), 43, 0.1, 7);
  blob(H, cx, 10.4, 38.6, 2.8, 2.7, 1.9, skull(44), 44, 0.08, 7);
  blob(H, cx, 10.1, 41.4, 2.0, 2.1, 1.5, skull(44), 144, 0.08, 8);
  for (const s of [-1, 1]) {
    blob(H, cx + s * 4.6, 17.4, 21, 3.1, 1.9, 3.4, (x, y, z) => J(C.s0, x, y, z, 45, 0.03), 45, 0.1);
    blob(H, cx + s * 2.6, 13.4, 36.2, 1.2, 1.1, 1.3, (x, y, z) => J(0x07070b, x, y, z, 46, 0.02), 46, 0);
  }

  for (const s of [-1, 1]) {
    const ex = (k) => cx + s * k - (s < 0 ? 1 : 0);
    for (let col = 0; col < 3; col++) {
      const x = ex(3 + col);
      const fz = frontZ(H, x, 15);
      if (fz < 0) continue;
      H.set(x, 15, fz, col === 1 ? C.glowHi : C.glow, true);
      H.set(x, 15, fz + 1, C.glow, true);
    }
    for (let k = 0; k < 4; k++) {
      const x = ex(2 + k);
      const fz = frontZ(H, x, 16);
      if (fz >= 0) H.set(x, 16, fz, shade(C.s0, 0.8));
    }

    stroke(H, cx + s * 7, 15, 15, cx + s * 13, 18, 5, 3, (t, x, y, z) => (t > 0.8 ? cryst(0.5, x, y, z) : t < 0.25 ? C.glow : plate(x, y, z, 47)), 0.7, (t) => t < 0.25);
    stroke(H, cx + s * 7.4, 11, 12, cx + s * 11.5, 7, 5, 2, (t, x, y, z) => plate(x, y, z, 48), 0.5);
    stroke(H, cx + s * 7.2, 9, 18, cx + s * 10.5, 5, 13, 2, (t, x, y, z) => plate(x, y, z, 49), 0.5);

    const beam = [
      [cx + s * 2.4, 16, 16],
      [cx + s * 5.2, 19, 9],
      [cx + s * 8, 21, 3],
      [cx + s * 10.2, 18, -1],
    ];
    for (let i = 0; i < beam.length - 1; i++) {
      const a = beam[i];
      const b = beam[i + 1];
      stroke(H, a[0], a[1], a[2], b[0], b[1], b[2], 3 - Math.floor(i / 2), (t, x, y, z) => cryst((i + t) / 3, x, y, z), 0.3, (t) => i === 2 && t > 0.85);
    }
    const tines = [
      [1, 0.35, 6, 3, 3.2],
      [2, 0.4, 8, 3.2, 3.6],
    ];
    for (const [seg, u, tx, tz, len] of tines) {
      const a = beam[seg];
      const b = beam[seg + 1];
      const px = a[0] + (b[0] - a[0]) * u;
      const py = a[1] + (b[1] - a[1]) * u;
      const pz = a[2] + (b[2] - a[2]) * u;
      stroke(H, px, py, pz, px + s * (tx - 6) * 0.45, py + len, pz + tz * 0.6, 2, (t, x, y, z) => cryst(0.35 + t * 0.65, x, y, z), 0.5, (t) => t > 0.85);
    }
    stroke(H, cx + s * 1.4, 16, 10, cx + s * 3.2, 20, 2, 2, (t, x, y, z) => cryst(0.3 + t * 0.6, x, y, z), 0.5, (t) => t > 0.85);
  }
  for (let z = 6; z <= 14; z += 3) {
    const top = topY(H, cx, z);
    if (top >= 0) shard(H, cx, top, z, z === 9 ? 7 : 5, 0.7, 2);
  }

  for (const s of [-1, 1]) {
    for (const z of [22, 25, 28.5, 32, 35]) {
      const x = cx + s * (z < 30 ? 4.4 : 3.2) - (s < 0 ? 1 : 0);
      const big = z === 32;
      for (let k = 0; k < (big ? 3 : 1); k++) H.set(x, 6 - k, Math.floor(z), k === (big ? 2 : 0) ? C.clawHi : shade(C.tooth, 0.85));
    }
  }
  for (let z = 17; z <= 36; z++) for (let x = cx - 3; x <= cx + 2; x++) if (H.has(x, 7, z)) H.set(x, 6, z, J(C.mouth, x, 6, z, 50, 0.03));
  // Blazing slit eyes set deep under a heavy brow.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = cx + s * (3 + k) - (s < 0 ? 1 : 0);
      for (const y of [14, 15]) {
        const fz = frontZ(H, x, y);
        if (fz < 0) continue;
        H.set(x, y, fz, k === 1 || k === 2 ? (y === 15 ? 0xfff2c0 : C.glowHi) : C.glow, true);
      }
    }
    stroke(H, cx + s * 2, 17, 22, cx + s * 7, 16.5, 17, 2, (t, x, y, z) => plate(x, y, z, 47), 0, false);
  }
  seams(H, 303, 0.2, 0.028);
  ignite(H);
  return H;
}

function paintJaw() {
  const Jw = new VoxelModel(18, 12, 30);
  const cx = 9;
  const under = (seed) => (x, y, z, d, dx, dy) => (dy < -0.2 ? belly(x, y, z) : plate(x, y, z, seed));
  blob(Jw, cx, 4, 8, 5.4, 2.6, 7.4, under(51), 51, 0.12);
  blob(Jw, cx, 3.6, 15.5, 4.3, 2.3, 5.2, under(52), 52, 0.12);
  blob(Jw, cx, 3.2, 21.5, 3.2, 2.1, 4.4, under(53), 53, 0.1);
  blob(Jw, cx, 2.8, 26, 2.3, 1.8, 2.3, under(54), 54, 0.1);
  for (let z = 5; z <= 24; z++) for (let x = cx - 3; x <= cx + 2; x++) if (Jw.has(x, 5, z) || Jw.has(x, 4, z)) Jw.set(x, 5, z, J(C.mouth, x, 5, z, 55, 0.03));
  for (let z = 7; z <= 20; z++) Jw.set(cx - 1 + (z & 1), 5, z, C.mouthGlow, true);
  for (let i = 0; i < 3; i++) {
    const z = 27 + i;
    Jw.set(cx, 5, z, i === 1 ? C.glowHi : C.glow, true);
    Jw.set(cx - 1, 4, z, C.glow, true);
    Jw.set(cx + 1, 4, z, C.mouthGlow, true);
  }
  for (const s of [-1, 1]) {
    for (const z of [9, 12.5, 16, 19.5, 23]) {
      const x = cx + s * (z < 18 ? 4 : 2.6) - (s < 0 ? 1 : 0);
      const big = z === 23;
      for (let k = 0; k < (big ? 3 : 1); k++) Jw.set(x, 6 + k, Math.floor(z), k === (big ? 2 : 0) ? C.clawHi : shade(C.tooth, 0.85));
    }
    stroke(Jw, cx + s * 5, 2, 6, cx + s * 8, 1, 1, 2, (t, x, y, z) => cryst(0.2 + t * 0.7, x, y, z), 0.6, (t) => t > 0.8);
  }
  return Jw;
}

/* -------------------------------- legs -------------------------------- */
function paintThigh(w, seed) {
  const U = new VoxelModel(w, 16, 16);
  const cx = w / 2;
  blob(U, cx, 9.4, 8, 5, 5.8, 5.6, plate, seed, 0.16);
  blob(U, cx, 13, 8, 3.6, 2.6, 4.2, plate, seed + 1, 0.16);
  blob(U, cx, 3.4, 7, 3.2, 2.6, 3.4, plate, seed + 2, 0.12);
  stroke(U, cx, 4.2, 4.5, cx, 3, 0.8, 2, (t, x, y, z) => cryst(0.2 + t * 0.7, x, y, z), 0.5);
  seams(U, seed + 300, 0.2, 0.035);
  return U;
}

function paintShin(w, seed) {
  const L = new VoxelModel(w, 20, 26);
  const cx = w / 2;
  blob(L, cx, 14.6, 7, 3.4, 5.4, 3.6, plate, seed, 0.14);
  blob(L, cx, 8.4, 9.2, 3.1, 2.6, 3.4, plate, seed + 1, 0.12);
  blob(L, cx, 3.6, 12.6, 3.8, 2.3, 5.4, plate, seed + 2, 0.12);
  for (const tx of [-3, 0, 3]) {
    const x0 = cx + tx;
    stroke(L, x0, 2.6, 14, x0 + tx * 0.3, 1.6, 19, 2, (t, x, y, z) => plate(x, y, z, seed + 3), 0.2);
    const cxx = Math.round(x0 + tx * 0.3);
    L.set(cxx, 1, 20, C.claw);
    L.set(cxx, 1, 21, C.claw);
    L.set(cxx, 0, 22, C.clawHi);
    L.set(cxx, 0, 23, C.clawHi);
    L.set(cxx, 0, 24, C.tooth);
  }
  stroke(L, cx, 5.2, 6, cx, 2.2, 3, 2, (t) => (t > 0.5 ? C.claw : plate(cx, 4, 5, seed + 4)), 0.5);
  seams(L, seed + 310, 0.22, 0.033);
  return L;
}

/* -------------------------------- wings ------------------------------- */
const WZ = 4;
const WRIST_X = 17;
const LEAD0 = 14;
const WRIST_Z = 21;

function paintWings() {
  const inner = new VoxelModel(WRIST_X + 2, 8, 40);
  const outer = new VoxelModel(34, 8, 40);
  const put = (x, y, z, c, glow = false) => {
    const zz = z + WZ;
    if (zz < 0 || zz >= 40) return;
    if (x < WRIST_X) inner.set(x, y, zz, c, glow);
    else outer.set(x - WRIST_X, y, zz, c, glow);
  };
  const has = (x, y, z) => (x < WRIST_X ? inner.has(x, y, z + WZ) : outer.has(x - WRIST_X, y, z + WZ));

  const tips = [
    [0, 4],
    [20, -2],
    [31, 3],
    [41, 12],
    [48, 28],
  ];
  const trailing = (x) => {
    for (let i = 0; i < tips.length - 1; i++) {
      const [x0, z0] = tips[i];
      const [x1, z1] = tips[i + 1];
      if (x >= x0 && x <= x1) {
        const u = (x - x0) / Math.max(1, x1 - x0);
        const len = Math.hypot(x1 - x0, z1 - z0);
        const bow = i === 0 ? 0 : Math.sin(u * Math.PI) * len * 0.2;
        return z0 + (z1 - z0) * u + bow * (i === tips.length - 2 ? 0.2 : 1);
      }
    }
    return 28;
  };
  const leading = (x) => {
    if (x <= WRIST_X) return LEAD0 + (x / WRIST_X) * (WRIST_Z - LEAD0) + Math.sin((x / WRIST_X) * Math.PI) * 1.6;
    return WRIST_Z + ((x - WRIST_X) / (48 - WRIST_X)) ** 1.35 * 7.4;
  };
  const fingers = [
    [WRIST_X, WRIST_Z, 48, 28],
    [WRIST_X, WRIST_Z, 41, 12],
    [WRIST_X, WRIST_Z, 31, 3],
    [WRIST_X, WRIST_Z, 20, -2],
  ];
  const nearBone = (x, z) => {
    let best = 99;
    for (const [x0, z0, x1, z1] of fingers) {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const t = clamp(((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz), 0, 1);
      best = Math.min(best, Math.hypot(x - (x0 + t * dx), z - (z0 + t * dz)));
    }
    best = Math.min(best, Math.hypot(x - WRIST_X, z - WRIST_Z) * 0.8);
    return best;
  };

  for (let x = 1; x <= 47; x++) {
    const zt = Math.ceil(trailing(x));
    const zl = Math.floor(leading(x)) - (x > WRIST_X ? 1 : 0);
    for (let z = zt; z <= zl; z++) {
      const dBone = nearBone(x + 0.5, z + 0.5);
      const edge = (z - zt) / Math.max(1, zl - zt);
      const patch = hash3(x >> 1, 0, z >> 1, 71);
      const fine = hash3(x, 0, z, 72);
      let t = 0.48 + clamp(dBone / 7, 0, 1) * 0.38 + (patch - 0.5) * 0.4 + (fine - 0.5) * 0.12 + (1 - edge) * 0.06;
      t = clamp(t, 0, 0.999);
      if (dBone < 0.9) {
        put(x, 2, z, dBone < 0.4 ? C.glowHi : C.glow, true);
        continue;
      }
      // The trailing edge smoulders in segments, as in the reference.
      if (z === zt && x > 3 && Math.floor(x / 3) % 3 !== 0) {
        put(x, 2, z, (x & 1) ? C.glowHi : C.glow, true);
        continue;
      }
      // Heat bleeds into the membrane right beside each bone.
      if (dBone < 1.7 && hash3(x, 1, z, 79) < 0.5) {
        put(x, 2, z, J(0x7a2a40, x, 0, z, 78, 0.04));
        continue;
      }
      const col = [C.m0, C.m1, C.m2, C.m3][Math.floor(t * 4)];
      put(x, 2, z, J(col, x, 0, z, 73, 0.03));
    }
  }
  const bone = (t, x, y, z) => {
    if (t < 0.12 || hash3(x, y, z, 75) > 0.93) return { c: hash3(x, z, y, 75) > 0.5 ? C.glowHi : C.glow, g: true };
    if (t > 0.85) return { c: J(C.s3, x, y, z, 74), g: false };
    return { c: plate(x, y, z, 75), g: false };
  };
  const put3 = (x0, z0, x1, z1, th, taper) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2.2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = Math.max(1, Math.round(th * (1 - taper * t)));
      const x = Math.round(x0 + (x1 - x0) * t - w / 2 + 0.5);
      const z = Math.round(z0 + (z1 - z0) * t - w / 2 + 0.5);
      for (let a = 0; a < w; a++)
        for (let b = 0; b < w; b++) for (let y = 2; y < 2 + Math.max(2, w); y++) {
          const bn = bone(t, x + a, y, z + b);
          put(x + a, y, z + b, bn.c, bn.g);
        }
    }
  };
  put3(0, LEAD0, 8, 18, 4, 0.2);
  put3(8, 18, WRIST_X, WRIST_Z, 3, 0);
  put3(WRIST_X, WRIST_Z, 48, 28, 3, 0.7);
  put3(WRIST_X, WRIST_Z, 41, 12, 2, 0.5);
  put3(WRIST_X, WRIST_Z, 31, 3, 2, 0.5);
  put3(WRIST_X, WRIST_Z, 20, -2, 2, 0.5);
  put3(2, 5, 12, 9, 2, 0.4);
  put3(0, 8, 14, 12, 1, 0);
  for (const [x0, z0, x1, z1] of fingers) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const l = Math.hypot(dx, dz);
    put3(x1, z1, x1 + (dx / l) * 3, z1 + (dz / l) * 3, 2, 0.8);
  }
  for (let k = 0; k < 7; k++) {
    const x = 20 + k * 4;
    const z = Math.round(leading(x));
    for (let h = 0; h < 2; h++) put(x, 3 + h, z, J(C.s3, x, h, z, 76));
  }
  stroke(inner, 7, 2, 18 + WZ, 5, 4, 24 + WZ, 3, (t, x, y, z) => plate(x, y, z, 77), 0.7);
  put3(WRIST_X, WRIST_Z, WRIST_X + 3, WRIST_Z + 8, 3, 0.8);
  for (let t = 0; t < 4; t++) put(WRIST_X + 1 + (t > 1 ? 1 : 0), 3, WRIST_Z + 3 + t * 2, C.clawHi);
  const rng = new RNG(808);
  for (let i = 0; i < 40; i++) {
    const x = rng.int(WRIST_X + 2, 44);
    const z = rng.int(Math.ceil(trailing(x)) + 1, Math.floor(leading(x)) - 2);
    if (has(x, 2, z) && nearBone(x, z) > 3) put(x, 2, z, C.m3, false);
  }
  return { inner, outer };
}

/* -------------------------------- tail -------------------------------- */
function tailSeg(w, h, len, seed, spikeH) {
  const T = new VoxelModel(w + 4, h + 4 + spikeH, len);
  const cx = (w + 4) / 2;
  const cy = (h + 4) / 2;
  for (let z = 0; z < len; z++) {
    const k = 0.62 + 0.38 * (z / (len - 1));
    const rw = (w / 2) * k;
    const rh = (h / 2) * k;
    for (let y = 0; y < h + 4; y++)
      for (let x = 0; x < w + 4; x++) {
        const dx = (x + 0.5 - cx) / rw;
        const dy = (y + 0.5 - cy) / rh;
        if (dx * dx + dy * dy <= 1.02) {
          if (dy < -0.38 && Math.abs(dx) < 0.48) T.set(x, y, z, (z & 1) ? C.glow : C.glowHi, true);
          else T.set(x, y, z, dy < -0.38 ? belly(x, y, z) : plate(x, y, z, seed));
        }
      }
    if (z % 3 === 1) {
      const top = Math.round(cy + rh - 0.3);
      shard(T, Math.floor(cx), top, z, spikeH, 0.8, 2);
      shard(T, Math.floor(cx) - 1, top, z, Math.max(1, spikeH - 2), 0.8, 1);
    }
  }
  seams(T, seed + 320, 0.2, 0.035);
  return { model: T, cx, cy, len };
}

function tailFan() {
  const len = 30;
  const T = new VoxelModel(26, 28, len);
  const cx = 13;
  const cy = 11;
  for (let z = len - 1; z >= len - 7; z--) {
    const k = 0.5 - (len - 1 - z) * 0.03;
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 26; x++) {
        const dx = (x + 0.5 - cx) / (2.6 * k + 1);
        const dy = (y + 0.5 - cy) / (2.6 * k + 1);
        if (dx * dx + dy * dy <= 1) T.set(x, y, z, dy < -0.4 ? belly(x, y, z) : plate(x, y, z, 80));
      }
  }
  const blades = [
    [0, 0.0, 22, 3],
    [1, 0.0, 17, 2],
    [-1, 0.0, 17, 2],
    [0, 1, 13, 2],
    [0, -1, 11, 2],
    [1, 0.7, 14, 2],
    [-1, 0.7, 14, 2],
    [1, -0.7, 9, 1],
    [-1, -0.7, 9, 1],
  ];
  for (const [sx, sy, L, th] of blades) {
    const dx = sx * 0.55;
    const dy = sy * 0.6;
    stroke(T, cx, cy, len - 7, cx + dx * L * 0.55, cy + dy * L * 0.55 , len - 7 - L, th, (t, x, y, z) => cryst(0.15 + t * 0.85, x, y, z), 0.7, (t) => t > 0.8);
  }
  return { model: T, cx: 13, cy: 11, len };
}

/* --------------------------------- rig -------------------------------- */
export function buildVolcanumDragon() {
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const root = new THREE.Group();
  const bodyG = new THREE.Group();
  bodyG.position.y = 7 * S;
  root.add(bodyG);
  const body = meshFrom(paintBody(), BO.x, BO.y, BO.z, mat);
  bodyG.add(body);

  // Two-stage neck/head rig: the neck tracks the target while the skull can
  // counter-steer, look around, and pitch independently.
  const neck = new THREE.Group();
  neck.position.set(0, (23 - BO.y) * S, (34 - BO.z) * S);
  neck.add(meshFrom(paintNeck(), BO.x, 23, 34, mat));
  bodyG.add(neck);
  const head = new THREE.Group();
  head.position.set(0, (27 - 23) * S, (42.8 - 34) * S);
  head.scale.setScalar(0.86);
  head.add(meshFrom(paintHead(), HO.x, HO.y, HO.z, mat));
  neck.add(head);
  const jaw = new THREE.Group();
  jaw.position.set(0, -1.4 * S, 4 * S);
  jaw.rotation.x = 0.38;
  jaw.add(meshFrom(paintJaw(), 9, 4, 3, mat));
  head.add(jaw);

  const { inner, outer } = paintWings();
  const wings = [];
  const wingsOuter = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 7.4 * S, (16.4 - BO.y) * S, (25 - BO.z) * S);
    const m = meshFrom(inner, 0, 2, LEAD0 + WZ, mat);
    m.scale.x = side;
    g.add(m);
    const og = new THREE.Group();
    og.position.set(side * WRIST_X * S, 0, (WRIST_Z - LEAD0) * S);
    const om = meshFrom(outer, 0, 2, WRIST_Z + WZ, mat);
    om.scale.x = side;
    og.add(om);
    g.add(og);
    og.rotation.z = side * -0.28;
    g.rotation.z = side * 1.05;
    // Bigger sails, closer to the reference's span.
    g.scale.setScalar(1.22);
    bodyG.add(g);
    wings.push(g);
    wingsOuter.push(og);
  }

  const legs = [];
  const knees = [];
  const thighs = [paintThigh(12, 90), paintThigh(14, 95)];
  const shins = [paintShin(12, 100), paintShin(14, 105)];
  const spots = [
    [-6.8, 25, 0],
    [6.8, 25, 0],
    [-7.2, 10, 1],
    [7.2, 10, 1],
  ];
  spots.forEach(([lx, lz, k], i) => {
    const hip = new THREE.Group();
    hip.position.set(lx * S, (8.6 - BO.y) * S, (lz - BO.z) * S);
    hip.scale.setScalar(0.84);
    const w = k ? 14 : 12;
    hip.add(meshFrom(thighs[k], w / 2, 12, 8, mat));
    const knee = new THREE.Group();
    knee.position.y = -9 * S;
    const shin = meshFrom(shins[k], w / 2, 16, 6, mat);
    knee.add(shin);
    hip.add(knee);
    hip.rotation.x = k ? 0.45 : -0.55;
    knee.rotation.x = k ? -0.7 : 0.85;
    bodyG.add(hip);
    legs.push(hip);
    knees.push(knee);
  });

  const tail = [];
  const segs = [tailSeg(10, 10, 11, 30, 7), tailSeg(8, 8, 11, 31, 6), tailSeg(7, 7, 10, 32, 5), tailSeg(5, 5, 10, 33, 4), tailFan()];
  let parent = bodyG;
  segs.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(0, i === 0 ? (8 - BO.y) * S : 0, i === 0 ? (3 - BO.z) * S : -(segs[i - 1].len - 0.5) * S);
    g.rotation.x = i === 0 ? -0.32 : i === segs.length - 1 ? 0.48 : -0.06 + i * 0.05;
    g.add(meshFrom(s.model, s.cx, s.cy, s.len, mat));
    parent.add(g);
    parent = g;
    tail.push(g);
  });

  // Every emissive (lava) material, so the animation can make the veins pulse.
  const glowMats = [];
  root.traverse((o) => {
    if (o.isMesh && o.material?.isMeshBasicMaterial && !glowMats.includes(o.material)) glowMats.push(o.material);
  });
  return { root, mat, parts: { body, bodyG, neck, head, jaw, legs, knees, tail, wings, wingsOuter, glowMats } };
}
