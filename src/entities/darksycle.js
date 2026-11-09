import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade, mix, clamp, RNG } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';

/**
 * Darksycle Dragon: graphite plated body, violet wing membranes on dark finger
 * bones, a blue crystal crest, spine and tail fan, and a glowing chest core.
 * Matches docs/reference/darksycle-dragon.jpg.
 */
const S = 0.05;

const C = {
  s0: 0x13131b,
  s1: 0x1d1d28,
  s2: 0x292937,
  s3: 0x3a3a4d,
  b0: 0x232130,
  b1: 0x312f42,
  m0: 0x3d1a7a,
  m1: 0x5a2cae,
  m2: 0x7c42d2,
  m3: 0xa266f0,
  c0: 0x2c68bd,
  c1: 0x4c97e8,
  c2: 0x86c4ff,
  c3: 0xc6e6ff,
  glow: 0x3a8cff,
  glowHi: 0xb4e0ff,
  claw: 0x9a98a6,
  clawHi: 0xd8d6e2,
  mouth: 0x150a26,
  mouthGlow: 0x4a74f0,
  tooth: 0xd0cedc,
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
  let c = n > 0.84 ? C.s3 : n > 0.46 ? C.s2 : n > 0.12 ? C.s1 : C.s0;
  if (z % 4 === 0) c = shade(c, 0.76);
  else if (y % 3 === 0 && (x & 1) === 0) c = shade(c, 0.9);
  return J(c, x, y, z, seed, 0.035);
};
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

/** Crystal shard leaning back and up from a surface point. */
function shard(M, x, y, z, h, lean = 0.6, wide = 2, side = 0) {
  for (let k = 1; k <= h; k++) {
    const zz = z - Math.floor(k * lean);
    const xx = x + Math.floor(k * side);
    const col = cryst(k / h, xx, y + k, zz);
    const tip = k === h;
    M.set(xx, y + k, zz, col, tip || k > h - 1);
    if (k <= Math.ceil(h * 0.55) && wide > 1) M.set(xx - 1, y + k, zz, cryst(k / h, xx - 1, y + k, zz));
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
  }
  const neck = [
    [15.5, 33.2, 4.7, 4.9, 4.3, 10],
    [19.5, 36.8, 4.1, 4.3, 3.9, 11],
    [23.5, 39.8, 3.7, 3.9, 3.7, 12],
    [27, 42.6, 3.4, 3.7, 3.5, 13],
  ];
  for (const [cy, cz, rx, ry, rz, seed] of neck) {
    blob(B, cx, cy, cz, rx, ry, rz, (x, y, z, d, dx, dy, dz) => (dz > 0.4 ? bellyRing(x, y, z) : plate(x, y, z, seed)), seed, 0.14);
  }

  for (let z = 4; z <= 43; z += 2) {
    const top = topY(B, cx, z);
    if (top < 0) continue;
    const h = z > 32 ? 3 : 4 + Math.round(1.4 * Math.sin(z * 0.45));
    shard(B, cx, top, z, h, 0.65, z > 32 ? 1 : 2);
  }
  for (const s of [-1, 1]) {
    stroke(B, cx + s * 7.4, 17, 26, cx + s * 11.5, 23, 20, 3, (t, x, y, z) => (t > 0.75 ? cryst(0.9, x, y, z) : plate(x, y, z, 31)), 0.66);
    stroke(B, cx + s * 6, 12, 34, cx + s * 9.5, 14, 30, 2, (t, x, y, z) => plate(x, y, z, 32), 0.5);
  }

  const cy0 = 10.5;
  const coreAt = [];
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const r = (dx / 3.6) ** 2 + (dy / 4.6) ** 2;
      if (r > 1) continue;
      const x = cx + dx;
      const y = Math.round(cy0 + dy);
      const fz = frontZ(B, x, y);
      if (fz < 0) continue;
      coreAt.push([x, y, fz, r]);
    }
  for (const [x, y, fz, r] of coreAt) {
    const col = r < 0.18 ? C.glowHi : r < 0.55 ? C.glow : C.c0;
    B.set(x, y, fz, col, true);
    if (r < 0.62) B.set(x, y, fz + 1, r < 0.25 ? C.glowHi : C.c1, true);
  }
  const rng = new RNG(77);
  for (let v = 0; v < 6; v++) {
    let x = cx + rng.int(-2, 2);
    let y = Math.round(cy0) + rng.int(-3, 3);
    let dir = rng.int(0, 3);
    for (let k = 0; k < 8; k++) {
      const fz = frontZ(B, x, y);
      if (fz >= 0 && !B.get(x, y, fz + 1)) B.set(x, y, fz, k < 3 ? C.glow : C.c0, true);
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
  return B;
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
  for (const s of [-1, 1]) {
    blob(H, cx + s * 4.6, 17.4, 21, 3.1, 1.9, 3.4, (x, y, z) => J(C.s0, x, y, z, 45, 0.03), 45, 0.1);
    blob(H, cx + s * 2.6, 13.4, 36.2, 1.2, 1.1, 1.3, (x, y, z) => J(0x07070b, x, y, z, 46, 0.02), 46, 0);
  }

  for (const s of [-1, 1]) {
    const ex = (k) => cx + s * k - (s < 0 ? 1 : 0);
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 3; col++) {
        const x = ex(3 + col);
        const y = 14 + row;
        const fz = frontZ(H, x, y);
        if (fz < 0) continue;
        const center = col === 1 && row === 0;
        H.set(x, y, fz, center ? C.glowHi : col === 2 && row === 1 ? C.c0 : C.glow, true);
      }
    for (let k = 0; k < 4; k++) {
      const x = ex(2 + k);
      const fz = frontZ(H, x, 16);
      if (fz >= 0) H.set(x, 16, fz, shade(C.s0, 0.8));
    }

    stroke(H, cx + s * 7, 15, 15, cx + s * 13, 18, 5, 3, (t, x, y, z) => (t > 0.8 ? cryst(0.5, x, y, z) : plate(x, y, z, 47)), 0.7);
    stroke(H, cx + s * 7.4, 11, 12, cx + s * 11.5, 7, 5, 2, (t, x, y, z) => plate(x, y, z, 48), 0.5);
    stroke(H, cx + s * 7.2, 9, 18, cx + s * 10.5, 5, 13, 2, (t, x, y, z) => plate(x, y, z, 49), 0.5);

    const beam = [
      [cx + s * 2.6, 18, 12],
      [cx + s * 5, 23, 10],
      [cx + s * 8.2, 29, 6],
      [cx + s * 10.6, 36, 2],
    ];
    for (let i = 0; i < beam.length - 1; i++) {
      const a = beam[i];
      const b = beam[i + 1];
      stroke(H, a[0], a[1], a[2], b[0], b[1], b[2], 3 - Math.floor(i / 2), (t, x, y, z) => cryst((i + t) / 3, x, y, z), 0.3, (t) => i === 2 && t > 0.85);
    }
    const tines = [
      [1, 0.2, 7.2, 4.4, 5.6],
      [1, 0.65, 11.2, 4.6, 6],
      [2, 0.1, 12, 5.2, 8],
      [2, 0.6, 15.8, 5, 7],
    ];
    for (const [seg, u, tx, tz, len] of tines) {
      const a = beam[seg];
      const b = beam[seg + 1];
      const px = a[0] + (b[0] - a[0]) * u;
      const py = a[1] + (b[1] - a[1]) * u;
      const pz = a[2] + (b[2] - a[2]) * u;
      stroke(H, px, py, pz, px + s * (tx - 6) * 0.45, py + len, pz + tz * 0.6, 2, (t, x, y, z) => cryst(0.35 + t * 0.65, x, y, z), 0.5, (t) => t > 0.85);
    }
    stroke(H, cx + s * 1.6, 18, 7, cx + s * 2, 25, 3, 2, (t, x, y, z) => cryst(0.3 + t * 0.6, x, y, z), 0.5, (t) => t > 0.85);
  }
  for (let z = 6; z <= 14; z += 3) {
    const top = topY(H, cx, z);
    if (top >= 0) shard(H, cx, top, z, 3, 0.8, 1);
  }

  for (const s of [-1, 1]) {
    for (const z of [22, 25, 28.5, 32, 35]) {
      const x = cx + s * (z < 30 ? 4.4 : 3.2) - (s < 0 ? 1 : 0);
      const big = z === 32;
      for (let k = 0; k < (big ? 3 : 1); k++) H.set(x, 6 - k, Math.floor(z), k === (big ? 2 : 0) ? C.clawHi : shade(C.tooth, 0.85));
    }
  }
  for (let z = 17; z <= 36; z++) for (let x = cx - 3; x <= cx + 2; x++) if (H.has(x, 7, z)) H.set(x, 6, z, J(C.mouth, x, 6, z, 50, 0.03));
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
      let t = 0.18 + clamp(dBone / 7, 0, 1) * 0.5 + (patch - 0.5) * 0.55 + (fine - 0.5) * 0.14 + (1 - edge) * 0.08;
      t = clamp(t, 0, 0.999);
      const col = [C.m0, C.m1, C.m2, C.m3][Math.floor(t * 4)];
      put(x, 2, z, J(col, x, 0, z, 73, 0.03));
    }
  }
  const bone = (t, x, y, z) => (t > 0.85 ? J(C.s3, x, y, z, 74) : plate(x, y, z, 75));
  const put3 = (x0, z0, x1, z1, th, taper) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2.2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = Math.max(1, Math.round(th * (1 - taper * t)));
      const x = Math.round(x0 + (x1 - x0) * t - w / 2 + 0.5);
      const z = Math.round(z0 + (z1 - z0) * t - w / 2 + 0.5);
      for (let a = 0; a < w; a++)
        for (let b = 0; b < w; b++) for (let y = 2; y < 2 + Math.max(2, w); y++) put(x + a, y, z + b, bone(t, x + a, y, z + b));
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
        if (dx * dx + dy * dy <= 1.02) T.set(x, y, z, dy < -0.38 ? belly(x, y, z) : plate(x, y, z, seed));
      }
    if (z % 3 === 1) {
      const top = Math.round(cy + rh - 0.3);
      shard(T, Math.floor(cx), top, z, spikeH, 0.8, 2);
      shard(T, Math.floor(cx) - 1, top, z, Math.max(1, spikeH - 2), 0.8, 1);
    }
  }
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
export function buildDarksycleDragon() {
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const root = new THREE.Group();
  const bodyG = new THREE.Group();
  bodyG.position.y = 7 * S;
  root.add(bodyG);
  const body = meshFrom(paintBody(), BO.x, BO.y, BO.z, mat);
  bodyG.add(body);

  const head = new THREE.Group();
  head.position.set(0, (27 - BO.y) * S, (42.8 - BO.z) * S);
  head.scale.setScalar(0.86);
  head.add(meshFrom(paintHead(), HO.x, HO.y, HO.z, mat));
  bodyG.add(head);
  const jaw = new THREE.Group();
  jaw.position.set(0, -1.4 * S, 4 * S);
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
    og.rotation.z = side * -0.12;
    g.rotation.z = side * 0.45;
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
  const segs = [tailSeg(10, 10, 11, 30, 5), tailSeg(8, 8, 11, 31, 4), tailSeg(7, 7, 10, 32, 4), tailSeg(5, 5, 10, 33, 3), tailFan()];
  let parent = bodyG;
  segs.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(0, i === 0 ? (8 - BO.y) * S : 0, i === 0 ? (3 - BO.z) * S : -(segs[i - 1].len - 0.5) * S);
    g.add(meshFrom(s.model, s.cx, s.cy, s.len, mat));
    parent.add(g);
    parent = g;
    tail.push(g);
  });

  return { root, mat, parts: { body, bodyG, head, jaw, legs, knees, tail, wings, wingsOuter } };
}
