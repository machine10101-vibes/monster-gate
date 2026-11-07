import { hash3, jitter, shade } from '../engine/voxel.js';
import { DARK } from '../data/darksycle.js';

const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));

function scale(x, y, z, s = 40) {
  const row = y >> 1;
  const p = (x + z + (row & 1) * 2) % 4;
  let base = DARK.scale;
  if (p === 0) base = DARK.scaleLo;
  else if (p === 3) base = DARK.scaleHi;
  if (p !== 0 && (y & 1) === 0) base = shade(base, 0.88);
  return J(base, x, y, z, s, 0.04);
}
const plate = (x, y, z, s) => J(DARK.scale, x, y, z, s, 0.05);
const trim = (x, y, z, s) => J(DARK.trim, x, y, z, s, 0.04);
const trimDark = (x, y, z, s) => J(shade(DARK.trim, 0.7), x, y, z, s, 0.04);
const blade = (x, y, z, s) => J(DARK.blade, x, y, z, s, 0.03);
const bladeDark = (x, y, z, s) => J(DARK.bladeDark, x, y, z, s, 0.03);
const claw = (x, y, z, s) => J(DARK.claw, x, y, z, s, 0.03);

export function paintHelm(H, rowY) {
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
        set(x, y, z, rim ? trimDark(x, y, z, 41) : scale(x, y, z, 42));
      }
  for (let x = 4; x <= 15; x++) {
    set(x, rowY(9), 15, plate(x, 9, 15, 43));
    set(x, rowY(9), 16, trim(x, 9, 16, 44));
    set(x, rowY(10), 15, plate(x, 10, 15, 45));
    if (Math.abs(x - 9.5) > 3.5) set(x, rowY(10), 16, bladeDark(x, 10, 16, 46));
  }
  for (let x = 6; x <= 13; x++) set(x, rowY(9) - 1, 16, DARK.eye, true);
  for (const x of [4, 5, 14, 15]) set(x, rowY(11), 16, bladeDark(x, 11, 16, 47));
  for (let y = rowY(5); y <= rowY(8); y++) for (const x of [9, 10]) set(x, y, 16, trimDark(x, y, 16, 49));

  for (const side of [-1, 1]) {
    const bx = side < 0 ? 3 : 16;
    for (let k = 0; k <= 12; k++) {
      const out = k < 4 ? k * 0.8 : 3.2 - (k - 4) * 0.25;
      const x = Math.round(bx + side * out);
      const y = rowY(9) + Math.round(k * 0.95);
      const z = 11 - Math.round(k * 0.8);
      const wid = k < 5 ? 2 : k < 9 ? 2 : 1;
      for (let a = 0; a < wid; a++)
        for (let c = 0; c < 2; c++) {
          const edge = c === 1;
          set(x + (side < 0 ? a : -a), y + c, Math.max(0, z), edge ? J(DARK.edge, x, y, z, 50, 0.02) : blade(x, y, z, 51));
        }
    }
    set(bx + side * 0, rowY(5), 15, claw(bx, 5, 15, 52));
  }
  for (let z = 4; z <= 15; z++) {
    const h = z % 3 === 0 ? 3 : 2;
    for (let k = 0; k < h; k++) for (const x of [9, 10]) set(x, rowY(14) + k, z, k === h - 1 ? blade(x, k, z, 55) : scale(x, rowY(14) + k, z, 56));
  }
  for (let z = 6; z <= 12; z += 3) set(9, rowY(14) + 1, z, DARK.glow, true);
}

export function paintChest(T, ty) {
  const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
  for (let y = 5; y <= 18; y++) {
    for (let x = 5; x <= 20; x++) {
      set(x, y, 13, scale(x, y, 13, 60));
      set(x, y, 4, scale(x, y, 4, 61));
    }
    if (y >= 6)
      for (let x = 9; x <= 16; x++) {
        const edge = x === 9 || x === 16;
        set(x, y, 14, edge ? trimDark(x, y, 14, 62) : y % 2 ? trim(x, y, 14, 63) : trimDark(x, y, 14, 64));
      }
    for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, scale(x, y, z, 65));
  }
  for (let y = 7; y <= 17; y += 2) for (const x of [10, 15]) set(x, y, 15, bladeDark(x, y, 15, 66));
  for (let y = 11; y <= 14; y++)
    for (let x = 11; x <= 14; x++) {
      const core = y >= 12 && y <= 13 && x >= 12 && x <= 13;
      set(x, y, 15, core ? DARK.glowHi : DARK.glow, true);
      set(x, y, 14, core ? DARK.glowHi : DARK.glow, true);
    }
  for (let y = 6; y <= 17; y++) {
    if (y % 3 !== 0) continue;
    for (const x of [12, 13]) {
      set(x, y, 3, bladeDark(x, y, 3, 68));
      set(x, y + 1, 2, blade(x, y, 2, 69));
      set(x, y + 2, 1, J(DARK.edge, x, y, 1, 70, 0.02));
    }
  }
  for (let x = 5; x <= 20; x++)
    for (let z = 3; z <= 14; z++) {
      const edge = x <= 6 || x >= 19 || z <= 4 || z >= 13;
      if (edge) set(x, 19, z, hash3(x, 19, z, 71) > 0.5 ? scale(x, 19, z, 70) : trimDark(x, 19, z, 72));
    }
  for (let x = 4; x <= 21; x++)
    for (let z = 4; z <= 13; z++) {
      if (x > 6 && x < 19) continue;
      set(x, 19, z, scale(x, 19, z, 73));
    }
  for (const x of [6, 19]) for (let z = 6; z <= 11; z += 2) {
    set(x, 20, z, blade(x, 20, z, 74));
    set(x, 21, z, J(DARK.edge, x, 21, z, 75, 0.02));
  }
}

export function paintArm(A, set) {
  const fill = (x0, y0, z0, x1, y1, z1, fn) => {
    for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, z, fn(x, y, z));
  };
  fill(2, 5, 2, 11, 15, 12, (x, y, z) => (y === 14 || y === 5 ? trimDark(x, y, z, 80) : scale(x, y, z, 81)));
  fill(3, 14, 3, 10, 16, 11, (x, y, z) => trimDark(x, y, z, 82));
  fill(3, 3, 3, 10, 5, 11, (x, y, z) => plate(x, y, z, 84));
  for (const x of [4, 6, 8]) {
    set(x, 4, 11, bladeDark(x, 4, 11, 85));
    set(x, 3, 11, claw(x, 3, 11, 86));
    set(x, 2, 11, claw(x, 2, 11, 87));
  }
  for (let z = 4; z <= 9; z += 2) set(11, 10, z, DARK.glow, true);
  for (let y = 7; y <= 12; y += 2) set(6, y, 12, DARK.glow, true);
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
      return rim ? trimDark(x, yy, z, 91) : yy % 2 ? scale(x, yy, z, 89) : plate(x, yy, z, 90);
    });
  }
  fill(12, 21, 3, 13, 26, 11, (x, y, z) => scale(x, y, z, 96));
  const sickle = [[22, 12], [23, 12], [24, 13], [25, 13], [26, 13], [27, 13], [28, 12], [29, 11]];
  sickle.forEach(([y, x], i) => {
    for (const z of [5, 6, 7]) set(x, y, z, i === sickle.length - 1 ? J(DARK.edge, x, y, z, 92, 0.02) : z === 5 ? bladeDark(x, y, z, 93) : blade(x, y, z, 94));
  });
  set(12, 21, 4, DARK.glow, true);
  set(12, 21, 8, DARK.glow, true);
}

export function paintLeg(set, flags) {
  const fill = (x0, y0, z0, x1, y1, z1, fn) => {
    for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, z, fn(x, y, z));
  };
  if (flags.legs) {
    fill(2, 12, 2, 11, 24, 11, (x, y, z) => (y % 5 === 0 ? trimDark(x, y, z, 100) : scale(x, y, z, 101)));
    fill(2, 10, 2, 11, 12, 11, (x, y, z) => trimDark(x, y, z, 102));
    for (const y of [10, 11]) for (let x = 5; x <= 7; x++) set(x, y, 12, y === 11 ? blade(x, y, 12, 103) : bladeDark(x, y, 12, 104));
    set(6, 11, 13, J(DARK.edge, 6, 11, 13, 105, 0.02));
    set(6, 10, 13, bladeDark(6, 10, 13, 106));
    for (let y = 14; y < 24; y += 3) for (let x = 3; x <= 9; x++) set(x, y, 11, y % 2 ? trim(x, y, 11, 107) : trimDark(x, y, 11, 108));
    for (let y = 15; y <= 21; y += 2) set(6, y, 11, DARK.glow, true);
    for (let y = 14; y <= 22; y += 2) set(10, y, 6, DARK.glow, true);
  }
  if (flags.boots) {
    fill(2, 3, 2, 11, 10, 11, (x, y, z) => (y === 9 ? trimDark(x, y, z, 110) : scale(x, y, z, 111)));
    fill(2, 8, 2, 11, 10, 11, (x, y, z) => trimDark(x, y, z, 112));
    fill(2, 0, 2, 11, 1, 13, (x, y, z) => J(0x14102a, x, y, z, 113, 0.03));
    fill(2, 1, 3, 11, 4, 13, (x, y, z) => scale(x, y, z, 114));
    fill(3, 4, 10, 10, 5, 12, (x, y, z) => plate(x, y, z, 115));
    for (const x of [4, 6, 8]) {
      set(x, 2, 13, claw(x, 2, 13, 116));
      set(x, 1, 13, claw(x, 1, 13, 117));
      set(x, 1, 14, claw(x, 1, 14, 118));
      set(x, 0, 14, claw(x, 0, 14, 119));
    }
    for (let z = 3; z <= 12; z += 1) {
      set(2, 1, z, DARK.glow, true);
      set(10, 1, z, DARK.glow, true);
    }
    for (let z = 3; z <= 8; z += 2) set(11, 6, z, DARK.glow, true);
  }
}
