import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade, mix, clamp, RNG } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';

const J = (c, x, y, z, s = 0, a = 0.06) => jitter(c, a, hash3(x, y, z, s));

function meshFrom(model, size, ox, oy, oz, mat, castShadow = true) {
  const g = model.build(size, ox, oy, oz);
  const grp = new THREE.Group();
  if (g.solid) {
    const m = new THREE.Mesh(g.solid, mat);
    m.castShadow = castShadow;
    grp.add(m);
  }
  if (g.glow) grp.add(new THREE.Mesh(g.glow, new THREE.MeshBasicMaterial({ vertexColors: true })));
  return grp;
}

function blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.3, yFlat = -99) {
  for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++)
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        if (y < yFlat) continue;
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const dz = (z + 0.5 - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1 + (hash3(x, y, z, seed) - 0.5) * noise) m.set(x, y, z, typeof color === 'function' ? color(x, y, z, d) : color);
      }
}

/* ----------------------------- slime ------------------------------ */
export function buildSlime(kind = 'green') {
  const S = 0.06;
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const pal =
    kind === 'green'
      ? { lo: 0x35b255, mid: 0x57d46c, hi: 0xa4f58f, eye: 0xffffff }
      : { lo: 0x6a36b0, mid: 0x8c52da, hi: 0xc99aff, eye: 0xfff0a0 };
  const M = new VoxelModel(20, 18, 20);
  blob(
    M, 10, 6.5, 10, 8.2, 6.2, 8.2,
    (x, y, z, d) => {
      const t = clamp((y - 1) / 11, 0, 1);
      let c = t < 0.35 ? mix(pal.lo, pal.mid, t / 0.35) : mix(pal.mid, pal.hi, (t - 0.35) / 0.65);
      if (d > 0.82) c = shade(c, 0.88);
      return J(c, x, y, z, 3, 0.04);
    },
    5, 0.18, 1
  );
  for (const ex of [6, 12]) {
    for (let y = 6; y <= 9; y++) for (let x = ex; x <= ex + 1; x++) M.set(x, y, 17, pal.eye);
    for (let y = 6; y <= 8; y++) M.set(ex + (ex < 10 ? 1 : 0), y, 18, 0x1a1020);
    M.set(ex + (ex < 10 ? 0 : 1), 9, 18, 0xffffff);
  }
  for (let x = 8; x <= 11; x++) M.set(x, 5, 18, 0x2a1230);
  M.set(7, 6, 18, 0x2a1230);
  M.set(12, 6, 18, 0x2a1230);
  if (kind === 'green') {
    M.box(9, 12, 9, 11, 14, 11, 0x3f9f47);
    M.box(8, 14, 8, 12, 15, 12, 0x6fd45a);
  } else {
    for (const [x, z, h] of [[6, 8, 4], [12, 9, 5], [9, 12, 3]]) for (let y = 12; y < 12 + h; y++) M.set(x, y, z, mix(0x8a4ad8, 0xe0b8ff, (y - 12) / h), true);
  }
  const root = new THREE.Group();
  const body = meshFrom(M, S, 10, 0, 10, mat);
  root.add(body);
  return { root, body, mat, parts: { body } };
}

/* ------------------------------ boar ------------------------------ */
export function buildBoar() {
  const S = 0.065;
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const fur = (x, y, z) => J(mix(0x6e4228, 0x8a5634, hash3(x >> 1, y >> 1, z >> 1, 3)), x, y, z, 4, 0.07);

  const B = new VoxelModel(18, 20, 30);
  B.box(3, 2, 2, 15, 13, 26, (x, y, z) => (y < 5 ? J(0xa87a56, x, y, z, 5, 0.07) : fur(x, y, z)));
  B.box(4, 13, 4, 14, 14, 24, fur);
  B.box(5, 12, 2, 13, 14, 8, fur);
  for (let z = 4; z < 26; z += 2) B.box(8, 14, z, 10, 16 + (z % 4 === 0 ? 1 : 0), z + 1, (x, y, zz) => J(0x2f1c12, x, y, zz, 6, 0.1));
  B.box(2, 4, 8, 3, 11, 20, (x, y, z) => fur(x, y, z));
  B.box(15, 4, 8, 16, 11, 20, (x, y, z) => fur(x, y, z));

  const H = new VoxelModel(16, 16, 20);
  H.box(3, 3, 4, 13, 13, 14, (x, y, z) => fur(x, y, z));
  H.box(5, 3, 14, 11, 8, 18, (x, y, z) => J(0xc9967a, x, y, z, 7, 0.06));
  H.box(6, 4, 18, 10, 7, 19, 0xd8aa8c);
  H.set(7, 5, 19, 0x2a1a14);
  H.set(9, 5, 19, 0x2a1a14);
  H.box(3, 8, 14, 4, 12, 15, 0xfff3d0);
  H.box(12, 8, 14, 13, 12, 15, 0xfff3d0);
  for (const sx of [4, 11]) {
    H.box(sx - 1, 5, 15, sx, 9, 16, 0xf3e6c4);
    H.box(sx - 1, 8, 16, sx, 11, 17, 0xf3e6c4);
  }
  for (const sx of [3, 12]) H.box(sx, 13, 6, sx + 2, 16, 8, (x, y, z) => fur(x, y, z));
  H.set(5, 10, 14, 0xffffff);
  H.set(6, 10, 14, 0xff3a2a);
  H.set(10, 10, 14, 0xff3a2a);
  H.set(11, 10, 14, 0xffffff);
  H.box(4, 12, 14, 7, 13, 15, 0x1d120c);
  H.box(9, 12, 14, 12, 13, 15, 0x1d120c);

  const L = new VoxelModel(8, 12, 8);
  L.box(2, 2, 2, 6, 12, 6, (x, y, z) => fur(x, y, z));
  L.box(2, 0, 2, 6, 2, 6, 0x2a1a14);

  const root = new THREE.Group();
  const body = meshFrom(B, S, 9, 0, 14, mat);
  body.position.y = 9 * S;
  root.add(body);
  const head = meshFrom(H, S, 8, 8, 4, mat);
  head.position.set(0, 18 * S, 12 * S);
  root.add(head);
  const legs = [];
  for (const [x, z] of [[-4.5, 8], [4.5, 8], [-4.5, -8], [4.5, -8]]) {
    const g = new THREE.Group();
    g.position.set(x * S, 10 * S, z * S);
    g.add(meshFrom(L, S, 4, 10, 4, mat));
    root.add(g);
    legs.push(g);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.18), new THREE.MeshToonMaterial({ color: 0x5a3a24 }));
  tail.position.set(0, 15 * S, -14 * S);
  root.add(tail);
  return { root, mat, parts: { body, head, legs, tail } };
}

/* ----------------------------- wraith ----------------------------- */
export function buildWraith() {
  const S = 0.06;
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const M = new VoxelModel(22, 34, 18);
  const cloak = (x, y, z) => {
    const t = clamp(y / 22, 0, 1);
    return J(mix(0x2a1c48, 0x5a3c92, t * 0.8 + hash3(x, 0, z, 2) * 0.2), x, y, z, 8, 0.06);
  };
  for (let y = 4; y < 22; y++) {
    const t = (y - 4) / 18;
    const rx = 3.2 + t * 3.8;
    const rz = 2.6 + t * 2.4;
    for (let z = 0; z < 18; z++)
      for (let x = 0; x < 22; x++) {
        const dx = (x + 0.5 - 11) / rx;
        const dz = (z + 0.5 - 9) / rz;
        const jag = y < 9 ? (hash3(x, 0, z, 4) > 0.5 ? 1 : 0) : 0;
        if (dx * dx + dz * dz <= 1 && (y > 8 || hash3(x, y, z, 11) > 0.12 + (9 - y) * 0.06) && !(jag && y < 7 && (x + z) % 3 === 0)) M.set(x, y, z, cloak(x, y, z));
      }
  }
  blob(M, 11, 26, 9, 5.8, 6.2, 5.6, (x, y, z) => J(0x3a2a62, x, y, z, 9, 0.07), 9, 0.2);
  for (let x = 7; x <= 15; x++) for (let y = 21; y <= 28; y++) {
    const dx = (x - 11) / 4.4;
    const dy = (y - 24.5) / 4.2;
    if (dx * dx + dy * dy <= 1) M.set(x, y, 14, 0x0a0614);
  }
  for (const ex of [8, 13]) {
    M.box(ex, 25, 14, ex + 2, 27, 15, 0x6af4ff, true);
    M.box(ex, 25, 15, ex + 1, 26, 16, 0xffffff, true);
  }
  M.box(10, 33, 8, 12, 34, 10, 0x6a4aa8);
  for (const [x, z] of [[5, 9], [17, 9]]) {
    for (let y = 22; y < 31; y++) M.set(x - 1 + (x > 10 ? 1 : 0), y, z, J(0x3a2a62, y, z, 3, 3, 0.07));
  }
  for (const sx of [3, 18]) {
    M.box(sx, 12, 8, sx + 1, 20, 10, (x, y, z) => J(0x3a2a62, x, y, z, 3, 0.07));
    for (let f = 0; f < 3; f++) M.box(sx, 8 + (f % 2), 7 + f, sx + 1, 12, 8 + f, 0xdcd0f4);
  }
  M.box(8, 15, 14, 14, 19, 15, 0x7a4ae0, true);
  M.box(9, 16, 15, 13, 18, 16, 0xe0c8ff, true);

  const root = new THREE.Group();
  const body = meshFrom(M, S, 11, 0, 9, mat);
  body.position.y = 0.0;
  root.add(body);
  return { root, body, mat, parts: { body } };
}

/* ------------------------------ fowl ------------------------------ */
export function buildFowl() {
  const S = 0.07;
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const M = new VoxelModel(16, 16, 18);
  const feather = (x, y, z) => {
    const h = hash3(x, y, z, 12);
    return h > 0.7 ? 0xffffff : h > 0.25 ? 0xf2f2f6 : 0xd9dbe6;
  };
  blob(M, 8, 6.5, 8, 5.4, 4.6, 6, feather, 6, 0.7);
  for (let i = 0; i < 18; i++) {
    const a = hash3(i, 1, 1, 5) * Math.PI * 2;
    const x = Math.round(8 + Math.cos(a) * 5.4);
    const z = Math.round(8 + Math.sin(a) * 6);
    const y = Math.round(5 + hash3(i, 2, 1, 5) * 4);
    M.set(x, y, z, 0xffffff);
  }
  for (let y = 9; y < 15; y++) M.box(7, y, 2, 9, y + 1, 4 + (y > 11 ? 1 : 0), (x, yy, z) => (yy > 11 ? 0xfffaf0 : 0xe8e8f0));
  blob(M, 8, 11, 12.5, 2.8, 2.8, 2.8, feather, 7, 0.4);
  M.box(7, 10, 15, 9, 12, 17, 0xf59a2a);
  M.box(7, 13, 11, 9, 15, 13, 0xe03a3a);
  M.set(6, 11, 14, 0x15101a);
  M.set(10, 11, 14, 0x15101a);
  M.box(6, 0, 7, 7, 3, 8, 0xf59a2a);
  M.box(9, 0, 7, 10, 3, 8, 0xf59a2a);
  M.box(5, 0, 6, 8, 1, 10, 0xf59a2a);
  M.box(8, 0, 6, 11, 1, 10, 0xf59a2a);
  const root = new THREE.Group();
  const body = meshFrom(M, S, 8, 0, 8, mat);
  root.add(body);
  return { root, body, mat, parts: { body } };
}

/* ---------------------------- butterfly --------------------------- */
export function buildButterfly(color) {
  const S = 0.045;
  const W = new VoxelModel(8, 2, 8);
  for (let z = 0; z < 7; z++)
    for (let x = 0; x < 7; x++) {
      const d = Math.hypot(x - 0.5, (z - 3) * 0.9);
      if (d < 5.2) W.set(x, 0, z, hash3(x, z, 1, 3) > 0.8 ? shade(color, 0.7) : (x + z) % 5 === 0 ? 0xffffff : color);
    }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const g = W.build(S, 0, 0, 3.5);
  const root = new THREE.Group();
  const wingL = new THREE.Group();
  const wingR = new THREE.Group();
  const mk = (flip) => {
    const m = new THREE.Mesh(g.solid, mat);
    m.scale.x = flip;
    return m;
  };
  wingL.add(mk(1));
  wingR.add(mk(-1));
  root.add(wingL, wingR);
  const B = new VoxelModel(2, 2, 6);
  B.box(0, 0, 0, 1, 1, 6, 0x2a1a14);
  const bm = new THREE.Mesh(B.build(S, 0.5, 0.5, 3).solid, mat);
  root.add(bm);
  return { root, wingL, wingR };
}
