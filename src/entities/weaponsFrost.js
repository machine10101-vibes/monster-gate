/**
 * Snow Yeti weapons: faceted glacier ice with a cold light in its core,
 * cream yeti fangs, great blue claws, shaggy rime fur and hide lashings.
 * Everything is crusted with frost.
 */
import { YETI as P } from '../data/yeti.js';
import { J, lerp, shade, mix, hash3, sweep, curve, horn, crystal, furRing, bowShape, crossbowShape, pathBlade, rime, spiralGrip } from './monsterKit.js';

const FUR = [P.furLo, P.fur, P.furHi, P.furWhite];
const ICE = { core: P.glowHi, mid: P.glow, skin: P.ice };
const CLAW = { root: P.clawDark, body: P.claw, tip: P.clawTip };
const FANG = { root: P.fangLo, body: P.fang, tip: 0xffffff };

/** Faceted glacier ice: flat facets of deep, mid and pale ice with a glowing core seam. */
function ice(p, o = {}) {
  const { core = 0.14, seed = 500 } = o;
  const { u, ed, x, y, z, top, bot, t } = p;
  if (ed < 1.1) return J(P.iceHi, x, y, z, seed, 0.02);
  if (u < core && (top || bot) && t > 0.05 && t < 0.9) return { c: z % 5 === 0 ? P.glowHi : P.glow, g: true };
  // Large slanted facets, mostly mid ice with a few deep and pale planes.
  const facet = hash3(Math.floor((x + 40 + z * 0.35) / 5), Math.floor((z - x * 0.4) / 9), y > 0 ? 1 : 0, seed + 1);
  const base = facet < 0.18 ? mix(P.iceDeep, P.ice, 0.4) : facet < 0.8 ? P.ice : mix(P.ice, P.iceHi, 0.6);
  return J(shade(base, top ? 1.04 : 0.9), x, y, z, seed + 2, 0.03);
}

/** Cream yeti fang with a pale edge. */
function fangPaint(p) {
  const { ed, x, y, z, t, top } = p;
  if (ed < 1.15) return J(0xffffff, x, y, z, 501, 0.02);
  return J(shade(mix(P.fangLo, P.fang, Math.min(1, t * 1.6)), top ? 1.04 : 0.9), x, y, z, 502, 0.03);
}

/** Grip in hide with a shaggy fur cuff at the top. */
function furGrip(K, c, z0, z1, r, cuff = true) {
  spiralGrip(K, c, z0, z1, r, P.leather, P.leatherLo, P.trimLo);
  if (cuff) furRing(c, z1 + 1, r + 0.6, 4, FUR, 503 + z1, 1.1, 0.6);
}

function clawPommel(c, z) {
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (1 + t * 3), 0, z - t * 6 + t * t * 2], 7), 1.8, 0.5, CLAW, { ridges: 3 });
  crystal(c, [0, 0, z - 2], [0, 0, 1], 3, 1.6, ICE);
}

/** Frost crystals growing along a line of voxels (a spine or an edge). */
function crust(c, pts, every, size, seed = 504) {
  pts.forEach(([x, y, z], i) => {
    if (i % every) return;
    const h = hash3(x, y, z, seed);
    crystal(c, [x, y, z], [h - 0.5, 1, (h - 0.5) * 0.6], size * (0.7 + h * 0.6), size * 0.42, ICE);
  });
}

function frostSword(K) {
  const c = K.ctx();
  furGrip(K, c, -6, 9, 2.1);
  clawPommel(c, -7);
  // Claw-hooked guard: two claws curling toward the blade, one hooking back as a knuckle bow.
  K.rod(c, 10, 13, 3.2, (x, y, z) => J(z === 11 ? P.trim : P.trimLo, x, y, z, 505, 0.04));
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (3 + t * 7 - t * t * 3), 0, 12 + t * 7 + t * t * 5], 14), 2.4, 0.6, CLAW, { ridges: 4 });
  horn(c, curve((t) => [-3 - Math.sin(t * Math.PI) * 5, 0, 11 - t * 18], 20), 1.5, 0.7, CLAW, { ridges: 2 });
  const bend = (t) => 9 * t ** 2;
  sweep(c, {
    z0: 15, z1: 95,
    right: (t) => 5.5 * (1 - t ** 2.1) + 0.4,
    left: (t) => 3.2 * (1 - t ** 1.4) + 0.3,
    bend,
    thick: (t) => Math.round(lerp(5, 2, t)),
    paint: (p) => (p.side < 0 && p.u > 0.55 ? J(mix(P.iceHi, P.furWhite, 0.5), p.x, p.y, p.z, 506, 0.03) : fangPaint(p)),
  });
  // Rime along the spine.
  crust(c, curve((t) => [Math.round(bend(t) - 3.2 * (1 - t ** 1.4)), 2, 18 + t * 64], 64), 7, 3.2, 507);
  return c.done();
}

function frostGreatsword(K) {
  const c = K.ctx();
  furGrip(K, c, -10, 27, 2.4);
  clawPommel(c, -11);
  K.rod(c, 28, 33, 3.8, (x, y, z) => J(z === 30 ? P.trim : P.trimLo, x, y, z, 508, 0.04));
  // Claw quillons, big and hooked.
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (3 + t * 13 - t * t * 2), 0, 31 + t * 6 + t * t * 9], 20), 3.2, 0.6, CLAW, { ridges: 5 });
  // A slab of glacier ice with a serrated fang edge.
  sweep(c, {
    z0: 34, z1: 124,
    right: (t) => (t < 0.8 ? 8 : 8 * (1 - ((t - 0.8) / 0.2) ** 1.2)) + 0.3,
    left: (t) => (t < 0.7 ? 8 : 8 * (1 - ((t - 0.7) / 0.3) ** 0.9)) + 0.3,
    bend: (t) => -2 * t,
    thick: (t) => Math.round(lerp(8, 3, t)),
    paint: (p) => ice(p, { core: 0.1 }),
    teeth: [{ side: 1, from: 0.06, to: 0.78, every: 5, len: 4, base: 3, col: P.fang, tip: 0xffffff, rake: 0.7 }],
  });
  rime(c, (x, y, z, col) => z > 36 && z < 112 && col !== P.fang, [P.furWhite, P.iceHi], { chance: 0.06, seed: 509 });
  return c.done();
}

function frostDual(K) {
  const c = K.ctx();
  furGrip(K, c, -4, 8, 1.8);
  clawPommel(c, -5);
  K.rod(c, 9, 11, 3, (x, y, z) => J(P.trimLo, x, y, z, 510, 0.04));
  const end = pathBlade(c, {
    x0: 0, z0: 11, a0: -0.1, len: 56, turn: 1.5, side: -1,
    thick: (f) => Math.round(lerp(4, 2, f)),
    width: (f) => 5 * Math.sin(Math.PI * Math.min(1, f * 1.1 + 0.05)) ** 0.7 * (1 - f ** 3) + 0.5,
    paint: fangPaint,
  });
  void end;
  // Frost crusting the back of the hook.
  const spine = [];
  let x = 0;
  let z = 11;
  let a = -0.1;
  for (let s = 0; s < 46; s += 1) {
    spine.push([Math.round(x + 1), 1, Math.round(z)]);
    x += Math.sin(a);
    z += Math.cos(a);
    a += 1.5 / 56;
  }
  crust(c, spine, 5, 3, 511);
  return c.done();
}

function frostHammer(K) {
  const c = K.ctx();
  K.haft(c, K.THEMES.frost, -14, 60, 2, P.leather, 0);
  spiralGrip(K, c, -12, 26, 2.3, P.leather, P.leatherLo, P.trimLo);
  furRing(c, 27, 2.8, 4, FUR, 512, 1.1, 0.5);
  clawPommel(c, -15);
  // Packed rime fur and ice: a lumpy boulder.
  for (let z = 48; z <= 86; z++)
    for (let y = -11; y <= 11; y++)
      for (let x = -12; x <= 12; x++) {
        const nx = (x + 0.5) / 11.5;
        const ny = (y + 0.5) / 10;
        const nz = (z - 67) / 17;
        const n = 0.82 + 0.3 * (hash3(Math.floor(x / 3), Math.floor(y / 3), Math.floor(z / 3), 513) - 0.5);
        if (nx * nx + ny * ny + nz * nz > n) continue;
        const h = hash3(x >> 1, y >> 1, z >> 1, 514);
        const col = h < 0.18 ? P.ice : h < 0.26 ? P.iceDeep : FUR[Math.floor(hash3(x, y, z, 515) * 4)];
        c.set(x, y, z, J(col, x, y, z, 516, 0.05));
      }
  // Frost spikes on every face.
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0.7, 0.7, 0.3], [-0.7, 0.7, -0.3], [0.7, -0.7, -0.3], [-0.7, -0.7, 0.3], [0.6, 0, 0.8], [-0.6, 0, 0.8], [0, 0.6, -0.8], [0, -0.6, 0.8]];
  dirs.forEach((d, i) => {
    const l = Math.hypot(...d);
    const u = d.map((v) => v / l);
    const len = i < 2 ? 12 : 8;
    crystal(c, [u[0] * 11, u[1] * 9.5, 67 + u[2] * 15], u, len, len * 0.38, ICE);
  });
  crystal(c, [0, 0, 88], [0, 0, 1], 12, 4, ICE, { sides: 6 });
  return c.done();
}

function frostSpear(K) {
  const c = K.ctx();
  K.haft(c, K.THEMES.frost, -30, 104, 2, P.leather, 0);
  spiralGrip(K, c, -6, 30, 2.25, P.leather, P.leatherLo, P.trimLo);
  for (const z of [52, 74]) K.ringAt(c, z, 2.3, P.trim, z);
  crystal(c, [0, 0, -32], [0, 0, 1], 6, 2.4, ICE);
  // Fur tuft at the collar, fang barbs, then a long icicle head.
  K.rod(c, 98, 104, 3.2, (x, y, z) => J(z === 101 ? P.trim : P.trimLo, x, y, z, 517, 0.04));
  furRing(c, 99, 3.4, 7, FUR, 518, 1.4, 1.1);
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (3 + t * 5), 0, 106 - t * 9 + t * t * 2], 11), 2.2, 0.5, FANG, { ridges: 3 });
  crystal(c, [0, 0, 128], [0, 0, 1], 25, 4.6, ICE, { sides: 6 });
  for (const [x, y, z, l] of [[-4, 1, 112, 6], [4, -1, 116, 5], [1, 4, 110, 4]]) crystal(c, [x, y, z], [x * 0.15, y * 0.15, 1], l, 1.6, ICE);
  return c.done();
}

function frostStaff(K) {
  const c = K.ctx();
  K.haft(c, K.THEMES.frost, -14, 90, 2, P.leather, 0);
  spiralGrip(K, c, -6, 26, 2.2, P.leather, P.leatherLo, P.trimLo);
  for (const z of [46, 66]) furRing(c, z, 2.6, 4, FUR, 519 + z, 0.9, 0.4);
  clawPommel(c, -15);
  K.rod(c, 84, 92, 3.6, (x, y, z) => J(z === 88 ? P.trim : P.trimLo, x, y, z, 520, 0.04));
  furRing(c, 86, 3.8, 7, FUR, 521, 1.5, 1);
  // Three great claws cradling the frostheart.
  for (let a = 0; a < 3; a++) {
    const ang = a * 2.094 + 0.5;
    horn(c, curve((t) => [Math.cos(ang) * (3 + Math.sin(t * 2.4) * 11), Math.sin(ang) * (3 + Math.sin(t * 2.4) * 11), 90 + t * 30], 34), 3, 0.6, CLAW, { ridges: 5 });
  }
  crystal(c, [0, 0, 110], [0, 0, 1], 11, 7, ICE, { sides: 6 });
  for (let a = 0; a < 6; a++) {
    const ang = a * 1.047;
    crystal(c, [Math.cos(ang) * 14, Math.sin(ang) * 14, 108 + Math.sin(a * 2.3) * 6], [Math.cos(ang) * 0.4, Math.sin(ang) * 0.4, 1], 4, 1.6, ICE);
  }
  return c.done();
}

function frostWand(K) {
  const c = K.ctx();
  K.rod(c, -6, 20, 2, (x, y, z) => J(FUR[(Math.floor(z / 2) + x + y) & 3], x, y, z, 522, 0.05));
  furRing(c, 4, 2, 3, FUR, 523, 0.8, 0.3);
  furRing(c, 21, 2.6, 5, FUR, 524, 1.1, 0.7);
  clawPommel(c, -7);
  for (let a = 0; a < 3; a++) {
    const ang = a * 2.094 + 1.1;
    horn(c, curve((t) => [Math.cos(ang) * (2.5 + Math.sin(t * 2.5) * 4), Math.sin(ang) * (2.5 + Math.sin(t * 2.5) * 4), 22 + t * 14], 16), 1.6, 0.4, CLAW, { ridges: 3 });
  }
  crystal(c, [0, 0, 44], [0, 0, 1], 16, 4.2, ICE, { sides: 6 });
  for (const [x, y, z] of [[-6, 2, 52], [6, -2, 48], [1, 6, 58]]) crystal(c, [x, y, z], [x * 0.12, y * 0.12, 1], 3, 1.2, ICE);
  return c.done();
}

/** Hide and claw, strung with frozen sinew, icicles hanging off the limbs. */
function frostShortbow(K) {
  const L = 32;
  const limbZ = (a) => -Math.round(15 * a ** 1.5) + (a > 0.8 ? Math.round(((a - 0.8) / 0.2) ** 1.2 * 6) : 0);
  return bowShape(K, {
    L,
    grip: 5,
    limb: (a, g) => ({ z: limbZ(a), hw: g ? 3 : a < 0.6 ? 2.4 : 1.8, dz: g ? 4 : 3 }),
    paint: ({ a, x, y, z, grip }) => {
      if (grip) return J(FUR[(Math.abs(y) + x) & 3], x, y, z, 525, 0.05);
      if (Math.abs(y) % 6 === 0) return J(P.leatherLo, x, y, z, 526, 0.04);
      return J(a > 0.7 ? P.hide : P.leather, x, y, z, 527, 0.05);
    },
    tips: (c, dir, y, z) => horn(c, curve((t) => [0, y + dir * (t * 8), z + 1 + t * 3 + t * t * 4], 10), 2.1, 0.5, CLAW, { ridges: 3 }),
    decor: (c) => {
      for (const dir of [-1, 1]) for (let k = 9; k <= 27; k += 6) crystal(c, [0, dir * k, limbZ(k / L) + 2], [0, -dir * 0.2, 1], 3.5, 1, ICE);
      crystal(c, [0, 0, 4], [0, 0, 1], 3, 1.6, ICE);
    },
    string: { color: P.iceHi, glow: true },
  });
}

/** Two great claws lashed to a hide grip. */
function frostLongbow(K) {
  const L = 44;
  const limbZ = (a) => -Math.round(20 * a ** 1.5) + (a > 0.75 ? Math.round(((a - 0.75) / 0.25) ** 1.5 * 10) : 0);
  return bowShape(K, {
    L,
    grip: 7,
    limb: (a, g) => ({ z: limbZ(a), hw: g ? 3 : Math.max(1.2, 3.4 * (1 - a) + 0.6), dz: g ? 4 : Math.max(2, Math.round(6 * (1 - a) + 1)) }),
    paint: ({ a, x, y, z, k, dz, grip }) => {
      if (grip) return Math.abs(y) % 4 === 0 ? J(P.leatherLo, x, y, z, 529, 0.04) : J(P.hide, x, y, z, 530, 0.05);
      if (a < 0.24 && Math.abs(y) % 3 === 0) return J(P.leather, x, y, z, 531, 0.04);
      const col = a > 0.85 ? P.clawTip : mix(P.clawDark, P.claw, Math.min(1, a * 1.6));
      return J(shade(col, k === dz - 1 ? 1.08 : k === 0 ? 0.86 : 1), x, y, z, 532, 0.03);
    },
    decor: (c) => {
      for (const dir of [-1, 1]) {
        for (let k = 10; k <= 30; k += 5) crystal(c, [0, dir * k, limbZ(k / L) - 3], [0, dir * 0.3, -1], 3, 1, ICE);
      }
      crystal(c, [0, 0, 4], [0, 0, 1], 3.4, 1.8, ICE);
      for (const y of [-9, 8]) for (let x = -3; x <= 2; x++) for (let z = -2; z <= 2; z++) c.set(x, y, z, J(FUR[(x + z) & 3], x, y, z, 534, 0.05));
    },
    string: { color: P.iceHi, glow: true },
  });
}

/** Fur-stocked crossbow with claw prod arms and a frost-shard bolt. */
function frostCrossbow(K) {
  return crossbowShape(K, {
    span: 25,
    stock: (x, y, z, pistol) => {
      if (pistol) return J(P.leather, x, y, z, 535, 0.05);
      if (z < 14) return J(FUR[(Math.floor(z / 2) + x + y) & 3], x, y, z, 536, 0.05);
      return y >= 2 ? J(P.leatherHi, x, y, z, 537, 0.05) : J(FUR[(Math.floor(z / 3) + x) & 3], x, y, z, 538, 0.05);
    },
    prod: (a) => ({ z: 60 - 6 * a + (a > 0.6 ? ((a - 0.6) / 0.4) ** 1.6 * 9 : 0), th: Math.max(2, Math.round(6 * (1 - a) + 1)) }),
    prodPaint: ({ a, x, y, z }) => J(a > 0.88 ? P.clawTip : mix(P.clawDark, P.claw, Math.min(1, a * 1.5)), x, y, z, 539, 0.03),
    stringCol: P.iceHi,
    stringGlow: true,
    rail: (c) => {
      for (let z = 22; z <= 52; z++) for (const x of [-1, 0]) c.set(x, 3, z, J(P.trimLo, x, z, 0, 540, 0.04));
      crystal(c, [0, 4, 46], [0, 0, 1], 18, 1.8, ICE, { sides: 6 });
    },
    decor: (c) => {
      for (let x = -5; x <= 4; x++) for (let y = -3; y <= 3; y++) for (let z = 57; z <= 63; z++) {
        if (y < -1 && Math.abs(x + 0.5) > 2.6) continue;
        c.set(x, y, z, J(Math.abs(x + 0.5) > 3.5 ? P.trim : P.trimLo, x, y, z, 541, 0.04));
      }
      for (const z of [8, 30, 50]) furRing(c, z, 2.4, 4, FUR, 542 + z, 0.8, 0.4);
      crystal(c, [0, 0, -12], [0, 0, -1], 4, 2.2, ICE);
    },
  });
}

/** Great ice claw on a fur-bound haft, a frostheart glowing at the joint. */
function frostScythe(K) {
  const c = K.ctx();
  K.haft(c, K.THEMES.frost, -14, 90, 2, P.leather, 0);
  spiralGrip(K, c, -10, 22, 2.2, P.leather, P.leatherLo, P.trimLo);
  for (const z of [24, 40, 56]) furRing(c, z, 2.4, 4, FUR, 543 + z, 0.9, 0.4);
  clawPommel(c, -15);
  K.rod(c, 84, 96, 3.6, (x, y, z) => J(z === 90 ? P.trim : P.trimLo, x, y, z, 544, 0.04));
  furRing(c, 85, 3.8, 6, FUR, 545, 1.4, 0.9);
  crystal(c, [0, 0, 97], [0, 0, 1], 5, 3.4, ICE, { sides: 6 });
  pathBlade(c, {
    x0: -2, z0: 93, a0: -1.2, len: 58, turn: -1.7, side: -1,
    thick: (f) => Math.round(lerp(6, 2, f)),
    width: (f) => 13 * (1 - f ** 1.1) + 0.6,
    paint: (p) => (p.u < 0.18 ? J(P.clawDark, p.x, p.y, p.z, 546, 0.04) : ice(p, { core: 0 })),
  });
  rime(c, (x, y, z, col) => z > 80 && x < -4 && col === P.clawDark, [P.furWhite, P.iceHi], { chance: 0.4, seed: 547 });
  return c.done();
}

export function frostWeapons(K) {
  return {
    yetisword: () => frostSword(K),
    yetigreatsword: () => frostGreatsword(K),
    yetidual: () => frostDual(K),
    yetihammer: () => frostHammer(K),
    yetispear: () => frostSpear(K),
    yetistaff: () => frostStaff(K),
    yetiwand: () => frostWand(K),
    yetishortbow: () => frostShortbow(K),
    yetilongbow: () => frostLongbow(K),
    yeticrossbow: () => frostCrossbow(K),
    yetiscythe: () => frostScythe(K),
  };
}

