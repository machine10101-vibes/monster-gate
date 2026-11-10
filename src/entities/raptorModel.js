import * as THREE from 'three';
import { hash3, jitter, mix, shade, clamp } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { RAPTOR as C } from '../data/beasts.js';
import { Rig, makeKind, instantiate, smooth2 } from './beastKit.js';

/**
 * Battle Raptor, after the voxel-mosaic reference: every voxel is a tile of olive, tan or
 * grey, a spine band of grey plates runs from the brow crest to the tail, the belly and
 * throat are pale tan, and the hide is raked by dark red scars. Design unit = voxel = 0.025.
 * +z forward, +y up, x > 0 is the raptor's left.
 */
const K = 0.75;
const h = (x, y, z, s = 0) => hash3(Math.floor(x * K), Math.floor(y * K), Math.floor(z * K), s);
const HS = 1.22;
const HC = [0, 52, 34];
const pick = (arr, r) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

const OLIVES = [C.olive, C.olive, C.oliveHi, C.oliveLo, C.olive, C.oliveHi];
const TANS = [C.tan, C.tanHi, C.tan, C.tanLo];
const GREYS = [C.grey, C.greyHi, C.greyLo, C.grey, C.greyHi];
const BELLIES = [C.belly, C.tanHi, C.belly, C.tan];

const tile = (x, y, z, pal, amt = 0.1, s = 1) => jitter(pick(pal, h(x, y, z, s)), amt, h(x, y, z, s + 40));

/** Olive hide mottled with tan patches, one tile per voxel. */
function hide(x, y, z, patch = 0.62) {
  const p = smooth2(x * 0.17 + z * 0.1, y * 0.2 + z * 0.06, 5) + (h(x, y, z, 9) - 0.5) * 0.18;
  return p > patch ? tile(x, y, z, TANS, 0.1, 3) : tile(x, y, z, OLIVES, 0.12, 2);
}

function torsoCoat(x, y, z) {
  const v = (y - 43) / 12.5;
  const edge = (h(x, y, z, 11) - 0.5) * 0.3;
  if (v + edge > 0.66) return tile(x, y, z, GREYS, 0.1, 4);
  if (v + edge * 0.6 < -0.58 || (z > 20 && v < -0.2 && Math.abs(x) < 6.5)) {
    const rib = (z + 40) % 3.2 < 0.8 ? 0.9 : 1;
    return shade(tile(x, y, z, BELLIES, 0.07, 5), rib);
  }
  return hide(x, y, z, 0.8);
}

function limbCoat(x, y, z, grey = false, tanBias = 0.5) {
  if (grey && h(x, y, z, 21) < 0.5) return tile(x, y, z, GREYS, 0.1, 6);
  return hide(x, y, z, tanBias);
}

function headCoat(x, y, z) {
  const ax = Math.abs(x);
  if (y < 52 && z > 44) return tile(x, y, z, BELLIES, 0.08, 7);
  if (y < 51.5) return h(x, y, z, 19) < 0.7 ? tile(x, y, z, TANS, 0.1, 8) : hide(x, y, z, 0.6);
  if (y > 63.5 && z < 56 && ax < 5) return tile(x, y, z, GREYS, 0.1, 9);
  if (z > 60 && y < 55) return hide(x, y, z, 0.35);
  return hide(x, y, z, 0.7);
}

function tailCoat(x, y, z, cy) {
  const v = (y - cy) / 6;
  if (v > 0.55 + (h(x, y, z, 12) - 0.5) * 0.3) return tile(x, y, z, GREYS, 0.1, 4);
  if (v < -0.45) return tile(x, y, z, BELLIES, 0.08, 5);
  return hide(x, y, z, 0.58);
}

function spike(R, base, dir, len, r0) {
  const tip = [base[0] + dir[0] * len, base[1] + dir[1] * len, base[2] + dir[2] * len];
  R.cap([base[0] - dir[0] * 1.5, base[1] - dir[1] * 1.5, base[2] - dir[2] * 1.5], tip, r0, 0.35, (x, y, z, t) => jitter(mix(C.greyLo, C.greyHi, t * 0.8 + h(x, y, z, 31) * 0.2), 0.08, h(x, y, z, 32)));
}

function claw(R, base, dir, len, r0) {
  const pts = [base];
  const steps = [
    [0.4, 0],
    [0.34, -0.5],
    [0.28, -1.1],
  ];
  let cur = base;
  for (const [f, drop] of steps) {
    cur = [cur[0] + dir[0] * len * f, cur[1] + (dir[1] + drop) * len * f, cur[2] + dir[2] * len * f * (drop < -1 ? 0.5 : 1)];
    pts.push(cur);
  }
  const radii = [r0, r0 * 0.82, r0 * 0.58, 0.25];
  for (let i = 0; i < 3; i++) {
    R.cap(pts[i], pts[i + 1], radii[i], radii[i + 1], (x, y, z, t) => jitter(mix(C.claw, C.clawTip, (i + t) / 3), 0.1, h(x, y, z, 34)));
  }
}

function tooth(R, base, tip, r0) {
  R.cap(base, tip, r0, 0.2, (x, y, z, t) => jitter(mix(C.tooth, C.toothLo, 1 - t * 0.9), 0.04, h(x, y, z, 35)));
}

/** A raked pair of scars drawn on exposed voxels that face along +-x. */
function scar(R, side, a, b, w = 0.9) {
  const [z0, y0] = a;
  const [z1, y1] = b;
  const dz = z1 - z0;
  const dy = y1 - y0;
  const L2 = dz * dz + dy * dy;
  R.paint((x, y, z, c, id, gx, gy, gz) => {
    if (side * x <= 0 || R.has(gx + side, gy, gz) || !R.exposed(gx, gy, gz)) return null;
    const t = clamp(((z - z0) * dz + (y - y0) * dy) / L2, 0, 1);
    const d = Math.hypot(z - (z0 + dz * t), y - (y0 + dy * t));
    const wt = w * (1 - Math.abs(t - 0.5) * 0.9);
    if (d > wt) return null;
    return d < wt * 0.45 ? jitter(C.scarDeep, 0.1, h(x, y, z, 36)) : jitter(C.scar, 0.12, h(x, y, z, 37));
  });
}

function sculpt() {
  const R = new Rig(-34, 0, -92, 34, 80, 78, K);

  R.own('torso');
  R.ell([0, 43, 12], [12.4, 13.8, 15.5], torsoCoat);
  R.ell([0, 43.5, -5], [12, 13.2, 14], torsoCoat);
  R.ell([0, 43, -19], [12.6, 13.2, 12], torsoCoat);
  for (const s of [-1, 1]) {
    R.ell([s * 8.2, 47.5, 12.5], [4.8, 6.5, 8.5], torsoCoat);
    R.ell([s * 8.6, 41, -14], [5, 8, 9], torsoCoat);
  }

  R.own('neck');
  R.cap([0, 47, 24], [0, 53, 36.5], 10, 8.8, (x, y, z) => (y < 43.6 + (z - 24) * 0.35 ? tile(x, y, z, BELLIES, 0.08, 5) : hide(x, y, z, 0.55)), [0.9, 1, 1]);

  R.scaled(HS, HC, () => {
    R.own('head');
    R.ell([0, 57.5, 45], [9.4, 8.4, 11], headCoat);
    R.cap([0, 57.8, 50], [0, 56.4, 68.5], 7.4, 5.6, headCoat, [0.86, 0.82, 1]);
    R.ell([0, 56.2, 69], [4.8, 4.6, 2.8], headCoat);
    for (const s of [-1, 1]) {
      R.ell([s * 6.6, 62.8, 50], [3.4, 2.3, 6.6], (x, y, z) => (h(x, y, z, 13) < 0.45 ? tile(x, y, z, GREYS, 0.1, 9) : hide(x, y, z, 0.45)));
      R.ell([s * 8.4, 53, 43], [2.8, 5.2, 8.6], (x, y, z) => (h(x, y, z, 14) < 0.7 ? hide(x, y, z, 0.5) : tile(x, y, z, TANS, 0.1, 8)));
      R.ell([s * 4.6, 53.2, 58], [2.2, 1.7, 8], (x, y, z) => tile(x, y, z, TANS, 0.1, 8));
    }

    R.own('jaw');
    R.cap([0, 49.8, 41], [0, 48.4, 66], 5.6, 4.3, (x, y, z, t, u) => (y > 49.6 ? C.pink : tile(x, y, z, y < 47 ? BELLIES : TANS, 0.08, 7)), [0.92, 0.5, 1]);
    R.ell([0, 48, 67.2], [3.6, 2.5, 2.4], (x, y, z) => tile(x, y, z, BELLIES, 0.08, 7));
    for (const s of [-1, 1]) R.ell([s * 5.2, 49.5, 43], [2.7, 3.8, 5.4], (x, y, z) => hide(x, y, z, 0.5));
    for (let i = 0; i < 7; i++) {
      const z = 51 + i * 2.6;
      for (const s of [-1, 1]) tooth(R, [s * (4.3 - i * 0.12), 49.6, z], [s * (4.2 - i * 0.12), 49.6 + (i === 4 ? 5.6 : 3.6 + (i % 2)), z + 0.5], i === 4 ? 1.15 : 0.9);
    }
    for (let i = 0; i < 3; i++) tooth(R, [-1.6 + i * 1.6, 49.4, 68.2], [-1.6 + i * 1.6, 53, 68.4], 0.95);
    R.ell([0, 50.8, 50], [2.1, 0.9, 11], (x, y, z, t, u) => jitter(C.pinkHi, 0.06, h(x, y, z, 38)));

    R.own('head');
    for (let i = 0; i < 7; i++) {
      const z = 53 + i * 2.6;
      const ww = 5.1 - i * 0.08;
      for (const s of [-1, 1]) {
        const big = i === 0 || i === 3;
        tooth(R, [s * ww, 52.2, z], [s * (ww - 0.25), 52.2 - (big ? 6.6 : 4.4 + (i % 2)), z + 0.7], big ? 1.25 : 0.95);
      }
    }
    for (let i = 0; i < 4; i++) tooth(R, [-2.2 + i * 1.5, 52.2, 69.6], [-2.2 + i * 1.5, 47.6, 70.1], 1.05);
    for (const s of [-1, 1]) {
      R.stamp([s * 9.3, 59.2, 50], [4.2, 4.2, 4.2], (x, y, z) => jitter(C.dark, 0.3, h(x, y, z, 39)), true);
      R.stamp([s * 9.6, 59.2, 50.2], [2.5, 2.5, 2.5], (x, y, z, u) => (u > 0.55 ? C.eye : C.eyeHi), true, true);
      R.stamp([s * 9.9, 59.2, 50.6], [0.7, 2.1, 1.1], () => C.dark, true, false);
      R.stamp([s * 3.2, 60.4, 70.4], [1.3, 1.1, 1.3], () => C.dark, true);
    }
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) spike(R, [s * (3.6 + i * 0.4), 66.4 - i * 0.2, 54 - i * 3.4], [s * 0.3, 0.85, -0.45], 4.4 - i * 0.35, 1.7);
    }
  });

  const arms = [];
  for (const s of [-1, 1]) {
    const nm = s > 0 ? 'L' : 'R';
    R.own('aU' + nm);
    R.cap([s * 10.4, 46, 14], [s * 14.6, 36, 8.5], 6.8, 5.6, (x, y, z) => limbCoat(x, y, z, false, 0.6));
    R.own('aF' + nm);
    R.cap([s * 14.6, 36, 8.5], [s * 13.2, 26, 21.5], 5.6, 4.1, (x, y, z) => limbCoat(x, y, z, true, 0.4));
    R.own('aH' + nm);
    R.ell([s * 13.2, 22.5, 24.5], [5, 3.8, 5.8], (x, y, z) => hide(x, y, z, 0.35));
    for (let f = -1; f <= 1; f++) {
      const fx = s * (13.2 + f * 3.6);
      R.cap([fx * 1, 22.6, 25.5], [fx + s * f * 0.8, 18, 33], 2.3, 1.7, (x, y, z) => hide(x, y, z, 0.3));
      claw(R, [fx + s * f * 0.8, 18, 33], [s * f * 0.12, -0.4, 0.9], 10, 1.25);
    }
    arms.push(nm);
  }

  for (const s of [-1, 1]) {
    const nm = s > 0 ? 'L' : 'R';
    R.own('tU' + nm);
    R.cap([s * 11, 39, -18], [s * 12.6, 29, -4], 11.4, 7, (x, y, z) => limbCoat(x, y, z, h(x, y, z, 1) < 0.5 && y > 38, 0.6));
    R.own('tS' + nm);
    R.cap([s * 12.6, 29, -4], [s * 11, 14, -19], 6.6, 3.9, (x, y, z) => limbCoat(x, y, z, false, 0.45));
    R.own('tM' + nm);
    R.cap([s * 11, 14, -19], [s * 10.6, 4.2, -10.5], 3.9, 3.6, (x, y, z) => limbCoat(x, y, z, z > -15 && h(x, y, z, 2) < 0.55, 0.35));
    R.own('tF' + nm);
    R.ell([s * 10.6, 3.4, -9], [4.8, 3, 4.6], (x, y, z) => hide(x, y, z, 0.3));
    for (let f = -1; f <= 1; f++) {
      const fx = s * 10.6 + f * 4.4;
      const len = f === 0 ? 15 : 12;
      R.cap([s * 10.6 + f * 1.2, 3.8, -8], [fx + f * 1.4, 2.4, -8 + len], 2.6, 1.9, (x, y, z, t) => (y > 3.6 && h(x, y, z, 3) < 0.5 ? tile(x, y, z, GREYS, 0.1, 6) : hide(x, y, z, 0.3)));
      claw(R, [fx + f * 1.4, 2.4, -8 + len], [f * 0.08, -0.3, 0.9], f === 0 ? 10 : 8.6, 1.55);
    }
    claw(R, [s * 6.2, 4, -9], [s * 0.05, -0.1, 0.5], 7, 1.5);
    R.cap([s * 12.4, 6, -14], [s * 6.8, 9, -8], 1.4, 1.1, () => C.claw);
  }

  R.own('tail1');
  R.cap([0, 45, -26], [0, 43.5, -46], 9.2, 6.6, (x, y, z) => tailCoat(x, y, z, 43), [0.88, 0.92, 1]);
  R.own('tail2');
  R.cap([0, 43.5, -46], [0, 43.5, -63], 6.6, 4.4, (x, y, z) => tailCoat(x, y, z, 43.5), [0.88, 0.92, 1]);
  R.own('tail3');
  R.cap([0, 43.5, -63], [0, 51, -84], 4.4, 1.4, (x, y, z, t) => tailCoat(x, y, z, 43.5 + t * 7), [0.9, 0.95, 1]);

  const spikes = [];
  const dirBack = [0, 0.9, -0.42];
  const backPts = [
    ['n', 30, 59.5, 8.2],
    ['n', 24, 57.5, 9.2],
    ['n', 18, 56.2, 9.6],
    ['t', 11, 56.6, 9],
    ['t', 3, 56.2, 8.2],
    ['t', -5, 56.2, 7.6],
    ['t', -13, 56.4, 7],
    ['t', -21, 56.6, 6.4],
  ];
  backPts.forEach(([par, z, y, len], i) => {
    R.own('sp' + i);
    spike(R, [0, y - 1, z], dirBack, len * 0.82, 3);
    spikes.push({ id: 'sp' + i, parent: par === 'n' ? 'neck' : 'torso', pivot: [0, y - 1.5, z] });
  });
  const tailSp = [
    ['tail1', -32, 52.6, 5.6],
    ['tail1', -39, 51.4, 5],
    ['tail2', -48, 49.6, 4.4],
    ['tail2', -56, 48.4, 3.6],
    ['tail3', -66, 47.6, 3],
  ];
  tailSp.forEach(([par, z, y, len], i) => {
    R.own('ts' + i);
    spike(R, [0, y - 1, z], dirBack, len, 2.1);
    spikes.push({ id: 'ts' + i, parent: par, pivot: [0, y - 1.5, z] });
  });

  scar(R, 1, [-12, 38], [-3, 50], 1.0);
  scar(R, 1, [-14, 44], [-6, 51], 0.8);
  scar(R, 1, [-8, 37], [-2, 44], 0.7);
  scar(R, -1, [4, 36], [13, 50], 1.0);
  scar(R, -1, [0, 38], [10, 51], 0.8);
  scar(R, -1, [-14, 40], [-6, 49], 0.8);
  scar(R, -1, [-12, 50], [-4, 38], 0.7);
  scar(R, 1, [48, 52], [38, 60], 0.9);
  scar(R, 1, [50, 49], [41, 57], 0.7);
  scar(R, -1, [60, 52], [48, 61], 0.8);
  scar(R, 1, [18, 30], [4, 36], 0.8);
  scar(R, -1, [-10, 20], [-4, 28], 0.7);
  scar(R, 1, [10, 28], [16, 38], 0.7);

  R.paint((x, y, z, c, id, gx, gy, gz) => (!R.has(gx, gy + 1, gz) && h(x, y, z, 41) < 0.1 ? shade(c, 1.12) : null));
  return { R, spikes };
}

const BASE = [
  { id: 'body', parent: null, pivot: [0, 40, 0] },
  { id: 'torso', parent: 'body', pivot: [0, 43, 0] },
  { id: 'neck', parent: 'torso', pivot: [0, 47, 24] },
  { id: 'head', parent: 'neck', pivot: [0, 53.4, 36.6] },
  { id: 'jaw', parent: 'head', pivot: [0, 50.3, 41.4] },
  { id: 'tail1', parent: 'torso', pivot: [0, 45, -26] },
  { id: 'tail2', parent: 'tail1', pivot: [0, 43.5, -46] },
  { id: 'tail3', parent: 'tail2', pivot: [0, 43.5, -63] },
];
const LIMBS = [];
for (const s of [-1, 1]) {
  const n = s > 0 ? 'L' : 'R';
  LIMBS.push(
    { id: 'aU' + n, parent: 'torso', pivot: [s * 10.4, 46, 14] },
    { id: 'aF' + n, parent: 'aU' + n, pivot: [s * 14.6, 36, 8.5] },
    { id: 'aH' + n, parent: 'aF' + n, pivot: [s * 13.2, 26, 21.5] },
    { id: 'tU' + n, parent: 'torso', pivot: [s * 11, 39, -18] },
    { id: 'tS' + n, parent: 'tU' + n, pivot: [s * 12.6, 29, -4] },
    { id: 'tM' + n, parent: 'tS' + n, pivot: [s * 11, 14, -19] },
    { id: 'tF' + n, parent: 'tM' + n, pivot: [s * 10.6, 4.2, -10.5] }
  );
}

/** Planar (y, z) chain of a leg from the hip to the toe pad. */
export const RAPTOR_LEG = [[39, -18], [29, -4], [14, -19], [4.2, -10.5], [0.6, -1]];
export const RAPTOR_UNIT = C.S;

let kind = null;
export function buildBattleRaptor() {
  if (!kind) {
    const { R, spikes } = sculpt();
    kind = makeKind(R, [...BASE, ...LIMBS, ...spikes], C.S);
    kind.spikeIds = spikes.map((s) => s.id);
  }
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups } = instantiate(kind, mat);
  const g = groups;
  const parts = {
    body: g.body,
    torso: g.torso,
    neck: g.neck,
    head: g.head,
    jaw: g.jaw,
    arms: ['L', 'R'].map((n) => ({ up: g['aU' + n], fore: g['aF' + n], hand: g['aH' + n] })),
    legs: ['L', 'R'].map((n) => ({ thigh: g['tU' + n], shin: g['tS' + n], meta: g['tM' + n], foot: g['tF' + n] })),
    tail: [g.tail1, g.tail2, g.tail3],
    spikes: kind.spikeIds.map((id) => g[id]),
  };
  return { root, mat, parts, tris: kind.tris };
}
