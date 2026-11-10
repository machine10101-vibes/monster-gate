import { hash3, jitter, shade, mix } from '../engine/voxel.js';

const J = (c, x, y, z, s = 0, a = 0.04) => jitter(c, a, hash3(x, y, z, s));
const lerp = (a, b, t) => a + (b - a) * t;
const lum = (c) => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;

/** Held kinds of the jungle and pirate gear. */
export const JUNGLE_DUAL = ['tigerclaws', 'piratedual'];
export const JUNGLE_TALL = ['tigershortbow'];
export const JUNGLE_EDGE = ['tigerclaws', 'raptorsaber', 'piratecutlass', 'piratedual', 'piratecleaver', 'cursedblade'];
export const JUNGLE_SHIELD_SETS = new Set(['pirateset']);
export const JUNGLE_BOOK_SETS = new Set(['tigercloth', 'raptorcloth', 'piratecloth']);

const TIGER = {
  wrap: 0xe07a1c, wrapLo: 0x17110d, wrapHi: 0xf59a40, blade: 0xe8821f, edge: 0xf6ecd0, dark: 0x17110d,
  guard: 0x1d1510, guardHi: 0x34261a, glow: 0xf2d64a, glow2: 0xfff3a0, wood: 0x2a1c12, string: 0xe9dfc2,
  membrane: 0xf2eee4, membraneHi: 0xffffff, claw: 0xf6ecd0, horn: 0xe27a1c, hornDark: 0xb85a12,
};
const RAPTOR = {
  wrap: 0x7d8438, wrapLo: 0x555c26, wrapHi: 0xbba76a, blade: 0xe9dfbc, edge: 0xfffbe6, dark: 0x9c8e66,
  guard: 0x676a60, guardHi: 0xa6aaae, glow: 0xe8962a, glow2: 0xffd27a, wood: 0x5b522e, string: 0xd9cfa8,
  membrane: 0xbba76a, membraneHi: 0xd8c890, claw: 0xe9dfbc, horn: 0xc9c2a8, hornDark: 0x6e6a58,
};
const PIRATE = {
  wrap: 0x7a4a26, wrapLo: 0x4a2c14, wrapHi: 0x9a6532, blade: 0xc6ccd6, edge: 0xf4f8ff, dark: 0x7d8693,
  guard: 0xd2a22c, guardHi: 0xffd95a, glow: 0xffd95a, glow2: 0xfff0b0, wood: 0x7a4e2c, string: 0xe8e0c8,
  membrane: 0xa82424, membraneHi: 0xd83a3a, claw: 0xe8e0c8, horn: 0xc6ccd6, hornDark: 0x7d8693,
};
const PIRATE_RED = { ...PIRATE, wrap: 0xa82828, wrapLo: 0x6a1616, wrapHi: 0xd03a3a };
const CURSED = {
  wrap: 0xdcd3b4, wrapLo: 0xa89f84, wrapHi: 0xf3ecd2, blade: 0x8c6c52, edge: 0xb9a78b, dark: 0x3d2c20,
  guard: 0xcfc6a6, guardHi: 0xf3ecd2, glow: 0x4cf08a, glow2: 0xc8ffd8, wood: 0xd5ccaa, string: 0xcfc6a6,
  membrane: 0x2a3550, membraneHi: 0x41507a, claw: 0xe8e0c8, horn: 0xdcd3b4, hornDark: 0xa89f84,
};

const mosaic = (T, seed = 91) => (x, y, z) => {
  const h = hash3(x >> 1, y >> 1, z >> 1, seed);
  return J(h < 0.36 ? T.wrap : h < 0.7 ? T.wrapLo : T.wrapHi, x, y, z, seed + 1, 0.03);
};

/** Re-colours every voxel `test` accepts. */
function recolor(c, test, fn) {
  c.each((x, y, z, col, g) => {
    if (g) return;
    if (test(x, y, z, col)) c.set(x, y, z, fn(x, y, z, col));
  });
}

/** Round gold shell guard, domed toward the blade, with radial ribs. */
function shellGuard(c, T, z, R, o = {}) {
  const { thick = 2, dome = 2, ribs = 0.4 } = o;
  for (let y = -R; y < R; y++)
    for (let x = -R; x < R; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d > R) continue;
      const ang = Math.atan2(y + 0.5, x + 0.5);
      const rib = Math.floor((ang + Math.PI) * R * ribs) % 2 === 0;
      const dz = Math.round(dome * (1 - d / R));
      for (let k = 0; k < thick; k++) {
        const col = d > R - 1.3 ? T.guardHi : rib ? T.guard : shade(T.guard, 0.82);
        c.set(x, y, z + k + dz, J(col, x, y, z + k, 140, 0.04));
      }
    }
}

/** Curved knuckle bow joining a guard to the pommel on the +x side. */
function knuckleBow(c, T, zGuard, zPommel, out, r = 0.95) {
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = 3 + out * Math.sin(Math.PI * t) ** 0.8;
    const z = lerp(zGuard, zPommel, t);
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      c.set(Math.round(x + Math.cos(ang) * r * 0.6), Math.round(Math.sin(ang) * r * 0.7), Math.round(z), J(i % 5 === 0 ? T.guardHi : T.guard, i, a, 0, 141, 0.04));
    }
  }
}

function tigerBands(c, z0, period, duty, T = TIGER) {
  recolor(c, (x, y, z, col) => z >= z0 && (z - z0) % period < duty && lum(col) < 200, (x, y, z) => J(T.dark, x, y, z, 150, 0.03));
}

function stripedBow(T) {
  return (c) => {
    recolor(
      c,
      (x, y, z, col) => Math.abs(y + 0.5) > 7 && Math.abs(y + 0.5) < 34 && (Math.floor(Math.abs(y + 0.5) + 1) % 7) < 2 && lum(col) < 200 && x >= -2 && x <= 1,
      (x, y, z) => J(T.dark, x, y, z, 151, 0.03),
    );
  };
}

function tigerSpear(K) {
  const T = TIGER;
  const c = K.ctx();
  K.haft(c, T, -30, 108, 2, T.wood, 0);
  K.wrapRod(c, T, -8, 36, 2.25);
  K.wrapRod(c, T, 58, 92, 2.25);
  for (const z of [-8, 36, 58, 92]) K.ringAt(c, z, 2.25, T.guard, z & 3);
  K.pommelAt(c, T, -30, 'claw', T.glow);
  K.rod(c, 96, 104, 3.2, (x, y, z) => J(z === 100 ? T.guardHi : T.guard, x, y, z, 160, 0.04));
  const Tc = { ...T, blade: 0xf0e6c8, edge: 0xfffbea, dark: 0x3a2e22 };
  K.blade(c, Tc, { z0: 105, z1: 156, w0: 0, wf: K.leaf(11, 0.7, 0.75), curve: 10, exp: 2, fuller: null, thick: 4 });
  recolor(c, (x, y, z) => z >= 105 && z < 118, (x, y, z) => J(((z >> 1) & 1) ? T.dark : T.blade, x, y, z, 161, 0.03));
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 13; k++) {
      const t = k / 12;
      const r = lerp(2.1, 0.6, t);
      K.ball(c, dir * (3.5 + k * 0.55) + (dir > 0 ? 0.5 : -0.5), 0, 104 + k * 0.35 + t * t * 6, r, (x, y, z) => J(k > 9 ? T.edge : T.claw, x, y, z, 162, 0.03));
    }
  }
  for (let i = 0; i < 70; i++) {
    const a = hash3(i, 1, 0, 163) * Math.PI * 2;
    const rr = 2.6 + hash3(i, 2, 0, 164) * 3.2;
    const len = 5 + Math.floor(hash3(i, 3, 0, 165) * 9);
    for (let k = 0; k < len; k++) {
      const x = Math.cos(a) * (rr + k * 0.28);
      const y = Math.sin(a) * (rr + k * 0.28);
      c.set(Math.round(x), Math.round(y), 100 - k, J(k > len - 3 ? 0xffffff : k % 3 === 0 ? 0xe8e4da : T.membrane, i, k, 0, 166, 0.03));
    }
  }
  return c.done();
}

function boneStaff(K) {
  const T = CURSED;
  const c = K.ctx();
  for (let z = -14; z <= 86; z++) {
    const joint = z % 15 === 0 || z % 15 === 1;
    K.rod(c, z, z, joint ? 2.7 : 2.0, (x, y, zz) => J(joint ? T.guardHi : (x + y > 0 ? T.wood : shade(T.wood, 0.92)), x, y, zz, 170, 0.04));
  }
  K.wrapRod(c, { wrap: 0x6a1616, wrapLo: 0x3a0c0c }, -6, 22, 2.3);
  K.ringAt(c, -6, 2.3, 0xd2a22c, 1);
  K.ringAt(c, 22, 2.3, 0xd2a22c, 2);
  K.pommelAt(c, T, -14, 'horn', T.glow);
  K.rod(c, 84, 91, 3.6, (x, y, z) => J(z === 87 ? 0xffd95a : 0xd2a22c, x, y, z, 171, 0.04));
  K.rod(c, 80, 82, 3, (x, y, z) => J(0xd2a22c, x, y, z, 172, 0.04));

  const bone = (x, y, z, s) => J(((x + z) & 3) === 0 ? T.wrapLo : T.guardHi, x, y, z, s, 0.03);
  for (const dir of [-1, 1]) {
    const x0 = dir * 11;
    for (let k = 0; k <= 26; k++) {
      const t = k / 26;
      const x = lerp(-x0, x0, t);
      const z = 94 + t * 20;
      K.ball(c, x, 3.5, z, k === 0 || k === 26 ? 2.2 : 1.35, (xx, yy, zz) => bone(xx, yy, zz, 173));
    }
    for (const ex of [dir * 11.5, dir * -11.5]) {
      const ez = ex * dir > 0 ? 114 : 94;
      for (const o of [-1.4, 1.4]) K.ball(c, ex + o * 0.8, 3.5, ez + (ez > 100 ? 1.3 : -1.3), 1.5, (xx, yy, zz) => J(T.guardHi, xx, yy, zz, 174, 0.03));
    }
  }
  const sx = 0;
  const sy = 0;
  const sz = 106;
  K.ball(c, sx, sy, sz, 7, (x, y, z, d) => {
    const fy = -(y + 0.5);
    const dx = x + 0.5;
    const dz = z + 0.5 - sz;
    const eye = fy > 3.2 && dz > -1.5 && dz < 3.2 && Math.abs(Math.abs(dx) - 2.6) < 1.7;
    if (eye) return null;
    const nose = fy > 4.6 && dz < -0.8 && dz > -3.4 && Math.abs(dx) < 1.2;
    if (nose) return null;
    if (dz < -3.2 && (fy < 2 || Math.abs(dx) > 4.5)) return null;
    if (dz < -2.4 && Math.abs(dx) > 5.2) return null;
    return J(d > 0.86 ? shade(T.guardHi, 0.86) : T.guardHi, x, y, z, 175, 0.035);
  }, false, 0.95, 1);
  for (let i = -3; i <= 3; i++) {
    const tx = i * 1.05;
    for (let k = 0; k < 3; k++) c.set(Math.round(tx), -6 + 0, sz - 4 - k, i % 2 ? T.wrapLo : T.guardHi);
    for (let k = 0; k < 4; k++) c.set(Math.round(tx), -5, sz - 4 - k, i % 2 ? 0x33281c : T.guardHi);
  }
  for (const sxx of [-1, 1]) {
    K.ball(c, sxx * 2.6, -3.2, sz + 1.4, 1.5, T.glow, true);
    c.set(Math.round(sxx * 2.6 - (sxx > 0 ? 0 : 1)), -5, sz + 1, T.glow2, true);
  }
  for (let k = 0; k < 13; k++) {
    const t = k / 12;
    const w = Math.sin(t * 5) * 2.4 * t;
    K.ball(c, w, 0.5 + Math.cos(t * 4) * 1.2, 114 + k * 1.5, lerp(2.2, 0.5, t), (x, y, z, d) => (d < 0.4 ? 0xe6ffe8 : d < 0.75 ? T.glow2 : T.glow), true, 1.4, 1);
  }
  for (let a = 0; a < 5; a++) K.ball(c, Math.cos(a * 1.26) * 11, Math.sin(a * 1.26) * 6 - 2, 100 + a * 5, 1.2, T.glow, true);
  return c.done();
}

function cursedAfter(g1) {
  return (c) => {
    c.each((x, y, z, col, g) => {
      if (g || z < g1 + 7) return;
      const h = hash3(x, y, z, 180);
      if (h < 0.14) c.set(x, y, z, J(0x6e3d1c, x, y, z, 181, 0.05));
      else if (h < 0.2) c.set(x, y, z, J(0x8a5a2e, x, y, z, 182, 0.05));
      if (z < g1 + 52 && x > -2 && hash3(x, y, z, 183) < 0.3 && lum(col) < 190) c.set(x, y, z, J(0x6a1414, x, y, z, 184, 0.05));
    });
    for (let z = g1 + 20; z < g1 + 76; z++) {
      const h = hash3(z, 1, 0, 185);
      if (h < 0.16) for (let y = -2; y <= 1; y++) c.clear(-6, y, z);
      const h2 = hash3(z, 2, 0, 186);
      if (h2 < 0.14) for (let y = -2; y <= 1; y++) c.clear(4, y, z);
    }
  };
}

function boneBook(K, setId) {
  const c = K.ctx();
  const W = 11;
  const Ln = 32;
  const P = {
    tigercloth: { cover: [0xe07a1c, 0x17110d, 0xf59a40], edge: 0x17110d, edgeHi: 0xf3ead2, page: 0xf0e4c0, clasp: 0xf6ecd0 },
    raptorcloth: { cover: [0x7d8438, 0x555c26, 0xbba76a], edge: 0x676a60, edgeHi: 0xa6aaae, page: 0xece0b8, clasp: 0xe9dfbc },
    piratecloth: { cover: [0x2a1418, 0x6a1616, 0x3a1c22], edge: 0xd2a22c, edgeHi: 0xffd95a, page: 0xd8caa0, clasp: 0xe8e0c8 },
  }[setId];
  const coverAt = (x, y, z) => {
    const h = hash3(x >> 1, y, z >> 1, 190);
    if (setId === 'tigercloth') return J(((x + z) % 6 < 2) ? P.cover[1] : h < 0.2 ? P.cover[2] : P.cover[0], x, y, z, 191, 0.04);
    if (setId === 'raptorcloth') return J(h < 0.36 ? P.cover[0] : h < 0.7 ? P.cover[1] : P.cover[2], x, y, z, 192, 0.03);
    return J(((x - z) % 9 === 0) ? P.cover[1] : h < 0.3 ? P.cover[2] : P.cover[0], x, y, z, 193, 0.04);
  };
  for (let z = 0; z < Ln; z++)
    for (let x = -W; x <= W; x++) {
      for (let y = -2; y <= 5; y++) {
        const cover = y === -2 || y === 5 || y === -1 || y === 4;
        const spine = x === -W;
        let col;
        if (spine) col = J(shade(P.cover[1], 0.95), x, y, z, 194, 0.04);
        else if (cover) col = coverAt(x, y, z);
        else col = J(((y + z) & 1) ? P.page : shade(P.page, 0.93), x, y, z, 195, 0.03);
        if (!cover && (x > W - 1 || z === 0 || z === Ln - 1)) col = J(shade(P.page, 1.04), x, y, z, 196, 0.03);
        c.set(x, y, z, col);
      }
      const edge = x >= W - 1 || z <= 1 || z >= Ln - 2;
      c.set(x, 6, z, edge ? J(P.edge, x, 6, z, 197, 0.04) : coverAt(x, 6, z));
    }
  for (const z of [3, 10, 21, 28]) for (let y = -2; y <= 6; y++) c.set(-W - 1, y, z, J(P.edge, y, z, 0, 198, 0.04));
  for (const [x, z] of [[W, 0], [W, Ln - 1], [-W + 1, 0], [-W + 1, Ln - 1]]) {
    for (let y = -2; y <= 6; y++) for (let a = 0; a < 3; a++) c.set(x, y, z + (z === 0 ? a : -a), J(P.edgeHi, x, y, z, 199, 0.04));
  }
  for (let x = W - 4; x <= W + 1; x++) for (let y = 0; y <= 3; y++) c.set(x, y, 16, J(P.edgeHi, x, y, 16, 200, 0.04));
  for (let z = Ln; z < Ln + 5; z++) c.set(-W + 6, 0, z, J(P.edge, z, 0, 0, 201, 0.03));

  if (setId === 'tigercloth') {
    K.ball(c, 2, 7, 16, 5.4, (x, y, z, d) => (d > 0.78 ? 0x17110d : d < 0.3 ? 0x17110d : 0xf2d64a), false, 1.25, 0.5);
    for (const [x, z] of [[1, 16], [2, 16], [1, 17], [2, 17]]) c.set(x, 9, z, 0x17110d);
    c.set(0, 9, 14, 0xffffff, true);
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      const x = W + 1 + Math.round(Math.sin(t * 1.4) * 3.5);
      const z = 16 + Math.round((1 - Math.cos(t * 1.4)) * 6);
      for (let y = 0; y <= 3; y++) c.set(x, y, z, J(k > 6 ? 0xfffbea : P.clasp, x, y, z, 202, 0.03));
    }
  } else if (setId === 'raptorcloth') {
    K.ball(c, 2, 7, 16, 4.6, (x, y, z, d) => (d > 0.7 ? 0x2a2418 : d < 0.34 ? 0x1a1208 : 0xe8962a), false, 1.1, 0.5);
    c.set(2, 8, 16, 0x15120f);
    for (let x = -W + 3; x <= W - 3; x += 2) for (let k = 0; k < 3; k++) c.set(x, 7 + k % 2, 3 + k, J(P.edgeHi, x, k, 0, 203, 0.03));
    for (let x = -W + 2; x <= W - 3; x += 2) c.set(x, 7, Ln - 4, J(P.edgeHi, x, 0, 1, 204, 0.03));
    for (let k = 0; k < 10; k++) {
      const t = k / 9;
      const x = W + 1 + Math.round(Math.sin(t * 1.5) * 4);
      const z = 15 + Math.round((1 - Math.cos(t * 1.5)) * 7);
      for (let y = 0; y <= 3; y++) c.set(x, y, z, J(k > 7 ? 0xfffbe6 : P.clasp, x, y, z, 205, 0.03));
    }
  } else {
    K.ball(c, 2, 7, 16, 5.2, (x, y, z, d) => J(d > 0.8 ? 0xcfc6a6 : 0xf3ecd2, x, y, z, 206, 0.03), false, 1.2, 0.55);
    for (const sx of [-1, 1]) K.ball(c, 2 + sx * 2.2, 8.2, 17.2, 1.3, 0x4cf08a, true);
    c.set(1, 8, 14, 0x2a1c14);
    c.set(2, 8, 14, 0x2a1c14);
    for (let i = -2; i <= 2; i++) c.set(2 + i, 8, 12, i % 2 ? 0x2a1c14 : 0xf3ecd2);
    for (const [x, z] of [[-W + 3, 4], [W - 3, 4], [-W + 3, Ln - 5], [W - 3, Ln - 5]]) K.ball(c, x, 7, z, 1.6, J(0xffd95a, x, z, 0, 207, 0.03));
    for (let x = W - 4; x <= W + 2; x++) for (let y = 0; y <= 3; y++) c.set(x, y, 16, J(0xd2a22c, x, y, 16, 208, 0.04));
  }
  const r = c.done();
  r.oz += 16;
  r.oy += 2;
  return r;
}

function pirateBuckler(K) {
  const T = PIRATE;
  const c = K.ctx();
  const R = 24;
  const wood = [0x7a4e2c, 0x6a4325, 0x8a5a30];
  for (let z = 0; z < 48; z++)
    for (let x = 0; x < 48; x++) {
      const dx = x + 0.5 - R;
      const dz = z + 0.5 - R;
      const d = Math.hypot(dx, dz);
      if (d > 22.2) continue;
      const rim = d > 19.6;
      const rim2 = d > 18 && !rim;
      const hh = rim ? 4 : rim2 ? 3 : 2;
      for (let y = 0; y < hh; y++) c.set(x - R, y, z - R, shade(J(0x4a2c14, x, y, z, 210, 0.05), 0.75));
      let col;
      if (rim) col = (x + z) % 4 === 0 ? J(0xaab0ba, x, 4, z, 211, 0.03) : J(0x7f8794, x, 4, z, 212, 0.03);
      else if (rim2) col = J(0x555c68, x, 3, z, 213, 0.03);
      else {
        const plank = Math.floor((dx + 24) / 6.4);
        const seam = Math.abs(((dx + 24) % 6.4) - 0.2) < 0.5;
        col = seam ? J(0x3a2412, x, 2, z, 214, 0.04) : J(wood[plank % 3], x, 2, z, 215, 0.05 + 0.03 * ((z >> 2) & 1));
        if (Math.abs(dz) < 2.4 || (Math.abs(dz - 11) < 1.4 && d < 17) || (Math.abs(dz + 11) < 1.4 && d < 17)) col = J(0x6c7380, x, 2, z, 216, 0.03);
      }
      c.set(x - R, hh, z - R, col);
      if (!rim && !rim2 && (Math.abs(dz) < 2.4 || Math.abs(dz - 11) < 1.4 || Math.abs(dz + 11) < 1.4) && d < 17) c.set(x - R, hh + 1, z - R, J(0x8a919e, x, 3, z, 217, 0.03));
    }
  K.ball(c, 0, 4, 0, 8.2, (x, y, z, d) => J(d < 0.34 ? 0xc4cad4 : 0x8a919e, x, y, z, 218, 0.03), false, 1, 0.6);
  for (let a = 0; a < 10; a++) {
    const ang = a * (Math.PI / 5) + 0.3;
    K.ball(c, Math.cos(ang) * 20.6, 4.6, Math.sin(ang) * 20.6, 1.5, (x, y, z) => J(T.guardHi, x, y, z, 219, 0.03), false, 1, 0.8);
  }
  const skull = (x, z, y) => {
    const dxs = x;
    const dzs = z;
    const crown = Math.hypot(dxs / 4.4, (dzs + 1.2) / 4.0) <= 1;
    const jaw = Math.abs(dxs) <= 2.6 && dzs >= 2.2 && dzs <= 4.4;
    if (!(crown || jaw)) return;
    const eye = Math.hypot(Math.abs(dxs) - 1.9, dzs + 0.6) < 1.05;
    const nose = Math.abs(dxs) < 0.6 && dzs >= 1.2 && dzs < 2.2;
    const teeth = jaw && Math.abs(dxs) % 1.4 < 0.5 && dzs > 3.4;
    if (eye) c.set(Math.floor(dxs), y, Math.floor(dzs), 0x2a1c0c);
    else if (nose || teeth) c.set(Math.floor(dxs), y, Math.floor(dzs), 0x6a4a10);
    else c.set(Math.floor(dxs), y, Math.floor(dzs), J(((Math.abs(dxs) + Math.abs(dzs)) % 2 < 1) ? T.guardHi : T.guard, dxs, y, dzs, 220, 0.03));
  };
  for (let dz = -6; dz <= 6; dz += 0.5) for (let dx = -5; dx <= 5; dx += 0.5) skull(dx, dz, 7);
  for (let z = 0; z < 4; z++) for (const x of [-3, 2]) c.set(x, 7, 6 + z, T.guard);
  const r = c.done();
  r.oy += 2;
  return r;
}

/** Held weapon builders keyed by held id. `K` is the weaponModels toolkit. */
export function jungleWeapons(K) {
  const gripMosaic = (T, g0, g1, gr) => (c) => {
    recolor(c, (x, y, z) => z >= g0 && z <= g1 && Math.hypot(x + 0.5, y + 0.5) <= gr + 0.1, mosaic(T, 94));
  };
  return {
    tigerclaws: () =>
      K.sword(TIGER, {
        g0: -4, g1: 8, gr: 1.8, guardHalf: 6, sweep: 2, cap: 'ball', pommel: 'claw', pgem: TIGER.glow,
        b: { z1: 68, w0: 0, wf: (t) => Math.max(1, Math.round(10 * (1 - t) ** 0.6)), curve: 20, exp: 1.5, thick: 2, fuller: null },
        after: (c) => tigerBands(c, 14, 8, 3),
      }),
    tigershortbow: () => K.bow(TIGER, { L: 32, D: 14, recurve: 5, style: 'horn', grip: 5, after: stripedBow(TIGER) }),
    tigerspear: () => tigerSpear(K),

    raptorsaber: () => {
      const T = RAPTOR;
      const mos = gripMosaic(T, -6, 10, 2);
      return K.sword(T, {
        g0: -6, g1: 10, gr: 2, guardHalf: 7, sweep: 2, cap: 'ball', pommel: 'claw', pgem: T.glow,
        b: { z1: 94, w0: 0, wf: (t) => Math.max(1, Math.round(13 * (1 - t) ** 0.7)), curve: 22, exp: 1.8, fuller: null, thick: 4 },
        after: (c) => {
          mos(c);
          recolor(c, (x, y, z) => z >= 15 && z < 40, (x, y, z, col) => mix(col, 0x8a7a50, 0.7 - (z - 15) * 0.026));
          recolor(c, (x, y, z, col) => z >= 15 && z < 22 && lum(col) > 200, (x, y, z) => J(0xa8905a, x, y, z, 95, 0.03));
        },
      });
    },
    raptorcrossbow: () => {
      const T = RAPTOR;
      const mos = mosaic(T, 96);
      return K.crossbow(T, 'plain', (c) => {
        recolor(c, (x, y, z) => z >= -9 && z <= 66 && y <= 3 && x >= -3 && x <= 2 && !(y === 3), mos);
        recolor(c, (x, y, z) => z >= 45 && Math.abs(x + 0.5) > 6, (x, y, z, col) => (Math.abs(x + 0.5) > 14 ? J(0xeee4c2, x, y, z, 97, 0.03) : J(T.guard, x, y, z, 98, 0.03)));
        for (const dir of [-1, 1]) K.spike(c, 'z', 1, 58, 11, dir * 25 - (dir < 0 ? 1 : 0), 1.9, 0.5, 0, (k) => (k > 7 ? 0xfffbe6 : 0xe9dfbc));
      });
    },
    raptorscythe: () => {
      const T = RAPTOR;
      const mos = mosaic(T, 99);
      return K.scythe(T, {
        plain: true,
        after: (c) => recolor(c, (x, y, z) => z >= -12 && z <= 83 && Math.hypot(x + 0.5, y + 0.5) <= 2.4, mos),
      });
    },

    piratecutlass: () => {
      const T = PIRATE;
      return K.sword(T, {
        g0: -6, g1: 10, gr: 2, guardHalf: 4, cap: 'ball', pommel: 'ball',
        b: { z1: 86, w0: 10, curve: 12, exp: 2, tip: 0.72, fuller: 'groove' },
        after: (c) => {
          shellGuard(c, T, 12, 6, { dome: 3 });
          knuckleBow(c, T, 12, -6, 3.6);
        },
      });
    },
    piratedual: () => {
      const T = PIRATE;
      return K.sword(T, {
        g0: -4, g1: 8, gr: 1.8, guardHalf: 5, sweep: 2, cap: 'ball', pommel: 'ball',
        b: { z1: 68, w0: 8, curve: 16, exp: 1.5, tip: 0.55, thick: 2, fuller: null },
        after: (c) => shellGuard(c, T, 9, 4, { dome: 2, ribs: 0.5 }),
      });
    },
    piratecleaver: () => {
      const T = PIRATE_RED;
      return K.sword(T, {
        g0: -10, g1: 26, gr: 2.4, guardHalf: 6, cap: 'ball', pommel: 'ball', pgem: T.glow,
        b: { z1: 122, w0: 15, curve: 14, exp: 2.1, tip: 0.8, fuller: 'groove' },
        after: (c) => {
          shellGuard(c, T, 28, 10, { dome: 4, ribs: 0.36 });
          knuckleBow(c, T, 28, -10, 5, 1.1);
        },
      });
    },
    buccaneergun: () => {
      const T = PIRATE;
      return K.crossbow(T, 'iron', (c) => {
        recolor(c, (x, y, z) => z >= 14 && z <= 58 && z % 11 < 2 && x >= -2 && x <= 1 && y <= 2 && y >= -2, (x, y, z) => J(T.guard, x, y, z, 230, 0.03));
        for (let z = 15; z <= 62; z += 2) c.set(-1, 3, z, J(T.guardHi, z, 0, 0, 231, 0.03));
        K.rod(c, 70, 76, 2.4, (x, y, z) => J(z === 73 ? T.guardHi : T.guard, x, y, z, 233, 0.04));
        K.blade(c, T, { z0: 77, z1: 116, w0: 6, curve: 7, exp: 1.8, tip: 0.55, thick: 2, fuller: null });
      });
    },

    cursedblade: () => {
      const T = CURSED;
      return K.sword(T, {
        g0: -6, g1: 10, gr: 2, guardHalf: 8, sweep: 3, cap: 'ball', pommel: 'horn', pgem: T.glow,
        b: { z1: 90, w0: 10, curve: 10, exp: 2, tip: 0.74, fuller: 'glow', glowEvery: 4 },
        after: cursedAfter(10),
      });
    },
    bonestaff: () => boneStaff(K),
  };
}

export function jungleShield(K, setId) {
  void setId;
  return pirateBuckler(K);
}

export function jungleBook(K, setId) {
  return boneBook(K, setId);
}

