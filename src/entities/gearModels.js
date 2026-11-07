import { VoxelModel, hash3, jitter } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { meshFrom } from './humanoid.js';
import { BUDGE } from '../data/budge.js';

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));
const SZ = 0.06;

function scaleModel(mat) {
  const M = new VoxelModel(18, 20, 6);
  for (let y = 0; y < 18; y++) {
    const t = y / 17;
    const half = t < 0.55 ? 3 + t * 8 : 7.4 * (1 - (t - 0.55) / 0.5);
    for (let x = 0; x < 18; x++) {
      const dx = Math.abs(x + 0.5 - 9);
      if (dx > half) continue;
      const edge = dx > half - 1.4 || y < 1;
      const d = 1 + (edge ? 0 : 1) + (dx < 1.2 && !edge ? 1 : 0) + (dx < 1.2 && y > 5 && y < 14 ? 1 : 0);
      const base = edge ? BUDGE.scaleLo : t > 0.6 ? BUDGE.scaleHi : BUDGE.scale;
      for (let z = 0; z < d + 1; z++) M.set(x, y + 1, z, J(z === d ? base : BUDGE.scaleLo, x, y, z, 1));
    }
  }
  for (let y = 4; y < 12; y++) M.set(9, y + 1, 4, BUDGE.vein, true);
  return meshFrom(M, 9, 10, 3, mat, SZ);
}

function fangModel(mat) {
  const M = new VoxelModel(14, 26, 14);
  for (let y = 0; y < 24; y++) {
    const t = y / 23;
    const r = 4.4 * (1 - t) ** 0.8 + 0.5;
    const bend = Math.round(t * t * 3.5);
    for (let x = 0; x < 14; x++)
      for (let z = 0; z < 14; z++) {
        const d = Math.hypot(x + 0.5 - 7, z + 0.5 - 7 - bend);
        if (d > r) continue;
        const base = y < 5 ? BUDGE.hornDark : BUDGE.tooth;
        const col = d > r - 0.9 && y > 4 ? BUDGE.claw : base;
        M.set(x, y + 1, z, J(col, x, y, z, 2, 0.04));
      }
  }
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 14; x++)
      for (let z = 0; z < 14; z++) {
        const d = Math.hypot(x + 0.5 - 7, z + 0.5 - 7);
        if (d < 5.1 && d > 4.1) M.set(x, y + 1, z, J(BUDGE.mouth, x, y, z, 3, 0.04));
      }
  return meshFrom(M, 7, 13, 7, mat, SZ);
}

function clawModel(mat) {
  const M = new VoxelModel(24, 22, 8);
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const a = t * 1.5;
    const x = Math.round(5 + Math.sin(a) * 15);
    const y = Math.round(2 + (1 - Math.cos(a)) * 15);
    const w = Math.max(0.6, 3.4 * (1 - t) + 0.5);
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++)
        for (let z = 0; z < 6; z++) {
          const d = Math.hypot(dx, dy, (z - 2.5) * 1.1);
          if (d > w * 0.9) continue;
          const col = t < 0.14 ? BUDGE.scaleLo : z < 2 ? BUDGE.hornDark : BUDGE.claw;
          M.set(x + dx, y + dy, z + 1, J(col, x + dx, y + dy, z, 4, 0.03));
        }
  }
  return meshFrom(M, 12, 11, 4, mat, SZ);
}

function hornModel(mat) {
  const M = new VoxelModel(22, 30, 14);
  for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const a = t * 1.15;
    const x = Math.round(4 + Math.sin(a) * 16);
    const y = Math.round(2 + (1 - Math.cos(a * 1.05)) * 24 * 0.95);
    const r = 4.1 * (1 - t) ** 0.9 + 0.6;
    const ring = i % 5 === 0;
    for (let dx = -5; dx <= 5; dx++)
      for (let dy = -5; dy <= 5; dy++)
        for (let dz = -5; dz <= 5; dz++) {
          const d = Math.hypot(dx, dy * 0.8, dz);
          if (d > r) continue;
          const col = ring ? BUDGE.hornDark : t < 0.1 ? BUDGE.bellyDark : t > 0.8 ? BUDGE.tooth : BUDGE.horn;
          M.set(x + dx, y + dy, 6 + dz, J(col, x + dx, y + dy, dz, 5, 0.035));
        }
  }
  return meshFrom(M, 11, 14, 7, mat, SZ);
}

function hideModel(mat) {
  const M = new VoxelModel(24, 22, 6);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 22; x++) {
      const wob = Math.sin(x * 0.6) * 1.1 + Math.cos(y * 0.5) * 0.8;
      const ex = Math.abs(x + 0.5 - 11) / 10;
      const ey = Math.abs(y + 0.5 - 9) / 8;
      if (ex ** 3 + ey ** 3 > 1 + wob * 0.06) continue;
      const stitch = (ex > 0.82 || ey > 0.8) && (x + y) % 2 === 0;
      const scaly = (x + ((y >> 1) & 1) * 2) % 4 < 2;
      const base = stitch ? BUDGE.horn : scaly ? BUDGE.scaleLo : shadeHide(x, y);
      M.set(x, y + 1, 0, J(base, x, y, 0, 6, 0.05));
      M.set(x, y + 1, 1, J(stitch ? BUDGE.hornDark : BUDGE.scaleLo, x, y, 1, 7, 0.05));
      if (!stitch && ex < 0.86 && ey < 0.84 && !scaly) M.set(x, y + 1, 2, J(BUDGE.scale, x, y, 2, 8, 0.05));
    }
  return meshFrom(M, 11, 10, 2, mat, SZ);
}

const shadeHide = (x, y) => ((x + y) % 5 === 0 ? BUDGE.scaleHi : BUDGE.scale);

const BUILDERS = { budgescale: scaleModel, budgefang: fangModel, budgeclaw: clawModel, budgehorn: hornModel, budgehide: hideModel };
const cache = {};

export function buildMaterialModel(id) {
  if (!BUILDERS[id]) return null;
  if (!cache[id]) cache[id] = BUILDERS[id](toonMaterial({ vertexColors: true }));
  return cache[id].clone();
}
