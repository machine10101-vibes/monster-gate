/**
 * Darksycle dragon weapons: sickle-curved bone blades with dark dusk-scale
 * spines, violet runes that burn along them, bat-wing guards with finger
 * bones, and gloom-core crystals at their hearts. Everything crescents.
 */
import { DARK as P } from '../data/darksycle.js';
import { J, lerp, shade, mix, sweep, curve, horn, crystal, eyeGem, scaleCol, scaleGrip, bowShape, crossbowShape, pathBlade, batWing, rune } from './monsterKit.js';

const GRIP = [P.scaleLo, P.scale, P.scaleHi];
const TRIM = P.trim;
const GEM = { core: P.glowHi, mid: P.glow, skin: P.belly };
const WING = { body: P.membrane, edge: P.membraneHi, vein: shade(P.glow, 0.7), bone: P.bladeDark, claw: P.claw };
const HORN = { root: P.scale, body: P.bladeDark, tip: P.edge };
const BONE = mix(mix(P.blade, P.belly, 0.32), P.bladeDark, 0.2);

/**
 * Bone blade: dark scaled spine, lilac bone body, a violet light line running
 * one voxel inside the edge, bright edge. Spine side = side < 0 unless flip.
 */
function duskBone(p, o = {}) {
  const { spineSide = -1, spineW = 0.45, glowLine = true, runeEvery = 0 } = o;
  const { u, ed, x, y, z, side, top, bot } = p;
  const spine = side === spineSide && u > 1 - spineW;
  if (ed < 1.1 && !spine) return J(P.edge, x, y, z, 400, 0.02);
  if (glowLine && !spine && ed < 2.1 && (top || bot)) return { c: P.glow, g: true };
  if (spine) {
    if (runeEvery && (top || bot) && z % runeEvery === 0) return { c: P.glowHi, g: true };
    return scaleCol(P.scaleLo, P.scale, P.scaleHi, x, y, z, 2, 401);
  }
  return J(shade(mix(BONE, mix(P.blade, P.belly, 0.15), u), top ? 1.04 : 0.88), x, y, z, 402, 0.03);
}

function crescentPommel(K, c, z) {
  K.ball(c, 0, 0, z, 2.6, (x, y, zz) => J(TRIM, x, y, zz, 403, 0.04));
  pathBlade(c, { x0: 0, z0: z - 1, a0: Math.PI * 0.8, len: 10, turn: -1.9, side: -1, thick: 2, width: (f) => 2.6 * Math.sin(Math.PI * f) + 0.3, paint: (p) => duskBone(p, { glowLine: false }) });
  crystal(c, [0, 0, z - 4], [0, 0, 1], 3, 1.6, GEM);
}

function duskSword(K) {
  const c = K.ctx();
  scaleGrip(K, c, -6, 10, 2.1, GRIP, TRIM);
  crescentPommel(K, c, -8);
  // Bat-wing guard sweeping toward the blade.
  K.rod(c, 10, 14, 3.3, (x, y, z) => J(z === 12 ? P.belly : TRIM, x, y, z, 404, 0.04));
  for (const dir of [-1, 1]) batWing(c, [dir * 2, 11], [[dir * 0.55, 13], [dir * 1.05, 15], [dir * 1.55, 12], [dir * 2.1, 8]], WING);
  for (const sy of [-1, 1]) eyeGem(c, [0, sy * 2.6, 12], 1.7, P.eye, P.pupil, TRIM);
  sweep(c, {
    z0: 15, z1: 96,
    right: (t) => 5.4 * (1 - t ** 2.2) + 0.4,
    left: (t) => 2.6 * (1 - t ** 1.4) + 0.3,
    bend: (t) => 12 * t ** 2.1,
    thick: (t) => Math.round(lerp(5, 2, t)),
    paint: (p) => duskBone(p, { runeEvery: 6 }),
  });
  for (let z = 22; z <= 78; z += 11) rune(c, Math.round(12 * ((z - 15) / 81) ** 2.1) - 1, 3, z, P.glow, z);
  return c.done();
}

function duskGreatsword(K) {
  const c = K.ctx();
  scaleGrip(K, c, -10, 28, 2.4, GRIP, TRIM);
  K.ringAt(c, 9, 2.4, P.belly, 5);
  crescentPommel(K, c, -12);
  // Crescent-moon guard: two horn blades curving up toward the blade.
  K.rod(c, 28, 33, 3.6, (x, y, z) => J(z === 30 ? P.belly : TRIM, x, y, z, 405, 0.04));
  for (const dir of [-1, 1]) pathBlade(c, { x0: dir * 3, z0: 31, a0: dir * 1.6, len: 20, turn: -dir * 1.7, side: -dir, thick: 3, width: (f) => 3.6 * Math.sin(Math.PI * f) ** 0.8 + 0.4, paint: (p) => duskBone(p) });
  crystal(c, [0, 0, 31], [0, 0, 1], 4.5, 2.6, GEM);
  const notchT = 0.58;
  const z0 = 35;
  const z1 = 126;
  const bend = (t) => 2 * t + (t > notchT ? 30 * ((t - notchT) / (1 - notchT)) ** 2.1 : 0);
  const left = (t) => (t < 0.86 ? 6.2 : 6.2 * (1 - ((t - 0.86) / 0.14) ** 1.1)) + 0.3;
  const nz = z0 + notchT * (z1 - z0);
  const nx = bend(notchT) - left(notchT);
  sweep(c, {
    z0, z1,
    right: (t) => (t < 0.8 ? 8 : 8 * (1 - ((t - 0.8) / 0.2) ** 1.3)) + 0.3,
    left,
    bend,
    thick: (t) => Math.round(lerp(7, 3, t)),
    paint: (p) => {
      const d = Math.hypot(p.x + 0.5 - nx, p.z + 0.5 - nz);
      if (d < 3.8) return null;
      if (d < 5) return { c: d < 4.4 ? P.glowHi : P.glow, g: true };
      return duskBone(p, { spineW: 0.32, runeEvery: 7 });
    },
    teeth: [{ side: -1, from: 0.08, to: 0.5, every: 9, len: 5, base: 4, col: P.scaleHi, tip: P.edge, rake: 1 }],
  });
  return c.done();
}

function duskDual(K) {
  const c = K.ctx();
  scaleGrip(K, c, -4, 8, 1.8, GRIP, TRIM);
  K.ball(c, 0, 0, -6, 2.2, (x, y, z) => J(TRIM, x, y, z, 406, 0.04));
  crystal(c, [0, 0, -8], [0, 0, 1], 2.6, 1.4, GEM);
  K.rod(c, 9, 11, 3, (x, y, z) => J(TRIM, x, y, z, 407, 0.04));
  // Counter-hook at the base, then the main crescent sweeping around.
  pathBlade(c, { x0: 0, z0: 10, a0: -1.4, len: 9, turn: 1.2, side: 1, thick: 2, width: (f) => 2.4 * Math.sin(Math.PI * f) + 0.3, paint: (p) => duskBone(p, { glowLine: false }) });
  pathBlade(c, {
    x0: 0, z0: 11, a0: -0.15, len: 60, turn: 2.35, side: -1,
    thick: (f) => Math.round(lerp(4, 2, f)),
    width: (f) => 6.4 * Math.sin(Math.PI * Math.min(1, f * 1.08 + 0.04)) ** 0.7 * (1 - f ** 4) + 0.5,
    paint: (p) => duskBone(p, { spineSide: 1, glowLine: true }),
  });
  for (const sy of [-1, 1]) eyeGem(c, [0, sy * 2.2, 10], 1.3, P.eye, P.pupil, null);
  return c.done();
}

function duskHammer(K) {
  const c = K.ctx();
  const T = K.THEMES.dark;
  K.haft(c, T, -14, 62, 2, T.wrapLo, 0);
  scaleGrip(K, c, -12, 26, 2.3, GRIP, TRIM);
  for (const z of [40, 46]) K.ringAt(c, z, 2.3, TRIM, z);
  crescentPommel(K, c, -15);
  // Dusk-scale head with a caged window on each face showing the gloom core.
  for (let z = 52; z <= 80; z++)
    for (let y = -7; y < 7; y++)
      for (let x = -8; x < 8; x++) {
        const ax = Math.abs(x + 0.5) / 8;
        const ay = Math.abs(y + 0.5) / 7;
        if (ax ** 3 + ay ** 3 > 1.02) continue;
        const win = Math.abs(x + 0.5) < 4 && Math.abs(z - 66) < 7 && ay > 0.55;
        if (win && (Math.abs(x + 0.5) > 1.4 || (z - 66) % 3)) continue;
        const band = z <= 54 || z >= 78 || Math.abs(z - 66) === 8;
        c.set(x, y, z, band ? J((x + y) % 3 === 0 ? P.belly : TRIM, x, y, z, 408, 0.04) : scaleCol(P.scaleLo, P.scale, P.scaleHi, x, y + z, z, 2, 409));
      }
  crystal(c, [0, 0, 66], [0, 0, 1], 7, 4.2, GEM);
  // A crescent blade spike on both faces.
  for (const dir of [-1, 1]) {
    pathBlade(c, {
      x0: dir * 7, z0: 51, a0: 0, len: 30, turn: 0, side: dir, thick: (f) => Math.round(lerp(4, 3, Math.abs(f - 0.5) * 2)),
      width: (f) => 12 * Math.sin(Math.PI * f) ** 0.55 + (f > 0.86 ? (f - 0.86) * 40 : 0) + (f < 0.12 ? (0.12 - f) * 30 : 0),
      paint: (p) => duskBone(p, { spineSide: 0, glowLine: true }),
    });
    for (let z = 58; z <= 74; z += 8) rune(c, dir * 12, 2, z, P.glow, z + dir);
  }
  // Horn spike on top.
  horn(c, curve((t) => [Math.sin(t * 2) * 2, 0, 80 + t * 20], 20), 3.4, 0.6, HORN, { ridges: 6, glow: P.glow });
  return c.done();
}

function duskSpear(K) {
  const c = K.ctx();
  const T = K.THEMES.dark;
  K.haft(c, T, -30, 104, 2, P.scaleLo, 0);
  scaleGrip(K, c, -6, 30, 2.25, GRIP, TRIM);
  for (const z of [52, 74]) K.ringAt(c, z, 2.3, TRIM, z);
  horn(c, curve((t) => [0, 0, -30 - t * 8], 8), 2.4, 0.6, HORN);
  K.rod(c, 98, 106, 3.6, (x, y, z) => J(z === 102 ? P.belly : TRIM, x, y, z, 410, 0.04));
  crystal(c, [0, 0, 102], [1, 0, 0], 6, 2.4, GEM);
  // Central blade flanked by two crescent horns curving out and up.
  sweep(c, {
    z0: 106, z1: 152,
    right: (t) => 4.6 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.1)) ** 0.8 * (1 - t ** 3) + 0.4,
    left: (t) => 4.6 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.1)) ** 0.8 * (1 - t ** 3) + 0.4,
    thick: (t) => Math.round(lerp(5, 2, t)),
    paint: (p) => duskBone(p, { spineSide: 0, glowLine: true }),
  });
  for (const dir of [-1, 1]) pathBlade(c, { x0: dir * 3, z0: 105, a0: dir * 1.25, len: 26, turn: -dir * 1.6, side: dir, thick: 3, width: (f) => 4.2 * Math.sin(Math.PI * f) ** 0.7 + 0.3, paint: (p) => duskBone(p, { spineSide: 0 }) });
  // Membrane pennant trailing from the collar.
  batWing(c, [-3, 98], [[-2.3, 10], [-2.75, 18], [-3.05, 24]], WING, 0, 411);
  return c.done();
}

function duskStaff(K) {
  const c = K.ctx();
  const T = K.THEMES.dark;
  K.haft(c, T, -14, 90, 2, P.scaleLo, 0);
  scaleGrip(K, c, -6, 24, 2.2, GRIP, TRIM);
  for (const z of [40, 58, 76]) {
    K.ringAt(c, z, 2.3, TRIM, z);
    rune(c, 0, 3, z + 5, P.glow, z);
  }
  crescentPommel(K, c, -15);
  K.rod(c, 86, 94, 3.8, (x, y, z) => J(z === 90 ? P.belly : TRIM, x, y, z, 412, 0.04));
  // Two great sickles rising around the crystal, tips nearly meeting overhead.
  for (const dir of [-1, 1]) {
    pathBlade(c, {
      x0: dir * 3, z0: 92, a0: dir * 0.95, len: 46, turn: -dir * 2.5, side: -dir,
      thick: (f) => Math.round(lerp(4, 2, f)),
      width: (f) => 5 * Math.sin(Math.PI * Math.min(1, f + 0.06)) ** 0.6 * (1 - f ** 3) + 0.4,
      paint: (p) => duskBone(p, { spineSide: dir, runeEvery: 5 }),
    });
  }
  crystal(c, [0, 0, 112], [0, 0, 1], 12, 6.2, GEM, { sides: 6 });
  for (let a = 0; a < 5; a++) {
    const ang = a * 1.257 + 0.3;
    crystal(c, [Math.cos(ang) * 11, Math.sin(ang) * 11, 110 + Math.sin(a * 2.1) * 6], [Math.cos(ang) * 0.3, Math.sin(ang) * 0.3, 1], 3.2, 1.4, GEM);
  }
  return c.done();
}

function duskWand(K) {
  const c = K.ctx();
  scaleGrip(K, c, -6, 20, 1.8, GRIP, TRIM);
  crescentPommel(K, c, -8);
  K.rod(c, 21, 25, 2.8, (x, y, z) => J(z === 23 ? P.belly : TRIM, x, y, z, 413, 0.04));
  // Three dusk claws clasping a long shard of gloom core.
  for (let a = 0; a < 3; a++) {
    const ang = a * 2.094 + 0.4;
    horn(c, curve((t) => [Math.cos(ang) * (2.5 + Math.sin(t * 2.6) * 4.5), Math.sin(ang) * (2.5 + Math.sin(t * 2.6) * 4.5), 24 + t * 18], 20), 1.7, 0.5, { root: TRIM, body: P.claw, tip: P.edge }, { ridges: 3 });
  }
  crystal(c, [0, 0, 44], [0.12, 0, 1], 17, 4, GEM, { sides: 6 });
  for (const [x, y, z, l] of [[-7, 2, 56, 2.4], [6, -3, 50, 2], [2, 6, 60, 1.8]]) crystal(c, [x, y, z], [x * 0.1, y * 0.1, 1], l, 1.1, GEM);
  return c.done();
}

/** Compact horn bow whose limbs are crescent blades. */
function duskShortbow(K) {
  const L = 32;
  return bowShape(K, {
    L,
    grip: 5,
    limb: (a, g) => ({ z: -Math.round(14 * a ** 1.5) + (a > 0.74 ? Math.round(((a - 0.74) / 0.26) ** 1.2 * 9) : 0), hw: g ? 3 : 1.8, dz: g ? 4 : a < 0.85 ? Math.round(7 * Math.sin(Math.PI * Math.min(1, a * 1.1)) ** 0.6) + 2 : 2 }),
    paint: ({ a, x, y, z, k, dz, grip }) => {
      if (grip) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z + 4, y, 2, 414);
      if (k === dz - 1) return J(P.edge, x, y, z, 415, 0.02);
      if (k === dz - 2 && dz > 4) return { c: P.glow, g: true };
      if (k === 0) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z + 4, y, 2, 416);
      return J(mix(BONE, P.blade, a), x, y, z, 417, 0.03);
    },
    tips: (c, dir, y, z) => {
      pathBlade(c, { x0: 0, z0: z + 1, a0: 0.3 * dir, len: 7, turn: 0, side: 1, thick: 2, width: () => 0.6, paint: () => P.edge });
      void y;
    },
    decor: (c) => {
      crystal(c, [0, 0, 4], [0, 0, 1], 3, 1.8, GEM);
      for (const y of [-4, 3]) c.set(-2, y, 2, P.belly);
    },
    string: { color: P.glow, glow: true },
  });
}

/** Scythe-horn limbs with membrane webs spread between limb and riser. */
function duskLongbow(K) {
  const L = 44;
  const limbZ = (a) => -Math.round(22 * a ** 1.6) + (a > 0.8 ? Math.round(((a - 0.8) / 0.2) ** 1.3 * 9) : 0);
  return bowShape(K, {
    L,
    grip: 6,
    limb: (a, g) => ({ z: limbZ(a), hw: g ? 3 : a < 0.6 ? 2.2 : 1.6, dz: g ? 4 : a < 0.85 ? 4 : 3 }),
    paint: ({ a, x, y, z, k, dz, grip }) => {
      if (grip) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z + 4, y, 2, 418);
      if (k === dz - 1) return a > 0.2 ? J(P.edge, x, y, z, 419, 0.02) : J(TRIM, x, y, z, 419, 0.03);
      return k === 0 ? scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z + 4, y, 2, 420) : J(mix(BONE, P.blade, a), x, y, z, 421, 0.03);
    },
    tips: (c, dir, y, z) => {
      horn(c, curve((t) => [0, y + dir * (1 + t * 7), z + 2 + t * 6 - t * t * 2], 9), 1.9, 0.5, { root: P.bladeDark, body: P.blade, tip: P.edge });
    },
    decor: (c) => {
      // Wing webs on the belly side, with finger bones and scalloped edges.
      for (const dir of [-1, 1]) {
        for (let k = 6; k <= 32; k++) {
          const a = k / L;
          const zc = limbZ(a) + 2;
          const reach = Math.round(Math.sin(((k - 6) / 26) * Math.PI) * 9 - (k % 8 < 4 ? 0 : 2));
          for (let q = 1; q <= reach; q++) {
            const bone = k % 8 === 2;
            c.set(0, dir * k, zc + q, bone ? P.bladeDark : q === reach ? P.membraneHi : J(P.membrane, k, q, dir, 422, 0.05));
          }
        }
      }
      crystal(c, [0, 0, 5], [0, 0, 1], 3.5, 2, GEM);
      for (const sy of [-1, 1]) eyeGem(c, [0, sy * 5, 2], 1.2, P.eye, P.pupil, null);
    },
    string: { color: P.glow, glow: true },
  });
}

/** Dusk-scale stock, scythe-bladed prod arms, a rune-lit rail and a crystal heart. */
function duskCrossbow(K) {
  return crossbowShape(K, {
    span: 26,
    stock: (x, y, z, pistol) => {
      if (pistol) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 10, z, 2, 423);
      if (y === 2 && z > 14 && z % 9 === 0) return J(TRIM, x, y, z, 424, 0.04);
      return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 4, z, 2, 425);
    },
    prod: (a) => ({ z: 60 - 8 * a ** 1.7, th: a < 0.2 ? 5 : a < 0.75 ? 4 : 3 }),
    prodPaint: ({ a, x, y, z, q }) => (q === 2 ? J(P.edge, x, y, z, 426, 0.02) : q === 1 && a > 0.2 && a < 0.8 && x % 3 === 0 ? { c: P.glow, g: true } : J(a < 0.2 ? TRIM : BONE, x, y, z, 427, 0.03)),
    stringCol: P.glow,
    stringGlow: true,
    rail: (c) => {
      for (let z = 22; z <= 66; z++) {
        c.set(-1, 3, z, J(P.scaleHi, z, 0, 0, 428, 0.04));
        c.set(0, 3, z, J(P.scaleHi, z, 1, 0, 429, 0.04));
      }
      for (let z = 26; z <= 58; z += 8) rune(c, -2, 2, z, P.glow, z);
    },
    decor: (c) => {
      for (let x = -5; x <= 4; x++) for (let y = -3; y <= 3; y++) for (let z = 57; z <= 63; z++) {
        if (y < -1 && Math.abs(x + 0.5) > 2.6) continue;
        c.set(x, y, z, Math.abs(x + 0.5) > 3.5 ? J(TRIM, x, y, z, 430, 0.04) : scaleCol(P.scaleLo, P.scale, P.scaleHi, x, y, z, 2, 431));
      }
      crystal(c, [0, 4, 60], [0, 1, 0], 4, 2.4, GEM);
      // Scythe blades hooked forward off each prod tip.
      for (const dir of [-1, 1]) pathBlade(c, { x0: dir * 25, z0: 52, a0: -dir * 0.3, len: 18, turn: dir * 1.4, side: dir, thick: 3, width: (f) => 3.8 * Math.sin(Math.PI * f) ** 0.7 + 0.3, paint: (p) => duskBone(p, { spineSide: 0 }) });
      horn(c, curve((t) => [0, 0, -11 - t * 5], 5), 3.2, 1.6, HORN, { ridges: 2 });
    },
  });
}

function duskScythe(K) {
  const c = K.ctx();
  const T = K.THEMES.dark;
  K.haft(c, T, -14, 90, 2, P.scaleLo, 0);
  scaleGrip(K, c, -10, 22, 2.2, GRIP, TRIM);
  scaleGrip(K, c, 40, 54, 2.2, GRIP, TRIM);
  for (const z of [30, 64, 76]) rune(c, 0, 3, z, P.glow, z);
  crescentPommel(K, c, -15);
  // Socket with the gloom crystal where blade meets shaft.
  K.rod(c, 84, 96, 3.6, (x, y, z) => J(z === 90 ? P.belly : TRIM, x, y, z, 432, 0.04));
  crystal(c, [0, 0, 98], [0, 0, 1], 5, 3.2, GEM);
  pathBlade(c, {
    x0: -2, z0: 93, a0: -1.25, len: 60, turn: -1.5, side: -1,
    thick: (f) => Math.round(lerp(5, 2, f)),
    width: (f) => 14 * (1 - f ** 1.2) + 0.6,
    paint: (p) => duskBone(p, { spineSide: 2, spineW: 0, runeEvery: 0 }) ,
  });
  // Dark spine ridge and runes along the back of the blade.
  pathBlade(c, { x0: -2, z0: 93, a0: -1.25, len: 60, turn: -1.5, side: 1, thick: 4, width: () => 1.2, paint: (p) => (p.f > 0.08 && p.f < 0.8 && Math.round(p.f * 60) % 7 === 0 && (p.top || p.bot) ? { c: P.glowHi, g: true } : scaleCol(P.scaleLo, P.scale, P.scaleHi, p.x, p.y, p.z, 2, 433)) });
  batWing(c, [2, 92], [[0.9, 10], [1.5, 16], [2.1, 13]], WING, 0, 434);
  return c.done();
}

export function duskWeapons(K) {
  return {
    darksword: () => duskSword(K),
    darkgreatsword: () => duskGreatsword(K),
    darkdual: () => duskDual(K),
    darkhammer: () => duskHammer(K),
    darkspear: () => duskSpear(K),
    darkstaff: () => duskStaff(K),
    darkwand: () => duskWand(K),
    darkshortbow: () => duskShortbow(K),
    darkbow: () => duskLongbow(K),
    darkcrossbow: () => duskCrossbow(K),
    darkscythe: () => duskScythe(K),
  };
}


