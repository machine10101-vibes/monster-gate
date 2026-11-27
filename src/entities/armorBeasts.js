import { hash3, jitter, shade, mix } from '../engine/voxel.js';
import { BUDGE } from '../data/budge.js';
import { DARK } from '../data/darksycle.js';
import { VOLC } from '../data/volcanum.js';
import { YETI } from '../data/yeti.js';

/**
 * Bespoke monster-part armor. Every set here has its own silhouette, built from the
 * monster it came from, instead of sharing one leather or one cloth template:
 *
 *   Budgefang   dragonhide ranger with ear frills and belly scutes; wing-silk mage with
 *               swept membrane hood and mantle wings
 *   Dusk        masked shadow stalker in cross-strapped wraps; gloom sorcerer with a tall
 *               leaning cowl, void face and tattered hem
 *   Volcanum    forge-walker in cracked, ember-seamed hide with an obsidian crest; magma
 *               sage with a burning crown and floating crystal shards
 *   Yeti        trapper buried in a shaggy eared hood and mantle; frost mystic with a fur
 *               parka ring, ice circlet and an icicle hem
 *   Raptor      pack hunter with a feather crest and sickle-claw boots; storm caller in
 *               a layered feather cloak
 *   Rex         hunter wearing the upper jaw as a cap with a tooth necklace and claw
 *               pauldrons; shaman under a full skull headdress; and Rex plate, an
 *               armored rex head helm with scute shoulders and three-toed sabatons
 *
 * Canvases (voxels): head 20x24x20 (face toward +z, rowY(r) = r + 1), torso 26 wide with
 * ty(y) rows (body x 5..20, z 4..13, chest y 5..19), arm 14x30x14 (hand y 0..6, shoulder
 * y 21..27), leg 14x30x16 (foot y 0..4, thigh y 12..24).
 */

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));
const TAU = Math.PI * 2;

function box(set, x0, y0, z0, x1, y1, z1, fn) {
  for (let z = z0; z < z1; z++)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const c = typeof fn === 'function' ? fn(x, y, z) : fn;
        if (c !== null && c !== undefined) set(x, y, z, c);
      }
}

/* ------------------------------ head shells ------------------------------ */

/** A close cap over the crown, sides and back; the face stays open. */
function capShell(set, rowY, fn, { r = 8.1, crown = 3.2, low = 3 } = {}) {
  for (let y = rowY(low); y <= rowY(14) + 3; y++)
    for (let z = 3; z <= 16; z++)
      for (let x = 3; x <= 16; x++) {
        const dx = (x + 0.5 - 10) / r;
        const dz = (z + 0.5 - 10) / r;
        const d2 = dx * dx + dz * dz;
        if (d2 > 1) continue;
        const upper = y >= rowY(7);
        const top = rowY(12) + Math.round(crown * (1 - d2 * 0.95) * (1 - d2 * 0.3));
        if (upper && y > top) continue;
        const side = Math.abs(x + 0.5 - 10) >= 5;
        if (!upper && !(side || z <= 6)) continue;
        if (!upper && y < rowY(low) + 1 && z > 11) continue;
        if (z >= 14 && y < rowY(9)) continue;
        set(x, y, z, fn(x, y, z, upper));
      }
}

/** A loose hood falling to the shoulders, open in front of the face. */
function hoodShell(set, rowY, fn, { r = 8.6, crown = 3.6 } = {}) {
  for (let y = rowY(0); y <= rowY(14) + 3; y++)
    for (let z = 2; z <= 17; z++)
      for (let x = 2; x <= 17; x++) {
        const dx = (x + 0.5 - 10) / r;
        const dz = (z + 0.5 - 10) / r;
        const d2 = dx * dx + dz * dz;
        if (d2 > 1) continue;
        const upper = y >= rowY(6);
        const top = rowY(12) + Math.round(crown * (1 - d2 * 0.9));
        if (upper && y > top) continue;
        if (z >= 14 && x >= 5 && x <= 14 && y < rowY(10)) continue;
        const side = Math.abs(x + 0.5 - 10) >= 5.2;
        if (!upper && !(side || z <= 6)) continue;
        if (!upper && y < rowY(2) && z > 6) continue;
        set(x, y, z, fn(x, y, z, upper));
      }
}

/** A thin swept fin or membrane: k runs out from the root, each step climbing and sweeping. */
function sweep(set, x0, y0, z0, n, step, width, col) {
  for (let k = 0; k < n; k++) {
    const x = Math.round(x0 + step[0] * k);
    const y = Math.round(y0 + step[1] * k);
    const z = Math.round(z0 + step[2] * k);
    const w = typeof width === 'function' ? width(k) : width;
    for (let a = 0; a < w; a++) set(x, y - a, z, col(k, a));
  }
}

/** A tapering horn or claw along a curve: base radius r0 to a point. */
function hornCurve(set, p0, p1, p2, r0, col, n = 10) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
    const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const z = u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2];
    const r = r0 * (1 - t * 0.85);
    const R = Math.ceil(r);
    for (let dz = -R; dz <= R; dz++)
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          if (dx * dx + dy * dy + dz * dz > r * r + 0.3) continue;
          set(Math.round(x + dx), Math.round(y + dy), Math.round(z + dz), col(t));
        }
  }
}

/* ------------------------------ torso shells ------------------------------ */

/** Front, back and side panels of the upper body from row y0 to y1. */
function bodyShell(set, y0, y1, fn, front = 14) {
  for (let y = y0; y <= y1; y++) {
    for (let x = 5; x <= 20; x++) {
      set(x, y, 13, fn(x, y, 13));
      if (front > 13) set(x, y, front, fn(x, y, front));
      set(x, y, 4, fn(x, y, 4));
    }
    for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, fn(x, y, z));
  }
}

/** The shoulder line across the top of the body, leaving the neck open. */
function shoulderTop(set, y, fn, open = 7) {
  for (let x = 4; x <= 21; x++)
    for (let z = 3; z <= 14; z++) {
      if (x > open && x < 25 - open && z > 4 && z < 13) continue;
      set(x, y, z, fn(x, y, z));
    }
}

/** A robe skirt below the belt, front and back panels and sides, from y0 down to y1. */
function skirt(set, y0, y1, fn, flare = 0.15) {
  for (let y = y1; y <= y0; y++) {
    const f = Math.round((y0 - y) * flare);
    for (let x = 7 - f; x <= 18 + f; x++) {
      set(x, y, 14, fn(x, y, 14));
      set(x, y, 3, fn(x, y, 3));
    }
    for (const x of [6 - f, 19 + f]) for (let z = 4; z <= 13; z++) set(x, y, z, fn(x, y, z));
  }
}

/* ------------------------------ limb shells ------------------------------ */

const limb = (set, y0, y1, fn, x0 = 2, x1 = 11, z0 = 2, z1 = 11) => box(set, x0, y0, z0, x1, y1, z1, (x, y, z) => fn(x, y, z));

/* ============================== palettes ============================== */

const RAP = { olv: 0x7d8438, olvLo: 0x555c26, olvHi: 0x939b4c, tan: 0xbba76a, tanLo: 0x9c8a52, claw: 0xe9dfbc, clawLo: 0xb8a878, strap: 0x3c2e18, strapHi: 0x5c4826, eye: 0xe8962a, feather: 0x4e5a24, featherTip: 0xd8c88a, blue: 0x3a6a8a };
const REX = { grn: 0x56702e, grnLo: 0x3d5222, grnHi: 0x6f8a3a, tan: 0xb39a68, red: 0x8a2a24, redLo: 0x5a1612, fang: 0xf0e6cc, fangLo: 0xc8b890, bone: 0xe0d4b4, boneLo: 0xa89878, strap: 0x3a2a18, strapHi: 0x5a4226, eye: 0xffa818 };

const budgeScale = (x, y, z, s = 0) => {
  const row = y >> 1;
  const p = (x + z + (row & 1) * 2) % 4;
  return J(p === 0 ? BUDGE.scaleLo : p === 3 ? BUDGE.scaleHi : BUDGE.scale, x, y, z, 700 + s, 0.04);
};
const raptorScale = (x, y, z, s = 0) => {
  const row = y >> 1;
  const h = hash3((x + (row & 1)) >> 1, row, (z + (row & 1)) >> 1, 710 + s);
  return J(h < 0.4 ? RAP.olv : h < 0.62 ? RAP.olvLo : h < 0.9 ? RAP.tan : RAP.tanLo, x, y, z, 711 + s, 0.035);
};
const rexHide = (x, y, z, s = 0) => {
  const v = z * 0.5 - y * 0.7 + Math.round(Math.sin(x * 0.4) * 1.5);
  const f = ((v % 7) + 7) % 7;
  if (f < 1) return J(f < 0.45 ? REX.redLo : REX.red, x, y, z, 720 + s, 0.04);
  const h = hash3(x >> 1, y >> 1, z >> 1, 721 + s);
  return J(h < 0.5 ? REX.grn : h < 0.75 ? REX.grnLo : h < 0.92 ? REX.grnHi : REX.tan, x, y, z, 722 + s, 0.04);
};
const fur = (base, lo, hi) => (x, y, z, s = 0) => {
  const h = hash3(x, y >> 1, z, 730 + s);
  return J(h < 0.3 ? lo : h > 0.82 ? hi : base, x, y, z, 731 + s, 0.05);
};
const yetiFur = fur(YETI.fur, YETI.furLo, YETI.furWhite);
const feather = (x, y, z, s = 0) => {
  const band = ((y + (x >> 1)) % 4 + 4) % 4;
  return J(band === 0 ? RAP.featherTip : band === 1 ? RAP.olvHi : RAP.feather, x, y, z, 740 + s, 0.04);
};

/* ============================== Budgefang ============================== */

function budgeLeather() {
  const hide = (x, y, z) => J(((x + (y >> 2)) & 3) === 0 ? 0x376b2b : 0x4f8f3c, x, y, z, 801, 0.05);
  const strap = (x, y, z) => J(0x6b4a2a, x, y, z, 802, 0.05);
  const belly = (x, y, z) => J(y % 3 === 0 ? BUDGE.bellyDark : BUDGE.belly, x, y, z, 803, 0.04);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      capShell(set, rowY, (x, y, z, up) => (up && (x === 9 || x === 10) ? budgeScale(x, y, z, 1) : hide(x, y, z)), { crown: 2.6 });
      // Scaled brow ridge with a nose guard of horn.
      for (let x = 4; x <= 15; x++) set(x, rowY(9), 16, budgeScale(x, 9, 16, 2));
      for (let y = rowY(6); y <= rowY(9); y++) set(9, y, 17, J(BUDGE.horn, 9, y, 17, 3)), set(10, y, 17, J(BUDGE.hornDark, 10, y, 17, 4));
      // Frilled ear fins: green membrane fans on cream ribs, swept back from the temples.
      for (const s of [-1, 1]) {
        const bx = s < 0 ? 2 : 17;
        for (let rib = 0; rib < 3; rib++)
          sweep(set, bx, rowY(8) + rib * 2, 12 - rib, 6, [s * 0.35, 0.45, -0.9], (k) => (k < 2 ? 2 : 1), (k, a) => (a === 0 ? J(BUDGE.horn, k, rib, 0, 805) : J(BUDGE.scaleHi, k, rib, a, 806)));
        for (let y = rowY(8); y <= rowY(13); y++)
          for (let z = 5; z <= 11; z++) if ((y + z) % 2 === 0 && hash3(y, z, s, 807) > 0.3) set(bx + s * (z < 8 ? 1 : 0), y, z, J(BUDGE.scale, y, z, s, 808));
      }
      // A row of short horn studs down the crown.
      for (let z = 5; z <= 13; z += 2) set(9, rowY(14) + 1, z, J(BUDGE.horn, 9, z, 0, 809)), set(10, rowY(14) + 1, z, J(BUDGE.hornDark, 10, z, 0, 810));
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, hide);
      // Cream belly scutes down the front, ridged like the dragon's underside.
      for (let y = 6; y <= 17; y++)
        for (let x = 8; x <= 17; x++) {
          const w = 5 - Math.abs(12.5 - x);
          if (w < 0.5 + (y < 8 ? 1 : 0)) continue;
          set(x, y, 15, belly(x, y, 15));
        }
      // A scalloped scale capelet across the shoulders, lapping down over the chest and back.
      shoulderTop(set, 19, (x, y, z) => budgeScale(x, y, z, 11));
      for (let x = 4; x <= 21; x++) {
        const drop = 2 + ((x >> 1) % 2);
        for (let k = 0; k < drop; k++) {
          set(x, 18 - k, 16 - (k > 1 ? 1 : 0), budgeScale(x, 18 - k, 16, 12));
          set(x, 18 - k, 2, budgeScale(x, 18 - k, 2, 13));
        }
      }
      // Belt with a claw toggle, and a quiver strap across the back.
      for (let x = 4; x <= 21; x++) set(x, 5, 15, strap(x, 5, 15)), set(x, 5, 3, strap(x, 5, 3));
      box(set, 11, 4, 16, 14, 7, 17, J(BUDGE.claw, 0, 0, 0, 814));
      for (let k = 0; k < 12; k++) set(7 + k, 7 + k, 2, J(0x8c6336, k, 0, 0, 815));
    },
    paintArm(A, set) {
      limb(set, 6, 15, (x, y, z) => (y === 6 || y === 14 ? strap(x, y, z) : budgeScale(x, y, z, 20)));
      box(set, 3, 3, 3, 10, 6, 11, (x, y, z) => hide(x, y, z));
      for (const x of [4, 6, 8]) set(x, 3, 11, J(BUDGE.claw, x, 3, 11, 821)), set(x, 2, 12, J(BUDGE.claw, x, 2, 12, 822));
      // Dorsal fin spikes along the outer forearm.
      for (let y = 7; y <= 14; y += 2) for (let k = 0; k < 2 + ((y >> 1) & 1); k++) set(11 + k, y + k, 6, J(k ? BUDGE.horn : BUDGE.hornDark, y, k, 0, 823));
      // Shoulder: layered scale capelet, three tiers.
      for (let tier = 0; tier < 3; tier++) box(set, 2 - tier, 21 + tier * 2, 2 - (tier === 0 ? 1 : 0), 12 + (tier === 0 ? 1 : 0), 23 + tier * 2, 12 + (tier === 0 ? 1 : 0), (x, y, z) => (y === 21 + tier * 2 ? J(BUDGE.scaleLo, x, y, z, 824 + tier) : budgeScale(x, y, z, 30 + tier)));
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        limb(set, 12, 24, (x, y, z) => (y === 23 ? strap(x, y, z) : hide(x, y, z)));
        box(set, 3, 13, 11, 10, 22, 12, (x, y, z) => budgeScale(x, y, z, 40));
        hornCurve(set, [6, 12, 12], [6, 13, 14], [6, 15, 15], 1.2, (t) => (t > 0.6 ? BUDGE.claw : BUDGE.horn), 6);
      }
      if (flags.boots) {
        limb(set, 3, 10, (x, y, z) => (y === 9 ? strap(x, y, z) : budgeScale(x, y, z, 41)));
        box(set, 2, 0, 2, 11, 3, 13, (x, y, z) => (y === 0 ? J(0x2a2014, x, y, z, 830) : hide(x, y, z)));
        // Dragon-foot toes: three curled claws.
        for (const x of [3, 6, 9]) hornCurve(set, [x + 0.5, 1.5, 12.5], [x + 0.5, 1.5, 14.5], [x + 0.5, 0, 15], 1.1, (t) => (t > 0.5 ? BUDGE.claw : BUDGE.hornDark), 5);
      }
    },
  };
}

function budgeCloth() {
  const silk = (x, y, z) => J(((x + y + (z >> 1)) & 3) === 0 ? 0x1f8a4c : 0x2fae62, x, y, z, 851, 0.04);
  const gold = (x, y, z) => J(y % 2 ? 0xe6d27a : 0xf6e6a0, x, y, z, 852, 0.03);
  const ember = BUDGE.ember || 0xff8a2a;
  const membrane = (k, a) => J(a === 0 ? BUDGE.horn : mix(0x66d890, 0x2fae62, k / 8), k, a, 0, 853, 0.04);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      hoodShell(set, rowY, (x, y, z) => silk(x, y, z));
      for (let x = 4; x <= 15; x++) for (const z of [15, 16]) set(x, rowY(10), z, gold(x, 10, z));
      // Two wing membranes swept back off the crown, each with three horn ribs.
      for (const s of [-1, 1]) {
        const bx = s < 0 ? 6 : 13;
        for (let rib = 0; rib < 3; rib++) sweep(set, bx + s * rib, rowY(13) + 1, 12 - rib * 2, 7 - rib, [s * 0.55, 0.6, -0.75], (k) => Math.max(1, 3 - (k >> 1)), membrane);
      }
      for (const x of [9, 10]) set(x, rowY(11), 17, ember, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, silk);
      skirt(set, 4, -10, (x, y, z) => (y === -10 ? gold(x, y, z) : y % 5 === 0 ? J(0x1f8a4c, x, y, z, 854) : silk(x, y, z)), 0.2);
      // A mantle of wing-silk: two membranes spreading out from each shoulder.
      shoulderTop(set, 19, silk);
      for (const s of [-1, 1]) {
        const bx = s < 0 ? 4 : 21;
        for (let rib = 0; rib < 4; rib++) sweep(set, bx, 19 - rib * 3, 8, 4, [s * 0.9, -0.35, 0], 2, membrane);
      }
      // Ember sash across the body, gold scale embroidery down the front.
      for (let k = 0; k < 15; k++) for (const d of [0, 1]) set(6 + k, 17 - k + d, 15, J(ember, k, d, 0, 855, 0.05));
      for (let y = -8; y <= 3; y += 2) for (const x of [9, 16]) set(x, y, 15, gold(x, y, 15));
      box(set, 11, 14, 15, 14, 17, 16, J(BUDGE.belly, 0, 0, 0, 856));
      set(12, 15, 16, ember, true);
      set(13, 15, 16, ember, true);
    },
    paintArm(A, set) {
      limb(set, 10, 21, (x, y, z) => silk(x, y, z), 3, 10, 3, 10);
      // Bell cuffs edged in gold with a trailing membrane.
      box(set, 1, 6, 1, 12, 10, 12, (x, y, z) => (y === 6 ? gold(x, y, z) : silk(x, y, z)));
      for (let y = 3; y < 10; y++) for (let z = 3; z <= 9; z++) if ((y + z) % 3) set(12, y, z, J(0x66d890, y, z, 0, 857));
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => (y === 23 ? gold(x, y, z) : silk(x, y, z)));
    },
    paintLeg(set, flags) {
      if (flags.legs) limb(set, 12, 23, (x, y, z) => (y === 12 ? gold(x, y, z) : silk(x, y, z)));
      if (flags.boots) {
        box(set, 2, 0, 3, 11, 4, 13, (x, y, z) => (y === 3 ? gold(x, y, z) : silk(x, y, z)));
        // Curled toes.
        for (let k = 0; k < 4; k++) set(6, 1 + k, 13 + (k < 2 ? k : 1), J(0xf6e6a0, k, 0, 0, 858));
        set(6, 5, 13, ember, true);
      }
    },
  };
}

/* ============================== Dusk ============================== */

function darkLeather() {
  const wrap = (x, y, z) => J(((x + (y >> 1)) & 3) === 0 ? 0x251f48 : 0x3b3268, x, y, z, 901, 0.05);
  const band = (x, y, z) => J(0x1d1736, x, y, z, 902, 0.04);
  const rune = DARK.glow || 0xff4fb8;
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      capShell(set, rowY, (x, y, z, up) => (up && (y + z) % 4 === 0 ? band(x, y, z) : wrap(x, y, z)), { crown: 2.4, low: 2 });
      // A cloth mask over the mouth and nose, tied at the back with trailing tails.
      for (let y = rowY(3); y <= rowY(7); y++) for (let x = 4; x <= 15; x++) set(x, y, 16, y === rowY(7) ? band(x, y, 16) : wrap(x, y, 16));
      for (let k = 0; k < 6; k++) set(9 + (k & 1), rowY(6) - k, 2, band(k, 0, 0)), set(11 - (k & 1), rowY(6) - k - 1, 2, J(0x372d62, k, 1, 0, 903));
      // Swept violet fin on each temple and a glowing slit across the eyes.
      for (const s of [-1, 1]) sweep(set, s < 0 ? 3 : 16, rowY(9), 13, 9, [s * 0.2, 0.55, -0.95], (k) => (k < 3 ? 3 : k < 6 ? 2 : 1), (k, a) => J(a ? DARK.bladeDark : DARK.blade, k, a, s, 904, 0.03));
      for (const x of [5, 14]) set(x, rowY(9), 16, rune, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, wrap);
      // Crossed straps front and back with glowing rune studs where they meet.
      for (let k = 0; k <= 12; k++)
        for (const x of [6 + k, 19 - k]) {
          set(x, 6 + k, 15, band(x, k, 15));
          set(x, 6 + k, 3, band(x, k, 3));
        }
      for (const [x, y] of [[12, 12], [13, 12], [12, 13], [13, 13]]) set(x, y, 16, rune, true);
      // High wrapped collar.
      for (let x = 7; x <= 18; x++) for (const y of [19, 20]) set(x, y, 14, wrap(x, y, 14)), set(x, y, 5, wrap(x, y, 5));
      shoulderTop(set, 19, band, 6);
      // Twin daggers sheathed across the back.
      for (const s of [-1, 1]) for (let k = 0; k < 10; k++) {
        const x = 12 + s * (k * 0.5 - 2);
        set(Math.round(x), 8 + k, 2, k > 6 ? J(0xd8d3ee, k, s, 0, 905) : J(0x14102a, k, s, 0, 906));
      }
      // Wrapped sash tails at the hip.
      for (let y = -6; y <= 5; y++) set(18, y, 14, band(18, y, 14)), set(17, y - 1, 14, wrap(17, y, 14));
    },
    paintArm(A, set) {
      // Spiral wraps up the forearm, a talon bone along the outside.
      limb(set, 5, 16, (x, y, z) => ((x + z + y * 2) % 6 < 2 ? band(x, y, z) : wrap(x, y, z)));
      box(set, 3, 3, 3, 10, 5, 11, wrap);
      hornCurve(set, [11.5, 8, 6.5], [13, 11, 6.5], [12.5, 15, 6.5], 1.1, (t) => (t > 0.6 ? DARK.edge : DARK.blade), 6);
      // A small curved guard on the shoulder rather than a pauldron.
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => (y === 23 ? band(x, y, z) : wrap(x, y, z)));
      sweep(set, 11, 24, 4, 6, [0.25, 0.5, 0.9], 2, (k, a) => J(a ? DARK.bladeDark : DARK.blade, k, a, 0, 907));
      set(6, 12, 12, rune, true);
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        limb(set, 12, 24, (x, y, z) => (y === 12 || y === 23 ? band(x, y, z) : wrap(x, y, z)));
        limb(set, 13, 17, (x, y, z) => ((x + z) % 3 === 0 ? band(x, y, z) : null), 1, 12, 1, 12);
      }
      if (flags.boots) {
        // Split-toe wraps bound up the shin.
        limb(set, 2, 11, (x, y, z) => ((x + z + y * 2) % 6 < 2 ? band(x, y, z) : wrap(x, y, z)));
        box(set, 2, 0, 3, 11, 2, 13, (x, y, z) => (x === 5 && z > 9 ? null : band(x, y, z)));
        set(10, 1, 8, rune, true);
      }
    },
  };
}

function darkCloth() {
  const robe = (x, y, z) => J(((x + y + (z >> 1)) & 3) === 0 ? 0x33296a : 0x4a3a9c, x, y, z, 951, 0.04);
  const deep = (x, y, z) => J(0x1a1430, x, y, z, 952, 0.04);
  const trim = (x, y, z) => J(0x8a7ad0, x, y, z, 953, 0.04);
  const glow = DARK.glow || 0xff4fb8;
  const glowHi = DARK.glowHi || 0xffb0e0;
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      hoodShell(set, rowY, (x, y, z) => robe(x, y, z), { crown: 3 });
      // The face is lost in shadow: a dark void with two eyes burning in it.
      for (let y = rowY(3); y < rowY(10); y++) for (let x = 5; x <= 14; x++) set(x, y, 15, deep(x, y, 15));
      for (const x of [7, 12]) set(x, rowY(7), 16, glowHi, true), set(x + (x < 10 ? 1 : -1), rowY(7), 16, glow, true);
      // A tall cowl tip that leans forward over the brow.
      for (let k = 0; k < 9; k++) {
        const w = k < 3 ? 3 : k < 6 ? 2 : 1;
        box(set, 9 - (w >> 1), rowY(15) + k, 9 + Math.round(k * 0.7), 9 - (w >> 1) + w, rowY(15) + k + 1, 9 + Math.round(k * 0.7) + w, (x, y, z) => robe(x, y, z));
      }
      // A floating crescent above the brow.
      for (let a = 0; a < 9; a++) {
        const ang = Math.PI * (0.15 + a * 0.09);
        set(Math.round(9.5 + Math.cos(ang) * 3), rowY(13) + Math.round(Math.sin(ang) * 2), 18, a === 4 ? glowHi : glow, true);
      }
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, robe);
      // A long robe with a torn, uneven hem.
      skirt(set, 4, -11, (x, y, z) => {
        const tear = -11 + Math.floor(hash3(x, 0, z, 954) * 4);
        if (y < tear) return null;
        return y === tear ? deep(x, y, z) : robe(x, y, z);
      }, 0.22);
      // Spiked collar of dusk plates.
      shoulderTop(set, 19, deep);
      for (let x = 6; x <= 19; x += 2) {
        set(x, 20, 14, trim(x, 20, 14));
        set(x, 21, 14, J(DARK.blade, x, 21, 14, 955));
      }
      // The gloom core and its rays.
      for (let y = 10; y <= 15; y++) for (let x = 10; x <= 15; x++) {
        const d = Math.abs(x - 12.5) + Math.abs(y - 12.5);
        if (d < 1.6) set(x, y, 16, glowHi, true);
        else if (d < 3.1) set(x, y, 15, glow, true);
      }
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let k = 3; k < 6; k++) set(Math.round(12.5 + dx * k), Math.round(12.5 + dy * k), 15, trim(k, dx, dy));
      for (let x = 6; x <= 19; x += 3) set(x, -8, 15, glow, true);
    },
    paintArm(A, set) {
      limb(set, 10, 21, robe, 3, 10, 3, 10);
      // Ragged sleeves hanging past the hand.
      box(set, 1, 3, 1, 12, 11, 12, (x, y, z) => {
        const tear = 3 + Math.floor(hash3(x, 0, z, 956) * 4);
        if (y < tear) return null;
        if (x > 1 && x < 11 && z > 1 && z < 11 && y < 9) return null;
        return y === tear ? deep(x, y, z) : robe(x, y, z);
      });
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => (y === 23 ? trim(x, y, z) : robe(x, y, z)));
      set(11, 22, 6, glow, true);
    },
    paintLeg(set, flags) {
      if (flags.legs) limb(set, 12, 23, robe);
      if (flags.boots) {
        box(set, 2, 0, 3, 11, 5, 12, (x, y, z) => (y === 4 ? trim(x, y, z) : deep(x, y, z)));
        set(6, 2, 12, glow, true);
      }
    },
  };
}

/* ============================== Volcanum ============================== */

function volcLeather() {
  const char = (x, y, z) => J(((x * 3 + y + z) & 7) === 0 ? 0x4a4048 : ((x + y) & 3) === 0 ? 0x161214 : 0x2a2428, x, y, z, 1001, 0.04);
  const glow = VOLC.glow || 0xff6a12;
  const glowHi = VOLC.glowHi || 0xffe08a;
  // Ember cracks: thin glowing veins wandering across the hide.
  const crack = (x, y, z) => {
    const v = Math.sin(x * 0.9 + y * 0.55) + Math.sin(z * 0.8 - y * 0.4);
    return Math.abs(v) < 0.18;
  };
  const hide = (set) => (x, y, z, c) => (crack(x, y, z) ? set(x, y, z, hash3(x, y, z, 1002) > 0.6 ? glowHi : glow, true) : set(x, y, z, c));
  return {
    paintHelm(H, rowY) {
      const raw = (x, y, z, c, g) => H.set(x, y, z, c, g);
      const set = hide(raw);
      capShell(raw, rowY, (x, y, z) => char(x, y, z), { crown: 2.8 });
      for (let y = rowY(8); y <= rowY(14) + 2; y++) for (let z = 3; z <= 16; z++) for (let x = 3; x <= 16; x++) if (H.has(x, y, z) && crack(x, y, z)) set(x, y, z, 0);
      // Smith's goggles: two round lenses glowing orange on a band.
      for (let x = 3; x <= 16; x++) raw(x, rowY(9), 16, J(0x3a2014, x, 9, 16, 1003));
      for (const cx of [6.5, 12.5]) for (let y = rowY(8); y <= rowY(10); y++) for (let x = Math.floor(cx - 1.5); x <= Math.ceil(cx + 0.5); x++) {
        const edge = y === rowY(8) || y === rowY(10) || x === Math.floor(cx - 1.5) || x === Math.ceil(cx + 0.5);
        raw(x, y, 17, edge ? J(0x6a6e76, x, y, 17, 1004) : glow, !edge);
      }
      // Obsidian crest: a ridge of black blades down the crown.
      for (let z = 4; z <= 15; z += 2) {
        const h = 2 + ((z * 7) % 3);
        for (let k = 0; k < h; k++) raw(9, rowY(14) + 1 + k, z, J(k === h - 1 ? VOLC.edge || 0xffe08a : 0x101014, z, k, 0, 1005));
        raw(10, rowY(14) + 1, z, J(0x1c1c22, z, 0, 1, 1006));
      }
    },
    paintChest(T, ty) {
      const raw = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      const set = hide(raw);
      bodyShell(raw, 5, 18, (x, y, z) => char(x, y, z));
      for (let y = 5; y <= 18; y++) for (let x = 4; x <= 21; x++) for (const z of [4, 13, 14]) if (crack(x, y, z)) set(x, y, z, 0);
      // A heavy forge apron from chest to knee, riveted, scorched at the hem.
      for (let y = -9; y <= 15; y++) for (let x = 8; x <= 17; x++) {
        if (y > 12 && (x < 10 || x > 15)) continue;
        raw(x, y, 15, y < -7 ? J(0x1a0e08, x, y, 15, 1007) : J(((x + y) & 3) === 0 ? 0x4a2a18 : 0x5a3420, x, y, 15, 1008));
      }
      for (const [x, y] of [[8, 13], [17, 13], [8, 0], [17, 0], [8, -8], [17, -8]]) raw(x, y, 16, J(0x8a8e94, x, y, 16, 1009));
      // Obsidian studs across the shoulders.
      shoulderTop(raw, 19, (x, y, z) => char(x, y, z));
      for (let x = 4; x <= 21; x += 3) raw(x, 20, 9, J(0x101014, x, 20, 9, 1010)), raw(x, 21, 9, J(VOLC.scaleHi || 0x3a3a44, x, 21, 9, 1011));
    },
    paintArm(A, set0) {
      const set = hide(set0);
      // Heavy gauntlet gloves: scorched, cracked with ember.
      box(set0, 1, 1, 1, 12, 13, 12, (x, y, z) => (y === 12 ? J(0x3a2014, x, y, z, 1012) : char(x, y, z)));
      for (let y = 1; y < 12; y++) for (let z = 1; z < 12; z++) for (const x of [1, 11]) if (crack(x, y, z)) set(x, y, z, 0);
      for (const x of [3, 6, 9]) set0(x, 4, 12, J(0x101014, x, 4, 12, 1013));
      // A shard pauldron of obsidian, one jagged spike.
      box(set0, 2, 21, 2, 11, 25, 12, (x, y, z) => (y === 21 ? J(0x101014, x, y, z, 1014) : char(x, y, z)));
      hornCurve(set0, [10, 24, 6.5], [12, 26, 6.5], [13, 29, 6.5], 1.6, (t) => (t > 0.7 ? VOLC.edge || 0xffe08a : 0x101014), 6);
    },
    paintLeg(set0, flags) {
      const set = hide(set0);
      if (flags.legs) {
        limb(set0, 12, 24, char);
        for (let y = 12; y < 24; y++) for (const z of [2, 10]) for (let x = 2; x < 11; x++) if (crack(x, y, z)) set(x, y, z, 0);
      }
      if (flags.boots) {
        limb(set0, 2, 11, (x, y, z) => (y === 10 ? J(0x3a2014, x, y, z, 1015) : char(x, y, z)));
        // Obsidian toe plates and an ember-lit sole.
        box(set0, 2, 0, 2, 11, 3, 14, (x, y, z) => (y === 0 ? glow : z > 11 ? J(0x101014, x, y, z, 1016) : char(x, y, z)));
      }
    },
  };
}

function volcCloth() {
  const robe = (x, y, z) => {
    const t = Math.max(0, Math.min(1, (y + 10) / 28));
    return J(mix(0x1a0c2c, ((x + y) & 3) === 0 ? 0x241448 : 0x3a2068, t), x, y, z, 1051, 0.04);
  };
  const glow = VOLC.glow || 0xff6a12;
  const glowHi = VOLC.glowHi || 0xffe08a;
  const crystal = (k) => (k > 3 ? 0xd8a8ff : 0x9a5adc);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      hoodShell(set, rowY, (x, y, z) => robe(x, y + 10, z));
      // A crown of flame rising from a band at the brow.
      for (let x = 4; x <= 15; x++) set(x, rowY(11), 17, J(0x6a3820, x, 11, 17, 1052));
      for (let x = 4; x <= 15; x++) {
        const h = 2 + Math.round(2.5 * Math.abs(Math.sin(x * 1.3)));
        for (let k = 0; k < h; k++) set(x, rowY(12) + k, 17 - (k >> 1), k === h - 1 ? glowHi : glow, true);
      }
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, robe);
      // Lava climbs the hem: molten at the bottom, cooling to dark violet.
      skirt(set, 4, -10, (x, y, z) => {
        if (y <= -8) return hash3(x, y, z, 1053) > 0.4 ? glowHi : glow;
        if (y === -7 && hash3(x, 0, z, 1054) > 0.5) return glow;
        return robe(x, y, z);
      }, 0.18);
      shoulderTop(set, 19, robe);
      // A hearth core clasp and lava stitching down the front opening.
      for (let y = -6; y <= 17; y += 2) set(12, y, 15, glow, true), set(13, y + 1, 15, glow, true);
      box(set, 11, 14, 15, 15, 18, 16, J(0x2a140c, 0, 0, 0, 1055));
      set(12, 15, 16, glowHi, true);
      set(13, 16, 16, glowHi, true);
      // Purple crystal shards standing off each shoulder.
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
        const x = s < 0 ? 4 - (k >> 2) : 21 + (k >> 2);
        set(x, 20 + k, 8, crystal(k), k > 3);
        set(x, 20 + k, 9, crystal(k), k > 3);
        if (k < 3) set(x + s, 20 + k, 7, 0x9a5adc);
      }
    },
    paintArm(A, set) {
      limb(set, 10, 21, (x, y, z) => robe(x, y, z), 3, 10, 3, 10);
      // Flared cuffs threaded with lava.
      box(set, 1, 5, 1, 12, 10, 12, (x, y, z) => (y === 5 ? glow : robe(x, y + 2, z)));
      for (let z = 2; z <= 10; z += 2) set(1, 7, z, glowHi, true);
      // Floating shard over the shoulder.
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => robe(x, y, z));
      for (let k = 0; k < 4; k++) set(6, 26 + k, 6, crystal(k + 2), true);
    },
    paintLeg(set, flags) {
      if (flags.legs) limb(set, 12, 23, (x, y, z) => robe(x, y - 6, z));
      if (flags.boots) {
        box(set, 2, 0, 3, 11, 5, 13, (x, y, z) => (y === 0 ? glow : robe(x, y - 12, z)));
        set(6, 2, 13, glowHi, true);
      }
    },
  };
}

/* ============================== Yeti ============================== */

function yetiLeather() {
  const hide = (x, y, z) => J(((x + (y >> 2)) & 3) === 0 ? YETI.leatherLo : YETI.leather, x, y, z, 1101, 0.05);
  const shag = (x, y, z) => yetiFur(x, y, z, 1);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      // A deep shaggy hood: fur all round, ragged at the edge.
      hoodShell(set, rowY, (x, y, z) => shag(x, y, z), { r: 8.9, crown: 3 });
      for (let x = 3; x <= 16; x++) for (let y = rowY(1); y <= rowY(10); y += 1) if (hash3(x, y, 0, 1102) > 0.55) set(x, y, 18, shag(x, y, 18));
      // Rounded yeti ears.
      for (const s of [-1, 1])
        for (let y = 0; y < 4; y++) for (let z = 0; z < 3; z++) {
          const x = s < 0 ? 4 - (y > 1 ? 1 : 0) : 15 + (y > 1 ? 1 : 0);
          set(x, rowY(14) + 1 + y, 8 + z, y === 3 && z !== 1 ? null : z === 1 && y < 3 ? J(YETI.skin, x, y, z, 1103) : shag(x, y, z));
        }
      // Fang clasp under the chin.
      for (const x of [8, 11]) set(x, rowY(2), 17, J(YETI.claw || 0xf2f9ff, x, 2, 17, 1104)), set(x, rowY(1), 17, J(YETI.claw || 0xf2f9ff, x, 1, 17, 1105));
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, hide);
      // A huge fur mantle around the neck and shoulders, standing out from the body.
      for (let y = 15; y <= 21; y++)
        for (let x = 2; x <= 23; x++)
          for (let z = 1; z <= 16; z++) {
            const dx = (x - 12.5) / 11;
            const dz = (z - 8.5) / 8;
            const d = dx * dx + dz * dz;
            const ring = d < 1 && d > 0.35 - (y - 15) * 0.04;
            if (!ring || (y > 19 && d < 0.5)) continue;
            if (hash3(x, y, z, 1106) < 0.12) continue;
            set(x, y, z, shag(x, y, z));
          }
      // Crossed straps and a necklace of claws.
      for (let k = 0; k <= 9; k++) for (const x of [7 + k, 18 - k]) set(x, 6 + k, 15, J(YETI.leatherLo, x, k, 0, 1107));
      for (let k = 0; k < 7; k++) {
        const x = 9 + k;
        const y = 14 - Math.round(Math.abs(k - 3) * -0.6) - 1;
        set(x, y, 16, J(YETI.claw || 0xf2f9ff, x, y, 16, 1108));
        set(x, y - 1, 16, k % 2 ? J(YETI.claw || 0xf2f9ff, x, y, 17, 1109) : null);
      }
      for (let x = 4; x <= 21; x++) set(x, 5, 15, J(YETI.leatherLo, x, 5, 15, 1110));
    },
    paintArm(A, set) {
      limb(set, 6, 20, hide);
      // Big fur cuffs at the wrist and a fur shoulder.
      box(set, 1, 5, 1, 12, 9, 12, (x, y, z) => (hash3(x, y, z, 1111) < 0.1 ? null : shag(x, y, z)));
      box(set, 2, 2, 2, 11, 5, 11, (x, y, z) => J(YETI.furLo, x, y, z, 1112));
      for (const x of [3, 6, 9]) set(x, 2, 11, J(YETI.claw || 0xf2f9ff, x, 2, 11, 1113));
      box(set, 1, 20, 1, 12, 26, 12, (x, y, z) => (hash3(x, y, z, 1114) < 0.12 ? null : shag(x, y, z)));
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        limb(set, 12, 24, (x, y, z) => (y % 5 === 0 ? shag(x, y, z) : hide(x, y, z)));
      }
      if (flags.boots) {
        // Great furred boots, wider than the leg.
        box(set, 1, 0, 1, 12, 11, 14, (x, y, z) => (y === 0 ? J(YETI.leatherLo, x, y, z, 1115) : hash3(x, y, z, 1116) < 0.08 && y > 6 ? null : shag(x, y, z)));
        for (const x of [3, 6, 9]) set(x, 1, 14, J(YETI.claw || 0xf2f9ff, x, 1, 14, 1117));
      }
    },
  };
}

function yetiCloth() {
  const parka = (x, y, z) => J(((x + y + (z >> 1)) & 3) === 0 ? 0x9dbfdc : 0xcfe2f1, x, y, z, 1151, 0.04);
  const shag = (x, y, z) => yetiFur(x, y, z, 2);
  const ice = YETI.ice;
  const iceHi = YETI.iceHi;
  const glow = YETI.glow || 0x7fd0ff;
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      hoodShell(set, rowY, (x, y, z) => parka(x, y, z));
      // A thick fur ring framing the face like a parka.
      for (let a = 0; a < 48; a++) {
        const ang = (a / 48) * TAU;
        const x = Math.round(9.5 + Math.cos(ang) * 6);
        const y = rowY(6) + Math.round(Math.sin(ang) * 5.5);
        for (const z of [16, 17]) set(x, y, z, shag(x, y, z));
      }
      // A circlet of ice shards floating over the brow.
      for (let x = 5; x <= 14; x++) {
        const h = 1 + ((x * 5) % 3);
        for (let k = 0; k < h; k++) set(x, rowY(13) + k, 16, k === h - 1 ? iceHi : ice, k === h - 1);
      }
      set(9, rowY(12), 17, glow, true);
      set(10, rowY(12), 17, glow, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, parka);
      skirt(set, 4, -9, (x, y, z) => (y === -9 || y === 4 ? shag(x, y, z) : parka(x, y, z)), 0.15);
      // Icicles hanging from the hem.
      for (let x = 6; x <= 19; x += 2) {
        const n = 1 + ((x * 3) % 4);
        for (let k = 1; k <= n; k++) set(x, -9 - k, 14, k === n ? iceHi : ice, k === n);
      }
      // Fur trim down the front opening and round the shoulders, a frostheart clasp.
      for (let y = -8; y <= 18; y++) set(12, y, 15, shag(12, y, 15)), set(13, y, 15, shag(13, y, 15));
      shoulderTop(set, 19, shag);
      for (let x = 4; x <= 21; x++) set(x, 20, x < 8 || x > 17 ? 9 : 4, shag(x, 20, 9));
      box(set, 11, 13, 16, 15, 17, 17, (x, y, z) => ((x + y) % 2 ? iceHi : ice));
      set(12, 15, 17, glow, true);
      set(13, 15, 17, glow, true);
    },
    paintArm(A, set) {
      limb(set, 8, 21, parka, 3, 10, 3, 10);
      // Fur mitts and fur cuffs.
      box(set, 2, 1, 2, 11, 7, 12, (x, y, z) => shag(x, y, z));
      box(set, 1, 7, 1, 12, 10, 12, (x, y, z) => (hash3(x, y, z, 1152) < 0.08 ? null : shag(x, y, z)));
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => (y === 23 ? shag(x, y, z) : parka(x, y, z)));
    },
    paintLeg(set, flags) {
      if (flags.legs) limb(set, 12, 23, (x, y, z) => (y === 12 ? shag(x, y, z) : parka(x, y, z)));
      if (flags.boots) box(set, 1, 0, 2, 12, 7, 13, (x, y, z) => (y === 0 ? J(YETI.leatherLo, x, y, z, 1153) : shag(x, y, z)));
    },
  };
}

/* ============================== Raptor ============================== */

function raptorLeather() {
  const strap = (x, y, z) => J(RAP.strap, x, y, z, 1201, 0.04);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      capShell(set, rowY, (x, y, z) => raptorScale(x, y, z, 1), { crown: 2.4 });
      // A beaked brow plate jutting over the eyes.
      for (let x = 5; x <= 14; x++) for (let k = 0; k < 2; k++) set(x, rowY(10) + k, 16 + k, J(k ? RAP.claw : RAP.clawLo, x, k, 0, 1202));
      for (let k = 0; k < 3; k++) set(9, rowY(10) - k, 18, J(RAP.claw, k, 0, 0, 1203)), set(10, rowY(10) - k, 18, J(RAP.clawLo, k, 1, 0, 1204));
      // A crest of feathers along the crown, rising toward the back.
      for (let z = 15; z >= 3; z--) {
        const h = 1 + Math.round((15 - z) * 0.45);
        for (let k = 0; k < h; k++) for (const x of [9, 10]) set(x, rowY(14) + 1 + k, z, feather(x, k, z, 3));
      }
      for (const x of [7, 12]) set(x, rowY(9), 16, RAP.eye, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, (x, y, z) => raptorScale(x, y, z, 10));
      // A feather mantle fanning out over the shoulders.
      shoulderTop(set, 19, feather);
      for (let x = 2; x <= 23; x++) {
        const len = 2 + ((x * 7) % 3);
        for (let k = 0; k < len; k++) {
          set(x, 20 - k, x < 5 || x > 20 ? 9 : 15, feather(x, k, 15, 11));
          set(x, 20 - k, 2, feather(x, k, 2, 12));
        }
      }
      // A baldric with a sickle claw trophy at the hip.
      for (let k = 0; k <= 13; k++) set(6 + k, 18 - k, 15, strap(6 + k, k, 15));
      hornCurve(set, [19, 5, 15], [21, 3, 16], [20, 0, 16], 1.3, (t) => (t > 0.6 ? RAP.claw : RAP.clawLo), 7);
      for (let x = 4; x <= 21; x++) set(x, 5, 15, strap(x, 5, 15));
    },
    paintArm(A, set) {
      limb(set, 6, 15, (x, y, z) => (y === 6 ? strap(x, y, z) : raptorScale(x, y, z, 20)));
      box(set, 3, 3, 3, 10, 6, 11, (x, y, z) => J(RAP.tanLo, x, y, z, 1205));
      // A fringe of feathers trailing from the outer forearm.
      for (let y = 7; y <= 14; y++) for (let k = 0; k < 3; k++) set(11 + k, y - k, 4 + (y % 3), feather(y, k, 0, 21));
      box(set, 2, 21, 2, 11, 25, 12, (x, y, z) => (y === 21 ? strap(x, y, z) : feather(x, y, z, 22)));
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        limb(set, 12, 24, (x, y, z) => raptorScale(x, y, z, 30));
        for (const y of [13, 18, 23]) box(set, 2, y, 2, 11, y + 1, 11, strap);
      }
      if (flags.boots) {
        limb(set, 3, 11, (x, y, z) => raptorScale(x, y, z, 31));
        box(set, 2, 0, 2, 11, 3, 13, (x, y, z) => (y === 0 ? J(RAP.strap, x, y, z, 1206) : J(RAP.tan, x, y, z, 1207)));
        // The raptor's own weapon: a raised sickle claw on the inner toe.
        hornCurve(set, [3, 3, 11], [2, 7, 13], [3, 5, 15], 1.4, (t) => (t > 0.55 ? RAP.claw : RAP.clawLo), 9);
        for (const x of [6, 9]) set(x, 1, 13, J(RAP.clawLo, x, 1, 13, 1208));
      }
    },
  };
}

function raptorCloth() {
  const robe = (x, y, z) => J(((x + y + (z >> 1)) & 3) === 0 ? RAP.tanLo : RAP.tan, x, y, z, 1251, 0.04);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      hoodShell(set, rowY, (x, y, z, up) => (up ? feather(x, y, z, 1) : robe(x, y, z)));
      // A beak-shaped brim and a long plume trailing down the back.
      for (let x = 4; x <= 15; x++) for (let k = 0; k < 2; k++) set(x, rowY(10) + k, 17 + k - (Math.abs(x - 9.5) > 4 ? 1 : 0), J(RAP.clawLo, x, k, 0, 1252));
      for (let k = 0; k < 12; k++) for (const x of [9, 10]) set(x, rowY(15) - Math.round(k * 0.9), 4 - Math.round(k * 0.25), feather(x, k, 0, 2));
      // Feather tufts swept up and back from each temple.
      for (const sd of [-1, 1]) for (let f = 0; f < 3; f++) sweep(set, sd < 0 ? 2 : 17, rowY(9) + f, 12 - f, 6, [sd * 0.25, 0.7, -0.6], 2, (k, a) => feather(k, a, f, 3));
      set(7, rowY(9), 17, RAP.eye, true);
      set(12, rowY(9), 17, RAP.eye, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, robe);
      skirt(set, 4, -9, (x, y, z) => (y <= -7 ? feather(x, y, z, 10) : robe(x, y, z)), 0.15);
      // A cloak of overlapping feathers over the shoulders and down the back.
      shoulderTop(set, 19, feather);
      for (let y = -6; y <= 20; y++) for (let x = 3; x <= 22; x++) set(x, y, 2, feather(x, y, 2, 11));
      for (const x of [3, 22]) for (let y = 8; y <= 20; y++) for (let z = 3; z <= 8; z++) set(x, y, z, feather(x, y, z, 12));
      // Teal cord and a claw clasp.
      for (let x = 5; x <= 20; x++) set(x, 17, 15, J(RAP.blue, x, 17, 15, 1253));
      box(set, 11, 15, 15, 14, 18, 16, J(RAP.claw, 0, 0, 0, 1254));
    },
    paintArm(A, set) {
      limb(set, 9, 21, robe, 3, 10, 3, 10);
      // Feather-fringed sleeves.
      box(set, 1, 4, 1, 12, 9, 12, (x, y, z) => (x > 1 && x < 11 && z > 1 && z < 11 ? null : feather(x, y, z, 20)));
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => feather(x, y, z, 21));
      // Long flight feathers trailing from the outer sleeve, like a folded wing.
      for (let f = 0; f < 5; f++) sweep(set, 12, 19 - f * 2, 3 + f * 2, 6, [0.3, -1, 0.1], 1, (k) => feather(k, f, 0, 22 + (k > 4 ? 1 : 0)));
    },
    paintLeg(set, flags) {
      if (flags.legs) limb(set, 12, 23, robe);
      if (flags.boots) {
        box(set, 2, 0, 3, 11, 4, 13, (x, y, z) => J(RAP.strap, x, y, z, 1255));
        for (const x of [3, 6, 9]) set(x, 1, 13, J(RAP.clawLo, x, 1, 13, 1256));
      }
    },
  };
}

/* ============================== Rex ============================== */

/** The rex upper jaw: a bony snout over the brow with a row of fangs and two eye sockets. */
function rexSnout(set, rowY, y0, long = 4) {
  for (let k = 0; k < long; k++)
    for (let x = 5; x <= 14; x++) {
      const narrow = Math.abs(x - 9.5) > 4.5 - k * 0.4;
      if (narrow) continue;
      set(x, rowY(y0) + (k > 2 ? 1 : 0), 15 + k, J(k === long - 1 ? REX.boneLo : REX.bone, x, k, 0, 1301));
      set(x, rowY(y0) + 1, 15 + k, J(REX.bone, x, k, 1, 1302));
    }
  for (let x = 5; x <= 14; x += 1) if ((x & 1) === 0 || x === 5 || x === 14) set(x, rowY(y0) - 1, 15 + Math.min(long - 1, Math.round((4.5 - Math.abs(x - 9.5)) * 0.8)), J(REX.fang, x, 0, 0, 1303));
  for (const x of [6, 13]) set(x, rowY(y0) + 2, 15, 0x1a0e08);
  set(9, rowY(y0) + 2, 15 + long - 1, 0x2a1a10);
  set(10, rowY(y0) + 2, 15 + long - 1, 0x2a1a10);
}

function rexLeather() {
  const strap = (x, y, z) => J(REX.strap, x, y, z, 1311, 0.04);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      capShell(set, rowY, (x, y, z) => rexHide(x, y, z, 1), { crown: 2.2 });
      rexSnout(set, rowY, 10, 3);
      // Bony brow knobs.
      for (const x of [4, 15]) for (let k = 0; k < 2; k++) set(x, rowY(11) + k, 13, J(REX.boneLo, x, k, 0, 1312));
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, (x, y, z) => rexHide(x, y, z, 10));
      // Rib plates of bone on the chest.
      for (const y of [9, 12, 15]) for (let x = 7; x <= 18; x++) if (Math.abs(x - 12.5) > 1) set(x, y, 15, J(x < 12 ? REX.bone : REX.boneLo, x, y, 15, 1313));
      for (let y = 8; y <= 16; y++) set(12, y, 15, J(REX.bone, 12, y, 15, 1314)), set(13, y, 15, J(REX.boneLo, 13, y, 15, 1315));
      // A necklace of rex teeth.
      for (let k = 0; k < 9; k++) {
        const x = 8 + k;
        const y = 17 - Math.round(Math.sin((k / 8) * Math.PI) * 2.5);
        set(x, y, 16, J(REX.strapHi, x, y, 16, 1316));
        if (k % 2 === 0) set(x, y - 1, 16, J(REX.fang, x, y, 16, 1317)), set(x, y - 2, 16, J(REX.fangLo, x, y, 17, 1318));
      }
      shoulderTop(set, 19, (x, y, z) => rexHide(x, y, z, 11));
      for (let x = 4; x <= 21; x++) set(x, 5, 15, strap(x, 5, 15));
    },
    paintArm(A, set) {
      limb(set, 6, 15, (x, y, z) => (y === 6 || y === 14 ? strap(x, y, z) : rexHide(x, y, z, 20)));
      // Bone bracer slats.
      for (let y = 8; y <= 13; y += 2) box(set, 2, y, 11, 11, y + 1, 12, (x) => J(REX.bone, x, y, 0, 1319));
      box(set, 3, 3, 3, 10, 6, 11, (x, y, z) => J(REX.strapHi, x, y, z, 1320));
      // Claw pauldron: three great curved claws over the shoulder.
      box(set, 2, 21, 2, 11, 25, 12, (x, y, z) => rexHide(x, y, z, 21));
      for (const z of [3.5, 6.5, 9.5]) hornCurve(set, [7, 24, z], [11, 27, z], [13, 23, z], 1.5, (t) => (t > 0.6 ? REX.fang : REX.fangLo), 9);
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        limb(set, 12, 24, (x, y, z) => rexHide(x, y, z, 30));
        box(set, 3, 15, 11, 10, 20, 12, (x, y, z) => J(REX.bone, x, y, z, 1321));
      }
      if (flags.boots) {
        limb(set, 3, 11, (x, y, z) => (y === 10 ? strap(x, y, z) : rexHide(x, y, z, 31)));
        box(set, 2, 0, 2, 11, 3, 13, (x, y, z) => (y === 0 ? J(REX.strap, x, y, z, 1322) : rexHide(x, y, z, 32)));
        for (const x of [3, 6, 9]) hornCurve(set, [x + 0.5, 1.5, 12.5], [x + 0.5, 1.5, 14], [x + 0.5, 0, 15], 1, (t) => (t > 0.5 ? REX.fang : REX.fangLo), 4);
      }
    },
  };
}

function rexCloth() {
  const robe = (x, y, z) => (((x * 3 + z) >> 2) % 5 === 0 ? J(REX.red, x, y, z, 1351, 0.04) : J(((x + y) & 3) === 0 ? 0x2a3a18 : 0x3d5222, x, y, z, 1352, 0.04));
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      hoodShell(set, rowY, (x, y, z) => robe(x, y, z));
      // A full rex skull worn as a headdress: dome over the crown, snout out over the face.
      capShell(set, rowY, (x, y, z, up) => (up ? J(((x + z) & 3) === 0 ? REX.boneLo : REX.bone, x, y, z, 1353) : null), { crown: 3.2, low: 9 });
      rexSnout(set, rowY, 11, 5);
      for (const x of [6, 13]) set(x, rowY(13), 15, REX.eye, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, robe);
      skirt(set, 4, -10, (x, y, z) => (y === -10 ? J(REX.bone, x, y, z, 1354) : robe(x, y, z)), 0.16);
      // Strands of bone beads, and a hem fringed with teeth.
      for (const x of [8, 11, 14, 17]) for (let y = 6; y <= 17; y++) if (y % 2 === 0) set(x, y, 15, J(y % 4 ? REX.bone : REX.redLo, x, y, 15, 1355));
      for (let x = 6; x <= 19; x += 2) set(x, -11, 14, J(REX.fang, x, -11, 14, 1356)), set(x, -12, 14, J(REX.fangLo, x, -12, 14, 1357));
      shoulderTop(set, 19, robe);
      box(set, 11, 16, 15, 14, 19, 16, J(REX.fang, 0, 0, 0, 1358));
    },
    paintArm(A, set) {
      limb(set, 9, 21, robe, 3, 10, 3, 10);
      box(set, 1, 4, 1, 12, 9, 12, (x, y, z) => (x > 1 && x < 11 && z > 1 && z < 11 ? null : y === 4 ? J(REX.bone, x, y, z, 1359) : robe(x, y, z)));
      box(set, 2, 21, 2, 11, 24, 12, (x, y, z) => robe(x, y, z));
      // A mantle of rex fangs hanging from the shoulder.
      for (const z of [2.5, 5.5, 8.5, 11.5]) hornCurve(set, [12, 25, z], [13, 23, z], [12.5, 20, z], 1, (t) => (t > 0.5 ? REX.fang : REX.fangLo), 5);
    },
    paintLeg(set, flags) {
      if (flags.legs) limb(set, 12, 23, robe);
      if (flags.boots) box(set, 2, 0, 3, 11, 5, 13, (x, y, z) => (y === 4 ? J(REX.bone, x, y, z, 1361) : J(REX.strap, x, y, z, 1362)));
    },
  };
}

function rexPlate() {
  const scute = (x, y, z) => {
    const bump = ((x >> 1) + (y >> 1) + (z >> 1)) & 1;
    return bump ? rexHide(x, y, z, 50) : J(REX.grnLo, x, y, z, 1401, 0.04);
  };
  const studs = (x, y, z) => J(((x + y + z) & 1) ? REX.boneLo : REX.bone, x, y, z, 1402, 0.03);
  return {
    paintHelm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      // A rex head helm: closed crown, the face seen through open jaws.
      capShell(set, rowY, (x, y, z) => scute(x, y, z), { crown: 3, low: 2 });
      rexSnout(set, rowY, 10, 5);
      // Lower jaw under the chin, with its own row of teeth pointing up.
      for (let x = 5; x <= 14; x++) for (let k = 0; k < 3; k++) set(x, rowY(2), 15 + k, rexHide(x, 2, 15 + k, 51));
      for (let x = 5; x <= 14; x += 2) set(x, rowY(3), 17, J(REX.fang, x, 3, 17, 1403));
      // Osteoderm spikes down the crown and an amber eye on each side.
      for (let z = 4; z <= 14; z += 2) for (let k = 0; k < 2 + (z % 4 === 0 ? 1 : 0); k++) set(9 + (k & 1), rowY(14) + 1 + k, z, studs(z, k, 0));
      for (const x of [3, 16]) set(x, rowY(11), 13, REX.eye, true);
    },
    paintChest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      bodyShell(set, 5, 18, scute, 15);
      // Rows of raised osteoderm studs and a red stripe band.
      for (let y = 7; y <= 17; y += 3) for (let x = 6; x <= 19; x += 3) set(x, y, 16, studs(x, y, 16));
      for (let x = 5; x <= 20; x++) set(x, 11, 16, J(REX.red, x, 11, 16, 1404));
      shoulderTop(set, 19, scute);
      for (let x = 4; x <= 21; x += 3) set(x, 20, 9, studs(x, 20, 9));
      for (let x = 4; x <= 21; x++) set(x, 5, 15, J(REX.strap, x, 5, 15, 1405));
    },
    paintArm(A, set) {
      limb(set, 5, 16, scute, 1, 12, 1, 12);
      box(set, 2, 1, 2, 11, 5, 12, (x, y, z) => J(REX.grnLo, x, y, z, 1406));
      for (const x of [3, 6, 9]) hornCurve(set, [x + 0.5, 2, 12], [x + 0.5, 1, 13.5], [x + 0.5, -1, 13.5], 1, (t) => (t > 0.5 ? REX.fang : REX.fangLo), 4);
      // A domed scute pauldron crowned with three spikes.
      for (let y = 21; y <= 27; y++) {
        const r = 6 - (y - 21) * 0.75;
        for (let z = 0; z <= 13; z++) for (let x = 0; x <= 13; x++) if (Math.hypot(x - 6.5, z - 6.5) <= r) set(x, y, z, scute(x, y, z));
      }
      for (const z of [3, 6, 9]) for (let k = 0; k < 3; k++) set(12 + (k >> 1), 25 + k, z, studs(k, z, 0));
    },
    paintLeg(set, flags) {
      if (flags.legs) {
        limb(set, 12, 24, scute, 1, 12, 1, 12);
        for (let y = 13; y <= 23; y += 3) set(6, y, 12, studs(6, y, 12));
      }
      if (flags.boots) {
        limb(set, 3, 11, scute, 1, 12, 1, 12);
        box(set, 1, 0, 1, 12, 3, 13, (x, y, z) => (y === 0 ? J(REX.strap, x, y, z, 1407) : scute(x, y, z)));
        // Three-toed sabatons with talons.
        for (const x of [2.5, 6.5, 10.5]) hornCurve(set, [x, 1.5, 12.5], [x, 1.5, 15], [x, -0.5, 15.5], 1.3, (t) => (t > 0.5 ? REX.fang : REX.fangLo), 5);
      }
    },
  };
}

/* ============================== plate signatures ============================== */

/**
 * Silhouettes laid over the four dragon and yeti plate sets so each reads apart from the
 * others at a glance: a dragon snout and wing fins, a tattered dusk cape, a burning
 * crystal crown and vent pauldrons, a fur mane and collar.
 */
export const PLATE_SIGNATURES = {
  budgeset: {
    helm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      // A dragon snout visor with nostrils, and wing fins off the temples.
      for (let k = 0; k < 3; k++) for (let x = 6 + k; x <= 13 - k; x++) set(x, rowY(7) + (k > 1 ? 1 : 0), 17 + k, budgeScale(x, 7, 17 + k, 60));
      set(8, rowY(7) + 1, 19, 0x0e3a22);
      set(11, rowY(7) + 1, 19, 0x0e3a22);
      for (const s of [-1, 1]) for (let rib = 0; rib < 3; rib++) sweep(set, s < 0 ? 2 : 17, rowY(10) + rib, 13 - rib * 2, 5, [s * 0.3, 0.6, -0.8], 2, (k, a) => J(a ? BUDGE.scaleHi : BUDGE.horn, k, a, rib, 61));
    },
    chest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      // Folded wings across the back.
      for (const s of [-1, 1]) for (let k = 0; k < 10; k++) {
        const x = 12.5 + s * (2 + k * 0.6);
        for (let y = 18 - k; y >= 6 + (k >> 1); y--) set(Math.round(x), y, 2, J(y === 18 - k ? BUDGE.horn : BUDGE.scale, k, y, s, 62));
      }
    },
    arm(A, set) {
      // A wing-claw pauldron: two horn ribs curling up and out, webbed with scale membrane.
      for (const z of [3.5, 9.5]) hornCurve(set, [8, 26, z], [12, 29, z], [13.5, 26, z], 1.2, (t) => (t > 0.6 ? BUDGE.claw : BUDGE.horn), 8);
      for (let y = 26; y <= 28; y++) for (let z = 4; z <= 9; z++) set(12, y, z, budgeScale(12, y, z, 63));
    },
    leg() {},
  },
  darksyceset: {
    helm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      // Scythe mandibles curling forward from the cheek guards around the jaw.
      for (const sd of [-1, 1]) hornCurve(set, [sd < 0 ? 3 : 16, rowY(6), 12], [sd < 0 ? 1 : 18, rowY(3), 16], [sd < 0 ? 5 : 14, rowY(2), 19], 1.2, (t) => (t > 0.7 ? DARK.edge : t > 0.3 ? DARK.blade : DARK.bladeDark), 10);
    },
    chest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      // A long tattered cape of dusk membrane down the back.
      for (let y = -12; y <= 19; y++)
        for (let x = 5; x <= 20; x++) {
          const tear = -12 + Math.floor(hash3(x, 0, 0, 63) * 5);
          if (y < tear) continue;
          set(x, y, 1, J(y === tear ? DARK.glow || 0xff4fb8 : ((x + y) & 3) === 0 ? DARK.scaleLo : DARK.belly, x, y, 1, 64), y === tear);
        }
    },
    arm() {},
    leg() {},
  },
  volcanumset: {
    helm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      // A crown of purple crystal spires burning at the tips.
      for (let a = 0; a < 7; a++) {
        const ang = Math.PI * (0.1 + a * 0.133);
        const x = Math.round(9.5 + Math.cos(ang) * 6);
        const z = Math.round(9.5 + Math.sin(ang) * 3 + 2);
        const h = 3 + (a === 3 ? 3 : a % 2);
        for (let k = 0; k < h; k++) set(x, rowY(14) + k, z, k === h - 1 ? VOLC.glowHi || 0xffe08a : k > h - 3 ? 0xd8a8ff : 0x9a5adc, k >= h - 2);
      }
    },
    chest() {},
    arm(A, set) {
      // Vent pauldrons: a glowing mouth on each shoulder.
      for (let z = 4; z <= 9; z++) for (let x = 4; x <= 9; x++) {
        const d = Math.hypot(x - 6.5, z - 6.5);
        if (d < 1.6) set(x, 28, z, VOLC.glowHi || 0xffe08a, true);
        else if (d < 2.8) set(x, 28, z, VOLC.glow || 0xff6a12, true);
        else if (d < 3.6) set(x, 28, z, J(0x101014, x, 28, z, 65));
      }
      // A raised obsidian rim round the vent, and two jagged spires on the outer shoulder.
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * TAU;
        set(Math.round(6.5 + Math.cos(ang) * 4.2), 29, Math.round(6.5 + Math.sin(ang) * 4.2), J(0x101014, a, 29, 0, 66));
      }
      for (const z of [3.5, 9.5]) hornCurve(set, [11, 26, z], [13, 28, z], [13, 30, z], 1.3, (t) => (t > 0.75 ? VOLC.edge || 0xffe08a : 0x1c1c22), 6);
    },
    leg() {},
  },
  yetiset: {
    helm(H, rowY) {
      const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
      // A shaggy mane falling from the skull helm down the back of the neck.
      for (let y = rowY(1); y <= rowY(13); y++) for (let x = 3; x <= 16; x++) for (const z of [2, 3]) if (hash3(x, y, z, 66) > 0.18) set(x, y, z, yetiFur(x, y, z, 67));
    },
    chest(T, ty) {
      const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
      // A heavy fur collar ringing the shoulders.
      for (let y = 18; y <= 21; y++)
        for (let x = 3; x <= 22; x++)
          for (let z = 2; z <= 15; z++) {
            const d = ((x - 12.5) / 10) ** 2 + ((z - 8.5) / 7) ** 2;
            if (d < 1 && d > 0.45 && hash3(x, y, z, 68) > 0.1) set(x, y, z, yetiFur(x, y, z, 69));
          }
    },
    arm(A, set) {
      // Shaggy fur spilling over the top and outside of the shoulder plate.
      for (let y = 26; y <= 29; y++) for (let z = 1; z <= 12; z++) for (let x = 1; x <= 13; x++) {
        const d = Math.hypot(x - 6.5, z - 6.5) / 6.5 + (y - 26) * 0.18;
        if (d < 1 && hash3(x, y, z, 70) > 0.15) set(x, y, z, yetiFur(x, y, z, 71));
      }
      for (let y = 20; y <= 26; y++) for (let z = 2; z <= 11; z++) if (hash3(y, z, 0, 72) > 0.3) set(13, y, z, yetiFur(13, y, z, 73));
    },
    leg() {},
  },
};

/** Wraps a plate module with its signature layer. */
export function withSignature(setId, mod) {
  const s = PLATE_SIGNATURES[setId];
  if (!s) return mod;
  return {
    paintHelm(H, rowY) {
      mod.paintHelm(H, rowY);
      s.helm(H, rowY);
    },
    paintChest(T, ty) {
      mod.paintChest(T, ty);
      s.chest(T, ty);
    },
    paintArm(A, set, parts) {
      mod.paintArm(A, set, parts);
      s.arm(A, set);
    },
    paintLeg(set, flags) {
      mod.paintLeg(set, flags);
      s.leg(set, flags);
    },
  };
}

/* ============================== registry ============================== */

const BEAST_BUILD = {
  budgeleather: budgeLeather,
  budgecloth: budgeCloth,
  darkleather: darkLeather,
  darkcloth: darkCloth,
  volcanumleather: volcLeather,
  volcanumcloth: volcCloth,
  yetileather: yetiLeather,
  yeticloth: yetiCloth,
  raptorleather: raptorLeather,
  raptorcloth: raptorCloth,
  rexleather: rexLeather,
  rexcloth: rexCloth,
  rexset: rexPlate,
};

/** Painters may return null for "no voxel here"; never let that reach a model as black. */
const skipNull = (set) => (x, y, z, c, g) => {
  if (c === null || c === undefined) return;
  set(x, y, z, c, g);
};
const guardModel = (M) => ({ set: skipNull((x, y, z, c, g) => M.set(x, y, z, c, g)), has: (x, y, z) => M.has(x, y, z) });

/**
 * Each set's own material for the upper arm and shoulder, and its own belt, painted first so the
 * plain hunter sleeves, leather pauldrons and iron-buckled belt never show through any set.
 * belt(x, y, z, buckle) is called with buckle true for the voxels of the clasp.
 */
const COVER = {
  budgeleather: { skin: (x, y, z) => budgeScale(x, y, z, 90), belt: (x, y, z, b) => (b ? J(BUDGE.claw, x, y, z, 91) : J(0x6b4a2a, x, y, z, 92)) },
  budgecloth: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x1f8a4c : 0x2fae62, x, y, z, 93), belt: (x, y, z, b) => (b ? J(BUDGE.ember || 0xff8a2a, x, y, z, 94) : J(y % 2 ? 0xe6d27a : 0xc9ab4c, x, y, z, 95)) },
  darkleather: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x251f48 : 0x3b3268, x, y, z, 96), belt: (x, y, z, b) => (b ? DARK.glow || 0xff4fb8 : J(0x1d1736, x, y, z, 97)) },
  darkcloth: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x33296a : 0x4a3a9c, x, y, z, 98), belt: (x, y, z, b) => (b ? J(DARK.blade, x, y, z, 99) : J(0x1a1430, x, y, z, 100)) },
  volcanumleather: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x161214 : 0x2a2428, x, y, z, 101), belt: (x, y, z, b) => (b ? VOLC.glow || 0xff6a12 : J(0x3a2014, x, y, z, 102)) },
  volcanumcloth: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x241448 : 0x3a2068, x, y, z, 103), belt: (x, y, z, b) => (b ? VOLC.glowHi || 0xffe08a : J(0x6a3820, x, y, z, 104)) },
  yetileather: { skin: (x, y, z) => yetiFur(x, y, z, 105), belt: (x, y, z, b) => (b ? J(YETI.ice, x, y, z, 106) : J(YETI.leatherLo, x, y, z, 107)) },
  yeticloth: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x9dbfdc : 0xcfe2f1, x, y, z, 108), belt: (x, y, z, b) => (b ? YETI.glow || 0x7fd0ff : yetiFur(x, y, z, 109)) },
  raptorleather: { skin: (x, y, z) => raptorScale(x, y, z, 110), belt: (x, y, z, b) => (b ? J(RAP.claw, x, y, z, 111) : J(RAP.strap, x, y, z, 112)) },
  raptorcloth: { skin: (x, y, z) => feather(x, y, z, 113), belt: (x, y, z, b) => (b ? J(RAP.claw, x, y, z, 114) : J(RAP.blue, x, y, z, 115)) },
  rexleather: { skin: (x, y, z) => rexHide(x, y, z, 116), belt: (x, y, z, b) => (b ? J(REX.fang, x, y, z, 117) : J(REX.strap, x, y, z, 118)) },
  rexcloth: { skin: (x, y, z) => J(((x + y) & 3) === 0 ? 0x2a3a18 : 0x3d5222, x, y, z, 119), belt: (x, y, z, b) => (b ? J(REX.fang, x, y, z, 120) : J(REX.red, x, y, z, 121)) },
  rexset: { skin: (x, y, z) => rexHide(x, y, z, 122), belt: (x, y, z, b) => (b ? J(REX.bone, x, y, z, 123) : J(REX.strap, x, y, z, 124)) },
};

function coverArm(set, cover) {
  box(set, 2, 14, 2, 12, 21, 12, cover.skin);
  box(set, 1, 21, 1, 13, 27, 13, cover.skin);
}

function coverBelt(T, ty, cover) {
  const set = (x, y, z, c) => T.set(x, ty(y), z, c);
  for (let y = 0; y <= 5; y++) {
    for (let x = 4; x <= 21; x++) {
      const buckle = x >= 11 && x <= 14 && y >= 1 && y <= 4;
      for (const z of [14, 15]) set(x, y, z, cover.belt(x, y, z, buckle && z === 15));
      set(x, y, 3, cover.belt(x, y, 3, false));
    }
    for (const x of [3, 22]) for (let z = 4; z <= 13; z++) set(x, y, z, cover.belt(x, y, z, false));
  }
  // The hunter's back harness ring sits just behind the body; cover it with the set's own material.
  for (let y = 6; y <= 17; y++) for (let x = 8; x <= 18; x++) set(x, y, 3, cover.skin(x, y, 3));
}

function coverLeg(set, flags, cover) {
  if (flags.legs) box(set, 2, 12, 2, 11, 24, 11, cover.skin);
  if (flags.boots) box(set, 2, 0, 2, 11, 12, 11, cover.skin);
}

/** Null-safe wrappers, and legs and boots only painted when the flags say they belong to this set. */
function guarded(mod, cover) {
  return {
    paintHelm: (H, rowY) => mod.paintHelm(guardModel(H), rowY),
    paintChest(T, ty) {
      const G = guardModel(T);
      if (cover) coverBelt(G, ty, cover);
      mod.paintChest(G, ty);
    },
    paintArm(A, set, parts) {
      const S = skipNull(set);
      if (cover) coverArm(S, cover);
      mod.paintArm(guardModel(A), S, parts);
    },
    paintLeg(set, flags) {
      if (!flags.legs && !flags.boots) return;
      const S = skipNull(set);
      if (cover) coverLeg(S, flags, cover);
      mod.paintLeg(S, flags);
    },
  };
}

export const BEAST_SETS = Object.keys(BEAST_BUILD);
export const makeBeastArmor = (setId) => guarded(BEAST_BUILD[setId](), COVER[setId]);
void shade;
