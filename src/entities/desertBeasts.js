import * as THREE from 'three';
import { hash3, jitter, mix } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { Rig, makeKind, instantiate } from './beastKit.js';

/**
 * Sand Spine Worm and Desert Scorpion.
 * Same rig as the jungle beasts: one voxel body, cut into joints, shared geometry.
 * +z is forward, +y is up. The worm is a long sand-coloured cylinder with a
 * bone ridge. The scorpion is low, eight-legged, with claws and a curled sting.
 */

const WORM = {
  S: 0.05,
  sand: 0xd2ae62,
  sandHi: 0xe6c67c,
  sandLo: 0xa8843e,
  plate: 0x8c6238,
  spine: 0xf3e6c4,
  spineLo: 0xd9c49a,
  mouth: 0x6a3030,
  tooth: 0xf2ead6,
  eye: 0xffc14a,
};
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

function wormPaint(x, y, z) {
  const ridge = y > 7.2;
  if (ridge) return jitter(mix(WORM.spineLo, WORM.spine, Math.min(1, (y - 7) / 4)), 0.04, h3(x, y, z, 2));
  const band = Math.floor(z / 4) % 2;
  const base = band ? WORM.sand : WORM.sandLo;
  return jitter(mix(base, WORM.plate, y < 3 ? 0.35 : 0.1), 0.05, h3(x, y, z, 4));
}

function sculptWorm() {
  const R = new Rig(-14, -2, -32, 14, 26, 28, 1.15);
  const sand = (x, y, z) => wormPaint(x, y, z);
  R.own('s2');
  R.cap([0, 5.2, 6], [0, 5.2, -4], 6.4, 6.2, sand);
  R.own('s1');
  R.cap([0, 5.4, 14], [0, 5.2, 6], 6.2, 6.4, sand);
  R.own('s3');
  R.cap([0, 5.2, -4], [0, 5.0, -14], 6.2, 5.6, sand);
  R.own('s4');
  R.cap([0, 5.0, -14], [0, 4.4, -24], 5.6, 4.2, sand);
  R.own('tail');
  R.cap([0, 4.4, -24], [0, 3.6, -31], 4.2, 2.2, sand);
  R.own('head');
  R.cap([0, 5.6, 22], [0, 5.4, 14], 5.4, 6.2, sand);
  R.ell([0, 6.2, 24], [5.2, 4.6, 4.2], sand);
  // The open maw and the teeth sit on the jaw so the bite can drop.
  R.own('jaw');
  R.ell([0, 3.4, 24.5], [4.2, 2.2, 3.4], (x, y, z) => (z > 25.5 ? WORM.mouth : wormPaint(x, y, z)));
  for (const s of [-1, 1]) {
    R.line([s * 1.2, 4.2, 26], [s * 1.6, 3.2, 28.2], WORM.tooth);
    R.line([s * 2.6, 4.4, 25.4], [s * 3.0, 3.4, 27.4], WORM.tooth);
  }
  R.set(0, 5.6, 27.2, WORM.mouth);
  // A tall bone ridge. Each spine belongs to the segment it grows from.
  const spines = [
    ['head', 20, 7.2, 11],
    ['head', 16, 7.4, 12],
    ['s1', 12, 7.6, 13],
    ['s1', 8, 7.6, 12],
    ['s2', 3, 7.5, 13],
    ['s2', -1, 7.4, 12],
    ['s3', -7, 7.0, 11],
    ['s3', -11, 6.6, 10],
    ['s4', -17, 6.0, 9],
    ['s4', -21, 5.4, 7],
  ];
  for (const [id, z, y, h] of spines) {
    R.own(id);
    R.cap([0, y, z], [0, y + h, z + 0.6], 1.7, 0.45, () => WORM.spine);
  }
  R.own('head');
  R.set(2.2, 8.2, 22, WORM.eye, true);
  R.set(-2.2, 8.2, 22, WORM.eye, true);
  return R;
}

const WORM_SPEC = [
  { id: 's2', parent: null, pivot: [0, 5.2, 1] },
  { id: 's1', parent: 's2', pivot: [0, 5.2, 6] },
  { id: 'head', parent: 's1', pivot: [0, 5.4, 14] },
  { id: 'jaw', parent: 'head', pivot: [0, 4.2, 22] },
  { id: 's3', parent: 's2', pivot: [0, 5.2, -4] },
  { id: 's4', parent: 's3', pivot: [0, 5.0, -14] },
  { id: 'tail', parent: 's4', pivot: [0, 4.4, -24] },
];

let wormKind = null;
export function buildSandSpineWorm() {
  if (!wormKind) wormKind = makeKind(sculptWorm(), WORM_SPEC, WORM.S);
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups: g } = instantiate(wormKind, mat);
  const parts = {
    segs: [g.head, g.s1, g.s2, g.s3, g.s4, g.tail],
    head: g.head,
    jaw: g.jaw,
    tail: g.tail,
  };
  return { root, mat, parts, tris: wormKind.tris };
}

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
  // Open pincers: a thick upper finger and a lower finger with a gap between them.
  R.own('clawL');
  R.cap([3.5, 4.4, 13], [8, 5.2, 17], 1.7, 2.2, () => SCORP.claw);
  R.cap([8, 6.4, 17], [14, 7.2, 22], 1.5, 0.7, () => SCORP.shellHi);
  R.cap([8, 3.2, 17], [13.5, 2.4, 21.5], 1.2, 0.65, () => SCORP.claw);
  R.own('clawR');
  R.cap([-3.5, 4.4, 13], [-8, 5.2, 17], 1.7, 2.2, () => SCORP.claw);
  R.cap([-8, 6.4, 17], [-14, 7.2, 22], 1.5, 0.7, () => SCORP.shellHi);
  R.cap([-8, 3.2, 17], [-13.5, 2.4, 21.5], 1.2, 0.65, () => SCORP.claw);
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
  { id: 'clawR', parent: 'head', pivot: [-4, 4.2, 14] },
  { id: 'L0', parent: 'body', pivot: [6.2, 3.6, 8] },
  { id: 'L1', parent: 'body', pivot: [6.2, 3.6, 3.8] },
  { id: 'L2', parent: 'body', pivot: [6.2, 3.6, -0.4] },
  { id: 'L3', parent: 'body', pivot: [6.2, 3.6, -4.6] },
  { id: 'R0', parent: 'body', pivot: [-6.2, 3.6, 8] },
  { id: 'R1', parent: 'body', pivot: [-6.2, 3.6, 3.8] },
  { id: 'R2', parent: 'body', pivot: [-6.2, 3.6, -0.4] },
  { id: 'R3', parent: 'body', pivot: [-6.2, 3.6, -4.6] },
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
    legs: [leg('L0'), leg('L1'), leg('L2'), leg('L3'), leg('R0'), leg('R1'), leg('R2'), leg('R3')],
    tail: [g.t1, g.t2, g.t3, g.t4],
    sting: g.sting,
  };
  return { root, mat, parts, tris: scorpKind.tris };
}
