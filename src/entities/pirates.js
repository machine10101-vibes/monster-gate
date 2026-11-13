import * as THREE from 'three';
import { toonMaterial } from '../engine/materials.js';
import { S } from '../data/pirates.js';
import { VoxelModel } from '../engine/voxel.js';
import { meshFrom } from './humanoid.js';
import {
  TORSO, HEAD, HAT, ARM, LEG, CLOTH, SWORD,
  paintTorso, paintHead, paintJaw, paintHat, paintKnot, paintArm, paintFingers, paintLeg, paintCloth, halfCloth, paintSword,
} from './piratePaint.js';

/**
 * Pirate rig. Painted grids are meshed once per variant and cloned for every spawn, so a crowd of
 * pirates only pays for the (cheap) group clone and one toon material each.
 */
const templ = toonMaterial({ vertexColors: true });

/**
 * Painted grids are authored at S/RES fine resolution and re-sampled down to a coarser grid before
 * meshing: seven pirates plus six cursed pirates can share a screen on a tablet, so each creature
 * stays near 50k vertices. Heads keep full resolution so faces stay readable.
 */
export const RES = 0.78;

function coarsen(M, f) {
  const sx = Math.max(1, Math.ceil(M.sx * f));
  const sy = Math.max(1, Math.ceil(M.sy * f));
  const sz = Math.max(1, Math.ceil(M.sz * f));
  const out = new VoxelModel(sx, sy, sz);
  const inv = 1 / f;
  const cellVol = inv * inv * inv;
  const span = (n) => {
    const a = n * inv;
    const b = (n + 1) * inv;
    const i0 = Math.floor(a);
    const i1 = Math.min(Math.ceil(b), 1e9);
    const parts = [];
    for (let i = i0; i < i1; i++) parts.push([i, Math.max(0, Math.min(b, i + 1) - Math.max(a, i))]);
    return parts;
  };
  const GLOW = 1 << 25;
  for (let nz = 0; nz < sz; nz++) {
    const zs = span(nz);
    for (let ny = 0; ny < sy; ny++) {
      const ys = span(ny);
      for (let nx = 0; nx < sx; nx++) {
        const xs = span(nx);
        let filled = 0;
        let best = 0;
        let bestW = 0;
        let glow = 0;
        let glowW = 0;
        for (const [z, wz] of zs) {
          if (z >= M.sz) continue;
          for (const [y, wy] of ys) {
            if (y >= M.sy) continue;
            for (const [x, wx] of xs) {
              if (x >= M.sx) continue;
              const v = M.data[x + M.sx * (y + M.sy * z)];
              if (!v) continue;
              const w = wx * wy * wz;
              filled += w;
              if (v & GLOW) {
                if (w > glowW) {
                  glowW = w;
                  glow = v;
                }
              } else if (w > bestW) {
                bestW = w;
                best = v;
              }
            }
          }
        }
        if (glow && glowW > cellVol * 0.2) out.data[nx + sx * (ny + sy * nz)] = glow;
        else if (best && filled > cellVol * 0.45) out.data[nx + sx * (ny + sy * nz)] = best;
      }
    }
  }
  return out;
}

const meshQ = (M, ox, oy, oz, mat, f = RES) => (f === 1 ? meshFrom(M, ox, oy, oz, mat, S) : meshFrom(coarsen(M, f), ox * f, oy * f, oz * f, mat, S / f));
const CACHE = new Map();

function piece(key, make) {
  let g = CACHE.get(key);
  if (!g) {
    g = make(templ);
    CACHE.set(key, g);
  }
  return g.clone(true);
}

export const HIP_Y = 43;
export const ARM_X = 15;
export const LEG_X = 5.3;

const LIMBS = new Map();

function rows(M, y0, y1) {
  const out = new VoxelModel(M.sx, M.sy, M.sz);
  for (let z = 0; z < M.sz; z++)
    for (let y = Math.max(0, y0); y < Math.min(M.sy, y1); y++)
      for (let x = 0; x < M.sx; x++) out.data[out.idx(x, y, z)] = M.data[M.idx(x, y, z)];
  return out;
}

function splitLimb(M, ox, oy, oz, mat, joint) {
  const upper = meshQ(rows(M, joint, M.sy), ox, oy, oz, mat);
  const lower = meshQ(rows(M, 0, joint + 1), ox, joint, oz, mat);
  lower.scale.set(0.975, 1, 0.975);
  return { upper, lower };
}

function limbPieces(key, make, ox, oy, oz, joint) {
  if (!LIMBS.has(key)) LIMBS.set(key, splitLimb(make(), ox, oy, oz, templ, joint));
  const p = LIMBS.get(key);
  return { upper: p.upper.clone(true), lower: p.lower.clone(true) };
}

export function buildPirateRig(undead) {
  const tag = undead ? 'u' : 'l';
  const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
  const root = new THREE.Group();
  const hip = new THREE.Group();
  hip.position.y = HIP_Y * S;
  root.add(hip);

  const upper = new THREE.Group();
  hip.add(upper);
  upper.add(piece('torso' + tag, () => meshQ(paintTorso(undead), TORSO.ox, TORSO.oy, TORSO.oz, templ)));

  const head = new THREE.Group();
  head.position.set(0, 26.6 * S, 0.2 * S);
  head.add(piece('head' + tag, () => meshQ(paintHead(undead), HEAD.ox, HEAD.oy, HEAD.oz, templ, 1)));
  upper.add(head);

  let jaw = null;
  if (undead) {
    jaw = new THREE.Group();
    jaw.position.set(0, 1.5 * S, -3.4 * S);
    jaw.add(piece('jaw', () => meshQ(paintJaw(), 7, 3.2, 3.6, templ, 1)));
    head.add(jaw);
  }

  const hat = new THREE.Group();
  hat.position.set(0, (undead ? 14.5 : 12.5) * S, 0.2 * S);
  hat.add(piece('hat' + tag, () => meshQ(paintHat(undead), HAT.ox, HAT.oy, HAT.oz, templ, 1)));
  head.add(hat);

  const knot = new THREE.Group();
  knot.position.set(5.9 * S, (undead ? 14.6 : 12.6) * S, -6.4 * S);
  knot.rotation.set(0.1, 0.5, -0.12);
  knot.add(piece('knot' + tag, () => meshQ(paintKnot(undead), 6, 23, 2.5, templ)));
  head.add(knot);

  const arms = [];
  const swordArm = 1;
  for (const side of [-1, 1]) {
    const grip = side === swordArm;
    const { upper: au, lower: al } = limbPieces(`arm${tag}${side}${grip ? 'g' : ''}`, () => paintArm(undead, side, grip), ARM.ox, ARM.pivot, ARM.oz, ARM.elbow);
    const shoulder = new THREE.Group();
    shoulder.position.set(side * ARM_X * S, 22 * S, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -(ARM.pivot - ARM.elbow) * S;
    elbow.add(al);
    shoulder.add(au, elbow);
    const hand = new THREE.Group();
    hand.position.set(0, -(ARM.elbow - ARM.hand) * S, 0);
    elbow.add(hand);
    let fingers = null;
    if (undead && !grip) {
      fingers = new THREE.Group();
      fingers.position.set(0, -(ARM.elbow - 3.4) * S, 0);
      fingers.add(piece('fingers' + side, () => meshQ(paintFingers(side), 6, 4, 5.5, templ)));
      elbow.add(fingers);
    }
    upper.add(shoulder);
    arms.push({ shoulder, elbow, hand, fingers });
  }
  const [armL, armR] = arms;

  const sword = new THREE.Group();
  sword.add(piece('sword' + tag, () => meshQ(paintSword(undead), SWORD.ox, SWORD.oy, SWORD.oz, templ)));
  sword.rotation.x = Math.PI / 2;
  armR.hand.add(sword);

  const legs = [];
  for (const side of [-1, 1]) {
    const { upper: lu, lower: ll } = limbPieces(`leg${tag}${side}`, () => paintLeg(undead, side > 0 ? 1 : 0), LEG.ox, LEG.pivot, LEG.oz, LEG.knee);
    const thigh = new THREE.Group();
    thigh.position.set(side * LEG_X * S, 0, 0);
    const knee = new THREE.Group();
    knee.position.y = -(LEG.pivot - LEG.knee) * S;
    knee.add(ll);
    thigh.add(lu, knee);
    hip.add(thigh);
    legs.push({ thigh, knee });
  }
  const [legL, legR] = legs;

  const cloths = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(0, 1 * S, 0);
    g.add(piece(`cloth${tag}${side}`, () => meshQ(halfCloth(paintCloth(undead), side), CLOTH.ox, CLOTH.oy, CLOTH.oz, templ)));
    hip.add(g);
    cloths.push(g);
  }

  root.traverse((o) => {
    if (o.isMesh && o.material === templ) o.material = mat;
  });
  root.scale.setScalar(1);

  return {
    root,
    mat,
    parts: {
      hip,
      body: upper,
      head,
      jaw,
      hat,
      knot,
      armL: armL.shoulder,
      armR: armR.shoulder,
      elbowL: armL.elbow,
      elbowR: armR.elbow,
      handL: armL.hand,
      handR: armR.hand,
      fingersL: armL.fingers,
      sword,
      legL: legL.thigh,
      legR: legR.thigh,
      kneeL: legL.knee,
      kneeR: legR.knee,
      clothL: cloths[0],
      clothR: cloths[1],
    },
  };
}

export const buildPirate = () => buildPirateRig(false);
export const buildCursedPirate = () => buildPirateRig(true);
