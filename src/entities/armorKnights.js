import { hash3, jitter, shade } from '../engine/voxel.js';
import { HOLY, DEMON } from '../data/knights.js';

/**
 * Hero armor for the two knight sets, laid over the same body frame as the
 * other metal sets: Holy Knight plate (white, gold-trimmed, blue crosses)
 * and Demon Knight plate (black, spiked, red glow).
 */
const J = (c, x, y, z, s = 0, a = 0.05) => jitter(c, a, hash3(x, y, z, s));

function palette(kind) {
  if (kind === 'holy') {
    return {
      plate: HOLY.plate, trim: [HOLY.gold, HOLY.goldHi, HOLY.goldLo], dark: HOLY.mail, under: HOLY.mailLo,
      glow: HOLY.glow, hot: HOLY.glowCore, eye: 0xffffff, tone: 1,
    };
  }
  return {
    plate: DEMON.plate, trim: [DEMON.edge, DEMON.steel[0], DEMON.spike[2]], dark: DEMON.deep, under: DEMON.plate[4],
    glow: DEMON.glow, hot: DEMON.glowHi, eye: DEMON.glowHi, tone: 1,
  };
}

function kit(kind) {
  const P = palette(kind);
  const holy = kind === 'holy';
  const plate = (x, y, z, s = 0, t = 1) => shade(J(P.plate[(hash3(x >> 1, y >> 1, z >> 1, s) * 5) | 0], x, y, z, s + 1, 0.03), t);
  const trim = (x, y, z, s = 0) => J(P.trim[(hash3(x, y, z, s) * 3) | 0], x, y, z, s + 2, 0.03);
  const dark = (x, y, z, s = 0) => J(P.dark, x, y, z, s, 0.05);
  const spike = (set, x, y, z, h, dx = 0, dy = 1, dz = 0, glow = false) => {
    for (let k = 0; k < h; k++) {
      const c = k === h - 1 ? DEMON.spike[2] : J(DEMON.spike[k % 2], x, y, z, k, 0.04);
      set(x + Math.round(dx * k * 0.5), y + Math.round(dy * k), z + Math.round(dz * k * 0.5), glow && k === h - 1 ? P.hot : c, glow && k === h - 1);
    }
  };
  return { P, holy, plate, trim, dark, spike };
}

function build(kind) {
  const { P, holy, plate, trim, dark, spike } = kit(kind);

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
          set(x, y, z, rim ? trim(x, y, z, 41) : plate(x, y, z, 42));
        }
    for (let x = 4; x <= 15; x++) {
      set(x, rowY(9), 15, plate(x, 9, 15, 43));
      set(x, rowY(9), 16, holy ? trim(x, 9, 16, 44) : dark(x, 9, 16, 44));
      set(x, rowY(10), 15, plate(x, 10, 15, 45));
      if (Math.abs(x - 9.5) > 3.5 || !holy) set(x, rowY(10), 16, dark(x, 10, 16, 46));
    }
    const eyeY = rowY(9) - 1;
    for (const x of holy ? [6, 7, 12, 13] : [6, 7, 8, 11, 12, 13]) {
      set(x, eyeY, 16, P.eye, true);
      if (!holy) set(x, eyeY + 1, 16, P.glow, true);
    }
    for (let y = rowY(5); y <= rowY(8); y++) for (const x of [9, 10]) set(x, y, 16, dark(x, y, 16, 49));
    if (holy) {
      for (const [x, y] of [[9, 12], [10, 12], [9, 11], [10, 11], [9, 13], [10, 13]]) set(x, rowY(y), 16, y === 12 ? P.hot : P.glow, true);
      set(8, rowY(12), 16, P.glow, true);
      set(11, rowY(12), 16, P.glow, true);
      for (const side of [-1, 1]) {
        const bx = side < 0 ? 3 : 16;
        for (let k = 0; k <= 12; k++) {
          const out = Math.min(k * 0.5, 3.2);
          const x = Math.round(bx + side * out);
          const y = rowY(9) + Math.round(k * 1.1);
          const z = 11 - Math.round(k * 0.2);
          for (let a = 0; a < 2; a++) set(x + (side < 0 ? a : -a), y, Math.max(0, z), k > 10 ? HOLY.goldHi : trim(x, y, z, 50));
        }
      }
      for (let z = 4; z <= 15; z++) {
        const h = z % 3 === 0 ? 3 : 2;
        for (let k = 0; k < h; k++) for (const x of [9, 10]) set(x, rowY(14) + k, z, trim(x, k, z, 55));
      }
    } else {
      const crown = [[6, 5, 6], [9, 4, 5], [10, 4, 5], [13, 5, 6], [4, 9, 4], [15, 9, 4], [5, 13, 3], [14, 13, 3], [9, 14, 3], [10, 14, 3]];
      for (const [x, z, h] of crown) spike(set, x, rowY(13), z, h);
      for (const side of [-1, 1]) {
        const bx = side < 0 ? 3 : 16;
        for (let k = 0; k < 6; k++) set(bx + side * Math.min(k, 3), rowY(8) + k, 9, k === 5 ? DEMON.spike[2] : J(DEMON.spike[0], k, 0, 0, 3));
      }
      for (const x of [4, 15]) set(x, eyeY, 15, P.glow, true);
    }
  }

  function paintChest(T, ty) {
    const set = (x, y, z, c, g) => T.set(x, ty(y), z, c, g);
    for (let y = 5; y <= 18; y++) {
      for (let x = 5; x <= 20; x++) {
        set(x, y, 13, plate(x, y, 13, 60));
        set(x, y, 4, plate(x, y, 4, 61, 0.9));
      }
      if (y >= 6) for (let x = 9; x <= 16; x++) set(x, y, 14, plate(x, y, 14, 62, 1.06));
      for (const x of [4, 21]) for (let z = 5; z <= 12; z++) set(x, y, z, plate(x, y, z, 65));
    }
    if (holy) {
      for (let x = 5; x <= 20; x++) {
        set(x, 5, 14, trim(x, 5, 14, 66));
        set(x, 10, 14, trim(x, 10, 14, 67));
        set(x, 18, 14, trim(x, 18, 14, 68));
      }
      for (let k = 0; k <= 13; k++) {
        const y = 5 + k;
        for (const x of [6 + Math.round(k * 0.98), 19 - Math.round(k * 0.98)]) set(x, y, 15, trim(x, y, 15, 69));
      }
      for (let y = 7; y <= 16; y++) for (const x of [12, 13]) set(x, y, 15, y === 12 || y === 13 ? P.hot : P.glow, true);
      for (let x = 9; x <= 16; x++) for (const y of [12, 13]) set(x, y, 15, x >= 11 && x <= 14 ? P.hot : P.glow, true);
      for (const x of [12, 13]) {
        set(x, 17, 15, P.glow, true);
        set(x, 6, 15, P.glow, true);
      }
      for (const x of [7, 18]) for (const y of [15, 16, 17]) set(x, y, 15, P.glow, true);
      for (const y of [16]) for (const x of [6, 8, 17, 19]) set(x, y, 15, P.glow, true);
      for (let y = 5; y <= 18; y += 2) for (const x of [12, 13]) set(x, y, 4, trim(x, y, 4, 70));
    } else {
      for (let y = 6; y <= 18; y += 2) {
        for (let x = 5; x <= 20; x++) {
          if (hash3(x, y, 1, 71) > 0.15) set(x, y - 1, 14, plate(x, y, 14, 72, 1.12));
          if (hash3(x, y, 2, 73) > 0.45) set(x, y - 2, 15, plate(x, y, 15, 74, 1.2));
        }
      }
      for (let x = 6; x <= 19; x += 2) for (let y = 7; y <= 17; y += 5) spike(set, x, y, 15, 2, 0, -1, 1);
      for (let k = 0; k < 5; k++) {
        set(10 + k, 9 + (k % 2), 15, P.glow, true);
        set(15 - k, 13 + (k % 2), 15, P.glow, true);
      }
      for (let x = 6; x <= 19; x += 2) spike(set, x, 17, 4, 4 + (x % 3), 0, 1, -1);
      for (const x of [12, 13]) spike(set, x, 18, 4, 8, 0, 1, -1);
    }
    for (let x = 5; x <= 20; x++)
      for (let z = 3; z <= 14; z++) {
        const edge = x <= 6 || x >= 19 || z <= 4 || z >= 13;
        if (edge) set(x, 19, z, holy && (x + z) % 2 ? trim(x, 19, z, 71) : plate(x, 19, z, 72));
      }
    for (let x = 4; x <= 21; x++)
      for (let z = 4; z <= 13; z++) {
        if (x > 6 && x < 19) continue;
        set(x, 19, z, plate(x, 19, z, 73, 1.06));
      }
    if (holy) for (const x of [6, 19]) for (let z = 6; z <= 11; z += 2) set(x, 20, z, trim(x, 20, z, 74));
    else for (const x of [6, 19]) for (let z = 6; z <= 11; z += 2) spike(set, x, 20, z, 3 + (z % 2), x < 10 ? -0.6 : 0.6, 1, 0);
  }

  function paintArm(A, set) {
    const fill = (x0, y0, z0, x1, y1, z1, fn) => {
      for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, z, fn(x, y, z));
    };
    fill(2, 5, 2, 11, 15, 12, (x, y, z) => (y === 14 || y === 5 ? trim(x, y, z, 80) : plate(x, y, z, 81)));
    fill(3, 14, 3, 10, 16, 11, (x, y, z) => (holy ? trim(x, y, z, 82) : dark(x, y, z, 82)));
    fill(3, 3, 3, 10, 5, 11, (x, y, z) => dark(x, y, z, 84));
    for (const x of [4, 6, 8]) {
      set(x, 4, 11, dark(x, 4, 11, 85));
      set(x, 3, 11, dark(x, 3, 11, 86));
    }
    if (holy) {
      for (let y = 7; y <= 12; y++) for (const x of [5, 6, 7]) if ((x === 6 && y !== 9) || (y === 9 && x !== 6) || (y === 9)) set(x, y, 12, y === 9 && x === 6 ? P.hot : P.glow, true);
      for (let z = 4; z <= 9; z += 2) set(11, 10, z, P.glow, true);
    } else {
      for (let z = 4; z <= 9; z += 2) set(11, 10, z, P.glow, true);
      for (const x of [3, 5, 7, 9]) spike(set, x, 11, 12, 3, 0, 0.3, 1);
    }
    const layers = [
      [21, 2, 11, 2, 11], [22, 2, 11, 2, 11], [23, 2, 11, 2, 11], [24, 2, 11, 2, 11], [25, 3, 10, 3, 10], [26, 3, 10, 3, 10], [27, 4, 9, 4, 9],
    ];
    for (const [y, x0, x1, z0, z1] of layers) {
      fill(x0, y, z0, x1 + 1, y + 1, z1 + 1, (x, yy, z) => {
        const rim = (x === x0 || x === x1 || z === z0 || z === z1) && (yy === 21 || yy === 24);
        return rim ? (holy ? trim(x, yy, z, 91) : dark(x, yy, z, 91)) : plate(x, yy, z, 89 + (yy & 1), 1 + (yy - 21) * 0.015);
      });
    }
    if (holy) {
      for (const [x, y] of [[6, 24], [5, 24], [7, 24], [6, 23], [6, 25]]) set(x, y, 12, x === 6 && y === 24 ? P.hot : P.glow, true);
      for (let z = 3; z <= 10; z++) set(11, 23, z, trim(11, 23, z, 92));
    } else {
      for (const [x, y, z, h, dx] of [[3, 27, 5, 7, -0.7], [6, 28, 6, 9, 0], [9, 27, 5, 7, 0.7], [3, 25, 9, 5, -1.1], [10, 25, 9, 5, 1.1], [6, 26, 10, 5, 0]]) spike(set, x, y, z, h, dx, 1, 0);
      set(6, 22, 12, P.glow, true);
      set(7, 22, 12, P.glow, true);
    }
  }

  function paintLeg(set, flags) {
    const fill = (x0, y0, z0, x1, y1, z1, fn) => {
      for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, z, fn(x, y, z));
    };
    if (flags.legs) {
      fill(2, 12, 2, 11, 24, 11, (x, y, z) => (y % 5 === 0 ? trim(x, y, z, 100) : plate(x, y, z, 101)));
      fill(2, 10, 2, 11, 12, 11, (x, y, z) => (holy ? trim(x, y, z, 102) : dark(x, y, z, 102)));
      for (const y of [10, 11]) for (let x = 5; x <= 7; x++) set(x, y, 12, holy ? trim(x, y, 12, 103) : plate(x, y, 12, 103, 1.15));
      if (holy) {
        for (const [x, y] of [[6, 17], [6, 16], [6, 18], [5, 17], [7, 17], [6, 19]]) set(x, y, 11, y === 17 ? P.hot : P.glow, true);
        for (let y = 14; y < 24; y += 3) for (let x = 3; x <= 9; x++) set(x, y, 11, trim(x, y, 11, 107));
      } else {
        for (let y = 14; y < 24; y += 3) for (let x = 3; x <= 9; x++) set(x, y, 11, plate(x, y, 11, 107, 1.18));
        spike(set, 6, 17, 11, 4, 0, 0.2, 1);
        for (const y of [15, 19, 22]) spike(set, 1, y, 6, 3, -1, 0.2, 0);
        for (let y = 15; y <= 21; y += 3) set(6, y, 11, P.glow, true);
      }
    }
    if (flags.boots) {
      fill(2, 3, 2, 11, 10, 11, (x, y, z) => (y === 9 ? trim(x, y, z, 110) : plate(x, y, z, 111)));
      fill(2, 8, 2, 11, 10, 11, (x, y, z) => (holy ? trim(x, y, z, 112) : dark(x, y, z, 112)));
      fill(2, 0, 2, 11, 1, 13, (x, y, z) => dark(x, y, z, 113));
      fill(2, 1, 3, 11, 4, 13, (x, y, z) => plate(x, y, z, 114));
      fill(3, 4, 10, 10, 5, 12, (x, y, z) => plate(x, y, z, 115, 1.08));
      if (holy) {
        for (let x = 2; x <= 10; x++) set(x, 1, 13, trim(x, 1, 13, 116));
        for (let z = 3; z <= 12; z += 3) {
          set(2, 4, z, P.glow, true);
          set(10, 4, z, P.glow, true);
        }
      } else {
        for (const x of [4, 6, 8]) {
          spike(set, x, 2, 13, 3, 0, 0.1, 1);
          spike(set, x, 4, 12, 2, 0, 0.2, 1);
        }
        for (let z = 3; z <= 12; z += 3) set(2, 1, z, P.glow, true);
      }
    }
  }

  return { paintHelm, paintChest, paintArm, paintLeg };
}

export const holyPlate = build('holy');
export const demonPlate = build('demon');
