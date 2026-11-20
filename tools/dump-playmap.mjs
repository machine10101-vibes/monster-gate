#!/usr/bin/env node
/** Headless hunter-map raster (labels on/off) for before/after screenshots. */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILE_SIZE, TILES, originOf } from '../src/world/tiles.js';
import { collectPlaymapLabels, rasterPlaymap, stampLabelsOnRaster } from '../src/world/playmap.js';
import { layoutPlaymapLabels } from '../src/ui/hudLayout.js';

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
console.log(`wrote ${outOff} and ${outOn} ${w}x${h}`);
