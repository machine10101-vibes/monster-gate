import { fbm, lerp, smoothstep } from '../engine/voxel.js';
import { GATE, TOWN, MINE, LAKE, FARM, W } from './terrain.js';
import { STARTER, TILES, TILE_SIZE, originOf, sampleTile, tileAt } from './tiles.js';

const FRAME = 34;
const CAVE_MOUTH = { x: 104, z: W + 44 };
const CITY_NAMES = new Set(['Oakhollow', 'Southford', 'Dawnspire', 'Hellspire', 'Gilantre']);
const CLUSTER = new Set(['Oakhollow', 'Southmead', 'Southford', 'Broadshire', 'Brookside']);

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function mix3(a, b, t) {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function worldToTileUv(wx, wz) {
  return {
    ftx: STARTER.tx + wx / TILE_SIZE,
    ftz: STARTER.tz + wz / TILE_SIZE,
  };
}

function builtAt(tx, tz) {
  return !!tileAt(tx, tz)?.built;
}

function seaAt(tx, tz) {
  return tileAt(tx, tz)?.biome === 'sea';
}

const MAP_WARP_SEED = 17;
const MAP_WARP_AMP = 0.58;

/** Warp tile UV so every charted, parchment, water and shallow edge is a coastline, not a square. */
function warpUv(wx, wz, seed = MAP_WARP_SEED, amp = MAP_WARP_AMP) {
  const { ftx, ftz } = worldToTileUv(wx, wz);
  const n = fbm(ftx * 2.15, ftz * 2.15, seed, 3) - 0.5;
  const n2 = fbm(ftx * 4.4 + 2.7, ftz * 4.1, seed + 3, 2) - 0.5;
  const n3 = fbm(ftx * 8.2 + 1.1, ftz * 7.6, seed + 8, 2) - 0.5;
  return {
    ftx,
    ftz,
    wtx: ftx + n * amp + n3 * amp * 0.38,
    wtz: ftz + n2 * amp + n3 * amp * 0.32,
  };
}

function mapWarp(wx, wz) {
  return warpUv(wx, wz, MAP_WARP_SEED, MAP_WARP_AMP);
}

function oceanCell(tx, tz) {
  if (seaAt(tx, tz)) return true;
  const tile = tileAt(tx, tz);
  if (tile?.biome !== 'coast' || tile.built) return false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (seaAt(tx + dx, tz + dz)) return true;
  }
  return false;
}

/** 0–1 membership, warped and feathered on every side including corners. */
function fieldWeight(wx, wz, test, band = 0.3) {
  const w = mapWarp(wx, wz);
  const n = fbm(w.ftx * 3.2, w.ftz * 3.15, MAP_WARP_SEED + 11, 2) - 0.5;
  const tx = Math.floor(w.wtx);
  const tz = Math.floor(w.wtz);
  const u = w.wtx - tx;
  const v = w.wtz - tz;
  if (test(tx, tz)) {
    let toOther = 1;
    if (!test(tx - 1, tz)) toOther = Math.min(toOther, u);
    if (!test(tx + 1, tz)) toOther = Math.min(toOther, 1 - u);
    if (!test(tx, tz - 1)) toOther = Math.min(toOther, v);
    if (!test(tx, tz + 1)) toOther = Math.min(toOther, 1 - v);
    if (!test(tx - 1, tz - 1)) toOther = Math.min(toOther, Math.hypot(u, v));
    if (!test(tx + 1, tz - 1)) toOther = Math.min(toOther, Math.hypot(1 - u, v));
    if (!test(tx - 1, tz + 1)) toOther = Math.min(toOther, Math.hypot(u, 1 - v));
    if (!test(tx + 1, tz + 1)) toOther = Math.min(toOther, Math.hypot(1 - u, 1 - v));
    return smoothstep(0, band, toOther + n * 0.2);
  }
  return neighborBleed(tx, tz, u, v, band + 0.04, test);
}

function neighborBleed(tx, tz, u, v, band, test) {
  let b = 0;
  if (test(tx - 1, tz)) b = Math.max(b, smoothstep(band, 0, u));
  if (test(tx + 1, tz)) b = Math.max(b, smoothstep(band, 0, 1 - u));
  if (test(tx, tz - 1)) b = Math.max(b, smoothstep(band, 0, v));
  if (test(tx, tz + 1)) b = Math.max(b, smoothstep(band, 0, 1 - v));
  if (test(tx - 1, tz - 1)) b = Math.max(b, Math.min(smoothstep(band, 0, u), smoothstep(band, 0, v)));
  if (test(tx + 1, tz - 1)) b = Math.max(b, Math.min(smoothstep(band, 0, 1 - u), smoothstep(band, 0, v)));
  if (test(tx - 1, tz + 1)) b = Math.max(b, Math.min(smoothstep(band, 0, u), smoothstep(band, 0, 1 - v)));
  if (test(tx + 1, tz + 1)) b = Math.max(b, Math.min(smoothstep(band, 0, 1 - u), smoothstep(band, 0, 1 - v)));
  return b;
}

/** 1 inside charted land, 0 in uncharted. All four sides of every tile are noise-warped. */
export function chartedWeight(wx, wz) {
  return outerRimFade(wx, wz, fieldWeight(wx, wz, builtAt, 0.34));
}

/** Fade sea/parchment into the map frame so the 10×10 grid is not a hard rectangle. */
function outerRimFade(wx, wz, amt) {
  const { ftx, ftz } = worldToTileUv(wx, wz);
  const n = fbm(ftx * 2.35, ftz * 2.2, MAP_WARP_SEED + 31, 3) - 0.5;
  const n2 = fbm(ftx * 6.1 + 2.4, ftz * 5.7, MAP_WARP_SEED + 37, 2) - 0.5;
  const edge = Math.min(ftx, 10 - ftx, ftz, 10 - ftz);
  if (edge < 0) return amt;
  const rim = 0.48 + n * 0.32 + n2 * 0.18;
  if (edge >= rim) return amt;
  return amt * smoothstep(0.015 + n2 * 0.03, rim, edge);
}

/** Continuous ocean. Shoreline, shallows and coast patches use the same warp as land. */
export function oceanWeight(wx, wz) {
  const w = mapWarp(wx, wz);
  const tx = Math.floor(w.wtx);
  const tz = Math.floor(w.wtz);
  let amt;
  if (tx < 0 || tz < 0 || tx >= 10 || tz >= 10) {
    const n = fbm(w.ftx * 1.4, w.ftz * 1.4, MAP_WARP_SEED + 24, 3);
    const shore = 8.05 + (n - 0.5) * 0.72 + 0.2 * Math.sin(w.ftx * 1.7) + 0.12 * Math.sin(w.ftx * 4.2 + n);
    amt = smoothstep(shore - 0.28, shore + 0.22, w.wtz);
  } else {
    amt = fieldWeight(wx, wz, oceanCell, 0.36);
  }
  return outerRimFade(wx, wz, amt);
}

/** Move a pin onto charted land inside its tile, or null if none is nearby. */
export function chartedAnchor(wx, wz) {
  if (chartedWeight(wx, wz) > 0.5) return { x: wx, z: wz };
  const { ftx, ftz } = worldToTileUv(wx, wz);
  const tile = tileAt(Math.floor(ftx + 1e-6), Math.floor(ftz + 1e-6));
  if (tile?.built) {
    const o = originOf(tile);
    let best = null;
    let bestS = -1;
    for (let vv = 0.16; vv <= 0.84; vv += 0.08) {
      for (let uu = 0.16; uu <= 0.84; uu += 0.08) {
        const x = o.x + uu * TILE_SIZE;
        const z = o.z + vv * TILE_SIZE;
        const cw = chartedWeight(x, z);
        if (cw < 0.55) continue;
        const s = cw - Math.hypot(uu - 0.5, vv - 0.5) * 0.25;
        if (s > bestS) {
          bestS = s;
          best = { x, z };
        }
      }
    }
    if (best) return best;
  }
  for (let r = 12; r <= 72; r += 12) {
    for (let a = 0; a < 10; a++) {
      const x = wx + Math.cos((a / 10) * Math.PI * 2) * r;
      const z = wz + Math.sin((a / 10) * Math.PI * 2) * r;
      if (chartedWeight(x, z) > 0.55) return { x, z };
    }
  }
  return null;
}

function parchment(wx, wz) {
  const n = fbm(wx * 0.045, wz * 0.045, 3, 3);
  const n2 = fbm(wx * 0.19, wz * 0.19, 9, 2);
  const fleck = fbm(wx * 0.55, wz * 0.55, 15, 2);
  const slate = 0.22 + n * 0.1;
  return [
    (0.46 + n * 0.08 + n2 * 0.04 - fleck * 0.03) * 255,
    (0.40 + n * 0.06 + n2 * 0.03 - fleck * 0.02) * 255,
    (0.30 + n * 0.04 + slate * 0.12) * 255,
  ];
}

function oceanColor(wx, wz, amt) {
  const n = fbm(wx * 0.035, wz * 0.035, 47, 3);
  const shallow = smoothstep(0.55, 0.08, amt);
  return [
    lerp(16 + n * 6, 72 + n * 10, shallow),
    lerp(58 + n * 8, 128 + n * 12, shallow),
    lerp(96 + n * 10, 168 + n * 8, shallow),
  ];
}

function landCacheOf(tileCanvas) {
  const cache = new Map();
  if (!tileCanvas) return cache;
  for (const [id, c] of Object.entries(tileCanvas)) {
    if (!c?.getContext) continue;
    cache.set(id, c.getContext('2d').getImageData(0, 0, c.width, c.height));
  }
  return cache;
}

function colorFromLand(tile, wx, wz, cache) {
  const img = cache.get(tile.id);
  if (!img) return null;
  const o = originOf(tile);
  const x = Math.max(0, Math.min(img.width - 1, Math.floor(wx - o.x)));
  const z = Math.max(0, Math.min(img.height - 1, Math.floor(wz - o.z)));
  const i = (z * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

function colorFromSample(tile, u, v) {
  const s = sampleTile(tile, u, v);
  return [s.r * 255, s.g * 255, s.b * 255];
}

function sampleBuiltUv(tile, u, v, cache) {
  if (!tile?.built) return null;
  const uu = clamp01(u);
  const vv = clamp01(v);
  const o = originOf(tile);
  const wx = o.x + uu * (TILE_SIZE - 1e-4);
  const wz = o.z + vv * (TILE_SIZE - 1e-4);
  return colorFromLand(tile, wx, wz, cache) || colorFromSample(tile, uu, vv);
}

function chartedColor(wx, wz, cache) {
  const w = mapWarp(wx, wz);
  const tx = Math.floor(w.wtx);
  const tz = Math.floor(w.wtz);
  let tile = tileAt(tx, tz);
  let u = w.wtx - tx;
  let v = w.wtz - tz;
  if (!tile?.built) {
    let best = null;
    let bestB = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const t = tileAt(tx + dx, tz + dz);
        if (!t?.built) continue;
        const bu = dx < 0 ? u : dx > 0 ? 1 - u : 1;
        const bv = dz < 0 ? v : dz > 0 ? 1 - v : 1;
        const b = dx && dz
          ? Math.min(smoothstep(0.24, 0, bu), smoothstep(0.24, 0, bv))
          : smoothstep(0.24, 0, dx ? bu : bv);
        if (b > bestB) {
          bestB = b;
          best = t;
        }
      }
    }
    if (!best) return null;
    tile = best;
    u = w.wtx - tile.tx;
    v = w.wtz - tile.tz;
  }
  let col = sampleBuiltUv(tile, u, v, cache);
  if (!col) return null;
  const band = 0.22;
  const mixN = (dx, dz, t) => {
    if (t <= 0) return;
    const other = tileAt(tile.tx + dx, tile.tz + dz);
    if (!other?.built) return;
    const oc = sampleBuiltUv(other, u - dx, v - dz, cache);
    if (oc) col = mix3(col, oc, t * 0.5);
  };
  mixN(-1, 0, smoothstep(band, 0, u));
  mixN(1, 0, smoothstep(band, 0, 1 - u));
  mixN(0, -1, smoothstep(band, 0, v));
  mixN(0, 1, smoothstep(band, 0, 1 - v));
  return col;
}

function put(data, w, i, rgb) {
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
  data[i + 3] = 255;
}

function compass(data, w, h, cx, cy, r) {
  const ink = [42, 28, 14];
  const gold = [198, 162, 78];
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r) continue;
      const px = cx + x;
      const py = cy + y;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const i = (py * w + px) * 4;
      const ring = Math.abs(d - r * 0.92);
      if (ring < 1.6) put(data, w, i, gold);
      else if (d < r * 0.9) {
        const arm = Math.min(Math.abs(x), Math.abs(y));
        const on = (Math.abs(x) < r * 0.14 && Math.abs(y) < r * 0.82) || (Math.abs(y) < r * 0.14 && Math.abs(x) < r * 0.82);
        if (on && arm < r * 0.16) put(data, w, i, y < 0 && Math.abs(x) < r * 0.14 ? [168, 42, 32] : ink);
      }
    }
  }
}

function applyFrame(data, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const raw = Math.min(x, y, w - 1 - x, h - 1 - y);
      const warp = (Math.sin(x * 0.09 + y * 0.061) + Math.sin(x * 0.033 - y * 0.047)) * 7.5;
      const d = raw < 14 ? raw : raw + warp;
      if (d > FRAME + 22) continue;
      const i = (y * w + x) * 4;
      if (raw < 7) put(data, w, i, [58, 38, 18]);
      else if (raw < 11) put(data, w, i, [196, 158, 74]);
      else if (raw < 14) put(data, w, i, [92, 62, 28]);
      else {
        const t = (d - 14) / 22;
        const k = (1 - t) * (1 - t) * 0.22;
        data[i] *= 1 - k;
        data[i + 1] *= 1 - k;
        data[i + 2] *= 1 - k * 1.05;
      }
    }
  }
  compass(data, w, h, w - FRAME - 48, h - FRAME - 48, 28);
  drawN(data, w, h, w - FRAME - 48, h - FRAME - 82);
}

function drawN(data, w, h, cx, cy) {
  const glyph = ['10001', '11001', '10101', '10011', '10001'];
  for (let gy = 0; gy < glyph.length; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      if (glyph[gy][gx] !== '1') continue;
      for (let oy = 0; oy < 3; oy++) for (let ox = 0; ox < 3; ox++) {
        const px = cx - 7 + gx * 3 + ox;
        const py = cy + gy * 3 + oy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        put(data, w, (py * w + px) * 4, [236, 214, 150]);
      }
    }
  }
}

/** Full hunter-map raster: parchment uncharted, one ocean, charted land with warped edges. */
export function rasterPlaymap({ width, height, minX, minZ, scale = 1, tileCanvas = null } = {}) {
  const w = width;
  const h = height;
  const data = new Uint8ClampedArray(w * h * 4);
  const cache = landCacheOf(tileCanvas);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = minX + (x + 0.5) / scale;
      const wz = minZ + (y + 0.5) / scale;
      let rgb = parchment(wx, wz);
      const ow = oceanWeight(wx, wz);
      if (ow > 0.004) rgb = mix3(rgb, oceanColor(wx, wz, ow), ow);
      const cw = chartedWeight(wx, wz);
      if (cw > 0.004) {
        const land = chartedColor(wx, wz, cache);
        if (land) rgb = mix3(rgb, land, cw);
      }
      const ink = cw > 0.06 && cw < 0.94 ? 1 - Math.abs(cw - 0.5) / 0.44 : 0;
      if (ink > 0.55) rgb = mix3(rgb, [36, 24, 12], (ink - 0.55) * 1.4);
      put(data, w, (y * w + x) * 4, rgb);
    }
  }
  applyFrame(data, w, h);
  return data;
}

export function playmapExtent() {
  let minX = 0;
  let minZ = 0;
  let maxX = TILE_SIZE;
  let maxZ = TILE_SIZE;
  for (const tile of TILES) {
    const o = originOf(tile);
    minX = Math.min(minX, o.x);
    minZ = Math.min(minZ, o.z);
    maxX = Math.max(maxX, o.x + TILE_SIZE);
    maxZ = Math.max(maxZ, o.z + TILE_SIZE);
  }
  return { minX, minZ, maxX, maxZ, width: maxX - minX, height: maxZ - minZ };
}

const FONT = {
  A: ['01110', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000'],
  G: ['01111', '10000', '10111', '10001', '01110'],
  H: ['10001', '10001', '11111', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '11111'],
  J: ['00111', '00001', '00001', '10001', '01110'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10010', '01101'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '11111'],
  "'": ['01000', '01000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '11111', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000'],
};

function blitGlyph(data, w, h, x, y, ch, scale, fill, outline) {
  const g = FONT[ch] || FONT[' '];
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      if (g[gy][gx] !== '1') continue;
      for (let oy = -1; oy <= scale; oy++) {
        for (let ox = -1; ox <= scale; ox++) {
          const px = x + gx * scale + ox;
          const py = y + gy * scale + oy;
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const edge = ox < 0 || oy < 0 || ox >= scale || oy >= scale;
          put(data, w, (py * w + px) * 4, edge ? outline : fill);
        }
      }
    }
  }
}

export function drawPlaymapText(data, w, h, cx, cy, text, { scale = 2, fill = [255, 248, 232], outline = [12, 8, 4], italic = false } = {}) {
  const s = String(text || '').toUpperCase();
  const gw = 5 * scale + 1;
  const x0 = Math.round(cx - (s.length * gw) / 2);
  const y0 = Math.round(cy - (5 * scale) / 2);
  for (let i = 0; i < s.length; i++) {
    const tilt = italic ? Math.floor((2 - i % 3) * 0.6) : 0;
    blitGlyph(data, w, h, x0 + i * gw + tilt, y0, s[i], scale, fill, outline);
  }
}

export function collectPlaymapLabels() {
  const labels = [];
  let gilantre = null;
  for (const tile of TILES) {
    const o = originOf(tile);
    const x = o.x + TILE_SIZE / 2;
    const z = o.z + TILE_SIZE / 2;
    if (String(tile.kind).startsWith('gilantre') || tile.name === 'Gilantre') {
      gilantre = gilantre || { name: 'Gilantre', x: 0, z: 0, n: 0, city: true };
      gilantre.x += x;
      gilantre.z += z;
      gilantre.n += 1;
      continue;
    }
    if (tile.kind === 'oakhollow') continue;
    if (tile.built) {
      const pin = chartedAnchor(x, z);
      if (!pin) continue;
      labels.push({
        name: tile.kind === 'pirateshore' ? 'Pirate Shore' : tile.kind === 'lagoon' ? 'The Lagoon' : tile.kind === 'canopy' ? 'Silverrun Canopy' : tile.name,
        x: pin.x,
        z: pin.z,
        city: CITY_NAMES.has(tile.name),
        charted: true,
      });
    } else if (tile.biome !== 'sea' && (tile.tx + tile.tz * 2) % 4 === 1) {
      labels.push({ name: tile.name, x, z, uncharted: true });
    }
  }
  if (gilantre) {
    const pin = chartedAnchor(gilantre.x / gilantre.n, gilantre.z / gilantre.n);
    if (pin) labels.push({ name: 'Gilantre', x: pin.x, z: pin.z, city: true, charted: true });
  }
  const marks = [
    { name: 'Monster Gate', x: GATE.x, z: GATE.z - 14, landmark: true },
    { name: 'Greyrock Pit', x: MINE.x + 4, z: MINE.z - 14, landmark: true },
    { name: 'Oakhollow', x: TOWN.x - 10, z: TOWN.z + 18, city: true },
    { name: "Tobin's Farm", x: FARM.x1 + 22, z: FARM.z1 + 16, landmark: true },
    { name: 'Mirrormere', x: LAKE.x - 32, z: LAKE.z + 34, landmark: true },
    { name: 'Darksycle Cave', x: CAVE_MOUTH.x + 2, z: CAVE_MOUTH.z - 24, landmark: true },
  ];
  for (const mark of marks) {
    const pin = chartedAnchor(mark.x, mark.z) || { x: mark.x, z: mark.z };
    labels.push({ ...mark, x: pin.x, z: pin.z, charted: chartedWeight(pin.x, pin.z) > 0.45 });
  }
  return labels;
}

export function stampLabelsOnRaster(data, w, h, minX, minZ, scale, placed) {
  for (const label of placed) {
    if (!label.visible) continue;
    const cx = (label.x / 100) * w;
    const cy = (label.y / 100) * h;
    const city = label.kind === 'city' || label.city;
    const uncharted = label.kind === 'uncharted' || label.uncharted;
    drawPlaymapText(data, w, h, cx, cy, label.name, {
      scale: city ? 3 : uncharted ? 3 : 2,
      fill: city ? [255, 231, 160] : uncharted ? [122, 74, 24] : [255, 248, 232],
      outline: uncharted ? [246, 234, 208] : [10, 7, 3],
      italic: uncharted,
    });
  }
}

export function clusterNames() {
  return CLUSTER;
}

export { FRAME as PLAYMAP_FRAME_PX };
