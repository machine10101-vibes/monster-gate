#!/usr/bin/env node
/** Headless hunter-map raster (labels on/off) for before/after screenshots. */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILE_SIZE, TILES, originOf } from '../src/world/tiles.js';
import { collectPlaymapLabels, rasterPlaymap, stampLabelsOnRaster } from '../src/world/playmap.js';
import { layoutPlaymapLabels, playmapPanelInner } from '../src/ui/hudLayout.js';

function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePNG(path, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  const src = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    src.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

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
const w = maxX - minX;
const h = maxZ - minZ;
const rgba = rasterPlaymap({ width: w, height: h, minX, minZ, scale: 1 });

const outOff = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'map-dump.png'));
mkdirSync(dirname(outOff), { recursive: true });
writePNG(outOff, w, h, rgba);

const labelsOn = new Uint8ClampedArray(rgba);
const raw = collectPlaymapLabels();
const pins = raw.map((label) => ({
  ...label,
  nx: ((label.x - minX) / w) * 100,
  ny: ((label.z - minZ) / h) * 100,
}));
const placed = layoutPlaymapLabels(pins, { mapW: w, mapH: h });
stampLabelsOnRaster(labelsOn, w, h, minX, minZ, 1, placed);
const outOn = process.argv[3] ? resolve(process.argv[3]) : outOff.replace(/\.png$/, '-labels-on.png');
writePNG(outOn, w, h, labelsOn);

function containInto(src, sw, sh, vw, vh, bg = [18, 16, 14, 255]) {
  const scale = Math.min(vw / sw, vh / sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const ox = Math.floor((vw - dw) / 2);
  const oy = Math.floor((vh - dh) / 2);
  const out = new Uint8ClampedArray(vw * vh * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = bg[0];
    out[i + 1] = bg[1];
    out[i + 2] = bg[2];
    out[i + 3] = bg[3];
  }
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(y / scale));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x / scale));
      const si = (sy * sw + sx) * 4;
      const di = ((oy + y) * vw + (ox + x)) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = 255;
    }
  }
  return out;
}

function paintPanel(src, sw, sh, vw, vh) {
  const inner = playmapPanelInner(vw, vh);
  const scale = Math.min(inner.innerW / sw, inner.innerH / sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const cardX = Math.floor((vw - inner.cardW) / 2);
  const cardY = Math.floor((vh - inner.cardH) / 2);
  const ox = cardX + Math.floor((inner.cardW - dw) / 2);
  const oy = cardY + Math.floor((inner.cardH - dh) / 2);
  const framed = new Uint8ClampedArray(vw * vh * 4);
  for (let i = 0; i < framed.length; i += 4) {
    framed[i] = 12;
    framed[i + 1] = 14;
    framed[i + 2] = 18;
    framed[i + 3] = 255;
  }
  const gold = [196, 158, 74];
  for (let y = cardY; y < cardY + inner.cardH; y++) {
    for (let x = cardX; x < cardX + inner.cardW; x++) {
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const i = (y * vw + x) * 4;
      const edge = x < cardX + 3 || y < cardY + 3 || x >= cardX + inner.cardW - 3 || y >= cardY + inner.cardH - 3;
      if (edge) {
        framed[i] = gold[0];
        framed[i + 1] = gold[1];
        framed[i + 2] = gold[2];
      } else {
        framed[i] = 28;
        framed[i + 1] = 30;
        framed[i + 2] = 36;
      }
    }
  }
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(y / scale));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x / scale));
      const px = ox + x;
      const py = oy + y;
      if (px < 0 || py < 0 || px >= vw || py >= vh) continue;
      const si = (sy * sw + sx) * 4;
      const di = (py * vw + px) * 4;
      framed[di] = src[si];
      framed[di + 1] = src[si + 1];
      framed[di + 2] = src[si + 2];
      framed[di + 3] = 255;
    }
  }
  return { rgba: framed, map: Math.min(dw, dh), inner };
}

const dir = dirname(outOff);
const sizes = [
  [1920, 1080],
  [1280, 800],
  [844, 390],
];
for (const [vw, vh] of sizes) {
  const painted = paintPanel(labelsOn, w, h, vw, vh);
  const dest = join(dir, `map-${vw}x${vh}.png`);
  writePNG(dest, vw, vh, painted.rgba);
  if (painted.map <= 300) throw new Error(`${vw}x${vh} map ${painted.map}px <= 300`);
  console.log(`wrote ${dest} map ${painted.map}px`);
}
console.log(`wrote ${outOff} and ${outOn} ${w}x${h}`);
