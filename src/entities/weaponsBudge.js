/**
 * Budgefang dragon weapons: grown from fang and horn, wrapped in green scale
 * and hide, fitted in belly-gold, with the dragon's ember-green vein glowing
 * through. Every piece reads as a part of the dragon: fangs become blades,
 * horns become prods and tusks, claws tip the bows.
 */
import { BUDGE as P } from '../data/budge.js';
import { J, lerp, shade, mix, hash3, sweep, curve, tube, horn, teethRow, eyeGem, membrane, scaleCol, scaleGrip, spiralGrip, bowShape, crossbowShape } from './monsterKit.js';

const GRIP = [P.scaleLo, P.scale, P.scaleHi];
const GOLD = P.bellyDark;
const GOLD_HI = P.belly;
const HORN = { root: shade(P.hornDark, 0.7), body: mix(P.horn, P.hornDark, 0.35), tip: P.tooth };
const VEIN = P.vein;
const EMBER = P.ember;

const IVORY = mix(P.horn, P.hornDark, 0.42);
const GUM = P.mouth;

/**
 * Ivory of a fang: it grows out of a red gum line, darkens to old ivory with
 * long growth streaks, carries the glowing vein, and whitens to enamel at the
 * edge and tip.
 */
function fang(p, o = {}) {
  const { vein = true, veinW = 0.16, gum = 0.1, emberEvery = 7 } = o;
  const { t, u, ed, z, y, top, x } = p;
  if (t < gum * 0.55) return J(((x + z) & 1) ? GUM : shade(GUM, 0.78), x, y, z, 299, 0.05);
  if (ed < 1.2) return J(P.tooth, x, y, z, 300, 0.02);
  if (ed < 2.2) return J(mix(P.tooth, P.horn, 0.5), x, y, z, 297, 0.03);
  if (vein && u < veinW && t > gum + 0.02 && t < 0.86) {
    if (top || p.bot) return z % emberEvery === 0 ? { c: EMBER, g: true } : { c: VEIN, g: true };
    return shade(P.scaleLo, 0.8);
  }
  if (vein && u < veinW + 0.1 && t > gum + 0.02 && t < 0.86 && (top || p.bot)) return J(P.scaleLo, x, y, z, 298, 0.04);
  if (t < gum) return J(z % 2 ? P.hornDark : shade(P.hornDark, 0.8), x, y, z, 301, 0.04);
  const streak = hash3(Math.round(x * 0.6), 0, Math.floor(z / 7), 296) < 0.3 ? 0.88 : 1;
  const growth = z % 9 === 0 ? 0.86 : 1;
  const tone = t > 0.78 ? mix(IVORY, P.tooth, (t - 0.78) / 0.22) : mix(IVORY, P.horn, u * 0.6);
  return J(shade(tone, streak * growth * (top ? 1.05 : 0.9)), x, y, z, 302, 0.035);
}

/** Dragon jaw guard: gold bar with a row of teeth biting up the blade and an eye on each face. */
function jawGuard(K, c, z, half, o = {}) {
  const { teeth = 7, tusk = 0 } = o;
  for (let x = -half; x < half; x++) {
    const u = Math.abs(x + 0.5) / half;
    const zz = z + Math.round(u * u * 3);
    const ny = u < 0.3 ? 6 : u < 0.7 ? 5 : 3;
    for (let y = -Math.floor(ny / 2); y < ny - Math.floor(ny / 2); y++)
      for (let d = 0; d < (u < 0.4 ? 4 : 3); d++) c.set(x, y, zz + d, J(d === 0 || u > 0.85 ? GOLD : scaleCol(P.bellyDark, GOLD_HI, P.belly, x, y, zz + d, 2, 303), x, y, zz + d, 304, 0.04));
  }
  teethRow(c, [-half + 2, 0, z + 4], [half - 3, 0, z + 4], teeth, [0, 0, 1], 4, 1.3, { body: P.tooth, tip: 0xffffff });
  for (const sy of [-1, 1]) eyeGem(c, [0, sy * 3.2, z + 1.5], 2.1, P.eye, P.pupil, GOLD);
  if (tusk) {
    for (const dir of [-1, 1]) {
      horn(c, curve((t) => [dir * (half - 1 + t * tusk * 0.45), 0, z + 2 + t * tusk + Math.sin(t * Math.PI) * 2], tusk), 2.4, 0.6, HORN, { ridges: 5 });
    }
  }
}

/** Pommel: a short curled horn. */
function hornPommel(c, z, len = 9) {
  horn(c, curve((t) => [Math.sin(t * 2.2) * 3.5, 0, z - t * len + (1 - Math.cos(t * 2.2)) * 1.5], len), 3.0, 0.7, HORN, { ridges: 4 });
}

function budgeBlade(K) {
  const c = K.ctx();
  scaleGrip(K, c, -6, 10, 2.1, GRIP, GOLD);
  hornPommel(c, -7);
  jawGuard(K, c, 11, 11, { teeth: 7 });
  sweep(c, {
    z0: 16, z1: 94,
    right: (t) => 6 * (1 - t ** 1.7) + 0.4,
    left: (t) => 5 * (1 - t ** 1.25) + 0.4,
    bend: (t) => -7 * t ** 2.2,
    thick: (t) => Math.round(lerp(6, 2, t)),
    paint: (p) => fang(p),
    teeth: [{ side: -1, from: 0.5, to: 0.86, every: 4, len: 3, base: 3, col: P.horn, tip: P.tooth }],
  });
  return c.done();
}

function budgeGreatsword(K) {
  const c = K.ctx();
  scaleGrip(K, c, -10, 28, 2.4, GRIP, GOLD);
  K.ringAt(c, 9, 2.4, GOLD_HI, 5);
  K.ball(c, 0, 0, -13, 3.4, (x, y, z) => J(GOLD, x, y, z, 305, 0.04));
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (2 + t * 4), 0, -13 - t * 6], 7), 1.8, 0.6, HORN);
  jawGuard(K, c, 29, 13, { teeth: 9, tusk: 16 });
  sweep(c, {
    z0: 34, z1: 122,
    right: (t) => (t < 0.8 ? 8.5 : 8.5 * (1 - ((t - 0.8) / 0.2) ** 1.2)) + 0.3,
    left: (t) => (t < 0.74 ? 7.5 : 7.5 * (1 - ((t - 0.74) / 0.26) ** 0.9)) + 0.3,
    thick: (t) => Math.round(lerp(7, 3, t)),
    paint: (p) => fang(p, { veinW: 0.14, gum: 0.06, emberEvery: 6 }),
    teeth: [{ side: -1, from: 0.1, to: 0.72, every: 6, len: 5, base: 4, col: P.horn, tip: P.tooth, rake: 0.9 }],
  });
  return c.done();
}

function budgeDual(K) {
  const c = K.ctx();
  scaleGrip(K, c, -4, 8, 1.8, GRIP, GOLD);
  K.ball(c, 0, 0, -6, 2.4, (x, y, z) => J(GOLD_HI, x, y, z, 306, 0.04));
  // Claw guard: two short claws hooking toward the blade.
  K.rod(c, 9, 11, 3.2, (x, y, z) => J(GOLD, x, y, z, 307, 0.04));
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (3 + t * 4), 0, 10 + t * 5 + t * t * 2], 7), 1.6, 0.5, { root: P.claw, body: P.claw, tip: 0xffffff });
  eyeGem(c, [0, 2.6, 10], 1.5, P.eye, P.pupil, null);
  sweep(c, {
    z0: 12, z1: 64,
    right: (t) => 4 * (1 - t ** 1.5) + 0.4,
    left: (t) => 2.6 * (1 - t ** 1.1) + 0.4,
    bend: (t) => 13 * t ** 1.9,
    thick: (t) => Math.round(lerp(4, 2, t)),
    paint: (p) => fang(p, { veinW: 0.22, gum: 0.08 }),
  });
  return c.done();
}

function budgeMaul(K) {
  const c = K.ctx();
  const T = K.THEMES.budge;
  K.haft(c, T, -14, 62, 2, T.wood, 0);
  scaleGrip(K, c, -12, 26, 2.3, GRIP, GOLD);
  for (const z of [40, 47]) K.ringAt(c, z, 2.3, GOLD, z);
  hornPommel(c, -15, 8);
  // Head: a scaled barrel lying across the haft, belly-gold striking faces.
  for (let z = 52; z <= 80; z++)
    for (let y = -8; y < 8; y++)
      for (let x = -11; x < 11; x++) {
        const ax = Math.abs(x + 0.5) / 11;
        const r = Math.hypot((y + 0.5) / 8, (z - 66) / 14.5);
        if (r > 1) continue;
        const face = ax > 0.86;
        const band = Math.abs(ax - 0.62) < 0.07 || Math.abs(ax - 0.22) < 0.05;
        let col;
        if (face) col = r > 0.82 ? J(GOLD, x, y, z, 308, 0.04) : J(((y + z) & 3) === 0 ? GOLD : GOLD_HI, x, y, z, 309, 0.04);
        else if (band) col = J(GOLD, x, y, z, 310, 0.04);
        else col = scaleCol(P.scaleLo, P.scale, P.scaleHi, x, y, z, 3, 311);
        c.set(x, y, z, col);
      }
  // Teeth ring around each striking face.
  for (const dir of [-1, 1]) {
    for (let a = 0; a < 10; a++) {
      const ang = (a / 10) * Math.PI * 2;
      const py = Math.cos(ang) * 6.5;
      const pz = 66 + Math.sin(ang) * 12;
      teethRow(c, [dir * 11, py, pz], [dir * 11, py, pz], 1, [dir, 0, 0], 3, 1.1, { body: P.tooth, tip: 0xffffff }, 312 + a);
    }
    // A great tusk out of each side, curving up and in.
    horn(c, curve((t) => [dir * (10 + t * 13 - t * t * 4), 0, 62 + t * 16 + t * t * 12], 30), 3.6, 0.7, HORN, { ridges: 8 });
  }
  // Eyes on the flats make the head a dragon's.
  for (const sy of [-1, 1]) for (const dx of [-4, 3]) eyeGem(c, [dx, sy * 7.6, 72], 1.9, P.eye, P.pupil, GOLD);
  // Front horn spike with a vein of ember.
  horn(c, curve((t) => [0, 0, 80 + t * 24], 24), 4.0, 0.6, HORN, { ridges: 6, glow: VEIN });
  return c.done();
}

function budgeSpear(K) {
  const c = K.ctx();
  const T = K.THEMES.budge;
  K.haft(c, T, -30, 104, 2, T.wood, 0);
  spiralGrip(K, c, -6, 30, 2.25, P.hornDark, shade(T.wood, 0.8), GOLD);
  for (const z of [52, 53, 74, 75]) K.ringAt(c, z, 2.2, z & 1 ? GOLD_HI : GOLD, z);
  for (let z = 56; z <= 70; z++) K.rod(c, z, z, 2.3, (x, y, zz) => scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 2, zz, 2, 313));
  horn(c, curve((t) => [0, 0, -30 - t * 9], 9), 2.6, 0.5, HORN);
  // Horn collar: four horns sweeping back down the shaft.
  K.rod(c, 99, 106, 3.4, (x, y, z) => J(z === 102 ? GOLD_HI : GOLD, x, y, z, 314, 0.04));
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2 + Math.PI / 4;
    horn(c, curve((t) => [Math.cos(ang) * (3 + t * 7), Math.sin(ang) * (3 + t * 7), 104 - t * 14 + t * t * 3], 16), 2.2, 0.5, HORN, { ridges: 4 });
  }
  // Fang head, slightly hooked, with a pair of small fang barbs.
  sweep(c, {
    z0: 106, z1: 152,
    right: (t) => 5.6 * Math.sin(Math.PI * Math.min(1, t * 1.25 + 0.08)) ** 0.8 * (1 - t ** 3) + 0.4,
    left: (t) => 5.6 * Math.sin(Math.PI * Math.min(1, t * 1.25 + 0.08)) ** 0.8 * (1 - t ** 2) + 0.4,
    bend: (t) => -3 * t ** 2.5,
    thick: (t) => Math.round(lerp(5, 2, t)),
    paint: (p) => fang(p, { veinW: 0.2, gum: 0.07 }),
  });
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (5 + t * 4), 0, 112 - t * 7], 8), 1.6, 0.5, { root: P.horn, body: P.horn, tip: P.tooth });
  return c.done();
}

function budgeStaff(K) {
  const c = K.ctx();
  const T = K.THEMES.budge;
  K.haft(c, T, -14, 92, 2, T.wood, 0);
  scaleGrip(K, c, -6, 28, 2.2, GRIP, GOLD);
  for (const z of [46, 64, 82]) {
    K.ringAt(c, z, 2.3, GOLD, z);
    for (let k = 1; k <= 4; k++) K.rod(c, z + k, z + k, 2.25, (x, y, zz) => scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 2, zz, 2, 315));
  }
  horn(c, curve((t) => [0, 0, -14 - t * 8], 8), 2.6, 0.5, HORN);
  // Skull crown: a gold brow, two great horns swept back and out, membrane between them.
  // Skull crown: a scaled brow with a toothed jaw, two great horns swept back
  // and out, membrane frills between horn and brow.
  for (let z = 88; z <= 100; z++) {
    const r = 3.6 + Math.sin(((z - 88) / 12) * Math.PI) * 2.6;
    K.rod(c, z, z, r, (x, y, zz) => (z === 88 || z === 100 ? J(GOLD, x, y, zz, 316, 0.04) : scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 6, y + 6, zz, 2, 340)));
  }
  for (const sy of [-1, 1]) eyeGem(c, [0, sy * 5.6, 95], 1.8, P.eye, P.pupil, GOLD);
  for (const dir of [-1, 1]) {
    const hp = curve((t) => [dir * (4 + t * 15 + Math.sin(t * 2.6) * 4), 0, 96 + t * 34 - t * t * 22], 40);
    horn(c, hp, 4.2, 0.7, HORN, { ridges: 10 });
    membrane(c, 98, 118, () => dir * 4, (t) => dir * (5 + Math.sin(t * Math.PI) * 13), 0, { body: P.membrane, edge: P.membraneHi, vein: P.scaleLo }, { vein: 4 });
  }
  teethRow(c, [-4, 0, 100], [4, 0, 100], 5, [0, 0, 1], 4, 1.3, { body: P.tooth, tip: 0xffffff }, 341);
  // Talons cradling the ember orb.
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2 + Math.PI / 4;
    horn(c, curve((t) => [Math.cos(ang) * (4 + Math.sin(t * 2.4) * 8), Math.sin(ang) * (4 + Math.sin(t * 2.4) * 8), 100 + t * 24], 26), 2.2, 0.5, { root: GOLD, body: P.claw, tip: 0xffffff }, { ridges: 3 });
  }
  K.orb(c, 0, 0, 114, 8.5, 0xfff2a0, EMBER, 0xff6a12);
  for (const [x, y, z] of [[-11, 3, 124], [10, -4, 108], [3, 11, 126], [-6, -10, 120], [0, 0, 128], [7, 7, 122]]) K.ball(c, x, y, z, 1.3, z > 120 ? VEIN : EMBER, true);
  return c.done();
}

function budgeWand(K) {
  const c = K.ctx();
  scaleGrip(K, c, -6, 20, 1.8, GRIP, GOLD);
  hornPommel(c, -7, 6);
  K.rod(c, 21, 25, 2.8, (x, y, z) => J(z === 23 ? GOLD_HI : GOLD, x, y, z, 317, 0.04));
  teethRow(c, [-2, 0, 25], [2, 0, 25], 3, [0, 0, 1], 3, 1, { body: P.tooth, tip: 0xffffff }, 318);
  // A whole fang, root to tip, with the vein glowing up its length.
  tube(c, curve((t) => [-Math.round(t * t * 8), 0, 26 + t * 32], 34), (t) => lerp(2.9, 0.9, t), (t, d, x, y, z) => {
    if (d < 0.4 && t > 0.05 && t < 0.9) return { c: z % 6 === 0 ? EMBER : VEIN, g: true };
    return J(t < 0.12 ? P.hornDark : t > 0.85 ? P.tooth : P.horn, x, y, z, 319, 0.03);
  });
  // Membrane frill where the fang leaves the grip.
  for (const dir of [-1, 1]) membrane(c, 26, 40, () => dir * 2, (t) => dir * (3 + Math.sin(t * Math.PI) * 6), 0, { body: P.membrane, edge: P.membraneHi, vein: P.scaleLo }, { vein: 3 });
  K.orb(c, -8, 0, 62, 4.4, 0xfff2a0, EMBER, 0xff6a12);
  for (const [x, y, z] of [[-12, 2, 66], [-4, -3, 67], [-9, -2, 68], [-6, 3, 70]]) K.ball(c, x, y, z, 0.9, z > 67 ? VEIN : EMBER, true);
  return c.done();
}

/** Hide-wrapped bow limbs in green scale, claws hooking back at the tips. */
function budgeShortbow(K) {
  const L = 32;
  return bowShape(K, {
    L,
    grip: 5,
    limb: (a, g) => ({ z: -Math.round(15 * a ** 1.5) + (a > 0.78 ? Math.round(((a - 0.78) / 0.22) ** 1.3 * 7) : 0), hw: g ? 3 : a < 0.6 ? 2.4 : 1.7, dz: g ? 4 : 3 }),
    paint: ({ a, x, y, z, k, grip }) => {
      if (grip) return J(((y >> 1) + k) & 1 ? GOLD : GOLD_HI, x, y, z, 320, 0.04);
      if (Math.abs(y) % 7 === 0) return J(P.hornDark, x, y, z, 321, 0.04);
      return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z, y, 2, 322);
    },
    tips: (c, dir, y, z) => {
      horn(c, curve((t) => [0, y + dir * (t * 7), z + 2 - t * 2 + t * t * 7], 10), 1.9, 0.5, { root: P.claw, body: P.claw, tip: 0xffffff });
    },
    decor: (c) => {
      // A fang lashed to the riser, pointing at the target.
      horn(c, curve((t) => [0, 1, 3 + t * 9], 9), 2, 0.5, HORN, { ridges: 3 });
      eyeGem(c, [0, -3, 2], 1.4, P.eye, P.pupil, null);
    },
    string: { color: 0xe8e0c8 },
  });
}

/** Long ridged horn limbs with green membrane fins along their backs. */
function budgeLongbow(K) {
  const L = 42;
  return bowShape(K, {
    L,
    grip: 6,
    limb: (a, g) => ({ z: -Math.round(20 * a ** 1.6) + (a > 0.8 ? Math.round(((a - 0.8) / 0.2) ** 1.4 * 8) : 0), hw: g ? 3 : a < 0.5 ? 2.5 : a < 0.85 ? 2 : 1.4, dz: g ? 4 : a < 0.7 ? 4 : 3 }),
    paint: ({ a, x, y, z, k, grip }) => {
      if (grip) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z, y, 2, 323);
      const ridge = Math.floor(Math.abs(y) / 3) % 3 === 0;
      return J(a < 0.2 ? P.hornDark : ridge ? shade(P.horn, 0.84) : k === 0 ? shade(P.horn, 0.95) : P.horn, x, y, z, 324, 0.035);
    },
    tips: (c, dir, y, z) => {
      horn(c, curve((t) => [0, y + dir * (1 + t * 8), z + 1 - t * 3 + t * t * 8], 11), 2.2, 0.5, { root: P.claw, body: P.claw, tip: 0xffffff });
    },
    decor: (c) => {
      // Membrane fins on the back of each limb, veined like the wings.
      for (const dir of [-1, 1]) {
        for (let k = 7; k <= 30; k++) {
          const a = k / L;
          const zc = -Math.round(20 * a ** 1.6);
          const h = Math.round(Math.sin(((k - 7) / 23) * Math.PI) * 6);
          for (let q = 1; q <= h; q++) c.set(0, dir * k, zc + 2 + q, q === h ? P.membraneHi : (k % 5 === 0 ? P.scaleLo : J(P.membrane, k, q, dir, 325, 0.05)));
        }
      }
      for (let z = 1; z <= 4; z++) for (const x of [-2, 1]) c.set(x, 2, z, GOLD);
      eyeGem(c, [0, 0, 3], 1.6, P.eye, P.pupil, GOLD);
      for (const y of [-5, 4]) c.set(0, y, 2, VEIN, true);
    },
    string: { color: 0xe8e0c8 },
  });
}

/** Scale-plated stock, a recurved horn prod, a claw trigger and a jawed nose. */
function budgeCrossbow(K) {
  return crossbowShape(K, {
    span: 23,
    stock: (x, y, z, pistol) => {
      if (pistol) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 10, z, 2, 326);
      if (y === 2 && z > 14 && z % 8 === 0) return J(GOLD, x, y, z, 327, 0.04);
      if (z < 14) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 4, z, 2, 328);
      return y >= 1 ? scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 4, z, 3, 329) : J(shade(P.bellyDark, 0.9), x, y, z, 330, 0.04);
    },
    prod: (a) => ({ z: 60 - 9 * a ** 1.6 + (a > 0.84 ? ((a - 0.84) / 0.16) ** 1.3 * 6 : 0), th: a < 0.2 ? 6 : a < 0.7 ? 5 : 3 }),
    prodPaint: ({ a, x, y, z }) => (a > 0.92 ? J(P.tooth, x, y, z, 331, 0.02) : Math.floor(Math.abs(x) / 3) % 3 === 0 ? J(shade(P.horn, 0.84), x, y, z, 332, 0.03) : J(a < 0.2 ? P.hornDark : P.horn, x, y, z, 333, 0.03)),
    stringCol: 0xe8e0c8,
    rail: (c) => {
      for (let z = 22; z <= 66; z++) {
        c.set(-1, 3, z, z % 6 === 0 ? EMBER : VEIN, true);
        c.set(-2, 3, z, J(GOLD, z, 0, 0, 334, 0.04));
        c.set(0, 3, z, J(GOLD, z, 1, 0, 335, 0.04));
      }
    },
    decor: (c) => {
      // Jawed nose around the prod mount, with eyes either side.
      for (let x = -5; x <= 4; x++) for (let y = -3; y <= 3; y++) for (let z = 56; z <= 64; z++) {
        if (y < -1 && Math.abs(x + 0.5) > 2.6) continue;
        c.set(x, y, z, Math.abs(x + 0.5) > 3.6 ? J(GOLD, x, y, z, 336, 0.04) : scaleCol(P.scaleLo, P.scale, P.scaleHi, x, y, z, 2, 337));
      }
      teethRow(c, [-4, 0, 65], [3, 0, 65], 5, [0, 0, 1], 4, 1.2, { body: P.tooth, tip: 0xffffff }, 338);
      for (const sx of [-1, 1]) {
        eyeGem(c, [sx * 5.2, 2, 61], 1.7, P.eye, P.pupil, GOLD);
        // Brow horns sweeping back over the stock.
        horn(c, curve((t) => [sx * (4 + t * 3), 3 + t * 5, 60 - t * 16], 18), 2.2, 0.5, HORN, { ridges: 5 });
        // Membrane fins along the stock.
        for (let z = 18; z <= 44; z++) {
          const h = Math.round(Math.sin(((z - 18) / 26) * Math.PI) * 5);
          for (let q = 1; q <= h; q++) c.set(sx < 0 ? -2 - q : 1 + q, 0, z, q === h ? P.membraneHi : z % 5 === 0 ? P.scaleLo : J(P.membrane, z, q, sx, 342, 0.05));
        }
      }
      // Claw trigger.
      horn(c, curve((t) => [0, -4 - t * 4, 12 - t * 3], 5), 1.3, 0.4, { root: P.claw, body: P.claw, tip: 0xffffff });
      // Horn butt cap.
      horn(c, curve((t) => [0, -1 - t * 2, -11 - t * 5], 6), 3.4, 1.4, HORN, { ridges: 3 });
    },
  });
}

export function budgeWeapons(K) {
  return {
    budgeblade: () => budgeBlade(K),
    budgegreatsword: () => budgeGreatsword(K),
    budgedual: () => budgeDual(K),
    budgemaul: () => budgeMaul(K),
    budgespear: () => budgeSpear(K),
    budgestaff: () => budgeStaff(K),
    budgewand: () => budgeWand(K),
    budgeshortbow: () => budgeShortbow(K),
    budgebow: () => budgeLongbow(K),
    budgecrossbow: () => budgeCrossbow(K),
  };
}

