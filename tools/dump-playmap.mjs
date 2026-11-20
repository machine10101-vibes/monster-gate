#!/usr/bin/env node
/** Headless 10×10 hunter-map raster for before/after screenshots. */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRID, TILES, TILE_SIZE, paintTileMap } from '../src/world/tiles.js';

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

function mockCanvas(s) {
  let pixels = null;
  return {
    width: s,
    height: s,
    getContext() {
      return {
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        putImageData(img) { pixels = img.data; },
      };
    },
    pixels: () => pixels,
  };
}

const cell = TILE_SIZE;
const w = GRID * cell;
const h = GRID * cell;
const atlas = new Uint8ClampedArray(w * h * 4);
for (const tile of TILES) {
  const c = mockCanvas(cell);
  paintTileMap(c, tile);
  const src = c.pixels();
  const ox = tile.tx * cell;
  const oy = tile.tz * cell;
  for (let y = 0; y < cell; y++) {
    atlas.set(src.subarray(y * cell * 4, (y + 1) * cell * 4), ((oy + y) * w + ox) * 4);
  }
}

const out = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'map-dump.png'));
mkdirSync(dirname(out), { recursive: true });
writePNG(out, w, h, atlas);
console.log(`wrote ${out} ${w}x${h}`);
