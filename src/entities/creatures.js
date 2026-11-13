import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade, mix, clamp, RNG } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { BUDGE } from '../data/budge.js';

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

/* -------------------------- budge dragon --------------------------- */
export function buildBudgeDragon() {
  const S = 0.054;
  const P = BUDGE;
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const dark = shade(P.scaleLo, 0.7);
  const plate = (x, y, z, seed = 3) => {
    const n = hash3(x >> 1, y >> 1, z >> 1, seed);
    let c = n > 0.74 ? P.scaleHi : n > 0.22 ? P.scale : P.scaleLo;
    if ((y & 1) === 0 && ((x + z) & 1) === 0) c = shade(c, 0.9);
    return J(c, x, y, z, seed, 0.04);
  };
  const belly = (x, y, z) => J(z & 1 ? P.belly : P.bellyDark, x, y, z, 5, 0.03);
  const horn = (x, y, z, k = 0) => J(k % 3 === 2 ? P.hornDark : P.horn, x, y, z, 6, 0.04);
  const ball = (m, cx, cy, cz, rx, ry, rz, color, seed, noise = 0.12) => blob(m, cx, cy, cz, rx, ry, rz, color, seed, noise);

  /* body + neck, pivot at bottom centre */
  const B = new VoxelModel(22, 24, 40);
  ball(B, 11, 8.5, 17, 7.6, 6.8, 11.5, (x, y, z, d) => (y <= 5 && d > 0.2 ? belly(x, y, z) : plate(x, y, z)), 7, 0.15);
  ball(B, 11, 12.5, 27.5, 4.4, 5.2, 4.4, (x, y, z) => (z >= 29 && y < 11 ? belly(x, y, z) : plate(x, y, z)), 8);
  ball(B, 11, 14.5, 30.5, 3.7, 4.2, 3.5, (x, y, z) => (y < 12 && z >= 31 ? belly(x, y, z) : plate(x, y, z)), 9);
  for (const sx of [5.2, 16.8]) {
    ball(B, sx, 7, 8, 3.6, 5.2, 5.4, plate, 10);
    ball(B, sx > 11 ? 17.2 : 4.8, 8, 23, 3, 4.6, 4.4, plate, 11);
  }
  for (let z = 8; z <= 31; z += 3) {
    let top = -1;
    for (let y = 23; y >= 0; y--) {
      if (B.has(10, y, z)) {
        top = y;
        break;
      }
    }
    if (top < 0) continue;
    const h = z > 24 ? 3 : 2;
    for (let k = 1; k <= h; k++) for (const xx of [10, 11]) B.set(xx, top + k, z, horn(xx, top + k, z, k));
  }

  /* head, pivot at the neck joint */
  const H = new VoxelModel(20, 22, 28);
  H.box(5, 4, 5, 15, 12, 17, (x, y, z) => plate(x, y, z, 12));
  H.box(6, 4, 17, 14, 9, 25, (x, y, z) => plate(x, y, z, 13));
  H.box(7, 9, 18, 13, 10, 24, (x, y, z) => plate(x, y, z, 14));
  H.box(5, 11, 7, 15, 13, 18, (x, y, z) => J(dark, x, y, z, 15, 0.05));
  for (const side of [-1, 1]) {
    // m(0) is the outer skull edge, counting inward
    const m = (x) => (side < 0 ? 5 + x : 14 - x);
    for (const [x, y] of [[0, 9], [1, 9], [2, 9], [0, 10], [1, 10], [2, 10]]) H.set(m(x), y, 16, x === 1 ? P.pupil : P.eye, true);
    H.set(m(0), 11, 17, dark);
    H.set(m(1), 11, 17, dark);
    H.set(m(2), 11, 17, dark);
    H.set(m(2), 10, 17, dark);
    H.set(m(3), 10, 17, dark);
    H.set(m(3), 9, 17, shade(dark, 0.9));
    H.set(m(2), 7, 25, 0x1a0a0a);
    H.set(m(2), 8, 25, 0x1a0a0a);
    H.set(m(1), 3, 23, P.tooth);
    H.set(m(1), 2, 23, P.tooth);
    H.set(m(1), 1, 23, P.tooth);
    H.set(m(2), 3, 20, P.tooth);
    H.set(m(2), 2, 20, P.tooth);
    const cheek = (d) => (side < 0 ? 4 - d : 15 + d);
    for (const [d, y, z] of [[0, 6, 9], [1, 6, 9], [0, 7, 8], [0, 5, 10]]) H.set(cheek(d), y, z, horn(d, y, z, z));
    for (let i = 0; i < 10; i++) {
      const cx = 10 + side * (4.1 + i * 0.22);
      const w = i < 5 ? 2.4 : i < 8 ? 1.6 : 0.9;
      const y0 = Math.round(12 + i * 0.85);
      const z0 = Math.round(9 - i * 0.9);
      for (let xx = Math.floor(cx - w); xx <= Math.ceil(cx + w); xx++) {
        if (Math.abs(xx + 0.5 - cx) > w / 2 + 0.01) continue;
        for (let dz = 0; dz < (i < 6 ? 2 : 1); dz++) H.set(xx, y0, z0 - dz, horn(xx, y0, z0, i));
        if (i < 5) H.set(xx, y0 + 1, z0, horn(xx, y0 + 1, z0, i));
      }
    }
  }
  for (let z = 7; z <= 15; z += 2) {
    const h = z % 4 === 3 ? 3 : 2;
    for (let k = 0; k < h; k++) for (const xx of [9, 10]) H.set(xx, 13 + k, z, horn(xx, 13 + k, z, k + 2));
  }
  H.set(9, 8, 17, P.tooth);

  /* lower jaw, hinged under the skull */
  const J2 = new VoxelModel(14, 9, 22);
  J2.box(3, 0, 2, 11, 4, 14, (x, y, z) => (y === 0 ? belly(x, y, z) : plate(x, y, z, 16)));
  J2.box(4, 0, 14, 10, 4, 19, (x, y, z) => (y === 0 ? belly(x, y, z) : plate(x, y, z, 17)));
  J2.box(4, 3, 3, 10, 4, 14, (x, y, z) => J(P.mouth, x, y, z, 3, 0.05));
  J2.box(6, 3, 5, 8, 4, 12, (x, y, z) => J(P.tongue, x, y, z, 4, 0.05));
  for (const [x, z] of [[3, 7], [10, 7], [3, 11], [10, 11], [4, 17], [9, 17], [4, 14], [9, 14]]) {
    J2.set(x, 4, z, P.tooth);
    if (z > 12) J2.set(x, 5, z, P.tooth);
  }
  J2.set(5, 4, 18, P.tooth);
  J2.set(8, 4, 18, P.tooth);

  /* legs */
  const makeLeg = (rear, seed) => {
    const w = rear ? 10 : 8;
    const L = new VoxelModel(w, 10, 10);
    const cx = w / 2;
    L.box(cx - 2.5, 4, 2, cx + 2.5, 10, 6, (x, y, z) => plate(x, y, z, seed));
    L.box(cx - 3.5, 0, 1, cx + 3.5, 3, 8, (x, y, z) => plate(x, y, z, seed + 1));
    L.box(cx - 2.5, 3, 2, cx + 2.5, 4, 7, (x, y, z) => J(dark, x, y, z, seed, 0.05));
    for (const dx of [-3, -1, 1]) {
      const x = Math.round(cx + dx);
      L.set(x, 0, 8, P.claw);
      L.set(x, 1, 8, P.claw);
      L.set(x, 0, 9, P.claw);
    }
    return { model: L, cx };
  };

  /* wing, built for the +x side */
  const W = new VoxelModel(21, 14, 20);
  const zTrail = (x) => 9 + 6.5 * Math.abs(Math.sin(x * 0.5)) * (x / 20) + x * 0.12;
  const yAt = () => 2;
  for (let x = 1; x < 20; x++) {
    const z0 = Math.round(7 - x * 0.1);
    const z1 = Math.round(zTrail(x));
    for (let z = z0; z <= z1; z++) W.set(x, yAt(x), z, J(z > z1 - 2 ? P.membraneHi : P.membrane, x, 0, z, 18, 0.05), false);
  }
  const bone = (x1, z1) => {
    const steps = Math.ceil(Math.hypot(x1, z1 - 8) * 1.6);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(t * x1);
      const z = Math.round(8 + t * (z1 - 8));
      const y = yAt(x);
      W.set(x, y, z, dark);
      W.set(x, y + 1, z, dark);
    }
  };
  bone(19, 6);
  for (const px of [3, 9, 16]) bone(px, Math.round(zTrail(px)));
  W.box(0, 1, 7, 3, 4, 10, plate);
  for (let i = 0; i < 3; i++) W.set(19, yAt(19) + 1 + i, 5, P.claw);

  /* tail segments, each reaching toward -z from its joint */
  const tailSeg = (w, h, len, seed, tip) => {
    const T = new VoxelModel(w + 4, h + 4, len);
    const cx = (w + 4) / 2;
    const cy = (h + 4) / 2;
    for (let z = 0; z < len; z++) {
      const k = 0.6 + 0.4 * (z / (len - 1));
      const rw = (w / 2) * k;
      const rh = (h / 2) * k;
      for (let y = 0; y < h + 4; y++)
        for (let x = 0; x < w + 4; x++) {
          const dx = (x + 0.5 - cx) / rw;
          const dy = (y + 0.5 - cy) / rh;
          if (dx * dx + dy * dy <= 1.02) T.set(x, y, z, dy < -0.35 ? belly(x, y, z) : plate(x, y, z, seed));
        }
      if (z % 3 === 1) {
        const top = Math.round(cy + rh - 0.2);
        for (const xx of [Math.floor(cx) - 1, Math.floor(cx)]) T.set(xx, top, z, horn(xx, top, z, z));
      }
    }
    if (tip) {
      for (let z = 0; z < 5; z++) {
        const spread = 3.4 - z * 0.7;
        for (let xx = Math.round(cx - spread); xx < Math.round(cx + spread); xx++) T.set(xx, Math.floor(cy), z, J(z === 0 ? P.horn : P.scaleHi, xx, 0, z, 19, 0.04));
      }
    }
    return { model: T, cx, cy, len };
  };

  const root = new THREE.Group();
  const bodyG = new THREE.Group();
  bodyG.position.y = 6 * S;
  root.add(bodyG);
  const body = meshFrom(B, S, 11, 0, 17, mat);
  bodyG.add(body);

  const head = new THREE.Group();
  head.position.set(0, 16 * S, 16 * S);
  head.add(meshFrom(H, S, 10, 5, 6, mat));
  bodyG.add(head);
  const jaw = new THREE.Group();
  jaw.position.set(0, -1 * S, 0);
  jaw.add(meshFrom(J2, S, 7, 4, 2, mat));
  head.add(jaw);

  const wings = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 5.4 * S, 13 * S, 4 * S);
    const m = meshFrom(W, S, 0, 1, 8, mat);
    m.scale.x = side;
    g.add(m);
    g.rotation.z = side * 0.7;
    bodyG.add(g);
    wings.push(g);
  }

  const legs = [];
  const frontLeg = makeLeg(false, 21);
  const rearLeg = makeLeg(true, 24);
  for (const [lx, lz, def] of [[-4.6, 6.5, frontLeg], [4.6, 6.5, frontLeg], [-5.4, -8.5, rearLeg], [5.4, -8.5, rearLeg]]) {
    const g = new THREE.Group();
    g.position.set(lx * S, 10 * S, lz * S);
    g.add(meshFrom(def.model, S, def.cx, 10, 3, mat));
    g.rotation.x = lz > 0 ? -0.55 : 0.6;
    root.add(g);
    legs.push(g);
  }

  const tail = [];
  const segs = [tailSeg(8, 8, 10, 30, false), tailSeg(6, 6, 9, 31, false), tailSeg(4, 4, 8, 32, true)];
  let parent = bodyG;
  segs.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(0, i === 0 ? 7.5 * S : 0, i === 0 ? -10 * S : -(segs[i - 1].len - 0.5) * S);
    g.add(meshFrom(s.model, S, s.cx, s.cy, s.len, mat));
    parent.add(g);
    parent = g;
    tail.push(g);
  });

  return { root, mat, parts: { body, bodyG, head, jaw, legs, tail, wings } };
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

/* ------------------------------- cow ------------------------------ */
export function buildCow() {
  const S = 0.072;
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const hide = (x, y, z) => (hash3(x >> 1, y, z >> 1, 4) > 0.72 ? 0x2c2622 : 0xf7f4ee);
  const B = new VoxelModel(18, 14, 28);
  B.box(2, 4, 4, 16, 12, 24, hide);
  B.box(3, 12, 6, 15, 13, 22, hide);
  B.box(6, 2, 16, 12, 5, 22, 0xf2b6c4);
  const H = new VoxelModel(14, 12, 14);
  H.box(2, 3, 2, 12, 10, 10, hide);
  H.box(4, 4, 10, 10, 7, 13, 0xf3c2b0);
  H.box(5, 5, 12, 6, 6, 13, 0x2a1c18);
  H.box(8, 5, 12, 9, 6, 13, 0x2a1c18);
  H.set(5, 7, 11, 0x1a1412);
  H.set(9, 7, 11, 0x1a1412);
  H.box(3, 10, 4, 5, 13, 6, 0xe8e2d4);
  H.box(9, 10, 4, 11, 13, 6, 0xe8e2d4);
  const L = new VoxelModel(6, 10, 6);
  L.box(1, 2, 1, 5, 10, 5, hide);
  L.box(1, 0, 1, 5, 2, 5, 0x2a2420);
  const root = new THREE.Group();
  const body = meshFrom(B, S, 9, 4, 14, mat);
  root.add(body);
  const head = meshFrom(H, S, 7, 6, 2, mat);
  head.position.set(0, 8 * S, 12 * S);
  root.add(head);
  const legs = [];
  for (const [x, z] of [[-5, 6], [5, 6], [-5, -6], [5, -6]]) {
    const g = new THREE.Group();
    g.position.set(x * S, 0, z * S);
    g.add(meshFrom(L, S, 3, 0, 3, mat));
    root.add(g);
    legs.push(g);
  }
  const tailM = new VoxelModel(4, 10, 4);
  tailM.box(1, 1, 1, 3, 9, 3, 0x2c2622);
  tailM.box(0, 0, 0, 4, 2, 4, 0xf7f4ee);
  const tailG = new THREE.Group();
  tailG.position.set(0, 9 * S, -10 * S);
  tailG.add(meshFrom(tailM, S, 2, 8, 2, mat));
  root.add(tailG);
  return { root, body, mat, parts: { body, head, legs, tail: tailG } };
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
