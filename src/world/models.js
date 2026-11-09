import { VoxelModel, RNG, hash3, jitter, mix, shade, hex, clamp, lerp } from '../engine/voxel.js';

export const J = (c, x, y, z, s = 0, a = 0.07) => jitter(c, a, hash3(x, y, z, s));

/** Build one or more voxel models into a list of geometry parts. */
export function bundle(entries) {
  const parts = [];
  for (const [m, size, ox, oy, oz] of entries) {
    const g = m.build(size, ox, oy, oz);
    for (const kind of ['solid', 'glow', 'window']) if (g[kind]) parts.push({ geo: g[kind], kind });
  }
  return parts;
}

function cyl(m, cx, cz, y0, y1, r, color, glow = false) {
  const R = Math.ceil(r) + 1;
  for (let y = y0; y < y1; y++)
    for (let z = Math.floor(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz <= r * r) {
          const c = typeof color === 'function' ? color(x, y, z) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c, glow);
        }
      }
}

function lathe(m, cx, cz, y0, radii, color, glow = false) {
  radii.forEach((r, i) => cyl(m, cx, cz, y0 + i, y0 + i + 1, r, color, glow));
}

function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.35, glow = false) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
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

/* ------------------------------------------------------------------ */
/* Nature                                                              */
/* ------------------------------------------------------------------ */

const PINE_G = [0x1f6a43, 0x287a4a, 0x226040, 0x2f8a52];

export function buildPine(seed, snow = false) {
  const rng = new RNG(seed * 97 + 5);
  const T = new VoxelModel(6, 18, 6);
  T.box(1, 0, 1, 5, 18, 5, (x, y, z) => {
    const streak = hash3(x, 0, z, seed) > 0.6 ? 0.82 : 1;
    return shade(J(0x5b3b25, x, y, z, seed, 0.1), streak);
  });
  T.box(0, 0, 1, 1, 2, 5, (x, y, z) => J(0x4d321f, x, y, z, seed));
  T.box(5, 0, 1, 6, 2, 5, (x, y, z) => J(0x4d321f, x, y, z, seed));
  T.box(1, 0, 0, 5, 2, 1, (x, y, z) => J(0x4d321f, x, y, z, seed));
  T.box(1, 0, 5, 5, 2, 6, (x, y, z) => J(0x4d321f, x, y, z, seed));

  const R0 = rng.int(6, 7);
  const radii = [];
  for (let t = 0; t < 5; t++) {
    const base = R0 - t * 1.2;
    radii.push(base, base - 1);
  }
  radii.push(1.4, 0.9);
  const F = new VoxelModel(R0 * 2 + 4, radii.length + 1, R0 * 2 + 4);
  const c = R0 + 2;
  const palette = PINE_G.map((p) => (rng.chance(0.5) ? p : shade(p, 0.95)));
  radii.forEach((r, ly) => {
    const t = ly / radii.length;
    for (let z = 0; z < F.sz; z++)
      for (let x = 0; x < F.sx; x++) {
        const dx = x + 0.5 - c;
        const dz = z + 0.5 - c;
        const d = Math.sqrt(dx * dx + dz * dz);
        const ang = Math.atan2(dz, dx);
        const edgeNoise = hash3(x, ly, z, seed) * 0.9 + Math.sin(ang * 5 + ly) * 0.35;
        if (d <= r + edgeNoise * 0.55 - (ly % 2 === 1 ? 0.2 : 0)) {
          let col = palette[Math.floor(hash3(x, ly, z, seed + 3) * palette.length)];
          col = mix(col, 0x3fa05a, t * 0.45);
          col = shade(col, ly % 2 === 0 ? 0.82 : 1.0);
          if (snow && (ly % 2 === 1 || t > 0.55) && d < r - 0.4) col = mix(col, 0xf2f8ff, 0.88);
          F.set(x, ly, z, J(col, x, ly, z, seed, 0.06));
        }
      }
  });
  return bundle([
    [T, 0.125, 3, 0, 3],
    [F, 0.25, c, -3.2, c],
  ]);
}

export function buildOak(seed, kind = 'green') {
  const rng = new RNG(seed * 31 + 7);
  const birch = kind === 'birch';
  const maple = kind === 'maple';
  const bark = birch ? 0xf3eee4 : maple ? 0x6e3824 : 0x6a4529;
  const barkDark = birch ? 0xddd6c6 : maple ? 0x542818 : 0x5a3a22;
  const limb = birch ? 0xe7e0d0 : maple ? 0x62301e : 0x5f3d24;
  const T = new VoxelModel(9, 16, 9);
  T.box(2, 0, 2, 6, 16, 6, (x, y, z) => {
    if (birch && (y % 4 === 0 || (y % 4 === 1 && hash3(x, y, z, seed) > 0.55))) return 0x2a2622;
    return shade(J(bark, x, y, z, seed, 0.08), hash3(x, 0, z, seed) > 0.62 ? 0.86 : 1);
  });
  T.box(1, 0, 2, 2, 3, 6, (x, y, z) => J(barkDark, x, y, z, seed));
  T.box(6, 0, 2, 7, 3, 6, (x, y, z) => J(barkDark, x, y, z, seed));
  T.box(2, 0, 1, 6, 3, 2, (x, y, z) => J(barkDark, x, y, z, seed));
  T.box(2, 0, 6, 6, 3, 7, (x, y, z) => J(barkDark, x, y, z, seed));
  T.line(4, 11, 4, 8, 15, 4, (x, y, z) => J(limb, x, y, z, seed), 2);
  T.line(4, 10, 4, 0, 14, 5, (x, y, z) => J(limb, x, y, z, seed), 2);

  const F = new VoxelModel(22, 16, 22);
  const palettes = {
    green: [0x2f8a3f, 0x3f9f47, 0x57b650, 0x76cc5c],
    blossom: [0xf49ac1, 0xffb7d3, 0xe87fb0, 0xffd3e4],
    autumn: [0xd9722e, 0xe8932f, 0xc9552a, 0xf1b13d],
    teal: [0x2a8a6a, 0x38a07a, 0x4fb88a, 0x7bd9a6],
    birch: [0x8fb84a, 0xc6dc62, 0x6a9a38, 0xd2e878],
    maple: [0xc42a28, 0xe24a22, 0xf07a30, 0xa81c24],
  };
  const pal = palettes[kind];
  const colorFn = (x, y, z, d) => {
    const t = clamp(y / 14, 0, 1);
    const idx = clamp(Math.floor(t * 3.2 + (hash3(x, y, z, seed + 5) - 0.5) * 1.8 + (d || 0) * 0.5), 0, 3);
    let c = pal[idx];
    if (kind === 'blossom' && hash3(x, y, z, seed + 8) > 0.72) c = 0x4aa84a;
    return J(shade(c, 0.78 + t * 0.3), x, y, z, seed, 0.05);
  };
  blob(F, 11, 7.5, 11, 7.5, 5, 7.5, colorFn, seed, 0.5);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.range(0, 1);
    blob(F, 11 + Math.cos(a) * 5.5, 5 + rng.range(-1, 2.5), 11 + Math.sin(a) * 5.5, rng.range(3.2, 4.5), rng.range(2.6, 3.4), rng.range(3.2, 4.5), colorFn, seed + i, 0.5);
  }
  blob(F, 11 + rng.range(-2, 2), 11, 11 + rng.range(-2, 2), 4.6, 3.2, 4.6, colorFn, seed + 9, 0.5);
  return bundle([
    [T, 0.125, 4.5, 0, 4.5],
    [F, 0.25, 11, -5.5, 11],
  ]);
}

export function buildGiant(seed) {
  const rng = new RNG(seed * 13 + 3);
  const R = 3.4;
  const T = new VoxelModel(16, 30, 16);
  const c = 8;
  const bark = (x, y, z) => {
    const ang = Math.atan2(z + 0.5 - c, x + 0.5 - c);
    const streak = Math.sin(ang * 9 + hash3(x >> 1, 0, z >> 1, seed) * 3) > 0.35 ? 0.78 : 1;
    let col = shade(J(0x56402c, x, y, z, seed, 0.1), streak);
    const side = Math.cos(ang - 0.6);
    if (hash3(x, y >> 1, z, seed + 4) * 0.7 + side * 0.3 + (y < 6 ? 0.1 : 0) > 0.74) col = J(mix(0x3d8a3c, 0x59a04a, hash3(x, y, z, 1)), x, y, z, seed, 0.1);
    return col;
  };
  for (let y = 0; y < 30; y++) {
    const flare = y < 4 ? (4 - y) * 0.55 : 0;
    const taper = y > 24 ? (y - 24) * 0.08 : 0;
    cyl(T, c, c, y, y + 1, R + flare - taper, bark);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng.range(0, 1);
    T.line(c + Math.cos(a) * R, 3, c + Math.sin(a) * R, c + Math.cos(a) * (R + 3.4), 0, c + Math.sin(a) * (R + 3.4), bark, 3);
  }
  const F = new VoxelModel(22, 14, 22);
  const pal = [0x1f7a58, 0x2a9068, 0x3fae7a, 0x66cf90];
  const colorFn = (x, y, z, d) => {
    const t = clamp(y / 10, 0, 1);
    const idx = clamp(Math.floor(t * 3 + (hash3(x, y, z, seed + 5) - 0.5) * 1.6), 0, 3);
    return J(shade(pal[idx], 0.8 + t * 0.25), x, y, z, seed, 0.05);
  };
  blob(F, 11, 6, 11, 9, 4.5, 9, colorFn, seed, 0.5);
  blob(F, 6, 5, 8, 5.5, 4, 5.5, colorFn, seed + 1, 0.5);
  blob(F, 16, 5, 14, 5.5, 4, 5.5, colorFn, seed + 2, 0.5);
  blob(F, 11, 9, 11, 6, 3.4, 6, colorFn, seed + 3, 0.5);
  return bundle([
    [T, 0.25, c, 0, c],
    [F, 0.5, 11, -14, 11],
  ]);
}

export function buildGrassTuft(seed, palette = 'green') {
  const rng = new RNG(seed * 7 + 1);
  const M = new VoxelModel(7, 9, 7);
  const pals = {
    green: [0x4a9a35, 0x7ad04f],
    forest: [0x2f7f4a, 0x57b673],
    gold: [0x9aa83c, 0xe6cf55],
  };
  const [lo, hi] = pals[palette];
  const n = rng.int(3, 4);
  for (let i = 0; i < n; i++) {
    const bx = rng.int(1, 5);
    const bz = rng.int(1, 5);
    const h = rng.int(4, 8);
    const lx = rng.int(-1, 1);
    const lz = rng.int(-1, 1);
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const lean = t > 0.55 ? 1 : 0;
      M.set(bx + lx * lean, y, bz + lz * lean, J(mix(lo, hi, t), bx, y, bz, seed, 0.06));
    }
  }
  return bundle([[M, 0.1, 3.5, 0, 3.5]]);
}

export function buildFlower(seed, head, center = 0xffd23f) {
  const rng = new RNG(seed * 11 + 2);
  const M = new VoxelModel(5, 12, 5);
  const h = rng.int(5, 8);
  for (let y = 0; y < h; y++) M.set(2, y, 2, J(0x3c8f35, 2, y, 2, seed));
  M.set(3, 2, 2, 0x4aa63c);
  M.set(1, 3, 2, 0x4aa63c);
  M.set(1, h, 2, head);
  M.set(3, h, 2, head);
  M.set(2, h, 1, head);
  M.set(2, h, 3, head);
  M.set(2, h, 2, center);
  M.set(2, h + 1, 2, shade(head, 1.1));
  return bundle([[M, 0.1, 2.5, 0, 2.5]]);
}

export function buildFern(seed) {
  const rng = new RNG(seed * 5 + 9);
  const M = new VoxelModel(17, 9, 17);
  const n = rng.int(6, 8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const L = rng.range(5.5, 7.5);
    for (let s = 0; s <= 1; s += 0.08) {
      const x = 8 + Math.cos(a) * s * L;
      const z = 8 + Math.sin(a) * s * L;
      const y = 1 + Math.sin(s * Math.PI * 0.85) * 3.2 - s * s * 0.6;
      const col = J(mix(0x2d8a4a, 0x62c47a, s), Math.floor(x), Math.floor(y), Math.floor(z), seed, 0.06);
      M.set(Math.floor(x), Math.floor(y), Math.floor(z), col);
      if (s > 0.25 && s < 0.9 && Math.floor(s * 12) % 2 === 0) {
        M.set(Math.floor(x - Math.sin(a)), Math.floor(y), Math.floor(z + Math.cos(a)), col);
        M.set(Math.floor(x + Math.sin(a)), Math.floor(y), Math.floor(z - Math.cos(a)), col);
      }
    }
  }
  return bundle([[M, 0.09, 8.5, 0, 8.5]]);
}

export function buildBush(seed, berry = false) {
  const M = new VoxelModel(14, 10, 14);
  const pal = [0x2a7f45, 0x35944f, 0x48aa5b, 0x62c26c];
  blob(
    M, 7, 4.5, 7, 6, 4, 6,
    (x, y, z) => {
      const t = clamp(y / 8, 0, 1);
      if (berry && hash3(x, y, z, seed + 2) > 0.93) return 0xe03a52;
      return J(shade(pal[Math.floor(clamp(t * 3 + hash3(x, y, z, seed) * 1.4, 0, 3))], 0.85 + t * 0.2), x, y, z, seed, 0.05);
    },
    seed, 0.6
  );
  return bundle([[M, 0.125, 7, 0, 7]]);
}

export function buildMushroom(seed, kind = 'red') {
  const rng = new RNG(seed * 3 + 1);
  const M = new VoxelModel(14, 12, 14);
  const caps = { red: [0xd9392f, 0xff5a46], brown: [0x9a6238, 0xbb7e4a], purple: [0x8a4ac8, 0xb678f0], glow: [0x39e0c8, 0x9affef] };
  const [cLo, cHi] = caps[kind];
  const n = rng.int(2, 3);
  for (let i = 0; i < n; i++) {
    const cx = 4 + i * 3 + rng.int(-1, 1);
    const cz = 4 + rng.int(-2, 3);
    const h = rng.int(3, 5);
    const r = rng.range(2.4, 3.6);
    cyl(M, cx, cz, 0, h, 1.0, (x, y, z) => J(0xf0e6d0, x, y, z, seed, 0.05));
    blob(
      M, cx, h + 0.5, cz, r, r * 0.62, r,
      (x, y, z, d) => {
        if (kind === 'red' && hash3(x, y, z, seed) > 0.86 && y >= h) return 0xfff4e0;
        return J(mix(cLo, cHi, clamp((y - h) / 3, 0, 1)), x, y, z, seed, 0.05);
      },
      seed + i, 0.1, kind === 'glow'
    );
  }
  return bundle([[M, 0.09, 7, 0, 7]]);
}

export function buildBigMushroom(seed, kind = 'red') {
  const M = new VoxelModel(24, 22, 24);
  const caps = { red: [0xc8302a, 0xff5848], pink: [0xd85a9a, 0xff8cc4], purple: [0x7a3fc0, 0xb27af0], blue: [0x2f8fd0, 0x7cc8ff] };
  const [lo, hi] = caps[kind];
  cyl(M, 12, 12, 0, 11, 2.6, (x, y, z) => J(mix(0xf3ead6, 0xd8c9a8, hash3(x, y, z, seed)), x, y, z, seed, 0.04));
  blob(
    M, 12, 11, 12, 10, 5.5, 10,
    (x, y, z, d) => {
      if (y < 11) return J(0xf6e9c8, x, y, z, seed, 0.05);
      if (hash3(x >> 1, y >> 1, z >> 1, seed) > 0.8 && y > 11) return 0xfff6e4;
      return J(mix(lo, hi, clamp((y - 11) / 5, 0, 1)), x, y, z, seed, 0.05);
    },
    seed, 0.12
  );
  return bundle([[M, 0.125, 12, 0, 12]]);
}

export function buildRock(seed, big = false) {
  const rng = new RNG(seed * 17 + 2);
  const M = new VoxelModel(16, 12, 16);
  const rx = rng.range(3.5, big ? 7 : 5);
  const rz = rng.range(3.5, big ? 7 : 5);
  const ry = rng.range(2.4, big ? 5.4 : 3.6);
  blob(
    M, 8, ry * 0.8, 8, rx, ry, rz,
    (x, y, z) => {
      const top = y > ry * 1.4;
      let c = J(mix(0x7d838a, 0x9aa0a6, hash3(x >> 1, y >> 1, z >> 1, seed)), x, y, z, seed, 0.08);
      if (top && hash3(x, y, z, seed + 5) > 0.45) c = J(0x4e8f3c, x, y, z, seed, 0.1);
      return c;
    },
    seed, 0.4
  );
  return bundle([[M, 0.125, 8, 0, 8]]);
}

export function buildStump(seed) {
  const M = new VoxelModel(14, 8, 14);
  cyl(M, 7, 7, 0, 5, 4.2, (x, y, z) => {
    if (y === 4) {
      const d = Math.hypot(x + 0.5 - 7, z + 0.5 - 7);
      return Math.floor(d) % 2 === 0 ? 0xd9b27a : 0xc19559;
    }
    return shade(J(0x6a4529, x, y, z, seed, 0.1), hash3(x, 0, z, seed) > 0.6 ? 0.8 : 1);
  });
  cyl(M, 7, 7, 0, 2, 5.4, (x, y, z) => J(0x5a3a22, x, y, z, seed, 0.1));
  cyl(M, 7, 7, 4, 6, 1.6, (x, y, z) => (hash3(x, y, z, seed) > 0.4 ? 0xe74c3c : 0xffd7b0));
  return bundle([[M, 0.125, 7, 0, 7]]);
}

export function buildLog(seed) {
  const M = new VoxelModel(24, 9, 9);
  for (let x = 0; x < 24; x++) {
    const cy = 3.8;
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 8; z++) {
        const d = Math.hypot(y + 0.5 - cy - 0.2, z + 0.5 - 4);
        if (d <= 3.6) {
          let c = shade(J(0x6a4529, x, y, z, seed, 0.1), hash3(x, y, z, seed + 1) > 0.65 ? 0.8 : 1);
          if (y > 5 && hash3(x, y, z, seed + 2) > 0.45) c = J(0x4e8f3c, x, y, z, seed, 0.1);
          if (x === 0 || x === 23) c = d < 2.6 ? 0xd2a96e : c;
          M.set(x, y, z, c);
        }
      }
  }
  return bundle([[M, 0.125, 12, 0, 4.5]]);
}

export function buildReed(seed) {
  const rng = new RNG(seed + 4);
  const M = new VoxelModel(7, 22, 7);
  for (let i = 0; i < 3; i++) {
    const bx = rng.int(1, 5);
    const bz = rng.int(1, 5);
    const h = rng.int(12, 20);
    for (let y = 0; y < h; y++) M.set(bx, y, bz, J(0x5a9a3c, bx, y, bz, seed));
    if (i < 2) for (let y = h - 3; y < h; y++) M.set(bx, y, bz, J(0x6b4a2a, bx, y, bz, seed));
  }
  return bundle([[M, 0.08, 3.5, 0, 3.5]]);
}

export function buildLilyPad(seed, flower = false) {
  const M = new VoxelModel(12, 3, 12);
  cyl(M, 6, 6, 0, 1, 4.6, (x, y, z) => {
    const a = Math.atan2(z + 0.5 - 6, x + 0.5 - 6);
    if (a > 0.1 && a < 0.5) return null;
    return J(0x3f9a4a, x, y, z, seed, 0.1);
  });
  if (flower) {
    cyl(M, 6, 6, 1, 2, 1.8, 0xff9ec4);
    M.set(6, 2, 6, 0xffe27a);
  }
  return bundle([[M, 0.1, 6, 0, 6]]);
}

/* ------------------------------------------------------------------ */
/* Village props                                                       */
/* ------------------------------------------------------------------ */

export function buildTorch(seed = 0, flameColors = [0xff7a1a, 0xffcf4a]) {
  const M = new VoxelModel(6, 34, 6);
  M.box(2, 0, 2, 4, 24, 4, (x, y, z) => J(0x6b4a2b, x, y, z, seed, 0.1));
  M.box(1, 22, 1, 5, 25, 5, (x, y, z) => J(0x3e4046, x, y, z, seed, 0.08));
  M.box(2, 25, 2, 4, 28, 4, flameColors[0], true);
  M.box(2, 28, 2, 4, 30, 4, flameColors[1], true);
  M.set(2, 30, 2, 0xfff1b0, true);
  return bundle([[M, 0.0625, 3, 0, 3]]);
}

export function buildPot(seed, kind = 0) {
  const M = new VoxelModel(16, 26, 16);
  const clay = [0xa5623a, 0xb4713f, 0x8f5230, 0x6e7c8a][kind % 4];
  const profile = [
    [3, 4, 5, 5.5, 6, 6, 6, 5.5, 5, 4, 3, 3, 4, 4],
    [4, 5, 6, 6, 5, 4, 3, 3, 3, 4, 5, 5],
    [3, 4, 4.5, 5, 5, 4.5, 4, 3, 2.4, 2.4, 3, 3.6, 3.6],
  ][kind % 3];
  lathe(M, 8, 8, 0, profile, (x, y, z) => {
    let c = J(clay, x, y, z, seed, 0.08);
    if (y === 4 || y === 5) c = shade(c, 0.75);
    if (y === profile.length - 1) c = shade(c, 1.2);
    return c;
  });
  return bundle([[M, 0.0625, 8, 0, 8]]);
}

export function buildCrate(seed) {
  const M = new VoxelModel(14, 14, 14);
  const wood = 0x9a6b3d;
  M.box(1, 0, 1, 13, 12, 13, (x, y, z) => {
    const edge = (x < 3 || x > 10 ? 1 : 0) + (y < 2 || y > 9 ? 1 : 0) + (z < 3 || z > 10 ? 1 : 0);
    if (edge >= 2) return J(0x6a4527, x, y, z, seed, 0.08);
    return J(y % 4 === 0 ? shade(wood, 0.82) : wood, x, y, z, seed, 0.07);
  });
  return bundle([[M, 0.0625, 7, 0, 7]]);
}

export function buildBarrel(seed) {
  const M = new VoxelModel(16, 20, 16);
  const rad = [4.4, 5.2, 5.8, 6.1, 6.2, 6.2, 6.2, 6.2, 6.1, 5.8, 5.2, 4.4];
  lathe(M, 8, 8, 0, rad, (x, y, z) => {
    if (y === 2 || y === 3 || y === 8 || y === 9) return J(0x3a3d44, x, y, z, seed, 0.08);
    const staves = Math.floor((Math.atan2(z + 0.5 - 8, x + 0.5 - 8) + Math.PI) * 4) % 2 === 0;
    return J(staves ? 0x8a5a30 : 0x764a28, x, y, z, seed, 0.07);
  });
  cyl(M, 8, 8, 11, 12, 4.2, (x, y, z) => J(0x9a6b3d, x, y, z, seed, 0.06));
  return bundle([[M, 0.0625, 8, 0, 8]]);
}

export function buildChest(seed) {
  const M = new VoxelModel(18, 14, 14);
  M.box(2, 0, 2, 16, 7, 12, (x, y, z) => {
    if (x < 4 || x > 13 || y < 1 || (y === 3 && false)) return J(0x3a3d44, x, y, z, seed, 0.06);
    return J(y % 3 === 0 ? 0x7d4c28 : 0x8f5b30, x, y, z, seed, 0.07);
  });
  for (let z = 2; z < 12; z++) {
    const h = Math.round(Math.sqrt(Math.max(0, 25 - (z - 7) * (z - 7))) * 0.62);
    for (let y = 7; y < 7 + h; y++)
      for (let x = 2; x < 16; x++) {
        const band = x < 4 || x > 13;
        M.set(x, y, z, band ? J(0x3a3d44, x, y, z, seed, 0.06) : J(0x8f5b30, x, y, z, seed, 0.07));
      }
  }
  M.box(8, 5, 12, 10, 8, 13, 0xe6b73c);
  return bundle([[M, 0.0625, 9, 0, 7]]);
}

export function buildHay(seed) {
  const M = new VoxelModel(20, 14, 14);
  M.box(1, 0, 1, 19, 11, 13, (x, y, z) => {
    if (x === 6 || x === 13) return J(0x7b5430, x, y, z, seed, 0.06);
    const stripe = (x * 3 + y * 5 + z) % 4 === 0 ? 0.88 : 1;
    return shade(J(0xe0bf55, x, y, z, seed, 0.1), stripe);
  });
  return bundle([[M, 0.0625, 10, 0, 7]]);
}

export function buildFencePiece(seed, withPost = true) {
  const M = new VoxelModel(18, 16, 4);
  const wood = (x, y, z) => J(0x7a4e2c, x, y, z, seed, 0.1);
  if (withPost) {
    M.box(0, 0, 0, 3, 14, 3, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.1));
    M.box(0, 14, 0, 3, 15, 3, (x, y, z) => J(0x8a5a33, x, y, z, seed, 0.08));
  }
  M.box(3, 3, 0, 18, 6, 2, wood);
  M.box(3, 8, 0, 18, 11, 2, wood);
  return bundle([[M, 0.0625, 0, 0, 0]]);
}

export function buildSignpost(seed) {
  const M = new VoxelModel(20, 30, 6);
  M.box(8, 0, 1, 11, 26, 4, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.08));
  M.box(2, 18, 2, 17, 24, 4, (x, y, z) => J(0x9a6b3d, x, y, z, seed, 0.06));
  M.box(3, 19, 4, 16, 20, 5, 0x3a2414);
  M.box(3, 21, 4, 12, 22, 5, 0x3a2414);
  M.box(1, 19, 2, 2, 23, 4, 0x9a6b3d);
  return bundle([[M, 0.0625, 10, 0, 3]]);
}

export function buildStreetLamp(seed) {
  const M = new VoxelModel(10, 46, 10);
  M.box(4, 0, 4, 6, 34, 6, (x, y, z) => J(0x2f3036, x, y, z, seed, 0.05));
  M.box(3, 0, 3, 7, 3, 7, 0x3c3d44);
  M.box(2, 34, 2, 8, 36, 8, 0x3c3d44);
  M.box(3, 36, 3, 7, 42, 7, 0xffd27a, true);
  M.box(2, 42, 2, 8, 44, 8, 0x2f3036);
  M.box(4, 44, 4, 6, 46, 6, 0x2f3036);
  return bundle([[M, 0.0625, 5, 0, 5]]);
}

export function buildWell(seed) {
  const M = new VoxelModel(28, 48, 28);
  const stone = (x, y, z) => {
    const row = Math.floor(y / 2);
    const a = Math.atan2(z + 0.5 - 14, x + 0.5 - 14);
    const col = Math.floor((a + Math.PI) * 5 + (row % 2) * 0.5);
    if (y % 2 === 0 && false) return 0x4d4d52;
    const c = [0x8a8f96, 0x9aa0a6, 0x7c8288, 0xa6a39a][Math.abs(col + row * 3) % 4];
    return J(c, x, y, z, seed, 0.06);
  };
  for (let y = 0; y < 8; y++) {
    cyl(M, 14, 14, y, y + 1, 8.2, (x, yy, z) => {
      const d = Math.hypot(x + 0.5 - 14, z + 0.5 - 14);
      if (d < 5.6) return y < 5 ? (y === 4 ? 0x2b78b0 : null) : null;
      return stone(x, yy, z);
    });
  }
  cyl(M, 14, 14, 4, 5, 5.6, 0x3a8ac0);
  M.box(5, 8, 12, 8, 30, 15, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.08));
  M.box(20, 8, 12, 23, 30, 15, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.08));
  M.box(5, 28, 12, 23, 31, 15, (x, y, z) => J(0x7a4e2c, x, y, z, seed, 0.08));
  for (let i = 0; i < 9; i++) {
    const w = 11 - i;
    const roof = [0x3f7d79, 0x4a8c86, 0x356b68][i % 3];
    M.box(14 - w, 31 + i, 9, 14 + w, 32 + i, 19, (x, y, z) => J(roof, x, y, z, seed, 0.08));
    if (w <= 1) break;
  }
  M.box(13, 14, 13, 15, 28, 14, 0xb59a6a);
  M.box(11, 11, 12, 17, 15, 16, (x, y, z) => J(0x8a5a30, x, y, z, seed, 0.06));
  return bundle([[M, 0.0625, 14, 0, 14]]);
}

export function buildScarecrow(seed) {
  const M = new VoxelModel(24, 40, 8);
  M.box(11, 0, 3, 13, 28, 5, (x, y, z) => J(0x6b4325, x, y, z, seed));
  M.box(2, 22, 3, 22, 24, 5, (x, y, z) => J(0x6b4325, x, y, z, seed));
  M.box(8, 12, 2, 16, 24, 6, (x, y, z) => J(0x4f78b0, x, y, z, seed, 0.1));
  M.box(8, 17, 2, 16, 19, 6, (x, y, z) => J(0xc7503a, x, y, z, seed));
  M.box(8, 26, 1, 16, 34, 7, (x, y, z) => J(0xd9b87a, x, y, z, seed, 0.08));
  M.box(9, 29, 7, 11, 31, 8, 0x1a1410);
  M.box(13, 29, 7, 15, 31, 8, 0x1a1410);
  M.box(10, 27, 7, 14, 28, 8, 0x1a1410);
  M.box(6, 34, 0, 18, 36, 8, (x, y, z) => J(0x5a3a24, x, y, z, seed));
  M.box(9, 36, 2, 15, 40, 6, (x, y, z) => J(0x5a3a24, x, y, z, seed));
  for (let i = 0; i < 6; i++) {
    M.box(1 - (i % 2), 20 - i, 3, 2, 21 - i, 5, 0xe6cf55);
    M.box(22, 20 - i, 3, 23 + (i % 2), 21 - i, 5, 0xe6cf55);
  }
  return bundle([[M, 0.0625, 12, 0, 4]]);
}

export function buildWheat(seed, ripe = true) {
  const rng = new RNG(seed * 5 + 3);
  const M = new VoxelModel(10, 14, 10);
  for (let i = 0; i < 4; i++) {
    const bx = 1 + (i % 2) * 5 + rng.int(0, 2);
    const bz = 1 + Math.floor(i / 2) * 5 + rng.int(0, 2);
    const h = rng.int(8, 11);
    for (let y = 0; y < h; y++) M.set(bx, y, bz, J(ripe ? 0xb9b24a : 0x7ab04a, bx, y, bz, seed, 0.07));
    for (let y = h - 3; y < h + 1; y++) M.set(bx, y, bz, J(ripe ? 0xe8c64e : 0x9acb55, bx, y, bz, seed, 0.07));
    M.set(bx + 1, h - 2, bz, ripe ? 0xe8c64e : 0x9acb55);
    M.set(bx, h - 1, bz + 1, ripe ? 0xd9b440 : 0x8abb48);
  }
  return bundle([[M, 0.09, 5, 0, 5]]);
}

export function buildCrystal(seed, color = 0xb86bff) {
  const rng = new RNG(seed + 1);
  const M = new VoxelModel(12, 16, 12);
  for (let i = 0; i < 4; i++) {
    const bx = rng.int(2, 9);
    const bz = rng.int(2, 9);
    const h = rng.int(6, 14);
    for (let y = 0; y < h; y++) {
      const w = y > h - 3 ? 0 : y < h * 0.45 ? 1 : 0;
      for (let dx = 0; dx <= w; dx++)
        for (let dz = 0; dz <= w; dz++) M.set(bx + dx, y, bz + dz, mix(shade(color, 0.7), color, y / h), true);
    }
    M.set(bx, h, bz, 0xffffff, true);
  }
  return bundle([[M, 0.0625, 6, 0, 6]]);
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

const FONT = {
  G: ['.XXX.', 'X...X', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXX.'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  I: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
};

export function buildHouse(opts) {
  const {
    w = 5, d = 4, wh = 24, seed = 1,
    wall = 0x8a5a34, roof = [0x3f7d79, 0x4a8c86, 0x356b68, 0x59a19a, 0x8a4b38],
    sign = null, bigDoor = false, chimney = true, pitch = 1.1, shutters = 0x3f7d79, flowers = true, stone = 0x8a8f96,
  } = opts;
  const W = w * 8;
  const D = d * 8;
  const rise = Math.round((W / 2 + 3) * pitch);
  const ox = 5;
  const oz = 5;
  const sx = W + 10;
  const sy = wh + rise + 8;
  const sz = D + 14;
  const M = new VoxelModel(sx, sy, sz);
  const xc = ox + W / 2;
  const front = oz + D - 1;
  const rng = new RNG(seed * 41 + 3);

  const beam = (x, y, z) => J(0x3a2415, x, y, z, seed, 0.08);
  const plank = (x, y, z) => {
    let c = wall;
    c = y % 4 === 0 ? shade(c, 0.8) : c;
    const off = Math.floor(y / 4) % 2 ? 7 : 0;
    if ((x + z + off) % 14 === 0) c = shade(c, 0.78);
    return J(c, x, y, z, seed, 0.07);
  };

  M.box(ox - 1, 0, oz - 1, ox + W + 1, 5, oz + D + 1, (x, y, z) => {
    const row = Math.floor(y / 2);
    const col = Math.floor((x + z + (row % 2) * 2) / 4);
    const c = [0x8a8f96, 0x9aa0a6, 0x7c8288, 0xa6a39a][Math.abs(col * 7 + row) % 4];
    return J(y % 2 === 1 && false ? 0x4d4d52 : c, x, y, z, seed, 0.07);
  });
  M.box(ox, 5, oz, ox + W, wh, oz + D, (x, y, z) => {
    const lx = x - ox;
    const lz = z - oz;
    const edge = lx < 2 || lx >= W - 2 || lz < 2 || lz >= D - 2;
    if (edge && (lx < 2 || lx >= W - 2) && (lz < 2 || lz >= D - 2)) return beam(x, y, z);
    if (y >= wh - 3) return beam(x, y, z);
    if (y < 7) return beam(x, y, z);
    const onFront = z >= front - 1 || z <= oz;
    const onSide = x === ox || x === ox + W - 1;
    if (onFront && (lx % 16 === 0 || lx % 16 === 1)) return beam(x, y, z);
    if (onSide && (lz % 16 === 0 || lz % 16 === 1)) return beam(x, y, z);
    return plank(x, y, z);
  });

  const ry = (x) => wh + Math.round((W / 2 + 3 - Math.abs(x + 0.5 - xc)) * pitch);
  const shingle = (x, z, y) => {
    const s = Math.abs(x + 0.5 - xc);
    const row = Math.floor(s / 3);
    const col = Math.floor((z + (row % 2) * 2) / 4);
    let c = roof[Math.floor(hash3(col, row, 1, seed) * (roof.length - 0.001))];
    if (hash3(col, row, 2, seed) > 0.22) c = roof[Math.floor(hash3(col, row, 3, seed) * 4)];
    const rowPos = s - row * 3;
    if (rowPos < 1) c = shade(c, 0.72);
    else if (rowPos >= 2) c = shade(c, 1.12);
    if ((z + (row % 2) * 2) % 4 === 0) c = shade(c, 0.85);
    return J(c, x, y, z, seed, 0.05);
  };
  for (let x = ox - 3; x < ox + W + 3; x++) {
    const top = ry(x);
    for (let z = oz - 3; z < oz + D + 3; z++) {
      for (let y = Math.max(wh - 1, top - 3); y <= top; y++) M.set(x, y, z, y >= top - 1 ? shingle(x, z, y) : shade(0x4a3626, 0.9));
      if (z >= oz && z < oz + D && x >= ox && x < ox + W) {
        for (let y = wh; y < top - 3; y++) {
          const gx = z === oz || z === oz + D - 1;
          M.set(x, y, z, gx ? plank(x, y, z) : 0x3a2a20);
        }
      }
    }
  }
  const rt = ry(Math.floor(xc));
  for (let z = oz - 3; z < oz + D + 3; z++) {
    M.box(Math.floor(xc) - 1, rt + 1, z, Math.floor(xc) + 1, rt + 2, z + 1, (x, y, zz) => J(shade(roof[0], 0.8), x, y, zz, seed, 0.05));
  }
  for (const zEdge of [oz - 3, oz + D + 2]) {
    for (let x = ox - 3; x < ox + W + 3; x++) {
      const t = ry(x);
      M.set(x, t - 2, zEdge, beam(x, t - 2, zEdge));
      M.set(x, t - 3, zEdge, beam(x, t - 3, zEdge));
    }
  }

  const gableCy = wh + Math.floor(rise * 0.42);
  const diamond = (cx, cy, r, fz, glass) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= r) {
          const col = Math.abs(dx) + Math.abs(dy) === r ? 0x2d1c10 : 0x16100c;
          M.set(cx + dx, cy + dy, fz, col);
          if (glass && Math.abs(dx) + Math.abs(dy) < r) M.set(cx + dx, cy + dy, fz, 0xffc866, 2);
        }
      }
  };
  diamond(Math.floor(xc), gableCy + 2, 5, front, true);

  const doorW = bigDoor ? 16 : 12;
  const doorH = bigDoor ? 22 : 18;
  const dx0 = Math.floor(xc - doorW / 2);
  M.carve(dx0, 5, front - 1, dx0 + doorW, 5 + doorH, front + 1);
  M.box(dx0 - 2, 5, front, dx0, 5 + doorH + 2, front + 2, beam);
  M.box(dx0 + doorW, 5, front, dx0 + doorW + 2, 5 + doorH + 2, front + 2, beam);
  M.box(dx0 - 2, 5 + doorH, front, dx0 + doorW + 2, 5 + doorH + 2, front + 2, beam);
  M.box(dx0, 5, front - 1, dx0 + doorW, 5 + doorH, front, (x, y, z) => {
    const lx = x - dx0;
    if (bigDoor && (lx === doorW / 2 - 1 || lx === doorW / 2)) return 0x24160b;
    let c = lx % 4 === 0 ? 0x4a2c16 : 0x5f3a1e;
    if (y === 5 + 5 || y === 5 + doorH - 6) c = 0x3a3d44;
    return J(c, x, y, z, seed, 0.07);
  });
  M.box(dx0 + doorW - 3, 5 + 9, front, dx0 + doorW - 1, 5 + 11, front + 1, 0xe6b73c);
  if (bigDoor) M.box(dx0 + 2, 5 + 9, front, dx0 + 4, 5 + 11, front + 1, 0xe6b73c);
  M.box(dx0 - 3, 0, front + 1, dx0 + doorW + 3, 2, front + 4, (x, y, z) => J(0x8f949b, x, y, z, seed, 0.06));
  M.box(dx0 - 1, 2, front + 1, dx0 + doorW + 1, 4, front + 3, (x, y, z) => J(0x9aa0a6, x, y, z, seed, 0.06));

  const windowAt = (wx, wy, fz, axis = 'z', dir = 1, shutterColor = shutters) => {
    const ww = 8;
    const hh = 9;
    const P = (a, b, depth, col, glow = false) => {
      if (axis === 'z') M.set(wx + a, wy + b, fz + depth * dir, col, glow);
      else M.set(fz + depth * dir, wy + b, wx + a, col, glow);
    };
    const C = (a, b, depth) => {
      if (axis === 'z') M.clear(wx + a, wy + b, fz + depth * dir);
      else M.clear(fz + depth * dir, wy + b, wx + a);
    };
    for (let a = -1; a <= ww; a++)
      for (let b = -1; b <= hh; b++) {
        const edge = a < 0 || a >= ww || b < 0 || b >= hh;
        if (edge) {
          P(a, b, 0, 0x2d1c10);
          P(a, b, 1, 0x3a2415);
          continue;
        }
        const mullion = a === ww / 2 - 1 || a === ww / 2 || b === Math.floor(hh / 2);
        C(a, b, 0);
        if (mullion) P(a, b, -1, 0x2d1c10);
        else P(a, b, -1, J(0xffc866, a, b, wx, seed, 0.08), 2);
      }
    for (const lo of [-4, ww + 1]) {
      for (let a = 0; a < 3; a++)
        for (let b = -1; b <= hh; b++) {
          const col = J(b % 3 === 0 ? shade(shutterColor, 0.85) : shutterColor, a, b, wx, seed, 0.06);
          P(lo + a, b, 1, col);
        }
    }
    if (flowers) {
      for (let a = -1; a <= ww; a++) for (let b = -3; b <= -2; b++) for (let d2 = 1; d2 <= 2; d2++) P(a, b, d2, J(0x6b4325, a, b, d2, seed, 0.08));
      for (let a = -1; a <= ww; a++) {
        const fc = [0xff6f91, 0xffd23f, 0xffffff, 0xb678f0][Math.floor(hash3(a, wx, 1, seed) * 4)];
        P(a, -1, 1, hash3(a, wx, 2, seed) > 0.4 ? fc : 0x3f9a4a);
        P(a, -1, 2, hash3(a, wx, 3, seed) > 0.5 ? fc : 0x3f9a4a);
      }
    }
  };
  const sideGap = (W - doorW) / 2;
  if (sideGap >= 10) {
    windowAt(ox + Math.floor(sideGap / 2) - 3, 11, front, 'z', 1);
    windowAt(ox + W - Math.floor(sideGap / 2) - 5, 11, front, 'z', 1);
  }
  for (let k = 0; k < Math.max(1, Math.floor(D / 20)); k++) {
    const zz = oz + 6 + k * 18;
    if (zz + 8 < oz + D - 2) {
      windowAt(zz, 12, ox - 0, 'x', -1);
      windowAt(zz, 12, ox + W - 1, 'x', 1);
    }
  }

  if (sign) {
    const letters = sign.split('');
    const bw = letters.length * 6 + 5;
    const bx0 = Math.floor(xc - bw / 2);
    const by0 = 5 + doorH + 4;
    M.box(bx0, by0, front + 1, bx0 + bw, by0 + 11, front + 3, (x, y, z) => J(y % 4 === 0 ? 0x4a2c16 : 0x5a3820, x, y, z, seed, 0.06));
    M.box(bx0 - 1, by0 - 1, front + 1, bx0 + bw + 1, by0, front + 4, 0x2d1c10);
    M.box(bx0 - 1, by0 + 11, front + 1, bx0 + bw + 1, by0 + 12, front + 4, 0x2d1c10);
    M.box(bx0 - 1, by0 - 1, front + 1, bx0, by0 + 12, front + 4, 0x2d1c10);
    M.box(bx0 + bw, by0 - 1, front + 1, bx0 + bw + 1, by0 + 12, front + 4, 0x2d1c10);
    letters.forEach((ch, i) => {
      const g = FONT[ch];
      if (!g) return;
      for (let r = 0; r < 7; r++)
        for (let cI = 0; cI < 5; cI++)
          if (g[r][cI] === 'X') {
            M.set(bx0 + 3 + i * 6 + cI, by0 + 9 - r, front + 3, J(0xe7d3a3, cI, r, i, seed, 0.06));
            M.set(bx0 + 3 + i * 6 + cI, by0 + 9 - r, front + 4, J(0xf0dfb2, cI, r, i, seed, 0.05));
          }
    });
  }

  if (chimney) {
    const cxh = Math.floor(xc) + Math.floor(W / 4);
    const czh = oz + 5;
    const top = ry(cxh) + 7;
    M.box(cxh, wh - 2, czh, cxh + 6, top, czh + 6, (x, y, z) => J([0x8a8f96, 0x777d84, 0x9aa0a6][Math.floor(hash3(x, y, z, 5) * 3)], x, y, z, seed, 0.06));
    M.box(cxh - 1, top, czh - 1, cxh + 7, top + 2, czh + 7, (x, y, z) => J(0x6d7178, x, y, z, seed, 0.06));
    M.box(cxh + 1, top, czh + 1, cxh + 5, top + 1, czh + 5, 0x1d1d20);
  }

  void rng;
  return bundle([[M, 0.125, ox + W / 2, 0, oz + D / 2]]);
}

export function buildTent(seed, main = 0x2f9a8e, accent = 0xf2ead3) {
  const L = 32;
  const Wd = 26;
  const H = 20;
  const M = new VoxelModel(Wd + 6, H + 8, L + 8);
  const xc = (Wd + 6) / 2;
  const z0 = 4;
  for (let z = z0; z < z0 + L; z++) {
    for (let y = 0; y < H; y++) {
      const half = ((H - y) / H) * (Wd / 2);
      for (let x = Math.floor(xc - half - 1); x <= Math.ceil(xc + half + 1); x++) {
        const dx = Math.abs(x + 0.5 - xc);
        if (dx > half + 0.3) continue;
        if (dx < half - 1.6 && y > 0) continue;
        let c = main;
        const along = Math.floor((z - z0) / 6) % 2 === 0;
        if (y < 3) c = shade(accent, 0.8);
        else if (along && false) c = accent;
        const ex = dx - half;
        const lz = z - z0;
        const dia = Math.abs(lz - L * 0.5) / 7 + Math.abs(y - H * 0.42) / 5.5;
        if (dia < 1.0 && dx > half - 1.8) c = dia > 0.62 ? accent : shade(accent, 1.0);
        if (dia < 0.5 && dx > half - 1.8) c = main;
        if (y === 3) c = shade(c, 0.85);
        void ex;
        M.set(x, y, z, J(c, x, y, z, seed, 0.06));
      }
    }
  }
  for (const zz of [z0 - 3, z0 + L + 2]) M.box(Math.floor(xc) - 1, H - 1, zz, Math.floor(xc) + 1, H + 3, zz + 2, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.08));
  M.box(Math.floor(xc) - 1, H, z0 - 2, Math.floor(xc) + 1, H + 1, z0 + L + 2, 0x6b4325);
  const fz = z0 + L - 1;
  for (let y = 0; y < H - 2; y++) {
    const half = ((H - y) / H) * (Wd / 2) * 0.62;
    for (let x = Math.floor(xc - half); x <= Math.ceil(xc + half); x++) {
      if (Math.abs(x + 0.5 - xc) <= half && y > 1) {
        M.clear(x, y, fz);
        M.clear(x, y, fz - 1);
        M.set(x, y, fz - 2, 0x1a1410);
      }
    }
  }
  for (const sx of [-1, 1]) {
    const px = Math.floor(xc + sx * (Wd / 2 + 2));
    for (const zz of [z0 + 2, z0 + L - 3]) M.box(px, 0, zz, px + 1, 4, zz + 1, 0x6b4325);
  }
  return bundle([[M, 0.125, xc, 0, z0 + L / 2]]);
}

export function buildStall(seed, awning = [0xc8402f, 0xf2ead3], goods = 'apple') {
  const M = new VoxelModel(40, 40, 28);
  const wood = (x, y, z) => J(0x7a4e2c, x, y, z, seed, 0.08);
  for (const [px, pz] of [[2, 2], [35, 2], [2, 23], [35, 23]]) M.box(px, 0, pz, px + 3, 26, pz + 3, wood);
  M.box(3, 0, 18, 37, 12, 25, (x, y, z) => {
    if (y > 9) return J(0x9a6b3d, x, y, z, seed, 0.06);
    return wood(x, y, z);
  });
  for (let x = 6; x < 34; x++) {
    for (let z = 19; z < 24; z++) {
      const k = Math.floor((x - 6) / 4);
      if (goods === 'potion') {
        if (x % 4 === 1) {
          const col = [0xff4d6a, 0x4ec8ff, 0x7d5cff, 0x5dffa0][k % 4];
          M.set(x, 12, z, 0xdde8f0);
          M.set(x, 13, z, col, true);
          M.set(x, 14, z, col, true);
          if (z === 21) M.set(x, 15, z, 0xc8b48a);
        }
      } else if (goods === 'apple') M.set(x, 12, z, J(k % 2 ? 0xdc3a3a : 0xf0a030, x, 12, z, seed, 0.1));
      else if (goods === 'pumpkin') M.set(x, 12, z, J(k % 2 ? 0xe8821e : 0x6aa84a, x, 12, z, seed, 0.1));
      else M.set(x, 12, z, J(k % 2 ? 0x8aa8c0 : 0xd0d8e0, x, 12, z, seed, 0.1));
      if (goods !== 'potion' && (x + z) % 3 === 0) M.set(x, 13, z, J(k % 2 ? 0xdc3a3a : 0xf0a030, x, 13, z, seed, 0.1));
    }
  }
  for (let z = 0; z < 28; z++) {
    const y = 26 + Math.floor((27 - z) * 0.42);
    for (let x = 0; x < 40; x++) {
      const stripe = Math.floor(x / 4) % 2 === 0 ? awning[0] : awning[1];
      M.set(x, y, z, J(stripe, x, y, z, seed, 0.05));
      M.set(x, y - 1, z, J(shade(stripe, 0.85), x, y - 1, z, seed, 0.05));
    }
  }
  for (let x = 0; x < 40; x++) {
    const stripe = Math.floor(x / 4) % 2 === 0 ? awning[0] : awning[1];
    if (x % 4 < 3) M.set(x, 26 - 1 + 0, 27, shade(stripe, 0.9));
    M.set(x, 25 + (x % 4 === 1 || x % 4 === 2 ? -1 : 0), 27, shade(stripe, 0.9));
  }
  return bundle([[M, 0.0625 * 1.6, 20, 0, 14]]);
}

export function buildCauldron(seed = 6) {
  const M = new VoxelModel(18, 16, 18);
  const iron = (x, y, z) => J(0x3e424a, x, y, z, seed, 0.07);
  const rad = [3.4, 4.6, 5.6, 6.1, 6.0, 5.2];
  lathe(M, 9, 9, 1, rad, iron);
  cyl(M, 9, 9, 6, 7, 4.3, 0x2dff9a, true);
  cyl(M, 9, 9, 7, 8, 3.1, 0xc8ffe4, true);
  for (const [x, z] of [[4, 4], [12, 4], [4, 12], [12, 12]]) M.box(x, 0, z, x + 2, 2, z + 2, iron);
  M.box(1, 4, 8, 3, 6, 11, iron);
  M.box(15, 4, 8, 17, 6, 11, iron);
  return bundle([[M, 0.07, 9, 0, 9]]);
}

export function buildGate(seed = 3) {
  const M = new VoxelModel(60, 68, 20);
  const stoneC = (x, y, z) => {
    const row = Math.floor(y / 4);
    const col = Math.floor((x + (row % 2) * 4) / 8);
    const base = [0x4a4e5a, 0x555966, 0x434754, 0x5f6370][Math.abs(col * 5 + row * 3) % 4];
    let c = J(base, x, y, z, seed, 0.07);
    if (y % 4 === 0) c = shade(c, 0.85);
    if (hash3(x >> 1, y >> 1, z >> 1, seed + 9) > 0.82 && y < 22) c = J(0x4f7c43, x, y, z, seed, 0.1);
    return c;
  };
  const glowC = 0xc27bff;
  const pillar = (x0) => {
    M.box(x0 - 2, 0, 3, x0 + 14, 5, 17, stoneC);
    M.box(x0, 5, 4, x0 + 12, 40, 16, stoneC);
    M.box(x0 - 1, 40, 3, x0 + 13, 44, 17, stoneC);
    for (let i = 0; i < 4; i++) {
      const gy = 9 + i * 7;
      M.box(x0 + 5, gy, 16, x0 + 7, gy + 4, 17, glowC, true);
      if (i % 2 === 0) M.box(x0 + 3, gy + 1, 16, x0 + 9, gy + 2, 17, glowC, true);
      else M.box(x0 + 4, gy + 3, 16, x0 + 8, gy + 4, 17, glowC, true);
    }
  };
  pillar(6);
  pillar(42);
  const cx = 30;
  const cy = 44;
  for (let y = cy; y < 66; y++)
    for (let x = 4; x < 56; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 20 && d >= 12) for (let z = 4; z < 16; z++) M.set(x, y, z, stoneC(x, y, z));
    }
  M.box(25, 60, 3, 35, 65, 17, stoneC);
  M.box(28, 61, 17, 32, 64, 18, glowC, true);
  M.box(29, 62, 17, 31, 63, 18, 0xffffff, true);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.15 + i * 0.175);
    const gx = Math.round(cx - Math.cos(a) * 16);
    const gy = Math.round(cy + Math.sin(a) * 16);
    M.box(gx, gy, 16, gx + 2, gy + 2, 17, glowC, true);
  }
  M.box(12, 5, 16, 20, 8, 19, stoneC);
  M.box(40, 5, 16, 48, 8, 19, stoneC);
  return bundle([[M, 0.125, 30, 0, 10]]);
}

/** Man-made hunter waygate: ashlar, brass bands, and a side console. Opening faces +Z. */
export function buildWaygate(seed = 11) {
  const M = new VoxelModel(56, 58, 24);
  const stone = (x, y, z) => {
    const row = Math.floor(y / 4);
    const col = Math.floor((x + (row % 2) * 3) / 5);
    const base = [0x6e675e, 0x7d756b, 0x5c564e, 0x8b8276][Math.abs(col + row * 3) % 4];
    let c = J(base, x, y, z, seed, 0.055);
    if (y % 4 === 0) c = shade(c, 0.8);
    if (hash3(x >> 2, 0, z >> 2, seed) > 0.86) c = shade(c, 0.72);
    return c;
  };
  const brass = (x, y, z) => J((x + y) % 3 === 0 ? 0xd7a24a : 0xa87432, x, y, z, seed, 0.05);
  const copper = (x, y, z) => J(y % 2 ? 0xc46a3a : 0x8d4e2c, x, y, z, seed, 0.06);
  M.box(1, 0, 1, 54, 3, 22, stone);
  for (let a = 0; a < 28; a++) {
    const t = (a / 28) * Math.PI * 2;
    const ix = Math.round(28 + Math.cos(t) * 16);
    const iz = Math.round(12 + Math.sin(t) * 7);
    M.set(ix, 3, iz, brass(ix, 3, iz));
    M.set(ix, 3, iz + 1, brass(ix, 3, iz));
  }
  const pillar = (x0) => {
    M.box(x0, 3, 5, x0 + 11, 7, 18, stone);
    M.box(x0 + 1, 7, 6, x0 + 10, 38, 17, stone);
    M.box(x0, 38, 5, x0 + 11, 42, 18, stone);
    for (const gy of [12, 20, 28, 36]) M.box(x0, gy, 5, x0 + 11, gy + 2, 18, brass);
    M.box(x0 + 4, 16, 17, x0 + 7, 18, 20, brass);
    M.box(x0 + 4, 22, 17, x0 + 7, 27, 20, brass);
    M.set(x0 + 5, 24, 19, 0x7ef6ff, true);
    M.set(x0 + 5, 24, 20, 0xe9fbff, true);
    M.box(x0 + 3, 30, 17, x0 + 8, 33, 20, copper);
  };
  pillar(3);
  pillar(42);
  const cx = 28;
  const cy = 40;
  for (let y = 36; y < 56; y++) {
    for (let x = 2; x < 54; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > 20 || d < 15) continue;
      const band = d > 18.6 || d < 16.2;
      for (let z = 6; z < 17; z++) M.set(x, y, z, band ? brass(x, y, z) : stone(x, y, z));
    }
  }
  M.box(24, 52, 5, 32, 57, 18, brass);
  M.box(26, 53, 17, 30, 56, 20, 0xd8fbff, true);
  cyl(M, 8, 8, 7, 18, 2.1, copper);
  cyl(M, 48, 8, 7, 18, 2.1, copper);
  cyl(M, 8, 8, 16, 18, 2.4, brass);
  cyl(M, 48, 8, 16, 18, 2.4, brass);
  M.box(44, 3, 16, 54, 15, 23, stone);
  M.box(45, 15, 16, 53, 17, 23, brass);
  M.box(46, 16, 20, 52, 18, 23, 0x39e7ff, true);
  M.box(47, 8, 22, 51, 12, 23, 0x1a2428);
  for (let i = 0; i < 4; i++) M.set(47 + i, 10, 22, i === 1 ? 0x7ef6ff : 0xc9a15a, true);
  return M.build(0.068, 28, 0, 12);
}

export function buildWindmill(seed = 2) {
  const M = new VoxelModel(40, 80, 40);
  const c = 20;
  for (let y = 0; y < 52; y++) {
    const r = 13 - y * 0.12;
    cyl(M, c, c, y, y + 1, r, (x, yy, z) => {
      if (yy < 12) {
        const row = Math.floor(yy / 3);
        const a = Math.floor((Math.atan2(z + 0.5 - c, x + 0.5 - c) + Math.PI) * 6 + (row % 2) * 0.5);
        return J([0x8a8f96, 0x9aa0a6, 0x7c8288][Math.abs(a + row) % 3], x, yy, z, seed, 0.07);
      }
      const beamV = Math.floor((Math.atan2(z + 0.5 - c, x + 0.5 - c) + Math.PI) * 6) % 3 === 0;
      return J(beamV ? 0x5a3a24 : 0xe9dfc8, x, yy, z, seed, 0.05);
    });
  }
  const doorY = 0;
  M.carve(c - 3, doorY, c + 8, c + 3, doorY + 10, c + 14);
  M.box(c - 3, 0, c + 10, c + 3, 10, c + 12, (x, y, z) => J(0x5f3a1e, x, y, z, seed, 0.07));
  for (let y = 0; y < 18; y++) {
    const r = 15 - y * 0.85;
    if (r < 1) break;
    cyl(M, c, c, 52 + y, 53 + y, r, (x, yy, z) => {
      const a = Math.floor((Math.atan2(z + 0.5 - c, x + 0.5 - c) + Math.PI) * 5);
      const row = Math.floor(yy / 2);
      return J([0xa84a32, 0xb9553a, 0x93402c, 0xc66443][Math.abs(a + row) % 4], x, yy, z, seed, 0.06);
    });
  }
  M.box(c - 1, 70, c - 1, c + 1, 73, c + 1, 0x4a3626);
  M.box(c - 4, 38, c + 11, c + 4, 46, c + 13, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.06));
  M.box(c - 2, 40, c + 11, c + 2, 44, c + 12, 0xffc866, 2);

  const hub = new VoxelModel(14, 14, 24);
  hub.box(4, 4, 0, 10, 10, 8, (x, y, z) => J(0x4a3626, x, y, z, seed, 0.06));
  hub.box(5, 5, 8, 9, 9, 12, (x, y, z) => J(0x6b4325, x, y, z, seed, 0.06));
  const sails = new VoxelModel(60, 60, 4);
  const sc = 30;
  for (let k = 0; k < 4; k++) {
    const ang = (k * Math.PI) / 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let t = 2; t < 28; t++) {
      const px = sc + dx * t;
      const py = sc + dy * t;
      sails.set(Math.floor(px), Math.floor(py), 1, J(0x5a3a24, t, k, 0, seed, 0.08));
      sails.set(Math.floor(px + 1), Math.floor(py), 1, J(0x5a3a24, t, k, 1, seed, 0.08));
    }
    const nx = -dy;
    const ny = dx;
    for (let t = 8; t < 28; t++)
      for (let s = 1; s < 8; s++) {
        const px = sc + dx * t + nx * s;
        const py = sc + dy * t + ny * s;
        const lattice = t % 4 === 0 || s % 4 === 0;
        sails.set(Math.floor(px), Math.floor(py), 2, J(lattice ? 0x6b4a2b : 0xf0e6cf, t, s, k, seed, 0.05));
      }
  }
  return {
    body: bundle([[M, 0.125, c, 0, c]]),
    hub: bundle([[hub, 0.125, 7, 7, 0]]),
    sails: bundle([[sails, 0.125, sc, sc, 0]]),
  };
}

export function buildCloud(seed) {
  const rng = new RNG(seed * 5 + 1);
  const M = new VoxelModel(34, 10, 20);
  const n = rng.int(4, 7);
  for (let i = 0; i < n; i++) {
    const cx = 6 + i * 4 + rng.int(-2, 2);
    const cz = 10 + rng.int(-3, 3);
    const rx = rng.range(4, 7);
    const rz = rng.range(3.5, 6);
    const ry = rng.range(1.8, 3.4);
    blob(
      M, cx, 3 + ry * 0.4, cz, rx, ry, rz,
      (x, y, z) => mix(0xdfe9f5, 0xffffff, clamp((y - 1) / 5, 0, 1)),
      seed + i, 0.15
    );
  }
  M.box(2, 1, 4, 32, 2, 16, (x, y, z) => (M.has(x, y + 1, z) ? 0xcfdcec : null));
  return bundle([[M, 1.0, 17, 0, 10]]);
}


export function buildForge(seed = 3) {
  const M = new VoxelModel(32, 40, 22);
  const stone = (x, y, z) => J(((x >> 1) + (y >> 1) + (z >> 1)) % 2 ? 0x7d7f86 : 0x6b6e75, x, y, z, seed, 0.08);
  const dark = (x, y, z) => J(0x2c2a2e, x, y, z, seed, 0.06);
  M.box(3, 0, 2, 29, 4, 20, stone);
  M.box(4, 4, 3, 28, 15, 19, stone);
  M.carve(9, 5, 11, 23, 12, 19);
  M.box(9, 5, 3, 23, 12, 11, dark);
  M.box(9, 4, 11, 23, 5, 19, dark);
  M.box(10, 5, 12, 22, 7, 19, (x, y, z) => ((x + z) % 3 === 0 ? 0xffb347 : (x * 7 + z) % 4 === 0 ? 0xff5a1a : 0xd92a0a), true);
  for (let i = 0; i < 9; i++) {
    const fx = 10 + ((i * 5) % 11);
    const fz = 12 + ((i * 3) % 6);
    const h = 3 + (i % 4);
    M.box(fx, 7, fz, fx + 2, 7 + h, fz + 2, (x, y) => (y > 8 ? 0xffe27a : 0xff8a1a), true);
  }
  M.box(7, 12, 18, 25, 14, 20, (x, y, z) => J(0x4b3220, x, y, z, seed, 0.08));
  M.box(5, 15, 4, 27, 19, 18, stone);
  M.box(7, 19, 6, 25, 24, 16, stone);
  M.box(11, 24, 8, 21, 40, 14, stone);
  M.box(10, 38, 7, 22, 40, 15, (x, y, z) => J(0x55575e, x, y, z, seed, 0.06));
  M.box(12, 39, 9, 20, 40, 13, 0x1a1618);
  M.box(0, 2, 7, 4, 8, 15, (x, y, z) => J(0x6a4527, x, y, z, seed, 0.07));
  M.box(0, 6, 8, 3, 8, 14, (x, y, z) => J(0x8a6a4a, x, y, z, seed, 0.07));
  M.box(-1 + 1, 3, 10, 1, 5, 12, 0x3a3d44);
  M.box(29, 4, 8, 32, 14, 10, 0x3a3d44);
  M.box(29, 12, 14, 32, 14, 16, 0x3a3d44);
  M.box(30, 11, 9, 32, 12, 15, 0x4a4e57);
  return bundle([[M, 0.0625, 16, 0, 11]]);
}

export function buildAnvil(seed = 4) {
  const M = new VoxelModel(18, 16, 10);
  const iron = (x, y, z) => J(0x474b54, x, y, z, seed, 0.07);
  M.box(5, 0, 2, 13, 3, 8, iron);
  M.box(6, 3, 3, 12, 7, 7, iron);
  M.box(3, 7, 2, 15, 10, 8, (x, y, z) => (y === 9 ? J(0x9298a4, x, y, z, seed, 0.05) : iron(x, y, z)));
  M.box(0, 8, 3, 3, 10, 7, iron);
  M.box(1, 9, 4, 3, 10, 6, iron);
  M.box(6, 10, 4, 13, 11, 6, 0xff7a2a, true);
  M.box(13, 10, 4, 15, 11, 6, 0xffb347, true);
  return bundle([[M, 0.0625, 9, 0, 5]]);
}
