import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade, mix, clamp, RNG } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { BUDGE } from '../data/budge.js';
import { paintHelm, paintChest, paintArm, paintLeg } from './armor.js';

export const S = 0.03;

const J = (c, x, y, z, s = 0, a = 0.06) => jitter(c, a, hash3(x, y, z, s));

export function meshFrom(model, ox, oy, oz, mat, size = S) {
  const g = model.build(size, ox, oy, oz);
  const grp = new THREE.Group();
  for (const kind of ['solid', 'glow']) {
    if (!g[kind]) continue;
    const mesh = new THREE.Mesh(g[kind], kind === 'solid' ? mat : new THREE.MeshBasicMaterial({ vertexColors: true }));
    mesh.castShadow = kind === 'solid';
    mesh.receiveShadow = false;
    grp.add(mesh);
  }
  return grp;
}

export const HERO = {
  skin: 0xd8a070, hair: 0x3a281c, hairStyle: 'messy', tunic: 0x3d2c22, tunicLight: 0x4d392c,
  pants: 0x2f221b, boots: 0x2b2019, metal: 0x8a8b91, metalDark: 0x4b4c52, strap: 0x5d4332, hero: true, seed: 3,
};

export function buildHumanoid(o = {}) {
  const c = { ...HERO, ...o };
  const seed = c.seed;
  const mat = toonMaterial({ vertexColors: true });
  const skinShade = shade(c.skin, 0.84);

  /* --------------------------- torso --------------------------- */
  const T = new VoxelModel(26, 56, 18);
  const OY = 16;
  const ty = (y) => y + OY;
  const tunicFn = (x, y, z) => {
    const weave = (y + (x >> 1)) % 3 === 0 ? 0.92 : 1;
    return shade(J(c.tunic, x, y, z, seed, 0.07), weave);
  };
  T.box(5, ty(0), 5, 21, ty(18), 13, (x, y, z) => tunicFn(x, y - OY, z));
  T.box(7, ty(17), 4, 19, ty(21), 14, (x, y, z) => shade(J(c.hero ? 0x2c231c : shade(c.tunic, 0.8), x, y, z, seed, 0.08), (y + z) % 3 === 0 ? 0.88 : 1));
  T.box(6, ty(17), 5, 20, ty(18), 13, (x, y, z) => J(shade(c.tunic, 0.7), x, y, z, seed, 0.06));
  T.box(8, ty(20), 5, 18, ty(22), 13, (x, y, z) => J(c.hero ? 0x261e18 : shade(c.tunic, 0.75), x, y, z, seed, 0.07));

  if (c.hero || c.vest) {
    const strapCol = (x, y, z) => J(c.strap, x, y, z, seed, 0.07);
    for (let y = 2; y <= 17; y++) {
      const xcA = 13 - 5 + ((17 - y) / 15) * 10;
      const xcB = 13 + 5 - ((17 - y) / 15) * 10;
      for (const [xc, back] of [[xcA, false], [xcB, false], [xcA, true], [xcB, true]]) {
        const xi = Math.round(xc - 1);
        const z = back ? 4 : 13;
        for (let k = 0; k < 3; k++) {
          const col = k === 1 ? strapCol(xi + k, y, z) : shade(strapCol(xi + k, y, z), 0.8);
          T.set(xi + k, ty(y), z, col);
        }
      }
    }
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d <= 3) {
          const ring = d >= 2;
          const col = ring ? J(c.metal, dx, dy, 1, seed, 0.05) : 0x25252b;
          T.set(13 + dx, ty(10 + dy), 14, col);
          T.set(13 + dx, ty(10 + dy), 4 - 1 + 0, ring ? J(c.metal, dx, dy, 2, seed, 0.05) : 0x25252b);
        }
      }
    T.set(13, ty(10), 14, 0x1a1a1e);
  }

  if (c.hero || c.belt) {
    T.box(4, ty(1), 4, 22, ty(5), 14, (x, y, z) => {
      const stitch = (x + z) % 4 === 0 ? 1.15 : 1;
      return shade(J(0x2b1f17, x, y, z, seed, 0.08), stitch);
    });
    T.box(4, ty(4), 4, 22, ty(5), 14, (x, y, z) => J(0x3a2a1f, x, y, z, seed, 0.06));
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        const ring = x === 0 || x === 4 || y === 0 || y === 4;
        T.set(11 + x, ty(0) + y, 14, ring ? J(c.metal, x, y, 3, seed, 0.05) : 0x1a1410);
        if (ring) T.set(11 + x, ty(0) + y, 15, shade(c.metal, 1.1));
      }
  }
  if (c.apron) {
    T.box(8, ty(-6), 13, 18, ty(14), 14, (x, y, z) => J(c.apron, x, y, z, seed, 0.06));
    T.box(8, ty(14), 13, 10, ty(18), 14, c.apron);
    T.box(16, ty(14), 13, 18, ty(18), 14, c.apron);
  }

  if (c.hero) {
    const slantX = (y) => 18 + ((30 - y) / 44) * 7;
    for (let y = -13; y <= 30; y++) {
      const cx = slantX(y);
      let w = 4;
      let colFn;
      if (y >= 21) {
        w = 2;
        colFn = (x, yy, z) => J(0x2b2020, x, yy, z, seed, 0.1);
      } else if (y >= 18) {
        w = 9;
        colFn = (x, yy, z) => J(0x6b6c72, x, yy, z, seed, 0.06);
      } else {
        w = y < -9 ? 3 : 5;
        colFn = (x, yy, z) => {
          const mid = Math.abs(x - cx) < 0.8;
          return J(mid ? 0x6d6e75 : 0xa4a6ae, x, yy, z, seed, 0.06);
        };
      }
      const x0 = Math.round(cx - w / 2);
      for (let xi = x0; xi < x0 + w; xi++) {
        for (let z = 1; z <= 3; z++) {
          if (y >= 18 && y < 21 && z < 3) continue;
          if (y < 18 && z === 1) continue;
          T.set(xi, ty(y), z, colFn(xi, y, z));
        }
      }
    }
    T.box(slantX(30) - 1, ty(30), 1, slantX(30) + 1, ty(32), 4, 0x6b6c72);
    T.box(12, ty(2), 2, 20, ty(5), 4, (x, y, z) => J(0x3a2a1f, x, y, z, seed, 0.08));
  }
  if (c.armor?.chest) paintChest(T, ty);
  const torso = meshFrom(T, 13, OY, 9, mat);

  /* ---------------------------- head --------------------------- */
  const H = new VoxelModel(20, 24, 20);
  const HC = 10;
  const rowY = (r) => r + 1;
  const headSkin = (x, y, z) => {
    const cx = Math.abs(x - 9.5) / 6;
    return shade(J(c.skin, x, y, z, seed + 1, 0.05), 1 - cx * cx * 0.12 - (y < 3 ? 0.04 : 0));
  };
  H.box(4, rowY(0), 4, 16, rowY(12), 16, headSkin);
  H.box(3, rowY(4), 9, 4, rowY(7), 11, (x, y, z) => shade(J(c.skin, x, y, z, 4, 0.05), 0.9));
  H.box(16, rowY(4), 9, 17, rowY(7), 11, (x, y, z) => shade(J(c.skin, x, y, z, 5, 0.05), 0.9));
  const fz = 15;
  const col = (cc) => 4 + cc;
  const eyeWhite = 0xf0ecdf;
  const eyeIris = c.eye ?? 0x2a1c12;
  const lash = shade(c.hair, 0.55);
  for (const x0 of [2, 7]) {
    H.set(col(x0), rowY(5), fz, eyeWhite);
    H.set(col(x0 + 1), rowY(5), fz, eyeWhite);
    H.set(col(x0 + 2), rowY(5), fz, eyeIris);
    for (let k = 0; k < 3; k++) H.set(col(x0 + k), rowY(6), fz, lash);
    H.set(col(x0 + 1), rowY(5), fz, eyeWhite);
  }
  const browCol = shade(c.hair, 0.7);
  if (c.hero) {
    for (const [cc, r] of [[1, 8], [2, 8], [3, 7], [4, 7], [7, 7], [8, 7], [9, 8], [10, 8]]) {
      H.set(col(cc), rowY(r), fz, browCol);
      H.set(col(cc), rowY(r), fz - 1, browCol);
    }
    H.set(col(3), rowY(8), fz, browCol);
    H.set(col(8), rowY(8), fz, browCol);
  } else {
    for (const cc of [2, 3, 4, 7, 8, 9]) H.set(col(cc), rowY(7), fz, browCol);
  }
  for (let r = 3; r <= 4; r++)
    for (let cc = 5; cc <= 6; cc++) H.set(col(cc), rowY(r), fz + 1, r === 3 ? shade(c.skin, 0.88) : shade(c.skin, 1.04));
  H.set(col(5), rowY(2), fz, skinShade);
  H.set(col(6), rowY(2), fz, skinShade);
  const mouth = c.hero ? 0x7a4630 : 0x8a4a3a;
  for (let cc = 4; cc <= 7; cc++) H.set(col(cc), rowY(1), fz, mouth);
  if (!c.hero) {
    H.set(col(3), rowY(2), fz, mouth);
    H.set(col(8), rowY(2), fz, mouth);
  }
  if (c.beard) {
    for (let r = 0; r <= 3; r++) for (let cc = 2; cc <= 9; cc++) if (!(r === 1 && cc >= 4 && cc <= 7)) H.set(col(cc), rowY(r), fz + (r === 0 ? 0 : 0), J(c.hair, cc, r, 1, seed, 0.1));
  }

  const hairPal = [shade(c.hair, 0.78), c.hair, shade(c.hair, 1.18), shade(c.hair, 0.92)];
  const hairAt = (x, y, z) => hairPal[Math.floor(hash3(x >> 1, y >> 1, z >> 1, seed + 6) * 4)];
  const style = c.armor?.helm ? 'bald' : c.hairStyle;
  if (style && style !== 'bald') {
    const messy = style === 'messy';
    const topR = messy ? 5.4 : 4.4;
    for (let z = 1; z < 19; z++)
      for (let y = rowY(6); y < 24; y++)
        for (let x = 1; x < 19; x++) {
          const dx = (x + 0.5 - 10) / 7.8;
          const dy = (y - rowY(10)) / topR;
          const dz = (z + 0.5 - 10) / 7.8;
          const n = hash3(x, y, z, seed + 9);
          const d = dx * dx + dy * dy * (y >= rowY(10) ? 1 : 0.0) + dz * dz;
          const inHead = x >= 4 && x < 16 && z >= 4 && z < 16 && y < rowY(12) + (messy ? 0 : 0);
          const isTop = y >= rowY(10);
          const onSide = (x <= 4 || x >= 15) && y >= rowY(7);
          const onBack = z <= 5 && y >= rowY(2 + (c.hairLen || 0 ? 0 : 3));
          const inBlob = isTop ? d <= 1 + (n - 0.5) * (messy ? 0.75 : 0.35) : false;
          const sideBlob = (x <= 3 || x >= 16) && y >= rowY(6) && z >= 4 && z < 16 && d <= 1.15;
          if (isTop && inBlob && !(z >= 13 && y < rowY(10))) {
            if (y < rowY(12) && inHead && z >= 14 && x >= 4 && x < 16) {
              H.set(x, y, z, hairAt(x, y, z));
            } else {
              H.set(x, y, z, hairAt(x, y, z));
            }
          } else if (inHead && onSide && !(z >= 12 && y < rowY(9))) {
            H.set(x, y, z, hairAt(x, y, z));
          } else if (inHead && onBack) {
            H.set(x, y, z, hairAt(x, y, z));
          } else if (sideBlob && messy && n > 0.45) {
            H.set(x, y, z, hairAt(x, y, z));
          }
        }
    for (let cc = 0; cc < 12; cc++) {
      const jag = hash3(cc, 1, 1, seed + 2);
      const depth = cc === 0 || cc === 11 ? 4 : jag > 0.62 ? 2 : jag > 0.28 ? 3 : 1;
      for (let r = 12 - depth; r <= 11; r++) {
        H.set(col(cc), rowY(r), fz, hairAt(col(cc), rowY(r), fz));
        H.set(col(cc), rowY(r), fz - 1, hairAt(col(cc), rowY(r), fz - 1));
      }
    }
    if (messy) {
      const rng = new RNG(seed * 7);
      for (let i = 0; i < 26; i++) {
        const a = rng.range(0, Math.PI * 2);
        const rr = rng.range(2, 6.5);
        const x = Math.round(10 + Math.cos(a) * rr);
        const z = Math.round(10 + Math.sin(a) * rr);
        for (let y = rowY(10); y < 24; y++) {
          if (H.has(x, y, z) && !H.has(x, y + 1, z)) {
            for (let k = 1; k <= rng.int(1, 2); k++) H.set(x, y + k, z, hairAt(x, y + k, z));
            break;
          }
        }
      }
    }
    if (c.hairLen) {
      for (let y = rowY(0) - c.hairLen; y < rowY(8); y++)
        for (let x = 4; x < 16; x++) for (let z = 3; z < 6; z++) H.set(x, y, z, hairAt(x, y, z));
    }
  }
  if (c.hat === 'straw') {
    for (let z = 0; z < 20; z++)
      for (let x = 0; x < 20; x++) {
        const d = Math.hypot(x + 0.5 - 10, z + 0.5 - 10);
        if (d <= 9.6) H.set(x, rowY(11), z, J(0xdcb45c, x, 11, z, seed, 0.08));
        if (d <= 6.4) for (let y = rowY(12); y < rowY(15); y++) H.set(x, y, z, J(0xe2bd66, x, y, z, seed, 0.08));
        if (d <= 6.6 && d > 5.5) H.set(x, rowY(12), z, 0xb83a2e);
      }
  }
  if (c.hat === 'cap') {
    for (let z = 3; z < 17; z++)
      for (let x = 3; x < 17; x++) {
        const dx = (x + 0.5 - 10) / 6.8;
        const dz = (z + 0.5 - 10) / 6.8;
        for (let y = rowY(10); y < rowY(14); y++) {
          const dy = (y - rowY(10)) / 3.4;
          if (dx * dx + dy * dy + dz * dz <= 1) H.set(x, y, z, J(c.hatColor || 0x2f6f4f, x, y, z, seed, 0.06));
        }
      }
    for (let x = 5; x < 15; x++) for (let z = 15; z < 18; z++) H.set(x, rowY(11), z, J(shade(c.hatColor || 0x2f6f4f, 0.85), x, 11, z, seed, 0.05));
  }
  if (c.armor?.helm) paintHelm(H, rowY);
  const head = meshFrom(H, HC, rowY(0), HC, mat);

  /* ---------------------------- arms --------------------------- */
  const makeArm = (side) => {
    const A = new VoxelModel(14, 30, 14);
    const mx = (x) => (side > 0 ? x : 13 - x);
    const set = (x, y, z, col) => A.set(mx(x), y, z, col);
    const fillBox = (x0, y0, z0, x1, y1, z1, fn) => {
      for (let z = z0; z < z1; z++)
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn);
    };
    const sleeve = c.sleeve ?? c.tunic;
    fillBox(4, 3, 4, 9, 7, 10, (x, y, z) => shade(J(c.skin, x, y, z, seed + 2, 0.05), y === 3 ? 0.88 : 1));
    if (c.hero || c.bracer) {
      fillBox(4, 7, 4, 9, 14, 10, (x, y, z) => J(0x372820, x, y, z, seed, 0.07));
      fillBox(3, 7, 3, 10, 9, 11, (x, y, z) => J(0x2a1f18, x, y, z, seed, 0.07));
      for (let z = 3; z < 11; z++)
        for (let x = 3; x < 10; x++) {
          if ((x === 3 || x === 9 || z === 3 || z === 10) && (x + z) % 2 === 0) set(x, 11, z, J(c.metal, x, 11, z, seed, 0.05));
          if (x === 3 || x === 9 || z === 3 || z === 10) set(x, 12, z, J(c.metalDark, x, 12, z, seed, 0.05));
        }
      set(6, 10, 10, c.metal);
      set(7, 10, 10, c.metal);
    } else {
      fillBox(4, 7, 4, 9, 14, 10, (x, y, z) => J(sleeve, x, y, z, seed, 0.07));
      fillBox(3, 7, 3, 10, 8, 11, (x, y, z) => J(shade(sleeve, 0.8), x, y, z, seed, 0.07));
    }
    fillBox(3, 14, 3, 10, 22, 11, (x, y, z) => shade(J(sleeve, x, y, z, seed, 0.07), (y + (x >> 1)) % 3 === 0 ? 0.92 : 1));
    if (c.hero) {
      fillBox(3, 17, 3, 10, 18, 11, (x, y, z) => J(c.strap, x, y, z, seed, 0.07));
      const leather = (x, y, z) => J(0x3b2a20, x, y, z, seed, 0.09);
      fillBox(3, 21, 3, 10, 23, 11, leather);
      fillBox(2, 23, 2, 11, 25, 12, leather);
      fillBox(3, 25, 3, 10, 27, 11, leather);
      fillBox(10, 21, 3, 12, 26, 11, (x, y, z) => leather(x, y, z));
      for (let y = 21; y < 26; y++)
        for (let z = 2; z < 12; z++) {
          const edge = (y + z) % 2 === 0;
          set(12, y, z, edge ? J(c.metal, y, z, 12, seed, 0.05) : leather(12, y, z));
        }
      for (let z = 3; z < 11; z += 3) set(10, 26, z, J(c.metal, z, 26, 0, seed, 0.05));
      for (let x = 3; x < 10; x++) set(x, 24, 11, (x % 3 === 0) ? c.metal : leather(x, 24, 11));
      for (let x = 3; x < 10; x++) set(x, 24, 2, (x % 3 === 0) ? c.metal : leather(x, 24, 2));
    } else {
      fillBox(3, 20, 3, 10, 24, 11, (x, y, z) => J(shade(sleeve, 1.05), x, y, z, seed, 0.07));
    }
    if (c.armor?.arms) paintArm(A, set);
    const grp = meshFrom(A, 6.5, 22, 7, mat);
    return grp;
  };

  /* ---------------------------- legs --------------------------- */
  const makeLeg = (side) => {
    const L = new VoxelModel(14, 30, 16);
    const mx = (x) => (side > 0 ? x : 13 - x);
    const set = (x, y, z, col) => L.set(mx(x), y, z, col);
    const fillBox = (x0, y0, z0, x1, y1, z1, fn) => {
      for (let z = z0; z < z1; z++)
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) set(x, y, z, typeof fn === 'function' ? fn(x, y, z) : fn);
    };
    const boot = (x, y, z) => J(c.boots, x, y, z, seed, 0.08);
    fillBox(3, 1, 3, 10, 9, 10, boot);
    fillBox(3, 0, 3, 10, 1, 10, (x, y, z) => J(0x16110d, x, y, z, seed, 0.05));
    fillBox(3, 0, 10, 10, 1, 13, 0x16110d);
    fillBox(3, 1, 10, 10, 4, 13, boot);
    fillBox(4, 4, 10, 9, 5, 12, boot);
    fillBox(3, 7, 3, 10, 10, 10, (x, y, z) => J(0x4a3527, x, y, z, seed, 0.07));
    fillBox(2, 9, 2, 11, 11, 11, (x, y, z) => J(c.hero ? 0x4a3527 : shade(c.boots, 1.25), x, y, z, seed, 0.07));
    if (c.hero) {
      for (let y = 4; y < 7; y++) for (let z = 4; z < 8; z++) if ((y + z) % 2 === 0) set(10, y, z, J(c.metal, y, z, 3, seed, 0.05));
      set(5, 8, 10, c.metal);
      set(6, 8, 10, c.metal);
      set(7, 8, 10, c.metal);
    }
    fillBox(3, 11, 3, 10, 24, 10, (x, y, z) => shade(J(c.pants, x, y, z, seed, 0.07), (y + z) % 3 === 0 ? 0.92 : 1));
    if (c.hero) {
      fillBox(3, 13, 10, 10, 18, 11, (x, y, z) => J(0x4a3527, x, y, z, seed, 0.08));
      for (let x = 5; x <= 7; x++) set(x, 15, 11, c.metal);
      set(6, 16, 11, c.metalDark);
      fillBox(2, 19, 2, 11, 21, 11, (x, y, z) => J(0x4a3527, x, y, z, seed, 0.08));
      set(5, 20, 11, c.metal);
      set(6, 20, 11, c.metal);
      for (let y = 18; y < 23; y++) for (let z = 3; z < 10; z++) if (z % 2 === 0 && y % 2 === 0) set(10, y, z, J(c.metal, y, z, 5, seed, 0.06));
    }
    if (c.armor?.legs || c.armor?.boots) paintLeg(set, c.armor);
    return meshFrom(L, 6.5, 24, 6.5, mat);
  };

  /* ---------------------------- rig ---------------------------- */
  const root = new THREE.Group();
  const hip = new THREE.Group();
  hip.position.y = 24 * S;
  root.add(hip);
  const upper = new THREE.Group();
  hip.add(upper);
  upper.add(torso);
  const headG = new THREE.Group();
  headG.position.y = 19 * S;
  headG.add(head);
  upper.add(headG);

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-10.7 * S, 17 * S, 0);
  armR.position.set(10.7 * S, 17 * S, 0);
  armL.add(makeArm(-1));
  armR.add(makeArm(1));
  upper.add(armL, armR);

  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-4.1 * S, 0, 0);
  legR.position.set(4.1 * S, 0, 0);
  legL.add(makeLeg(-1));
  legR.add(makeLeg(1));
  hip.add(legL, legR);

  const hand = new THREE.Group();
  hand.position.set(0, -17.3 * S, 0);
  armR.add(hand);
  const heldSlot = new THREE.Group();
  hand.add(heldSlot);

  const shieldG = new THREE.Group();
  armL.add(shieldG);
  if (c.hero) {
    shieldG.add(buildShield(mat));
    shieldG.visible = false;
  }

  root.traverse((o) => {
    if (o.isMesh) o.frustumCulled = true;
  });
  return { root, torso, hip, upper, head: headG, armL, armR, legL, legR, hand, heldSlot, shieldG, mat };
}

function buildShield(mat) {
  const M = new VoxelModel(24, 6, 24);
  for (let z = 0; z < 24; z++)
    for (let x = 0; x < 24; x++) {
      const dx = x + 0.5 - 12;
      const dz = z + 0.5 - 12;
      const d = Math.hypot(dx, dz * 0.86);
      if (d > 11) continue;
      let col;
      if (d > 9.2) col = J(0x80818a, x, 1, z, 3, 0.06);
      else if (d < 2.8) col = J(0xb9bac2, x, 1, z, 4, 0.05);
      else col = J((Math.floor(x / 3) % 2 ? 0x7a4e2c : 0x6a4325), x, 1, z, 5, 0.07);
      M.set(x, 2, z, col);
      if (d > 9.2 || d < 4.2) M.set(x, 3, z, shade(col, 1.1));
      if (d < 2.8) M.set(x, 4, z, shade(col, 1.15));
      M.set(x, 1, z, shade(J(0x5a3a22, x, 1, z, 3, 0.06), 0.9));
    }
  const g = meshFrom(M, 12, 3, 12, mat);
  g.position.set(0, -13.5 * S, 0);
  g.scale.setScalar(1);
  g.rotation.set(0, 0, 0);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

/* ------------------------------------------------------------------ */
/* Held items                                                          */
/* ------------------------------------------------------------------ */

const heldCache = {};
export function buildHeld(kind) {
  if (heldCache[kind]) return heldCache[kind].clone();
  const mat = toonMaterial({ vertexColors: true });
  const tall = kind === 'budgebow';
  const wide = kind === 'budgemaul';
  const M = new VoxelModel(wide ? 26 : 16, tall ? 56 : 16, 56);
  const cx = wide ? 13 : 8;
  const cy = tall ? 28 : 8;
  const set = (x, y, z, c, glow = false) => M.set(cx + x, cy + y, z, c, glow);
  const steel = (x, y, z) => J(0xaeb1b9, x, y, z, 1, 0.07);
  const wood = (x, y, z) => J(0x7a4e2c, x, y, z, 2, 0.08);
  if (kind === 'blade') {
    for (let z = 0; z < 6; z++) for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) set(x, y, z, J(0x4a2c16, x, y, z, 1, 0.1));
    for (let x = -4; x <= 3; x++) for (let y = -1; y <= 0; y++) set(x, y, 6, J(0xb8923a, x, y, 6, 1, 0.06));
    for (let z = 7; z < 40; z++) {
      const w = z > 35 ? 1 : z > 32 ? 2 : 3;
      for (let x = -Math.floor(w / 2); x < w - Math.floor(w / 2); x++) {
        for (let y = -1; y <= 0; y++) {
          const edge = x === -Math.floor(w / 2) || x === w - Math.floor(w / 2) - 1;
          set(x, y, z, edge ? J(0xd2d5dc, x, y, z, 2, 0.05) : J(0x8f939b, x, y, z, 2, 0.06));
        }
      }
    }
  } else if (kind === 'axe') {
    for (let z = 0; z < 34; z++) for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++) set(x - 1, y - 1, z, wood(x, y, z));
    for (let z = 24; z < 34; z++) {
      const sp = Math.round(((z - 24) / 9) * 4);
      for (let y = -5 - sp / 2; y <= 4 + sp / 2; y++) {
        for (let x = -1; x <= 0; x++) set(x, Math.round(y), z, steel(x, y, z));
      }
    }
    for (let y = -5; y <= 4; y++) set(-1, y, 34, 0xdfe2e8);
  } else if (kind === 'pick') {
    for (let z = 0; z < 34; z++) for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++) set(x - 1, y - 1, z, wood(x, y, z));
    for (let y = -9; y <= 8; y++) {
      const bend = Math.round(Math.abs(y) * 0.28);
      for (let x = -1; x <= 0; x++) for (let k = 0; k < 3; k++) set(x, y, 31 - bend + (k < 2 ? 0 : 0) + k - 1, steel(x, y, 31 - bend + k));
    }
    set(-1, -10, 28, 0xdfe2e8);
    set(-1, 9, 28, 0xdfe2e8);
  } else if (kind === 'hammer') {
    for (let z = 0; z < 32; z++) for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++) set(x - 1, y - 1, z, wood(x, y, z));
    for (let z = 26; z < 38; z++) for (let y = -5; y <= 4; y++) for (let x = -3; x <= 2; x++) set(x, y, z, (z === 26 || z === 37 || y === -5 || y === 4) ? J(0x777a82, x, y, z, 4, 0.06) : J(0x9a9da6, x, y, z, 4, 0.06));
  } else if (kind === 'bow') {
    for (let y = -18; y <= 18; y++) {
      const bend = Math.round((1 - (y / 18) ** 2) * 9);
      for (let k = 0; k < 2; k++) set(0, y, 16 + bend + k, J(0x7a4e2c, y, k, 0, 5, 0.1));
      set(0, y, 16, y % 4 === 0 ? 0xe8e0c8 : 0xcfc7b0);
    }
    for (let y = -2; y <= 2; y++) set(0, y, 19 + 9, J(0x3a2a1f, y, 0, 0, 6, 0.1));
  } else if (kind === 'torch') {
    for (let z = 0; z < 24; z++) for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++) set(x - 1, y - 1, z, wood(x, y, z));
    for (let z = 22; z < 26; z++) for (let x = -2; x <= 1; x++) for (let y = -2; y <= 1; y++) set(x, y, z, 0x3e4046);
    for (let z = 26; z < 31; z++) for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) set(x, y, z, z < 29 ? 0xff7a1a : 0xffcf4a, true);
    set(0, 0, 31, 0xfff1b0, true);
  } else if (kind === 'potion') {
    for (let z = 4; z < 10; z++) for (let x = -3; x <= 2; x++) for (let y = -3; y <= 2; y++) set(x, y, z, (z >= 8) ? 0xffffff : 0xff4a6a, z < 8);
    for (let z = 10; z < 14; z++) for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) set(x, y, z, 0xdde8f0);
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) set(x, y, 14, 0x8a5a30);
  } else if (kind === 'stone') {
    for (let z = 2; z < 9; z++) for (let x = -3; x <= 2; x++) for (let y = -3; y <= 2; y++) if (Math.hypot(x + 0.5, y + 0.5, z - 5.5) < 3.8) set(x, y, z, J(0x8d939a, x, y, z, 7, 0.1));
  } else if (kind === 'budgeblade') {
    const wrap = (x, y, z) => J((z >> 1) % 2 ? BUDGE.scaleLo : BUDGE.scale, x, y, z, 21, 0.05);
    for (let z = 1; z < 8; z++) for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) set(x, y, z, wrap(x, y, z));
    for (let x = -1; x <= 0; x++) for (let y = -2; y <= 1; y++) set(x, y, 0, J(BUDGE.horn, x, y, 0, 22, 0.04));
    for (let x = -5; x <= 4; x++) for (let y = -1; y <= 0; y++) set(x, y, 8, J(x === -1 || x === 0 ? BUDGE.bellyDark : BUDGE.horn, x, y, 8, 23, 0.04));
    for (const [sx, dir] of [[-5, -1], [4, 1]]) {
      for (let k = 1; k <= 4; k++) for (let y = -1; y <= 0; y++) set(sx + (k > 2 ? -dir * (k - 2) : 0), y, 8 + k, J(BUDGE.horn, sx, y, k, 24, 0.04));
    }
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) set(x, y, 9, BUDGE.vein, true);
    for (let z = 10; z < 46; z++) {
      const w = z < 28 ? 5 : z < 36 ? 4 : z < 41 ? 3 : z < 44 ? 2 : 1;
      const x0 = -Math.floor(w / 2);
      for (let xi = x0; xi < x0 + w; xi++) {
        const edge = xi === x0 || xi === x0 + w - 1;
        for (let y = -1; y <= 0; y++) set(xi, y, z, edge ? J(BUDGE.claw, xi, y, z, 25, 0.03) : J(BUDGE.horn, xi, y, z, 25, 0.05));
      }
      if (w >= 4 && z % 4 === 0 && z > 16) for (let y = -1; y <= 0; y++) set(x0 + w, y, z, J(BUDGE.hornDark, 0, y, z, 26, 0.04));
      if (z > 12 && z < 40 && z % 5 !== 4) for (let y = -1; y <= 0; y++) set(0, y, z, BUDGE.vein, true);
    }
  } else if (kind === 'budgemaul') {
    for (let z = 0; z < 32; z++) for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++) set(x - 1, y - 1, z, z < 12 ? J((z >> 1) % 2 ? BUDGE.scaleLo : BUDGE.scale, x, y, z, 27, 0.05) : wood(x, y, z));
    for (let x = -2; x <= 1; x++) for (let y = -2; y <= 1; y++) set(x, y, 0, J(BUDGE.horn, x, y, 0, 28, 0.04));
    for (let z = 27; z < 41; z++)
      for (let y = -4; y <= 3; y++)
        for (let x = -3; x <= 2; x++) {
          const band = z === 27 || z === 40 || z === 33 || z === 34;
          const c = band ? J(BUDGE.bellyDark, x, y, z, 29, 0.05) : (x + y + z) % 3 === 0 ? J(BUDGE.scaleLo, x, y, z, 29, 0.05) : J(BUDGE.scale, x, y, z, 29, 0.05);
          set(x, y, z, c);
        }
    for (const [sx, dir] of [[-4, -1], [3, 1]]) {
      for (let k = 0; k < 8; k++) {
        const w = k < 4 ? 3 : k < 6 ? 2 : 1;
        const xx = sx + dir * k;
        const zz = 32 + Math.floor((k * k) / 8);
        for (let yy = -2; yy < -2 + w; yy++)
          for (let q = 0; q < w; q++) set(xx, yy, zz + q, J(k % 3 === 2 ? BUDGE.hornDark : BUDGE.horn, xx, yy, k, 30, 0.04));
      }
    }
    for (let k = 0; k < 8; k++) {
      const w = k < 3 ? 3 : k < 6 ? 2 : 1;
      for (let x = -Math.floor(w / 2); x < w - Math.floor(w / 2); x++) for (let y = 0; y < Math.min(2, w); y++) set(x, y - 1, 41 + k, J(k % 3 === 2 ? BUDGE.hornDark : BUDGE.horn, x, y, k, 31, 0.04));
    }
    for (let y = -2; y <= 1; y++) set(-1, y, 40, BUDGE.vein, true);
  } else if (kind === 'budgebow') {
    for (let y = -20; y <= 20; y++) {
      const bend = Math.round((1 - (y / 20) ** 2) * 10);
      const ring = Math.abs(y) % 5 === 0;
      const thick = Math.abs(y) < 6 ? 3 : 2;
      for (let k = 0; k < thick; k++) {
        const col = Math.abs(y) <= 3 ? J(k === 1 ? BUDGE.scaleLo : BUDGE.scale, y, k, 0, 32, 0.05) : ring ? BUDGE.hornDark : J(BUDGE.horn, y, k, 0, 33, 0.04);
        set(0, y, 16 + bend + k, col);
        if (thick === 3) set(-1, y, 16 + bend + k, col);
      }
      set(0, y, 16, Math.abs(y) % 4 === 0 ? 0xf4f0dc : 0xd8d2b8);
    }
    for (const dir of [-1, 1]) {
      for (let k = 0; k < 4; k++) set(0, dir * (21 + k), 16 + (k < 2 ? 0 : -1), J(BUDGE.claw, k, dir, 0, 34, 0.03));
    }
    for (let z = 20; z < 30; z += 2) set(-1, 0, z, BUDGE.vein, true);
  }
  const g = meshFrom(M, cx, cy, 0, mat);
  heldCache[kind] = g;
  return g.clone();
}

export { clamp, mix };
