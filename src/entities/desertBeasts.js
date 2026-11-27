import * as THREE from 'three';
import { hash3, jitter, mix } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { Rig, makeKind, instantiate } from './beastKit.js';

export { buildSandSpineWorm } from './sandwormModel.js';

/**
 * Desert Scorpion (the Sand Spine Worm lives in sandwormModel.js).
 * Same rig as the jungle beasts: one voxel body, cut into joints, shared geometry.
 * +z is forward, +y is up. The scorpion is low, eight-legged, with claws and a
 * curled sting.
 */

const SCORP = {
  S: 0.038,
  shell: 0xc4a15a,
  shellHi: 0xe0c078,
  shellLo: 0x8d6a38,
  belly: 0xe8d2a4,
  dark: 0x4a3424,
  claw: 0xb88948,
  sting: 0xe8d080,
  eye: 0xffd24a,
};

const h3 = (x, y, z, s) => hash3(Math.floor(x), Math.floor(y), Math.floor(z), s);

function shell(x, y, z) {
  const dark = y < 3.2 ? 0.45 : Math.abs(x) < 1.2 ? 0.25 : 0;
  return jitter(mix(SCORP.shellLo, SCORP.shellHi, 0.35 + dark), 0.05, h3(x, y, z, 6));
}

function sculptScorpion() {
  const R = new Rig(-26, -1, -18, 26, 30, 26, 1.2);
  R.own('body');
  R.ell([0, 4.2, 2], [7.2, 3.2, 8.4], shell);
  R.ell([0, 3.2, 2], [5.4, 2.2, 6.5], () => SCORP.belly);
  R.own('head');
  R.ell([0, 4.0, 12], [4.6, 2.6, 3.6], shell);
  R.set(1.4, 5.6, 13.4, SCORP.eye, true);
  R.set(-1.4, 5.6, 13.4, SCORP.eye, true);
  // Eight long legs, four a side, with a raised knee so the scuttle reads.
  for (let i = 0; i < 4; i++) {
    const z = 7.5 - i * 4.4;
    for (const s of [1, -1]) {
      const id = (s > 0 ? 'L' : 'R') + i;
      R.own(id);
      const x0 = s * 6.4;
      const knee = s * 12.5;
      const foot = s * 20;
      R.cap([x0, 3.4, z], [knee, 7.2, z + 0.6], 1.05, 0.85, shell);
      R.cap([knee, 7.2, z + 0.6], [foot, 0.45, z + 2.2], 0.85, 0.45, shell);
    }
  }
  // Each pincer is three parts: a palm, an upper finger and a lower finger.
  R.own('clawL');
  R.cap([3.5, 4.2, 13], [8, 5.4, 17], 1.7, 2.0, () => SCORP.claw);
  R.own('upL');
  R.cap([8, 6.3, 17], [15, 7.5, 23], 1.25, 0.5, () => SCORP.shellHi);
  R.own('loL');
  R.cap([8, 3.3, 17], [14.5, 2.1, 22.5], 1.1, 0.48, () => SCORP.claw);
  R.own('clawR');
  R.cap([-3.5, 4.2, 13], [-8, 5.4, 17], 1.7, 2.0, () => SCORP.claw);
  R.own('upR');
  R.cap([-8, 6.3, 17], [-15, 7.5, 23], 1.25, 0.5, () => SCORP.shellHi);
  R.own('loR');
  R.cap([-8, 3.3, 17], [-14.5, 2.1, 22.5], 1.1, 0.48, () => SCORP.claw);
  // The tail arches over the back and the sting leads.
  R.own('t1');
  R.cap([0, 5.2, -6], [0, 8, -8], 2.2, 1.8, shell);
  R.own('t2');
  R.cap([0, 8, -8], [0, 12, -4], 1.8, 1.5, shell);
  R.own('t3');
  R.cap([0, 12, -4], [0, 15, 2], 1.5, 1.2, shell);
  R.own('t4');
  R.cap([0, 15, 2], [0, 16.2, 8], 1.2, 0.9, shell);
  R.own('sting');
  R.cap([0, 16.2, 8], [0, 14.2, 13], 0.9, 0.35, () => SCORP.sting);
  R.set(0, 13.6, 13.4, SCORP.eye, true);
  return R;
}

const SCORP_SPEC = [
  { id: 'body', parent: null, pivot: [0, 4.2, 2] },
  { id: 'head', parent: 'body', pivot: [0, 4.0, 9] },
  { id: 'clawL', parent: 'head', pivot: [4, 4.2, 14] },
  { id: 'upL', parent: 'clawL', pivot: [8, 6.3, 17] },
  { id: 'loL', parent: 'clawL', pivot: [8, 3.3, 17] },
  { id: 'clawR', parent: 'head', pivot: [-4, 4.2, 14] },
  { id: 'upR', parent: 'clawR', pivot: [-8, 6.3, 17] },
  { id: 'loR', parent: 'clawR', pivot: [-8, 3.3, 17] },
  { id: 'L0', parent: 'body', pivot: [6.4, 3.4, 7.5] },
  { id: 'L1', parent: 'body', pivot: [6.4, 3.4, 3.1] },
  { id: 'L2', parent: 'body', pivot: [6.4, 3.4, -1.3] },
  { id: 'L3', parent: 'body', pivot: [6.4, 3.4, -5.7] },
  { id: 'R0', parent: 'body', pivot: [-6.4, 3.4, 7.5] },
  { id: 'R1', parent: 'body', pivot: [-6.4, 3.4, 3.1] },
  { id: 'R2', parent: 'body', pivot: [-6.4, 3.4, -1.3] },
  { id: 'R3', parent: 'body', pivot: [-6.4, 3.4, -5.7] },
  { id: 't1', parent: 'body', pivot: [0, 5.2, -6] },
  { id: 't2', parent: 't1', pivot: [0, 8, -8] },
  { id: 't3', parent: 't2', pivot: [0, 12, -4] },
  { id: 't4', parent: 't3', pivot: [0, 15, 2] },
  { id: 'sting', parent: 't4', pivot: [0, 16.2, 8] },
];

let scorpKind = null;
export function buildDesertScorpion() {
  if (!scorpKind) scorpKind = makeKind(sculptScorpion(), SCORP_SPEC, SCORP.S);
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups: g } = instantiate(scorpKind, mat);
  const leg = (id) => g[id];
  const parts = {
    body: g.body,
    head: g.head,
    claws: [g.clawL, g.clawR],
    uppers: [g.upL, g.upR],
    lowers: [g.loL, g.loR],
    legs: [leg('L0'), leg('L1'), leg('L2'), leg('L3'), leg('R0'), leg('R1'), leg('R2'), leg('R3')],
    tail: [g.t1, g.t2, g.t3, g.t4],
    sting: g.sting,
  };
  return { root, mat, parts, tris: scorpKind.tris };
}
