/**
 * Volcanum weapons: glassy obsidian split by glowing lava cracks, edges still
 * molten, spire horns that run purple at the root to black to a gold point,
 * ash-membrane fins, and hearth cores that throw heat you can see.
 */
import { VOLC as P } from '../data/volcanum.js';
import { J, lerp, shade, mix, hash3, sweep, curve, tube, horn, scaleCol, membrane, bowShape, crossbowShape, pathBlade, veins } from './monsterKit.js';

const SPIRE = { root: P.membrane, body: P.scale, tip: P.edge };

/** Glassy obsidian with molten edges and an optional lava channel down the middle. */
function obsidian(p, o = {}) {
  const { fuller = 0, molten = true, seed = 600 } = o;
  const { ed, u, x, y, z, top, bot, t } = p;
  if (molten && ed < 1.1) return { c: P.glowHi, g: true };
  if (molten && ed < 2) return { c: P.glow, g: true };
  if (fuller && u < fuller && t > 0.05 && t < 0.9) {
    if (!(top || bot)) return P.bellyDark;
    const crust = hash3(x >> 1, 0, z >> 1, seed) < 0.22;
    return crust ? J(P.belly, x, y, z, seed + 1, 0.05) : { c: hash3(x, y, z, seed + 2) < 0.35 ? P.glowHi : P.glow, g: true };
  }
  const facet = hash3(Math.floor((x + 50 + z * 0.4) / 4), Math.floor((z - x * 0.5) / 6), y > 0 ? 1 : 0, seed + 3);
  const base = facet < 0.14 ? P.scaleHi : facet < 0.6 ? P.blade : P.scale;
  return J(shade(base, top ? 1.12 : 0.85), x, y, z, seed + 4, 0.04);
}

/** Crack the dark stone of a finished piece with lava veins. */
function crack(c, test = null, o = {}) {
  veins(c, (x, y, z, col) => (test ? test(x, y, z, col) : true) && (col & 0xffffff) < 0x505060, { scale: o.scale ?? 0.11, width: o.width ?? 0.03, glow: P.glow, hot: P.glowHi, seed: o.seed ?? 601 });
}

/** Molten core: hot centre, cooling crust plates with glowing seams. */
function hearth(c, p, r, seed = 602) {
  tube(c, [p], r, (t, d, x, y, z) => {
    if (d < 0.55) return { c: d < 0.3 ? 0xfff2c0 : P.glowHi, g: true };
    if (d < 0.8) return { c: P.glow, g: true };
    const plate = hash3(x >> 1, y >> 1, z >> 1, seed) < 0.55;
    return plate ? J(P.belly, x, y, z, seed + 1, 0.05) : { c: P.glow, g: true };
  });
}

/** Hilt of black cinder scale with an ember ring. */
function cinderGrip(K, c, z0, z1, r) {
  K.rod(c, z0, z1, r, (x, y, z) => scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 2, z, 2, 603));
  for (const z of [z0, z1]) K.rod(c, z, z, r + 0.45, (x, y, zz) => J(P.trim, x, y, zz, 604, 0.04));
}

function spirePommel(c, z, len = 8) {
  horn(c, curve((t) => [0, 0, z - t * len], len), 3, 0.5, SPIRE, { ridges: 3 });
}

/** Horn guard the colour of cooling magma: glowing at the root, cooling to black. */
function magmaHorns(c, z, span, rise, r = 2.6) {
  for (const dir of [-1, 1]) {
    tube(c, curve((t) => [dir * (2 + t * span), 0, z + t * rise * t + Math.sin(t * Math.PI) * 2], span + rise), (t) => lerp(r, 0.6, t), (t, d, x, y, zz) => {
      if (t < 0.3) return { c: t < 0.15 ? P.glowHi : P.glow, g: true };
      if (t < 0.5) return J(P.belly, x, y, zz, 605, 0.05);
      return J(t > 0.88 ? P.edge : P.scale, x, y, zz, 606, 0.04);
    });
  }
}

function volcSword(K) {
  const c = K.ctx();
  cinderGrip(K, c, -6, 10, 2.1);
  spirePommel(c, -7);
  K.rod(c, 10, 14, 3.4, (x, y, z) => J(z === 12 ? P.trim : P.scale, x, y, z, 607, 0.04));
  magmaHorns(c, 12, 10, 8);
  sweep(c, {
    z0: 15, z1: 96,
    right: (t) => 5.6 * (1 - t ** 2.1) + 0.4,
    left: (t) => 3.6 * (1 - t ** 1.5) + 0.4,
    bend: (t) => 8 * t ** 2.1,
    thick: (t) => Math.round(lerp(5, 2, t)),
    paint: (p) => obsidian(p, { fuller: 0.2 }),
  });
  crack(c, (x, y, z) => z > 16);
  return c.done();
}

function volcGreatsword(K) {
  const c = K.ctx();
  cinderGrip(K, c, -10, 28, 2.4);
  spirePommel(c, -11, 10);
  K.rod(c, 28, 33, 3.8, (x, y, z) => J(z === 30 ? P.trim : P.scale, x, y, z, 608, 0.04));
  magmaHorns(c, 30, 14, 10, 3.2);
  hearth(c, [0, 0, 31], 3.4);
  sweep(c, {
    z0: 34, z1: 126,
    right: (t) => (t < 0.8 ? 8.5 : 8.5 * (1 - ((t - 0.8) / 0.2) ** 1.2)) + 0.3,
    left: (t) => (t < 0.76 ? 7 : 7 * (1 - ((t - 0.76) / 0.24))) + 0.3,
    thick: (t) => Math.round(lerp(8, 3, t)),
    paint: (p) => (p.side < 0 && p.u > 0.55 && p.ed > 1 ? scaleCol(P.scaleLo, P.scale, P.scaleHi, p.x, p.y, p.z, 3, 609) : obsidian(p, { fuller: 0.18 })),
  });
  // Spires jutting from the back edge like a ridge of volcanic peaks.
  for (let z = 44; z <= 104; z += 10) {
    const t = (z - 34) / 92;
    const left = (t < 0.76 ? 7 : 7 * (1 - (t - 0.76) / 0.24)) + 0.3;
    const len = 7 + Math.round(hash3(z, 1, 2, 610) * 5);
    horn(c, curve((s) => [-left - s * len, 0, z + s * len * 0.6], len), 2.4, 0.5, SPIRE, { ridges: 3 });
  }
  crack(c, (x, y, z) => z > 36);
  return c.done();
}

function volcDual(K) {
  const c = K.ctx();
  cinderGrip(K, c, -4, 8, 1.8);
  spirePommel(c, -5, 5);
  K.rod(c, 9, 11, 3, (x, y, z) => J(P.trim, x, y, z, 611, 0.04));
  // A hooked talon blade, the edge weeping a thread of lava.
  pathBlade(c, {
    x0: 0, z0: 11, a0: 0.1, len: 56, turn: 1.25, side: -1,
    thick: (f) => Math.round(lerp(5, 2, f)),
    width: (f) => 5.2 * (1 - f ** 1.6) + 0.5,
    paint: (p) => obsidian(p),
  });
  for (const [x, z] of [[-6, 30], [-5, 44], [-2, 56]]) tube(c, curve((t) => [x, -1, z - t * 4], 4), (t) => lerp(0.9, 0.4, t), () => ({ c: P.glow, g: true }));
  crack(c, (x, y, z) => z > 12, { seed: 612 });
  return c.done();
}

/** Caldera Maul: a volcano of a head, each striking face a crater holding the hearth core. */
function volcHammer(K) {
  const c = K.ctx();
  K.haft(c, K.THEMES.volcanum, -14, 62, 2, P.scaleLo, 0);
  cinderGrip(K, c, -12, 26, 2.3);
  spirePommel(c, -15, 9);
  for (let z = 50; z <= 84; z++)
    for (let y = -10; y <= 10; y++)
      for (let x = -13; x <= 12; x++) {
        const ax = Math.abs(x + 0.5);
        // Two cones meeting at the haft: wide at the striking faces.
        const rad = 6 + ax * 0.32 + (hash3(x >> 1, y >> 1, z >> 1, 613) - 0.5) * 1.6;
        const r = Math.hypot(y + 0.5, (z - 67) * 0.9);
        if (r > rad || ax > 12.5) continue;
        const crater = ax > 10.5 && r < rad - 2.4;
        if (crater) continue;
        const rim = ax > 10.5;
        c.set(x, y, z, rim ? J(P.scaleHi, x, y, z, 614, 0.05) : scaleCol(P.scaleLo, P.scale, P.scaleHi, x, y, z, 3, 615));
      }
  for (const dir of [-1, 1]) {
    hearth(c, [dir * 11, 0, 67], 6.2, 616 + dir);
    // Lava rivulets down the flanks.
    for (const [y, z] of [[9, 62], [-9, 72], [6, 76], [-7, 58]]) tube(c, curve((t) => [dir * (10 - t * 6), y * (1 - t * 0.15), z - t * 6], 8), 0.9, () => ({ c: P.glow, g: true }));
  }
  horn(c, curve((t) => [Math.sin(t * 1.8) * 2, 0, 82 + t * 22], 22), 4, 0.6, SPIRE, { ridges: 5 });
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (4 + t * 5), 0, 80 + t * 12], 12), 2.4, 0.5, SPIRE, { ridges: 3 });
  crack(c, (x, y, z) => z >= 50, { seed: 617 });
  return c.done();
}

/** Spire Lance: a twisted spire-horn head on a lava-veined shaft. */
function volcSpear(K) {
  const c = K.ctx();
  K.rod(c, -30, 104, 2, (x, y, z) => J(((x + y + z) & 7) === 0 ? P.scaleHi : P.scale, x, y, z, 618, 0.05));
  cinderGrip(K, c, -6, 30, 2.25);
  spirePommel(c, -30, 8);
  K.rod(c, 98, 104, 3.4, (x, y, z) => J(z === 101 ? P.trim : P.scale, x, y, z, 619, 0.04));
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2;
    horn(c, curve((t) => [Math.cos(ang) * (3 + t * 4), Math.sin(ang) * (3 + t * 4), 102 + t * 9], 10), 1.8, 0.4, SPIRE, { ridges: 2 });
  }
  // The spire: a tall twisting horn, glowing seam spiralling up it.
  tube(c, curve((t) => [Math.sin(t * 3) * 1.2, Math.cos(t * 3) * 1.2, 104 + t * 48], 48), (t) => lerp(5.2, 0.6, t ** 0.9), (t, d, x, y, z) => {
    const ang = Math.atan2(y + 0.5, x + 0.5);
    const seam = Math.abs(((ang + t * 14) % (Math.PI * 2 / 3) + Math.PI * 2) % (Math.PI * 2 / 3) - 1) < 0.22 && d > 0.6 && t < 0.85;
    if (seam) return { c: P.glow, g: true };
    if (t > 0.86) return J(P.edge, x, y, z, 620, 0.02);
    return J(t < 0.2 ? mix(P.membrane, P.scale, t / 0.2) : d > 0.8 ? P.scaleHi : P.scale, x, y, z, 621, 0.04);
  });
  crack(c, (x, y, z) => z > -28 && z < 98, { scale: 0.22, width: 0.05, seed: 622 });
  return c.done();
}

/** Hearthcore Staff: three spire horns cradle a beating hearth core. */
function volcStaff(K) {
  const c = K.ctx();
  K.rod(c, -14, 90, 2, (x, y, z) => J(P.scale, x, y, z, 623, 0.05));
  cinderGrip(K, c, -6, 26, 2.2);
  spirePommel(c, -14, 9);
  K.rod(c, 84, 92, 3.8, (x, y, z) => J(z === 88 ? P.trim : P.scale, x, y, z, 624, 0.04));
  for (let a = 0; a < 3; a++) {
    const ang = a * 2.094 + 0.3;
    horn(c, curve((t) => [Math.cos(ang) * (3 + Math.sin(t * 2.3) * 12), Math.sin(ang) * (3 + Math.sin(t * 2.3) * 12), 90 + t * 34], 38), 3.2, 0.6, SPIRE, { ridges: 6 });
  }
  hearth(c, [0, 0, 110], 8, 625);
  for (const [x, y, z] of [[-11, 4, 120], [9, -6, 104], [4, 10, 124], [-6, -10, 116], [0, 0, 124]]) K.ball(c, x, y, z, 1.2, z > 118 ? P.glowHi : P.glow, true);
  // Magma dripping from the core down the shaft.
  for (const [x, y] of [[2, 1], [-2, -1]]) tube(c, curve((t) => [x, y, 102 - t * 14], 14), (t) => lerp(1.2, 0.5, t), () => ({ c: P.glow, g: true }));
  crack(c, (x, y, z) => z < 84 && z > -12, { scale: 0.22, width: 0.05, seed: 626 });
  return c.done();
}

/** Emberfang Wand: a talon-thin wand with a drop of lava caught at the tip. */
function volcWand(K) {
  const c = K.ctx();
  cinderGrip(K, c, -6, 20, 1.8);
  spirePommel(c, -7, 5);
  K.rod(c, 21, 24, 2.6, (x, y, z) => J(P.trim, x, y, z, 627, 0.04));
  tube(c, curve((t) => [-Math.round(t * t * 6), 0, 24 + t * 30], 30), (t) => lerp(2.4, 0.8, t), (t, d, x, y, z) => {
    if (d > 0.82 && t > 0.1 && t < 0.92) return { c: t > 0.6 ? P.glowHi : P.glow, g: (x + z) % 3 === 0 };
    return J(t > 0.92 ? P.edge : mix(P.claw, P.scale, 0.55), x, y, z, 628, 0.04);
  });
  // Teardrop of lava hanging at the tip.
  tube(c, curve((t) => [-6, 0, 56 + t * 6], 6), (t) => Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.2)) * 3.2 + 0.3, (t, d) => ({ c: d < 0.5 ? 0xfff2c0 : t > 0.6 ? P.glowHi : P.glow, g: true }));
  for (const [x, y, z] of [[-10, 2, 64], [-3, -3, 66], [-7, 3, 68]]) K.ball(c, x, y, z, 0.9, P.glowHi, true);
  return c.done();
}

/** Cinder Shortbow: black cracked limbs strung with heated sinew. */
function volcShortbow(K) {
  const L = 32;
  const limbZ = (a) => -Math.round(14 * a ** 1.5) + (a > 0.78 ? Math.round(((a - 0.78) / 0.22) ** 1.3 * 7) : 0);
  return bowShape(K, {
    L,
    grip: 5,
    limb: (a, g) => ({ z: limbZ(a), hw: g ? 3 : a < 0.6 ? 2.4 : 1.7, dz: g ? 4 : 3 }),
    paint: ({ a, x, y, z, grip }) => {
      if (grip) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z + 4, y, 2, 629);
      if (Math.abs(y) % 5 === 0 && a > 0.2) return { c: P.glow, g: true };
      return J(a > 0.9 ? P.edge : (Math.abs(y) & 1) ? P.scale : P.blade, x, y, z, 630, 0.04);
    },
    tips: (c, dir, y, z) => horn(c, curve((t) => [0, y + dir * t * 7, z + 1 + t * 4], 8), 1.9, 0.4, SPIRE, { ridges: 2 }),
    decor: (c) => hearth(c, [0, 0, 4], 2.4, 631),
    string: { color: P.glowHi, glow: true },
  });
}

/** Spire Wingbow: spire-horn limbs with ash-membrane wings. */
function volcLongbow(K) {
  const L = 44;
  const limbZ = (a) => -Math.round(21 * a ** 1.6) + (a > 0.8 ? Math.round(((a - 0.8) / 0.2) ** 1.3 * 8) : 0);
  return bowShape(K, {
    L,
    grip: 6,
    limb: (a, g) => ({ z: limbZ(a), hw: g ? 3 : Math.max(1.3, 2.8 * (1 - a) + 0.8), dz: g ? 4 : 3 }),
    paint: ({ a, x, y, z, k, grip }) => {
      if (grip) return scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 3, z + 4, y, 2, 632);
      if (a < 0.25) return J(mix(P.membrane, P.scale, a / 0.25), x, y, z, 633, 0.04);
      if (a > 0.9) return J(P.edge, x, y, z, 634, 0.02);
      if (k === 2 && Math.abs(y) % 4 === 0) return { c: P.glow, g: true };
      return J(Math.floor(Math.abs(y) / 3) % 3 === 0 ? P.scaleHi : P.scale, x, y, z, 635, 0.04);
    },
    decor: (c) => {
      for (const dir of [-1, 1]) {
        for (let k = 6; k <= 34; k++) {
          const zc = limbZ(k / L) + 2;
          const reach = Math.round(Math.sin(((k - 6) / 28) * Math.PI) * 10 - (k % 7 < 3 ? 0 : 2));
          for (let q = 1; q <= reach; q++) c.set(0, dir * k, zc + q, k % 7 === 1 ? P.scale : q === reach ? P.membraneHi : J(P.membrane, k, q, dir, 636, 0.05));
        }
      }
      hearth(c, [0, 0, 4], 2.6, 637);
    },
    string: { color: P.glowHi, glow: true },
  });
}

/** Magmalock: cinder-scale stock, spire-horn prods and a lump of lava on the rail. */
function volcCrossbow(K) {
  return crossbowShape(K, {
    span: 25,
    stock: (x, y, z, pistol) => (pistol ? scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 10, z, 2, 638) : scaleCol(P.scaleLo, P.scale, P.scaleHi, x + 2, y + 4, z, 2, 639)),
    prod: (a) => ({ z: 60 - 8 * a ** 1.6 + (a > 0.85 ? ((a - 0.85) / 0.15) * 4 : 0), th: a < 0.2 ? 6 : a < 0.7 ? 4 : 3 }),
    prodPaint: ({ a, x, y, z, q }) => {
      if (a > 0.9) return J(P.edge, x, y, z, 640, 0.02);
      if (a < 0.22) return J(mix(P.membrane, P.scale, a / 0.22), x, y, z, 641, 0.04);
      if (q === 1 && y === 0 && x % 4 === 0) return { c: P.glow, g: true };
      return J(Math.floor(Math.abs(x) / 3) % 3 === 0 ? P.scaleHi : P.scale, x, y, z, 642, 0.04);
    },
    stringCol: P.glowHi,
    stringGlow: true,
    rail: (c) => {
      for (let z = 22; z <= 66; z++) for (const x of [-1, 0]) c.set(x, 3, z, J(P.trim, x, z, 0, 643, 0.04));
      hearth(c, [0, 5, 40], 2.6, 644);
    },
    decor: (c) => {
      for (let x = -5; x <= 4; x++) for (let y = -3; y <= 3; y++) for (let z = 56; z <= 64; z++) {
        if (y < -1 && Math.abs(x + 0.5) > 2.6) continue;
        c.set(x, y, z, J(Math.abs(x + 0.5) > 3.5 ? P.trim : P.scaleHi, x, y, z, 645, 0.04));
      }
      for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (4 + t * 3), 3 + t * 4, 58 - t * 14], 16), 2.2, 0.5, SPIRE, { ridges: 4 });
      membrane(c, 18, 44, () => -2, (t) => -2 - Math.sin(t * Math.PI) * 6, 0, { body: P.membrane, edge: P.membraneHi, vein: P.scale }, { vein: 5 });
      membrane(c, 18, 44, () => 1, (t) => 1 + Math.sin(t * Math.PI) * 6, 0, { body: P.membrane, edge: P.membraneHi, vein: P.scale }, { vein: 5 });
      horn(c, curve((t) => [0, 0, -11 - t * 6], 6), 3.2, 1.2, SPIRE, { ridges: 2 });
      crack(c, (x, y, z) => z < 56 && z > -10, { scale: 0.2, width: 0.045, seed: 646 });
    },
  });
}

/** Ashfall Scythe: a great talon blade on a spire-horn haft, lava pooled at the joint. */
function volcScythe(K) {
  const c = K.ctx();
  tube(c, curve((t) => [0, 0, -14 + t * 106], 106), (t) => lerp(2.3, 2, t), (t, d, x, y, z) => J(z % 9 === 0 ? P.scaleHi : t < 0.15 ? mix(P.membrane, P.scale, t / 0.15) : P.scale, x, y, z, 647, 0.04));
  cinderGrip(K, c, -10, 22, 2.25);
  cinderGrip(K, c, 40, 54, 2.25);
  spirePommel(c, -15, 8);
  K.rod(c, 84, 94, 3.6, (x, y, z) => J(z === 89 ? P.trim : P.scale, x, y, z, 648, 0.04));
  hearth(c, [0, 0, 96], 4.2, 649);
  pathBlade(c, {
    x0: -2, z0: 94, a0: -1.15, len: 58, turn: -1.85, side: -1,
    thick: (f) => Math.round(lerp(6, 2, f)),
    width: (f) => 13 * (1 - f ** 1.3) + 0.6,
    paint: (p) => obsidian(p, { fuller: 0 }),
  });
  // Ash membrane flag trailing from the socket.
  membrane(c, 70, 88, () => 3, (t) => 3 + Math.sin(t * Math.PI) * 9 + t * 2, 0, { body: P.membrane, edge: P.membraneHi, vein: P.scale }, { vein: 4 });
  crack(c, (x, y, z) => z > 80, { seed: 650 });
  return c.done();
}

export function volcWeapons(K) {
  return {
    volcsword: () => volcSword(K),
    volcgreatsword: () => volcGreatsword(K),
    volcdual: () => volcDual(K),
    volchammer: () => volcHammer(K),
    volcspear: () => volcSpear(K),
    volcstaff: () => volcStaff(K),
    volcwand: () => volcWand(K),
    volcshortbow: () => volcShortbow(K),
    volcbow: () => volcLongbow(K),
    volccrossbow: () => volcCrossbow(K),
    volcscythe: () => volcScythe(K),
  };
}

