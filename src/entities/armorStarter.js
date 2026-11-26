import { hash3, jitter, shade } from '../engine/voxel.js';

/**
 * Starting outfits the Hunter Guild hands out with a class. Plain and worn on
 * purpose: dull colours, scuffs, dents, rope and leather instead of gold, no
 * glow. They should read as the first thing a hunter owns, not a prize.
 *
 *   recruitplate  warrior  dented iron breastplate over the tunic
 *   squiremail    paladin  plain chainmail under a faded linen tabard
 *   noviceleather ranger   simple laced brown leather
 *   novicecloth   mage     rough wool robe, patched, tied with rope
 */

const J = (c, x, y, z, s = 0, a = 0.08) => jitter(c, a, hash3(x, y, z, s));

/** Scuffed colour: jitter plus the odd darker worn patch. */
const worn = (c, x, y, z, s) => {
  const h = hash3(x >> 1, y >> 1, z >> 1, s + 900);
  return J(h > 0.9 ? shade(c, 0.82) : c, x, y, z, s, 0.08);
};

const IRON = 0x7d8086;
const IRON_DENT = 0x62656b;
const RUST = 0x7a5a3e;
const RIVET = 0x9a9da2;
const LEATHER = 0x5e4430;
const LEATHER_DK = 0x3c2b1d;
const BOOT = 0x4a3624;
const LINEN = 0xcfc6b0;
const FADED_BLUE = 0x4d6386;
const ROPE = 0x9a8458;

function fill(set, x0, y0, z0, x1, y1, z1, fn) {
  for (let z = z0; z < z1; z++)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const c = typeof fn === 'function' ? fn(x, y, z) : fn;
        if (c != null) set(x, y, z, c);
      }
}

const iron = (x, y, z, s = 0) => {
  const h = hash3(x, y, z, 910 + s);
  return J(h > 0.95 ? RUST : h > 0.86 ? IRON_DENT : IRON, x, y, z, 911 + s, 0.05);
};
const mail = (x, y, z) => J((x + y) % 2 ? 0x8d9096 : 0x5c5f65, x, y, z, 920, 0.05);
const leather = (x, y, z, s = 0) => worn(LEATHER, x, y, z, 930 + s);

/** Plain leather boots with a lighter cuff. */
function boots(set) {
  fill(set, 3, 1, 3, 10, 9, 10, (x, y, z) => worn(BOOT, x, y, z, 940));
  fill(set, 3, 1, 10, 10, 4, 13, (x, y, z) => worn(BOOT, x, y, z, 941));
  fill(set, 2, 9, 2, 11, 10, 11, (x, y, z) => worn(shade(BOOT, 1.25), x, y, z, 942));
  fill(set, 3, 0, 3, 10, 1, 13, (x, y, z) => J(0x1e1610, x, y, z, 943, 0.04));
}

const noHelm = () => {};

const STARTERS = {
  recruitplate: {
    paintHelm: noHelm,
    paintChest(T, ty) {
      const set = (x, y, z, c) => T.set(x, ty(y), z, c);
      // A dented iron breastplate and backplate over the tunic, held on with leather side straps.
      fill(set, 6, 6, 14, 20, 18, 15, (x, y, z) => iron(x, y, z));
      fill(set, 6, 6, 3, 20, 18, 4, (x, y, z) => iron(x, y, z, 1));
      for (const y of [8, 14]) for (const x of [4, 5, 20, 21]) for (let z = 4; z <= 13; z++) set(x, y, z, leather(x, y, z, 2));
      for (const [x, y] of [[6, 6], [19, 6], [6, 17], [19, 17]]) set(x, y, 15, J(RIVET, x, y, 15, 950, 0.04));
      for (let x = 7; x <= 18; x++) set(x, 17, 15, J(IRON_DENT, x, 17, 15, 951, 0.05));
    },
    paintArm(A, set) {
      // Iron bracers bound with leather, and a small rounded shoulder cap.
      fill(set, 3, 8, 3, 10, 13, 11, (x, y, z) => (y === 8 || y === 12 ? leather(x, y, z, 3) : iron(x, y, z, 2)));
      fill(set, 3, 22, 3, 10, 25, 11, (x, y, z) => iron(x, y, z, 3));
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        // Iron knee guards strapped over plain trousers.
        fill(set, 4, 11, 10, 9, 14, 12, (x, y, z) => iron(x, y, z, 4));
        for (let x = 3; x <= 9; x++) set(x, 12, 10, leather(x, 12, 10, 5));
      }
      if (flags.boots) boots(set);
    },
  },

  squiremail: {
    paintHelm: noHelm,
    paintChest(T, ty) {
      const set = (x, y, z, c) => T.set(x, ty(y), z, c);
      // Chainmail all round, a faded linen tabard over it, a rope belt.
      fill(set, 5, 1, 13, 21, 19, 14, mail);
      fill(set, 5, 1, 4, 21, 19, 5, mail);
      for (const x of [4, 21]) fill(set, x, 1, 5, x + 1, 19, 13, mail);
      fill(set, 9, 0, 14, 17, 18, 15, (x, y, z) => worn(LINEN, x, y, z, 960));
      fill(set, 9, 0, 3, 17, 18, 4, (x, y, z) => worn(LINEN, x, y, z, 961));
      for (let y = 9; y <= 14; y++) for (const x of [12, 13]) set(x, y, 15, J(FADED_BLUE, x, y, 15, 962, 0.06));
      for (let x = 10; x <= 15; x++) for (const y of [12, 13]) set(x, y, 15, J(FADED_BLUE, x, y, 15, 963, 0.06));
      for (let x = 4; x <= 21; x++) {
        set(x, 3, 15, J(ROPE, x, 3, 15, 964, 0.08));
        set(x, 3, 3, J(ROPE, x, 3, 3, 965, 0.08));
      }
    },
    paintArm(A, set) {
      // Mail sleeves to the elbow, plain leather gloves.
      fill(set, 3, 14, 3, 10, 22, 11, mail);
      fill(set, 3, 3, 3, 10, 7, 11, (x, y, z) => leather(x, y, z, 6));
      fill(set, 3, 7, 3, 10, 9, 11, (x, y, z) => leather(x, y, z, 7));
    },
    paintLeg(set, flags) {
      if (flags.legs) fill(set, 3, 14, 10, 10, 24, 11, mail);
      if (flags.boots) boots(set);
    },
  },

  noviceleather: {
    paintHelm: noHelm,
    paintChest(T, ty) {
      const set = (x, y, z, c) => T.set(x, ty(y), z, c);
      // A plain brown jerkin, laced up the front, stitched at the sides.
      fill(set, 5, 2, 14, 21, 19, 15, (x, y, z) => leather(x, y, z, 10));
      fill(set, 5, 2, 3, 21, 19, 4, (x, y, z) => leather(x, y, z, 11));
      for (const x of [4, 21]) fill(set, x, 2, 4, x + 1, 19, 14, (xx, y, z) => (y % 3 === 0 ? J(LEATHER_DK, xx, y, z, 970, 0.05) : leather(xx, y, z, 12)));
      for (let y = 7; y <= 16; y++) for (const x of [12, 13]) set(x, y, 15, (y + x) % 2 ? J(LEATHER_DK, x, y, 15, 971, 0.05) : leather(x, y, 15, 13));
      for (let x = 5; x <= 20; x++) set(x, 18, 15, J(LEATHER_DK, x, 18, 15, 972, 0.05));
    },
    paintArm(A, set) {
      // A leather bracer with two laces; hands bare.
      fill(set, 3, 7, 3, 10, 13, 11, (x, y, z) => (y === 9 || y === 11 ? J(LEATHER_DK, x, y, z, 973, 0.05) : leather(x, y, z, 14)));
    },
    paintLeg(set, flags) {
      if (flags.legs) fill(set, 3, 11, 3, 10, 24, 10, (x, y, z) => worn(0x5a4632, x, y, z, 974));
      if (flags.boots) {
        boots(set);
        for (const y of [3, 6]) for (let x = 3; x <= 9; x++) set(x, y, 10, J(LEATHER_DK, x, y, 10, 975, 0.05));
      }
    },
  },

  novicecloth: {
    paintHelm: noHelm,
    paintChest(T, ty) {
      const set = (x, y, z, c) => T.set(x, ty(y), z, c);
      const wool = (x, y, z) => worn((y + (x >> 1)) % 3 === 0 ? 0x47546c : 0x52607a, x, y, z, 980);
      // Rough wool robe, a darker seam down the front, a mismatched patch, a rope belt with a knot.
      fill(set, 5, 0, 14, 21, 19, 15, wool);
      fill(set, 5, 0, 3, 21, 19, 4, wool);
      for (const x of [4, 21]) fill(set, x, 0, 4, x + 1, 19, 14, wool);
      for (let y = 0; y <= 18; y++) set(13, y, 15, J(0x3c4658, 13, y, 15, 981, 0.05));
      fill(set, 16, 10, 15, 19, 13, 16, (x, y, z) => worn(0x6a5a48, x, y, z, 982));
      for (let x = 4; x <= 21; x++) {
        set(x, 3, 15, J(ROPE, x, 3, 15, 983, 0.08));
        set(x, 3, 3, J(ROPE, x, 3, 3, 984, 0.08));
      }
      for (let y = 0; y <= 2; y++) set(15, y, 16, J(ROPE, 15, y, 16, 985, 0.08));
    },
    paintArm(A, set) {
      // A wide wool sleeve ending at a darker cuff; hands bare.
      fill(set, 2, 8, 2, 11, 22, 12, (x, y, z) => worn(0x52607a, x, y, z, 986));
      // The robe runs over the shoulder, covering the tunic's pad.
      fill(set, 2, 21, 2, 13, 27, 12, (x, y, z) => worn(0x52607a, x, y, z, 992));
      fill(set, 2, 8, 2, 11, 9, 12, (x, y, z) => J(0x3c4658, x, y, z, 987, 0.05));
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        // The robe's skirt to the shin, with a frayed hem.
        fill(set, 2, 11, 2, 12, 24, 12, (x, y, z) => worn(0x52607a, x, y, z, 988));
        for (let x = 2; x < 12; x++) for (let z = 2; z < 12; z++) if ((x + z) % 2 === 0) set(x, 11, z, J(0x3c4658, x, 11, z, 989, 0.05));
      }
      if (flags.boots) {
        // Simple cloth shoes.
        fill(set, 3, 0, 3, 10, 5, 13, (x, y, z) => worn(0x5a4a3a, x, y, z, 990));
        fill(set, 3, 0, 3, 10, 1, 13, (x, y, z) => J(0x2a2018, x, y, z, 991, 0.04));
      }
    },
  },
};

export const STARTER_SETS = Object.keys(STARTERS);
export const makeStarterArmor = (setId) => STARTERS[setId];
