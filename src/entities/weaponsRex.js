/**
 * Tyrant Rex weapons: serrated cream fangs, dense rex bone, grey toe claws and
 * olive hide raked with dark red stripes. The amber eye burns in the staff.
 */
import { J, lerp, shade, mix, hash3, sweep, curve, tube, horn, teethRow, eyeGem, bowShape, crossbowShape } from './monsterKit.js';

const P = {
  grn: 0x56702e, grnLo: 0x3d5222, grnHi: 0x6f8a3a, tan: 0xb39a68,
  red: 0x8a2a24, redLo: 0x5a1612, gum: 0x8e3a3c,
  fang: 0xf0e6cc, fangLo: 0xc8b890, bone: 0xdccfac, boneLo: 0xa8996f, boneDark: 0x7a6d4c,
  claw: 0x8a8c90, clawLo: 0x5c5e62, clawTip: 0xc8cace,
  eye: 0xffa818, eyeHi: 0xffe8a0, pupil: 0x16100c,
};
const FANG = { root: P.fangLo, body: P.fang, tip: 0xffffff };
const CLAW = { root: P.clawLo, body: P.claw, tip: P.clawTip };
const BONE = { root: P.boneLo, body: P.bone, tip: P.fang };

/** Striped rex hide for grips and wraps. */
const hideCol = (x, y, z) => {
  const f = (((z + Math.round(Math.atan2(y + 0.5, x + 0.5) * 2)) % 5) + 5) % 5;
  return f === 0 ? J(P.red, x, y, z, 700, 0.05) : J(hash3(x, y, z >> 1, 701) < 0.6 ? P.grn : P.grnLo, x, y, z, 702, 0.05);
};
const hideGrip = (K, c, z0, z1, r) => {
  K.rod(c, z0, z1, r, hideCol);
  K.ringAt(c, z0, r, P.bone, 1);
  K.ringAt(c, z1, r, P.bone, 2);
};

/** Fang enamel: a red gum root, ivory body with growth lines, white serrated edge. */
function fangPaint(p) {
  const { t, ed, x, y, z, top } = p;
  if (t < 0.06) return J(((x + z) & 1) ? P.gum : shade(P.gum, 0.8), x, y, z, 703, 0.05);
  if (ed < 1.2) return J(0xffffff, x, y, z, 704, 0.02);
  const tone = mix(P.fangLo, P.fang, Math.min(1, t * 1.5));
  return J(shade(tone, (z % 8 === 0 ? 0.9 : 1) * (top ? 1.04 : 0.9)), x, y, z, 705, 0.03);
}

/** Bone: dense, pale, with darker pitted knots. */
function bonePaint(p) {
  const { ed, x, y, z, top } = p;
  if (ed < 1.1) return J(P.fang, x, y, z, 706, 0.03);
  return J(shade(hash3(x >> 1, y, z >> 2, 707) < 0.15 ? P.boneLo : P.bone, top ? 1.04 : 0.88), x, y, z, 708, 0.04);
}

function clawGuard(K, c, z, half) {
  K.rod(c, z, z + 3, 3.2, (x, y, zz) => J(P.bone, x, y, zz, 709, 0.04));
  for (const dir of [-1, 1]) horn(c, curve((t) => [dir * (2 + t * half), 0, z + 2 + t * 5 + t * t * 4], half + 4), 2.3, 0.6, CLAW, { ridges: 3 });
}

function rexBlade(K) {
  const c = K.ctx();
  hideGrip(K, c, -6, 10, 2.1);
  K.ball(c, 0, 0, -8, 2.8, (x, y, z) => J(P.boneLo, x, y, z, 710, 0.04));
  clawGuard(K, c, 10, 8);
  sweep(c, {
    z0: 15, z1: 96,
    right: (t) => 6.2 * (1 - t ** 1.8) + 0.4,
    left: (t) => 5.2 * (1 - t ** 1.3) + 0.4,
    bend: (t) => -6 * t ** 2.2,
    thick: (t) => Math.round(lerp(6, 2, t)),
    paint: fangPaint,
    teeth: [
      { side: -1, from: 0.12, to: 0.88, every: 3, len: 2, base: 2, col: P.fang, tip: 0xffffff, rake: 0.4 },
      { side: 1, from: 0.12, to: 0.88, every: 3, len: 2, base: 2, col: P.fang, tip: 0xffffff, rake: 0.4 },
    ],
  });
  return c.done();
}

function rexGreatsword(K) {
  const c = K.ctx();
  hideGrip(K, c, -10, 28, 2.4);
  K.ball(c, 0, 0, -12, 3.4, (x, y, z) => J(P.boneLo, x, y, z, 711, 0.04));
  clawGuard(K, c, 28, 12);
  // A lower jawbone: broad bone blade, the curved angle of the jaw at the hilt.
  sweep(c, {
    z0: 33, z1: 124,
    right: (t) => (t < 0.82 ? 9 - t * 2 : (9 - 0.82 * 2) * (1 - ((t - 0.82) / 0.18) ** 1.1)) + 0.3,
    left: (t) => (t < 0.12 ? 5 + t * 20 : 7.4 * (1 - t ** 3)) + 0.3,
    thick: (t) => Math.round(lerp(8, 3, t)),
    paint: bonePaint,
  });
  // The teeth are still in it, a row of them standing along the cutting edge.
  for (let z = 38; z <= 112; z += 4) {
    const t = (z - 33) / 91;
    const edge = (t < 0.82 ? 9 - t * 2 : (9 - 0.82 * 2) * (1 - ((t - 0.82) / 0.18) ** 1.1)) + 0.3;
    const big = z % 16 === 6;
    tube(c, curve((s) => [edge + s * (big ? 7 : 4.6), 0, z + s * 2], big ? 7 : 5), (s) => lerp(big ? 1.9 : 1.4, 0.45, s), (s, d, x, y, zz) => J(s > 0.7 ? 0xffffff : s < 0.12 ? P.gum : P.fang, x, y, zz, 712, 0.03));
  }
  return c.done();
}

function rexHammer(K) {
  const c = K.ctx();
  K.rod(c, -14, 60, 2.1, (x, y, z) => J(z % 9 === 0 ? P.boneLo : P.bone, x, y, z, 713, 0.04));
  hideGrip(K, c, -12, 24, 2.35);
  horn(c, curve((t) => [0, 0, -14 - t * 6], 6), 3, 1.2, BONE, { ridges: 2 });
  // A rex knuckle bone: a double-knobbed barrel lying across the haft.
  for (const dir of [-1, 1]) K.ball(c, dir * 7.5, 0, 68, 8.6, (x, y, z, d) => J(d > 0.85 ? P.boneLo : hash3(x >> 1, y >> 1, z >> 1, 714) < 0.12 ? P.boneDark : P.bone, x, y, z, 715, 0.04));
  K.rod(c, 60, 76, 6.4, (x, y, z) => J(P.bone, x, y, z, 716, 0.04));
  // Ringed with toe claws.
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    horn(c, curve((t) => [dx * (6 + t * 6), dy * (6 + t * 6), 68 + (a % 2 ? 4 : -4) + t * 2], 8), 2.2, 0.5, CLAW, { ridges: 2 });
  }
  // A hide band and a red stripe where the head meets the haft.
  K.rod(c, 56, 59, 3.4, hideCol);
  return c.done();
}

function rexSpear(K) {
  const c = K.ctx();
  K.rod(c, -30, 104, 2, (x, y, z) => J(z % 11 === 0 ? P.boneLo : P.bone, x, y, z, 717, 0.04));
  hideGrip(K, c, -6, 30, 2.25);
  K.rod(c, 96, 104, 3.4, hideCol);
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    tube(c, curve((t) => [Math.cos(ang) * (3 + t * 2.5), Math.sin(ang) * (3 + t * 2.5), 100 - t * 9], 9), (t) => lerp(1.4, 0.5, t), (t, d, x, y, z) => hideCol(x, y, z));
  }
  sweep(c, {
    z0: 104, z1: 150,
    right: (t) => 5 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)) ** 0.8 * (1 - t ** 3) + 0.4,
    left: (t) => 5 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)) ** 0.8 * (1 - t ** 3) + 0.4,
    bend: (t) => -2.5 * t ** 2.4,
    thick: (t) => Math.round(lerp(6, 2, t)),
    paint: fangPaint,
  });
  return c.done();
}

/** Two jawbones joined at a hide grip, teeth along the belly. */
function rexBow(K) {
  const L = 44;
  const limbZ = (a) => -Math.round(21 * a ** 1.6) + (a > 0.82 ? Math.round(((a - 0.82) / 0.18) ** 1.3 * 7) : 0);
  return bowShape(K, {
    L,
    grip: 6,
    limb: (a, g) => ({ z: limbZ(a), hw: g ? 3 : Math.max(1.4, 2.9 * (1 - a) + 0.8), dz: g ? 4 : 4 }),
    paint: ({ a, x, y, z, k, grip }) => {
      if (grip) return hideCol(x, y, z);
      if (a > 0.92) return J(P.fang, x, y, z, 718, 0.03);
      return J(k === 3 ? P.bone : k === 0 ? P.boneLo : shade(P.bone, 0.95), x, y, z, 719, 0.04);
    },
    tips: (c, dir, y, z) => horn(c, curve((t) => [0, y + dir * t * 7, z + 2 + t * 5], 9), 1.9, 0.5, CLAW, { ridges: 2 }),
    decor: (c) => {
      for (const dir of [-1, 1]) teethRow(c, [0, dir * 9, limbZ(9 / L) + 3], [0, dir * 32, limbZ(32 / L) + 3], 8, [0, 0, 1], 3, 0.9, { body: P.fang, tip: 0xffffff }, 720 + dir);
      eyeGem(c, [0, 0, 4], 1.6, P.eye, P.pupil, P.bone);
    },
    string: { color: 0xd8ccb0 },
  });
}

function rexCrossbow(K) {
  return crossbowShape(K, {
    span: 25,
    stock: (x, y, z, pistol) => {
      if (pistol) return hideCol(x, y, z);
      if (z < 14) return hideCol(x, y + 4, z);
      return y >= 2 ? J(P.bone, x, y, z, 721, 0.04) : hideCol(x, y, z);
    },
    prod: (a) => ({ z: 60 - 9 * a ** 1.5 + (a > 0.86 ? ((a - 0.86) / 0.14) * 5 : 0), th: a < 0.2 ? 6 : a < 0.7 ? 5 : 3 }),
    prodPaint: ({ a, x, y, z }) => J(a > 0.9 ? P.clawTip : a < 0.2 ? P.clawLo : P.claw, x, y, z, 722, 0.03),
    stringCol: 0xd8ccb0,
    rail: (c) => {
      for (let z = 22; z <= 66; z++) for (const x of [-1, 0]) c.set(x, 3, z, J(P.bone, x, z, 0, 723, 0.04));
    },
    decor: (c) => {
      for (let x = -5; x <= 4; x++) for (let y = -3; y <= 3; y++) for (let z = 56; z <= 63; z++) {
        if (y < -1 && Math.abs(x + 0.5) > 2.6) continue;
        c.set(x, y, z, J(Math.abs(x + 0.5) > 3.6 ? P.boneLo : P.bone, x, y, z, 724, 0.04));
      }
      teethRow(c, [-4, 0, 64], [3, 0, 64], 5, [0, 0, 1], 3, 1, { body: P.fang, tip: 0xffffff }, 725);
      horn(c, curve((t) => [0, -1 - t * 2, -11 - t * 5], 6), 3.2, 1.4, BONE, { ridges: 2 });
    },
  });
}

/** A bone staff crowned with a small rex skull; the amber eye still burns. */
function rexStaff(K) {
  const c = K.ctx();
  K.rod(c, -14, 86, 2, (x, y, z) => J(z % 12 === 0 ? P.boneLo : P.bone, x, y, z, 726, 0.04));
  hideGrip(K, c, -6, 26, 2.2);
  for (const z of [46, 66]) K.rod(c, z, z + 3, 2.6, hideCol);
  horn(c, curve((t) => [0, 0, -14 - t * 6], 6), 2.6, 0.8, BONE, { ridges: 2 });
  // Skull: cranium, long snout, open jaw lined with teeth, pointing forward (+y face).
  K.ball(c, 0, 0, 96, 7.6, (x, y, z) => J(hash3(x >> 1, y >> 1, z >> 1, 727) < 0.15 ? P.boneLo : P.bone, x, y, z, 728, 0.04));
  tube(c, curve((t) => [0, 3 + t * 9, 98 - t * 2], 10), (t) => lerp(6.4, 4.4, t), (t, d, x, y, z) => J(P.bone, x, y, z, 729, 0.04));
  tube(c, curve((t) => [0, 2 + t * 8, 92 - t * 2], 9), (t) => lerp(4.2, 3, t), (t, d, x, y, z) => J(P.boneLo, x, y, z, 730, 0.04));
  teethRow(c, [-3.6, 6, 95], [-3.6, 13, 95], 4, [0, 0, -1], 2.6, 0.8, { body: P.fang, tip: 0xffffff }, 731);
  teethRow(c, [3.6, 6, 95], [3.6, 13, 95], 4, [0, 0, -1], 2.6, 0.8, { body: P.fang, tip: 0xffffff }, 732);
  for (const sx of [-1, 1]) eyeGem(c, [sx * 5.6, 3, 99], 2.2, P.eye, P.pupil, P.boneDark);
  K.orb(c, 0, 10, 94, 2.6, P.eyeHi, P.eye, 0xff7a1a);
  return c.done();
}

export function rexWeapons(K) {
  return {
    rexblade: () => rexBlade(K),
    rexgreatsword: () => rexGreatsword(K),
    rexhammer: () => rexHammer(K),
    rexspear: () => rexSpear(K),
    rexbow: () => rexBow(K),
    rexcrossbow: () => rexCrossbow(K),
    rexstaff: () => rexStaff(K),
  };
}

