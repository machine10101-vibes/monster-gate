#!/usr/bin/env node
/** Headless Brookside terrain dump: tops, tints, and height-step side faces. */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILE } from '../src/engine/materials.js';
import { W, generateTile } from '../src/world/terrain.js';
import { generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { ZONE } from '../src/world/terrain.js';

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

const grassy = (t) => t === TILE.GRASS || t === TILE.FLOWER_GRASS;
const oak = generateTile();
openSouthPass(oak);
openRingPasses(oak);
const northEdge = new Float32Array(W);
for (let x = 0; x < W; x++) northEdge[x] = oak.H[(W - 1) * W + x];
const south = generateSouthford(northEdge);
openValeSides(south);
openSouthfordDesert(south);
const ring = generateRing(oak, south);
const land = ring.find((l) => l.kind === 'brookside');
if (!land) throw new Error('brookside missing');
const { H, top, tint, pathMask, zone } = land.data;

const rgba = new Uint8ClampedArray(W * W * 4);
const sideMap = new Uint8Array(W * W);
let sides = 0;
let smallGrassSides = 0;
let pathSides = 0;
for (let z = 0; z < W; z++) {
  for (let x = 0; x < W; x++) {
    const i = z * W + x;
    const h = H[i];
    const tl = top[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
      const nh = H[nz * W + nx];
      if (nh >= h) continue;
      const drop = h - nh;
      const nt = top[nz * W + nx];
      const nbGrassy = grassy(nt);
      if (grassy(tl) && nbGrassy && drop <= 1.001) {
        smallGrassSides++;
        continue;
      }
      if ((tl === TILE.PATH || grassy(tl)) && (nbGrassy || nt === TILE.PATH) && drop <= 1.001) {
        pathSides++;
        continue;
      }
      sideMap[i] = 1;
      sides++;
    }
    const r = Math.round(clamp01(tint[i * 3]) * 90);
    const g = Math.round(clamp01(tint[i * 3 + 1]) * 160);
    const b = Math.round(clamp01(tint[i * 3 + 2]) * 70);
    let cr = r;
    let cg = g;
    let cb = b;
    if (zone[i] === ZONE.WATER) { cr = 40; cg = 90; cb = 150; }
    else if (tl === TILE.PATH || pathMask[i]) { cr = 180; cg = 150; cb = 90; }
    else if (tl === TILE.STONE || tl === TILE.MOSS_STONE) { cr = 140; cg = 145; cb = 150; }
    if (sideMap[i]) {
      cr = Math.min(255, cr + 70);
      cg = Math.max(0, cg - 40);
      cb = Math.max(0, cb - 40);
    }
    const o = i * 4;
    rgba[o] = cr;
    rgba[o + 1] = cg;
    rgba[o + 2] = cb;
    rgba[o + 3] = 255;
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function quadrant(x0, z0, x1, z1) {
  let n = 0;
  let diag = 0;
  for (let z = z0; z < z1; z++) {
    for (let x = x0; x < x1; x++) {
      const i = z * W + x;
      if (!sideMap[i]) continue;
      n++;
      const se = x + 1 < x1 && z + 1 < z1 && sideMap[(z + 1) * W + (x + 1)];
      const sw = x - 1 >= x0 && z + 1 < z1 && sideMap[(z + 1) * W + (x - 1)];
      if (se || sw) diag++;
    }
  }
  return { n, diag };
}

const ul = quadrant(0, 0, 48, 48);
const lr = quadrant(W - 48, W - 48, W, W);
const out = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'brookside-dump.png'));
mkdirSync(dirname(out), { recursive: true });
writePNG(out, W, W, rgba);
console.log(JSON.stringify({
  out,
  sides,
  smallGrassSides,
  pathSides,
  ul,
  lr,
  tops: {
    grass: [...top].filter((t) => t === TILE.GRASS).length,
    flower: [...top].filter((t) => t === TILE.FLOWER_GRASS).length,
    path: [...top].filter((t) => t === TILE.PATH).length,
    stone: [...top].filter((t) => t === TILE.STONE || t === TILE.MOSS_STONE).length,
    sand: [...top].filter((t) => t === TILE.SAND).length,
  },
}, null, 2));
