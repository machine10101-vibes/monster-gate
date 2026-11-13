import { VoxelModel, hash3 } from '../engine/voxel.js';
import { bundle, buildTent } from './models.js';

const SAND = [0xd8b56a, 0xc9a45c, 0xe6c67a, 0xb48c48];
const GREEN = [0x3f7a3a, 0x4e8c42, 0x2f6630, 0x6aa356];
const WOOD = [0x8a5a32, 0x6e4424, 0xa06a3c, 0x5c381c];
const IRON = [0x6a6e74, 0x8a9098, 0x4e545c];
const ORE = [0xc47a3a, 0x8a8e96, 0xd4924a, 0x5c646c];
const CLOTH = [0xc4a06a, 0xd8b888, 0xa88858];

const pick = (arr, x, y, z) => arr[Math.abs(hash3(x, y, z, 3)) % arr.length];

function cyl(m, cx, cz, y0, y1, r, color) {
  const R = Math.ceil(r) + 1;
  for (let y = y0; y < y1; y++) {
    for (let z = Math.floor(cz - R); z <= Math.ceil(cz + R); z++) {
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dz = z + 0.5 - cz;
        if (dx * dx + dz * dz > r * r) continue;
        const c = typeof color === 'function' ? color(x, y, z) : color;
        if (c == null) continue;
        m.set(x, y, z, c);
      }
    }
  }
}

function cactus(seed, arms) {
  const M = new VoxelModel(28, 36, 28);
  const c = 14;
  const skin = (x, y, z) => pick(GREEN, x, y + seed, z);
  cyl(M, c, c, 0, 22, 3.2, skin);
  cyl(M, c, c, 22, 26, 2.2, skin);
  if (arms) {
    for (const s of [-1, 1]) {
      const y0 = 8 + (seed % 3);
      for (let x = 0; x < 7; x++) M.box(c + s * 2, y0, c - 1, c + s * (4 + x * 0.15), y0 + 3, c + 2, skin);
      cyl(M, c + s * 8, c, y0, y0 + 10, 2.1, skin);
    }
  }
  for (let y = 2; y < 24; y += 2) {
    M.set(c + 3, y, c, 0xe6d49a);
    M.set(c - 3, y + 1, c, 0xe6d49a);
  }
  return bundle([[M, 0.16, c, 0, c]]);
}

function scrub(seed) {
  const M = new VoxelModel(18, 12, 18);
  const c = 9;
  const twig = (x, y, z) => pick(seed % 2 ? SAND : WOOD, x, y, z + seed);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + seed;
    const x = c + Math.cos(a) * 3;
    const z = c + Math.sin(a) * 3;
    M.line(c, 1, c, x, 4 + (i % 3), z, twig, 1);
    M.line(x, 4 + (i % 3), z, x + Math.cos(a) * 2, 3, z + Math.sin(a) * 2, twig, 1);
  }
  return bundle([[M, 0.14, c, 0, c]]);
}

function butte(seed) {
  const M = new VoxelModel(22, 28, 22);
  const c = 11;
  const rock = (x, y, z) => pick(SAND, x, y + seed, z);
  for (let y = 0; y < 16; y++) {
    const r = 6.5 - y * 0.18 + (hash3(y, seed, 1, 2) % 3) * 0.15;
    cyl(M, c, c, y, y + 1, r, rock);
  }
  cyl(M, c, c, 16, 19, 3.2, rock);
  return bundle([[M, 0.22, c, 0, c]]);
}

function headframe() {
  const M = new VoxelModel(28, 40, 16);
  const wood = (x, y, z) => pick(WOOD, x, y, z);
  const iron = (x, y, z) => pick(IRON, x, y, z);
  // Two A legs and a crossbeam, three times the presence of the Greyrock frame.
  M.line(4, 0, 4, 14, 32, 8, wood, 2);
  M.line(24, 0, 4, 14, 32, 8, wood, 2);
  M.line(4, 0, 12, 14, 32, 8, wood, 2);
  M.line(24, 0, 12, 14, 32, 8, wood, 2);
  M.box(8, 30, 5, 20, 33, 11, wood);
  M.line(14, 32, 8, 14, 8, 8, iron, 1);
  M.box(12, 6, 6, 16, 8, 10, iron);
  M.set(14, 31, 8, 0xffb347, true);
  return bundle([[M, 0.22, 14, 0, 8]]);
}

function cart() {
  const M = new VoxelModel(16, 12, 22);
  const iron = (x, y, z) => pick(IRON, x, y, z);
  const wood = (x, y, z) => pick(WOOD, x, y, z);
  M.box(2, 3, 2, 14, 8, 16, wood);
  M.box(3, 8, 3, 13, 10, 15, (x, y, z) => pick(ORE, x, y, z));
  cyl(M, 4, 3, 1, 3, 1.6, iron);
  cyl(M, 12, 3, 1, 3, 1.6, iron);
  cyl(M, 4, 17, 1, 3, 1.6, iron);
  cyl(M, 12, 17, 1, 3, 1.6, iron);
  return bundle([[M, 0.16, 8, 0, 11]]);
}

function orePile(seed) {
  const M = new VoxelModel(16, 12, 16);
  const c = 8;
  for (let y = 0; y < 7; y++) {
    cyl(M, c, c, y, y + 1, 6 - y * 0.6, (x, yy, z) => pick(ORE, x, yy + seed, z));
  }
  return bundle([[M, 0.18, c, 0, c]]);
}

export function buildDesertModels() {
  return {
    cactus: [cactus(1, true), cactus(2, true), cactus(3, false)],
    scrub: [scrub(1), scrub(2), scrub(4)],
    buttes: [butte(1), butte(3)],
    tent: buildTent(84, 0xc4a06a, 0x6e4424),
    headframe: headframe(),
    cart: cart(),
    ore: [orePile(1), orePile(2), orePile(3)],
  };
}
