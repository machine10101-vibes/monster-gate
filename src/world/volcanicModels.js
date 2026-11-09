import { VoxelModel, RNG, hash3, jitter, mix, shade } from '../engine/voxel.js';
import { bundle, J } from './models.js';

/** Props for the volcanic wasteland: charred trees, obsidian, vents, bones and the battlefield between the two keeps. */

export const BASALT_C = [0x2b2b31, 0x34343b, 0x25252b, 0x3d3d45, 0x1f1f24];
export const LAVA_C = [0xff6a1a, 0xff8a24, 0xe04a0a, 0xffb236, 0xff4e10];
const ASH_C = [0x5a5a60, 0x4d4d53, 0x66666c, 0x44444a];
const CHAR_C = [0x1c1714, 0x241d19, 0x2c241f, 0x161210];
const OBS_C = [0x14141a, 0x1c1c25, 0x101015, 0x242432];
const BONE = [0xd8d0bc, 0xcbc2ac, 0xe4ddca, 0xbfb69e];
const STEEL = [0x9ca3ae, 0xb4bbc6, 0x848b97, 0xc8ced8];
const DARKSTEEL = [0x3a3a44, 0x2c2c34, 0x484852, 0x24242c];

const basalt = (x, y, z, s = 0) => jitter(BASALT_C[Math.floor(hash3(x >> 1, y >> 1, z >> 1, 900 + s) * BASALT_C.length)], 0.03, hash3(x, y, z, 901 + s));
const ash = (x, y, z, s = 0) => jitter(ASH_C[Math.floor(hash3(x, y, z, 910 + s) * ASH_C.length)], 0.03, hash3(x, y, z, 911 + s));
const charred = (x, y, z, s = 0) => jitter(CHAR_C[Math.floor(hash3(x, y, z, 920 + s) * CHAR_C.length)], 0.03, hash3(x, y, z, 921 + s));
const obsidian = (x, y, z, s = 0) => jitter(OBS_C[Math.floor(hash3(x, y, z, 930 + s) * OBS_C.length)], 0.03, hash3(x, y, z, 931 + s));
const lava = (x, y, z, s = 0) => LAVA_C[Math.floor(hash3(x, y, z, 940 + s) * LAVA_C.length)];
const bone = (x, y, z, s = 0) => jitter(BONE[Math.floor(hash3(x, y, z, 950 + s) * BONE.length)], 0.03, hash3(x, y, z, 951 + s));

export function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.35, glow = false) {
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

function shard(m, bx, by, bz, dx, dy, dz, len, r0, colorFn, glowTip = false) {
  const n = Math.hypot(dx, dy, dz) || 1;
  for (let k = 0; k <= len; k++) {
    const t = k / len;
    const r = Math.max(0.5, r0 * (1 - t * 0.95));
    const cx = bx + (dx / n) * k;
    const cy = by + (dy / n) * k;
    const cz = bz + (dz / n) * k;
    const R = Math.ceil(r);
    for (let a = -R; a <= R; a++)
      for (let c = -R; c <= R; c++) {
        if (Math.hypot(a, c) > r + 0.2) continue;
        const x = Math.round(cx + a);
        const y = Math.round(cy);
        const z = Math.round(cz + c);
        const tip = glowTip && t > 0.9;
        m.set(x, y, z, tip ? 0xff7a2a : colorFn(x, y, z, t), tip);
      }
  }
}

/* -------------------------------- trees -------------------------------- */

export function buildAshTree(seed) {
  const rng = new RNG(seed * 61 + 5);
  const M = new VoxelModel(40, 52, 40);
  const bark = (x, y, z) => shade(charred(x, y, z, seed), hash3(x, y, z, seed + 2) > 0.7 ? 1.5 : 1);
  const c = 20;
  for (let y = 0; y < 22; y++) {
    const r = 3.4 - y * 0.08 + (y < 3 ? 1.6 - y * 0.5 : 0);
    for (let z = -4; z <= 4; z++)
      for (let x = -4; x <= 4; x++) if (Math.hypot(x, z) <= r) M.set(c + x + Math.round(Math.sin(y * 0.2 + seed) * 1.2), y, c + z, bark(c + x, y, c + z));
  }
  const limbs = 6;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.range(0, 1);
    const y0 = 14 + i * 3;
    const len = rng.range(9, 16);
    const tx = c + Math.cos(a) * len;
    const tz = c + Math.sin(a) * len;
    const ty = y0 + rng.range(5, 12);
    M.line(c, y0, c, tx, ty, tz, bark, 3);
    const mx = c + Math.cos(a) * len * 0.62;
    const mz = c + Math.sin(a) * len * 0.62;
    const my = y0 + (ty - y0) * 0.6;
    M.line(mx, my, mz, mx + Math.cos(a + 0.8) * 7, my + 7, mz + Math.sin(a + 0.8) * 7, bark, 2);
    M.line(mx, my, mz, mx + Math.cos(a - 0.8) * 6, my + 6, mz + Math.sin(a - 0.8) * 6, bark, 2);
    M.line(tx, ty, tz, tx + Math.cos(a) * 4, ty + 5, tz + Math.sin(a) * 4, bark, 1);
    if (i % 3 === 0) M.set(Math.round(tx + Math.cos(a) * 4), Math.round(ty + 5), Math.round(tz + Math.sin(a) * 4), 0xff7a2a, true);
  }
  for (let y = 4; y < 20; y += 3) if (hash3(y, seed, 1, 8) > 0.4) M.set(c + 3, y, c, 0xff5a14, true);
  return bundle([[M, 0.125, c, 0, c]]);
}

export function buildThornBush(seed) {
  const rng = new RNG(seed * 23 + 1);
  const M = new VoxelModel(18, 14, 18);
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, Math.PI * 2);
    const len = rng.range(4, 8);
    const tx = 9 + Math.cos(a) * len;
    const tz = 9 + Math.sin(a) * len;
    const ty = rng.range(5, 12);
    M.line(9, 1, 9, tx, ty, tz, (x, y, z) => charred(x, y, z, seed), 1);
    if (rng.next() > 0.55) M.set(Math.round(tx), Math.round(ty), Math.round(tz), 0xd8341a, true);
  }
  return bundle([[M, 0.125, 9, 0, 9]]);
}

export function buildEmberBloom(seed) {
  const M = new VoxelModel(8, 12, 8);
  M.box(3, 0, 3, 4, 7, 4, (x, y, z) => charred(x, y, z, seed));
  const cols = [0xff6a1a, 0xffb236, 0xe04a0a];
  M.box(2, 7, 2, 5, 9, 5, cols[seed % 3], true);
  M.set(3, 9, 3, 0xffe08a, true);
  M.set(2, 5, 3, 0x3a2a22);
  M.set(4, 4, 3, 0x3a2a22);
  return bundle([[M, 0.125, 3.5, 0, 3.5]]);
}

/* ---------------------------- stone and glass ---------------------------- */

export function buildObsidianSpire(seed) {
  const rng = new RNG(seed * 41 + 13);
  const M = new VoxelModel(40, 70, 40);
  const col = (x, y, z, t) => (hash3(x, y, z, seed + 8) > 0.93 ? 0x5a4a8a : obsidian(x, y, z, seed));
  shard(M, 20, 0, 20, 0.07, 1, 0.05, 58, 6, col);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(0, 1);
    shard(M, 20 + Math.cos(a) * 5, 0, 20 + Math.sin(a) * 5, Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45, rng.range(18, 38), rng.range(2.4, 3.8), col);
  }
  for (let y = 3; y < 40; y += 4)
    for (let k = 0; k < 4; k++) {
      const x = 15 + Math.floor(hash3(y, k, seed, 6) * 10);
      const z = 15 + Math.floor(hash3(y, k, seed, 7) * 10);
      if (M.has(x, y, z) && !M.has(x, y, z + 1) && hash3(x, y, z, 9) > 0.5) M.set(x, y, z + 1, 0xff6a1a, true);
    }
  blob(M, 20, 1, 20, 11, 2, 11, (x, y, z) => basalt(x, y, z, seed), seed, 0.9);
  return bundle([[M, 0.125, 20, 0, 20]]);
}

export function buildBasaltRock(seed, big = false) {
  const rng = new RNG(seed * 17 + 2);
  const M = new VoxelModel(24, 18, 24);
  const rx = rng.range(3.5, big ? 9 : 5.4);
  const rz = rng.range(3.5, big ? 9 : 5.4);
  const ry = rng.range(2.6, big ? 7 : 4);
  blob(M, 12, ry * 0.8, 12, rx, ry, rz, (x, y, z) => {
    if (hash3(x, y, z, seed + 5) > 0.965) return 0xff6a1a;
    return mix(basalt(x, y, z, seed), ash(x, y, z, seed), y > ry * 1.3 ? 0.5 : 0);
  }, seed, 0.5);
  M.data.forEach((v, i) => {
    if (!v) return;
    const x = i % M.sx;
    const y = Math.floor(i / M.sx) % M.sy;
    const z = Math.floor(i / (M.sx * M.sy));
    const c = v & 0xffffff;
    if (c === 0xff6a1a) M.set(x, y, z, c, true);
  });
  return bundle([[M, 0.125, 12, 0, 12]]);
}

export function buildAshMound(seed) {
  const rng = new RNG(seed * 19 + 4);
  const M = new VoxelModel(30, 8, 30);
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    blob(M, 15 + rng.range(-5, 5), 1, 15 + rng.range(-5, 5), rng.range(5, 10), rng.range(2, 3.6), rng.range(5, 10), (x, y, z) => ash(x, y, z, seed), seed + i, 0.7);
  }
  for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) if (M.has(x, 0, z) && hash3(x, 0, z, seed + 9) > 0.93) M.set(x, 0, z, 0xe04a0a, true);
  return bundle([[M, 0.125, 15, 0, 15]]);
}

export function buildMagmaVent(seed) {
  const M = new VoxelModel(34, 24, 34);
  const c = 17;
  for (let y = 0; y < 12; y++) {
    const r = 11 - y * 0.62;
    for (let z = 0; z < 34; z++)
      for (let x = 0; x < 34; x++) {
        const d = Math.hypot(x + 0.5 - c, z + 0.5 - c) + (hash3(x, y, z, seed) - 0.5) * 1.4;
        if (d <= r && d >= r - 4.4 - (y < 3 ? 6 : 0)) M.set(x, y, z, hash3(x, y, z, seed + 1) > 0.9 ? 0x4a3a34 : basalt(x, y, z, seed));
      }
  }
  M.box(c - 3, 10, c - 3, c + 3, 11, c + 3, (x, y, z) => lava(x, y, z, seed), true);
  M.box(c - 2, 11, c - 2, c + 2, 12, c + 2, 0xffd060, true);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.round(c + Math.cos(a) * 7);
    const z = Math.round(c + Math.sin(a) * 7);
    for (let y = 8; y >= 0; y--) if (M.has(x, y, z)) { if (hash3(x, y, z, seed) > 0.4) M.set(x, y, z, 0xff6a1a, true); break; }
  }
  return bundle([[M, 0.125, c, 0, c]]);
}

export function buildCharredLogs(seed) {
  const M = new VoxelModel(34, 14, 24);
  for (let i = 0; i < 3; i++) {
    const z = 5 + i * 6;
    const y = i === 1 ? 6 : 2;
    const len = 20 + Math.floor(hash3(i, seed, 1, 5) * 10);
    const x0 = 3 + Math.floor(hash3(i, seed, 2, 5) * 6);
    M.line(x0, y, z, x0 + len, y, z + (i - 1) * 2, (x, yy, zz) => charred(x, yy, zz, seed), 4);
    M.set(x0 + len, y, z + (i - 1) * 2, 0xff5a14, true);
  }
  return bundle([[M, 0.125, 17, 0, 12]]);
}

export function buildBoneRibs(seed) {
  const M = new VoxelModel(46, 30, 40);
  M.line(2, 3, 20, 44, 3, 20, (x, y, z) => bone(x, y, z, seed), 3);
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 5;
    const hh = 22 - Math.abs(i - 3) * 3.2;
    for (let s = -1; s <= 1; s += 2) {
      let px = x;
      let py = 3;
      let pz = 20;
      for (let k = 1; k <= 14; k++) {
        const t = k / 14;
        const nx = x + Math.sin(t * 0.6) * 1.5;
        const ny = 3 + Math.sin(t * Math.PI * 0.62) * hh * 0.85;
        const nz = 20 + s * Math.sin(t * Math.PI * 0.5) * (9 - Math.abs(i - 3) * 0.8);
        M.line(px, py, pz, nx, ny, nz, (xx, yy, zz) => bone(xx, yy, zz, seed), t < 0.7 ? 2 : 1);
        px = nx;
        py = ny;
        pz = nz;
      }
    }
  }
  return bundle([[M, 0.125, 23, 0, 20]]);
}

export function buildSkullPile(seed) {
  const M = new VoxelModel(26, 16, 26);
  const skull = (cx, cy, cz) => {
    blob(M, cx, cy, cz, 3.2, 2.8, 3.2, (x, y, z) => bone(x, y, z, seed), seed, 0.15);
    M.set(Math.round(cx - 1), Math.round(cy), Math.round(cz + 3), 0x1a1612);
    M.set(Math.round(cx + 1), Math.round(cy), Math.round(cz + 3), 0x1a1612);
  };
  skull(8, 3, 12);
  skull(15, 3, 9);
  skull(13, 3, 16);
  skull(11, 7, 12);
  blob(M, 13, 1, 13, 10, 1.4, 10, (x, y, z) => ash(x, y, z, seed), seed + 3, 0.7);
  return bundle([[M, 0.125, 13, 0, 13]]);
}

/* ------------------------------ battlefield ------------------------------ */

export function buildPlantedSword(seed, holy = false) {
  const M = new VoxelModel(18, 46, 18);
  const lean = (seed % 3) - 1;
  const blade = holy ? STEEL : DARKSTEEL;
  const trim = holy ? [0xe6b94a, 0xf3cf63] : [0x7a1010, 0xa01818];
  for (let y = 0; y < 30; y++) {
    const x = 9 + Math.round(lean * y * 0.08);
    const w = y < 26 ? 1 : 0;
    for (let a = -w; a <= w; a++) M.set(x + a, y, 9, jitter(blade[Math.floor(hash3(x, y, a, seed) * blade.length)], 0.03, hash3(x, y, a, 2)));
    M.set(x, y, 8, blade[2]);
    M.set(x, y, 10, blade[0]);
    if (holy && y > 6 && y % 5 === 0) M.set(x, y, 11, 0x7fc4ff, true);
    if (!holy && y > 6 && y % 6 === 0) M.set(x, y, 11, 0xff5a14, true);
  }
  const gx = 9 + Math.round(lean * 30 * 0.08);
  M.box(gx - 5, 30, 8, gx + 6, 32, 11, (x, y, z) => trim[(x + y) & 1]);
  M.box(gx - 1, 32, 9, gx + 1, 40, 10, (x, y, z) => (holy ? 0xdcd7c8 : 0x2a2230));
  M.box(gx - 2, 40, 8, gx + 3, 42, 11, (x, y, z) => trim[1]);
  blob(M, 9, 0.5, 9, 6, 1.4, 6, (x, y, z) => ash(x, y, z, seed), seed, 0.7);
  return bundle([[M, 0.125, 9, 0, 9]]);
}

export function buildBrokenShield(seed, holy = false) {
  const M = new VoxelModel(22, 22, 14);
  const body = holy ? [0xe8e5dc, 0xd8d4c8] : [0x2a2a30, 0x35353d];
  const rim = holy ? 0xe6b94a : 0x5a5a66;
  for (let y = 0; y < 18; y++) {
    const half = Math.round(8 - Math.max(0, y - 9) * 0.9);
    for (let x = -half; x <= half; x++) {
      if (hash3(x, y, seed, 3) > 0.94 && y > 11) continue;
      const edge = Math.abs(x) === half || y === 17 || y === 0;
      const c = edge ? rim : body[(x + y) & 1];
      M.set(11 + x, y + 2, 6 + Math.round(Math.abs(x) * 0.06), c);
    }
  }
  if (holy) {
    M.box(10, 6, 5, 13, 16, 6, 0x4a90e8, true);
    M.box(7, 11, 5, 16, 13, 6, 0x4a90e8, true);
  } else {
    M.box(8, 9, 5, 15, 12, 6, 0xff4a14, true);
    M.set(9, 13, 5, 0xff4a14, true);
    M.set(14, 13, 5, 0xff4a14, true);
  }
  for (let i = 0; i < 5; i++) M.line(11, 2 + i, 6, 11 + (i - 2) * 2, 0, 6, rim, 1);
  return bundle([[M, 0.125, 11, 0, 7]]);
}

export function buildBattleBanner(seed, holy = false) {
  const M = new VoxelModel(30, 80, 12);
  const pole = holy ? [0xd8d4c8, 0xe6b94a] : [0x2a2a30, 0x4a4a54];
  M.box(5, 0, 5, 7, 74, 7, (x, y) => pole[(y >> 2) & 1]);
  M.box(4, 74, 4, 8, 78, 8, holy ? 0xf3cf63 : 0xff5a14, !holy);
  M.box(3, 70, 5, 28, 72, 7, holy ? 0xe6b94a : 0x4a4a54);
  const cloth = holy ? [0xf2f0ea, 0xe0e0e8] : [0x6a0e12, 0x8a1218];
  const edge = holy ? 0xe6b94a : 0x2a0608;
  for (let y = 22; y < 70; y++) {
    const tatter = Math.floor(hash3(y, seed, 1, 4) * 2.2) + (y < 34 ? Math.floor((34 - y) * 0.35) : 0);
    for (let x = 7; x < 27 - tatter; x++) {
      const c = y === 22 + Math.floor(hash3(x, seed, 2, 4) * 3) ? edge : cloth[((x >> 1) + (y >> 3)) & 1];
      M.set(x, y, 6, c);
    }
  }
  if (holy) {
    M.box(15, 40, 6, 19, 62, 7, 0x4a90e8, true);
    M.box(10, 52, 6, 24, 56, 7, 0x4a90e8, true);
  } else {
    for (let k = 0; k < 8; k++) M.box(12 + (k < 4 ? k : 7 - k) * 0 + k, 40 + Math.abs(k - 3.5) * 2, 6, 13 + k, 62 - Math.abs(k - 3.5) * 2, 7, 0x1a0406);
    M.box(14, 48, 6, 18, 56, 7, 0xff5a14, true);
  }
  blob(M, 6, 0.5, 6, 4.5, 1.2, 4.5, (x, y, z) => ash(x, y, z, seed), seed, 0.6);
  return bundle([[M, 0.125, 6, 0, 6]]);
}

export function buildArmorPile(seed, holy = false) {
  const M = new VoxelModel(24, 14, 24);
  const pal = holy ? [0xd8d4c8, 0xc4c0b4, 0xe6b94a] : [0x2a2a32, 0x3a3a44, 0x5a1a1a];
  blob(M, 12, 3, 12, 8, 3, 8, (x, y, z) => pal[Math.floor(hash3(x >> 1, y, z >> 1, seed) * 3)], seed, 0.9);
  blob(M, 9, 5.5, 11, 3.4, 2.4, 3.4, (x, y, z) => pal[(x + z) & 1], seed + 1, 0.2);
  M.box(14, 4, 14, 17, 11, 15, pal[2]);
  blob(M, 12, 0.5, 12, 11, 1.4, 11, (x, y, z) => ash(x, y, z, seed), seed + 2, 0.7);
  return bundle([[M, 0.125, 12, 0, 12]]);
}

export function buildBrokenCatapult(seed) {
  const M = new VoxelModel(54, 40, 40);
  const wood = (x, y, z) => shade(charred(x, y, z, seed), hash3(x, y, z, 5) > 0.7 ? 1.7 : 1.3);
  M.box(6, 3, 8, 48, 6, 11, wood);
  M.box(6, 3, 29, 48, 6, 32, wood);
  M.box(10, 6, 8, 13, 22, 11, wood);
  M.box(10, 6, 29, 13, 22, 32, wood);
  M.box(10, 20, 8, 13, 23, 32, wood);
  M.line(12, 22, 20, 40, 30, 20, wood, 3);
  M.line(26, 4, 20, 46, 2, 20, wood, 3);
  blob(M, 42, 3, 20, 4, 2, 4, (x, y, z) => basalt(x, y, z, seed), seed, 0.5);
  for (const wx of [14, 40]) for (const wz of [6, 34]) blob(M, wx, 5, wz, 5, 5, 1.6, (x, y, z) => (Math.hypot(x - wx, y - 5) < 2 ? 0x4a4038 : wood(x, y, z)), seed, 0.1);
  M.box(24, 6, 22, 25, 12, 23, 0xff5a14, true);
  return bundle([[M, 0.125, 27, 0, 20]]);
}

export function buildBallista(seed, holy = false) {
  const M = new VoxelModel(40, 28, 40);
  const wood = holy ? [0xb9a07a, 0xa88f68] : [0x2c241f, 0x241d19];
  const trim = holy ? 0xe6b94a : 0x5a5a66;
  M.box(16, 0, 10, 24, 10, 30, (x, y, z) => wood[(x + z) & 1]);
  M.box(18, 10, 14, 22, 18, 26, wood[0]);
  M.box(8, 14, 18, 32, 17, 21, trim);
  M.line(8, 15, 20, 20, 15, 4, 0x6a604a, 1);
  M.line(32, 15, 20, 20, 15, 4, 0x6a604a, 1);
  M.line(20, 16, 6, 20, 16, 36, wood[1], 2);
  M.set(20, 16, 37, holy ? 0xdcd7c8 : 0xff5a14, !holy);
  return bundle([[M, 0.125, 20, 0, 20]]);
}

export function buildPikeStake(seed, holy = false) {
  const M = new VoxelModel(16, 62, 16);
  M.box(7, 0, 7, 9, 52, 9, (x, y, z) => shade(charred(x, y, z, seed), 1.6));
  for (let k = 0; k < 6; k++) M.box(7, 52 + k, 7, 9, 53 + k, 9, k > 3 ? 0x9ca3ae : DARKSTEEL[0]);
  blob(M, 8, 44, 8, 3.4, 3.6, 3.4, (x, y, z) => bone(x, y, z, seed), seed, 0.1);
  M.set(7, 45, 11, 0x1a1612);
  M.set(9, 45, 11, 0x1a1612);
  M.set(7, 45, 11, holy ? 0x4a90e8 : 0xff4a14, true);
  M.set(9, 45, 11, holy ? 0x4a90e8 : 0xff4a14, true);
  blob(M, 8, 0.5, 8, 5, 1.2, 5, (x, y, z) => ash(x, y, z, seed), seed, 0.7);
  return bundle([[M, 0.125, 8, 0, 8]]);
}

/* -------------------------------- brazier -------------------------------- */

export function buildBrazier(seed, holy = false) {
  const M = new VoxelModel(22, 40, 22);
  const iron = holy ? [0xd8d4c8, 0xc8c4b8] : [0x26262e, 0x30303a];
  const trim = holy ? 0xe6b94a : 0x6a1a14;
  const fire = holy ? [0x4a90e8, 0x7fc4ff, 0xbfe4ff] : [0xff4a14, 0xff7a24, 0xffb236];
  M.box(8, 0, 8, 14, 3, 14, (x, y, z) => iron[(x + z) & 1]);
  M.box(10, 3, 10, 12, 18, 12, (x, y, z) => iron[(y >> 1) & 1]);
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) M.line(11, 4, 11, 11 + dx * 5, 0, 11 + dz * 5, iron[0], 1);
  for (let y = 18; y < 24; y++) {
    const r = 3 + (y - 18) * 1.1;
    for (let z = 0; z < 22; z++)
      for (let x = 0; x < 22; x++) {
        const d = Math.hypot(x + 0.5 - 11, z + 0.5 - 11);
        if (d <= r && d > r - 1.4) M.set(x, y, z, y === 23 ? trim : iron[(x + z) & 1]);
        else if (y === 18 && d <= r) M.set(x, y, z, iron[0]);
      }
  }
  for (let y = 19; y < 36; y++) {
    const t = (y - 19) / 17;
    const r = Math.max(0.6, 5.2 * (1 - t) * (0.7 + 0.3 * Math.sin(y * 1.7 + seed)));
    for (let z = -6; z <= 6; z++)
      for (let x = -6; x <= 6; x++) {
        if (Math.hypot(x, z) > r) continue;
        const c = t < 0.35 ? fire[0] : t < 0.7 ? fire[1] : fire[2];
        if (hash3(x, y, z, seed) > 0.25 + t * 0.4) M.set(11 + x, y, 11 + z, c, true);
      }
  }
  return bundle([[M, 0.125, 11, 0, 11]]);
}

export function buildObelisk(seed, holy = false) {
  const M = new VoxelModel(24, 76, 24);
  const stone = holy ? [0xe9e6df, 0xd8d4cb, 0xf0eee8] : [0x23232a, 0x2c2c34, 0x1a1a20];
  const trim = holy ? 0xe6b94a : 0x5a5a66;
  const c = 12;
  for (let y = 0; y < 60; y++) {
    const r = 6.5 - y * 0.06;
    for (let z = 0; z < 24; z++)
      for (let x = 0; x < 24; x++)
        if (Math.max(Math.abs(x + 0.5 - c), Math.abs(z + 0.5 - c)) <= r) M.set(x, y, z, stone[Math.floor(hash3(x >> 1, y >> 2, z >> 1, seed) * 3)]);
  }
  for (let k = 0; k < 14; k++) {
    const r = 3.2 - k * 0.23;
    for (let z = 0; z < 24; z++)
      for (let x = 0; x < 24; x++) if (Math.max(Math.abs(x + 0.5 - c), Math.abs(z + 0.5 - c)) <= r) M.set(x, 60 + k, z, stone[(k & 1) + 1]);
  }
  for (let y = 6; y < 54; y += 2) {
    const wob = (y >> 1) % 4 === 0 ? 0 : 1;
    if (wob) continue;
    M.box(c - 1, y, c + 6, c + 1, y + 1, c + 7, holy ? 0x4a90e8 : 0xff5a14, true);
  }
  M.box(c - 8, 0, c - 8, c + 8, 4, c + 8, (x, y, z) => stone[(x + z) % 3]);
  M.box(c - 7, 4, c - 7, c + 7, 6, c + 7, trim);
  return bundle([[M, 0.125, c, 0, c]]);
}

export function buildVolcanicModels() {
  return {
    ashTrees: [1, 2, 3, 4].map((s) => buildAshTree(s)),
    thornBushes: [1, 2, 3].map((s) => buildThornBush(s)),
    emberBlooms: [1, 2, 3].map((s) => buildEmberBloom(s)),
    obsidianSpires: [1, 2, 3].map((s) => buildObsidianSpire(s)),
    rocks: [1, 2, 3, 4].map((s) => buildBasaltRock(s)),
    boulders: [1, 2].map((s) => buildBasaltRock(s + 10, true)),
    ashMounds: [1, 2, 3, 4].map((s) => buildAshMound(s)),
    vents: [1, 2].map((s) => buildMagmaVent(s)),
    logs: [1, 2].map((s) => buildCharredLogs(s)),
    ribs: [1, 2].map((s) => buildBoneRibs(s)),
    skulls: [1, 2].map((s) => buildSkullPile(s)),
    swordsHoly: [1, 2, 3].map((s) => buildPlantedSword(s, true)),
    swordsDemon: [1, 2, 3].map((s) => buildPlantedSword(s, false)),
    shieldsHoly: [1, 2].map((s) => buildBrokenShield(s, true)),
    shieldsDemon: [1, 2].map((s) => buildBrokenShield(s, false)),
    bannersHoly: [1, 2].map((s) => buildBattleBanner(s, true)),
    bannersDemon: [1, 2].map((s) => buildBattleBanner(s, false)),
    armorHoly: [1, 2].map((s) => buildArmorPile(s, true)),
    armorDemon: [1, 2].map((s) => buildArmorPile(s, false)),
    catapults: [1, 2].map((s) => buildBrokenCatapult(s)),
    ballistaHoly: [buildBallista(1, true)],
    ballistaDemon: [buildBallista(2, false)],
    stakesHoly: [1, 2].map((s) => buildPikeStake(s, true)),
    stakesDemon: [1, 2].map((s) => buildPikeStake(s, false)),
    brazierDemon: [buildBrazier(1, false)],
    brazierHoly: [buildBrazier(2, true)],
    obeliskDemon: [buildObelisk(1, false)],
    obeliskHoly: [buildObelisk(2, true)],
  };
}
