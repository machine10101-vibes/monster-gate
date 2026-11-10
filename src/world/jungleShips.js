import { VoxelModel, RNG, hash3, mix, shade, clamp } from '../engine/voxel.js';
import { J } from './models.js';

/**
 * Pirate shipyard hero props: two galleons, a jungle wreck, pier sections and beach shacks.
 * Shared voxel helpers come from jungleModels.js through a kit so the two files do not import each other.
 */

let K = null;
let bundle = null;
const flo = Math.floor;
const lerp = (a, b, t) => a + (b - a) * t;

/* --------------------------------- galleons -------------------------------- */

function hullShape(L, B, o = {}) {
  const hb = (sx) => {
    let f = 1;
    if (sx < -0.55) f = 1 - 0.28 * ((-sx - 0.55) / 0.45) ** 2;
    else if (sx > 0.3) f = Math.max(0, 1 - ((sx - 0.3) / 0.7) ** 2.2) ** 0.62;
    return (B / 2) * f;
  };
  const yk = (sx) => -2.2 + (sx > 0.2 ? 1.7 * ((sx - 0.2) / 0.8) ** 2 : 0) + (sx < -0.5 ? 1.1 * ((-sx - 0.5) / 0.5) ** 2 : 0);
  const deckY = (sx) => (sx > 0.64 ? o.fore ?? 3.6 : sx < -0.72 ? o.poop ?? 4.9 : sx < -0.46 ? o.quarter ?? 3.5 : 2.3);
  const topY = (sx) => deckY(sx) + (sx > 0.64 ? 0.9 : 1.0);
  const wAt = (sx, y) => {
    const b = hb(sx);
    if (y >= 0) return b * (1 - 0.12 * Math.min(1, y / 5));
    const k = yk(sx);
    const frac = clamp((y - k) / -k, 0, 1);
    return b * (0.32 + 0.68 * Math.sqrt(frac));
  };
  return { hb, yk, deckY, topY, wAt };
}

function cfgBlack() {
  return {
    name: 'black',
    s: 0.16,
    L: 26,
    B: 8,
    seed: 11,
    hullBlack: [0x1c1b22, 0x25212a, 0x201e27],
    seam: 0x2c2018,
    strake: 0x3a2a1e,
    keel: 0x100d10,
    trim: 0xd8a830,
    stripe: 0xb01e2a,
    deck: [0xa88150, 0xb08a58, 0x9c7648],
    ports: true,
    masts: [
      { X: 7.6, top: 15.2, lower: 8.4, mid: 12.4, name: 'fore' },
      { X: 0.8, top: 17.1, lower: 9.4, mid: 13.6, name: 'main' },
      { X: -6.3, top: 13.6, lower: 7.2, mid: 10.8, name: 'miz' },
    ],
    sails: [
      { m: 1, yard: 7.6, foot: 3.7, wTop: 4.4, wBot: 4.6, belly: 0.9, set: true, skull: true, col: [0x1a1a20, 0x26262e, 0x30303a] },
      { m: 1, yard: 11.5, foot: 8.0, wTop: 3.1, wBot: 3.5, belly: 0.75, set: true, col: [0x1a1a20, 0x24242c, 0x2e2e38] },
      { m: 1, yard: 14.6, foot: 14.6, wTop: 2.2, furl: true, col: [0x24242c] },
      { m: 0, yard: 7.0, foot: 3.9, wTop: 3.7, wBot: 3.9, belly: 0.8, set: true, col: [0x1a1a20, 0x26262e, 0x30303a] },
      { m: 0, yard: 10.6, foot: 10.6, wTop: 2.9, furl: true, col: [0x24242c] },
      { m: 0, yard: 13.4, foot: 13.4, wTop: 1.9, furl: true, col: [0x24242c] },
      { m: 2, yard: 6.8, foot: 6.8, wTop: 3.2, furl: true, col: [0x24242c] },
      { m: 2, yard: 10.0, foot: 7.4, wTop: 2.2, wBot: 2.4, belly: 0.55, set: true, col: [0x1a1a20, 0x24242c, 0x2e2e38] },
    ],
  };
}

function cfgBrown() {
  return {
    name: 'brown',
    s: 0.16,
    L: 24,
    B: 8.2,
    seed: 23,
    hullBlack: [0xa8723a, 0xb6803f, 0x9c6a34],
    seam: 0x6e4420,
    strake: 0x8a5a2a,
    keel: 0x4a2e18,
    trim: 0xece0bc,
    stripe: 0xb23a2a,
    deck: [0xc09a62, 0xb88f58, 0xcaa46c],
    ports: false,
    masts: [
      { X: 7.0, top: 14.2, lower: 7.8, mid: 11.4, name: 'fore' },
      { X: 0.9, top: 16.0, lower: 8.8, mid: 12.6, name: 'main' },
      { X: -5.8, top: 12.6, lower: 6.8, mid: 9.8, name: 'miz' },
    ],
    sails: [
      { m: 1, yard: 7.2, foot: 3.6, wTop: 4.3, wBot: 4.5, belly: 0.9, set: true, patch: true, col: [0xe8dcb8, 0xdcd0a8, 0xf0e6c8], accent: 0xb83a2a },
      { m: 1, yard: 10.9, foot: 7.5, wTop: 3.0, wBot: 3.4, belly: 0.75, set: true, patch: true, col: [0xb83a2a, 0xa83024, 0xc4443a], accent: 0xe8dcb8 },
      { m: 1, yard: 13.8, foot: 13.8, wTop: 2.1, furl: true, col: [0xe8dcb8] },
      { m: 0, yard: 6.6, foot: 3.8, wTop: 3.6, wBot: 3.8, belly: 0.8, set: true, patch: true, col: [0xb83a2a, 0xa83024, 0xc4443a], accent: 0xe8dcb8 },
      { m: 0, yard: 10.0, foot: 10.0, wTop: 2.8, furl: true, col: [0xe8dcb8] },
      { m: 2, yard: 6.2, foot: 6.2, wTop: 3.0, furl: true, col: [0xe8dcb8] },
      { m: 2, yard: 9.4, foot: 7.0, wTop: 2.1, wBot: 2.3, belly: 0.55, set: true, patch: true, col: [0xe8dcb8, 0xdcd0a8, 0xf0e6c8], accent: 0xb83a2a },
    ],
  };
}

function galleon(cfg) {
  const { s, L, B, seed } = cfg;
  const H = hullShape(L, B);
  const rng = new RNG(seed * 7 + 1);
  const ox = Math.round((L / 2 + 1.2) / s);
  const oy = Math.round(2.6 / s);
  const sxN = Math.round((L + 1.2 + 6.2) / s);
  const syN = Math.round((cfg.masts[1].top + 3.0) / s);
  const oz = Math.round(5.6 / s);
  const szN = oz * 2;
  const M = new VoxelModel(sxN, syN, szN);
  const T = (X) => ox + X / s;
  const TY = (Y) => oy + Y / s;
  const TZ = (Z) => oz + Z / s;
  const bx = (X0, Y0, Z0, X1, Y1, Z1, col, glow = false) => M.box(flo(T(X0)), flo(TY(Y0)), flo(TZ(Z0)), Math.max(flo(T(X0)) + 1, Math.round(T(X1))), Math.max(flo(TY(Y0)) + 1, Math.round(TY(Y1))), Math.max(flo(TZ(Z0)) + 1, Math.round(TZ(Z1))), col, glow);
  const ln = (X0, Y0, Z0, X1, Y1, Z1, col, th = 1) => M.line(T(X0), TY(Y0), TZ(Z0), T(X1), TY(Y1), TZ(Z1), col, th);
  const rope = (x, y, z) => J(0x6a5a40, x, y, z, seed, 0.1);

  const planks = (x, y, z, Y, Zs) => {
    const row = flo((Y + 4) / 0.42);
    let c = row % 3 === 0 ? cfg.strake : cfg.hullBlack[(row + flo(hash3(x >> 4, row, 1, seed) * 3)) % 3];
    if ((x + row * 17) % 29 === 0) c = cfg.seam;
    return J(c, x, y, z, seed, 0.06);
  };

  for (let xi = 0; xi < sxN; xi++) {
    const X = (xi + 0.5 - ox) * s;
    const sx = X / (L / 2);
    if (sx < -1 || sx > 1) continue;
    const yk = H.yk(sx);
    const dk = H.deckY(sx);
    const top = H.topY(sx);
    const isCastle = sx < -0.46;
    const aftWall = sx < -1 + 0.34 / (L / 2);
    for (let zi = 0; zi < szN; zi++) {
      const Z = (zi + 0.5 - oz) * s;
      const az = Math.abs(Z);
      for (let yi = flo(TY(yk)); yi < TY(top); yi++) {
        const Y = (yi + 0.5 - oy) * s;
        const w = H.wAt(sx, Y);
        if (az > w) continue;
        const shell = az > w - 0.3 || w < 0.5 || aftWall;
        let col;
        if (Y >= dk) {
          if (!shell) continue;
          if (isCastle && Y > dk + 0.45 && sx > -0.99) {
            const post = (xi % 6 === 0 || aftWall) && az > w - 0.2;
            if (!post && Y < top - 0.2) continue;
            if (az < w - 0.3) continue;
          }
        }
        if (Y < 0) col = Y < -0.55 ? cfg.keel : J(mix(cfg.keel, 0x24382c, clamp((Y + 0.6) / 0.3, 0, 1)), xi, yi, zi, seed, 0.08);
        else if (Y >= top - s * 1.01) col = J(cfg.trim, xi, yi, zi, seed, 0.05);
        else if (Y >= top - s * 4.2 && !(isCastle && Y > dk + 0.45 && Y < top - 0.2)) col = J(cfg.stripe, xi, yi, zi, seed, 0.06);
        else if (Y >= top - s * 5.2 && !isCastle) col = J(cfg.trim, xi, yi, zi, seed, 0.05);
        else if (Y >= dk - 0.32 && Y < dk - 0.17 && az > w - 0.6) col = J(cfg.trim, xi, yi, zi, seed, 0.05);
        else if (az < w - 0.3 && Y >= dk - s * 1.01 && Y < dk) {
          const dz = flo((Z + 6) / s);
          col = J(cfg.deck[(dz + (xi >> 5)) % 3], xi, yi, zi, seed + 3, 0.05);
          if (dz % 5 === 0) col = shade(col, 0.82);
          if ((xi + dz * 7) % 37 === 0) col = shade(col, 0.7);
        } else col = planks(xi, yi, zi, Y, Z);
        if (isCastle && Y > dk + 0.45 && Y < top - 0.2) col = J(cfg.trim, xi, yi, zi, seed, 0.05);
        M.set(xi, yi, zi, col);
      }
    }
  }

  const wl = (X, Y) => H.wAt(X / (L / 2), Y);

  if (cfg.ports) {
    for (let p = 0; p < 8; p++) {
      const X = -4.6 + p * 1.95;
      const sx = X / (L / 2);
      const w = wl(X, 1.2);
      for (const sd of [-1, 1]) {
        const zo = TZ(sd * w);
        const x0 = flo(T(X - 0.4));
        const x1 = flo(T(X + 0.4));
        const y0 = flo(TY(0.85));
        const y1 = flo(TY(1.55));
        const zin = sd > 0 ? flo(zo) - 3 : flo(zo) - 0;
        const zout = sd > 0 ? flo(zo) + 1 : flo(zo) + 3;
        M.box(x0, y0, Math.min(zin, zout), x1, y1, Math.max(zin, zout) + 1, (x, y, z) => J(0x7a1414, x, y, z, seed, 0.1));
        M.box(x0 - 1, y0 - 1, Math.min(zin, zout), x1 + 1, y0, Math.max(zin, zout) + 1, J(cfg.trim, 1, 1, 1, seed, 0.05));
        const mz = sd > 0 ? flo(zo) - 1 : flo(zo) - 1;
        const cxm = flo((x0 + x1) / 2);
        const cym = flo((y0 + y1) / 2);
        const zs0 = sd > 0 ? mz : mz - 3;
        const zs1 = sd > 0 ? mz + 5 : mz + 2;
        M.box(cxm - 1, cym - 1, zs0, cxm + 1, cym + 1, zs1, (x, y, z) => J(0x1a1c20, x, y, z, seed, 0.1));
        M.box(cxm - 1, cym - 1, sd > 0 ? zs1 - 1 : zs0, cxm + 1, cym + 1, sd > 0 ? zs1 : zs0 + 1, 0x08090b);
        const lz = sd > 0 ? flo(zo) + 1 : flo(zo) - 1;
        M.box(x0 - 1, y1, Math.min(lz, lz + sd * 2), x1 + 1, y1 + 2, Math.max(lz, lz + sd * 2) + 1, (x, y, z) => J(0x5a3a24, x, y, z, seed, 0.1));
        M.box(x0, y1 + 2, Math.min(lz, lz + sd * 2), x1, y1 + 3, Math.max(lz, lz + sd * 2) + 1, J(cfg.trim, 2, 2, 2, seed, 0.05));
      }
      void sx;
    }
  } else {
    for (let p = 0; p < 5; p++) {
      const X = -2.8 + p * 2.6;
      const w = wl(X, 1.4);
      for (const sd of [-1, 1]) {
        const zo = flo(TZ(sd * w));
        M.box(flo(T(X - 0.35)), flo(TY(1.0)), zo - 1, flo(T(X + 0.35)), flo(TY(1.55)), zo + 2, (x, y, z) => J(0x6a3e1c, x, y, z, seed, 0.08));
        M.box(flo(T(X - 0.35)) - 1, flo(TY(1.55)), zo - 1, flo(T(X + 0.35)) + 1, flo(TY(1.55)) + 1, zo + 2, cfg.trim);
        M.set(flo(T(X)), flo(TY(1.25)), sd > 0 ? zo + 2 : zo - 2, 0xd8a830);
      }
    }
  }

  const aft = -L / 2;
  const wAftPoop = wl(aft + 0.2, 4.0);
  const winCols = [0xffd070, 0xffb840, 0xffe0a0, 0x7ad0e8, 0xffc050];
  const rowsW = [[3.55, 4.55, 4, 0.7], [2.4, 3.2, 3, 0.7]];
  rowsW.forEach(([y0, y1, n, hw], ri) => {
    for (let i = 0; i < n; i++) {
      const Zc = (i - (n - 1) / 2) * (ri === 0 ? 1.15 : 1.4);
      const w = wl(aft + 0.2, y0);
      if (Math.abs(Zc) + hw / 2 > w - 0.3) continue;
      const xa = flo(T(aft + 0.0));
      const xb = xa + 2;
      bx(aft, y0 - 0.12, Zc - hw / 2 - 0.12, aft + 0.4, y1 + 0.12, Zc + hw / 2 + 0.12, J(cfg.trim, i, ri, 3, seed, 0.05));
      for (let zz = flo(TZ(Zc - hw / 2)); zz < Math.round(TZ(Zc + hw / 2)); zz++)
        for (let yy = flo(TY(y0)); yy < Math.round(TY(y1)); yy++) {
          const bar = (zz - flo(TZ(Zc - hw / 2))) === 2 || (yy - flo(TY(y0))) === 2;
          M.set(xa, yy, zz, bar ? J(cfg.trim, zz, yy, 1, seed, 0.05) : winCols[(i + ri + (zz > TZ(Zc) ? 1 : 0)) % 5], 2);
          void xb;
        }
    }
  });
  for (const sd of [-1, 1])
    for (let i = 0; i < 2; i++) {
      const X = aft + 1.0 + i * 1.5;
      const w = wl(X, 4.0);
      const zz = sd > 0 ? flo(TZ(w)) - 1 : flo(TZ(-w));
      for (let xx = flo(T(X - 0.4)); xx < flo(T(X + 0.4)); xx++)
        for (let yy = flo(TY(3.65)); yy < flo(TY(4.45)); yy++) M.set(xx, yy, zz, winCols[(i + sd + 3) % 5], 2);
      M.box(flo(T(X - 0.4)) - 1, flo(TY(3.65)) - 1, zz - (sd > 0 ? 0 : 0), flo(T(X + 0.4)) + 1, flo(TY(3.65)), zz + 1, cfg.trim);
      M.box(flo(T(X - 0.4)) - 1, flo(TY(4.45)), zz, flo(T(X + 0.4)) + 1, flo(TY(4.45)) + 1, zz + 1, cfg.trim);
    }
  const pf = -0.72 * (L / 2);
  const pw = wl(pf, 4.0) - 0.3;
  M.box(flo(T(pf)), flo(TY(3.5)), flo(TZ(-pw)), flo(T(pf + 0.15)), flo(TY(4.9)), flo(TZ(pw)), (x, y, z) => J(shade(cfg.hullBlack[0], 1.4), x, y, z, seed, 0.1));
  bx(pf, 3.5, -0.45, pf + 0.2, 4.45, 0.45, 0x2a1a10);
  bx(pf + 0.15, 3.5, -0.58, pf + 0.28, 4.55, -0.45, cfg.trim);
  bx(pf + 0.15, 3.5, 0.45, pf + 0.28, 4.55, 0.58, cfg.trim);
  bx(pf + 0.15, 4.45, -0.58, pf + 0.28, 4.58, 0.58, cfg.trim);
  for (const zz of [-1.9, 1.9]) {
    bx(pf + 0.15, 3.9, zz - 0.3, pf + 0.2, 4.5, zz + 0.3, 0xffc860, 2);
    bx(pf + 0.1, 3.8, zz - 0.4, pf + 0.15, 4.6, zz - 0.3, cfg.trim);
    bx(pf + 0.1, 3.8, zz + 0.3, pf + 0.15, 4.6, zz + 0.4, cfg.trim);
  }
  for (const sd of [-1, 1]) {
    const w = wl(-0.46 * (L / 2), 2.4);
    for (let k = 0; k < 6; k++) bx(-0.46 * (L / 2) + 0.9 - k * 0.15, 2.3 + k * 0.2, sd * (w - 1.0) - 0.4, -0.46 * (L / 2) + 1.2 - k * 0.15, 2.5 + k * 0.2, sd * (w - 1.0) + 0.4, (x, y, z) => J(0xa07848, x, y, z, seed, 0.08));
  }

  const deckAt = (X) => H.deckY(X / (L / 2));
  const mastColor = (x, y, z) => J(mix(0x6a4a2c, 0x8a6238, hash3(x, y >> 2, z, 5)), x, y, z, seed, 0.06);
  cfg.masts.forEach((mk) => {
    const yb = deckAt(mk.X);
    const radL = mk.name === 'main' ? 2.5 : 2.2;
    const stage = (y0, y1, r) => {
      for (let yi = flo(TY(y0)); yi < Math.round(TY(y1)); yi++) K.cyl(M, T(mk.X), TZ(0), yi, yi + 1, r, (x, y, z) => ((y % 9 === 0) ? shade(mastColor(x, y, z), 0.8) : mastColor(x, y, z)));
    };
    stage(yb - 0.2, mk.lower, radL);
    stage(mk.lower - 0.8, mk.mid, radL * 0.7);
    stage(mk.mid - 0.6, mk.top, radL * 0.45);
    for (const Y of [mk.lower, mk.mid]) {
      const y = flo(TY(Y));
      K.cyl(M, T(mk.X), TZ(0), y, y + 2, radL * 0.8 + 0.8, 0x2c2f36);
    }
    K.cyl(M, T(mk.X), TZ(0), flo(TY(yb)), flo(TY(yb)) + 4, radL + 1.2, (x, y, z) => J(0x4a3420, x, y, z, seed, 0.08));
    bx(mk.X - 0.6, mk.lower - 0.1, -1.0, mk.X + 0.6, mk.lower + 0.1, 1.0, 0x5a3e28);
    bx(mk.X - 0.9, mk.lower + 0.1, -1.0, mk.X + 0.9, mk.lower + 0.25, 1.0, (x, y, z) => J(0x4a3420, x, y, z, seed, 0.08));
    for (const sd of [-1, 1]) {
      bx(mk.X - 0.9, mk.lower + 0.25, sd * 0.95 - 0.04, mk.X + 0.9, mk.lower + 0.75, sd * 0.95 + 0.04, 0x5a3e28);
    }
    bx(mk.X - 0.9, mk.lower + 0.25, -0.95, mk.X - 0.82, mk.lower + 0.75, 0.95, 0x5a3e28);
    bx(mk.X + 0.82, mk.lower + 0.25, -0.95, mk.X + 0.9, mk.lower + 0.75, 0.95, 0x5a3e28);
    const pen = mk.top + 0.1;
    for (let k = 0; k < 14; k++) {
      const wave = Math.sin(k * 0.55) * 0.18;
      bx(mk.X - 0.05 - k * 0.12, pen - 0.36 + k * 0.01 - k * 0.018, wave - 0.04, mk.X - 0.05 - k * 0.12 + 0.12, pen + (k < 9 ? 0 : -0.16 + 0) - k * 0.018 + 0.0, wave + 0.04, k % 5 === 2 ? 0xf0ece0 : cfg.stripe);
    }
    bx(mk.X - 0.06, mk.top - 0.1, -0.06, mk.X + 0.06, mk.top + 0.5, 0.06, 0xd8a830);
  });

  const mastAt = (name) => cfg.masts.find((q) => q.name === name);
  const yardCol = (x, y, z) => J(0x5a3e28, x, y, z, seed, 0.08);
  const yardsDone = new Set();
  const sailMasts = cfg.sails;
  sailMasts.forEach((sl, si) => {
    const mk = cfg.masts[sl.m];
    const half = sl.wTop;
    const key = `${sl.m}:${sl.yard}`;
    if (!yardsDone.has(key)) {
      yardsDone.add(key);
      const yi = TY(sl.yard);
      M.line(T(mk.X + 0.3), yi, TZ(-half - 0.5), T(mk.X + 0.3), yi, TZ(half + 0.5), yardCol, 2);
      bx(mk.X - 0.05, sl.yard - 0.12, -half - 0.6, mk.X + 0.65, sl.yard + 0.12, -half - 0.45, 0xd8a830);
      bx(mk.X - 0.05, sl.yard - 0.12, half + 0.45, mk.X + 0.65, sl.yard + 0.12, half + 0.6, 0xd8a830);
      K.cyl(M, T(mk.X + 0.3), TZ(0), flo(yi) - 1, flo(yi) + 3, 3, 0x2c2f36);
      for (const sd of [-1, 1]) ln(mk.X + 0.1, Math.min(mk.top, sl.yard + 2.2), 0, mk.X + 0.35, sl.yard + 0.1, sd * (half + 0.2), rope, 1);
    }
    if (sl.furl) {
      const r = 0.34;
      for (let zi = flo(TZ(-half)); zi < Math.round(TZ(half)); zi++) {
        const Z = (zi + 0.5 - oz) * s;
        const rr = r * (1 - 0.35 * (Math.abs(Z) / half) ** 3);
        const cx = T(mk.X + 0.55);
        const cy = TY(sl.yard - 0.38);
        const R = rr / s;
        for (let dy = -Math.ceil(R); dy <= Math.ceil(R); dy++)
          for (let dx = -Math.ceil(R); dx <= Math.ceil(R); dx++)
            if (dx * dx + dy * dy <= R * R) M.set(flo(cx + dx), flo(cy + dy), zi, J(sl.col[0], zi, dx + dy, 3, seed, 0.12));
        if (zi % 12 === 0) {
          for (let dy = -Math.ceil(R) - 1; dy <= Math.ceil(R) + 1; dy++)
            for (let dx = -Math.ceil(R) - 1; dx <= Math.ceil(R) + 1; dx++) {
              const d2 = dx * dx + dy * dy;
              if (d2 <= (R + 1.3) ** 2 && d2 > (R - 0.2) ** 2) M.set(flo(cx + dx), flo(cy + dy), zi, 0x8a7a54);
            }
        }
      }
      return;
    }
    const rs = new RNG(seed * 31 + si);
    for (let yi = flo(TY(sl.foot)) - 2; yi <= Math.round(TY(sl.yard)); yi++) {
      const Y = (yi + 0.5 - oy) * s;
      const tv = clamp((sl.yard - Y) / (sl.yard - sl.foot), 0, 1);
      const halfW = lerp(sl.wTop, sl.wBot, tv);
      for (let zi = flo(TZ(-halfW)); zi <= Math.round(TZ(halfW)); zi++) {
        const Z = (zi + 0.5 - oz) * s;
        const zn = Z / halfW;
        if (Math.abs(zn) > 1) continue;
        const cut = sl.foot + (sl.set && cfg.name === 'black' ? 0.55 : 0.25) * (Math.sin(zi * 0.35 + si) * 0.5 + hash3(zi, 0, si, seed) * 0.9) * (0.4 + Math.abs(zn));
        if (Y < cut) continue;
        const hole = hash3(zi >> 1, yi >> 1, si, seed + 4) > 0.985 && tv > 0.15;
        if (hole) continue;
        const slit = Math.abs(zn - (0.45 + si * 0.07) + tv * 0.18) < 0.012 && tv > 0.55 && tv < 0.95;
        if (slit) continue;
        const bulge = sl.belly * (1 - zn * zn) * (0.25 + 0.75 * Math.min(1, tv * 1.6));
        const xi = Math.round(T(mk.X + 0.35 + bulge));
        let c = sl.col[flo(hash3(zi >> 2, yi >> 2, si, seed) * sl.col.length) % sl.col.length];
        if (sl.patch && hash3(zi >> 3, yi >> 3, si, seed + 9) > 0.8) c = sl.accent;
        if (cfg.name === 'black' && hash3(zi >> 3, yi >> 3, si, seed + 9) > 0.93) c = 0x3c3c46;
        if (tv < 0.04) c = 0x3a3a44;
        c = J(c, xi, yi, zi, seed, 0.05);
        if (sl.skull) {
          const R = 2.0;
          const u = Z / R;
          const v = (Y - (sl.foot + sl.yard) / 2 + 0.05) / R;
          const k = K.skullPix(u * 0.95, v * 0.95);
          if (k === 1 || k === 3) c = J(0xf0eee0, xi, yi, zi, seed, 0.04);
          else if (k === 2) c = 0x0c0c10;
        }
        if (Math.abs(Math.abs(zn) - 0.98) < 0.03 && tv > 0.05) c = shade(c, 0.7);
        M.set(xi, yi, zi, c);
        if (hash3(zi, yi, si, seed + 6) > 0.9) M.set(xi - 1, yi, zi, shade(c, 0.8));
      }
    }
    for (const zn of [-0.7, -0.35, 0, 0.35, 0.7]) {
      for (let k = 0; k < 6; k++) {
        const t = k / 5;
        const halfW = lerp(sl.wTop, sl.wBot, t);
        const bulge = sl.belly * (1 - zn * zn) * (0.25 + 0.75 * Math.min(1, t * 1.6));
        void halfW;
        void bulge;
      }
    }
    const R2 = rs.next();
    void R2;
  });

  const bs = { x0: L / 2 - 3.2, y0: 3.7, x1: L / 2 + 5.2, y1: 5.8 };
  M.line(T(bs.x0), TY(bs.y0), TZ(0), T(bs.x1), TY(bs.y1), TZ(0), (x, y, z) => J(mix(0x6a4a2c, 0x8a6238, hash3(x >> 2, y, z, 3)), x, y, z, seed, 0.06), 3);
  K.cyl(M, T(L / 2 + 0.3), TZ(0), flo(TY(3.85)), flo(TY(3.85)) + 6, 3, 0x2c2f36);
  for (let k = 0; k < 3; k++) {
    const Xk = L / 2 + 1.2 + k * 1.5;
    K.cyl(M, T(Xk), TZ(0), flo(TY(bs.y0 + (Xk - bs.x0) * (bs.y1 - bs.y0) / (bs.x1 - bs.x0))) - 2, flo(TY(bs.y0 + (Xk - bs.x0) * (bs.y1 - bs.y0) / (bs.x1 - bs.x0))) + 2, 2.4, 0x2c2f36);
  }
  const jib = cfg.name === 'black' ? [0x1a1a20, 0x26262e] : [0xe8dcb8, 0xdcd0a8];
  const fm = cfg.masts[0];
  const tack = [bs.x1 - 0.3, bs.y1 - 0.1];
  const head = [fm.X + 0.2, fm.mid + 0.3];
  const clew = [fm.X + 4.6, 5.2];
  for (let i = 0; i <= 90; i++) {
    for (let j = 0; j <= 90 - i; j++) {
      const a = i / 90;
      const b = j / 90;
      const c0 = 1 - a - b;
      const X = tack[0] * a + head[0] * b + clew[0] * c0;
      const Y = tack[1] * a + head[1] * b + clew[1] * c0;
      const Z = 0.5 * Math.sin(Math.PI * Math.min(1, (b + c0 * 0.5) * 1.2)) * (a + c0) * 0.5 + 0.1;
      if (c0 < 0.04 && hash3(i, j, 1, seed) > 0.4) continue;
      if (hash3(i >> 2, j >> 2, 5, seed) > 0.985) continue;
      const x = flo(T(X));
      const y = flo(TY(Y));
      const z = flo(TZ(Z));
      const col = J(jib[(i + j) % 7 === 0 ? 1 : 0], x, y, z, seed, 0.06);
      M.set(x, y, z, col);
      M.set(x, y, flo(TZ(-Z)) , col);
    }
  }

  const figX = L / 2 + 0.9;
  const fy = 3.1;
  K.blob(M, T(figX), TY(fy + 0.4), TZ(0), 2.4, 2.6, 2.2, (x, y, z) => J(0xe8c890, x, y, z, seed, 0.05), seed, 0.1);
  K.blob(M, T(figX + 0.15), TY(fy + 0.75), TZ(0), 2.8, 2.6, 2.8, (x, y, z) => J(0xa01c28, x, y, z, seed, 0.1), seed + 1, 0.2);
  K.blob(M, T(figX - 0.55), TY(fy - 0.5), TZ(0), 2.8, 3.8, 3.2, (x, y, z) => J(0xdcb040, x, y, z, seed, 0.06), seed + 2, 0.15);
  K.blob(M, T(figX - 1.0), TY(fy - 1.2), TZ(0), 2.4, 3.2, 2.6, (x, y, z) => J(0xc29a2c, x, y, z, seed, 0.06), seed + 3, 0.15);
  M.box(flo(T(figX + 0.35)), flo(TY(fy + 0.45)), flo(TZ(0)) - 1, flo(T(figX + 0.35)) + 1, flo(TY(fy + 0.55)), flo(TZ(0)) + 2, 0x303030);
  bx(L / 2 - 1.5, 3.3, -0.5, L / 2 + 0.8, 3.6, 0.5, (x, y, z) => J(0x2a2018, x, y, z, seed, 0.08));
  ln(L / 2 - 0.3, 3.6, 0, L / 2 + 0.95, 3.0, 0, cfg.trim, 2);

  const anchorShip = (X, sd) => {
    const w = wl(X, 3.2);
    const zc = TZ(sd * (w + 0.25));
    const xc = T(X);
    const yb = TY(3.6);
    M.box(flo(xc) - 1, flo(yb), flo(TZ(sd * (w - 0.7))), flo(xc) + 1, flo(yb) + 2, flo(TZ(sd * (w + 0.55))) + 1, 0x4a3420);
    for (let y = -11; y < 0; y++) M.set(flo(xc), flo(yb) + y, flo(zc), 0x2a2420);
    for (let x = -4; x <= 4; x++) M.set(flo(xc) + x, flo(yb) - 11, flo(zc), 0x2a2420);
    for (let x = -4; x <= 4; x++) {
      const y = -17 + Math.round(((x * x) / 16) * 4);
      M.set(flo(xc) + x, flo(yb) + 6 + y - 1, flo(zc), 0x4a2e22);
      M.set(flo(xc) + x, flo(yb) + 7 + y - 1, flo(zc), 0x4a2e22);
    }
    for (let z = -3; z <= 3; z++) M.set(flo(xc), flo(yb) - 9, flo(zc) + z, 0x6a4a30);
    M.box(flo(xc) - 5, flo(yb) - 15, flo(zc), flo(xc) - 3, flo(yb) - 12, flo(zc) + 1, 0x4a2e22);
    M.box(flo(xc) + 4, flo(yb) - 15, flo(zc), flo(xc) + 6, flo(yb) - 12, flo(zc) + 1, 0x4a2e22);
    for (let k = 0; k < 3; k++) M.set(flo(xc) + 1, flo(yb) + k, flo(zc), 0xc4ae7a);
  };
  anchorShip(L / 2 - 2.8, 1);
  anchorShip(L / 2 - 2.8, -1);

  const wheelX = -0.46 * (L / 2) - 1.6;
  const wheelY = 3.5 + 1.0;
  const wc = [T(wheelX), TY(wheelY), TZ(0)];
  M.box(flo(wc[0]) - 1, flo(TY(3.5)), flo(wc[2]) - 3, flo(wc[0]) + 2, flo(TY(3.5 + 0.7)), flo(wc[2]) + 3, (x, y, z) => J(0x6a4a2c, x, y, z, seed, 0.08));
  for (let a = 0; a < 70; a++) {
    const ang = (a / 70) * Math.PI * 2;
    for (let rr = 6.2; rr <= 7.4; rr += 0.5) M.set(flo(wc[0]), flo(wc[1] + Math.sin(ang) * rr), flo(wc[2] + Math.cos(ang) * rr), J(0x6a4a2c, a, rr, 1, seed, 0.1));
  }
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2;
    for (let rr = 1; rr < 8.5; rr += 0.5) M.set(flo(wc[0]), flo(wc[1] + Math.sin(ang) * rr), flo(wc[2] + Math.cos(ang) * rr), J(rr > 7.4 ? 0xd8a830 : 0x7a5632, k, rr, 2, seed, 0.1));
    for (let q = 1; q <= 2; q++) M.set(flo(wc[0]) - q, flo(wc[1] + Math.sin(ang) * 8.4), flo(wc[2] + Math.cos(ang) * 8.4), 0xd8a830);
  }
  M.box(flo(wc[0]) - 1, flo(wc[1]) - 1, flo(wc[2]) - 1, flo(wc[0]) + 2, flo(wc[1]) + 2, flo(wc[2]) + 2, 0xd8a830);

  const lant = (X, Y, Z, sc, post) => {
    const cx = flo(T(X));
    const cy = flo(TY(Y));
    const cz = flo(TZ(Z));
    if (post) M.box(cx - 1, flo(TY(post)), cz - 1, cx + 1, cy, cz + 1, (x, y, z) => J(0x5a3e28, x, y, z, seed, 0.08));
    M.box(cx - 3 * sc, cy, cz - 3 * sc, cx + 3 * sc, cy + 1, cz + 3 * sc, 0xc9a23a);
    M.box(cx - 2 * sc, cy + 1, cz - 2 * sc, cx + 2 * sc, cy + 6 * sc, cz + 2 * sc, 0xffc860, true);
    M.box(cx - sc, cy + 2, cz - sc, cx + sc, cy + 5 * sc, cz + sc, 0xfff0b0, true);
    for (const dx of [-3 * sc, 2 * sc]) for (const dz of [-3 * sc, 2 * sc]) M.box(cx + dx, cy + 1, cz + dz, cx + dx + sc, cy + 6 * sc, cz + dz + sc, 0xc9a23a);
    M.box(cx - 3 * sc, cy + 6 * sc, cz - 3 * sc, cx + 3 * sc, cy + 6 * sc + 1, cz + 3 * sc, 0xc9a23a);
    M.box(cx - sc, cy + 6 * sc + 1, cz - sc, cx + sc, cy + 6 * sc + 3, cz + sc, 0xc9a23a);
  };
  const sternX = aft + 0.45;
  const topP = H.topY(-1);
  bx(sternX - 0.05, topP, -0.1, sternX + 0.1, topP + 1.6, 0.1, 0x5a3e28);
  lant(sternX, topP + 1.6, 0, 1, null);
  for (const sd of [-1, 1]) {
    const w = wl(aft + 1.0, 5.5) - 0.2;
    lant(aft + 0.9, topP + 0.1, sd * w, 1, null);
  }
  if (cfg.name === 'brown') {
    const bellX = L / 2 - 3.6;
    bx(bellX - 0.4, 3.6, -0.5, bellX - 0.3, 5.1, 0.5, 0x5a3e28);
    bx(bellX + 0.3, 3.6, -0.5, bellX + 0.4, 5.1, 0.5, 0x5a3e28);
    bx(bellX - 0.4, 5.0, -0.5, bellX + 0.4, 5.2, 0.5, 0x5a3e28);
    for (let y = 0; y < 8; y++) {
      const r = 1.6 + (y / 8) * 2.4;
      K.cyl(M, T(bellX), TZ(0), flo(TY(4.9)) - y, flo(TY(4.9)) - y + 1, r, (x, yy, z) => J(0xdcb040, x, yy, z, seed, 0.08));
    }
    M.set(flo(T(bellX)), flo(TY(4.9)) - 8, flo(TZ(0)), 0x3a2a14);
    for (let k = 0; k < 9; k++) {
      const X = -3.4 + (k % 3) * 0.85;
      const Z = (k < 3 ? -1.5 : k < 6 ? 1.5 : 0) + (k % 2) * 0.3;
      const bxv = T(X);
      const bzv = TZ(Z);
      const byv = flo(TY(2.3));
      for (let y = 0; y < 8; y++) {
        const rr = [3, 3.8, 4.2, 4.4, 4.4, 4.2, 3.8, 3][y] * 0.9;
        K.cyl(M, bxv, bzv, byv + y, byv + y + 1, rr, (x, yy, z) => (y === 1 || y === 6 ? J(0x3a3d44, x, yy, z, seed, 0.08) : J(flo((Math.atan2(z - bzv, x - bxv) + 3.2) * 3) % 2 ? 0x8a5a30 : 0x764a28, x, yy, z, seed, 0.07)));
      }
      K.cyl(M, bxv, bzv, byv + 8, byv + 9, 3, 0x9a6b3d);
    }
    for (let k = 0; k < 3; k++) bx(2.9 + k * 0.6, 2.3, -0.4 + k * 0.1, 3.5 + k * 0.6, 3.0 + (k === 1 ? 0.5 : 0), 0.2 + k * 0.1, (x, y, z) => J(0xa87848, x, y, z, seed, 0.08));
  }
  const gx = 3.3;
  bx(gx - 2.4, 2.3, 1.1, gx + 1.8, 2.45, 2.0, (x, y, z) => J(0x8a6a40, x, y, z, seed, 0.08));
  for (let k = 0; k < 7; k++) bx(gx - 2.3 + k * 0.62, 2.45, 1.1, gx - 2.3 + k * 0.62 + 0.1, 2.56, 2.0, 0x5a3e28);
  const hatchX = cfg.name === 'black' ? -2.6 : -1.6;
  bx(hatchX - 0.8, 2.3, -0.9, hatchX + 0.8, 2.5, 0.9, 0x2a1f16);
  for (let k = 0; k < 6; k++) {
    bx(hatchX - 0.8 + k * 0.29, 2.5, -0.9, hatchX - 0.8 + k * 0.29 + 0.08, 2.58, 0.9, 0x6a4a2c);
    bx(hatchX - 0.8, 2.5, -0.9 + k * 0.33, hatchX + 0.8, 2.58, -0.9 + k * 0.33 + 0.08, 0x6a4a2c);
  }
  const capX = 4.2;
  K.cyl(M, T(capX), TZ(0), flo(TY(2.3)), flo(TY(2.3)) + 5, 3.2, (x, y, z) => J(0x6a4a2c, x, y, z, seed, 0.08));
  K.cyl(M, T(capX), TZ(0), flo(TY(2.3)) + 5, flo(TY(2.3)) + 6, 3.6, 0x2c2f36);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    M.line(T(capX), flo(TY(2.3)) + 5, TZ(0), T(capX) + Math.cos(a) * 5, flo(TY(2.3)) + 5, TZ(0) + Math.sin(a) * 5, 0x7a5632, 1);
  }

  const shroud = (mk, nSh, side) => {
    const sx = mk.X / (L / 2);
    const dk = H.deckY(sx);
    const topA = [mk.X + 0.05, mk.lower - 0.05, side * 0.55];
    const anch = [];
    for (let k = 0; k < nSh; k++) {
      const X = mk.X - 0.4 + (k - (nSh - 1) / 2) * 0.8;
      const w = wl(X, dk + 0.8) + 0.12;
      anch.push([X, dk + 0.95, side * w]);
      M.box(flo(T(X)) - 1, flo(TY(dk + 0.85)), Math.min(flo(TZ(side * w)), flo(TZ(side * (w - 0.2)))), flo(T(X)) + 2, flo(TY(dk + 1.0)), Math.max(flo(TZ(side * w)), flo(TZ(side * (w - 0.2)))) + 1, 0x2c2f36);
      ln(X, dk + 0.95, side * w, topA[0] + (k - (nSh - 1) / 2) * 0.12, topA[1], topA[2], rope, 1);
    }
    const a1 = anch[0];
    const a2 = anch[nSh - 1];
    for (let Y = dk + 1.5; Y < mk.lower - 0.4; Y += 0.55) {
      const t = (Y - a1[1]) / (topA[1] - a1[1]);
      const p1 = [lerp(a1[0], topA[0] + (0 - (nSh - 1) / 2) * 0.12, t), Y, lerp(a1[2], topA[2], t)];
      const p2 = [lerp(a2[0], topA[0] + ((nSh - 1) / 2) * 0.12, t), Y, lerp(a2[2], topA[2], t)];
      ln(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], (x, y, z) => J(0xb09a68, x, y, z, seed, 0.08), 1);
    }
  };
  cfg.masts.forEach((mk) => {
    for (const sd of [-1, 1]) shroud(mk, mk.name === 'miz' ? 3 : 4, sd);
    const sxm = mk.X / (L / 2);
    void sxm;
  });
  const mm = mastAt('main');
  const fo = mastAt('fore');
  const mz = mastAt('miz');
  ln(fo.X, fo.top - 0.2, 0, bs.x1 - 0.2, bs.y1, 0, rope, 1);
  ln(mm.X, mm.top - 0.3, 0, fo.X + 0.1, fo.mid + 0.1, 0, rope, 1);
  ln(mz.X, mz.top - 0.3, 0, mm.X - 0.1, mm.mid + 0.2, 0, rope, 1);
  ln(fo.X, fo.lower, 0, L / 2 - 0.4, 3.9, 0, rope, 1);
  ln(mm.X, mm.lower, 0, fo.X - 0.3, 3.0, 0, rope, 1);
  for (const sd of [-1, 1]) {
    ln(mm.X - 0.05, mm.mid, sd * 0.3, aft + 1.4, 6.0, sd * 2.4, rope, 1);
    ln(mz.X - 0.05, mz.mid, sd * 0.25, aft + 0.6, 6.1, sd * 2.0, rope, 1);
    ln(fo.X - 0.05, fo.mid, sd * 0.3, fo.X - 1.7, 3.3, sd * (wl(fo.X - 1.7, 3.3) - 0.1), rope, 1);
  }

  const nest = mm.mid + 1.2;
  const nc = [T(mm.X), TZ(0)];
  for (let y = 0; y < 5; y++) {
    const yy = flo(TY(nest)) + y;
    K.cyl(M, nc[0], nc[1], yy, yy + 1, 6.4 - (y === 0 ? 1.4 : 0), (x, yv, z) => (y === 3 || y === 4 ? J(cfg.stripe, x, yv, z, seed, 0.06) : y === 0 ? 0x2c2f36 : J(mix(0x7a5632, 0x9a7240, hash3(x >> 1, yv, z >> 1, 4)), x, yv, z, seed, 0.07)));
    if (y > 0) K.cyl(M, nc[0], nc[1], yy, yy + 1, 4.6, (x, yv, z) => 0x3a2a1c);
  }
  K.cyl(M, nc[0], nc[1], flo(TY(nest)) + 1, flo(TY(nest)) + 2, 4.6, (x, y, z) => J(0x6a4a2c, x, y, z, seed, 0.08));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 6.28;
    M.set(flo(nc[0] + Math.cos(a) * 6.1), flo(TY(nest)) + 5, flo(nc[1] + Math.sin(a) * 6.1), 0xd8a830);
  }
  return bundle([[M, s, ox, oy, oz]]);
}

/* ----------------------------------- wreck --------------------------------- */

function wreck() {
  const seed = 31;
  const s = 0.17;
  const L = 20;
  const B = 7.2;
  const H = hullShape(L, B);
  const ox0 = Math.round(14 / s);
  const oy0 = Math.round(4 / s);
  const oz0 = Math.round(7 / s);
  const S = new VoxelModel(ox0 * 2, Math.round(11 / s), oz0 * 2);
  const wood = (x, y, z, k = 0) => J(pickWood(x, y, z, k), x, y, z, seed, 0.07);
  const pickWood = (x, y, z, k) => [0x7a6a52, 0x6a5a46, 0x8a7a60, 0x5e5040][flo(hash3(x >> 2, y >> 1, z >> 2, seed + k) * 4)];
  const holeC = [flo(0.1 * (L / 2) / s), 1.8, 1];
  void holeC;
  const nRibs = 13;
  for (let xi = 0; xi < S.sx; xi++) {
    const X = (xi + 0.5 - ox0) * s;
    const sx = X / (L / 2);
    if (sx < -1 || sx > 1) continue;
    const yk = H.yk(sx);
    const topFull = H.topY(sx) - 0.4;
    for (let zi = 0; zi < S.sz; zi++) {
      const Z = (zi + 0.5 - oz0) * s;
      const az = Math.abs(Z);
      for (let yi = flo(oy0 + yk / s); yi < oy0 + topFull / s; yi++) {
        const Y = (yi + 0.5 - oy0) * s;
        const w = H.wAt(sx, Y);
        if (az > w) continue;
        const inShell = az > w - 0.28;
        const ribPhase = (X + 10) / 1.5;
        const onRib = Math.abs(ribPhase - Math.round(ribPhase)) < 0.1 && az > w - 0.55;
        if (!inShell && !onRib) {
          if (Y < 0 && Math.abs(Z) < w - 0.28 && false) S.set(xi, yi, zi, 0x2a2018);
          continue;
        }
        const n = K.fbm2 ? 0 : hash3(xi >> 3, yi >> 3, zi >> 3, seed + 7);
        const cutY = 1.2 + hash3(xi >> 2, 0, zi >> 2, seed + 2) * 2.4 + Math.sin(X * 0.9) * 0.8 + (sx > 0.5 ? 0.7 : 0) - (sx < -0.5 ? 0.3 : 0);
        const gone = hash3(xi >> 2, yi >> 2, zi >> 2, seed + 11) > 0.8 && Y > cutY - 1.7 && Y < cutY + 4 && inShell && !onRib;
        const isHole = Math.hypot((X - 2.4) / 1.6, (Y - 1.4) / 1.05) < 1 && Z > 0;
        if (gone || isHole) continue;
        if (inShell && Y > cutY) continue;
        if (onRib && !inShell && Y > cutY + 1.4 + hash3(xi, 0, zi >> 1, seed + 5) * 0.9) continue;
        if (onRib && Y > cutY + 0.2 && Y < cutY + 3 && hash3(xi >> 1, 0, zi, seed + 15) > 0.55 && !inShell) continue;
        const plankSeam = (xi + flo((Y + 3) / 0.42) * 19) % 31 === 0;
        let c = wood(xi, yi, zi, onRib ? 3 : 0);
        if (plankSeam || (flo((Y + 3) / 0.42) % 3 === 0 && hash3(xi, yi, zi, seed) > 0.4)) c = shade(c, 0.75);
        if (Y > 0.4 && n > 0.5) c = J(0x4a7a3a, xi, yi, zi, seed, 0.12);
        if (Y > cutY - 0.3 && hash3(xi, yi, zi, seed + 3) > 0.6) c = J(0x8a7a60, xi, yi, zi, seed, 0.1);
        S.set(xi, yi, zi, c);
      }
    }
  }
  for (let xi = flo(ox0 - 8.5 / s); xi < ox0 + 8.5 / s; xi += 3) {
    const X = (xi - ox0) * s;
    const y = Math.round(oy0 + 0.35 / s + hash3(xi, 0, 1, seed) * 2);
    for (let zi = 0; zi < S.sz; zi++) {
      const Z = (zi + 0.5 - oz0) * s;
      const w = H.wAt(X / (L / 2), 0.4);
      if (Math.abs(Z) < w - 0.4 && Math.abs(X) < L / 2 - 1 && hash3(xi, zi, 4, seed) > 0.25) S.set(xi, y, zi, wood(xi, y, zi, 5));
    }
  }
  const mastTilt = 0.42;
  const mx0 = ox0 + 1.2 / s;
  const mz0 = oz0;
  const mastLen = 8.4 / s;
  for (let k = 0; k < mastLen; k++) {
    const t = k / mastLen;
    const px = mx0 - Math.sin(mastTilt) * k * 0.55 + Math.sin(mastTilt) * 0;
    const py = oy0 + 0.2 / s + Math.cos(mastTilt) * k;
    const pz = mz0 + Math.sin(mastTilt * 0.5) * k * 0.4;
    const r = lerp(2.6, 1.6, t);
    K.blob(S, px, py, pz, r, 1.2, r, (x, y, z) => wood(x, y, z, 9), seed + k, 0);
    if (hash3(k, 0, 3, seed) > 0.97) S.set(flo(px) + 2, flo(py), flo(pz), 0x4a7a3a);
  }
  const tx = mx0 - Math.sin(mastTilt) * mastLen * 0.55;
  const ty = oy0 + 0.2 / s + Math.cos(mastTilt) * mastLen;
  const tz = mz0 + Math.sin(mastTilt * 0.5) * mastLen * 0.4;
  const yardY = ty - 22;
  const yardX = mx0 - Math.sin(mastTilt) * (mastLen - 22) * 0.55;
  const yardZ = mz0 + Math.sin(mastTilt * 0.5) * (mastLen - 22) * 0.4;
  S.line(yardX, yardY, yardZ - 26, yardX + 1, yardY - 4, yardZ + 22, (x, y, z) => wood(x, y, z, 7), 2);
  for (let k = 0; k < 10; k++) {
    const zz = flo(yardZ - 22 + k * 4.6);
    const len = 16 + flo(hash3(k, 0, 1, seed) * 24);
    for (let j = 0; j < len; j++) {
      const width = k % 3 === 0 ? 3 : 4;
      for (let w = 0; w < width; w++) {
        const jj = j + flo(Math.sin(j * 0.5 + k) * 0);
        if (hash3(k, j, w, seed) > 0.93) continue;
        const x = flo(yardX + 1 + Math.sin(j * 0.2 + k) * 1.5 + (j > 10 ? 1 : 0));
        S.set(x, flo(yardY - 4 - jj), zz + w + flo(Math.sin(j * 0.15 + k) * 1), J(mix(0x8a8a82, 0x6a6a64, hash3(k, j >> 2, w, seed)), x, jj, zz, seed, 0.07));
      }
    }
  }
  void tx; void ty; void tz;
  const sag = (n, base) => {
    for (let k = 0; k < n; k++) {
      const a = k * 0.8;
      S.line(mx0 - 1, oy0 + 2 / s + k * 6, mz0, mx0 + Math.cos(a) * 14, oy0 + 0.3 / s, mz0 + Math.sin(a) * 14, (x, y, z) => J(0x5a4a30, x, y, z, seed, 0.1), 1);
    }
    void base;
  };
  sag(4, 0);
  K.mossify(S, seed, 0.3, 0.12, 0);
  K.vines(S, seed + 2, 24, 8, 36, 0);

  const rollA = (12 * Math.PI) / 180;
  const R = new VoxelModel(S.sx + 40, S.sy + 20, S.sz + 40);
  const rcx = S.sx / 2;
  const rcz = S.sz / 2;
  const rox = 20;
  const roz = 20;
  const cA = Math.cos(rollA);
  const sA = Math.sin(rollA);
  const ry0 = oy0 + 0;
  for (let z = 0; z < R.sz; z++)
    for (let y = 0; y < R.sy; y++) {
      for (let x = 0; x < R.sx; x++) {
        const dz = z - roz - rcz;
        const dy = y - (ry0 + 8);
        const sz = dz * cA + dy * sA + rcz;
        const sy = -dz * sA + dy * cA + ry0;
        const sxx = x - rox;
        const v = S.get(sxx, flo(sy + 0.5), flo(sz + 0.5));
        if (v) R.data[R.idx(x, y, z)] = v;
      }
    }
  const ground = new RNG(seed + 40);
  let lowest = R.sy;
  for (let i = 0; i < R.data.length; i++) if (R.data[i]) lowest = Math.min(lowest, flo(i / R.sx) % R.sy);
  const gy = lowest + Math.round(1.6 / s);
  for (let z = 0; z < R.sz; z++) for (let y = 0; y < gy - 3; y++) for (let x = 0; x < R.sx; x++) R.clear(x, y, z);
  function pickG(x, z) {
    const h = hash3(x >> 1, 0, z >> 1, seed + 20);
    return h > 0.7 ? 0x5ba03e : h > 0.35 ? 0x3c7a30 : 0x2e6a2c;
  }
  for (let z = 0; z < R.sz; z++)
    for (let x = 0; x < R.sx; x++) {
      const X = (x - rox - ox0) * s;
      const Z = (z - roz - oz0) * s;
      const d = Math.hypot(X / 11.6, Z / 5.4);
      if (d > 1.1) continue;
      const hgt = Math.round(((1.5 * (1.1 - d) ** 1.4 + hash3(x >> 2, 0, z >> 2, seed) * 0.25 * Math.min(1, (1.1 - d) * 4)) / s));
      for (let y = gy - 3; y < gy + hgt; y++) {
        if (R.has(x, y, z)) continue;
        const top = y >= gy + hgt - 2;
        R.set(x, y, z, top ? J(hash3(x >> 1, 0, z >> 1, seed + 8) > 0.72 ? 0x5a4630 : pickG(x, z), x, y, z, seed, 0.1) : J(0x4a3622, x, y, z, seed, 0.1));
      }
    }
  for (let i = 0; i < 18; i++) {
    const a = ground.range(0, 6.28);
    const d = ground.range(0.3, 1.0);
    const x = flo(ox0 + rox + Math.cos(a) * d * 11 / s * 0.75);
    const z = flo(oz0 + roz + Math.sin(a) * d * 5 / s * 0.75);
    let y = R.sy - 1;
    while (y > 0 && !R.has(x, y, z)) y--;
    if (y <= 1) continue;
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * Math.PI * 2;
      K.leaf(R, x, y + 1, z, ang, ground.range(5, 9), 0.9, 1.3, {
        width: 2.4, leaflets: true, spacing: 1, ldroop: 0.3, sweep: 0.6, seed,
        mid: (xx, yy, zz) => J(0x8ad05a, xx, yy, zz, seed, 0.05),
        col: (xx, yy, zz, t, e) => J(mix(mix(0x198a3c, 0x45c04c, 1 - e * 0.5), 0xa4e060, t * 0.4), xx, yy, zz, seed, 0.07),
      });
    }
  }
  return bundle([[R, s, rox + ox0, gy, roz + oz0]]);
}

/* ------------------------------------ piers -------------------------------- */

function pierBase(opts = {}) {
  const vox = opts.vox ?? 0.0625;
  const len = opts.len ?? 8;
  const wid = opts.wid ?? 3.4;
  const sx = Math.round(len / vox);
  const sz = Math.round(wid / vox);
  const oy = Math.round(3.6 / vox);
  const M = new VoxelModel(sx, oy + Math.round(2.6 / vox), sz);
  const ox = sx / 2;
  const oz = sz / 2;
  return { M, vox, sx, sz, ox, oy, oz, hz: wid / 2 };
}

const PLANK = [0x9a6c3f, 0x8a5e35, 0xa5774a, 0x7f5530, 0xb08050];

function deckPlanks(P, o = {}) {
  const { M, vox, sx, sz, oy } = P;
  const pitch = Math.round(0.5 / vox);
  const edge = Math.round(0.26 / vox);
  const x0 = o.x0 ?? 0;
  const x1 = o.x1 ?? sx;
  const z0 = o.z0 ?? 0;
  const z1 = o.z1 ?? sz;
  for (let x = x0; x < x1; x++) {
    const pi = flo((x - x0) / pitch);
    const gap = (x - x0) % pitch === pitch - 1;
    const tone = PLANK[flo(hash3(pi, 0, 1, 9) * 5)];
    for (let z = z0 + edge; z < z1 - edge; z++) {
      if (gap) {
        M.set(x, oy - 2, z, 0x2a1c12);
        continue;
      }
      const grain = (z + pi * 5) % 9 === 0 ? 0.9 : 1;
      M.set(x, oy - 1, z, J(shade(tone, grain), x, oy, z, 4, 0.06));
      M.set(x, oy - 2, z, J(shade(tone, 0.85), x, oy, z, 5, 0.06));
      if (!gap && (x - x0) % pitch === 2 && (z === z0 + edge + 2 || z === z1 - edge - 3)) M.set(x, oy - 1, z, 0x2a2420);
      if ((x - x0) % pitch === pitch - 3 && (z === z0 + edge + 2 || z === z1 - edge - 3)) M.set(x, oy - 1, z, 0x2a2420);
    }
  }
}

function pierFrame(P, o = {}) {
  const { M, vox, sx, sz, oy, ox } = P;
  const x0 = o.x0 ?? 0;
  const x1 = o.x1 ?? sx;
  const z0 = o.z0 ?? 0;
  const z1 = o.z1 ?? sz;
  const edge = Math.round(0.26 / vox);
  for (const zf of o.stringers ?? [0.22, 0.5, 0.78]) {
    const zz = Math.round(z0 + (z1 - z0) * zf) - 2;
    M.box(x0, oy - 8, zz, x1, oy - 3, zz + 4, (x, y, z) => J(pickC([0x4f3220, 0x5a3a24], x >> 3, y, z, 3), x, y, z, 3, 0.1));
  }
  for (const [za, zb] of [[z0, z0 + edge], [z1 - edge, z1]]) {
    M.box(x0, oy - 4, za, x1, oy, zb, (x, y, z) => J(pickC([0x7a4e2c, 0x6a4424], x >> 4, 0, z, 7), x, y, z, 7, 0.07));
    for (let x = x0 + 5; x < x1; x += 12) M.set(x, oy - 1, (za + zb) >> 1, 0x2a2420);
  }
}

function piling(M, x, z, oy, vox, top, seed, r = 2.7) {
  const bottom = 0;
  for (let y = bottom; y < top; y++) {
    const depth = (oy - y) * vox;
    const wet = depth > 1.2;
    K.cyl(M, x + 0.5, z + 0.5, y, y + 1, r + (depth > 2.6 ? 0.4 : 0), (xx, yy, zz) => {
      if (depth > 0.9 && depth < 1.4 && (yy & 1)) return J(0x3a7a44, xx, yy, zz, seed, 0.1);
      if (wet) return J(mix(0x5a5a40, 0x4a6a46, hash3(xx, yy >> 2, zz, seed)), xx, yy, zz, seed, 0.1);
      return J(mix(0x6a4a2c, 0x8a6238, hash3(xx >> 1, yy >> 2, zz >> 1, seed)), xx, yy, zz, seed, 0.07);
    });
  }
  for (let y = oy - 14; y < oy - 8; y++) K.cyl(M, x + 0.5, z + 0.5, y, y + 1, r + 0.8, (xx, yy, zz) => J(ROPEC[(yy + xx) & 1], xx, yy, zz, seed, 0.06));
}

const ROPEC = [0xd6c394, 0xb59f6e];
const pickC = (arr, x, y, z, s) => arr[flo(hash3(x, y, z, s) * arr.length) % arr.length];

function railPost(M, x, z, y0, y1, vox, seed) {
  M.box(x - 1, y0, z - 1, x + 2, y1, z + 2, (xx, y, zz) => J(pickC([0x6a4a2c, 0x7a5632], xx, y >> 3, zz, seed), xx, y, zz, seed, 0.08));
  M.box(x - 2, y1, z - 2, x + 3, y1 + 1, z + 3, 0x8a6238);
  for (let k = 0; k < 4; k++) M.box(x - 2, y0 + 8 + k * 1, z - 2, x + 3, y0 + 9 + k * 1, z + 3, (xx, y, zz) => J(ROPEC[(xx + zz) & 1], xx, y, zz, seed, 0.06));
}

function ropeRun(M, xa, za, xb, zb, ya, yb, sag, th, seed) {
  const n = Math.max(Math.abs(xb - xa), Math.abs(zb - za));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = xa + (xb - xa) * t;
    const z = za + (zb - za) * t;
    const y = lerp(ya, yb, t) - Math.sin(t * Math.PI) * sag;
    for (let k = 0; k < th; k++) M.set(flo(x), flo(y) + k, flo(z), J(ROPEC[(i >> 1) & 1], i, k, 1, seed, 0.06));
  }
}

function pierSegmentBuild(kind) {
  const P = pierBase();
  const { M, vox, sx, sz, ox, oy, oz } = P;
  deckPlanks(P);
  pierFrame(P);
  const edge = Math.round(0.26 / vox);
  const postZ = [edge >> 1, sz - 1 - (edge >> 1)];
  const pilX = [ox - 2 / vox, ox + 2 / vox];
  for (const px of pilX) {
    for (const pz of [Math.round(0.22 / vox + 2), sz - Math.round(0.22 / vox + 2)]) piling(M, px, pz, oy, vox, oy - 6, 3 + px);
    M.box(px - 3, oy - 20, 3, px + 4, oy - 15, sz - 3, (x, y, z) => J(0x4f3220, x, y, z, 8, 0.1));
    for (const pz of [Math.round(0.22 / vox + 2), sz - Math.round(0.22 / vox + 2)]) {
      M.line(px - 6, oy - 24, pz, px + 6, oy - 14, pz, 0x4a3420, 2);
      M.line(px + 6, oy - 24, pz, px - 6, oy - 14, pz, 0x4a3420, 2);
    }
  }
  const postY1 = oy + Math.round(1.0 / vox);
  for (const px of pilX) for (const pz of postZ) railPost(M, flo(px), pz + 0, oy, postY1 - 1, vox, 12 + px);
  const ropeY = (Y) => oy + Math.round(Y / vox);
  for (const pz of postZ) {
    const period = Math.round(4 / vox);
    for (let x = 0; x < sx; x++) {
      const t = (((x + 0.5 - (ox - period / 2)) % period) + period) % period / period;
      const sg = Math.sin(t * Math.PI);
      for (const [Y, drop] of [[0.84, 0.16], [0.44, 0.08]]) {
        const y = ropeY(Y) - Math.round(sg * drop / vox) ;
        const zz = pz + 0;
        M.set(x, y, zz, J(ROPEC[(x >> 1) & 1], x, y, zz, 5, 0.06));
        M.set(x, y + 1, zz, J(ROPEC[(x >> 1) & 1], x, y, zz, 6, 0.06));
        M.set(x, y, zz + 1, J(ROPEC[(x >> 1) & 1], x, y, zz, 7, 0.06));
      }
    }
  }
  void kind;
  return { P };
}

export function buildPierSegment() {
  const { P } = pierSegmentBuild('seg');
  return bundle([[P.M, P.vox, P.ox, P.oy, P.oz]]);
}

function bollard(M, x, z, y0, seed) {
  for (let y = 0; y < 9; y++) K.cyl(M, x, z, y0 + y, y0 + y + 1, y > 6 ? 3.8 : 2.8, (xx, yy, zz) => J(mix(0x24272d, 0x3c4048, hash3(xx, yy, zz, seed)), xx, yy, zz, seed, 0.06));
  for (let k = 0; k < 6; k++) K.cyl(M, x, z, y0 + 3 + (k >> 1), y0 + 4 + (k >> 1), 3.4, J(ROPEC[k & 1], k, 1, 1, seed, 0.06));
}

function lampPost(M, x, z, y0, seed) {
  M.box(x - 1, y0, z - 1, x + 2, y0 + 30, z + 2, (xx, y, zz) => J(pickC([0x4f3220, 0x5e3d22], xx, y >> 3, zz, seed), xx, y, zz, seed, 0.08));
  M.box(x - 2, y0, z - 2, x + 3, y0 + 2, z + 3, 0x3a2818);
  M.box(x - 2, y0 + 28, z - 2, x + 3, y0 + 30, z + 3, 0x2c2f36);
  const cx = x;
  const cy = y0 + 30;
  M.box(cx - 3, cy, z - 3, cx + 4, cy + 1, z + 4, 0xc9a23a);
  M.box(cx - 2, cy + 1, z - 2, cx + 3, cy + 9, z + 3, 0xffc860, true);
  M.box(cx - 1, cy + 2, z - 1, cx + 2, cy + 7, z + 2, 0xfff0b0, true);
  for (const dx of [-3, 3]) for (const dz of [-3, 3]) M.box(cx + dx, cy + 1, z + dz, cx + dx + 1, cy + 9, z + dz + 1, 0xc9a23a);
  M.box(cx - 3, cy + 9, z - 3, cx + 4, cy + 10, z + 4, 0xc9a23a);
  M.box(cx - 1, cy + 10, z - 1, cx + 2, cy + 12, z + 2, 0xc9a23a);
}

export function buildPierEnd() {
  const { P } = pierSegmentBuild('end');
  const { M, vox, sx, sz, ox, oy } = P;
  const edge = Math.round(0.26 / vox);
  M.box(sx - 4, oy, 0, sx, oy + 1, sz, (x, y, z) => null);
  for (let x = sx - 5; x < sx; x++) for (let z = 0; z < sz; z++) for (let y = oy; y < oy + 20; y++) M.clear(x, y, z);
  const endX = sx - 5;
  M.box(endX, oy - 4, edge, endX + 5, oy, sz - edge, (x, y, z) => J(0x7a4e2c, x, y, z, 7, 0.07));
  for (const z of [3, sz - 4]) railPost(M, sx - 3, z, oy, oy + Math.round(1.0 / vox) - 1, vox, 31);
  for (const [Y, drop] of [[0.84, 0.14], [0.44, 0.08]]) ropeRun(M, sx - 3, 3, sx - 3, sz - 4, oy + Math.round(Y / vox), oy + Math.round(Y / vox), Math.round(drop / vox), 2, 5);
  for (let x = sx - 20; x < sx - 4; x++) for (let y = oy; y < oy + Math.round(1.0 / vox); y++) for (const z of [0, 1, 2, 3, 4, sz - 5, sz - 4, sz - 3, sz - 2, sz - 1]) if (y > oy + 18) M.clear(x, y, z);
  bollard(M, ox + 8, 14, oy, 1);
  bollard(M, ox + 8, sz - 15, oy, 2);
  bollard(M, ox + 36, 14, oy, 3);
  bollard(M, ox + 36, sz - 15, oy, 4);
  lampPost(M, sx - 7, 6, oy, 21);
  lampPost(M, sx - 7, sz - 7, oy, 22);
  const cx = ox + 22;
  const cz = sz >> 1;
  for (let l = 0; l < 3; l++)
    for (const rr of [7.2 - l * 0.9, 5.2 - l * 0.9, 3.2 - l * 0.9]) {
      if (rr < 1) continue;
      for (let a = 0; a < 90; a++) {
        const ang = (a / 90) * Math.PI * 2;
        const tw = Math.sin(ang * 14 + rr) > 0;
        for (let h = 0; h < 2; h++) M.set(flo(cx + Math.cos(ang) * rr), oy + l * 2 + h, flo(cz + Math.sin(ang) * rr), J(tw ? 0xd6c394 : 0xb59f6e, a, h, l, 3, 0.06));
      }
    }
  for (let k = 0; k < 10; k++) M.set(flo(cx + 7 + k * 0.7), oy, flo(cz + 2 + Math.sin(k) * 1.5), 0xc4ae7a);
  for (let k = 0; k < 4; k++) M.box(ox - 30 + k * 4, oy, sz - 14, ox - 27 + k * 4, oy + 4 + (k % 2), sz - 11, (x, y, z) => J(0xa87848, x, y, z, 4, 0.08));
  M.box(ox - 12, oy, 8, ox - 4, oy + 5, 14, (x, y, z) => J(y % 2 ? 0x8a5a30 : 0x764a28, x, y, z, 4, 0.08));
  M.box(ox - 12, oy + 5, 8, ox - 4, oy + 6, 14, 0x3a3d44);
  return bundle([[M, vox, ox, oy, P.oz]]);
}

export function buildPierPlatform() {
  const vox = 0.1;
  const N = Math.round(10 / vox);
  const oy = Math.round(3.6 / vox);
  const M = new VoxelModel(N, oy + Math.round(2.4 / vox), N);
  const P = { M, vox, sx: N, sz: N, ox: N / 2, oy, oz: N / 2 };
  deckPlanks(P);
  pierFrame(P, { stringers: [0.12, 0.3, 0.5, 0.7, 0.88] });
  for (let a = 0; a < 5; a++) {
    const px = Math.round((0.1 + a * 0.2) * N);
    for (const pzf of [0.04, 0.5, 0.96]) {
      const pz = Math.round(pzf * N) - (pzf > 0.9 ? 3 : pzf < 0.1 ? -3 : 0);
      piling(M, px, pz, oy, vox, oy - 5, 40 + a, 3);
    }
    M.box(px - 3, oy - 22, 4, px + 4, oy - 17, N - 4, (x, y, z) => J(0x4f3220, x, y, z, 8, 0.1));
  }
  const ropeY = (Y) => oy + Math.round(Y / vox);
  const rail = (xa, za, xb, zb) => {
    const len = Math.hypot(xb - xa, zb - za);
    const nPost = Math.round(len / Math.round(2.5 / vox));
    for (let i = 0; i <= nPost; i++) {
      const t = i / nPost;
      railPost(M, flo(xa + (xb - xa) * t), flo(za + (zb - za) * t), oy, oy + Math.round(1.0 / vox) - 1, vox, 50 + i);
    }
    for (const [Y, drop] of [[0.84, 0.14], [0.44, 0.08]])
      for (let i = 0; i < nPost; i++) {
        const t0 = i / nPost;
        const t1 = (i + 1) / nPost;
        ropeRun(M, xa + (xb - xa) * t0, za + (zb - za) * t0, xa + (xb - xa) * t1, za + (zb - za) * t1, ropeY(Y), ropeY(Y), Math.round(drop / vox), 2, 5 + i);
      }
  };
  rail(3, 3, N - 4, 3);
  rail(3, N - 4, N - 4, N - 4);
  rail(N - 4, 3, N - 4, N - 4);
  for (const zf of [0.28, 0.72]) {
    const z = Math.round(zf * N);
    M.box(Math.round(N * 0.82), oy, z - 5, Math.round(N * 0.82) + 6, oy + 6, z + 5, (x, y, zz) => J(pickC([0x9a6b3d, 0xa87848], x >> 1, y >> 1, zz >> 2, 3), x, y, zz, 3, 0.07));
    M.box(Math.round(N * 0.82) - 1, oy + 6, z - 6, Math.round(N * 0.82) + 7, oy + 7, z + 6, 0x7a5632);
    for (const dz of [-4, 3]) M.box(Math.round(N * 0.82) + 1, oy, z + dz, Math.round(N * 0.82) + 4, oy - 0, z + dz + 1, 0x4a3420);
  }
  const bx0 = Math.round(N * 0.38);
  const bz0 = Math.round(N * 0.2);
  for (let y = 0; y < 8; y++) K.cyl(M, bx0, bz0, oy + y, oy + y + 1, 3.6 - y * 0.05, (x, yy, z) => (yy === oy + 1 || yy === oy + 5 ? J(0x4a4e58, x, yy, z, 17, 0.07) : J(0x6b4a2c, x, yy, z, 17, 0.07)));
  K.cyl(M, bx0, bz0, oy + 6, oy + 7, 2.8, 0x4fa8d8);
  M.line(bx0 - 3, oy + 8, bz0, bx0 + 3, oy + 8, bz0, 0x2c2f36, 1);
  const rkx = Math.round(N * 0.7);
  const rkz = Math.round(N * 0.88);
  M.box(rkx - 14, oy, rkz - 2, rkx - 12, oy + 22, rkz + 2, (x, y, z) => J(0x6a4a2c, x, y, z, 5, 0.08));
  M.box(rkx + 12, oy, rkz - 2, rkx + 14, oy + 22, rkz + 2, (x, y, z) => J(0x6a4a2c, x, y, z, 5, 0.08));
  M.box(rkx - 14, oy + 14, rkz - 1, rkx + 14, oy + 16, rkz + 1, 0x7a5632);
  M.box(rkx - 14, oy + 20, rkz - 1, rkx + 14, oy + 22, rkz + 1, 0x7a5632);
  for (let k = 0; k < 6; k++) {
    const x = rkx - 10 + k * 4;
    const lean = k % 2 ? 4 : -2;
    M.line(x, oy + 2, rkz - 6, x + lean * 0.3, oy + 22, rkz, (xx, y, zz) => J(k % 3 ? 0x8a6a3a : 0x6a8a4a, xx, y, zz, 3, 0.08), 1);
    M.line(x + lean * 0.3, oy + 23, rkz, x + lean * 0.3 + 3, oy + 20, rkz - 2, 0xd6c394, 1);
    M.set(x + lean * 0.3 + 3, oy + 19, rkz - 2, 0xd8302a);
    M.box(x - 1, oy + 12, rkz - 3, x + 1, oy + 14, rkz - 1, 0x2c2f36);
  }
  for (let k = 0; k < 3; k++) M.box(Math.round(N * 0.3) + k * 9, oy, Math.round(N * 0.7), Math.round(N * 0.3) + 7 + k * 9, oy + 7, Math.round(N * 0.7) + 7, (x, y, z) => J(pickC([0x9a6b3d, 0x8a5a30], x >> 2, y >> 2, z >> 2, 6), x, y, z, 6, 0.07));
  for (let a = 0; a < 60; a++) {
    const ang = a * 0.45;
    const r = 3 + a * 0.05;
    M.set(Math.round(N * 0.55 + Math.cos(ang) * r), oy + (a >> 4), Math.round(N * 0.45 + Math.sin(ang) * r), J(0xd6c394, a, 0, 0, 22, 0.06));
  }
  lampPost(M, 6, 6, oy, 77);
  lampPost(M, 6, N - 7, oy, 78);
  return bundle([[M, vox, N / 2, oy, N / 2]]);
}

/* ------------------------------------ shacks ------------------------------- */

function thatchRoof(M, x0, x1, zFront, zBack, yFront, yBack, over, seed, gable = true) {
  const dz = zBack - zFront;
  for (let z = Math.min(zFront, zBack) - over; z <= Math.max(zFront, zBack) + over; z++) {
    const t = (z - zFront) / dz;
    const yy = Math.round(lerp(yFront, yBack, t));
    for (let x = x0 - over; x < x1 + over; x++)
      for (let k = 0; k < 4; k++) {
        const frond = flo((x + z * 0.5) / 3) % 2;
        const low = k === 0;
        const c = low ? 0x6a5a28 : frond ? [0xb8a050, 0xc8b060, 0x9aa044][flo(hash3(x, z, k, seed) * 3)] : [0x9a8838, 0x8a9a3c, 0x7a7a30][flo(hash3(x, z, k, seed + 1) * 3)];
        if (k > 2 && hash3(x, z, 3, seed) > 0.5 && (x + z) % 3) continue;
        M.set(x, yy + k, z, J(c, x, z, k, seed, 0.1));
      }
    if (Math.abs(z - zFront) < 3 || Math.abs(z - zFront) % 4 === 0)
      for (let x = x0 - over; x < x1 + over; x++) {
        const len = 1 + flo(hash3(x, z, 4, seed) * 3);
        for (let k = 0; k < len; k++) M.set(x, yy - 1 - k + (z < zFront + 1 ? 0 : 0), z, J(0x8a7a30, x, z, k, seed, 0.12));
      }
  }
  M.box(x0 - over, Math.round(yFront) + 3, zFront + over - 1, x1 + over, Math.round(yFront) + 4, zFront + over, (x, y, z) => (x % 2 ? J(0x8a7a30, x, y, z, seed, 0.1) : null));
}

function plankWall(M, x0, x1, y0, y1, z0, z1, seed, face) {
  M.box(x0, y0, z0, x1, y1, z1, (x, y, z) => {
    const row = flo((y - y0) / 3);
    const along = face === 'x' ? z : x;
    let c = PLANK[(row + flo(hash3(row, flo(along / 9), 1, seed) * 3)) % 4];
    c = shade(c, 0.82);
    if ((y - y0) % 3 === 2) c = shade(c, 0.72);
    if (hash3(along, row, 3, seed) > 0.985) c = 0x2a2018;
    return J(c, x, y, z, seed, 0.07);
  });
}

function shackBig() {
  const seed = 51;
  const M = new VoxelModel(70, 46, 62);
  const W = 48;
  const D = 40;
  const x0 = 11;
  const z0 = 11;
  const x1 = x0 + W;
  const z1 = z0 + D;
  const wallH = 24;
  M.box(x0 - 2, 0, z0 - 2, x1 + 2, 2, z1 + 2, (x, y, z) => J(pickC([0x6a5a40, 0x7a6a4c, 0x5a4a34], x >> 2, y, z >> 2, 3), x, y, z, 3, 0.1));
  M.box(x0, 2, z0, x1, 3, z1, (x, y, z) => J(PLANK[flo(hash3(x >> 4, 0, z >> 0, 9) * 4)], x, y, z, 3, 0.07));
  plankWall(M, x0, x1, 3, 3 + wallH, z0, z0 + 2, seed, 'z');
  plankWall(M, x0, x0 + 2, 3, 3 + wallH, z0, z1, seed + 1, 'x');
  plankWall(M, x1 - 2, x1, 3, 3 + wallH, z0, z1, seed + 2, 'x');
  const doorX0 = x0 + 19;
  const doorX1 = doorX0 + 9;
  plankWall(M, x0, x1, 3, 3 + wallH, z1 - 2, z1, seed + 3, 'z');
  M.carve(doorX0, 3, z1 - 2, doorX1, 3 + 20, z1);
  M.box(doorX0, 3, z0 + 2, doorX1, 3 + 20, z1 - 2, (x, y, z) => null);
  M.box(doorX0 - 1, 3, z1 - 2, doorX0, 3 + 21, z1 + 1, 0x4a3420);
  M.box(doorX1, 3, z1 - 2, doorX1 + 1, 3 + 21, z1 + 1, 0x4a3420);
  M.box(doorX0 - 1, 3 + 20, z1 - 2, doorX1 + 1, 3 + 21, z1 + 1, 0x4a3420);
  M.box(doorX0 - 1, 3 + 21, z1 - 3, doorX1 + 1, 3 + 22, z1 + 2, 0xd8a830);
  for (let i = 0; i < 7; i++) M.set(doorX0 + 1 + i, 3 + 14, z0 + 3, 0x4a3420);
  M.box(x0 + 4, 3, z0 + 4, x0 + 16, 7, z0 + 10, (x, y, z) => J(pickC([0x7a5632, 0x8a6238], x >> 1, y, z >> 1, 7), x, y, z, 7, 0.08));
  M.box(x0 + 3, 7, z0 + 3, x0 + 17, 8, z0 + 11, 0x4a3420);
  for (const [cx, cz] of [[x0, z0], [x1 - 3, z0], [x0, z1 - 3], [x1 - 3, z1 - 3]]) {
    M.box(cx - (cx === x0 ? 1 : 0), 0, cz - (cz === z0 ? 1 : 0), cx + 3 + (cx === x0 ? 0 : 1), 3 + wallH + 2, cz + 3 + (cz === z0 ? 0 : 1), (x, y, z) => J(pickC([0x4f3220, 0x5e3d22], x, y >> 3, z, 4), x, y, z, 4, 0.08));
    for (let k = 0; k < 5; k++) M.box(cx - (cx === x0 ? 1 : 0), 6 + k, cz - (cz === z0 ? 1 : 0), cx + 3 + (cx === x0 ? 0 : 1), 7 + k, cz + 3 + (cz === z0 ? 0 : 1), (x, y, z) => J(ROPEC[(x + z) & 1], x, y, z, 5, 0.06));
  }
  const wx = x1 - 2;
  M.carve(wx, 12, z0 + 12, x1, 22, z0 + 24);
  M.box(wx, 12, z0 + 12, x1, 13, z0 + 24, 0x4a3420);
  M.box(wx, 21, z0 + 12, x1, 22, z0 + 24, 0x4a3420);
  M.box(wx, 12, z0 + 12, x1, 22, z0 + 13, 0x4a3420);
  M.box(wx, 12, z0 + 23, x1, 22, z0 + 24, 0x4a3420);
  M.box(wx, 13, z0 + 13, wx + 1, 21, z0 + 23, 0xffc860, 2);
  M.box(wx, 17, z0 + 13, wx + 1, 18, z0 + 23, 0x4a3420);
  M.box(wx, 13, z0 + 17, wx + 1, 21, z0 + 18, 0x4a3420);
  M.box(wx + 1, 11, z0 + 11, x1 + 2, 12, z0 + 25, 0x6a4a2c);
  M.box(x1 - 1, 12, z0 + 8, x1 + 1, 22, z0 + 11, (x, y, z) => J(0x6a4a2c, x, y, z, 8, 0.08));
  M.box(x1 - 1, 12, z0 + 25, x1 + 1, 22, z0 + 28, (x, y, z) => J(0x6a4a2c, x, y, z, 9, 0.08));
  const yb = 3 + wallH;
  thatchRoof(M, x0, x1, z1, z0, yb - 3, yb + 8, 5, seed, true);
  M.box(x0 - 5, yb + 8, z0 - 1, x1 + 5, yb + 11, z0 + 3, (x, y, z) => J(0xb8a050, x, y, z, 3, 0.1));
  for (let i = 0; i < 6; i++) {
    const x = x0 - 3 + i * 10;
    M.line(x, yb - 1, z1 + 4, x + 3, yb + 4, z1 - 4, J(0x6a5a28, 1, 1, 1, 3, 0.1), 2);
  }
  M.box(x0 + 2, yb - 2, z0 + 2, x1 - 2, yb - 1, z1 - 2, 0x3a2a1c);
  for (let i = 0; i < 12; i++) M.set(x0 - 3 + i * 5, yb + 3, z1 + 5, J(0x8a7a30, i, 0, 0, 3, 0.1));
  M.box(x0 + 22, 13, z1 + 1, x0 + 26, 18, z1 + 2, 0x2a1c12);
  const lx = doorX1 + 3;
  M.box(lx, yb - 7, z1 + 4, lx + 1, yb - 3, z1 + 5, 0x4a3420);
  M.box(lx - 3, yb - 4, z1 + 4, lx, yb - 3, z1 + 5, 0x4a3420);
  M.box(lx + 1, yb - 8, z1 + 3, lx + 4, yb - 4, z1 + 6, 0xffc860, true);
  M.box(lx, yb - 9, z1 + 3, lx + 5, yb - 8, z1 + 6, 0xc9a23a);
  M.box(lx, yb - 4, z1 + 3, lx + 5, yb - 3, z1 + 6, 0xc9a23a);
  for (let k = 0; k < 4; k++) M.set(lx + 2, yb - 3 + k, z1 + 4, IRONC);
  M.box(x0 + 4, 3, z1 + 3, x0 + 14, 11, z1 + 12, (x, y, z) => null);
  K.blob(M, x0 + 9, 6, z1 + 5, 5, 4, 3, (x, y, z) => J(0xf0d060, x, y, z, 3, 0.1), 3, 0.3);
  const barrelAt = (cx, cz, h) => {
    for (let y = 0; y < h; y++) {
      const r = 5.2 - Math.abs(y - h / 2) * 0.22;
      K.cyl(M, cx, cz, y + 0, y + 1, r, (x, yy, z) => (y === 2 || y === h - 3 ? J(0x3a3d44, x, yy, z, 6, 0.08) : J(flo((Math.atan2(z - cz, x - cx) + 3.3) * 3) % 2 ? 0x8a5a30 : 0x764a28, x, yy, z, 6, 0.07)));
    }
    K.cyl(M, cx, cz, h, h + 1, 4.4, 0x9a6b3d);
  };
  barrelAt(x1 + 6, z1 - 6, 14);
  barrelAt(x0 - 6, z1 - 3, 12);
  M.box(x0 - 9, 0, z1 - 12, x0 - 3, 8, z1 - 7, (x, y, z) => J(pickC([0x9a6b3d, 0xa87848], x >> 1, y >> 2, z >> 1, 3), x, y, z, 3, 0.08));
  return bundle([[M, 0.125, 35, 0, 31]]);
}

const IRONC = 0x2c2f36;

function shackSmall() {
  const seed = 52;
  const M = new VoxelModel(58, 40, 52);
  const x0 = 9;
  const z0 = 9;
  const W = 40;
  const D = 32;
  const x1 = x0 + W;
  const z1 = z0 + D;
  const h = 21;
  M.box(x0 - 2, 0, z0 - 2, x1 + 2, 2, z1 + 2, (x, y, z) => J(pickC([0x6a5a40, 0x7a6a4c, 0x5a4a34], x >> 2, y, z >> 2, 3), x, y, z, 3, 0.1));
  M.box(x0, 2, z0, x1, 3, z1, (x, y, z) => J(PLANK[flo(hash3(x >> 4, 0, z, 9) * 4)], x, y, z, 3, 0.07));
  plankWall(M, x0, x1, 3, 3 + h, z0, z0 + 2, seed, 'z');
  plankWall(M, x0, x0 + 2, 3, 3 + h - 4, z0, z1, seed + 1, 'x');
  plankWall(M, x1 - 2, x1, 3, 3 + h - 4, z0, z1, seed + 2, 'x');
  for (const [px, pz] of [[x0, z1 - 3], [x1 - 3, z1 - 3], [x0 + 20, z1 - 3]]) {
    M.box(px, 0, pz, px + 3, 3 + h - 3, pz + 3, (x, y, z) => J(pickC([0x4f3220, 0x5e3d22], x, y >> 3, z, 4), x, y, z, 4, 0.08));
    for (let k = 0; k < 4; k++) M.box(px, 5 + k, pz, px + 3, 6 + k, pz + 3, (x, y, z) => J(ROPEC[(x + z) & 1], x, y, z, 5, 0.06));
  }
  const yb = 3 + h;
  const roofLo = 3 + h - 7;
  thatchRoof(M, x0, x1, z1, z0, roofLo, yb + 3, 4, seed, false);
  M.box(x0 + 3, 3, z0 + 3, x0 + 16, 8, z0 + 8, (x, y, z) => J(0x7a5632, x, y, z, 7, 0.08));
  M.box(x0 + 2, 8, z0 + 2, x0 + 17, 9, z0 + 9, 0x4a3420);
  for (let k = 0; k < 3; k++) M.box(x0 + 20 + k * 6, 3, z0 + 4, x0 + 25 + k * 6, 3 + 5 + (k % 2) * 2, z0 + 9, (x, y, z) => J(0xa87848, x, y, z, 3, 0.08));
  M.box(x0 + 2, 3, z0 + 12, x0 + 4, 11, z0 + 14, 0x6a4a2c);
  M.box(x0 + 2, 11, z0 + 12, x0 + 16, 12, z0 + 14, 0x6a4a2c);
  for (let k = 0; k < 4; k++) M.box(x0 + 3 + k * 3, 8, z0 + 16, x0 + 5 + k * 3, 12, z0 + 17, 0xc8b878);
  const bx = x1 + 5;
  const bz = z1 - 5;
  for (let y = 0; y < 17; y++) {
    const r = 5.8 - Math.abs(y - 8) * 0.22;
    K.cyl(M, bx, bz, y, y + 1, r, (x, yy, z) => (y === 2 || y === 14 ? J(0x3a3d44, x, yy, z, 6, 0.08) : y === 8 ? J(0xb02a2a, x, yy, z, 6, 0.08) : J(flo((Math.atan2(z - bz, x - bx) + 3.3) * 3) % 2 ? 0x8a5a30 : 0x764a28, x, yy, z, 6, 0.07)));
  }
  K.cyl(M, bx, bz, 17, 18, 5, 0x9a6b3d);
  M.box(bx - 1, 18, bz - 1, bx + 1, 22, bz + 1, 0x4a3420);
  M.box(bx + 1, 19, bz - 1, bx + 3, 21, bz + 1, 0xd8a830);
  const lx = x0 + 10;
  M.box(lx, yb - 7, z1 + 1, lx + 1, yb - 2, z1 + 2, 0x4a3420);
  M.box(lx + 1, yb - 12, z1, lx + 4, yb - 7, z1 + 3, 0xffc860, true);
  M.box(lx, yb - 13, z1 - 1, lx + 5, yb - 12, z1 + 4, 0xc9a23a);
  M.box(lx, yb - 7, z1 - 1, lx + 5, yb - 6, z1 + 4, 0xc9a23a);
  for (let k = 0; k < 4; k++) M.set(lx + 2, yb - 6 + k, z1 + 1, IRONC);
  K.blob(M, x1 - 4, 6, z0 + 10, 4, 3, 5, (x, y, z) => J(0x6a6a74, x, y, z, 3, 0.1), 3, 0.4);
  M.box(x0 + 22, 14, z0 + 2, x0 + 30, 22, z0 + 3, 0x2a1c12);
  M.box(x0 + 23, 15, z0 + 1, x0 + 29, 16, z0 + 2, 0x4a3420);
  M.box(x0 + 25, 15, z0 + 2, x0 + 27, 21, z0 + 3, 0xffc860, 2);
  return bundle([[M, 0.125, 29, 0, 26]]);
}

export function buildShacks() {
  return [shackBig(), shackSmall()];
}

export function buildShips(kit) {
  K = kit;
  bundle = kit.bundle;
  const L = kit.setLod;
  return {
    shipBlack: L('shipBlack', () => galleon(cfgBlack())),
    shipBrown: L('shipBrown', () => galleon(cfgBrown())),
    shipWreck: L('shipWreck', wreck),
    pierSegment: L('pierSegment', buildPierSegment),
    pierEnd: L('pierEnd', buildPierEnd),
    pierPlatform: L('pierPlatform', buildPierPlatform),
    shack: L('shack', buildShacks),
  };
}
