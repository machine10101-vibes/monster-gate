import { VoxelModel, hash3 } from '../engine/voxel.js';
import { bundle, buildTent } from './models.js';

const SAND = [0xd8b56a, 0xc9a45c, 0xe6c67a, 0xb48c48];
const GREEN = [0x3f7a3a, 0x4e8c42, 0x2f6630, 0x6aa356];
const WOOD = [0x8a5a32, 0x6e4424, 0xa06a3c, 0x5c381c];

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
  cyl(M, c, c, 0, 22, 4.4, skin);
  cyl(M, c, c, 22, 27, 2.8, skin);
  if (arms) {
    for (const s of [-1, 1]) {
      const y0 = 8 + (seed % 3);
      for (let x = 0; x < 7; x++) M.box(c + s * 2, y0, c - 1, c + s * (4 + x * 0.15), y0 + 3, c + 2, skin);
      cyl(M, c + s * 8, c, y0, y0 + 10, 2.1, skin);
    }
  }
  for (let y = 2; y < 24; y += 2) {
    M.set(c + 4, y, c, 0x6aa356);
    M.set(c - 4, y + 1, c, 0x8fbf62);
    M.set(c, y, c + 4, 0x2f6630);
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

export function buildDesertModels() {
  return {
    cactus: [cactus(1, true), cactus(2, true), cactus(3, false)],
    scrub: [scrub(1), scrub(2), scrub(4)],
    buttes: [butte(1), butte(3)],
    tent: buildTent(84, 0xc4a06a, 0x6e4424),
  };
}
