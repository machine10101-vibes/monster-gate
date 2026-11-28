import { VoxelModel, hash3, jitter } from '../engine/voxel.js';
import { meshFrom } from './humanoid.js';
import { VOLC } from '../data/volcanum.js';
import { pelt, curvedClaw } from './materialsJungle.js';

/**
 * Catalog, bag and Exchange models for the Volcanum and desert parts. Until these existed the
 * thumbnails for these eleven parts were blank.
 */

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));
const SZ = 0.06;
const SAND = { tan: 0xd9b98a, tanHi: 0xe6c67c, tanLo: 0xb8915f, brown: 0x746042, bone: 0xeae0c8, boneLo: 0xc8b890 };
const SCORP = { shell: 0xc4a15a, shellHi: 0xe0c078, shellLo: 0x8d6a38, sting: 0xe8d080, dark: 0x4a3424 };

/** A kite-shaped plate with a raised keel: scales and chitin. */
function plate(mat, P, keel, glow, seed) {
  const M = new VoxelModel(18, 20, 6);
  for (let y = 0; y < 18; y++) {
    const t = y / 17;
    const half = t < 0.55 ? 3 + t * 8 : 7.4 * (1 - (t - 0.55) / 0.5);
    for (let x = 0; x < 18; x++) {
      const dx = Math.abs(x + 0.5 - 9);
      if (dx > half) continue;
      const edge = dx > half - 1.4 || y < 1;
      const d = 1 + (edge ? 0 : 1) + (dx < 1.2 && !edge ? 1 : 0) + (dx < 1.2 && y > 5 && y < 14 && keel ? 1 : 0);
      const base = edge ? P.lo : t > 0.6 ? P.hi : P.mid;
      for (let z = 0; z < d + 1; z++) M.set(x, y + 1, z, J(z === d ? base : P.lo, x, y, z, seed));
    }
  }
  if (glow) for (let y = 3; y < 13; y++) M.set(9 + ((y >> 2) & 1), y + 1, 4, (y % 3 ? glow : P.hi), true);
  return meshFrom(M, 9, 10, 3, mat, SZ);
}

/** A ribbon of black stone with molten light running through it. */
function lavaVein(mat) {
  const M = new VoxelModel(28, 10, 10);
  for (let x = 0; x < 26; x++) {
    const cy = 4 + Math.sin(x * 0.45) * 2;
    const cz = 4 + Math.cos(x * 0.3) * 1.5;
    for (let y = 0; y < 10; y++)
      for (let z = 0; z < 10; z++) {
        const d = Math.hypot(y - cy, z - cz);
        if (d > 2.6) continue;
        // Molten cracks break the black stone all the way to the surface, so the vein shows its fire.
        const crack = (x + Math.round(y * 0.8 + z * 0.5)) % 4 === 0 || d < 1.1;
        M.set(x + 1, y, z, crack ? ((x + y) % 3 === 0 ? VOLC.glowHi : VOLC.glow) : J(hash3(x, y, z, 40) > 0.5 ? VOLC.scale : VOLC.scaleLo, x, y, z, 41), crack);
      }
  }
  return meshFrom(M, 14, 4, 5, mat, SZ);
}

/** A glowing heart of the mountain: a faceted ember with a cooling crust. */
function hearthCore(mat) {
  const M = new VoxelModel(18, 22, 18);
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 18; x++)
      for (let z = 0; z < 18; z++) {
        const d = Math.abs((x + 0.5 - 9) / 6.6) + Math.abs((z + 0.5 - 9) / 6.6) + Math.abs((y - 10) / (9.8 - Math.abs(y - 10) * 0.2)) * 0.7;
        if (d > 1.15) continue;
        const crust = d > 0.92 && hash3(x, y, z, 42) > 0.62;
        M.set(x, y + 1, z, crust ? J(VOLC.scaleLo, x, y, z, 43) : J(d > 0.6 ? VOLC.glow : VOLC.glowHi, x, y, z, 44, 0.04), !crust);
      }
  return meshFrom(M, 9, 11, 9, mat, SZ);
}

/** A straight horn rising to a point: spire horns and sand spines. */
function spike(mat, P, len, seed, glow) {
  const M = new VoxelModel(12, len + 4, 12);
  for (let y = 0; y < len; y++) {
    const r = 4.2 * (1 - y / len) + 0.6;
    const lean = (y / len) ** 2 * 2;
    for (let x = 0; x < 12; x++)
      for (let z = 0; z < 12; z++) {
        if (Math.hypot(x + 0.5 - 6 - lean, z + 0.5 - 6) > r) continue;
        const ring = y % 4 === 0;
        M.set(x, y, z, J(y > len * 0.75 ? P.tip : ring ? P.lo : P.mid, x, y, z, seed), !!glow && y < 3);
      }
  }
  return meshFrom(M, 6, 0, 6, mat, SZ);
}

/** A curved, ridged plate of hide: the sand worm's armour. */
function wormPlate(mat) {
  const M = new VoxelModel(24, 12, 16);
  for (let x = 0; x < 22; x++)
    for (let z = 0; z < 14; z++) {
      const arch = Math.round(5 - ((x + 0.5 - 11) / 11) ** 2 * 5);
      const ridge = z % 4 === 0;
      for (let y = Math.max(0, arch - 2); y <= arch; y++) M.set(x + 1, y, z + 1, J(ridge ? SAND.brown : y === arch ? SAND.tanHi : SAND.tan, x, y, z, 45));
    }
  return meshFrom(M, 12, 2, 8, mat, SZ);
}

export const FIRE_SAND_MATERIALS = {
  cinderscale: (mat) => plate(mat, { lo: VOLC.scaleLo, mid: VOLC.scale, hi: VOLC.scaleHi }, true, VOLC.glow, 46),
  lavavein: lavaVein,
  ashmembrane: (mat) => pelt(mat, (x, y) => ((x * 3 + y) % 9 === 0 ? { hi: VOLC.glow, lo: VOLC.membrane } : { hi: (x + y) % 5 ? VOLC.membrane : VOLC.membraneHi, lo: 0x24143e })),
  obsidianclaw: (mat) => curvedClaw(mat, { base: VOLC.scaleLo, tip: 0xffffff, claw: VOLC.claw, clawLo: 0x9a968e }, 1.3, 1.3, 47),
  spirehorn: (mat) => spike(mat, { lo: VOLC.membrane, mid: VOLC.scale, tip: VOLC.scaleHi }, 22, 48, true),
  hearthcore: hearthCore,
  cinderhide: (mat) => pelt(mat, (x, y) => ((x + y * 2) % 7 === 0 ? { hi: VOLC.trim, lo: VOLC.bellyDark } : { hi: hash3(x >> 1, y >> 1, 0, 49) > 0.5 ? VOLC.scale : VOLC.scaleHi, lo: VOLC.scaleLo })),
  sandspine: (mat) => spike(mat, { lo: SAND.boneLo, mid: SAND.bone, tip: 0xfffaf0 }, 20, 50, false),
  wormplate: wormPlate,
  scorpchitin: (mat) => plate(mat, { lo: SCORP.shellLo, mid: SCORP.shell, hi: SCORP.shellHi }, false, null, 51),
  scorpsting: (mat) => curvedClaw(mat, { base: SCORP.dark, tip: 0xfff6d0, claw: SCORP.sting, clawLo: SCORP.shellLo }, 1.0, 1.6, 52),
};
