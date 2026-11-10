import { hash3, jitter, shade } from '../engine/voxel.js';

const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));

function fill(set, x0, y0, z0, x1, y1, z1, fn) {
  for (let z = z0; z < z1; z++)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const c = typeof fn === 'function' ? fn(x, y, z) : fn;
        if (c !== null && c !== undefined) set(x, y, z, c);
      }
}

/* ------------------------------------------------------------------ */
/* Tiger and raptor hide, shared between leather and cloth             */
/* ------------------------------------------------------------------ */

const TG = {
  org: 0xe07a1c, orgHi: 0xf59a40, orgLo: 0xb85a12, blk: 0x1a1410, wht: 0xf2eee4, whtLo: 0xd5cfc0, pink: 0xe8b8a8,
  claw: 0xf3ead2, clawLo: 0xc9bd9a, strap: 0x3a2214, strapHi: 0x5c3a20, eye: 0xf2d64a,
};
const RP = {
  olv: 0x7d8438, olvLo: 0x555c26, olvHi: 0x939b4c, tan: 0xbba76a, tanLo: 0x9c8a52, grey: 0x8a8e94, greyHi: 0xbcc0c6, greyLo: 0x5e6268,
  claw: 0xe9dfbc, clawLo: 0xb8a878, strap: 0x3c2e18, strapHi: 0x5c4826, eye: 0xe8962a,
};

/** Orange hide banded in black. Stripes run around the body and slope with height. */
const tigerHide = (x, y, z, s = 0) => {
  const ring = s >= 40 && s < 100;
  const wob = Math.round(Math.sin(y * 0.5 + (x >> 3) + (z >> 3)) * 1.5);
  const ph = ((((ring ? y : x + z) + wob) % 6) + 6) % 6;
  const gap = hash3(x >> 1, y >> 2, z >> 1, 300 + s) > 0.86;
  const dark = ph < 2 && !gap;
  if (dark) return J(TG.blk, x, y, z, 301 + s, 0.03);
  return J(((x + y * 2 + z) & 7) === 0 ? TG.orgHi : ph === 5 ? TG.orgLo : TG.org, x, y, z, 302 + s, 0.04);
};

/** Olive and tan scale mosaic. */
const raptorHide = (x, y, z, s = 0) => {
  const row = y >> 1;
  const tx = (x + (row & 1)) >> 1;
  const tz = (z + (row & 1)) >> 1;
  const h = hash3(tx, row, tz, 310 + s);
  const base = h < 0.4 ? RP.olv : h < 0.62 ? RP.olvLo : h < 0.9 ? RP.tan : RP.tanLo;
  const edge = ((x + (row & 1)) & 1) === 0 && (y & 1) === 0;
  return J(edge ? shade(base, 0.86) : base, x, y, z, 311 + s, 0.035);
};

const STYLES = {
  tiger: { hide: tigerHide, strap: (x, y, z, s) => J(TG.strap, x, y, z, 320 + s, 0.04), strapHi: (x, y, z, s) => J(TG.strapHi, x, y, z, 321 + s, 0.04), claw: TG.claw, clawLo: TG.clawLo },
  raptor: { hide: raptorHide, strap: (x, y, z, s) => J(RP.strap, x, y, z, 322 + s, 0.04), strapHi: (x, y, z, s) => J(RP.strapHi, x, y, z, 323 + s, 0.04), claw: RP.claw, clawLo: RP.clawLo },
};

/** Small curved claw pointing along +dir on one axis, drawn with `set`. */
function clawAt(set, x, y, z, axis, dir, len, col, colLo) {
  for (let k = 0; k < len; k++) {
    const bend = k > len * 0.55 ? 1 : 0;
    const c = k > len - 2 ? 0xfffbea : k % 3 === 2 ? colLo : col;
    if (axis === 'y') set(x, y + dir * k, z + bend, c);
    else if (axis === 'z') set(x + bend, y, z + dir * k, c);
    else set(x + dir * k, y, z + bend, c);
  }
}

function fur(set, x, y, z, len, dir, axis, a, b, s) {
  for (let k = 0; k < len; k++) {
    const c = hash3(x, y, z + k, s) > 0.5 ? a : b;
    if (axis === 'y') set(x, y + dir * k, z, c);
    else if (axis === 'z') set(x, y, z + dir * k, c);
    else set(x + dir * k, y, z, c);
  }
}

/* ------------------------------ leather ------------------------------ */

function leatherJungle(kind) {
  const S = STYLES[kind];
  const tiger = kind === 'tiger';
  const hide = S.hide;
  const strap = S.strap;
  const strapHi = S.strapHi;

  const paintHelm = (H, rowY) => {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(3); y <= rowY(14) + 3; y++)
      for (let z = 3; z <= 16; z++)
        for (let x = 3; x <= 16; x++) {
          const dx = (x + 0.5 - 10) / 8.1;
          const dz = (z + 0.5 - 10) / 8.1;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(7);
          const top = rowY(12) + Math.round(3.2 * (1 - d2 * 0.95) * (1 - d2 * 0.3));
          if (upper && y > top) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(3) + 1 && z > 11) continue;
          if (z >= 14 && y < rowY(9)) continue;
          const band = y === rowY(7) || (y === rowY(8) && z >= 12);
          set(x, y, z, band ? strap(x, y, z, 1) : hide(x, y, z, 2));
        }
    if (tiger) {
      for (const side of [-1, 1]) {
        const ex = side < 0 ? 5 : 14;
        for (let dy = 0; dy < 5; dy++)
          for (let dx = -3; dx <= 3; dx++)
            for (let dz = -1; dz <= 1; dz++) {
              if (Math.abs(dx) / (3 - dy * 0.55) + Math.abs(dz) / 1.6 > 1) continue;
              const inner = dz === 1 && dy < 4 && Math.abs(dx) < 2 + (dy < 1 ? 1 : 0);
              set(ex + dx, rowY(12) + 3 + dy, 10 + dz, dy === 4 ? J(TG.blk, dx, dy, dz, 330, 0.02) : inner ? J(TG.pink, dx, dy, dz, 331, 0.03) : J(dz === 0 ? TG.org : TG.orgLo, dx, dy, dz, 332, 0.04));
            }
      }
      for (const x of [6, 8, 11, 13]) for (let k = 0; k < (x === 8 || x === 11 ? 3 : 2); k++) set(x, rowY(9) + k, 16, J(TG.blk, x, k, 0, 333, 0.02));
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 3 : 16;
        for (let y = rowY(3); y <= rowY(7); y++)
          for (let z = 10; z <= 15; z++) {
            if (hash3(x0, y, z, 334) < 0.25) continue;
            set(x0, y, z, J(y < rowY(5) ? TG.whtLo : TG.wht, x0, y, z, 335, 0.03));
            if (hash3(x0, y, z, 336) > 0.55) set(x0 + side, y, z, J(TG.wht, x0, y, z, 337, 0.03));
          }
      }
      for (let x = 5; x <= 14; x++) set(x, rowY(9), 16, x % 3 === 1 ? J(TG.blk, x, 9, 16, 338, 0.02) : J(TG.orgLo, x, 9, 16, 339, 0.03));
    } else {
      for (let z = 4; z <= 15; z++) {
        const h = z % 3 === 0 ? 4 : z % 3 === 1 ? 3 : 2;
        for (let k = 0; k < h; k++) for (const x of [9, 10]) set(x, rowY(14) + 1 + k + (z > 12 ? -1 : 0), z, J(k > h - 2 ? RP.greyHi : k === 0 ? RP.greyLo : RP.grey, x, k, z, 340, 0.03));
      }
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 3 : 16;
        for (let k = 0; k < 3; k++) set(x0 - side * 0, rowY(8) + k * 0, 9 + k * 2, J(RP.grey, k, 0, 0, 341, 0.03));
        for (let k = 0; k < 4; k++) set(x0 + side, rowY(10) + (k >> 1), 6 + k * 2, J(RP.greyHi, k, 0, 0, 342, 0.03));
      }
      for (const x of [7, 12]) set(x, rowY(10), 16, RP.eye, true);
      for (let x = 5; x <= 14; x++) set(x, rowY(9), 16, x % 3 === 1 ? J(RP.greyLo, x, 9, 16, 343, 0.02) : J(RP.tanLo, x, 9, 16, 344, 0.03));
    }
  };

  const paintChest = (T, ty) => {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        const panel = x === 12 || x === 13;
        set(x, y, 13, hide(x, y, 13, 10));
        set(x, y, 14, y >= 7 && x >= 7 && x <= 18 ? (panel ? J(tiger ? TG.orgLo : RP.olvLo, x, y, 14, 11, 0.04) : hide(x, y, 14, 12)) : hide(x, y, 13, 13));
        set(x, y, 4, hide(x, y, 4, 14));
      }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, hide(x, y, z, 15));
    }
    for (let y = 5; y <= 6; y++) {
      for (let x = 4; x <= 21; x++) {
        set(x, y, 14, y === 5 ? strap(x, y, 14, 16) : strapHi(x, y, 14, 17));
        set(x, y, 3, strap(x, y, 3, 18));
      }
      for (const x of [4, 21]) for (let z = 4; z <= 13; z++) set(x, y, z, strap(x, y, z, 19));
    }
    for (let x = 11; x <= 14; x++) for (let y = 5; y <= 6; y++) set(x, y, 15, J(0xb8923a, x, y, 15, 20, 0.03));
    for (let y = 8; y <= 17; y++) {
      if (y % 2) for (const x of [12, 13]) set(x, y, 15, strap(x, y, 15, 21));
      else for (const x of [11, 14]) set(x, y, 15, strapHi(x, y, 15, 22));
    }
    for (let y = 9; y <= 15; y += 3) for (const x of [12, 13]) set(x, y, 16, J(S.claw, x, y, 16, 23, 0.02));
    for (let k = 0; k < 11; k++) {
      const x1 = 6 + k;
      const x2 = 19 - k;
      const y = 18 - k;
      for (const x of [x1, x2]) {
        set(x, y, 3, strap(x, y, 3, 24));
        set(x, y, 2, strapHi(x, y, 2, 25));
      }
    }
    for (let x = 5; x <= 20; x++)
      for (let z = 3; z <= 14; z++) {
        const edge = x <= 7 || x >= 18 || z <= 4 || z >= 13;
        if (edge) set(x, 19, z, hide(x, 19, z, 26));
        if ((x <= 6 || x >= 19) && z >= 4 && z <= 13) set(x, 20, z, hide(x, 20, z, 27));
      }
    if (tiger) {
      for (let y = 12; y <= 19; y++) {
        const half = (y - 11) * 0.95;
        for (let x = 5; x <= 20; x++) {
          if (Math.abs(x - 12.5) > half) continue;
          const d = Math.abs(x - 12.5) / half;
          if (y < 17 && hash3(x, y, 0, 350) < d * 0.5) continue;
          set(x, y, 15, J(y % 2 ? TG.wht : TG.whtLo, x, y, 15, 351, 0.03));
          if (y >= 15 && hash3(x, y, 1, 352) > 0.4) set(x, y, 16, J(TG.wht, x, y, 16, 353, 0.03));
        }
      }
      for (let x = 5; x <= 20; x++)
        for (let z = 3; z <= 14; z++) {
          if (!(Math.abs(x - 12.5) > 4 || z < 5 || z > 12)) continue;
          for (let y = 19; y <= 21; y++) {
            const h = hash3(x, z, y, 354);
            if (h < 0.18 + (y - 19) * 0.22) continue;
            set(x, y, z, J(h > 0.6 ? TG.wht : TG.whtLo, x, y, z, 355, 0.03));
          }
        }
      for (let y = 6; y <= 17; y += 3) for (const x of [6, 10, 15, 19]) {
        set(x, y, 3, J(TG.blk, x, y, 3, 356, 0.02));
        set(x, y + 1, 3, J(TG.blk, x, y + 1, 3, 357, 0.02));
      }
    } else {
      for (let k = 0; k < 12; k++) {
        const y = 18 - k;
        for (const z of [3, 2]) set(12 + (k & 1), y + (z === 2 ? 0 : 0), z - 1, J(k % 3 === 0 ? RP.greyHi : RP.grey, k, z, 0, 360, 0.03));
      }
      for (const side of [-1, 1]) {
        const bx = side < 0 ? 5 : 20;
        for (let k = 0; k < 4; k++) {
          const x = bx + side * (k === 0 ? 0 : Math.floor(k * 0.7));
          for (let h = 0; h < 4 - k; h++) set(x, 20 + k + h, 6 + k * 2, J(h === 3 - k ? RP.greyHi : RP.grey, x, h, k, 361, 0.03));
          for (let h = 0; h < 3; h++) set(x, 20 + k + h, 11 - k, J(RP.grey, x, h, k, 362, 0.03));
        }
      }
      for (let y = 7; y <= 17; y += 3) for (const x of [8, 17]) set(x, y, 15, J(RP.greyHi, x, y, 15, 363, 0.03));
      for (const x of [6, 9, 12, 13, 16, 19]) for (let k = 0; k < 2; k++) set(x, 5 + k, 15, J(RP.tanLo, x, k, 0, 364, 0.03));
    }
  };

  const paintArm = (A, set) => {
    fill(set, 3, 3, 3, 10, 7, 11, (x, y, z) => (y === 6 ? strapHi(x, y, z, 40) : tiger ? J(hash3(x, y, z, 41) > 0.7 ? TG.org : TG.blk, x, y, z, 42, 0.03) : hide(x, y, z, 42)));
    fill(set, 2, 7, 2, 11, 15, 12, (x, y, z) => (y === 9 || y === 12 ? strap(x, y, z, 43) : hide(x, y, z, 44)));
    fill(set, 3, 15, 3, 10, 21, 11, (x, y, z) => hide(x, y, z, 45));
    fill(set, 2, 21, 2, 11, 26, 12, (x, y, z) => (y === 21 ? strap(x, y, z, 46) : hide(x, y, z, 47)));
    fill(set, 3, 26, 3, 10, 27, 11, (x, y, z) => hide(x, y, z, 49));
    fill(set, 12, 21, 3, 13, 25, 11, (x, y, z) => hide(x, y, z, 48));
    if (tiger) {
      for (let x = 2; x <= 10; x++) for (let z = 2; z <= 11; z++) {
        if (hash3(x, z, 0, 370) < 0.2) continue;
        set(x, 14 + (hash3(x, z, 1, 371) > 0.6 ? 1 : 0), z, J(TG.wht, x, z, 0, 372, 0.03));
        set(x, 13, z, J(TG.whtLo, x, z, 1, 373, 0.03));
      }
      for (let x = 2; x <= 11; x++) for (let z = 2; z <= 11; z++) {
        const edge = x === 2 || x === 11 || z === 2 || z === 11;
        if (edge && hash3(x, z, 2, 374) > 0.35) set(x, 26, z, J(TG.wht, x, z, 2, 375, 0.03));
      }
      for (const z of [5, 8]) clawAt(set, 12, 12, z, 'y', -1, 5, TG.claw, TG.clawLo);
    } else {
      for (const k of [0, 1, 2]) {
        const z = 4 + k * 2;
        for (let h = 0; h < 4 - (k & 1); h++) set(12 + (h > 1 ? 1 : 0), 24 + h, z, J(h === 3 ? RP.greyHi : RP.grey, k, h, 0, 376, 0.03));
      }
      for (const z of [5, 8]) clawAt(set, 12, 12, z, 'y', -1, 5, RP.claw, RP.clawLo);
      for (let x = 3; x <= 9; x += 3) set(x, 14, 11, J(RP.greyHi, x, 0, 0, 377, 0.03));
    }
  };

  const paintLeg = (set, flags) => {
    if (flags.legs) {
      fill(set, 2, 12, 2, 11, 24, 11, (x, y, z) => (y === 13 || y === 19 ? strap(x, y, z, 60) : hide(x, y, z, 61)));
      fill(set, 2, 10, 2, 11, 12, 11, (x, y, z) => (y === 10 ? strapHi(x, y, z, 62) : hide(x, y, z, 63)));
      for (const x of [5, 8]) {
        clawAt(set, x, 14, 11, 'y', 1, 3, S.claw, S.clawLo);
      }
      set(6, 11, 11, J(0xb8923a, 6, 11, 11, 64, 0.03));
      set(7, 11, 11, J(0xb8923a, 7, 11, 11, 65, 0.03));
      if (tiger) {
        for (let x = 2; x <= 10; x++) for (const z of [2, 10]) if (hash3(x, z, 0, 380) > 0.4) set(x, 24, z, J(TG.whtLo, x, z, 0, 381, 0.03));
      } else {
        for (const y of [15, 20]) for (const z of [4, 7]) set(11, y, z, J(RP.greyHi, y, z, 0, 382, 0.03));
        for (const y of [16, 21]) for (const z of [4, 7]) set(12, y, z, J(RP.grey, y, z, 0, 383, 0.03));
        set(6, 12, 12, RP.grey);
        set(6, 13, 12, RP.greyHi);
        set(6, 11, 12, RP.grey);
      }
    }
    if (flags.boots) {
      fill(set, 2, 2, 2, 11, 10, 11, (x, y, z) => (y === 9 ? strapHi(x, y, z, 70) : hide(x, y, z, 71)));
      fill(set, 2, 0, 2, 11, 1, 13, (x, y, z) => J(0x16110d, x, y, z, 72, 0.04));
      if (tiger) {
        fill(set, 2, 1, 3, 11, 4, 14, (x, y, z) => (z >= 11 ? J(hash3(x, y, z, 73) > 0.1 ? TG.wht : TG.whtLo, x, y, z, 74, 0.03) : hide(x, y, z, 75)));
        fill(set, 3, 4, 10, 10, 5, 12, (x, y, z) => J(TG.wht, x, y, z, 76, 0.03));
        for (const x of [4, 6, 8]) {
          set(x, 2, 14, J(TG.blk, x, 2, 14, 77, 0.02));
          set(x, 1, 14, J(TG.blk, x, 1, 14, 78, 0.02));
        }
        for (let x = 2; x <= 10; x++) for (const z of [2, 10]) for (const y of [9, 10]) if (hash3(x, y, z, 79) > 0.25) set(x, y, z, J(TG.wht, x, y, z, 80, 0.03));
        for (let x = 2; x <= 10; x++) for (let z = 3; z <= 9; z++) if (hash3(x, z, 3, 81) > 0.3) set(x, 10, z, J(TG.whtLo, x, z, 3, 82, 0.03));
      } else {
        fill(set, 2, 1, 3, 11, 4, 13, (x, y, z) => hide(x, y, z, 75));
        fill(set, 3, 4, 10, 10, 5, 12, (x, y, z) => hide(x, y, z, 76));
        for (const x of [3, 6, 9]) {
          clawAt(set, x, 1, 13, 'z', 1, 3, RP.claw, RP.clawLo);
        }
        for (const x of [2, 10]) for (let z = 4; z <= 9; z += 2) set(x, 9 + (z & 1), z, J(RP.grey, x, z, 0, 84, 0.03));
        for (let x = 3; x <= 9; x += 2) set(x, 10, 2, J(RP.greyHi, x, 0, 0, 85, 0.03));
        for (const z of [3, 6, 9]) set(11, 1, z, J(RP.clawLo, z, 0, 0, 86, 0.03));
        set(6, 1, 2, RP.claw);
        set(6, 0, 2, RP.claw);
        set(6, 0, 1, RP.claw);
      }
    }
  };

  return { paintHelm, paintChest, paintArm, paintLeg };
}

/* ------------------------------- cloth ------------------------------- */

function clothJungle(kind) {
  const S = STYLES[kind];
  const tiger = kind === 'tiger';
  const hide = S.hide;
  const strap = S.strap;
  const strapHi = S.strapHi;
  const trim = tiger ? (x, y, z, s) => J(TG.blk, x, y, z, 400 + s, 0.03) : (x, y, z, s) => J(RP.greyLo, x, y, z, 400 + s, 0.03);
  const trimHi = tiger ? (x, y, z, s) => J(TG.wht, x, y, z, 410 + s, 0.03) : (x, y, z, s) => J(RP.grey, x, y, z, 410 + s, 0.03);

  const paintHelm = (H, rowY) => {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(0); y <= rowY(14) + 3; y++)
      for (let z = 2; z <= 17; z++)
        for (let x = 2; x <= 17; x++) {
          const dx = (x + 0.5 - 10) / 8.6;
          const dz = (z + 0.5 - 10) / 8.6;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(6);
          const top = rowY(12) + Math.round(3.6 * (1 - d2 * 0.9));
          if (upper && y > top) continue;
          const face = z >= 14 && x >= 5 && x <= 14 && y < rowY(10);
          if (face) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5.2;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(2) && !back) continue;
          set(x, y, z, hide(x, y, z, 1));
        }
    for (let x = 4; x <= 15; x++) for (const z of [15, 16, 17]) {
      if (z === 17 && Math.abs(x - 9.5) > 3) continue;
      set(x, rowY(10), z, trim(x, 10, z, 2));
      set(x, rowY(11), z, z === 17 ? hide(x, 11, z, 3) : trimHi(x, 11, z, 4));
    }
    if (tiger) {
      for (const side of [-1, 1]) {
        const ex = side < 0 ? 5 : 14;
        for (let dy = 0; dy < 5; dy++)
          for (let dx = -2; dx <= 2; dx++)
            for (let dz = -1; dz <= 1; dz++) {
              if (Math.abs(dx) / (2.8 - dy * 0.55) + Math.abs(dz) / 1.6 > 1) continue;
              const inner = dz === 1 && dy < 4 && Math.abs(dx) < 2;
              set(ex + dx, rowY(12) + 4 + dy, 10 + dz, dy === 4 ? J(TG.blk, dx, dy, dz, 420, 0.02) : inner ? J(TG.pink, dx, dy, dz, 421, 0.03) : J(TG.org, dx, dy, dz, 422, 0.04));
            }
      }
      for (const x of [6, 8, 11, 13]) set(x, rowY(12), 17, J(TG.blk, x, 12, 17, 423, 0.02));
      for (const x of [9, 10]) set(x, rowY(10), 17, TG.eye, true);
      for (let y = rowY(3); y <= rowY(8); y++) for (const x0 of [2, 17]) if (hash3(x0, y, 0, 424) > 0.3) set(x0, y, 11 + (y & 1), J(TG.wht, x0, y, 0, 425, 0.03));
    } else {
      for (let z = 3; z <= 15; z++) {
        const h = z % 3 === 0 ? 3 : 2;
        for (let k = 0; k < h; k++) for (const x of [9, 10]) set(x, rowY(14) + 2 + k, z, J(k === h - 1 ? RP.greyHi : RP.grey, x, k, z, 430, 0.03));
      }
      for (const x of [9, 10]) set(x, rowY(11), 17, RP.eye, true);
      for (const x of [5, 14]) for (let k = 0; k < 3; k++) set(x, rowY(8) + k, 16, J(RP.greyHi, x, k, 0, 431, 0.03));
    }
    for (let k = 0; k < 7; k++) {
      const y = rowY(12) + 2 + Math.round(k * 0.8);
      const z = 9 - Math.round(k * 0.95);
      const w = k < 3 ? 3 : k < 5 ? 2 : 1;
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) set(9 + a, y, z + b, k === 6 ? (tiger ? J(TG.blk, k, a, b, 432, 0.02) : J(RP.greyHi, k, a, b, 433, 0.02)) : hide(9 + a, y, z + b, 6));
    }
  };

  const paintChest = (T, ty) => {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        set(x, y, 13, hide(x, y, 13, 11));
        set(x, y, 14, y >= 8 && x >= 6 && x <= 19 ? hide(x, y, 14, 12) : hide(x, y, 13, 13));
        set(x, y, 4, hide(x, y, 4, 14));
      }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, hide(x, y, z, 15));
    }
    for (let y = 5; y <= 7; y++) {
      for (let x = 4; x <= 21; x++) {
        set(x, y, 15 - (y === 7 ? 1 : 0), y === 6 ? strapHi(x, y, 15, 20) : strap(x, y, 15, 21));
        set(x, y, 3, strap(x, y, 3, 22));
      }
      for (const x of [3, 22]) for (let z = 4; z <= 13; z++) set(x, y, z, strap(x, y, z, 23));
    }
    for (let y = -9; y <= 4; y++) {
      const edge = y === -9;
      for (let x = 7; x <= 18; x++) {
        set(x, y, 14, edge ? trimHi(x, y, 14, 24) : hide(x, y, 14, 26));
        set(x, y, 3, edge ? trimHi(x, y, 3, 27) : hide(x, y, 3, 28));
      }
      if (y > -9) for (const z of [4, 13]) {
        set(6, y, z, hide(6, y, z, 29));
        set(19, y, z, hide(19, y, z, 30));
      }
    }
    for (let y = -8; y <= -7; y++) for (let x = 7; x <= 18; x++) set(x, y, 14, x % 2 ? trim(x, y, 14, 31) : trimHi(x, y, 14, 32));
    for (let x = 4; x <= 21; x++)
      for (let z = 3; z <= 14; z++) {
        const edge = x <= 6 || x >= 19 || z <= 4 || z >= 13;
        if (edge) set(x, 19, z, (x + z) % 3 === 0 ? trimHi(x, 19, z, 33) : hide(x, 19, z, 34));
        if ((x <= 5 || x >= 20) && z >= 4 && z <= 13) set(x, 20, z, hide(x, 20, z, 35));
      }
    for (let k = 0; k < 7; k++) {
      const y = 18 - k;
      for (const x of [8 + k, 17 - k]) {
        set(x, y, 15, trim(x, y, 15, 36));
        set(x + (x < 12 ? 1 : -1), y, 15, strapHi(x, y, 15, 37));
      }
    }
    if (tiger) {
      for (let y = 14; y <= 19; y++) {
        const half = (y - 12) * 1.1;
        for (let x = 5; x <= 20; x++) {
          if (Math.abs(x - 12.5) > half) continue;
          if (hash3(x, y, 0, 440) < 0.2) continue;
          set(x, y, 15, J(y % 2 ? TG.wht : TG.whtLo, x, y, 15, 441, 0.03));
        }
      }
      for (let x = 5; x <= 20; x++)
        for (let z = 3; z <= 14; z++) {
          if (!(Math.abs(x - 12.5) > 4 || z < 5 || z > 12)) continue;
          for (let y = 19; y <= 21; y++) {
            const h = hash3(x, z, y, 442);
            if (h < 0.18 + (y - 19) * 0.22) continue;
            set(x, y, z, J(h > 0.6 ? TG.wht : TG.whtLo, x, y, z, 443, 0.03));
          }
        }
      for (let y = -4; y <= 3; y++) for (const x of [12, 13]) set(x, y, 15, strapHi(x, y, 15, 44));
      for (let k = 0; k < 5; k++) for (const x of [12, 13]) set(x, 12 + k, 16, J(k > 3 ? 0xfffbea : TG.claw, x, k, 0, 445, 0.02));
      for (let y = 9; y <= 11; y++) for (const x of [11, 14]) set(x, y, 16, J(TG.claw, x, y, 16, 446, 0.02));
      for (let y = -8; y <= 3; y += 3) for (const x of [9, 11, 14, 16]) {
        set(x, y, 14 + 0, J(TG.blk, x, y, 0, 447, 0.02));
        set(x, y + 1, 14, J(TG.blk, x, y + 1, 0, 448, 0.02));
      }
    } else {
      for (const side of [-1, 1]) {
        const bx = side < 0 ? 5 : 20;
        for (let k = 0; k < 4; k++) {
          const x = bx + side * Math.floor(k * 0.6);
          for (let h = 0; h < 4 - k; h++) set(x, 20 + k + h, 6 + k * 2, J(h === 3 - k ? RP.greyHi : RP.grey, x, h, k, 450, 0.03));
        }
      }
      for (let y = 8; y <= 18; y += 3) for (const x of [12, 13]) set(x, y, 16, J(RP.greyHi, x, y, 16, 451, 0.03));
      for (let y = -4; y <= 3; y++) for (const x of [12, 13]) set(x, y, 15, strapHi(x, y, 15, 452));
      for (let x = 11; x <= 14; x++) for (let y = 13; y <= 14; y++) set(x, y, 16, RP.eye, true);
      for (let k = 0; k < 10; k++) set(12 + (k & 1), 18 - k, 2, J(k % 3 === 0 ? RP.greyHi : RP.grey, k, 0, 0, 453, 0.03));
    }
  };

  const paintArm = (A, set) => {
    fill(set, 3, 3, 3, 10, 7, 11, (x, y, z) => (y === 6 ? trim(x, y, z, 40) : hide(x, y, z, 41)));
    fill(set, 2, 7, 2, 11, 10, 12, (x, y, z) => (y === 7 ? trim(x, y, z, 42) : hide(x, y, z, 43)));
    fill(set, 3, 10, 3, 10, 21, 11, (x, y, z) => hide(x, y, z, 45));
    fill(set, 2, 9, 2, 11, 10, 12, (x, y, z) => trimHi(x, y, z, 46));
    fill(set, 2, 21, 2, 11, 25, 12, (x, y, z) => (y === 21 ? strap(x, y, z, 47) : hide(x, y, z, 48)));
    fill(set, 3, 25, 3, 10, 27, 11, (x, y, z) => hide(x, y, z, 49));
    if (tiger) {
      for (let x = 2; x <= 10; x++) for (let z = 2; z <= 11; z++) if (hash3(x, z, 0, 460) > 0.25) set(x, 8, z, J(TG.wht, x, z, 0, 461, 0.03));
      for (let x = 2; x <= 10; x++) for (let z = 2; z <= 11; z++) if (hash3(x, z, 1, 462) > 0.5) set(x, 7, z, J(TG.whtLo, x, z, 1, 463, 0.03));
      for (const z of [5, 8]) clawAt(set, 12, 18, z, 'y', -1, 4, TG.claw, TG.clawLo);
    } else {
      for (let x = 2; x <= 10; x += 2) for (let z = 2; z <= 11; z += 3) set(x, 8, z, J(RP.greyHi, x, z, 0, 464, 0.03));
      for (const z of [5, 8]) clawAt(set, 12, 18, z, 'y', -1, 4, RP.claw, RP.clawLo);
    }
    for (const x of [3, 6, 9]) set(x, 25, 6, J(S.claw, x, 25, 6, 465, 0.03));
  };

  const paintLeg = (set, flags) => {
    if (flags.legs) {
      fill(set, 2, 12, 2, 11, 23, 11, (x, y, z) => (y === 17 ? strapHi(x, y, z, 60) : hide(x, y, z, 61)));
      fill(set, 2, 10, 2, 11, 13, 11, (x, y, z) => (y === 10 ? trimHi(x, y, z, 62) : hide(x, y, z, 63)));
      fill(set, 2, 23, 2, 11, 24, 11, (x, y, z) => strap(x, y, z, 64));
      for (let y = 14; y <= 21; y += 2) set(6, y, 11, J(S.claw, 6, y, 11, 65, 0.03));
    }
    if (flags.boots) {
      fill(set, 3, 1, 3, 10, 7, 10, (x, y, z) => hide(x, y, z, 70));
      fill(set, 2, 5, 2, 11, 8, 11, (x, y, z) => (y === 5 ? trimHi(x, y, z, 71) : hide(x, y, z, 72)));
      fill(set, 2, 0, 3, 11, 1, 13, (x, y, z) => J(0x16110d, x, y, z, 73, 0.03));
      fill(set, 2, 1, 3, 11, 4, 13, (x, y, z) => (tiger && z >= 11 ? J(TG.wht, x, y, z, 74, 0.03) : hide(x, y, z, 75)));
      fill(set, 4, 3, 13, 9, 4, 14, (x, y, z) => (tiger ? J(TG.wht, x, y, z, 76, 0.03) : hide(x, y, z, 76)));
      for (const x of [5, 7]) set(x, 4, 14, J(S.claw, x, 4, 14, 77, 0.02));
    }
  };

  return { paintHelm, paintChest, paintArm, paintLeg };
}

/* ------------------------------------------------------------------ */
/* Pirates                                                             */
/* ------------------------------------------------------------------ */

const PR = {
  navy: 0x24346a, navyHi: 0x35498c, navyLo: 0x182248, navyDeep: 0x111a38, gold: 0xd2a22c, goldHi: 0xffd95a, goldLo: 0x9a7518,
  red: 0xb02a2a, redLo: 0x781818, brown: 0x5a3a1e, brownLo: 0x3a2412, brownHi: 0x7a5230, bone: 0xe8e0c8, boneLo: 0xbfb496, black: 0x1c1820, blackHi: 0x2c2630,
  redCoat: 0x8a1c24, redCoatHi: 0xb02a34, glow: 0x4cf08a,
};

const navy = (x, y, z, s = 0) => {
  const seam = x % 5 === 0 || y % 5 === 0;
  return J(seam ? PR.navyLo : (x + y) & 1 ? PR.navy : PR.navyHi, x, y, z, 500 + s, 0.03);
};
const gold = (x, y, z, s = 0) => J(((x + y + z) & 3) === 0 ? PR.goldHi : PR.gold, x, y, z, 520 + s, 0.03);
const goldLo = (x, y, z, s = 0) => J(PR.goldLo, x, y, z, 540 + s, 0.03);
const brown = (x, y, z, s = 0) => J(PR.brown, x, y, z, 560 + s, 0.04);

function pirateMetal() {
  const paintHelm = (H, rowY) => {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(3); y <= rowY(13); y++)
      for (let z = 3; z <= 16; z++)
        for (let x = 3; x <= 16; x++) {
          const dx = (x + 0.5 - 10) / 7.9;
          const dz = (z + 0.5 - 10) / 7.9;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(7);
          const top = rowY(12) + Math.round(2.4 * (1 - d2));
          if (upper && y > top) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(3) + 2 && z > 10) continue;
          if (z >= 14 && y < rowY(8)) continue;
          set(x, y, z, y >= rowY(8) ? J(PR.red, x, y, z, 570, 0.04) : J(hash3(x, y, z, 583) > 0.6 ? 0x3a2a1e : 0x241810, x, y, z, 584, 0.05));
        }
    for (let x = 6; x <= 13; x++) set(x, rowY(8), 16, J(PR.red, x, 8, 16, 571, 0.04));
    for (let k = 0; k < 4; k++) {
      set(8 + (k & 1), rowY(8) - k, 2, J(PR.red, k, 0, 0, 572, 0.04));
      set(10 + (k & 1), rowY(8) - k - 1, 2, J(PR.redLo, k, 0, 0, 573, 0.04));
    }
    set(9, rowY(8), 3, PR.redLo);
    set(10, rowY(8), 3, PR.redLo);
    set(9, rowY(9), 2, PR.redLo);
    set(10, rowY(9), 2, PR.redLo);
    const rBase = 6.2;
    const corners = [Math.PI / 2, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9];
    for (let z = 0; z < 20; z++)
      for (let x = 0; x < 20; x++) {
        const dx = x + 0.5 - 10;
        const dz = z + 0.5 - 10;
        const d = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        let c = 0;
        for (const a0 of corners) {
          const da = Math.abs(Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0)));
          c = Math.max(c, 1 - da / 0.62);
        }
        c = Math.max(0, c);
        const reach = 8.4 + c * 3.2;
        if (d <= rBase) {
          for (let y = rowY(11); y <= rowY(12) + 3; y++) {
            if (y > rowY(12) + 2 && d > rBase - 1.5) continue;
            set(x, y, z, y === rowY(12) + 3 ? J(PR.navyHi, x, y, z, 574, 0.03) : y === rowY(11) || y === rowY(11) + 1 ? J(PR.gold, x, y, z, 575, 0.03) : J(PR.navy, x, y, z, 576, 0.03));
          }
        }
        if (d > rBase - 0.5 && d <= reach) {
          const frac = (d - rBase) / (reach - rBase);
          const lift = Math.round(c * frac * 4.5);
          const edge = d > reach - 1.3;
          const y0 = rowY(10) + lift;
          set(x, y0, z, edge ? J(PR.goldHi, x, 10, z, 577, 0.03) : J(PR.navyLo, x, 10, z, 578, 0.03));
          set(x, y0 + 1, z, edge ? J(PR.gold, x, 1, z, 579, 0.03) : J(PR.navy, x, 11, z, 580, 0.03));
          if (c > 0.15 && frac > 0.3) for (let k = 1; k <= lift; k++) set(x, y0 - k, z, J(PR.navyDeep, x, k, z, 585, 0.03));
        }
      }
    for (let y = rowY(12) - 1; y <= rowY(12) + 1; y++) for (const x of [9, 10]) set(x, y, 16, J(PR.goldHi, x, y, 16, 581, 0.02));
    for (const [x, y] of [[8, 1], [11, 1], [9, 0], [10, 0], [9, 2], [10, 2]]) set(x, rowY(12) + y - 1, 17, J(y === 1 ? PR.black : PR.goldHi, x, y, 17, 582, 0.02));
  };

  const paintChest = (T, ty) => {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        const seam = x === 12 || x === 13;
        set(x, y, 13, navy(x, y, 13, 1));
        set(x, y, 14, y >= 7 && x >= 7 && x <= 18 ? (seam ? J(PR.navyDeep, x, y, 14, 2, 0.03) : navy(x, y, 14, 3)) : navy(x, y, 13, 4));
        set(x, y, 4, navy(x, y, 4, 5));
      }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, navy(x, y, z, 6));
    }
    for (let k = 0; k < 9; k++) {
      const y = 18 - k;
      for (const x of [9 + Math.floor(k * 0.35), 16 - Math.floor(k * 0.35)]) {
        set(x, y, 15, J(PR.navyHi, x, y, 15, 7, 0.03));
        set(x + (x < 12 ? -1 : 1), y, 15, J(PR.gold, x, y, 15, 8, 0.03));
        set(x + (x < 12 ? -1 : 1), y, 14, J(PR.gold, x, y, 14, 9, 0.03));
      }
    }
    for (let y = 7; y <= 17; y += 2) for (const x of [10, 11, 14, 15]) {
      if ((x === 10 || x === 15) && y > 15) continue;
      set(x, y, 16, J(PR.goldHi, x, y, 16, 10, 0.02));
      set(x, y + 0, 15, J(PR.gold, x, y, 15, 11, 0.02));
    }
    for (let y = 5; y <= 6; y++) {
      for (let x = 4; x <= 21; x++) {
        set(x, y, 15, brown(x, y, 15, 12));
        set(x, y, 3, brown(x, y, 3, 13));
      }
      for (const x of [4, 21]) for (let z = 4; z <= 14; z++) set(x, y, z, brown(x, y, z, 14));
    }
    for (let x = 10; x <= 15; x++) for (let y = 4; y <= 7; y++) {
      const rim = x === 10 || x === 15 || y === 4 || y === 7;
      set(x, y, 16, rim ? J(PR.goldHi, x, y, 16, 15, 0.02) : J(PR.brownLo, x, y, 16, 16, 0.03));
      if (rim) set(x, y, 17, J(PR.gold, x, y, 17, 17, 0.02));
    }
    for (let x = 5; x <= 20; x++) for (let z = 3; z <= 14; z++) {
      const edge = x <= 7 || x >= 18 || z <= 4 || z >= 13;
      if (edge) set(x, 19, z, (x + z) % 4 === 0 ? J(PR.gold, x, 19, z, 18, 0.03) : navy(x, 19, z, 19));
    }
    for (let x = 4; x <= 21; x++) for (let z = 4; z <= 13; z++) {
      if (x > 7 && x < 18) continue;
      set(x, 19, z, navy(x, 19, z, 20));
    }
    for (let x = 8; x <= 17; x++) {
      for (const z of [3, 14]) set(x, 17, z, J(PR.gold, x, 17, z, 21, 0.03));
    }
    for (let y = -7; y <= 4; y++) {
      const hem = y === -7;
      for (let x = 7; x <= 18; x++) {
        set(x, y, 3, hem ? gold(x, y, 3, 22) : navy(x, y, 3, 23));
        if (Math.abs(x - 12.5) > 3.5 || y > 1) set(x, y, 14, hem ? gold(x, y, 14, 24) : navy(x, y, 14, 25));
      }
      for (const x of [6, 19]) {
        if (y > -5) set(x, y, 8, hem ? gold(x, y, 8, 26) : navy(x, y, 8, 27));
      }
    }
    for (let y = -5; y <= 3; y += 2) for (const x of [12, 13]) set(x, y, 4, J(PR.gold, x, y, 4, 28, 0.02));
    for (let a = 0; a < 28; a++) {
      const ang = (a / 28) * Math.PI * 2;
      const x = Math.round(12.5 + Math.cos(ang) * 3.4 - 0.5);
      const y = Math.round(12 + Math.sin(ang) * 3.4 - 0.5);
      set(x, y, 2, a % 3 === 0 ? gold(x, y, 2, 29) : goldLo(x, y, 2, 30));
    }
    for (const [x, y] of [[11, 12], [14, 12], [12, 11], [13, 11], [12, 13], [13, 13], [12, 12], [13, 12]]) set(x, y, 2, J(PR.bone, x, y, 2, 31, 0.02));
    for (const x of [11, 14]) set(x, 13, 2, PR.black);
  };

  const paintArm = (A, set) => {
    fill(set, 3, 3, 3, 10, 6, 11, (x, y, z) => (y === 5 ? goldLo(x, y, z, 40) : J(PR.navyLo, x, y, z, 41, 0.03)));
    fill(set, 2, 6, 2, 11, 12, 12, (x, y, z) => navy(x, y, z, 42));
    fill(set, 1, 12, 1, 12, 16, 13, (x, y, z) => (y === 12 || y === 15 ? gold(x, y, z, 43) : J(y === 13 ? PR.navyHi : PR.navy, x, y, z, 44, 0.03)));
    for (const z of [4, 6, 8]) set(1, 14, z, J(PR.goldHi, z, 0, 0, 45, 0.02));
    fill(set, 3, 16, 3, 10, 21, 11, (x, y, z) => navy(x, y, z, 46));
    fill(set, 2, 21, 2, 11, 26, 12, (x, y, z) => (y === 21 ? gold(x, y, z, 47) : y === 25 ? J(PR.navyHi, x, y, z, 48, 0.03) : navy(x, y, z, 49)));
    fill(set, 3, 26, 3, 10, 27, 11, (x, y, z) => navy(x, y, z, 58));
    fill(set, 12, 21, 3, 13, 25, 11, (x, y, z) => (y === 21 ? gold(x, y, z, 50) : navy(x, y, z, 51)));
    for (let z = 3; z <= 10; z++) {
      set(12, 20, z, J(PR.gold, z, 0, 0, 52, 0.03));
      set(12, 19, z, hash3(z, 0, 0, 53) > 0.3 ? J(PR.goldHi, z, 1, 0, 54, 0.03) : J(PR.goldLo, z, 2, 0, 55, 0.03));
      if (z % 2) set(12, 18, z, J(PR.goldLo, z, 3, 0, 56, 0.03));
    }
    for (const z of [5, 8]) set(12, 23, z, J(PR.goldHi, z, 4, 0, 57, 0.02));
  };

  const paintLeg = (set, flags) => {
    if (flags.legs) {
      fill(set, 2, 12, 2, 11, 24, 11, (x, y, z) => (y === 23 ? gold(x, y, z, 60) : navy(x, y, z, 61)));
      fill(set, 2, 18, 2, 11, 20, 11, (x, y, z) => brown(x, y, z, 62));
      for (let x = 5; x <= 7; x++) for (let y = 17; y <= 20; y++) set(x, y, 11, (x === 5 || x === 7 || y === 17 || y === 20) ? gold(x, y, 11, 63) : J(PR.brownLo, x, y, 11, 64, 0.03));
      fill(set, 2, 10, 2, 11, 12, 11, (x, y, z) => (y === 10 ? goldLo(x, y, z, 65) : navy(x, y, z, 66)));
      for (let y = 11; y <= 14; y++) for (let x = 4; x <= 8; x++) {
        const d = Math.abs(x - 6) + Math.abs(y - 12.5) * 0.9;
        if (d > 2.6) continue;
        set(x, y, 11, d > 1.6 ? gold(x, y, 11, 67) : J(PR.goldHi, x, y, 11, 68, 0.02));
        if (d < 1) set(x, y, 12, J(PR.goldHi, x, y, 12, 69, 0.02));
      }
      for (let y = 13; y <= 22; y += 3) set(10, y, 6, J(PR.gold, y, 0, 0, 70, 0.03));
    }
    if (flags.boots) {
      const leather = (x, y, z, s) => J(((x + z) & 3) === 0 ? 0x3b2616 : 0x2f1d10, x, y, z, 80 + s, 0.04);
      fill(set, 2, 2, 2, 11, 10, 11, (x, y, z) => (y >= 8 ? J(PR.brownHi, x, y, z, 71, 0.04) : leather(x, y, z, 1)));
      fill(set, 1, 7, 1, 12, 8, 12, (x, y, z) => J(PR.brownHi, x, y, z, 72, 0.04));
      fill(set, 2, 0, 2, 11, 1, 13, (x, y, z) => J(0x16110d, x, y, z, 73, 0.03));
      fill(set, 2, 1, 3, 11, 4, 13, (x, y, z) => leather(x, y, z, 2));
      fill(set, 3, 4, 10, 10, 5, 12, (x, y, z) => leather(x, y, z, 3));
      for (const x of [3, 4, 5, 6, 7, 8, 9]) {
        set(x, 3, 13, J(PR.brownLo, x, 3, 13, 74, 0.03));
      }
      for (let x = 5; x <= 8; x++) for (let y = 4; y <= 6; y++) {
        const rim = x === 5 || x === 8 || y === 4 || y === 6;
        set(x, y, 11, rim ? gold(x, y, 11, 75) : J(PR.brownLo, x, y, 11, 76, 0.03));
      }
      set(6, 5, 12, J(PR.goldHi, 6, 5, 12, 77, 0.02));
      for (const x of [3, 9]) set(x, 8, 11, J(PR.goldHi, x, 8, 11, 78, 0.02));
      for (let x = 2; x <= 10; x += 2) set(x, 10, 1, J(PR.goldLo, x, 10, 1, 79, 0.03));
    }
  };

  return { paintHelm, paintChest, paintArm, paintLeg };
}

function pirateCloth() {
  const coat = (x, y, z, s = 0) => J((x + z) % 4 === 0 ? 0x3a3346 : 0x252030, x, y, z, 600 + s, 0.03);
  const rd = (x, y, z, s = 0) => J(((x + z) & 3) === 0 ? PR.redCoatHi : PR.redCoat, x, y, z, 620 + s, 0.035);
  const bone = (x, y, z, s = 0) => J(((x + y) & 1) ? PR.bone : PR.boneLo, x, y, z, 640 + s, 0.025);
  const bonePin = (x, y, z, s = 0) => J(PR.bone, x, y, z, 660 + s, 0.02);

  const paintHelm = (H, rowY) => {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(0); y <= rowY(14) + 2; y++)
      for (let z = 2; z <= 17; z++)
        for (let x = 2; x <= 17; x++) {
          const dx = (x + 0.5 - 10) / 8.5;
          const dz = (z + 0.5 - 9.8) / 8.5;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(6);
          const top = rowY(12) + Math.round(3.2 * (1 - d2 * 0.9));
          if (upper && y > top) continue;
          const face = z >= 14 && x >= 5 && x <= 14 && y < rowY(10);
          if (face) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5.2;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(2) && !back) continue;
          set(x, y, z, coat(x, y, z, 1));
        }
    for (let y = rowY(9); y <= rowY(11); y++)
      for (let z = 2; z <= 17; z++)
        for (let x = 2; x <= 17; x++) {
          const dx = (x + 0.5 - 10) / 8.6;
          const dz = (z + 0.5 - 9.8) / 8.6;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1 || d2 < 0.55) continue;
          if (z >= 14 && x >= 5 && x <= 14 && y < rowY(10)) continue;
          set(x, y, z, rd(x, y, z, 2));
        }
    for (let x = 4; x <= 15; x++) for (const z of [15, 16, 17]) {
      if (z === 17 && Math.abs(x - 9.5) > 3.5) continue;
      set(x, rowY(10), z, rd(x, 10, z, 3));
      set(x, rowY(11), z, rd(x, 11, z, 4));
    }
    for (let k = 0; k < 5; k++) {
      set(2 + (k & 1), rowY(9) - k, 5 - (k >> 1), rd(k, 0, 0, 5));
      set(3 + (k & 1), rowY(8) - k, 4, rd(k, 1, 0, 6));
    }
    for (let k = 0; k < 6; k++) for (const x of [3, 4]) set(x, rowY(10) - k, 2, rd(x, k, 1, 7));
    for (let x = 4; x <= 15; x += 2) set(x, rowY(11), 17, J(PR.gold, x, 0, 0, 8, 0.03));
    for (const [x, y] of [[9, 12], [10, 12], [9, 11], [10, 11]]) set(x, rowY(y - 1), 18, bonePin(x, y, 18, 9));
    set(9, rowY(10), 18, PR.black);
    set(10, rowY(10), 18, PR.black);
    set(9, rowY(11) + 1, 18, bonePin(9, 0, 0, 10));
    set(10, rowY(11) + 1, 18, bonePin(10, 0, 0, 11));
    for (const x of [8, 11]) set(x, rowY(11) + 2, 17, J(PR.glow, x, 0, 0, 12, 0.01), true);
  };

  const paintChest = (T, ty) => {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        set(x, y, 13, coat(x, y, 13, 1));
        set(x, y, 14, y >= 8 && x >= 6 && x <= 19 ? coat(x, y, 14, 2) : coat(x, y, 13, 3));
        set(x, y, 4, coat(x, y, 4, 4));
      }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, coat(x, y, z, 5));
    }
    for (let k = 0; k < 10; k++) {
      const y = 18 - k;
      for (const x of [8 + Math.floor(k * 0.4), 17 - Math.floor(k * 0.4)]) {
        for (let w = 0; w < 3; w++) set(x + (x < 12 ? -w : w), y, 15, rd(x, y, w, 6));
        set(x + (x < 12 ? 1 : -1), y, 15, J(PR.gold, x, y, 15, 7, 0.02));
      }
    }
    for (let y = 8; y <= 17; y += 2) for (const x of [10, 15]) {
      set(x, y, 16, bonePin(x, y, 16, 8));
      set(x, y, 15, bonePin(x, y, 15, 9));
    }
    for (let y = 5; y <= 7; y++) {
      for (let x = 4; x <= 21; x++) {
        set(x, y, 15 - (y === 7 ? 1 : 0), y === 6 ? J(PR.redCoatHi, x, y, 15, 10, 0.03) : rd(x, y, 15, 11));
        set(x, y, 3, rd(x, y, 3, 12));
      }
      for (const x of [3, 22]) for (let z = 4; z <= 13; z++) set(x, y, z, rd(x, y, z, 13));
    }
    for (let x = 11; x <= 14; x++) for (let y = 5; y <= 7; y++) set(x, y, 16, J(PR.gold, x, y, 16, 14, 0.02));
    for (const [x, y] of [[12, 6], [13, 6]]) set(x, y, 17, bonePin(x, y, 17, 15));
    for (let y = -9; y <= 4; y++) {
      const hem = y === -9;
      for (let x = 7; x <= 18; x++) {
        const lining = Math.abs(x - 12.5) < 2 && y < 3;
        set(x, y, 14, hem ? (x % 2 ? bone(x, y, 14, 16) : J(PR.gold, x, y, 14, 17, 0.03)) : lining ? rd(x, y, 14, 18) : coat(x, y, 14, 19));
        set(x, y, 3, hem ? (x % 2 ? bone(x, y, 3, 20) : J(PR.gold, x, y, 3, 21, 0.03)) : coat(x, y, 3, 22));
      }
      for (const z of [4, 13]) {
        set(6, y, z, hem ? bone(6, y, z, 23) : coat(6, y, z, 24));
        set(19, y, z, hem ? bone(19, y, z, 25) : coat(19, y, z, 26));
      }
    }
    for (let y = -8; y <= -7; y++) for (let x = 7; x <= 18; x++) set(x, y, 14, rd(x, y, 14, 27));
    for (let y = -4; y <= 2; y += 3) for (const x of [10, 15]) set(x, y, 15, bonePin(x, y, 15, 28));
    for (let x = 4; x <= 21; x++) for (let z = 3; z <= 14; z++) {
      const edge = x <= 6 || x >= 19 || z <= 4 || z >= 13;
      if (edge) set(x, 19, z, (x + z) % 3 === 0 ? J(PR.gold, x, 19, z, 29, 0.03) : coat(x, 19, z, 30));
      if ((x <= 5 || x >= 20) && z >= 4 && z <= 13) set(x, 20, z, coat(x, 20, z, 31));
    }
    for (let x = 8; x <= 17; x++) for (const z of [3, 14]) set(x, 18, z, rd(x, 18, z, 32));
    for (let a = 0; a < 22; a++) {
      const ang = (a / 22) * Math.PI * 2;
      const x = Math.round(12.5 + Math.cos(ang) * 3.2 - 0.5);
      const y = Math.round(10.5 + Math.sin(ang) * 3.2 - 0.5);
      set(x, y, 2, a % 2 ? J(PR.gold, x, y, 2, 33, 0.03) : bone(x, y, 2, 34));
    }
    for (const [x, y] of [[11, 11], [14, 11], [12, 10], [13, 10], [12, 11], [13, 11], [12, 12], [13, 12]]) set(x, y, 2, bone(x, y, 2, 35));
    for (const x of [11, 14]) set(x, 11, 1, PR.glow, true);
  };

  const paintArm = (A, set) => {
    fill(set, 3, 3, 3, 10, 7, 11, (x, y, z) => (y === 6 ? J(PR.gold, x, y, z, 40, 0.03) : coat(x, y, z, 41)));
    fill(set, 2, 7, 2, 11, 14, 12, (x, y, z) => (y === 7 ? J(PR.gold, x, y, z, 42, 0.03) : rd(x, y, z, 43)));
    fill(set, 1, 13, 1, 12, 15, 13, (x, y, z) => (y === 14 ? bone(x, y, z, 44) : rd(x, y, z, 45)));
    fill(set, 3, 15, 3, 10, 21, 11, (x, y, z) => coat(x, y, z, 46));
    fill(set, 2, 21, 2, 11, 25, 12, (x, y, z) => (y === 21 ? J(PR.gold, x, y, z, 47, 0.03) : coat(x, y, z, 48)));
    fill(set, 3, 25, 3, 10, 27, 11, (x, y, z) => coat(x, y, z, 53));
    for (const z of [5, 8]) set(1, 14, z, bonePin(z, 0, 0, 49));
    for (const z of [5, 8]) set(12, 12, z, bonePin(z, 1, 0, 50));
    for (let z = 3; z <= 10; z++) set(12, 22, z, z % 2 ? J(PR.gold, z, 0, 0, 51, 0.03) : bone(z, 0, 0, 52));
  };

  const paintLeg = (set, flags) => {
    if (flags.legs) {
      fill(set, 2, 12, 2, 11, 23, 11, (x, y, z) => (y === 17 ? rd(x, y, z, 60) : coat(x, y, z, 61)));
      fill(set, 2, 10, 2, 11, 13, 11, (x, y, z) => (y === 10 ? J(PR.gold, x, y, z, 62, 0.03) : coat(x, y, z, 63)));
      fill(set, 2, 23, 2, 11, 24, 11, (x, y, z) => rd(x, y, z, 64));
      for (let y = 12; y <= 14; y++) for (const x of [5, 8]) set(x, y, 11, bonePin(x, y, 11, 65));
      for (let y = 12; y <= 14; y += 2) set(6, y, 11, J(PR.redCoatHi, 6, y, 11, 66, 0.03));
      for (let y = 18; y <= 22; y += 2) set(10, y, 6, bonePin(10, y, 6, 67));
    }
    if (flags.boots) {
      fill(set, 3, 1, 3, 10, 7, 10, (x, y, z) => coat(x, y, z, 70));
      fill(set, 2, 5, 2, 11, 8, 11, (x, y, z) => (y === 5 ? J(PR.gold, x, y, z, 71, 0.03) : rd(x, y, z, 72)));
      fill(set, 2, 0, 3, 11, 1, 13, (x, y, z) => J(0x16110d, x, y, z, 73, 0.03));
      fill(set, 2, 1, 3, 11, 4, 13, (x, y, z) => (z >= 11 ? bone(x, y, z, 74) : coat(x, y, z, 75)));
      fill(set, 4, 3, 13, 9, 4, 14, (x, y, z) => bone(x, y, z, 76));
      for (const x of [5, 6, 7]) for (let y = 5; y <= 7; y++) set(x, y, 11, (x === 6 && y === 6) ? PR.black : J(PR.gold, x, y, 11, 77, 0.02));
    }
  };

  return { paintHelm, paintChest, paintArm, paintLeg };
}

const JUNGLE_BUILD = {
  tigerleather: () => leatherJungle('tiger'),
  tigercloth: () => clothJungle('tiger'),
  raptorleather: () => leatherJungle('raptor'),
  raptorcloth: () => clothJungle('raptor'),
  pirateset: pirateMetal,
  piratecloth: pirateCloth,
};

export const JUNGLE_SETS = Object.keys(JUNGLE_BUILD);
export const makeJungleArmor = (setId) => JUNGLE_BUILD[setId]();
