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
  const M = new VoxelModel(40, 16, 10);
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
  fishTail(M, 6 + L, 8, [4, 5], 6, 6, 6, 0x8c7d44, 44);
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

/**
 * Shared body for the river and ice fish. Head at the low x end, tail at the high x end,
 * the way the trout is built, so the leaping fish all face the same way.
 */
function fishBody(o) {
  const x0 = 6;
  const sy = o.rh * 2 + 8;
  const sz = o.sz || 10;
  const M = new VoxelModel(o.L + (o.tailLen || 8) + 14, sy, sz);
  const cy = Math.floor(sy / 2);
  const cz = sz / 2;
  for (let x = 0; x < o.L; x++) {
    const t = x / (o.L - 1);
    const rh = o.prof(t);
    const rz = Math.max(0.8, rh * o.wide);
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++) {
        const dy = y + 0.5 - cy;
        const dz = z + 0.5 - cz;
        if ((dy / rh) ** 2 + (dz / rz) ** 2 > 1) continue;
        const c = o.paint(dy / rh, t, x, y, z, dz / rz);
        M.set(x + x0, y, z, J(c, x, y, z, o.seed, 0.04));
      }
  }
  return { M, x0, cy, cz, sz };
}

function fishEyes(M, x, y, ring = 0x15120f, white = 0xffffff) {
  for (const dir of [-1, 1]) {
    for (let z = dir < 0 ? 0 : M.sz - 1; z >= 0 && z < M.sz; z -= dir) {
      if (!M.has(x, y, z)) continue;
      M.set(x, y, z, white);
      M.set(x + 1, y, z, ring);
      break;
    }
  }
}

function fishFin(M, x, y, len, col, dir, seed, zs, rise = 0.6) {
  for (let k = 0; k < len; k++)
    for (const z of zs) M.set(x + k, y + dir * (1 + Math.round(Math.sin((k / (len - 1)) * Math.PI) * len * rise)), z, J(col, k, y, z, seed, 0.05));
}

/** A filled, forked tail. `up` and `down` are the lobe heights; a taller upper lobe makes it shark-like. */
function fishTail(M, x, cy, zs, len, up, down, col, seed) {
  for (let k = 0; k < len; k++) {
    const f = (k + 1) / len;
    const hu = Math.max(1, Math.round(1 + (up - 1) * f));
    const hd = Math.max(1, Math.round(1 + (down - 1) * f));
    const cut = k > len * 0.45 ? Math.round(((k - len * 0.45) / (len * 0.55)) * Math.min(up, down) * 0.7) : 0;
    for (let d = cut; d < hu; d++) for (const z of zs) M.set(x + k, cy + d, z, J(col, k, d, z, seed, 0.06));
    for (let d = cut; d < hd; d++) for (const z of zs) M.set(x + k, cy - 1 - d, z, J(shade(col, 0.92), k, d, z, seed + 1, 0.06));
  }
}

function pikeMinnowModel() {
  const L = 24;
  const { M, x0, cy, cz } = fishBody({
    L, rh: 4, wide: 0.6, seed: 51,
    prof: (t) => 3.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.62) + 0.7,
    paint: (u, t, x, y, z) => {
      if (u > 0.4) return t > 0.7 && hash3(x, y, z, 52) > 0.8 ? 0x3a3a1e : 0x6b6a32;
      if (u > 0.05) return t > 0.55 && u < 0.28 ? 0x4a4a28 : 0xb4b27a;
      if (u > -0.4) return 0xd8d4a6;
      return 0xf2eed8;
    },
  });
  for (let k = 0; k < 8; k++) for (const z of [4, 5]) M.set(x0 + 14 + k, cy + 3 + Math.round(1.6 - Math.abs(k - 3.5) * 0.5), z, J(0x8a8444, k, 0, z, 53, 0.05));
  fishFin(M, x0 + 14, cy - 2, 6, 0xcdb87a, -1, 54, [4, 5], 0.3);
  for (const dz of [2, 7]) for (let k = 0; k < 3; k++) M.set(x0 + 8 + k, cy - 1 - Math.floor(k * 0.4), dz, 0xd8c88a);
  for (let z = 3; z <= 6; z++) M.set(x0, cy - 1, z, 0x2a2018);
  fishTail(M, x0 + L, cy, [4, 5], 6, 5, 5, 0xb4a460, 55);
  fishEyes(M, x0 + 3, cy + 1);
  return [M, 0.06, 16, cy, cz];
}

function salmonModel() {
  const L = 31;
  const { M, x0, cy, cz } = fishBody({
    L, rh: 6, wide: 0.55, seed: 61,
    prof: (t) => 5.4 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.78)), 0.66) + 0.7,
    paint: (u, t, x, y, z) => {
      if (u > 0.5) return hash3(x, y, z, 62) > 0.86 ? 0x1a2428 : 0x3c5a6a;
      if (u > 0.1) return hash3(x, y, z, 63) > 0.9 && t > 0.2 ? 0x1f2a30 : 0x8aa4b0;
      if (u > -0.12) return t > 0.25 && t < 0.85 ? 0xe49aa0 : 0xcad8dc;
      if (u > -0.5) return 0xd6e2e4;
      return 0xf6f0e4;
    },
  });
  for (let k = 0; k < 8; k++) for (const z of [4, 5]) M.set(x0 + 12 + k, cy + 5 + Math.round(2.2 - Math.abs(k - 3.5) * 0.6), z, J(0x4a6674, k, 0, z, 64, 0.05));
  for (const z of [4, 5]) for (let k = 0; k < 2; k++) M.set(x0 + L - 8 + k, cy + 4, z, 0x364e5a);
  fishFin(M, x0 + 14, cy - 5, 6, 0xd9a0a0, -1, 65, [4, 5], 0.3);
  for (const dz of [2, 7]) for (let k = 0; k < 5; k++) M.set(x0 + 7 + k, cy - 2 - Math.floor(k * 0.5), dz, J(0xe4b0b0, k, 2, dz, 66, 0.05));
  M.set(x0 - 1, cy - 1, 4, 0xcfd9dc);
  M.set(x0 - 1, cy - 1, 5, 0xcfd9dc);
  M.set(x0, cy - 3, 4, 0x2a1a1c);
  M.set(x0, cy - 3, 5, 0x2a1a1c);
  M.set(x0 + 1, cy - 4, 4, 0x2a1a1c);
  M.set(x0 + 1, cy - 4, 5, 0x2a1a1c);
  fishTail(M, x0 + L, cy, [4, 5], 8, 7, 7, 0x445e6c, 67);
  fishEyes(M, x0 + 4, cy + 1);
  return [M, 0.06, 20, cy, cz];
}

function pikeModel() {
  const L = 40;
  const { M, x0, cy, cz } = fishBody({
    L, rh: 6, wide: 0.58, seed: 71,
    prof: (t) => 4.7 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.55) + 0.9,
    paint: (u, t, x, y, z, w) => {
      if (u > 0.42) return 0x4a6a2c;
      if (u > -0.2) {
        const dot = hash3(x >> 1, y, z >> 1, 72) > 0.7 && t > 0.14 && Math.abs(w) > 0.3;
        return dot ? 0xe2dc9c : 0x6a8a3a;
      }
      return u > -0.55 ? 0xb8c490 : 0xeee8cc;
    },
  });
  for (let k = 0; k < 8; k++) for (const z of [4, 5]) M.set(x0 + L - 12 + k, cy + 3 + Math.round(1.8 - Math.abs(k - 3.5) * 0.45), z, J(0xb5662e, k, 0, z, 73, 0.05));
  fishFin(M, x0 + L - 12, cy - 3, 7, 0xb5662e, -1, 74, [4, 5], 0.25);
  for (const dz of [2, 7]) for (let k = 0; k < 4; k++) M.set(x0 + 9 + k, cy - 3 - Math.floor(k * 0.4), dz, J(0xc9783a, k, 3, dz, 75, 0.05));
  for (let k = 1; k <= 4; k++) for (const z of [4, 5]) M.set(x0 - k, cy - 1, z, J(0x5a7a34, k, 0, z, 76, 0.05));
  for (let k = 1; k <= 3; k++) for (const z of [4, 5]) M.set(x0 - k, cy - 2, z, J(0xcfd2a0, k, 1, z, 77, 0.05));
  for (const z of [3, 6]) for (let k = 1; k < 5; k += 2) M.set(x0 + k - 2, cy - 2, z, 0xf4f0e0);
  fishTail(M, x0 + L, cy, [4, 5], 7, 6, 6, 0x8a5a2a, 78);
  fishEyes(M, x0 + 4, cy + 2, 0x15120f, 0xf0d070);
  return [M, 0.055, 22, cy, cz];
}

function sturgeonModel() {
  const L = 46;
  const { M, x0, cy, cz } = fishBody({
    L, rh: 6, wide: 0.78, sz: 12, seed: 81,
    prof: (t) => 5.1 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.6) + 0.8,
    paint: (u, t, x, y, z, w) => {
      if (u > 0.55) return hash3(x, y, z, 82) > 0.8 ? 0x4a4e4a : 0x5d625a;
      if (u > 0.05) return hash3(x, y, z, 83) > 0.85 ? 0x7e8478 : 0x6f7468;
      if (u > -0.4) return 0xa6a490;
      return 0xe2d9b8;
    },
  });
  for (let x = 4; x < L - 6; x += 3) {
    const top = M.sy;
    for (let y = top - 1; y >= 0; y--) if (M.has(x0 + x, y, 6)) { M.set(x0 + x, y + 1, 6, 0xd4cfae); break; }
    for (const side of [-1, 1]) {
      const z = Math.round(cz - 0.5 + side * (Math.max(1, 3.4 * (0.4 + 0.6 * Math.sin(Math.PI * (x / L)))) ));
      for (let y = cy + 1; y >= cy - 3; y--) if (M.has(x0 + x, y, z) && y === cy) M.set(x0 + x, y, z, 0xcfc9a6);
    }
  }
  for (let x = 5; x < L - 8; x += 3) for (const z of [3, 8]) for (let y = cy - 3; y <= cy + 2; y++) if (M.has(x0 + x, y, z) && hash3(x, y, z, 84) > 0.5) M.set(x0 + x, y, z, 0xd4cfae);
  for (let k = 1; k <= 7; k++) for (const z of [5, 6]) M.set(x0 - k, cy - 1 - (k > 4 ? 0 : 0), z, J(0x7c8072, k, 0, z, 85, 0.05));
  for (let k = 1; k <= 6; k++) for (const z of [5, 6]) M.set(x0 - k, cy - 2, z, J(0xcfc8a8, k, 1, z, 86, 0.05));
  for (const z of [4, 7]) for (let k = 0; k < 3; k++) M.set(x0 - 1 + k, cy - 3 - 0, z, 0x8a7a54);
  for (const dz of [3, 8]) M.set(x0 - 1, cy - 3, dz, 0x8a7a54);
  for (let k = 0; k < 9; k++) for (const z of [5, 6]) M.set(x0 + L - 14 + k, cy + 4 + Math.round(2 - Math.abs(k - 4) * 0.5), z, J(0x555a52, k, 0, z, 87, 0.05));
  fishFin(M, x0 + L - 12, cy - 4, 7, 0x8a8a78, -1, 88, [5, 6], 0.3);
  for (const dz of [2, 9]) for (let k = 0; k < 5; k++) M.set(x0 + 11 + k, cy - 3 - Math.floor(k * 0.4), dz, J(0x9a9a84, k, 2, dz, 89, 0.05));
  fishTail(M, x0 + L, cy, [5, 6], 9, 11, 5, 0x555a52, 90);
  fishEyes(M, x0 + 5, cy + 1, 0x15120f, 0xe8e2c8);
  return [M, 0.05, 25, cy, cz];
}


function tunaModel() {
  const L = 36;
  const { M, x0, cy, cz } = fishBody({
    L, rh: 7, wide: 0.6, sz: 12, seed: 91, tailLen: 10,
    prof: (t) => 6.2 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.62) + 0.7,
    paint: (u, t, x, y, z) => {
      if (u > 0.5) return hash3(x, y, z, 92) > 0.84 ? 0x14284a : 0x1f3d66;
      if (u > 0.12) return hash3(x >> 1, y, z, 93) > 0.8 ? 0x4a78a8 : 0x5b8bb8;
      if (u > -0.08 && t > 0.2 && t < 0.88) return 0xe8c43a;
      if (u > -0.5) return 0xc8d6de;
      return hash3(x >> 1, y, z, 94) > 0.82 ? 0xb8c4cc : 0xe8eef0;
    },
  });
  for (let k = 0; k < 6; k++) for (const z of [5, 6]) M.set(x0 + 11 + k, cy + 6 + Math.round(3.2 - Math.abs(k - 1.5) * 1.0), z, J(0xe8c43a, k, 0, z, 95, 0.05));
  for (let k = 0; k < 10; k++) for (const z of [5, 6]) M.set(x0 + L - 14 + k, cy + 6 + Math.round(3 - k * 0.3), z, J(0xf0d24a, k, 1, z, 96, 0.05));
  for (let k = 0; k < 10; k++) for (const z of [5, 6]) M.set(x0 + L - 13 + k, cy - 6 - Math.round(2.4 - k * 0.2), z, J(0xf0d24a, k, 2, z, 97, 0.05));
  for (let k = 0; k < 5; k++) for (const z of [5, 6]) {
    M.set(x0 + L - 4 + k, cy + 5 - Math.floor(k * 0.3), z, 0xf5d83a);
    M.set(x0 + L - 4 + k, cy - 5 + Math.floor(k * 0.3), z, 0xf5d83a);
  }
  fishFin(M, x0 + 12, cy - 6, 7, 0x4a6a8c, -1, 98, [5, 6], 0.3);
  for (const dz of [2, 9]) for (let k = 0; k < 6; k++) M.set(x0 + 9 + k, cy - 3 - Math.floor(k * 0.5), dz, J(0x9fb4c4, k, 3, dz, 99, 0.05));
  for (const z of [4, 5, 6, 7]) M.set(x0, cy - 1, z, 0x1a2230);
  fishTail(M, x0 + L, cy, [5, 6], 9, 9, 9, 0x2a4a6c, 100);
  fishEyes(M, x0 + 4, cy + 1, 0x0a0a0a, 0xe8e8e8);
  return [M, 0.058, 20, cy, cz];
}

function tigerSharkModel() {
  const L = 50;
  const { M, x0, cy, cz } = fishBody({
    L, rh: 8, wide: 0.72, sz: 14, seed: 101, tailLen: 14,
    prof: (t) => 7 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.58) + 0.8,
    paint: (u, t, x, y, z) => {
      if (u > 0.1) {
        const bar = (x + Math.floor(u * 2)) % 6 < 2 && t > 0.2 && t < 0.88;
        return bar ? 0x35434f : hash3(x, y, z, 102) > 0.9 ? 0x5a6c7a : 0x6e8392;
      }
      if (u > -0.35) {
        const bar = (x + 3) % 6 < 1 && t > 0.3 && t < 0.8;
        return bar ? 0x6a7c8a : 0x93a4b0;
      }
      return hash3(x >> 1, y, z, 103) > 0.9 ? 0xdde4e6 : 0xf0f3f2;
    },
  });
  const mid = [6, 7];
  for (let k = 0; k < 12; k++) {
    const h = Math.round(9 * (1 - k / 12) ** 1.3);
    for (let d = 0; d < h; d++) for (const z of mid) M.set(x0 + 14 + k - Math.floor(d * 0.5), cy + 8 + d, z, J(d > h - 2 ? 0x2c3842 : 0x586a78, k, d, z, 104, 0.05));
  }
  for (let k = 0; k < 6; k++) for (const z of mid) for (let d = 0; d < Math.max(1, 4 - k); d++) M.set(x0 + L - 12 + k, cy + 7 + d, z, J(0x4a5c6a, k, d, z, 105, 0.05));
  for (const z of [1, 12]) {
    for (let k = 0; k < 11; k++) {
      const span = 5 - Math.floor(k * 0.4);
      for (let w = 0; w < span; w++) M.set(x0 + 14 + k, cy - 3 - Math.floor(k * 0.55) - w, z, J(k < 4 ? 0x7c8f9e : 0x6a7e8c, k, w, z, 106, 0.05));
    }
  }
  for (let k = 0; k < 7; k++) for (const z of [6, 7]) M.set(x0 + L - 20 + k, cy - 6 - Math.round(2.4 - Math.abs(k - 2) * 0.5), z, J(0x7a8e9c, k, 0, z, 107, 0.05));
  for (const gx of [8, 10, 12]) for (let y = cy - 3; y <= cy + 3; y++) for (const z of [1, 12]) if (M.has(x0 + gx, y, z)) M.set(x0 + gx, y, z, 0x20282e);
  for (let k = 0; k < 9; k++) for (const z of [4, 5, 6, 7, 8, 9]) if (!M.has(x0 + 1 + k, cy - 4, z) && M.has(x0 + 1 + k, cy - 3, z)) M.set(x0 + 1 + k, cy - 4, z, k % 2 === 0 ? 0xf6f6f0 : 0x7a2a2a);
  for (let z = 4; z <= 9; z++) M.set(x0 + 1, cy - 2, z, 0x1b1f22);
  fishTail(M, x0 + L, cy, [6, 7], 13, 15, 6, 0x4a5c6a, 108);
  fishEyes(M, x0 + 5, cy + 2, 0x050505, 0xf0e8b0);
  return [M, 0.05, 25, cy, cz];
}

function stingrayModel() {
  const M = new VoxelModel(52, 12, 38);
  const cx = 17;
  const cz = 19;
  for (let z = 0; z < 38; z++)
    for (let x = 0; x < 36; x++) {
      const dx = (x + 0.5 - cx) / (x < cx ? 13 : 17);
      const dz = (z + 0.5 - cz) / 18;
      const d2 = dx * dx + dz * dz;
      const wob = (hash3(x, 0, z, 111) - 0.5) * 0.08;
      if (d2 > 1 + wob) continue;
      const wing = Math.abs(dz);
      const lift = wing > 0.62 ? Math.round((wing - 0.62) * 5) : 0;
      const top = 3 + Math.round(3 * (1 - d2) ** 0.8) + lift - (wing > 0.9 ? 1 : 0);
      for (let y = 1; y <= top; y++) {
        let c;
        if (y === 1) c = hash3(x >> 1, 0, z >> 1, 112) > 0.88 ? 0xd9cfba : 0xf1ecde;
        else if (y < top) c = 0xb8a98c;
        else {
          const spot = hash3(x >> 1, y, z >> 1, 113) > 0.86;
          const ring = d2 > 0.8;
          c = spot ? 0xd8c9a0 : ring ? 0x6a5a44 : hash3(x, y, z, 114) > 0.5 ? 0x8a7656 : 0x7d6a4c;
        }
        M.set(x, y, z, J(c, x, y, z, 115, 0.04));
      }
    }
  for (const side of [-1, 1]) {
    const z = cz + side * 3;
    for (let dy = 0; dy < 2; dy++) {
      M.set(6, 7 + dy, z, 0xf0e8c8);
      M.set(7, 7 + dy, z, 0x0e0e0e);
    }
    M.set(11, 7, cz + side * 5, 0x3a2e22);
    M.set(11, 6, cz + side * 5, 0x3a2e22);
  }
  for (let k = 0; k < 16; k++) {
    const t = k / 15;
    const w = t < 0.5 ? 2 : 1;
    const ring = Math.floor(k / 2) % 2 === 0;
    for (let z = cz - w; z < cz + w; z++) M.set(34 + k, 3 - (k > 12 ? 1 : 0), z, J(ring ? 0x3a2e22 : 0x8a7656, k, 0, z, 116, 0.04));
    if (w === 2) for (let z = cz - w; z < cz + w; z++) M.set(34 + k, 2, z, 0xe8e0cc);
  }
  for (let k = 0; k < 6; k++) M.set(41 + k, 4 + (k > 3 ? 1 : 0), cz, 0x20201a);
  M.set(42, 5, cz, 0x20201a);
  for (let z = cz - 2; z < cz + 2; z++) M.set(2, 1, z, 0x3a2418);
  return [M, 0.058, 17, 3, cz];
}

const WOOD = {
  birch: { bark: 0xf3eee4, barkHi: 0xfffaf0, cut: 0xf6e7c0, heart: 0xe7c98a, ring: 0x2a2622 },
  oak: { bark: 0x6a4529, barkHi: 0x8a5a34, cut: 0xd9b27a, heart: 0xc49555, ring: 0x8a5a30 },
  maple: { bark: 0x6e3824, barkHi: 0x8a4630, cut: 0xe2b070, heart: 0xc48448, ring: 0x5a2818 },
};

/** Fresh-cut stump left when a tree is felled. */
export function buildWoodStump(kind, seed = 1) {
  const w = WOOD[kind] || WOOD.oak;
  const M = new VoxelModel(16, 8, 16);
  const c = 8;
  for (let y = 0; y < 5; y++) {
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5 - c, z + 0.5 - c);
        const r = y < 2 ? 5.4 : 4.4;
        if (d > r) continue;
        if (y === 4) {
          const band = Math.floor(d);
          M.set(x, y, z, d < 1.2 ? w.heart : band % 2 === 0 ? w.cut : shade(w.cut, 0.86));
        } else if (kind === 'birch' && y === 3) M.set(x, y, z, 0x2a2622);
        else M.set(x, y, z, J(shade(w.bark, hash3(x, 0, z, seed) > 0.6 ? 0.86 : 1), x, y, z, seed, 0.08));
      }
  }
  return bundle([[M, 0.11, c, 0, c]]);
}

/** Crossed logs and a bright flame. Logs and flame are separate so the fire can flicker. */
export function buildCampfire(kind = 'birch') {
  const w = WOOD[kind] || WOOD.oak;
  const logs = new VoxelModel(20, 8, 20);
  const lay = (x0, z0, x1, z1, y) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const z = Math.round(z0 + ((z1 - z0) * i) / n);
      for (let dy = 0; dy < 3; dy++)
        for (let t = -1; t <= 1; t++) {
          const across = Math.abs(x1 - x0) > Math.abs(z1 - z0);
          const px = across ? x : x + t;
          const pz = across ? z + t : z;
          const end = i < 2 || i > n - 2;
          logs.set(px, y + dy, pz, end ? (dy === 1 ? w.cut : w.ring) : dy === 2 ? w.barkHi : w.bark);
        }
    }
  };
  lay(3, 7, 16, 12, 0);
  lay(4, 13, 15, 6, 1);
  const flame = new VoxelModel(20, 16, 20);
  const hot = [0xfff6c0, 0xffc24a, 0xff6a18, 0xffe080];
  for (let y = 3; y < 14; y++) {
    const r = y < 6 ? 2.4 : Math.max(0.4, 2.5 - (y - 5) * 0.28);
    for (let z = 6; z <= 13; z++)
      for (let x = 6; x <= 13; x++) {
        if (Math.hypot(x - 9.5, z - 9.5) > r) continue;
        if (hash3(x, y, z, 70) < 0.25 && y > 6) continue;
        flame.set(x, y, z, hot[(x + y + z) % hot.length], true);
      }
  }
  return {
    logs: bundle([[logs, 0.07, 10, 0, 10]]),
    flame: bundle([[flame, 0.07, 10, 0, 10]]),
  };
}

function logStack(kind) {
  const w = WOOD[kind];
  const seed = kind === 'birch' ? 11 : kind === 'maple' ? 13 : 12;
  const M = new VoxelModel(24, 16, 16);
  const one = (y0, z0) => {
    for (let x = 2; x < 22; x++)
      for (let y = 0; y < 5; y++)
        for (let z = 0; z < 5; z++) {
          const dy = y - 2;
          const dz = z - 2;
          if (dy * dy + dz * dz > 5.3) continue;
          const end = x < 4 || x > 19;
          const ring = Math.hypot(dy, dz);
          let c = end ? (ring < 1.15 ? w.heart : ring < 2 ? w.cut : w.ring) : y === 4 ? w.barkHi : w.bark;
          if (!end && kind === 'birch' && y === 1 && z === 2 && x % 4 === 0) c = 0x2a2622;
          M.set(x, y0 + y, z0 + z, J(c, x, y, z, seed, 0.06));
        }
  };
  one(0, 5);
  one(3, 1);
  one(3, 8);
  return [M, 0.045, 12, 0, 8];
}

/** Recolour a fresh fish model: gold-brown for the grill, charcoal when it burns. */
function tintFish(id, mode) {
  const [M, size, ox, oy, oz] = GOODS_MODELS[id]();
  const data = M.data;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (!v) continue;
    const r0 = (v >> 16) & 255;
    const g0 = (v >> 8) & 255;
    const b0 = v & 255;
    const l = r0 * 0.3 + g0 * 0.5 + b0 * 0.2;
    let r;
    let g;
    let b;
    if (mode === 'cooked') {
      r = Math.min(255, Math.round(l * 1.05 + 68));
      g = Math.min(255, Math.round(l * 0.55 + 28));
      b = Math.min(255, Math.round(l * 0.16 + 8));
    } else {
      const z = Math.floor(i / (M.sx * M.sy));
      const rem = i - z * M.sx * M.sy;
      const y = Math.floor(rem / M.sx);
      const x = rem - y * M.sx;
      const crack = hash3(x, y, z, 91);
      if (crack > 0.9) {
        r = 22;
        g = 16;
        b = 12;
      } else if (crack > 0.84 && l > 120) {
        r = 168;
        g = 64;
        b = 22;
      } else {
        const ash = 58 + l * 0.22;
        r = Math.round(ash + 16);
        g = Math.round(ash * 0.72 + 10);
        b = Math.round(ash * 0.48 + 6);
      }
    }
    data[i] = (v & ~0xffffff) | (r << 16) | (g << 8) | b;
  }
  return [M, size, ox, oy, oz];
}

const GOODS_MODELS = {
  copper_ore: () => oreChunk('copper'),
  tin_ore: () => oreChunk('tin'),
  shrimp: shrimpModel,
  trout: troutModel,
  pikeminnow: pikeMinnowModel,
  salmon: salmonModel,
  pike: pikeModel,
  sturgeon: sturgeonModel,
  tuna: tunaModel,
  stingray: stingrayModel,
  tigershark: tigerSharkModel,
  cooked_shrimp: () => tintFish('shrimp', 'cooked'),
  cooked_trout: () => tintFish('trout', 'cooked'),
  cooked_pikeminnow: () => tintFish('pikeminnow', 'cooked'),
  cooked_salmon: () => tintFish('salmon', 'cooked'),
  cooked_pike: () => tintFish('pike', 'cooked'),
  cooked_sturgeon: () => tintFish('sturgeon', 'cooked'),
  cooked_tuna: () => tintFish('tuna', 'cooked'),
  cooked_stingray: () => tintFish('stingray', 'cooked'),
  cooked_tigershark: () => tintFish('tigershark', 'cooked'),
  burnt_shrimp: () => tintFish('shrimp', 'burnt'),
  burnt_trout: () => tintFish('trout', 'burnt'),
  burnt_pikeminnow: () => tintFish('pikeminnow', 'burnt'),
  burnt_salmon: () => tintFish('salmon', 'burnt'),
  burnt_pike: () => tintFish('pike', 'burnt'),
  burnt_sturgeon: () => tintFish('sturgeon', 'burnt'),
  burnt_tuna: () => tintFish('tuna', 'burnt'),
  burnt_stingray: () => tintFish('stingray', 'burnt'),
  burnt_tigershark: () => tintFish('tigershark', 'burnt'),
  burnt_fish: () => tintFish('trout', 'burnt'),
  birch_logs: () => logStack('birch'),
  oak_logs: () => logStack('oak'),
  maple_logs: () => logStack('maple'),
  iron_bar: ironBar,
  arrowhead: arrowHead,
  feather,
  birch_shaft: () => arrowShaft('birch'),
  oak_shaft: () => arrowShaft('oak'),
  maple_shaft: () => arrowShaft('maple'),
  arrow_shaft: () => arrowShaft('birch'),
  iron_arrow: ironArrow,
  quiver: quiverModel,
};

function ironBar() {
  const M = new VoxelModel(22, 8, 8);
  M.box(1, 2, 2, 20, 6, 6, (x, y, z) => J(y === 5 ? 0xd7dee6 : y === 2 ? 0x6e7680 : 0xb7c0c8, x, y, z, 4, 0.05));
  M.box(1, 3, 3, 20, 5, 5, 0x9aa3ab);
  return [M, 0.05, 11, 0, 4];
}

function arrowHead() {
  const M = new VoxelModel(14, 8, 8);
  for (let x = 2; x <= 11; x++) {
    const w = x < 8 ? 1 : Math.max(0, 11 - x);
    for (let y = 3 - w; y <= 4 + w; y++) M.set(x, y, 4, J(0xb7c0c8, x, y, 4, 5, 0.04));
  }
  M.box(1, 3, 3, 3, 5, 5, 0x6a4328);
  return [M, 0.06, 7, 0, 4];
}

function arrowShaft(kind = 'birch') {
  const w = WOOD[kind] || WOOD.birch;
  const M = new VoxelModel(22, 6, 6);
  M.box(1, 2, 2, 18, 4, 4, (x, y, z) => J(w.heart, x, y, z, 6, 0.05));
  M.box(16, 1, 2, 20, 5, 4, w.bark);
  return [M, 0.05, 11, 0, 3];
}

function feather() {
  const M = new VoxelModel(18, 10, 6);
  M.box(1, 4, 2, 5, 6, 4, 0xe7d2a4);
  for (let x = 4; x <= 16; x++) {
    const w = Math.max(0, 4 - Math.floor((x - 4) / 3));
    M.box(x, 5 - w, 2, x, 5 + w, 3, x % 2 ? 0xfffaf0 : 0xe4e0d4);
  }
  M.set(17, 5, 2, 0xfffaf0);
  return [M, 0.055, 9, 0, 3];
}

function ironArrow() {
  const M = new VoxelModel(26, 8, 8);
  M.box(4, 3, 3, 20, 5, 5, (x, y, z) => J(0xc9a36a, x, y, z, 7, 0.04));
  for (let x = 18; x <= 24; x++) {
    const w = Math.max(0, 24 - x);
    for (let y = 4 - w; y <= 4 + w; y++) M.set(x, y, 4, 0xd7dee6);
  }
  M.box(2, 2, 3, 5, 6, 5, 0xf4efe4);
  M.set(1, 4, 4, 0xe24a22);
  return [M, 0.045, 13, 0, 4];
}

function quiverModel() {
  const M = new VoxelModel(16, 22, 12);
  M.box(4, 1, 3, 12, 18, 9, (x, y, z) => J(y % 3 === 0 ? 0x8a5a32 : 0x6a4328, x, y, z, 8, 0.05));
  M.box(5, 16, 4, 11, 20, 8, 0xf4efe4);
  for (let i = 0; i < 4; i++) M.box(6 + i, 18, 5, 6 + i, 21, 6, 0xd7dee6);
  M.box(3, 8, 4, 4, 12, 8, 0x9aa3ab);
  M.box(12, 8, 4, 13, 12, 8, 0x9aa3ab);
  return [M, 0.045, 8, 0, 6];
}

export function hasGoodsModel(id) {
  return !!GOODS_MODELS[id];
}

/** [model, size, ox, oy, oz] for a carried good, so callers pick the mesh builder. */
export function goodsVoxels(id) {
  return GOODS_MODELS[id]();
}
