import { VoxelModel, hash3, jitter, mix, shade } from '../engine/voxel.js';
import { bundle } from './models.js';

const J = (c, x, y, z, s = 0, a = 0.07) => jitter(c, a, hash3(x, y, z, s));

function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.3) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1 + (hash3(x, y, z, seed) - 0.5) * noise) {
          const c = typeof color === 'function' ? color(x, y, z, d) : color;
          if (c !== null && c !== undefined) m.set(x, y, z, c);
        }
      }
}

const ORES = {
  copper: { vein: 0xe0823a, hi: 0xffb86a, lo: 0xa8501e, patina: 0x4aa58a, spark: 0xffd9a0 },
  tin: { vein: 0xc4d2e8, hi: 0xf4f8ff, lo: 0x7f8ca6, patina: 0x8fb4d8, spark: 0xffffff },
};

const NEIGHBORS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

/** Chunky boulder with ore seams. `depleted` leaves a dull, cracked stump. */
export function buildOreRock(kind, seed = 1, depleted = false) {
  const ore = ORES[kind];
  const M = new VoxelModel(24, 20, 24);
  const stone = (x, y, z, d) => {
    const t = hash3(x >> 1, y >> 1, z >> 1, seed);
    let c = mix(0x6f747d, 0x8e939c, t);
    if (y < 3) c = mix(c, 0x55524f, 0.5);
    if (d > 0.78 && y > 6) c = shade(c, 1.1);
    return J(c, x, y, z, seed, 0.07);
  };
  const dull = (x, y, z) => J(mix(0x625f5c, 0x7a7774, hash3(x >> 1, y >> 1, z >> 1, seed + 3)), x, y, z, seed, 0.06);
  const pick = depleted ? dull : stone;
  const top = depleted ? 5.2 : 7.4;
  blob(M, 12, top * 0.58, 12, 8.4, top, 7.8, pick, seed, 0.34);
  blob(M, 7.6, top * 0.4, 10.2, 4.8, top * 0.62, 4.6, pick, seed + 1, 0.3);
  blob(M, 16.4, top * 0.44, 13.6, 4.4, top * 0.66, 4.2, pick, seed + 2, 0.3);
  blob(M, 11.5, top * 0.35, 17.2, 4.2, top * 0.5, 3.4, pick, seed + 3, 0.3);
  if (!depleted) blob(M, 11.6, top * 1.2, 11, 4.6, top * 0.55, 4.2, pick, seed + 4, 0.32);

  const surface = [];
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        if (!M.has(x, y, z) || y < 2) continue;
        if (NEIGHBORS.some(([a, b, c]) => !M.has(x + a, y + b, z + c))) surface.push([x, y, z]);
      }

  if (depleted) {
    for (const [x, y, z] of surface) {
      if (hash3(x, y, z, seed + 21) > 0.93) M.set(x, y, z, shade(dull(x, y, z), 0.55));
    }
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + seed;
      blob(M, 12 + Math.cos(a) * 10, 1, 12 + Math.sin(a) * 9, 1.6, 1.2, 1.5, (x, y, z) => J(0x6b6865, x, y, z, seed + k, 0.08), seed + 30 + k, 0.2);
    }
    return bundle([[M, 0.08, 12, 0, 12]]);
  }

  const seams = Math.min(9, 6 + (seed % 3));
  const used = [];
  for (let k = 0; k < seams; k++) {
    let best = null;
    for (let tries = 0; tries < 30; tries++) {
      const cand = surface[Math.floor(hash3(k, tries, seed, 77) * surface.length)];
      if (!cand) continue;
      if (cand[1] < 5) continue;
      if (used.some((u) => Math.hypot(u[0] - cand[0], u[1] - cand[1], u[2] - cand[2]) < 4.5)) continue;
      best = cand;
      break;
    }
    if (!best) continue;
    used.push(best);
    const [bx, by, bz] = best;
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = bx + dx;
          const y = by + dy;
          const z = bz + dz;
          const d = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (d > 2 || (d === 2 && hash3(x, y, z, seed + 40) > 0.6)) continue;
          if (M.has(x, y, z)) {
            const sh = dy > 0 ? ore.hi : dy < 0 ? ore.lo : ore.vein;
            M.set(x, y, z, J(sh, x, y, z, seed + k, 0.06));
          } else if (d <= 1) {
            M.set(x, y, z, J(dy >= 0 ? ore.hi : ore.vein, x, y, z, seed + k + 9, 0.05));
          }
        }
    M.set(bx, by + 1, bz, ore.spark, true);
    for (const [a, b, c] of NEIGHBORS) {
      if (M.has(bx + a * 2, by + b * 2, bz + c * 2) && hash3(a, b, c, seed + k) > 0.5) M.set(bx + a * 2, by + b * 2, bz + c * 2, J(ore.patina, bx, by, bz, 5, 0.1));
    }
  }
  return bundle([[M, 0.08, 12, 0, 12]]);
}

/** Cart on a short pair of rails, heaped with copper and tin. Long axis on x. */
export function buildMineCart(seed = 5) {
  const M = new VoxelModel(34, 22, 22);
  const wood = (x, y, z) => J(y % 4 === 0 ? 0x7a4c28 : 0x946036, x, y, z, seed, 0.08);
  const iron = (x, y, z) => J(0x3b3e46, x, y, z, seed + 1, 0.06);
  for (const z of [6, 15]) for (let x = 0; x < 34; x++) M.set(x, 1, z, iron(x, 1, z));
  for (let x = 0; x < 34; x += 4) M.box(x, 0, 4, x + 1, 1, 18, J(0x5a3a20, x, 0, 0, seed + 7, 0.1));
  M.box(5, 4, 5, 29, 12, 17, (x, y, z) => {
    const inside = x > 6 && x < 28 && z > 6 && z < 16 && y > 4;
    if (inside) return null;
    if (y === 4 || y === 11 || x === 5 || x === 28) return iron(x, y, z);
    return wood(x, y, z);
  });
  M.box(6, 4, 6, 28, 5, 16, wood);
  for (const [cx, cz] of [[8, 3], [26, 3], [8, 18], [26, 18]]) {
    for (let y = 1; y < 6; y++)
      for (let x = cx - 2; x <= cx + 2; x++) {
        const dx = x - cx;
        const dy = y - 3;
        if (dx * dx + dy * dy > 6) continue;
        M.set(x, y, cz, dx === 0 && dy === 0 ? 0xb8bcc6 : iron(x, y, cz));
        M.set(x, y, cz + (cz < 10 ? 1 : -1), iron(x, y, cz));
      }
  }
  for (let x = 7; x < 28; x++)
    for (let z = 7; z < 16; z++) {
      const dx = (x - 17.5) / 11;
      const dz = (z - 11) / 5;
      const h = Math.round(5 + (1 - dx * dx - dz * dz * 0.8) * 5 + (hash3(x, z, 0, seed) - 0.5) * 2.4);
      for (let y = 5; y < 5 + Math.max(0, h - 4); y++) {
        const roll = hash3(x, y, z, seed + 3);
        const cu = hash3(x >> 1, z >> 1, 0, seed + 4) > 0.5;
        const base = roll > 0.55 ? (cu ? ORES.copper.vein : ORES.tin.vein) : roll > 0.25 ? 0x7d828b : 0x5f646d;
        M.set(x, y + 4, z, J(base, x, y, z, seed + 5, 0.1), roll > 0.97);
      }
    }
  M.box(2, 6, 9, 5, 7, 12, iron(0, 0, 0));
  return bundle([[M, 0.0625, 17, 0, 11]]);
}

/** Timber frame over the head of the ramp. Opening faces along x; spans z. */
export function buildMineFrame(seed = 3) {
  const M = new VoxelModel(10, 34, 46);
  const post = (x, y, z) => J(y % 6 === 0 ? 0x5a381d : 0x754826, x, y, z, seed, 0.08);
  const beam = (x, y, z) => J(0x6a4226, x, y, z, seed + 1, 0.08);
  for (const z0 of [3, 38]) {
    M.box(2, 0, z0, 7, 28, z0 + 5, post);
    M.box(1, 0, z0 - 1, 8, 3, z0 + 6, (x, y, z) => J(0x4a3220, x, y, z, seed + 2, 0.08));
  }
  M.box(1, 27, 1, 8, 31, 45, beam);
  M.box(2, 31, 6, 7, 33, 40, (x, y, z) => J(0x7a4e2c, x, y, z, seed + 3, 0.08));
  for (let k = 0; k < 7; k++) {
    M.set(3, 26 - k, 8 + k, beam(3, 26 - k, 8 + k));
    M.set(4, 26 - k, 8 + k, beam(4, 26 - k, 8 + k));
    M.set(5, 26 - k, 8 + k, beam(5, 26 - k, 8 + k));
    M.set(3, 26 - k, 37 - k, beam(3, 26 - k, 37 - k));
    M.set(4, 26 - k, 37 - k, beam(4, 26 - k, 37 - k));
    M.set(5, 26 - k, 37 - k, beam(5, 26 - k, 37 - k));
  }
  M.box(4, 20, 22, 6, 27, 24, 0x2f3238);
  M.box(3, 15, 21, 7, 20, 25, (x, y, z) => (y === 15 || y === 19 ? 0xffd27a : 0xffb347), 1);
  M.box(4, 20, 22, 6, 21, 24, 0x2f3238);
  return bundle([[M, 0.0625, 5, 0, 23]]);
}

/** Heap of loose ore for the pit rim. */
export function buildOrePile(seed = 7) {
  const M = new VoxelModel(22, 12, 18);
  blob(M, 11, 3, 9, 8, 4.4, 6.2, (x, y, z) => {
    const r = hash3(x, y, z, seed);
    const cu = hash3(x >> 2, z >> 2, 0, seed + 1) > 0.5;
    return J(r > 0.6 ? (cu ? ORES.copper.vein : ORES.tin.vein) : r > 0.3 ? 0x7d828b : 0x5f646d, x, y, z, seed, 0.1);
  }, seed, 0.5);
  return bundle([[M, 0.0625, 11, 0, 9]]);
}

/** A wooden pier. Long axis on x, origin at the centre of the walkway. Deck top sits at `deckY`. */
export function buildDock({ length = 11.1, width = 2.4, baseY = -1.5, deckY = 1, size = 0.125 } = {}) {
  const sx = Math.round(length / size) + 4;
  const sz = Math.round(width / size) + 6;
  const deck = Math.round((deckY - baseY) / size);
  const sy = deck + 22;
  const M = new VoxelModel(sx, sy, sz);
  const x0 = 2;
  const x1 = sx - 2;
  const z0 = 3;
  const z1 = sz - 3;
  const plank = (x, y, z, s) => {
    const row = Math.floor((x - x0) / 4);
    const tone = [0x9a6c3f, 0x8a5e35, 0xa5774a, 0x7f5530][hash3(row, 0, 1, 9) * 4 | 0];
    return J(tone, x, y, z + row * 3, s, 0.07);
  };
  for (const zz of [z0 + 2, Math.floor((z0 + z1) / 2), z1 - 3]) M.box(x0, deck - 5, zz, x1, deck - 2, zz + 2, (x, y, z) => J(0x4f3220, x, y, z, 3, 0.1));
  for (let x = x0; x < x1; x++) {
    if ((x - x0) % 4 === 3) continue;
    for (let z = z0; z < z1; z++) {
      M.set(x, deck - 2, z, plank(x, deck - 2, z, 4));
      M.set(x, deck - 1, z, plank(x, deck - 1, z, 5));
      if (hash3(x, z, 0, 12) > 0.985) M.set(x, deck - 1, z, 0x4a2f1a);
    }
    if ((x - x0) % 4 === 1) {
      M.set(x, deck - 1, z0 + 1, 0x35261a);
      M.set(x, deck - 1, z1 - 2, 0x35261a);
    }
  }
  const postAt = (px, pz, top) => {
    M.box(px, 0, pz, px + 3, top, pz + 3, (x, y, z) => J(y % 7 === 0 ? 0x3e2a18 : 0x5e3d22, x, y, z, 6, 0.09));
    M.box(px - 1, top, pz - 1, px + 4, top + 1, pz + 4, 0x7a4e2c);
    for (let y = 0; y < Math.min(top, deck - 6); y++) if (y % 5 === 0) M.box(px, y, pz, px + 3, y + 1, pz + 3, 0x26301f);
  };
  const post = deck + 9;
  const spots = [];
  for (let x = x0 + 1; x < x1 - 2; x += 22) spots.push(x);
  spots.push(x1 - 5);
  for (const px of spots) {
    postAt(px, z0 - 2, post);
    postAt(px, z1 - 1, post);
  }
  for (const zz of [z0 - 1, z1]) {
    for (let a = 0; a < spots.length - 1; a++) {
      const xa = spots[a] + 3;
      const xb = spots[a + 1];
      for (let x = xa; x < xb; x++) {
        const t = (x - xa) / (xb - xa);
        const sag = Math.round(Math.sin(t * Math.PI) * 3);
        M.set(x, post - 3 - sag, zz, J(0xd6c394, x, 0, 0, 14, 0.06));
        M.set(x, post - 4 - sag, zz, J(0xb59f6e, x, 0, 0, 15, 0.06));
      }
    }
  }
  const endX = spots[0];
  for (const pz of [z0 - 2, z1 - 1]) {
    M.box(endX, post + 1, pz + 1, endX + 1, post + 4, pz + 2, 0x2f3238);
    M.box(endX - 1, post + 4, pz, endX + 2, post + 8, pz + 3, (x, y, z) => (y === post + 4 || y === post + 7 ? 0x2f3238 : 0xffc766), 1);
    M.box(endX - 1, post + 8, pz, endX + 2, post + 9, pz + 3, 0x2f3238);
  }
  const bucketX = x1 - 12;
  const bucketZ = z0 + 3;
  for (let y = 0; y < 7; y++)
    for (let x = -3; x <= 3; x++)
      for (let z = -3; z <= 3; z++) {
        const d = Math.hypot(x, z);
        if (d > 3.2 - y * 0.1) continue;
        if (d < 2.2 - y * 0.1 && y > 0 && y < 6) continue;
        M.set(bucketX + x, deck + y, bucketZ + z, J(y === 2 || y === 5 ? 0x4a4e58 : 0x6b4a2c, x, y, z, 17, 0.07));
      }
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (Math.hypot(x, z) < 2.6) M.set(bucketX + x, deck + 5, bucketZ + z, J(0x4fa8d8, x, 0, z, 18, 0.1));
  for (let k = 0; k < 3; k++) M.box(bucketX + 4 + k * 4, deck, bucketZ - 3, bucketX + 7 + k * 4, deck + 4, bucketZ + 1, (x, y, z) => J(y % 2 ? 0xb88a52 : 0xa87a46, x, y, z, 20 + k, 0.08));
  for (let a = 0; a < 40; a++) {
    const ang = a * 0.4;
    const r = 2.6 + a * 0.05;
    M.set(Math.round(bucketX - 10 + Math.cos(ang) * r), deck + (a >> 4), Math.round(z1 - 6 + Math.sin(ang) * r), J(0xc9b583, a, 0, 0, 22, 0.06));
  }
  return bundle([[M, size, Math.floor(sx / 2), 0, Math.floor(sz / 2)]]);
}

/* ------------------------------------------------------------------ */
/* Goods                                                               */
/* ------------------------------------------------------------------ */

function oreChunk(kind) {
  const ore = ORES[kind];
  const M = new VoxelModel(16, 14, 16);
  const seed = kind === 'copper' ? 4 : 9;
  blob(M, 8, 5, 8, 6, 4.4, 5.6, (x, y, z) => J(mix(0x6f747d, 0x8e939c, hash3(x >> 1, y >> 1, z >> 1, seed)), x, y, z, seed, 0.07), seed, 0.4);
  blob(M, 5, 3, 9, 3.6, 3, 3.4, (x, y, z) => J(mix(0x626770, 0x80858e, hash3(x >> 1, y >> 1, z >> 1, seed + 1)), x, y, z, seed + 1, 0.07), seed + 1, 0.4);
  const spots = [[8, 9, 7], [11, 6, 9], [5, 7, 5], [9, 5, 12], [4, 4, 9]];
  for (const [bx, by, bz] of spots) {
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 2) continue;
          if (!M.has(bx + dx, by + dy, bz + dz)) continue;
          M.set(bx + dx, by + dy, bz + dz, J(dy > 0 ? ore.hi : dy < 0 ? ore.lo : ore.vein, bx + dx, by + dy, bz + dz, seed, 0.06));
        }
  }
  M.set(8, 10, 7, ore.spark, true);
  return [M, 0.06, 8, 0, 8];
}

function shrimpModel() {
  const M = new VoxelModel(24, 20, 10);
  const body = 0xffb09a;
  const band = 0xe8806a;
  const belly = 0xffd9c8;
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = -0.35 + t * 3.0;
    const cx = 11 + Math.cos(a) * 6.6;
    const cy = 9 + Math.sin(a) * 6.2;
    const r = 2.9 - t * 1.5;
    for (let z = 0; z < 10; z++)
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
          const dz = z + 0.5 - 5;
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy, dz * 1.15);
          if (d > r) continue;
          const seg = Math.floor(t * 9) % 2 === 0;
          let c = seg ? body : band;
          if (y + 0.5 < cy - r * 0.35 && t > 0.2) c = belly;
          if (t > 0.9) c = 0xff8a5a;
          M.set(x, y, z, J(c, x, y, z, 31, 0.05));
        }
  }
  const hx = 11 + Math.cos(-0.35) * 6.6;
  const hy = 9 + Math.sin(-0.35) * 6.2;
  for (const dz of [-1, 1]) {
    M.set(Math.round(hx + 2), Math.round(hy + 1), 5 + dz * 2, 0x15120f);
    M.set(Math.round(hx + 2), Math.round(hy + 2), 5 + dz * 2, 0xffffff);
    for (let k = 0; k < 9; k++) M.set(Math.round(hx + 3 + k * 0.9), Math.round(hy + 2 + k * 0.45), 5 + dz * 3, J(0xe8806a, k, 0, dz, 33, 0.05));
  }
  const tx = 11 + Math.cos(2.65) * 6.6;
  const ty = 9 + Math.sin(2.65) * 6.2;
  for (const dz of [-3, -2, 2, 3]) for (let k = 0; k < 3; k++) M.set(Math.round(tx - 1 - k * 0.5), Math.round(ty - 1 - k), 5 + dz, 0xff7a4a);
  for (let k = 0; k < 6; k++) M.set(Math.round(12 + Math.cos(0.4 + k * 0.45) * 5.4), Math.round(9 + Math.sin(0.4 + k * 0.45) * 5.2 - 2.4), 3, J(0xf0c0a8, k, 0, 0, 34, 0.05));
  return [M, 0.06, 12, 4, 5];
}

function troutModel() {
  const M = new VoxelModel(36, 16, 10);
  const L = 26;
  for (let x = 0; x < L; x++) {
    const t = x / (L - 1);
    const rh = 5.6 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.7) + 0.6;
    const rz = rh * 0.55;
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 10; z++) {
        const dy = y + 0.5 - 8;
        const dz = z + 0.5 - 5;
        if ((dy / rh) ** 2 + (dz / rz) ** 2 > 1) continue;
        const u = dy / rh;
        let c = u > 0.45 ? 0x6f8244 : u > 0.12 ? 0x93a678 : u > -0.15 ? 0xd9a0a8 : u > -0.5 ? 0xc3d0d2 : 0xeee8d2;
        if (u > 0.12 && hash3(x, y, z, 40) > 0.88) c = 0x2d2a22;
        if (x > L - 4) c = shade(c, 0.88);
        M.set(x + 6, y, z, J(c, x, y, z, 41, 0.04));
      }
  }
  for (let k = 0; k < 8; k++) {
    for (let z = 3; z < 7; z++) {
      M.set(6 + 9 + k, 8 + 5 + Math.round(2 - Math.abs(k - 3.5) * 0.7), z, J(0x7d7a4a, k, 0, z, 42, 0.05));
    }
  }
  for (let k = 0; k < 7; k++) {
    for (let z = 4; z < 6; z++) {
      M.set(6 + 12 + k, 8 - 5 - Math.round(1.5 - Math.abs(k - 3) * 0.4), z, J(0xb5a36a, k, 1, z, 43, 0.05));
    }
  }
  for (let k = 0; k < 6; k++) {
    for (const z of [4, 5]) {
      M.set(6 + L - 1 + 1 + Math.floor(k * 0.7), 8 + k, z, J(0x8c7d44, k, 0, z, 44, 0.05));
      M.set(6 + L - 1 + 1 + Math.floor(k * 0.7), 8 - k - 1, z, J(0x8c7d44, k, 1, z, 45, 0.05));
    }
  }
  for (const z of [1.2, 8.2]) {
    M.set(6 + 3, 9, z | 0, 0xffffff);
    M.set(6 + 3, 10, z | 0, 0x15120f);
    M.set(6 + 4, 10, z | 0, 0x15120f);
  }
  for (const z of [3, 6]) {
    for (let k = 0; k < 4; k++) M.set(6 + 7 + k, 6 - Math.floor(k * 0.4), z, J(0xc9b87a, k, 2, z, 46, 0.05));
  }
  return [M, 0.06, 18, 8, 5];
}

const GOODS_MODELS = {
  copper_ore: () => oreChunk('copper'),
  tin_ore: () => oreChunk('tin'),
  shrimp: shrimpModel,
  trout: troutModel,
};

export function hasGoodsModel(id) {
  return !!GOODS_MODELS[id];
}

/** [model, size, ox, oy, oz] for a carried good, so callers pick the mesh builder. */
export function goodsVoxels(id) {
  return GOODS_MODELS[id]();
}
