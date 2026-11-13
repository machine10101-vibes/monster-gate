import { VoxelModel, hash3, jitter } from '../engine/voxel.js';
import { bundle } from './models.js';

const J = (c, x, y, z, s = 0, a = 0.06) => jitter(c, a, hash3(x, y, z, s));

/**
 * A timber-and-stone smithy in the Oakhollow style: teal roof, open hearth,
 * chimney, anvil and a stack of bars. Faces local +Z.
 */
export function buildSmithy(seed = 11) {
  const M = new VoxelModel(56, 48, 44);
  const stone = (x, y, z) => J(((x >> 1) + (z >> 1) + y) % 2 ? 0x8d8880 : 0x6e6a64, x, y, z, seed, 0.07);
  const timber = (x, y, z) => J(0x6a4328, x, y, z, seed + 2, 0.06);
  const plaster = (x, y, z) => J(y % 5 === 0 ? 0xd9c7a4 : 0xefe2c8, x, y, z, seed + 3, 0.04);
  const teal = (x, y, z) => J((x + z) % 3 === 0 ? 0x174e48 : 0x1f6f66, x, y, z, seed + 4, 0.05);
  const iron = (x, y, z) => J(0xb7c0c8, x, y, z, seed + 5, 0.04);

  M.box(4, 0, 4, 48, 3, 36, stone);
  M.box(6, 3, 6, 46, 22, 34, plaster);
  for (const x of [6, 7, 45, 46]) M.box(x, 3, 6, x, 22, 34, timber);
  for (const z of [6, 7, 33, 34]) M.box(6, 3, z, 46, 22, z, timber);
  M.box(6, 20, 6, 46, 22, 34, timber);
  M.carve(18, 3, 30, 34, 16, 36);
  M.box(17, 3, 33, 35, 17, 35, timber);
  M.box(20, 3, 34, 32, 4, 36, stone);

  M.box(10, 8, 6, 16, 14, 7, 0x1a2428);
  M.box(36, 8, 6, 42, 14, 7, 0x1a2428);
  M.box(9, 7, 5, 17, 8, 8, timber);
  M.box(35, 7, 5, 43, 8, 8, timber);
  M.box(9, 14, 5, 17, 15, 8, timber);
  M.box(35, 14, 5, 43, 15, 8, timber);

  for (let i = 0; i < 9; i++) {
    const y1 = 22 + i;
    const inset = i;
    M.box(4 + inset, y1, 4 + inset, 48 - inset, y1 + 1, 36 - inset, teal);
  }
  M.box(12, 31, 12, 40, 33, 28, teal);

  M.box(8, 3, 8, 16, 40, 16, stone);
  M.box(9, 40, 9, 15, 44, 15, stone);
  M.box(10, 43, 10, 14, 46, 14, 0x3a3e44);
  M.box(11, 22, 11, 13, 40, 13, 0x2a2e32);

  M.box(8, 4, 18, 18, 12, 28, 0x2c2a2e);
  M.box(9, 5, 19, 17, 9, 27, (x, y, z) => ((x + z) % 3 === 0 ? 0xffb347 : (x * 5 + z) % 4 === 0 ? 0xff5a1a : 0xd92a0a), true);
  for (let i = 0; i < 6; i++) {
    const fx = 10 + (i % 3) * 2;
    const fz = 20 + Math.floor(i / 3) * 3;
    M.box(fx, 9, fz, fx + 1, 12 + (i % 3), fz + 1, (x, y) => (y > 11 ? 0xffe27a : 0xff8a1a), true);
  }
  M.box(8, 12, 18, 18, 14, 28, iron);
  M.box(19, 6, 20, 22, 10, 26, timber);

  M.box(36, 3, 22, 44, 6, 30, iron);
  for (let k = 0; k < 4; k++) M.box(38, 6 + k, 24, 42, 7 + k, 28, k % 2 ? 0x8d969e : 0xd7dee6);

  M.box(24, 3, 37, 30, 6, 43, 0x3a3e44);
  M.box(25, 6, 38, 29, 8, 42, 0x6e7680);
  M.box(26, 8, 39, 28, 11, 41, 0x9aa3ab);

  M.box(38, 3, 36, 46, 5, 42, stone);
  M.box(39, 5, 37, 45, 7, 41, 0x3a6f9a);

  M.box(22, 16, 35, 30, 22, 36, timber);
  M.box(23, 17, 36, 29, 21, 37, teal);
  M.box(25, 18, 37, 27, 20, 38, 0xf2efe6);

  return bundle([[M, 0.1, 26, 0, 20]]);
}
