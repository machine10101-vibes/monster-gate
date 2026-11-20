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

/** 1 inside charted land, 0 in uncharted. Sample coords are noise-warped so the edge is a coastline. */
export function chartedWeight(wx, wz) {
  const { ftx, ftz } = worldToTileUv(wx, wz);
  const n = fbm(ftx * 2.55, ftz * 2.55, 17, 3) - 0.5;
  const n2 = fbm(ftx * 4.6 + 3.1, ftz * 4.6, 19, 2) - 0.5;
  const wtx = ftx + n * 0.34;
  const wtz = ftz + n2 * 0.34;
  const tx = Math.floor(wtx);
  const tz = Math.floor(wtz);
  if (builtAt(tx, tz)) return 1;
  let bleed = 0;
  const u = wtx - tx;
  const v = wtz - tz;
  if (builtAt(tx - 1, tz)) bleed = Math.max(bleed, smoothstep(0.16, 0, u));
  if (builtAt(tx + 1, tz)) bleed = Math.max(bleed, smoothstep(0.16, 0, 1 - u));
  if (builtAt(tx, tz - 1)) bleed = Math.max(bleed, smoothstep(0.16, 0, v));
  if (builtAt(tx, tz + 1)) bleed = Math.max(bleed, smoothstep(0.16, 0, 1 - v));
  return bleed;
}

/** Continuous ocean. Shoreline is a warped world curve, never a per-tile square. */
export function oceanWeight(wx, wz) {
  const { ftx, ftz } = worldToTileUv(wx, wz);
  const n = fbm(ftx * 1.32, ftz * 1.32, 41, 3);
  const n2 = fbm(ftx * 3.05 + 2, ftz * 3.05, 43, 2);
  const wtx = ftx + (n - 0.5) * 0.38;
  const wtz = ftz + (n2 - 0.5) * 0.24;
  const tile = tileAt(Math.floor(wtx), Math.floor(wtz));
  if (tile?.biome === 'sea') return 1;
  if (tile?.biome === 'coast' && !tile.built) {
    const v = wtz - Math.floor(wtz);
    return smoothstep(0.26, 0.58, v + (n - 0.5) * 0.12);
  }
  if (!tile?.built && ftz > 7.45) {
    const shore = 8.02 + (n - 0.5) * 0.42 + 0.08 * Math.sin(ftx * 2.1);
    return smoothstep(shore - 0.14, shore + 0.22, ftz);
  }
  return 0;
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

function colorOfBuilt(tile, wx, wz, cache) {
  if (!tile?.built) return null;
  const o = originOf(tile);
  return colorFromLand(tile, wx, wz, cache) || colorFromSample(tile, (wx - o.x) / TILE_SIZE, (wz - o.z) / TILE_SIZE);
}

function chartedColor(wx, wz, cache) {
  const { ftx, ftz } = worldToTileUv(wx, wz);
  const n = fbm(ftx * 2.4, ftz * 2.4, 29, 3) - 0.5;
  const n2 = fbm(ftx * 1.7 + 6, ftz * 1.7, 31, 2) - 0.5;
  const wtx = ftx + n * 0.24;
  const wtz = ftz + n2 * 0.24;
  let tile = tileAt(Math.floor(wtx), Math.floor(wtz));
  if (!tile?.built) {
    let best = null;
    let bestD = 4;
    const tx0 = Math.floor(ftx);
    const tz0 = Math.floor(ftz);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const t = tileAt(tx0 + dx, tz0 + dz);
        if (!t?.built) continue;
        const d = (ftx - t.tx - 0.5) ** 2 + (ftz - t.tz - 0.5) ** 2;
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
    }
    tile = best;
  }
  if (!tile?.built) return null;
  let col = colorOfBuilt(tile, wx, wz, cache);
  const tx = tile.tx;
  const tz = tile.tz;
  const u = wtx - Math.floor(wtx);
  const v = wtz - Math.floor(wtz);
  const band = 0.16;
  const mixEdge = (other, t) => {
    if (!other?.built || t <= 0 || !col) return;
    const oc = colorOfBuilt(other, wx, wz, cache);
    if (oc) col = mix3(col, oc, t * 0.45);
  };
  mixEdge(tileAt(tx - 1, tz), smoothstep(band, 0, u));
  mixEdge(tileAt(tx + 1, tz), smoothstep(band, 0, 1 - u));
  mixEdge(tileAt(tx, tz - 1), smoothstep(band, 0, v));
  mixEdge(tileAt(tx, tz + 1), smoothstep(band, 0, 1 - v));
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
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d > FRAME + 18) continue;
      const i = (y * w + x) * 4;
      if (d < 7) put(data, w, i, [58, 38, 18]);
      else if (d < 11) put(data, w, i, [196, 158, 74]);
      else if (d < 14) put(data, w, i, [92, 62, 28]);
      else {
        const t = (d - 14) / 18;
        const k = (1 - t) * (1 - t) * 0.38;
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
      labels.push({
        name: tile.kind === 'pirateshore' ? 'Pirate Shore' : tile.name,
        x,
        z,
        city: CITY_NAMES.has(tile.name),
      });
    } else if (tile.biome !== 'sea' && (tile.tx + tile.tz * 2) % 4 === 1) {
      labels.push({ name: tile.name, x, z, uncharted: true });
    }
  }
  if (gilantre) labels.push({ name: 'Gilantre', x: gilantre.x / gilantre.n, z: gilantre.z / gilantre.n, city: true });
  labels.push(
    { name: 'Monster Gate', x: GATE.x, z: GATE.z - 14, landmark: true },
    { name: 'Greyrock Pit', x: MINE.x + 4, z: MINE.z - 14, landmark: true },
    { name: 'Oakhollow', x: TOWN.x - 10, z: TOWN.z + 18, city: true },
    { name: "Tobin's Farm", x: FARM.x1 + 22, z: FARM.z1 + 16, landmark: true },
    { name: 'Mirrormere', x: LAKE.x - 32, z: LAKE.z + 34, landmark: true },
    { name: 'Darksycle Cave', x: CAVE_MOUTH.x + 2, z: CAVE_MOUTH.z - 24, landmark: true },
  );
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
      scale: city ? 3 : 2,
      fill: city ? [255, 231, 160] : uncharted ? [210, 196, 168] : [255, 248, 232],
      outline: [10, 7, 3],
      italic: uncharted,
    });
  }
}

export function clusterNames() {
  return CLUSTER;
}

export { FRAME as PLAYMAP_FRAME_PX };
