import { VoxelModel, hash3, mix, shade } from '../engine/voxel.js';
import { J } from './models.js';

/**
 * Props for the two jungle tribe villages of the Northern Jungle: round mud huts,
 * huts raised on stilts, the chief's longhouse, carved totem poles, fire pits,
 * drying racks, palisade stakes, the village gate, pots and baskets, a log drum
 * and a dugout canoe. Built from the same voxel kit as the jungle props.
 */

let K = null;
const flo = Math.floor;
const TAU = Math.PI * 2;

const MUD = [0xa0784a, 0x8f6a40, 0xb08a58, 0x987046];
const MUD_DARK = [0x6e5034, 0x5e4430, 0x7a5a3a];
const THATCH = [0xc4a95a, 0xb89c4c, 0xd2b866, 0xa88c42, 0xbfa456];
const THATCH_DARK = [0x8a7434, 0x7a662c, 0x96803a];
const POLE = [0x6b4a2c, 0x5e4026, 0x7a5634, 0x543a22];
const BAMBOO = [0xc8b462, 0xb8a452, 0xd4c070, 0xa89848];
const STONE = [0x7a7a72, 0x8a8a80, 0x6a6a62, 0x94948a];
const OCHRE = 0xc8642a;
const RED = 0xa8281e;
const CHALK = 0xeee4cc;
const SOOT = 0x22201c;
const TEAL = 0x1f8a7a;
const GOLD = 0xe0a83a;
const FEATHER = [0xd8302c, 0x2a7ad8, 0xf2c23a, 0x2aa85a, 0xf2f2ea];

const pick = (arr, x, y, z, s) => arr[flo(hash3(x, y, z, s) * arr.length) % arr.length];
const tone = (arr, x, y, z, s, a = 0.08) => J(pick(arr, x, y, z, s), x, y, z, s, a);

/** Painted zig-zag band used on hut walls and the longhouse. u runs around or along the wall. */
function zigzag(u, v, period = 8) {
  const p = ((u % period) + period) % period;
  const tri = p < period / 2 ? p : period - p;
  return Math.abs(v - tri * (3 / (period / 2))) < 0.8;
}

/** A conical thatch roof from radius r0 at y0 to a point at y1, with layered courses and a ragged eave. */
function coneThatch(M, cx, cz, y0, y1, r0, seed) {
  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const r = r0 * (1 - t) + 0.6;
    const rIn = Math.max(0, r - 2.6);
    const R = Math.ceil(r) + 1;
    const course = (y - y0) % 4 === 0;
    for (let z = flo(cz - R); z <= Math.ceil(cz + R); z++)
      for (let x = flo(cx - R); x <= Math.ceil(cx + R); x++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d > r || d < rIn) continue;
        const outer = d > r - 1.2;
        const c = course && outer ? pick(THATCH_DARK, x, y, z, seed) : pick(THATCH, x >> 1, y, z >> 1, seed + 1);
        M.set(x, y, z, J(c, x, y, z, seed, 0.1));
      }
  }
  // Ragged eave: straw strands hanging below the bottom course.
  const n = flo(r0 * 6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = flo(cx + Math.cos(a) * (r0 + 0.2));
    const z = flo(cz + Math.sin(a) * (r0 + 0.2));
    const len = 1 + flo(hash3(i, 0, 0, seed) * 3);
    for (let k = 1; k <= len; k++) M.set(x, y0 - k, z, J(pick(THATCH_DARK, i, k, 0, seed), x, y0 - k, z, seed, 0.1));
  }
}

/** Topknot on a roof peak: a short pole with a bundle of bright feathers. */
function topknot(M, cx, cz, y, seed) {
  // Thick enough to survive the coarse level of detail, and starting inside the thatch.
  M.box(flo(cx) - 2, y - 4, flo(cz) - 2, flo(cx) + 2, y + 4, flo(cz) + 2, (x, yy, z) => (yy === y + 1 ? J(RED, x, yy, z, seed) : tone(POLE, x, yy, z, seed)));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + seed;
    const col = FEATHER[i % FEATHER.length];
    for (let k = 0; k < 5; k++) {
      const x = flo(cx + Math.cos(a) * (1 + k * 0.7));
      const z = flo(cz + Math.sin(a) * (1 + k * 0.7));
      M.box(x, y + 3 + flo(k * 0.6), z, x + 2, y + 5 + flo(k * 0.6), z + 2, J(col, x, k, z, seed, 0.06));
    }
  }
}

/** A round wattle-and-daub hut with a painted band, a doorway on +z and a cone of thatch. */
function roundHut(seed, stilt) {
  const lift = stilt ? 14 : 0;
  const M = new VoxelModel(68, 62 + lift, 68);
  const c = 34;
  const rWall = 19;
  const wallTop = lift + 20;
  if (stilt) {
    // Deck on six poles, with a ladder up to the door.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      const px = c + Math.cos(a) * 18;
      const pz = c + Math.sin(a) * 18;
      K.cyl(M, px, pz, 0, lift + 1, 1.7, (x, y, z) => tone(POLE, x, y >> 2, z, seed));
      for (let k = 0; k < 3; k++) K.cyl(M, px, pz, 3 + k, 4 + k, 2.1, J(0xd6c394, k, 0, 0, seed, 0.1));
    }
    K.cyl(M, c, c, lift - 1, lift + 1, 24, (x, y, z) => J(((x + z) & 3) === 0 ? 0x4e3620 : pick(POLE, x >> 2, y, z, seed + 3), x, y, z, seed, 0.06));
    // Rail posts around the deck edge.
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.35) continue;
      const x = flo(c + Math.cos(a) * 23);
      const z = flo(c + Math.sin(a) * 23);
      M.box(x, lift + 1, z, x + 1, lift + 6, z + 1, tone(BAMBOO, x, 0, z, seed));
    }
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.35) continue;
      M.set(flo(c + Math.cos(a) * 23), lift + 6, flo(c + Math.sin(a) * 23), tone(BAMBOO, i, 1, 0, seed));
    }
    // Ladder down the front.
    for (let y = 0; y < lift; y++) {
      const z = c + 24 + flo((lift - y) * 0.5);
      M.set(c - 4, y, z, tone(POLE, 0, y, z, seed));
      M.set(c + 3, y, z, tone(POLE, 1, y, z, seed));
      if (y % 3 === 0) M.box(c - 4, y, z, c + 4, y + 1, z + 1, tone(BAMBOO, 2, y, z, seed));
    }
  } else {
    // Packed-earth plinth with a stone kerb.
    K.cyl(M, c, c, 0, 2, 22, (x, y, z) => {
      const d = Math.hypot(x + 0.5 - c, z + 0.5 - c);
      return d > 20.5 ? tone(STONE, x >> 1, y, z >> 1, seed) : tone(MUD_DARK, x >> 1, y, z >> 1, seed);
    });
  }
  const y0 = stilt ? lift + 1 : 2;
  // Wall shell.
  for (let y = y0; y < wallTop; y++)
    for (let z = c - rWall - 1; z <= c + rWall + 1; z++)
      for (let x = c - rWall - 1; x <= c + rWall + 1; x++) {
        const d = Math.hypot(x + 0.5 - c, z + 0.5 - c);
        if (d > rWall || d < rWall - 2) continue;
        const ang = Math.atan2(z + 0.5 - c, x + 0.5 - c);
        const u = (ang + Math.PI) * rWall;
        const post = flo(u) % 9 === 0;
        const v = y - y0;
        let col;
        if (post) col = tone(POLE, x, y >> 2, z, seed);
        else if (v >= 9 && v <= 13) {
          col = zigzag(u, v - 9, 8) ? J(CHALK, x, y, z, seed, 0.05) : v === 9 || v === 13 ? J(SOOT, x, y, z, seed, 0.05) : J(OCHRE, x, y, z, seed, 0.07);
        } else if (v < 2) col = tone(MUD_DARK, x, y, z, seed);
        else {
          col = tone(MUD, x >> 1, y >> 1, z >> 1, seed);
          if (hash3(x, y, z, seed + 9) > 0.93) col = shade(col, 0.82);
        }
        M.set(x, y, z, col);
      }
  // Dark floor inside so the doorway reads as shadow.
  K.cyl(M, c, c, y0, y0 + 1, rWall - 2, 0x2e2218);
  // Doorway facing +z with a carved frame and a bead curtain.
  M.carve(c - 4, y0, c + rWall - 3, c + 4, y0 + 14, c + rWall + 2);
  for (const dx of [-5, 4]) M.box(c + dx, y0, c + rWall - 2, c + dx + 1, y0 + 15, c + rWall + 1, (x, y, z) => (y % 4 === 1 ? J(OCHRE, x, y, z, seed) : tone(POLE, x, y, z, seed)));
  M.box(c - 5, y0 + 14, c + rWall - 2, c + 5, y0 + 16, c + rWall + 1, (x, y, z) => (x % 3 === 0 ? J(RED, x, y, z, seed) : tone(POLE, x, y, z, seed)));
  for (let x = c - 3; x < c + 4; x += 2)
    for (let y = y0 + 6; y < y0 + 14; y++) M.set(x, y, c + rWall - 1, FEATHER[(x + y) % 5]);
  // Roof.
  const roofTop = wallTop + 24;
  coneThatch(M, c, c, wallTop - 2, roofTop, 27, seed);
  topknot(M, c, c, roofTop, seed);
  // A woven mat and a clay pot by the door (ground huts only).
  if (!stilt) {
    M.box(c - 8, 2, c + rWall + 2, c - 4, 3, c + rWall + 6, (x, y, z) => ((x + z) & 1 ? J(0xc8b070, x, y, z, seed) : J(0xa88c50, x, y, z, seed)));
    K.blob(M, c + 9, 5, c + rWall + 3, 2.8, 3.2, 2.8, (x, y, z) => (y > 7 ? J(0x7a4428, x, y, z, seed) : J(0xb0623a, x, y, z, seed, 0.1)), seed, 0.1);
  }
  return K.bundle([[M, 0.125, c, 0, c]]);
}

/** The chief's longhouse: long thatched A-frame, carved and painted porch posts, crossed horns on the gables. */
function longhouse(seed) {
  const M = new VoxelModel(100, 60, 64);
  const x0 = 14;
  const x1 = 86;
  const z0 = 14;
  const z1 = 46;
  const wallH = 16;
  M.box(x0 - 3, 0, z0 - 3, x1 + 3, 3, z1 + 9, (x, y, z) => (z > z1 + 1 ? tone(STONE, x >> 1, y, z >> 1, seed) : tone(MUD_DARK, x >> 1, y, z >> 1, seed)));
  // Walls: daub between posts, with a long painted frieze.
  M.box(x0, 3, z0, x1, 3 + wallH, z1, (x, y, z) => {
    const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
    if (!edge) return null;
    const along = z === z0 || z === z1 - 1 ? x : z;
    const v = y - 3;
    if (along % 10 === 0) return tone(POLE, x, y >> 2, z, seed);
    if (v >= 8 && v <= 11) return zigzag(along, v - 8, 10) ? J(CHALK, x, y, z, seed) : v === 8 || v === 11 ? J(SOOT, x, y, z, seed) : J(RED, x, y, z, seed, 0.06);
    return tone(MUD, x >> 1, y >> 1, z >> 1, seed);
  });
  M.box(x0 + 1, 3, z0 + 1, x1 - 1, 4, z1 - 1, 0x2e2218);
  // Wide doorway on the front (+z) and two small windows.
  M.carve(46, 3, z1 - 2, 54, 15, z1 + 1);
  for (const wx of [26, 70]) M.carve(wx, 10, z1 - 2, wx + 4, 13, z1 + 1);
  // Porch: carved posts and a lean-to roof.
  for (let i = 0; i < 6; i++) {
    const px = x0 + 2 + i * 14;
    M.box(px, 3, z1 + 6, px + 2, 3 + wallH + 2, z1 + 8, (x, y, z) => {
      const band = flo((y - 3) / 4);
      return band % 2 ? J([OCHRE, TEAL, RED][(band >> 1) % 3], x, y, z, seed, 0.06) : tone(POLE, x, y, z, seed);
    });
  }
  // Main A-frame thatch.
  const ridgeY = 3 + wallH + 22;
  for (let z = z0 - 5; z <= z1 + 9; z++) {
    const mid = (z0 + z1) / 2;
    const half = (z1 - z0) / 2 + 7;
    const dz = Math.abs(z + 0.5 - mid);
    const yRoof = flo(ridgeY - (dz / half) * 24);
    for (let x = x0 - 5; x < x1 + 5; x++)
      for (let k = 0; k < 3; k++) {
        const course = (yRoof - k) % 4 === 0;
        M.set(x, yRoof - k, z, J(course && k === 0 ? pick(THATCH_DARK, x, z, k, seed) : pick(THATCH, x >> 1, z, k, seed), x, z, k, seed, 0.1));
      }
    if (z === z0 - 5 || z === z1 + 9)
      for (let x = x0 - 5; x < x1 + 5; x++) {
        const len = 1 + flo(hash3(x, z, 0, seed) * 3);
        for (let k = 1; k <= len; k++) M.set(x, yRoof - 2 - k, z, J(pick(THATCH_DARK, x, k, z, seed), x, k, z, seed));
      }
  }
  // Fill the gable ends.
  for (let z = z0; z < z1; z++) {
    const mid = (z0 + z1) / 2;
    const half = (z1 - z0) / 2 + 7;
    const top = flo(ridgeY - (Math.abs(z + 0.5 - mid) / half) * 24) - 2;
    for (let y = 3 + wallH; y < top; y++)
      for (const x of [x0, x1 - 1]) M.set(x, y, z, (y + z) % 5 === 0 ? J(OCHRE, x, y, z, seed) : tone(BAMBOO, x, y, z, seed));
  }
  // Ridge pole and crossed horns at each gable.
  M.box(x0 - 6, ridgeY + 1, 29, x1 + 6, ridgeY + 3, 31, (x, y, z) => tone(POLE, x, y, z, seed));
  for (const gx of [x0 - 6, x1 + 5]) {
    for (let k = 0; k < 9; k++) {
      M.set(gx, ridgeY + 2 + k, 30 - flo(k * 0.7), J(CHALK, k, 0, 0, seed));
      M.set(gx, ridgeY + 2 + k, 31 + flo(k * 0.7), J(CHALK, k, 1, 0, seed));
    }
    topknot(M, gx + 0.5, 30.5, ridgeY + 3, seed + gx);
  }
  // Painted shields hung beside the door.
  for (const sx of [40, 58]) {
    for (let y = 7; y < 15; y++)
      for (let x = sx - 3; x < sx + 3; x++) {
        const d = Math.hypot(x + 0.5 - sx, (y + 0.5 - 11) * 0.75);
        if (d > 3.2) continue;
        M.set(x, y, z1, d < 1.2 ? J(GOLD, x, y, 0, seed) : (x + y) % 3 === 0 ? J(SOOT, x, y, 0, seed) : J(sx < 50 ? RED : TEAL, x, y, 0, seed));
      }
  }
  return K.bundle([[M, 0.125, 50, 0, 30]]);
}

/** A carved totem: stacked faces painted in ochre, teal, red and chalk, spread wings at the top. */
function totem(seed) {
  const M = new VoxelModel(44, 100, 22);
  const c = 22;
  const cz = 11;
  const r = 6;
  const faces = [[2, 22, 0], [24, 22, 1], [46, 22, 2], [68, 18, 3]];
  for (const [y0, hgt, kind] of faces) {
    const base = [TEAL, OCHRE, RED, 0x3a6a8a][(kind + seed) % 4];
    for (let y = y0; y < y0 + hgt; y++)
      for (let z = cz - r; z <= cz + r; z++)
        for (let x = c - r; x <= c + r; x++) {
          const d = Math.hypot(x + 0.5 - c, z + 0.5 - cz);
          if (d > r) continue;
          const v = y - y0;
          const front = z >= cz + r - 2;
          let col = J(mix(0x7a5634, base, 0.55), x, y, z, seed, 0.05);
          if (v === 0 || v === hgt - 1) col = J(SOOT, x, y, z, seed);
          if (front) {
            const fx = x - c;
            const eye = v >= hgt - 8 && v <= hgt - 5 && (Math.abs(fx + 3) <= 1 || Math.abs(fx - 3) <= 1);
            const pupil = eye && v === hgt - 7 && (fx === -3 || fx === 3);
            const brow = v === hgt - 4 && Math.abs(fx) <= 5;
            const mouth = v >= 3 && v <= 6 && Math.abs(fx) <= 4;
            const teeth = mouth && (v === 6 || v === 3) && fx % 2 === 0;
            const nose = v >= 8 && v <= hgt - 9 && Math.abs(fx) <= 1;
            if (pupil) col = SOOT;
            else if (eye) col = CHALK;
            else if (brow) col = J(SOOT, x, y, z, seed);
            else if (teeth) col = CHALK;
            else if (mouth) col = kind === 2 ? SOOT : RED;
            else if (nose) col = J(shade(base, 0.8), x, y, z, seed);
          }
          M.set(x, y, z, col);
        }
    // Protruding nose and cheeks, carved out from the pole.
    M.box(c - 1, y0 + 8, cz + r, c + 1, y0 + hgt - 9, cz + r + 2, J(shade(base, 0.85), 0, y0, 0, seed));
    if (kind === 1) M.box(c - 5, y0 + 2, cz + r - 1, c + 5, y0 + 3, cz + r + 3, J(CHALK, 1, y0, 0, seed));
  }
  // Wings across the top.
  for (const s of [-1, 1])
    for (let i = 0; i < 18; i++) {
      const y0 = 78 + flo(i * 0.45);
      const len = 9 - flo(i * 0.4);
      for (let k = 0; k < len; k++) {
        const x = c + s * (r + i);
        const col = k === 0 ? SOOT : [RED, OCHRE, CHALK, TEAL][(flo(i / 3) + seed) % 4];
        M.set(x, y0 - k, cz, J(col, x, k, 0, seed, 0.05));
        M.set(x, y0 - k, cz + 1, J(col, x, k, 1, seed, 0.05));
      }
    }
  // Beak on top.
  M.box(c - 3, 86, cz - 3, c + 3, 94, cz + 4, (x, y, z) => J(y > 90 ? GOLD : TEAL, x, y, z, seed));
  M.box(c - 1, 87, cz + 4, c + 1, 90, cz + 9, J(GOLD, 0, 0, 0, seed));
  M.set(c - 2, 92, cz + 4, SOOT);
  M.set(c + 1, 92, cz + 4, SOOT);
  return K.bundle([[M, 0.0625, c, 0, cz]]);
}

/** Stone-ringed fire pit with crossed logs, glowing embers, flames and a cooking pot on a tripod. */
function firePit(seed) {
  const M = new VoxelModel(44, 44, 44);
  const c = 22;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    K.blob(M, c + Math.cos(a) * 11, 2, c + Math.sin(a) * 11, 3, 2.4, 3, (x, y, z) => tone(STONE, x, y, z, seed + i), seed + i, 0.3);
  }
  K.cyl(M, c, c, 0, 1, 9, 0x2a2420);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI + 0.4;
    M.line(c - Math.cos(a) * 8, 2, c - Math.sin(a) * 8, c + Math.cos(a) * 8, 4, c + Math.sin(a) * 8, (x, y, z) => tone(MUD_DARK, x, y, z, seed), 2);
  }
  K.cyl(M, c, c, 1, 3, 6, (x, y, z) => (hash3(x, y, z, seed) > 0.5 ? 0xff6a14 : 0xc83a10), true);
  for (let i = 0; i < 26; i++) {
    const a = hash3(i, 1, 0, seed) * TAU;
    const rr = hash3(i, 2, 0, seed) * 4;
    const h = 4 + flo(hash3(i, 3, 0, seed) * 9);
    const x = flo(c + Math.cos(a) * rr);
    const z = flo(c + Math.sin(a) * rr);
    for (let y = 3; y < 3 + h; y++) M.set(x, y, z, y > 3 + h * 0.6 ? 0xffd44a : y > 3 + h * 0.3 ? 0xffa022 : 0xff6a14, true);
  }
  // Tripod and pot.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    M.line(c + Math.cos(a) * 13, 0, c + Math.sin(a) * 13, c, 30, c, (x, y, z) => tone(POLE, x, y, z, seed), 2);
  }
  for (let y = 21; y < 30; y++) M.set(c, y, c, 0x2c2f36);
  K.blob(M, c, 18, c, 4.2, 3.6, 4.2, (x, y, z) => (y > 20 ? 0x3a3d44 : 0x2c2f36), seed, 0.1);
  return K.bundle([[M, 0.0625, c, 0, c]]);
}

/** A drying rack: two A-frames and a cross pole hung with hides, fish and herb bundles. */
function dryingRack(seed) {
  const M = new VoxelModel(70, 44, 26);
  const cz = 13;
  for (const fx of [6, 62]) {
    M.line(fx - 5, 0, cz, fx, 36, cz, (x, y, z) => tone(POLE, x, y, z, seed), 2);
    M.line(fx + 5, 0, cz, fx, 36, cz, (x, y, z) => tone(POLE, x, y, z, seed), 2);
  }
  M.box(4, 35, cz - 1, 66, 37, cz + 1, (x, y, z) => tone(BAMBOO, x, y, z, seed));
  for (let i = 0; i < 9; i++) {
    const x0 = 10 + i * 6;
    const kind = (i + seed) % 3;
    for (let y = 26; y < 35; y++) M.set(x0 + 1, y, cz, 0xd6c394);
    if (kind === 0) {
      M.box(x0 - 1, 12, cz, x0 + 4, 27, cz + 1, (x, y, z) => J(hash3(x, y, 0, seed) > 0.85 ? 0x6a4a2c : 0xc8a070, x, y, z, seed, 0.08));
    } else if (kind === 1) {
      for (let y = 16; y < 27; y++) {
        const w = y < 19 ? 1 : y > 24 ? 1 : 2;
        M.box(x0 + 1 - w, y, cz, x0 + 2 + w, y + 1, cz + 1, y < 18 ? 0x8a9aa8 : J(0xb8c4cc, x0, y, 0, seed, 0.06));
      }
      M.set(x0 + 1, 24, cz + 1, SOOT);
    } else {
      K.blob(M, x0 + 1.5, 21, cz + 0.5, 2.2, 5, 1.6, (x, y, z) => J([0x4a8a36, 0x5ba03e, 0x6aa650][(x + y) % 3], x, y, z, seed), seed, 0.4);
    }
  }
  return K.bundle([[M, 0.0625, 35, 0, cz]]);
}

/** A run of sharpened bamboo and log stakes lashed to two rails. Laid tangent to the village ring. */
function palisade(seed) {
  const M = new VoxelModel(36, 28, 8);
  for (let i = 0; i < 12; i++) {
    const x = 1 + i * 3;
    const h = 19 + flo(hash3(i, 0, 0, seed) * 5);
    const log = i % 3 === 1;
    M.box(x, 0, 2, x + 2, h, 5, (xx, y, z) => (log ? tone(POLE, xx, y >> 2, z, seed) : tone(BAMBOO, xx, y >> 2, z, seed)));
    M.box(x, h, 3, x + 2, h + 2, 4, log ? tone(POLE, x, h, 0, seed) : J(0xe0d090, x, h, 0, seed));
    M.set(x + (i & 1), h + 2, 3, J(0xe0d090, x, h, 1, seed));
  }
  for (const y of [5, 14]) M.box(0, y, 5, 36, y + 1, 6, (x, yy, z) => (x % 3 === 0 ? J(0xd6c394, x, yy, z, seed) : tone(POLE, x, yy, z, seed)));
  return K.bundle([[M, 0.125, 18, 0, 4]]);
}

/** The village gate: two carved posts with a crossbeam, an animal skull and hanging feather charms. */
function gate(seed) {
  const M = new VoxelModel(52, 42, 10);
  for (const px of [4, 44]) {
    M.box(px, 0, 3, px + 4, 34, 7, (x, y, z) => {
      const band = flo(y / 5);
      return band % 2 ? J([OCHRE, RED, TEAL][band % 3], x, y, z, seed, 0.06) : tone(POLE, x, y, z, seed);
    });
    M.box(px - 1, 34, 2, px + 5, 36, 8, (x, y, z) => tone(THATCH_DARK, x, y, z, seed));
    M.box(px + 1, 36, 4, px + 3, 39, 6, J(FEATHER[px % 5], px, 0, 0, seed));
  }
  M.box(0, 30, 2, 52, 33, 8, (x, y, z) => tone(POLE, x, y, z, seed));
  M.box(2, 33, 3, 50, 34, 7, (x, y, z) => (x % 4 === 0 ? J(OCHRE, x, y, z, seed) : tone(THATCH, x, y, z, seed)));
  // Skull at the centre of the beam.
  M.box(22, 24, 6, 30, 31, 9, (x, y, z) => J(0xe8e0c8, x, y, z, seed, 0.05));
  for (const ex of [23, 27]) M.box(ex, 27, 8, ex + 2, 29, 9, SOOT);
  M.box(25, 25, 8, 27, 26, 9, SOOT);
  for (const s of [-1, 1]) M.line(26 + s * 4, 30, 7, 26 + s * 10, 37, 7, J(0xe8e0c8, s, 0, 0, seed), 2);
  // Feather charms on cords.
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 6 + (i > 2 ? 6 : 0);
    const len = 6 + (i % 3) * 2;
    for (let k = 0; k < len; k++) M.set(x, 29 - k, 5, 0xd6c394);
    for (let k = 0; k < 4; k++) M.set(x, 29 - len - k, 5, FEATHER[(i + seed) % 5]);
  }
  return K.bundle([[M, 0.125, 26, 0, 5]]);
}

/** Clay pots and woven baskets, gathered in a cluster by a doorway. */
function potsBaskets(seed) {
  const M = new VoxelModel(40, 22, 40);
  const items = [[12, 12, 0], [24, 10, 1], [30, 22, 0], [16, 26, 2], [24, 30, 1]];
  for (const [x, z, kind] of items) {
    if (kind === 0) {
      K.blob(M, x, 6, z, 4.4, 6, 4.4, (xx, y, zz) => (y > 9 ? J(0x7a4428, xx, y, zz, seed) : y === 6 ? J(CHALK, xx, y, zz, seed) : J(0xb0623a, xx, y, zz, seed, 0.1)), seed + x, 0.1);
      K.cyl(M, x, z, 11, 13, 2.4, J(0x8a4a2a, x, 0, z, seed));
    } else if (kind === 1) {
      for (let y = 0; y < 8; y++) K.cyl(M, x, z, y, y + 1, 4 + y * 0.15, (xx, yy, zz) => J((xx + zz + yy) & 1 ? 0xc8b070 : 0xa88c50, xx, yy, zz, seed, 0.06));
      for (let y = 1; y < 8; y++)
        for (let zz = z - 3; zz <= z + 3; zz++)
          for (let xx = x - 3; xx <= x + 3; xx++) if (Math.hypot(xx + 0.5 - x, zz + 0.5 - z) < 3) M.clear(xx, y, zz);
      for (let k = 0; k < 6; k++) M.set(x - 2 + (k % 3), 7, z - 1 + (k >> 1), [0xffd23f, 0xe85a2a, 0x7ad44a][k % 3]);
    } else {
      for (let y = 0; y < 12; y++) K.cyl(M, x, z, y, y + 1, 3.4 - Math.abs(y - 6) * 0.18, (xx, yy, zz) => (yy === 3 || yy === 9 ? J(RED, xx, yy, zz, seed) : J(0x9a5a34, xx, yy, zz, seed, 0.08)));
    }
  }
  return K.bundle([[M, 0.0625, 20, 0, 20]]);
}

/** A hollow log drum with a hide head and two beaters. */
function drum(seed) {
  const M = new VoxelModel(30, 26, 30);
  const c = 15;
  for (let y = 0; y < 18; y++) {
    const r = 8 - Math.abs(y - 9) * 0.12;
    K.cyl(M, c, c, y, y + 1, r, (x, yy, z) => (yy === 4 || yy === 14 ? J(OCHRE, x, yy, z, seed) : yy % 5 === 0 ? J(0xd6c394, x, yy, z, seed) : tone(POLE, x, yy >> 2, z, seed)));
  }
  K.cyl(M, c, c, 18, 19, 8.4, (x, y, z) => J(0xd8c4a0, x, y, z, seed, 0.06));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    M.line(c + Math.cos(a) * 8, 18, c + Math.sin(a) * 8, c + Math.cos(a + 0.2) * 8.4, 6, c + Math.sin(a + 0.2) * 8.4, 0xd6c394);
  }
  M.line(c + 2, 19, c - 4, c + 9, 22, c - 9, (x, y, z) => tone(POLE, x, y, z, seed), 2);
  M.line(c - 3, 19, c + 2, c - 10, 21, c + 8, (x, y, z) => tone(POLE, x, y, z, seed), 2);
  return K.bundle([[M, 0.0625, c, 0, c]]);
}

/** A dugout canoe with a paddle across the thwart, pulled up on a bank. */
function canoe(seed) {
  const M = new VoxelModel(22, 14, 84);
  const cx = 11;
  for (let z = 2; z < 82; z++) {
    const t = (z - 42) / 40;
    const w = 8 * Math.sqrt(Math.max(0, 1 - t * t));
    const lift = flo(t * t * 5);
    for (let y = 0; y < 8; y++)
      for (let x = flo(cx - w); x <= Math.ceil(cx + w); x++) {
        const dx = (x + 0.5 - cx) / Math.max(1, w);
        const dy = (y + 0.5) / 8;
        if (dx * dx + (1 - dy) * (1 - dy) > 1.05) continue;
        const inner = Math.abs(dx) < 0.74 && y > 2 && Math.abs(t) < 0.86;
        if (inner) continue;
        M.set(x, y + lift, z, y === 7 || Math.abs(dx) > 0.9 ? J(0x5e3d22, x, y, z, seed) : tone(POLE, x, y, z >> 3, seed));
      }
  }
  M.box(cx - 6, 5, 40, cx + 7, 6, 43, (x, y, z) => tone(BAMBOO, x, y, z, seed));
  M.line(cx - 6, 7, 30, cx + 5, 7, 62, (x, y, z) => tone(POLE, x, y, z, seed), 1);
  M.box(cx + 3, 6, 60, cx + 8, 8, 68, (x, y, z) => J(OCHRE, x, y, z, seed));
  return K.bundle([[M, 0.0625, cx, 0, 42]]);
}

/** A split log bench on two stubby legs, worn smooth on top. */
function logBench(seed) {
  const M = new VoxelModel(46, 12, 14);
  for (let x = 2; x < 44; x++)
    for (let y = 4; y < 10; y++)
      for (let z = 3; z < 11; z++) {
        const d = Math.hypot(y + 0.5 - 6, z + 0.5 - 7);
        if (d > 3.6 || y > 8) continue;
        const end = x < 3 || x > 42;
        M.set(x, y, z, end ? J(0xc89a62, x, y, z, seed) : y === 8 ? J(0x9a6c3f, x, y, z, seed, 0.05) : tone(POLE, x >> 2, y, z, seed));
      }
  for (const lx of [8, 34]) M.box(lx, 0, 4, lx + 4, 5, 10, (x, y, z) => tone(POLE, x, y, z, seed));
  return K.bundle([[M, 0.0625, 23, 0, 7]]);
}

/** Split firewood stacked between two posts, with an axe left in the chopping block. */
function woodpile(seed) {
  const M = new VoxelModel(44, 30, 20);
  for (const px of [2, 40]) M.box(px, 0, 8, px + 2, 26, 10, (x, y, z) => tone(POLE, x, y, z, seed));
  for (let row = 0; row < 5; row++)
    for (let i = 0; i < 9; i++) {
      const cx = 6 + i * 4 + (row % 2) * 2;
      const cy = 3 + row * 4;
      for (let z = 4; z < 16; z++)
        for (let y = cy - 2; y <= cy + 1; y++)
          for (let x = cx - 2; x <= cx + 1; x++) {
            if (x > 39 || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 2.1) continue;
            const face = z === 15;
            M.set(x, y, z, face ? J(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 1 ? 0xb88a52 : 0xd8b070, x, y, z, seed) : tone(POLE, x, y, z, seed + row));
          }
    }
  M.box(2, 24, 6, 42, 26, 14, (x, y, z) => tone(THATCH, x, y, z, seed));
  K.cyl(M, 40, 2, 0, 5, 3, (x, y, z) => (y === 4 ? J(0xc89a62, x, y, z, seed) : tone(POLE, x, y, z, seed)));
  M.line(40, 5, 2, 40, 11, 2, (x, y, z) => tone(POLE, x, y, z, seed), 1);
  M.box(38, 5, 1, 41, 8, 3, 0x6a6e76);
  return K.bundle([[M, 0.0625, 22, 0, 10]]);
}

export const TRIBE_LODS = {
  tribeBench: { k: 1.5, thr: 0.3 },
  tribeWoodpile: { k: 1.5, thr: 0.3 },
  tribeHut: [{ k: 2, thr: 0.3 }, { k: 2, thr: 0.3 }],
  tribeStiltHut: [{ k: 2, thr: 0.3 }, { k: 2, thr: 0.3 }],
  tribeLonghouse: { k: 2, thr: 0.3 },
  tribeTotem: [{ k: 1.5, thr: 0.3 }, { k: 1.5, thr: 0.3 }],
  tribeFirePit: { k: 1.5, thr: 0.25 },
  tribeRack: { k: 1.5, thr: 0.2 },
  tribePalisade: { k: 1.5, thr: 0.3 },
  tribeGate: { k: 1.5, thr: 0.25 },
  tribePots: { k: 1.5, thr: 0.25 },
  tribeDrum: { k: 1.5, thr: 0.25 },
  tribeCanoe: { k: 1.5, thr: 0.25 },
};

export function buildTribeModels(kit) {
  K = kit;
  const L = kit.setLod;
  return {
    tribeHut: L('tribeHut', () => [roundHut(61, false), roundHut(62, false)]),
    tribeStiltHut: L('tribeStiltHut', () => [roundHut(63, true), roundHut(64, true)]),
    tribeLonghouse: L('tribeLonghouse', () => [longhouse(65)]),
    tribeTotem: L('tribeTotem', () => [totem(1), totem(2)]),
    tribeFirePit: L('tribeFirePit', () => [firePit(66)]),
    tribeRack: L('tribeRack', () => [dryingRack(67)]),
    tribePalisade: L('tribePalisade', () => [palisade(68)]),
    tribeGate: L('tribeGate', () => [gate(69)]),
    tribePots: L('tribePots', () => [potsBaskets(70)]),
    tribeDrum: L('tribeDrum', () => [drum(71)]),
    tribeCanoe: L('tribeCanoe', () => [canoe(72)]),
    tribeBench: L('tribeBench', () => [logBench(73)]),
    tribeWoodpile: L('tribeWoodpile', () => [woodpile(74)]),
  };
}
