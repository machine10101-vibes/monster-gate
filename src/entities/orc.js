import * as THREE from 'three';
import { VoxelModel, hash3, jitter, shade } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';

/** Chunk size matches the other creature sculpts, a little finer so the face reads. */
const S = 0.038;

const skin = (x, y, z) => {
  const n = hash3(x, y, z, 11);
  const c = n < 0.16 ? 0x3a6226 : n < 0.42 ? 0x527c34 : n < 0.74 ? 0x679644 : 0x7eae58;
  return jitter(c, 0.055, n);
};
const fur = (x, y, z) => {
  const n = hash3(x, y, z, 21);
  const c = n < 0.18 ? 0x3c3832 : n < 0.42 ? 0x5a5046 : n < 0.7 ? 0x75685c : n < 0.88 ? 0x8e8072 : 0xa89886;
  return jitter(c, 0.06, n);
};
const hide = (x, y, z) => {
  const n = hash3(x, y, z, 31);
  const c = n < 0.3 ? 0x3a2416 : n < 0.62 ? 0x5c3c26 : 0x6e4c32;
  return jitter(c, 0.05, n);
};

function meshFrom(model, ox, oy, oz, mat) {
  const g = model.build(S, ox, oy, oz);
  const grp = new THREE.Group();
  if (g.solid) {
    const m = new THREE.Mesh(g.solid, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
  }
  if (g.glow) grp.add(new THREE.Mesh(g.glow, new THREE.MeshBasicMaterial({ vertexColors: true })));
  return grp;
}

function paintLeg(M) {
  M.ellipsoid(7, 20, 7, 4.3, 5.2, 3.5, skin);
  M.ellipsoid(7, 11, 7.2, 3.4, 5.6, 3.1, skin);
  M.ellipsoid(7, 15.2, 7.6, 3.5, 2.1, 3.1, (x, y, z) => shade(skin(x, y, z), 0.9));
  M.box(3, 0, 3, 11, 4, 12, skin);
  for (const x0 of [3, 6, 9]) {
    M.box(x0, 0, 11, x0 + 3, 3, 15, skin);
    M.box(x0 + 1, 2, 14, x0 + 2, 3, 15, 0x24341c);
  }
  for (let y = 3; y < 9; y++) {
    for (let x = 1; x < 13; x++) {
      for (let z = 2; z < 13; z++) {
        const dx = x - 7;
        const dz = z - 7;
        if (dx * dx + dz * dz < 11) continue;
        const jag = hash3(x, 4, z, 8);
        if (y > 4 + jag * 5) continue;
        M.set(x, y, z, fur(x, y, z));
      }
    }
  }
  for (let y = 17; y < 26; y++) {
    for (let x = 1; x < 13; x++) {
      for (let z = 2; z < 13; z++) {
        const dx = x - 7;
        const dz = z - 7;
        if (dx * dx + dz * dz < 13) continue;
        const jag = hash3(x, 2, z, 9);
        if (y < 23 - jag * 6) continue;
        M.set(x, y, z, fur(x, y, z));
      }
    }
  }
  for (let y = 5; y < 13; y++) {
    if ((y + 1) % 3 === 0) continue;
    for (let x = 3; x < 11; x++) {
      for (let z = 4; z < 12; z++) {
        const dx = x - 7;
        const dz = z - 7;
        if (dx * dx + dz * dz < 7) continue;
        if ((x + y + z) % 5 === 0) continue;
        M.set(x, y, z, hide(x, y, z));
      }
    }
  }
}

function paintCloth(M) {
  M.box(1, 4, 1, 15, 16, 7, (x, y, z) => {
    const n = hash3(x, y, z, 6);
    if (y < 7 && n < 0.35) return null;
    return n < 0.4 ? 0x5a4030 : n < 0.75 ? 0x6e5240 : 0x3e2c1e;
  });
  for (let x = 0; x < 16; x++) {
    const jag = 2 + Math.floor(hash3(x, 0, 1, 3) * 5);
    for (let y = 0; y < jag; y++) {
      M.set(x, y, 2, fur(x, y, 1));
      if (hash3(x, y, 2, 4) > 0.4) M.set(x, y, 3, fur(x, y, 2));
    }
  }
  for (let y = 8; y < 15; y++) {
    const inset = Math.floor((y - 8) * 0.4);
    M.box(6 + inset, y, 6, 10 - inset, y + 1, 8, hide);
  }
  M.box(4, 14, 5, 12, 16, 8, (x, y, z) => shade(hide(x, y, z), 0.72));
}

function paintTorso(M) {
  M.box(7, 2, 5, 21, 15, 14, skin);
  M.box(3, 11, 4, 25, 18, 15, (x, y, z) => shade(skin(x, y, z), 0.96));
  M.box(8, 8, 12, 13, 14, 16, (x, y, z) => shade(skin(x, y, z), 1.1));
  M.box(15, 8, 12, 20, 14, 16, (x, y, z) => shade(skin(x, y, z), 1.1));
  M.box(11, 15, 7, 17, 21, 13, skin);
  for (let x = 1; x < 27; x++) {
    for (let z = 2; z < 17; z++) {
      const front = z >= 12;
      const back = z <= 6;
      const side = x < 6 || x > 21;
      if (!front && !back && !side) continue;
      const hang = back ? 9 : side ? 6 : 3;
      for (let y = 12; y < 19; y++) {
        const jag = hash3(x, 0, z, 12);
        if (y < 17 - jag * hang) continue;
        if (front && y < 15 && x > 8 && x < 20) continue;
        M.set(x, y, z, fur(x, y, z));
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    M.box(8 + i, 6 + i, 14, 10 + i, 8 + i, 17, hide);
    M.box(16 - i, 6 + i, 14, 18 - i, 8 + i, 17, hide);
  }
  M.box(6, 2, 5, 22, 5, 15, hide);
  M.box(12, 3, 14, 16, 5, 17, 0xe8dcc4);
  M.set(13, 3, 16, 0x1a140e);
  M.set(14, 3, 16, 0x1a140e);
}

function paintHead(M) {
  M.box(5, 6, 4, 15, 15, 13, skin);
  M.box(4, 2, 6, 16, 8, 14, skin);
  M.box(3, 5, 5, 17, 11, 13, skin);
  M.box(4, 10, 11, 16, 14, 16, (x, y, z) => shade(skin(x, y, z), 0.72));
  M.box(8, 11, 13, 12, 14, 16, (x, y, z) => shade(skin(x, y, z), 0.58));
  M.box(6, 8, 13, 9, 10, 16, 0xf4f0e4);
  M.box(11, 8, 13, 14, 10, 16, 0xf4f0e4);
  M.box(7, 8, 15, 9, 10, 16, 0x140e0a);
  M.box(11, 8, 15, 13, 10, 16, 0x140e0a);
  M.set(6, 9, 15, 0xffffff);
  M.set(13, 9, 15, 0xffffff);
  M.box(9, 6, 13, 11, 9, 17, skin);
  M.set(9, 7, 16, 0x24341a);
  M.set(10, 7, 16, 0x24341a);
  M.box(6, 3, 13, 14, 5, 16, 0x1a120e);
  for (let x = 7; x <= 13; x++) M.set(x, 4, 15, x % 2 ? 0xf7f1e4 : 0xe4d8c0);
  M.box(4, 3, 14, 7, 9, 17, 0xe8dcc0);
  M.box(13, 3, 14, 16, 9, 17, 0xe4d6b6);
  M.box(4, 8, 16, 6, 10, 18, 0xf4ead4);
  M.box(14, 8, 16, 16, 10, 18, 0xf4ead4);
  M.box(6, 1, 8, 14, 3, 14, skin);
  M.box(0, 8, 6, 4, 13, 11, skin);
  M.box(0, 12, 7, 3, 16, 10, skin);
  M.box(1, 9, 10, 3, 12, 11, 0x4e7034);
  M.box(16, 8, 6, 20, 13, 11, skin);
  M.box(17, 12, 7, 20, 16, 10, skin);
  M.box(17, 9, 10, 19, 12, 11, 0x4e7034);
}

function paintArm(M, sword) {
  const top = sword ? 40 : 22;
  M.ellipsoid(7, top - 7, 7, 3.7, 5.6, 3.5, skin);
  M.ellipsoid(7, top - 16, 7.3, 3.2, 5.2, 3.1, skin);
  const cuff = top - 20;
  for (let y = cuff; y < cuff + 6; y++) {
    for (let x = 3; x < 12; x++) {
      for (let z = 3; z < 12; z++) {
        const dx = x - 7;
        const dz = z - 7;
        if (dx * dx + dz * dz < 8) continue;
        const jag = hash3(x, 3, z, 15);
        if (y > cuff + 2 + jag * 4) continue;
        M.set(x, y, z, fur(x, y, z));
      }
    }
  }
  const fist = sword ? 18 : 1;
  M.box(4, fist, 4, 11, fist + 6, 11, skin);
  M.box(4, fist + 1, 8, 11, fist + 5, 12, skin);
  M.box(5, fist + 4, 9, 10, fist + 6, 12, (x, y, z) => shade(skin(x, y, z), 0.8));
  if (!sword) return;
  M.box(6, 15, 6, 9, 24, 10, (x, y, z) => {
    const band = y % 2 === 0;
    return jitter(band ? 0x3a2414 : 0x5a3a22, 0.05, hash3(x, y, z, 40));
  });
  M.box(2, 14, 5, 13, 17, 11, (x, y, z) => jitter(0x6a655c, 0.05, hash3(x, y, z, 41)));
  M.box(1, 15, 6, 3, 17, 10, 0x8c8678);
  M.box(12, 15, 6, 14, 17, 10, 0x8c8678);
  M.box(5, 22, 5, 10, 26, 11, (x, y, z) => jitter(0x4e4a44, 0.04, hash3(x, y, z, 42)));
  M.box(4, 0, 7, 11, 16, 12, (x, y, z) => {
    if (x <= 4 && y % 4 === 1) return null;
    const edge = x <= 4 || x >= 10 || z >= 11;
    const n = hash3(x, y, z, 44);
    if (edge) return n < 0.5 ? 0xd8dbe2 : 0xb7bcc4;
    return n < 0.45 ? 0x8b9098 : 0x62686f;
  });
  M.box(6, 0, 8, 9, 2, 11, 0xd5d8de);
}

/** Rigged orc scout. The sword hangs from the right fist, point down. */
export function buildOrcScout() {
  const mat = toonMaterial({ vertexColors: true });
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 26 * S;
  root.add(hips);

  const legL = meshFrom(paintInto(14, 26, 16, paintLeg), 7, 26, 7, mat);
  legL.position.set(-0.2, 0, 0);
  const legR = meshFrom(paintInto(14, 26, 16, paintLeg), 7, 26, 7, mat);
  legR.position.set(0.2, 0, 0.01);
  hips.add(legL, legR);

  const cloth = meshFrom(paintInto(16, 16, 10, paintCloth), 8, 16, 2, mat);
  cloth.position.set(0, 0.02, 0.2);
  hips.add(cloth);

  const body = new THREE.Group();
  hips.add(body);
  body.add(meshFrom(paintInto(28, 22, 18, paintTorso), 14, 0, 9, mat));

  const head = meshFrom(paintInto(20, 18, 18, paintHead), 10, 0, 8, mat);
  head.position.set(0, 16 * S, 0.02);
  body.add(head);

  const armL = meshFrom(paintInto(14, 22, 14, (m) => paintArm(m, false)), 7, 22, 7, mat);
  armL.position.set(-0.42, 14 * S, 0.02);
  armL.rotation.z = 0.38;
  armL.rotation.x = 0.15;
  const armR = meshFrom(paintInto(14, 40, 14, (m) => paintArm(m, true)), 7, 40, 7, mat);
  armR.position.set(0.46, 14 * S, 0.04);
  armR.rotation.z = -0.38;
  armR.rotation.x = -0.28;
  body.add(armL, armR);

  return { root, mat, parts: { legL, legR, armL, armR, head, body, cloth } };
}

function paintInto(w, h, d, fn) {
  const M = new VoxelModel(w, h, d);
  fn(M);
  return M;
}
