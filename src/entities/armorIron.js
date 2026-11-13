/** Metal plate in the iron cuts, tinted per tier. */
import { hash3, jitter, shade } from '../engine/voxel.js';
import { METAL_BY_ID } from '../data/metals.js';

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));

const IRON_PAL = METAL_BY_ID.iron.armorPal;

/** Painter module {paintHelm, paintChest, paintArm, paintLeg} for one metal palette. */
export function makeMetalArmor(P = IRON_PAL) {
  const scaleColor = (x, y, z, s = 40) => {
    const row = y >> 1;
    const p = (x + z + (row & 1) * 2) % 4;
    let base = P.plate;
    if (p === 0) base = P.plateLo;
    else if (p === 3) base = P.plateHi;
    if (p !== 0 && (y & 1) === 0) base = shade(base, 0.9);
    return J(base, x, y, z, s, 0.04);
  };
  const plate = (x, y, z, s) => J(P.plate, x, y, z, s, 0.05);
  const gold = (x, y, z, s) => J(P.trim, x, y, z, s, 0.04);
  const goldDark = (x, y, z, s) => J(P.trimDk, x, y, z, s, 0.04);
  const horn = (x, y, z, s) => J(P.plateHi, x, y, z, s, 0.04);
  const hornDark = (x, y, z, s) => J(P.trim, x, y, z, s, 0.04);
  const claw = (x, y, z, s) => J(P.accent, x, y, z, s, 0.03);

  function paintHelm(H, rowY) {
    const set = (x, y, z, c, g) => H.set(x, y, z, c, g);
    for (let y = rowY(3); y <= rowY(14) + 3; y++)
      for (let z = 3; z <= 16; z++)
        for (let x = 3; x <= 16; x++) {
          const dx = (x + 0.5 - 10) / 8.1;
          const dz = (z + 0.5 - 10) / 8.1;
          const d2 = dx * dx + dz * dz;
          if (d2 > 1) continue;
          const upper = y >= rowY(7);
          const top = rowY(12) + Math.round(3.4 * (1 - d2 * 0.95) * (1 - d2 * 0.3));
          if (upper && y > top) continue;
          const side = Math.abs(x + 0.5 - 10) >= 5;
          const back = z <= 6;
          if (!upper && !(side || back)) continue;
          if (!upper && y < rowY(3) + 1 && z > 11) continue;
          if (z >= 14 && y < rowY(9)) continue;
          const rim = y === rowY(7) || (y >= rowY(7) && y <= rowY(7) + 1 && z >= 13);
          set(x, y, z, rim ? goldDark(x, y, z, 41) : scaleColor(x, y, z, 42));
        }
    for (let x = 4; x <= 15; x++) {
      const out = Math.abs(x - 9.5) > 3.5;
      set(x, rowY(9), 15, hornDark(x, 9, 15, 43));
      set(x, rowY(9), 16, horn(x, 9, 16, 44));
      set(x, rowY(10), 15, hornDark(x, 10, 15, 45));
      if (out) set(x, rowY(10), 16, horn(x, 10, 16, 46));
    }
    for (const x of [4, 5, 14, 15]) set(x, rowY(11), 16, horn(x, 11, 16, 47));
    for (const x of [4, 15]) set(x, rowY(12), 15, horn(x, 12, 15, 48));
    for (let y = rowY(5); y <= rowY(8); y++) for (const x of [9, 10]) set(x, y, 16, hornDark(x, y, 16, 49));

    for (const side of [-1, 1]) {
      const bx = side < 0 ? 3 : 16;
      for (let k = 0; k <= 10; k++) {
        const out = Math.min(3, Math.floor(k / 2));
        const x = bx + side * out;
        const y = rowY(9) + Math.floor(k * 0.75);
        const z = 10 - Math.floor(k * 0.85);
        const wid = k < 4 ? 3 : k < 8 ? 2 : 1;
        for (let a = 0; a < wid; a++)
          for (let b = 0; b < wid; b++)
            for (let c = 0; c < Math.min(2, wid); c++) {
              const col = k % 4 === 3 ? hornDark(x, y, z, 50) : horn(x, y, z, 51);
              set(x + (side < 0 ? a : -a), y + c, z + b, col);
            }
      }
      set(bx + side, rowY(4), 13, claw(bx, 4, 13, 52));
      set(bx + side * 2, rowY(4), 12, claw(bx, 4, 12, 53));
      set(bx + side * 2, rowY(5), 11, claw(bx, 5, 11, 54));
    }
    for (let z = 4; z <= 14; z++) {
      const h = z % 3 === 0 ? 3 : 2;
      const n = Math.abs(z - 9) > 3 ? 1 : 0;
      for (let k = 0; k < h - n; k++)
        for (const x of [9, 10]) set(x, rowY(14) - 1 + k, z, k === h - n - 1 ? horn(x, k, z, 55) : scaleColor(x, rowY(14) + k, z, 56));
    }
  }

  function paintChest(T, ty) {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        set(x, y, 13, scaleColor(x, y, 13, 60));
        set(x, y, 4, scaleColor(x, y, 4, 61));
      }
      if (y >= 6)
        for (let x = 9; x <= 16; x++) {
          const edge = x === 9 || x === 16;
          set(x, y, 14, edge ? goldDark(x, y, 14, 62) : y % 2 ? gold(x, y, 14, 63) : goldDark(x, y, 14, 64));
        }
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, scaleColor(x, y, z, 65));
    }
    for (let y = 7; y <= 18; y += 2) for (const x of [10, 15]) set(x, y, 15, horn(x, y, 15, 66));
    for (let y = 6; y <= 16; y++) {
      if (y % 3 !== 0) continue;
      for (const x of [12, 13]) {
        set(x, y, 3, horn(x, y, 3, 68));
        set(x, y + 1, 2, horn(x, y, 2, 69));
      }
    }
    for (let x = 5; x <= 20; x++) for (let z = 3; z <= 14; z++) {
      const edge = x <= 6 || x >= 19 || z <= 4 || z >= 13;
      if (edge) set(x, 19, z, hash3(x, 19, z, 71) > 0.5 ? scaleColor(x, 19, z, 70) : goldDark(x, 19, z, 72));
    }
    for (let x = 4; x <= 21; x++) for (let z = 4; z <= 13; z++) {
      if (x > 6 && x < 19) continue;
      set(x, 19, z, scaleColor(x, 19, z, 73));
    }
    for (const x of [6, 19]) for (let z = 6; z <= 11; z += 2) set(x, 20, z, horn(x, 20, z, 74));
  }

  function paintArm(A, set, parts) {
    const fill = (x0, y0, z0, x1, y1, z1, fn) => {
      for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, z, fn(x, y, z));
    };
    fill(2, 5, 2, 11, 15, 12, (x, y, z) => (y === 14 || y === 5 ? goldDark(x, y, z, 80) : scaleColor(x, y, z, 81)));
    fill(3, 14, 3, 10, 16, 11, (x, y, z) => goldDark(x, y, z, 82));
    fill(3, 3, 3, 10, 5, 11, (x, y, z) => (x === 3 || x === 9 ? scaleColor(x, y, z, 83) : null) ?? plate(x, y, z, 84));
    for (const x of [4, 6, 8]) {
      set(x, 4, 11, horn(x, 4, 11, 85));
      set(x, 3, 11, claw(x, 3, 11, 86));
      set(x, 2, 11, claw(x, 2, 11, 87));
    }
    for (let z = 4; z <= 9; z += 2) set(11, 10, z, horn(11, 10, z, 88));
    const layers = [
      [21, 2, 11, 2, 11],
      [22, 2, 11, 2, 11],
      [23, 2, 11, 2, 11],
      [24, 2, 11, 2, 11],
      [25, 3, 10, 3, 10],
      [26, 3, 10, 3, 10],
      [27, 4, 9, 4, 9],
    ];
    for (const [y, x0, x1, z0, z1] of layers) {
      fill(x0, y, z0, x1 + 1, y + 1, z1 + 1, (x, yy, z) => {
        const rim = (x === x0 || x === x1 || z === z0 || z === z1) && yy === 21;
        return rim ? goldDark(x, yy, z, 91) : yy % 2 ? scaleColor(x, yy, z, 89) : plate(x, yy, z, 90);
      });
    }
    fill(12, 21, 3, 13, 26, 11, (x, y, z) => scaleColor(x, y, z, 96));
    for (const [y, x, z] of [[22, 12, 6], [23, 12, 6], [24, 12, 6], [23, 12, 7], [24, 12, 7], [25, 13, 6], [26, 13, 6], [27, 13, 6]]) set(x, y, z, horn(x, y, z, 92));
    set(6, 28, 6, horn(6, 28, 6, 93));
    set(6, 29 - 1, 7, horn(6, 29, 7, 94));
    set(7, 28, 7, horn(7, 28, 7, 95));
    void A;
    void parts;
  }

  function paintLeg(set, flags) {
    const fill = (x0, y0, z0, x1, y1, z1, fn) => {
      for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, z, fn(x, y, z));
    };
    if (flags.legs) {
      fill(2, 12, 2, 11, 24, 11, (x, y, z) => (y % 5 === 0 ? goldDark(x, y, z, 100) : scaleColor(x, y, z, 101)));
      fill(2, 10, 2, 11, 12, 11, (x, y, z) => goldDark(x, y, z, 102));
      for (const y of [10, 11]) for (let x = 5; x <= 7; x++) set(x, y, 12, y === 11 ? horn(x, y, 12, 103) : hornDark(x, y, 12, 104));
      set(6, 11, 13, horn(6, 11, 13, 105));
      for (let y = 14; y < 24; y += 3) for (let x = 3; x <= 9; x++) set(x, y, 11, y % 2 ? gold(x, y, 11, 106) : goldDark(x, y, 11, 107));
    }
    if (flags.boots) {
      fill(2, 3, 2, 11, 10, 11, (x, y, z) => (y === 9 ? goldDark(x, y, z, 110) : scaleColor(x, y, z, 111)));
      fill(2, 8, 2, 11, 10, 11, (x, y, z) => goldDark(x, y, z, 112));
      fill(2, 0, 2, 11, 1, 13, (x, y, z) => J(0x2a2e32, x, y, z, 113, 0.04));
      fill(2, 1, 3, 11, 4, 13, (x, y, z) => scaleColor(x, y, z, 114));
      fill(3, 4, 10, 10, 5, 12, (x, y, z) => plate(x, y, z, 115));
      for (const x of [4, 6, 8]) {
        set(x, 2, 13, claw(x, 2, 13, 116));
        set(x, 1, 13, claw(x, 1, 13, 117));
        set(x, 1, 14, claw(x, 1, 14, 118));
        set(x, 0, 14, claw(x, 0, 14, 119));
      }
      for (let z = 3; z <= 8; z += 2) set(11, 6, z, horn(11, 6, z, 120));
      void shade;
    }
  }

  return { paintHelm, paintChest, paintArm, paintLeg, scaleColor };
}

const iron = makeMetalArmor(IRON_PAL);
export const paintHelm = iron.paintHelm;
export const paintChest = iron.paintChest;
export const paintArm = iron.paintArm;
export const paintLeg = iron.paintLeg;
export const scaleColor = iron.scaleColor;
