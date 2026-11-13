import * as THREE from 'three';
import { hash3, jitter, mix, shade, clamp } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { TIGER as C } from '../data/beasts.js';
import { Rig, makeKind, instantiate, smooth2 } from './beastKit.js';

/**
 * Bengal Tiger. A single master grid is sculpted and painted (orange coat, forked black
 * stripes, white chest, belly, inner legs, cheeks and paws), then cut at the joints.
 * Design units are 0.03 world units; the grid is K times finer. +z forward, +y up, x > 0 is
 * the tiger's left.
 */
const K = 0.88;
const HS = 1.08;
const HC = [0, 35, 33];
const h = (x, y, z, s = 0) => hash3(Math.floor(x * K), Math.floor(y * K), Math.floor(z * K), s);
const hp = (x, y, z, s = 0) => hash3(Math.floor(x * 0.5), Math.floor(y * 0.5), Math.floor(z * 0.5), s);

const fur = (x, y, z, tone = 0.5) => jitter(mix(C.orangeLo, C.orangeHi, clamp(tone * 0.8 + hp(x, y, z, 3) * 0.3, 0, 1)), 0.05, h(x, y, z, 4));
const cream = (x, y, z, k = 0) => jitter(k > 0.5 ? C.whiteLo : C.white, 0.04, h(x, y, z, 5));
const ink = (x, y, z) => jitter(C.black, 0.25, h(x, y, z, 6));

/** True where a transverse, forked, tapering stripe crosses this voxel. */
function stripe(x, y, z, top, bottom, period = 4.1, thick = 2.7, seed = 11) {
  const side = x >= 0 ? 1 : 2;
  const w = smooth2(z * 0.09 + side * 13, y * 0.12, seed) - 0.5;
  const zz = z + w * 12 + (top - y) * 0.32;
  const cell = Math.floor(zz / period);
  const ph = zz - cell * period - period / 2;
  const span = clamp((y - bottom) / Math.max(1, top - bottom), 0, 1);
  const th = thick * Math.pow(span, 0.5) + 0.5 + (hash3(cell, side, 0, seed) - 0.5) * 0.8;
  const gap = hash3(cell + side * 17, Math.floor(y / 6), 1, seed) < 0.1 && y < top - 3;
  if (!gap && Math.abs(ph) < th * 0.5) return true;
  const fork = hash3(cell, side, 2, seed) < 0.7 && y > top - 12;
  if (fork) {
    const p2 = zz - (cell + 0.5) * period;
    if (Math.abs(p2) < 1.3 * span + 0.2) return true;
  }
  return false;
}

function bodyCoat(x, y, z) {
  const tone = smooth2(x * 0.1 + z * 0.14, y * 0.16, 7);
  const lim = 25 + (smooth2(z * 0.18, 2, 9) - 0.5) * 3.4 + clamp((z - 14) * 0.5, 0, 8) + (Math.abs(x) < 3 ? 2 : 0);
  if (y < lim) return cream(x, y, z, y < lim - 4 ? 1 : 0);
  if (y < lim + 1.4 && h(x, y, z, 8) < 0.5) return cream(x, y, z, 0);
  if (stripe(x, y, z, 51, lim)) return ink(x, y, z);
  return fur(x, y, z, tone);
}

function legCoat(x, y, z, s, cx, ringTop, whiteBelow) {
  const inner = s * x < cx - 3.4;
  if (y < whiteBelow || (inner && h(x, y, z, 12) < 0.92)) return cream(x, y, z, inner ? 0 : 1);
  if (!inner && y > 20 && stripe(x, y, z, 49, 16, 3.9, 2.7, 14)) return ink(x, y, z);
  const ring = (y + smooth2(z * 0.2, x * 0.2, 5) * 4 + 20) % 5.6;
  if (y < ringTop && ring < 1.7 && h(x, y, z, 13) < 0.9) return ink(x, y, z);
  return fur(x, y, z, smooth2(x * 0.2, y * 0.2, 4));
}

function headCoat(x, y, z) {
  const ax = Math.abs(x);
  const tone = smooth2(x * 0.2, z * 0.2, 14);
  if (z > 47 && y < 35.4) return h(x, y, z, 9) < 0.2 && y > 33.5 && ax > 2 ? ink(x, y, z) : cream(x, y, z, 0);
  if (y < 34.4 && z > 38) return cream(x, y, z, 0);
  if (ax > 6.6 && y < 37.2) {
    const band = (y + ax * 0.7 + 20) % 4.4;
    return band < 1.3 && h(x, y, z, 15) < 0.92 ? ink(x, y, z) : cream(x, y, z, band > 3.2 ? 1 : 0);
  }
  if (z > 44 && y > 36 && y < 43 && ax < 4.2) return ((z + ax * 0.6) % 4.2 < 1.2 && h(x, y, z, 10) < 0.9) || (z > 49 && h(x, y, z, 19) < 0.2) ? ink(x, y, z) : fur(x, y, z, 0.6);
  if (y > 42.5 && z < 46 && ax < 6.8 && (ax % 2.9 < 1.1 || (ax < 1.5 && z < 41))) return ink(x, y, z);
  if (z > 41 && z < 46 && y > 41.5 && ax > 3.6 && ax < 7 && h(x, y, z, 16) < 0.5) return cream(x, y, z, 0);
  return fur(x, y, z, 0.35 + tone * 0.5);
}

function tailCoat(x, y, z, tipFrom) {
  if (z < tipFrom) return ink(x, y, z);
  if ((-z + 8) % 6.2 < 2.2 && h(x, y, z, 17) < 0.95) return ink(x, y, z);
  if (y < 28 && h(x, y, z, 18) < 0.3) return cream(x, y, z, 1);
  return fur(x, y, z, 0.5);
}

const rough = (fn, thr, cut, seed) => (x, y, z, t, u) => (u > cut && h(x, y, z, seed) < thr ? null : fn(x, y, z));

function sculpt() {
  const R = new Rig(-30, 0, -80, 30, 62, 64, K);

  R.own('chest');
  R.ell([0, 34.5, 12], [11.4, 12.6, 14], rough(bodyCoat, 0.4, 0.86, 21));
  for (const s of [-1, 1]) R.ell([s * 8.4, 42, 11], [7.2, 8.4, 10.5], bodyCoat);
  R.ell([0, 33.5, -3], [9.8, 11.2, 14], rough(bodyCoat, 0.4, 0.88, 22));
  R.cap([0, 44, 17], [0, 43.4, -20], 5.4, 5.6, bodyCoat, [1.2, 0.9, 1]);
  R.ell([0, 35, -17], [10.4, 11.8, 11], bodyCoat);
  for (const s of [-1, 1]) R.ell([s * 8, 32.5, -18], [5.8, 10.5, 10.5], bodyCoat);
  R.reown('chest', 'hips', (x, y, z) => z < 1);

  R.own('neck');
  R.cap([0, 36, 19], [0, 38.8, 30.5], 10, 8.4, rough(bodyCoat, 0.35, 0.8, 23));

  R.scaled(HS, HC, () => {
    R.own('head');
    R.ell([0, 38.6, 36.8], [9.3, 7.9, 8.7], headCoat);
    for (const s of [-1, 1]) {
      R.ell([s * 8.6, 34, 34.4], [4.6, 6.2, 7], rough(headCoat, 0.5, 0.8, 24));
      R.ell([s * 4.6, 43, 40.2], [3.8, 1.9, 3.8], headCoat);
    }
    R.cap([0, 40.2, 39.5], [0, 36.6, 49], 4.2, 3.6, headCoat);
    R.ell([0, 35.4, 45.6], [5.8, 4.2, 6.8], headCoat);
    for (const s of [-1, 1]) R.ell([s * 3.3, 33.6, 47.2], [3.2, 2.3, 4.4], (x, y, z) => cream(x, y, z, 0));
    R.ell([0, 37.2, 51.6], [3.1, 1.8, 1.5], (x, y, z, t, u) => (u > 0.55 ? C.nose : shade(C.nose, 0.8)));
    R.ell([0, 38.2, 52.2], [1.2, 0.5, 0.6], () => C.black);
    for (const s of [-1, 1]) {
      R.cap([s * 3.4, 32.5, 50.2], [s * 3.5, 26, 50.6], 1.8, 0.35, () => C.tooth);
      for (let k = 0; k < 4; k++) R.cap([s * (0.7 + k * 0.5), 31.6, 52.2], [s * (0.7 + k * 0.5), 30, 52.2], 0.55, 0.3, () => C.tooth);
      R.stamp([s * 5.1, 40.6, 43], [3.5, 2.9, 2.9], () => C.black, true);
      R.stamp([s * 5.3, 40.6, 43.5], [2.3, 1.65, 2.0], (x, y, z, u) => (u > 0.5 ? C.eye : C.eyeHi), true, true);
      R.stamp([s * 5.6, 40.6, 44.2], [0.7, 1.7, 1.1], () => C.black, true, false);
      R.stamp([s * 7.4, 39.2, 41], [1.4, 1.0, 3.4], () => C.black, true);
      R.stamp([s * 5.8, 44.2, 42], [3.2, 1.1, 2.6], () => C.white, true);
      R.stamp([s * 3.4, 41.8, 46], [1.5, 2.4, 2.2], () => C.white, true);
    }

    for (const s of [-1, 1]) {
      R.own('ear' + (s > 0 ? 'L' : 'R'));
      R.ell([s * 7.4, 45.6, 33.4], [3.1, 3.3, 1.7], (x, y, z, t, u) => {
        if (z >= 33.4 && u < 0.8) return cream(x, y, z, 0);
        if (z >= 33.4) return ink(x, y, z);
        return Math.abs(Math.abs(x) - 7.4) < 1.3 && Math.abs(y - 45.6) < 1.4 ? C.white : ink(x, y, z);
      });
    }

    R.own('jaw');
    const JA = 0.42;
    const J = (y, z) => [33.5 + (y - 33.5) * Math.cos(JA) - (z - 35) * Math.sin(JA), 35 + (z - 35) * Math.cos(JA) + (y - 33.5) * Math.sin(JA)];
    const jp = (x, y, z) => {
      const [yy, zz] = J(y, z);
      return [x, yy, zz];
    };
    R.cap(jp(0, 32.2, 36), jp(0, 31.4, 49), 4.4, 3.3, (x, y, z) => cream(x, y, z, 0), [1.05, 0.62, 1]);
    R.ell(jp(0, 30.8, 50.2), [3.1, 1.9, 2.6], (x, y, z) => cream(x, y, z, 0));
    for (const s of [-1, 1]) {
      R.cap(jp(s * 2.7, 32.4, 50.2), jp(s * 2.8, 38, 50.4), 1.5, 0.3, () => C.tooth);
      for (let k = 0; k < 4; k++) R.cap(jp(s * (0.7 + k * 0.5), 32, 52), jp(s * (0.7 + k * 0.5), 33.8, 52), 0.55, 0.3, () => C.tooth);
      for (let k = 0; k < 3; k++) R.cap(jp(s * (1.6 + k * 1.1), 32.4, 46 - k * 3), jp(s * (1.6 + k * 1.1), 34, 46 - k * 3), 0.5, 0.25, () => C.tooth);
    }

    R.own('head');
    for (const s of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        R.line([s * 5.6, 35.2 + row * 0.8 - 0.8, 49.2 - row * 0.5], [s * (17 - row * 1.0), 36.2 + (row - 1) * 2.6, 54 + row * 1.6 - 3.2], C.white);
      }
    }
  });
  R.paint((x, y, z, c, id, gx, gy, gz) => (id === 'jaw' && c !== C.tooth && !R.has(gx, gy + 1, gz) && Math.abs(x) < 4 ? (Math.abs(x) < 1.8 ? C.pinkHi : C.pink) : null));
  R.paint((x, y, z, c, id, gx, gy, gz) => (id === 'head' && z > 37 && z < 55 && Math.abs(x) < 4.6 && y > 33.2 && y < 34.8 && !R.has(gx, gy - 1, gz) ? C.pink : null));

  for (const s of [-1, 1]) {
    const nm = s > 0 ? 'L' : 'R';
    R.own('fU' + nm);
    R.cap([s * 9.2, 31.5, 14.5], [s * 9.6, 19, 13], 8.4, 6.2, (x, y, z) => legCoat(x, y, z, s, 9.6, 30, 0));
    R.own('fM' + nm);
    R.cap([s * 9.6, 19, 13], [s * 9.6, 8.5, 15.8], 6.2, 4.7, (x, y, z) => legCoat(x, y, z, s, 9.6, 20, 7));
    R.own('fP' + nm);
    R.cap([s * 9.6, 8.5, 15.8], [s * 9.6, 3.8, 19.6], 4.7, 4.7, (x, y, z) => legCoat(x, y, z, s, 9.6, 8, 0));
    R.ell([s * 9.6, 3.2, 22], [6.2, 3.6, 7.4], (x, y, z, t, u) => (z > 25 ? cream(x, y, z, u > 0.85 ? 1 : 0) : fur(x, y, z, 0.5)));
    for (let k = -1; k <= 1; k++) R.cap([s * 9.6 + k * 2.4, 1.7, 27.8], [s * 9.6 + k * 2.5, 0.9, 30.4], 1.1, 0.4, () => C.claw);
    R.line([s * 9.6 - 1.2, 3.4, 28], [s * 9.6 - 1.2, 1.2, 28.2], C.black);
    R.line([s * 9.6 + 1.2, 3.4, 28], [s * 9.6 + 1.2, 1.2, 28.2], C.black);

    R.own('hU' + nm);
    R.cap([s * 9.8, 32.5, -20], [s * 10.5, 21, -11.5], 9.8, 6.4, (x, y, z) => legCoat(x, y, z, s, 9.8, 32, 0), [0.95, 1, 1]);
    R.own('hM' + nm);
    R.cap([s * 10.5, 21, -11.5], [s * 9.4, 11, -24.5], 6.4, 4.5, (x, y, z) => legCoat(x, y, z, s, 9.6, 21, 7));
    R.own('hP' + nm);
    R.cap([s * 9.4, 11, -24.5], [s * 9.2, 4.8, -23], 4.5, 4.4, (x, y, z) => legCoat(x, y, z, s, 9.6, 8, 0));
    R.ell([s * 9.4, 3.2, -19.2], [6, 3.6, 7.2], (x, y, z, t, u) => (z > -15.5 ? cream(x, y, z, u > 0.85 ? 1 : 0) : fur(x, y, z, 0.5)));
    for (let k = -1; k <= 1; k++) R.cap([s * 9.4 + k * 2.4, 1.7, -13.2], [s * 9.4 + k * 2.5, 0.9, -10.4], 1.1, 0.4, () => C.claw);
  }

  R.own('tail1');
  R.cap([0, 34.5, -24], [0, 31.5, -38], 5, 4.3, (x, y, z) => tailCoat(x, y, z, -999));
  R.own('tail2');
  R.cap([0, 31.5, -38], [0, 27.5, -50], 4.3, 3.8, (x, y, z) => tailCoat(x, y, z, -999));
  R.own('tail3');
  R.cap([0, 27.5, -50], [0, 29, -64], 3.8, 3.3, (x, y, z) => tailCoat(x, y, z, -60));
  R.ell([0, 29.3, -65], [3.2, 3.2, 3.2], () => C.black);

  R.paint((x, y, z, c, id, gx, gy, gz) => ((id === 'chest' || id === 'hips') && !R.has(gx, gy + 1, gz) && h(x, y, z, 31) < 0.12 ? shade(c, 0.9) : null));
  return R;
}

const SPEC = [
  { id: 'body', parent: null, pivot: [0, 31, 0] },
  { id: 'chest', parent: 'body', pivot: [0, 33, 2] },
  { id: 'neck', parent: 'chest', pivot: [0, 36, 19] },
  { id: 'head', parent: 'neck', pivot: [0, 37, 30] },
  { id: 'jaw', parent: 'head', pivot: [0, 33.5, 35] },
  { id: 'earL', parent: 'head', pivot: [7.6, 44.8, 33.4] },
  { id: 'earR', parent: 'head', pivot: [-7.6, 44.8, 33.4] },
  { id: 'fUL', parent: 'chest', pivot: [9.2, 31.5, 14.5] },
  { id: 'fML', parent: 'fUL', pivot: [9.6, 19, 13] },
  { id: 'fPL', parent: 'fML', pivot: [9.6, 8.5, 15.8] },
  { id: 'fUR', parent: 'chest', pivot: [-9.2, 31.5, 14.5] },
  { id: 'fMR', parent: 'fUR', pivot: [-9.6, 19, 13] },
  { id: 'fPR', parent: 'fMR', pivot: [-9.6, 8.5, 15.8] },
  { id: 'hips', parent: 'body', pivot: [0, 33, 0] },
  { id: 'hUL', parent: 'hips', pivot: [9.8, 32.5, -20] },
  { id: 'hML', parent: 'hUL', pivot: [10.5, 21, -11.5] },
  { id: 'hPL', parent: 'hML', pivot: [9.4, 11, -24.5] },
  { id: 'hUR', parent: 'hips', pivot: [-9.8, 32.5, -20] },
  { id: 'hMR', parent: 'hUR', pivot: [-10.5, 21, -11.5] },
  { id: 'hPR', parent: 'hMR', pivot: [-9.4, 11, -24.5] },
  { id: 'tail1', parent: 'hips', pivot: [0, 34.5, -24] },
  { id: 'tail2', parent: 'tail1', pivot: [0, 31.5, -38] },
  { id: 'tail3', parent: 'tail2', pivot: [0, 27.5, -50] },
];

/** Planar (y, z) joint chains of a front and a hind leg, ending at the pad that touches the ground. */
export const TIGER_CHAINS = {
  front: [[31.5, 14.5], [19, 13], [8.5, 15.8], [0.4, 21.5]],
  hind: [[32.5, -20], [21, -11.5], [11, -24.5], [0.4, -19.2]],
};
export const TIGER_UNIT = C.S;

let kind = null;
export function buildBengalTiger() {
  if (!kind) kind = makeKind(sculpt(), SPEC, C.S);
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const { root, groups } = instantiate(kind, mat);
  const g = groups;
  const parts = {
    body: g.body,
    chest: g.chest,
    hips: g.hips,
    neck: g.neck,
    head: g.head,
    jaw: g.jaw,
    ears: [g.earL, g.earR],
    legs: [
      { up: g.fUL, mid: g.fML, paw: g.fPL, front: true },
      { up: g.fUR, mid: g.fMR, paw: g.fPR, front: true },
      { up: g.hUL, mid: g.hML, paw: g.hPL, front: false },
      { up: g.hUR, mid: g.hMR, paw: g.hPR, front: false },
    ],
    tail: [g.tail1, g.tail2, g.tail3],
  };
  return { root, mat, parts, tris: kind.tris };
}
