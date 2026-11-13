import { VoxelModel, hash3, jitter } from '../engine/voxel.js';
import { meshFrom } from './humanoid.js';

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));
const SZ = 0.06;

const TIGER = { org: 0xe07a1c, orgHi: 0xf59a40, orgLo: 0xb85a12, blk: 0x1a1410, wht: 0xf2eee4, whtLo: 0xd5cfc0, claw: 0xf3ead2, clawLo: 0xc9bd9a, clawTip: 0xfffbea };
const RAPTOR = { olv: 0x7d8438, olvLo: 0x555c26, tan: 0xbba76a, tanLo: 0x9c8a52, grey: 0x8a8e94, greyHi: 0xbcc0c6, claw: 0xe9dfbc, clawLo: 0xb8a878, tip: 0xfff6d0 };
const GOLD = { gold: 0xd2a22c, goldHi: 0xffd95a, goldLo: 0x9a7518 };
const BONE = { bone: 0xe8e0c8, boneLo: 0xbfb496, boneDark: 0x8a8068 };

function pelt(mat, color) {
  const M = new VoxelModel(24, 22, 6);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 22; x++) {
      const wob = Math.sin(x * 0.6) * 1.1 + Math.cos(y * 0.5) * 0.8;
      const ex = Math.abs(x + 0.5 - 11) / 10;
      const ey = Math.abs(y + 0.5 - 9) / 8;
      if (ex ** 3 + ey ** 3 > 1 + wob * 0.06) continue;
      const stitch = (ex > 0.82 || ey > 0.8) && (x + y) % 2 === 0;
      const top = color(x, y, 0);
      M.set(x, y + 1, 0, J(stitch ? 0x3a2214 : top.lo, x, y, 0, 21, 0.05));
      M.set(x, y + 1, 1, J(stitch ? 0x241408 : top.lo, x, y, 1, 22, 0.05));
      if (!stitch && ex < 0.86 && ey < 0.84) M.set(x, y + 1, 2, J(top.hi, x, y, 2, 23, 0.04));
    }
  return meshFrom(M, 11, 10, 2, mat, SZ);
}

function tigerSkin(mat) {
  return pelt(mat, (x, y) => {
    const ph = ((((x + Math.round(Math.sin(y * 0.5) * 1.5)) % 6) + 6) % 6);
    const dark = ph < 2 && hash3(x >> 1, y >> 2, 0, 24) < 0.9;
    const fur = y > 14 || (x < 3 && y > 4);
    if (fur) return { hi: TIGER.wht, lo: TIGER.whtLo };
    return dark ? { hi: TIGER.blk, lo: 0x0e0a08 } : { hi: ph === 5 ? TIGER.orgLo : TIGER.org, lo: TIGER.orgLo };
  });
}

function raptorSkin(mat) {
  return pelt(mat, (x, y) => {
    const row = y >> 1;
    const h = hash3((x + (row & 1)) >> 1, row, 0, 25);
    const hi = h < 0.4 ? RAPTOR.olv : h < 0.62 ? RAPTOR.olvLo : h < 0.9 ? RAPTOR.tan : RAPTOR.tanLo;
    const edge = ((x + (row & 1)) & 1) === 0 && (y & 1) === 0;
    return { hi: edge ? RAPTOR.olvLo : hi, lo: RAPTOR.olvLo };
  });
}

function curvedClaw(mat, P, scale, curl, seed) {
  const M = new VoxelModel(28, 26, 8);
  const n = Math.round(26 * scale);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = t * curl;
    const x = Math.round(5 + Math.sin(a) * 15 * scale);
    const y = Math.round(2 + (1 - Math.cos(a)) * 15 * scale);
    const w = Math.max(0.6, 3.6 * scale * (1 - t) + 0.5);
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++)
        for (let z = 0; z < 6; z++) {
          const d = Math.hypot(dx, dy, (z - 2.5) * 1.1);
          if (d > w * 0.9) continue;
          const col = t < 0.14 ? P.base : t > 0.78 ? P.tip : z < 2 ? P.clawLo : P.claw;
          M.set(x + dx, y + dy, z + 1, J(col, x + dx, y + dy, z, seed, 0.03));
        }
  }
  return meshFrom(M, 13, 11, 4, mat, SZ);
}

const tigerClaw = (mat) => curvedClaw(mat, { base: TIGER.orgLo, tip: TIGER.clawTip, claw: TIGER.claw, clawLo: TIGER.clawLo }, 1, 1.5, 26);
const raptorClaw = (mat) => curvedClaw(mat, { base: RAPTOR.greyHi, tip: RAPTOR.tip, claw: RAPTOR.claw, clawLo: RAPTOR.clawLo }, 1.15, 2.1, 27);

function scimitarModel(mat) {
  const M = new VoxelModel(30, 30, 5);
  const n = 40;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const bx = Math.round(6 + t * 15 + Math.sin(t * 2.6) * 3);
    const by = Math.round(6 + t * 20);
    const w = t < 0.75 ? 3 : Math.max(1, 3 - (t - 0.75) * 10);
    for (let k = 0; k < w; k++) {
      const edge = k === 0;
      const back = k === w - 1 && w > 2;
      M.set(bx + k, by, 2, J(edge ? 0xf2f6fc : back ? 0x8a94a6 : 0xc7d0de, bx + k, by, 2, 28, 0.03));
      if (!edge && !back) M.set(bx + k, by, 1, J(0x9aa4b6, bx + k, by, 1, 29, 0.03));
    }
  }
  for (let k = -3; k <= 3; k++) for (let z = 0; z < 5; z++) M.set(6 + k, 6, z, J(Math.abs(k) === 3 ? GOLD.goldHi : GOLD.gold, k, 6, z, 30, 0.03));
  for (let y = 2; y < 6; y++) for (let z = 1; z < 4; z++) M.set(6, y, z, J(y % 2 ? 0x5a3a1e : 0x3a2412, 6, y, z, 31, 0.04));
  for (let z = 1; z < 4; z++) M.set(6, 1, z, J(GOLD.goldHi, 6, 1, z, 32, 0.03));
  return meshFrom(M, 12, 14, 2, mat, SZ);
}

function goldPile(mat) {
  const M = new VoxelModel(22, 14, 22);
  const coin = (cx, cz, y, r) => {
    for (let x = -r; x <= r; x++)
      for (let z = -r; z <= r; z++) {
        const d = Math.hypot(x, z);
        if (d > r + 0.2) continue;
        const rim = d > r - 0.9;
        M.set(cx + x, y, cz + z, J(rim ? GOLD.goldLo : (x + z) & 1 ? GOLD.goldHi : GOLD.gold, cx + x, y, cz + z, 33, 0.03));
      }
  };
  const stack = [[10, 10, 5, 5], [9, 11, 4, 5], [11, 9, 3, 5], [10, 10, 2, 5], [10, 10, 1, 5], [5, 6, 3, 3], [5, 6, 2, 3], [5, 6, 1, 3], [16, 7, 2, 3], [16, 7, 1, 3], [15, 16, 2, 3], [15, 16, 1, 3], [7, 16, 1, 3]];
  for (let i = 0; i < stack.length; i++) {
    const [cx, cz, y, r] = stack[i];
    coin(cx, cz, y, r);
  }
  for (let x = 9; x < 12; x++) for (let z = 9; z < 12; z++) M.set(x, 6, z, J(GOLD.goldHi, x, 6, z, 34, 0.02));
  return meshFrom(M, 11, 1, 11, mat, SZ);
}

function boneModel(mat) {
  const M = new VoxelModel(32, 12, 32);
  const bone = (x0, z0, x1, z1, lift) => {
    const n = 30;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = Math.round(x0 + (x1 - x0) * t);
      const z = Math.round(z0 + (z1 - z0) * t);
      const knob = t < 0.1 || t > 0.9;
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (!knob && Math.abs(dx) + Math.abs(dz) > 1) continue;
          for (let y = 0; y < (knob ? 3 : 2); y++) M.set(x + dx, 3 + y + lift, z + dz, J(y === 0 ? BONE.boneLo : (x + z) & 1 ? BONE.bone : 0xf4eed8, x + dx, y, z + dz, 35, 0.03));
        }
    }
  };
  bone(4, 5, 27, 26, 0);
  bone(4, 26, 27, 5, 1);
  return meshFrom(M, 16, 1, 16, mat, SZ);
}

export const JUNGLE_MATERIALS = {
  tigerskin: tigerSkin,
  tigerclaw: tigerClaw,
  raptorskin: raptorSkin,
  raptorclaw: raptorClaw,
  scimitar: scimitarModel,
  pirategold: goldPile,
  piratebone: boneModel,
};
