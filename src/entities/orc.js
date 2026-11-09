import * as THREE from 'three';
import { VoxelModel, RNG, hash3, jitter, shade, clamp } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { meshFrom, splitLimb, relief, buildHeld } from './humanoid.js';

/**
 * Orc scout, built like the hero: a torso, a head, and arms and legs that
 * split at the elbow and knee. Muscle is sculpted from ellipsoids with a
 * chunky olive palette, then fur, straps and tusks are painted on top and
 * given the same relief pass the armor sets get.
 */
const S = 0.032;
const TAU = Math.PI * 2;

const SKIN = [0x42592b, 0x4f6a33, 0x5d7a3c, 0x6b8a47];
const FUR = [0x2f2924, 0x3d352d, 0x4e433a, 0x62564a, 0x786b5d];
const LEATHER = [0x3a2418, 0x4c3322, 0x5e4230];
const BONE = [0xd9ceb4, 0xe8dcc0, 0xf4ead4];

const skin = (x, y, z, k = 0) => jitter(SKIN[Math.floor(hash3(x >> 1, y >> 1, z >> 1, 11 + k) * 4)], 0.035, hash3(x, y, z, 12));
const fur = (x, y, z, tip = 0) => {
  const i = clamp(Math.floor(hash3(x, y, z, 21) * 3) + Math.min(1, tip), 0, 4);
  return jitter(FUR[i], 0.05, hash3(x, y, z, 22));
};
const leather = (x, y, z) => jitter(LEATHER[Math.floor(hash3(x >> 1, y, z >> 1, 31) * 3)], 0.05, hash3(x, y, z, 32));
const bone = (x, y, z) => jitter(BONE[Math.floor(hash3(x, y >> 1, z, 41) * 3)], 0.03, hash3(x, y, z, 42));

const muscle = (M, cx, cy, cz, rx, ry, rz, tone = 1) =>
  M.ellipsoid(cx, cy, cz, rx, ry, rz, (x, y, z) => shade(skin(x, y, z), tone * (1 + ((y - cy) / ry) * 0.05)));

function frontZ(M, x, y) {
  for (let z = M.sz - 1; z >= 0; z--) if (M.has(x, y, z)) return z;
  return -1;
}
function backZ(M, x, y) {
  for (let z = 0; z < M.sz; z++) if (M.has(x, y, z)) return z;
  return -1;
}
const colorAt = (M, x, y, z) => M.get(x, y, z) & 0xffffff;

/** Spiky fur: a noisy ellipsoid plus tufts that stick out along the surface normal. */
function furClump(M, cx, cy, cz, rx, ry, rz, seed, spike = 3, up = 0) {
  const rng = new RNG(seed);
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        if (dx * dx + dy * dy + dz * dz <= 1 + (hash3(x, y, z, seed) - 0.5) * 0.5) M.set(x, y, z, fur(x, y, z));
      }
  const count = Math.round((rx + ry + rz) * 4.5);
  for (let i = 0; i < count; i++) {
    const u = rng.range(-1, 1);
    const a = rng.range(0, TAU);
    const s = Math.sqrt(1 - u * u);
    let ux = s * Math.cos(a);
    let uy = u + up;
    let uz = s * Math.sin(a);
    const len = Math.hypot(ux, uy, uz) || 1;
    ux /= len;
    uy /= len;
    uz /= len;
    const px = cx + s * Math.cos(a) * rx;
    const py = cy + u * ry;
    const pz = cz + s * Math.sin(a) * rz;
    const L = rng.int(1, spike);
    for (let k = 0; k <= L; k++) {
      const x = Math.round(px + ux * k);
      const y = Math.round(py + uy * k);
      const z = Math.round(pz + uz * k);
      M.set(x, y, z, fur(x, y, z, k));
    }
  }
}

/** Wraps a band one voxel proud of whatever is already in rows y0..y1. */
function band(M, y0, y1, color, pred = null) {
  const add = [];
  for (let y = y0; y < y1; y++) {
    for (let z = 0; z < M.sz; z++) {
      let lo = -1;
      let hi = -1;
      for (let x = 0; x < M.sx; x++) {
        if (M.has(x, y, z)) {
          if (lo < 0) lo = x;
          hi = x;
        }
      }
      if (lo >= 0) add.push([lo - 1, y, z], [hi + 1, y, z]);
    }
    for (let x = 0; x < M.sx; x++) {
      let lo = -1;
      let hi = -1;
      for (let z = 0; z < M.sz; z++) {
        if (M.has(x, y, z)) {
          if (lo < 0) lo = z;
          hi = z;
        }
      }
      if (lo >= 0) add.push([x, y, lo - 1], [x, y, hi + 1]);
    }
  }
  for (const [x, y, z] of add) if (!pred || pred(x, y, z)) M.set(x, y, z, typeof color === 'function' ? color(x, y, z) : color);
}

function segDist(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = clamp(((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x + 0.5 - (x0 + t * dx), y + 0.5 - (y0 + t * dy));
}

/* ------------------------------- torso ------------------------------- */
const OY = 6;
function paintTorso() {
  const T = new VoxelModel(44, 44, 26);
  const CX = 22;
  const CZ = 13;
  const ty = (y) => y + OY;
  muscle(T, CX, ty(2.5), CZ, 9.6, 5.2, 6, 0.92);
  muscle(T, CX, ty(8.5), CZ + 0.4, 10.2, 6.6, 6.4, 0.97);
  muscle(T, CX, ty(15.5), CZ + 0.6, 11, 7.6, 7.4, 1.02);
  for (const s of [-1, 1]) muscle(T, CX + s * 5.4, ty(16.5), CZ + 3.4, 5.6, 4.4, 4.2, 1.1);
  muscle(T, CX, ty(21), CZ - 0.6, 12, 3.8, 6.4, 0.98);
  T.box(CX - 3, ty(22), CZ - 3, CX + 3, ty(25), CZ + 3, skin);

  for (let y = ty(5); y < ty(21); y++) {
    for (let x = 0; x < T.sx; x++) {
      const fz = frontZ(T, x, y);
      if (fz < 0) continue;
      const c = colorAt(T, x, y, fz);
      const split = Math.abs(x + 0.5 - CX) < 1.1 && y > ty(10);
      const under = y === ty(12) && Math.abs(x - CX) > 1 && Math.abs(x - CX) < 9;
      const abs = (y === ty(8) || y === ty(6)) && Math.abs(x - CX) < 7;
      if (split || under) T.set(x, y, fz, shade(c, 0.74));
      else if (abs) T.set(x, y, fz, shade(c, 0.86));
    }
  }

  const before = T.data.slice();

  const A = [CX - 8.5, ty(22.5), CX + 8, ty(4.5)];
  const B = [CX + 8.5, ty(22.5), CX - 8, ty(4.5)];
  for (let y = ty(3); y < ty(23); y++) {
    for (let x = 0; x < T.sx; x++) {
      const onA = segDist(x, y, A[0], A[1], A[2], A[3]) < 1.55;
      const onB = segDist(x, y, B[0], B[1], B[2], B[3]) < 1.55;
      if (!onA && !onB) continue;
      const fz = frontZ(T, x, y);
      if (fz >= 0) T.set(x, y, fz + 1, leather(x, y, fz + 1));
      const bz = backZ(T, x, y);
      if (bz >= 0) T.set(x, y, bz - 1, leather(x, y, bz - 1));
    }
  }
  band(T, ty(1), ty(4), leather, (x, y) => !(y === ty(3) && hash3(x, y, 0, 3) < 0.3));
  band(T, ty(4), ty(5), (x, y, z) => shade(leather(x, y, z), 0.7));
  const bz = frontZ(T, CX, ty(13)) + 1;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > 3) continue;
      const rim = Math.abs(dx) + Math.abs(dy) >= 3 || Math.abs(dx) === 2 || Math.abs(dy) === 2;
      T.set(CX + dx, ty(13) + dy, bz, rim ? jitter(0x8a8e96, 0.06, hash3(dx, dy, 1, 5)) : 0x2a2a30);
    }
  T.set(CX, ty(13), bz, 0x16161a);
  T.set(CX - 1, ty(13) - 1, bz, 0x1c1c22);

  for (const s of [-1, 1]) {
    furClump(T, CX + s * 12.2, ty(22.4), CZ - 0.4, 5.6, 3.6, 6.8, 211 + s, 4, 0.55);
    furClump(T, CX + s * 8, ty(23.6), CZ - 1.4, 4.2, 2.2, 5, 221 + s, 3, 0.7);
  }
  furClump(T, CX, ty(23.4), CZ - 4.6, 8, 2.6, 3.2, 231, 3, 0.7);
  furClump(T, CX, ty(23.6), CZ + 3, 6.4, 1.6, 2.2, 232, 2, 0.5);

  relief(T, before);
  return T;
}

/* ------------------------------- skirt ------------------------------- */
function paintSkirt() {
  const K = new VoxelModel(36, 16, 26);
  const CX = 18;
  const CZ = 13;
  const top = 15;
  for (let y = 0; y <= top; y++) {
    const hang = top - y;
    const rx = 11.2 + hang * 0.16;
    const rz = 7.6 + hang * 0.12;
    for (let z = 0; z < K.sz; z++)
      for (let x = 0; x < K.sx; x++) {
        const ox = x + 0.5 - CX;
        const oz = z + 0.5 - CZ;
        const out = (ox / rx) ** 2 + (oz / rz) ** 2;
        const inn = (ox / (rx - 2.8)) ** 2 + (oz / (rz - 2.8)) ** 2;
        if (out > 1 || inn < 1) continue;
        const hem = 2 + Math.floor(hash3(x, 3, z, 7) * 7);
        if (y < hem - (hash3(x, y, z, 8) < 0.45 ? 1 : 0) - (hash3(x, y, z, 9) < 0.2 ? 1 : 0)) continue;
        K.set(x, y, z, fur(x, y, z, y < hem + 2 ? 1 : 0));
      }
  }
  for (let y = 1; y <= top; y++) {
    const half = 1.4 + (y - 1) * 0.42;
    for (let x = 0; x < K.sx; x++) {
      const dx = Math.abs(x + 0.5 - CX);
      if (dx > half) continue;
      const fz = frontZ(K, x, Math.max(y, 6));
      const z = fz >= 0 ? fz : CZ + 6;
      const edge = dx > half - 1.3;
      K.set(x, y, z, edge ? shade(leather(x, y, z), 0.62) : leather(x, y, z));
      K.set(x, y, z + 1, edge ? shade(leather(x, y, z + 1), 0.62) : leather(x, y, z + 1));
    }
  }
  return K;
}

/* -------------------------------- head -------------------------------- */
function paintHead() {
  const H = new VoxelModel(28, 28, 28);
  const CX = 14;
  muscle(H, CX, 11.2, 12.6, 7, 6, 6.8, 1.02);
  muscle(H, CX, 7.4, 14.6, 6.7, 4.4, 5.2, 0.98);
  muscle(H, CX, 3.8, 15.4, 6.2, 3.4, 5, 0.95);
  muscle(H, CX, 12.2, 17.2, 6.6, 1.9, 2.4, 0.74);
  muscle(H, CX, 7.4, 19.6, 2.2, 2.1, 1.9, 1.02);
  for (const s of [-1, 1]) muscle(H, CX + s * 5.2, 6.4, 16.8, 2.4, 2.3, 2.2, 1.04);

  const before = H.data.slice();
  for (const s of [-1, 1]) {
    const ex = (k) => CX + s * k;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const x = Math.round(ex(6.4 + t * 6.4));
      const base = 8.6 + t * 6.2;
      const h = 3.4 * (1 - t) + 1;
      for (let y = Math.round(base); y < base + h; y++) for (let z = 11; z <= 13; z++) H.set(x, y, z, skin(x, y, z, 5));
    }
    for (let t = 0.1; t < 0.6; t += 0.1) {
      const x = Math.round(ex(6.4 + t * 6.4));
      const y = Math.round(8.6 + t * 6.2) + 1;
      H.set(x, y, 14, 0xa4745a);
      H.set(x, y + 1, 14, 0xb9866a);
    }
    const eye = (dx, color) => {
      const x = CX + s * dx;
      const y = 10;
      const z = frontZ(H, x - (s > 0 ? 0 : 0), y);
      if (z >= 0) H.set(x, y, z, color);
    };
    eye(2.5, 0xeee3a0);
    eye(3.5, 0xeee3a0);
    eye(4.5, 0x1a1008);
    const bx = [2.5, 3.5, 4.5, 5.5, 6.5];
    bx.forEach((d, i) => {
      const x = CX + s * Math.floor(d);
      const y = 11 + Math.round(i * 0.5);
      const z = frontZ(H, x, y);
      if (z >= 0) {
        H.set(x, y, z + 1, shade(skin(x, y, z), 0.5));
        H.set(x, y + 1, z, shade(skin(x, y, z), 0.6));
      }
    });
    const tuskX = s > 0 ? CX + 4 : CX - 6;
    for (let k = 0; k < 8; k++) {
      const wide = k < 5 ? 2 : 1;
      for (let w = 0; w < wide; w++) {
        const x = tuskX + w + (k >= 5 ? (s > 0 ? 0 : 1) : 0);
        const jz = frontZ(H, x, 3) + 1;
        H.set(x, 2 + k, jz + (k > 5 ? 0 : 0), bone(x, k, jz));
        H.set(x, 2 + k, jz + 1, k > 5 ? 0xf4ead4 : bone(x, k, jz + 1));
      }
    }
    const nx = CX + s * 1;
    const nz = frontZ(H, nx, 7);
    if (nz >= 0) H.set(s > 0 ? nx : nx - 1, 6, nz, 0x1c2a14);
  }
  for (let x = CX - 5; x <= CX + 4; x++) {
    const z = frontZ(H, x, 4);
    if (z < 0) continue;
    H.set(x, 4, z, 0x1c0f0a);
    if ((x - CX) % 2 === 0 && Math.abs(x - CX) < 4) H.set(x, 3, z + 1, 0xf4ead4);
    H.set(x, 5, z, shade(colorAt(H, x, 5, z), 0.75));
  }
  relief(H, before);
  return H;
}

/* -------------------------------- arms -------------------------------- */
const ARM_PIVOT = 29;
const ARM_ELBOW = 16;
function paintArm(seed) {
  const A = new VoxelModel(20, 36, 20);
  const CX = 10;
  const CZ = 10;
  muscle(A, CX, 26.5, CZ, 6, 4.6, 5.6, 1.06);
  muscle(A, CX, 21, CZ, 5.2, 6, 5, 1);
  muscle(A, CX, 21.8, CZ + 2, 3.8, 3.6, 2.6, 1.08);
  muscle(A, CX, 16.2, CZ, 4.5, 2.8, 4.3, 0.96);
  muscle(A, CX, 10.8, CZ, 4.8, 6.4, 4.6, 1);
  muscle(A, CX, 5.4, CZ, 3.6, 2.4, 3.5, 0.94);
  muscle(A, CX, 2.9, CZ + 0.6, 4.5, 3.3, 4.3, 1.04);
  for (let x = CX - 3; x <= CX + 3; x += 2) {
    const z = frontZ(A, x, 3);
    if (z >= 0) A.set(x, 3, z, shade(colorAt(A, x, 3, z), 0.62));
    const z2 = frontZ(A, x, 2);
    if (z2 >= 0) A.set(x, 2, z2, shade(colorAt(A, x, 2, z2), 0.8));
  }
  const before = A.data.slice();
  band(A, 5, 8, (x, y, z) => (y === 6 ? shade(leather(x, y, z), 0.66) : leather(x, y, z)), (x, y, z) => ((x + z + y) & 1) === 0 || y === 7);
  furClump(A, CX, 11.4, CZ, 5.9, 3, 5.7, seed, 2, -0.3);
  furClump(A, CX, 28, CZ, 5.6, 1.6, 5.4, seed + 9, 2, 0.6);
  relief(A, before);
  return A;
}

/* -------------------------------- legs -------------------------------- */
const LEG_PIVOT = 28;
const LEG_KNEE = 14;
function paintLeg(seed) {
  const L = new VoxelModel(22, 34, 26);
  const CX = 11;
  const CZ = 10;
  muscle(L, CX, 22, CZ, 6.5, 7.4, 6.2, 1);
  muscle(L, CX, 14.6, CZ + 0.6, 5.2, 3, 5, 0.96);
  muscle(L, CX, 10, CZ - 0.2, 4.9, 5.6, 4.8, 0.98);
  muscle(L, CX, 11, CZ - 2.2, 3.4, 3.4, 2.4, 1.02);
  muscle(L, CX, 5.2, CZ, 4, 2.2, 3.8, 0.94);
  muscle(L, CX, 2.2, CZ + 3.2, 5.3, 2.4, 6.6, 1.02);
  for (let i = 0; i < 4; i++) {
    const tx = CX - 3.3 + i * 2.2;
    muscle(L, tx, 1.5, CZ + 9.4, 1.4, 1.5, 2.2, 1.04);
    const z = frontZ(L, Math.floor(tx), 1);
    if (z >= 0) L.set(Math.floor(tx), 1, z, 0xcdbfa0);
  }
  const before = L.data.slice();
  band(L, 2, 6, leather, (x, y, z) => ((Math.floor(Math.atan2(z - 10, x - 11) * 2.4) + y) & 1) === 0);
  furClump(L, CX, 8.8, CZ, 6.3, 3.2, 6.1, seed, 2, -0.3);
  relief(L, before);
  return L;
}

/** Rigged orc scout. The right fist holds a notched blade, point down. */
export function buildOrcScout() {
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const root = new THREE.Group();

  const hip = new THREE.Group();
  hip.position.y = 28 * S;
  root.add(hip);
  const upper = new THREE.Group();
  hip.add(upper);
  upper.add(meshFrom(paintTorso(), 22, OY, 13, mat, S));

  const headG = new THREE.Group();
  headG.position.set(0, 23.4 * S, 1.6 * S);
  headG.add(meshFrom(paintHead(), 14, 1, 14, mat, S));
  upper.add(headG);

  const cloth = new THREE.Group();
  cloth.position.y = 5 * S;
  cloth.add(meshFrom(paintSkirt(), 18, 15, 13, mat, S));
  hip.add(cloth);

  const arms = [];
  for (const [side, seed] of [[-1, 301], [1, 302]]) {
    const A = paintArm(seed);
    const pieces = splitLimb(A, 10, ARM_PIVOT, 10, mat, ARM_ELBOW);
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 14.2 * S, 22.4 * S, 0.4 * S);
    const elbow = new THREE.Group();
    elbow.position.y = -(ARM_PIVOT - ARM_ELBOW) * S;
    elbow.add(pieces.lower);
    shoulder.add(pieces.upper, elbow);
    upper.add(shoulder);
    arms.push({ shoulder, elbow });
  }
  const [armL, armR] = arms;

  const hand = new THREE.Group();
  hand.position.set(0, -(ARM_ELBOW - 3) * S, 0.3 * S);
  armR.elbow.add(hand);
  const blade = buildHeld('orcblade');
  blade.scale.setScalar(0.82);
  blade.rotation.x = Math.PI / 2;
  blade.position.y = 0.02;
  hand.add(blade);

  const legs = [];
  for (const [side, seed] of [[-1, 401], [1, 402]]) {
    const L = paintLeg(seed);
    const pieces = splitLimb(L, 11, LEG_PIVOT, 10, mat, LEG_KNEE);
    const thigh = new THREE.Group();
    thigh.position.set(side * 6.2 * S, 0, 0);
    const knee = new THREE.Group();
    knee.position.y = -(LEG_PIVOT - LEG_KNEE) * S;
    knee.add(pieces.lower);
    thigh.add(pieces.upper, knee);
    hip.add(thigh);
    legs.push({ thigh, knee });
  }
  const [legL, legR] = legs;

  root.traverse((o) => {
    if (o.isMesh) o.frustumCulled = true;
  });
  return {
    root,
    mat,
    parts: {
      body: upper,
      head: headG,
      cloth,
      armL: armL.shoulder,
      armR: armR.shoulder,
      elbowL: armL.elbow,
      elbowR: armR.elbow,
      legL: legL.thigh,
      legR: legR.thigh,
      kneeL: legL.knee,
      kneeR: legR.knee,
    },
  };
}
