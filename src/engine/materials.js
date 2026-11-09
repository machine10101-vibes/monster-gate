import * as THREE from 'three';
import { RNG, hash2, shade, hex, mix, clamp } from './voxel.js';

export const hideUniforms = {
  uPlayerScreen: { value: new THREE.Vector2(-9999, -9999) },
  uPlayerDepth: { value: 10 },
  uHideRadius: { value: 90 },
};

/** Screen-door fade of anything that sits between the camera and the hero. */
export function patchHide(material, key = 'hide') {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlayerScreen = hideUniforms.uPlayerScreen;
    shader.uniforms.uPlayerDepth = hideUniforms.uPlayerDepth;
    shader.uniforms.uHideRadius = hideUniforms.uHideRadius;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHideDepth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHideDepth = -mvPosition.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vHideDepth;
uniform vec2 uPlayerScreen;
uniform float uPlayerDepth;
uniform float uHideRadius;`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
{
  float hd = distance(gl_FragCoord.xy, uPlayerScreen);
  if (vHideDepth < uPlayerDepth - 1.4 && hd < uHideRadius) {
    float t = hd / uHideRadius;
    vec2 pp = floor(gl_FragCoord.xy / 2.0);
    float bayer = fract(52.9829189 * fract(dot(pp, vec2(0.06711056, 0.00583715))));
    if (bayer > t * t * 1.15) discard;
  }
}`
      );
  };
  material.customProgramCacheKey = () => key;
  return material;
}

export function makeGradientMap(steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    const b = Math.round(clamp(v, 0, 1) * 255);
    data[i * 4] = b;
    data[i * 4 + 1] = b;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export const toonRamp = makeGradientMap([0.0, 0.0, 0.28, 0.55, 0.78, 0.92, 1.0, 1.0]);

export function toonMaterial(opts = {}) {
  const m = new THREE.MeshToonMaterial({ gradientMap: toonRamp, ...opts });
  return m;
}

/* ------------------------------------------------------------------ */
/* Terrain texture atlas                                                */
/* ------------------------------------------------------------------ */

export const TILE = {
  GRASS: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  COBBLE: 4,
  BRICK: 5,
  SNOW: 6,
  SNOW_SIDE: 7,
  SAND: 8,
  FARMLAND: 9,
  MOSS_STONE: 10,
  GRAVEL: 11,
  FLOWER_GRASS: 12,
  PATH: 13,
  DARK_STONE: 14,
  ICE: 15,
  FROST_GRASS: 16,
  BASALT: 49,
  ASH: 52,
  CINDER: 55,
  LAVA: 58,
  OBSIDIAN: 61,
  FLAGSTONE: 97,
};

const TILE_PX = 16;
const ATLAS_TILES = 16;

function c2css(c) {
  return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
}

export function buildAtlas() {
  const size = TILE_PX * ATLAS_TILES;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rng = new RNG(1234);

  const px = (tile, x, y, color) => {
    const tx = (tile % ATLAS_TILES) * TILE_PX;
    const ty = Math.floor(tile / ATLAS_TILES) * TILE_PX;
    ctx.fillStyle = c2css(color);
    ctx.fillRect(tx + x, ty + y, 1, 1);
  };
  const fill = (tile, fn) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) px(tile, x, y, fn(x, y));
  };
  const fill9 = (center, fn) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) fill(center + dr * ATLAS_TILES + dc, fn);
  };
  const pick = (arr, seed) => arr[Math.floor(seed * arr.length) % arr.length];
  const wrapNoise = (x, y, s) => hash2(((x % TILE_PX) + TILE_PX) % TILE_PX, ((y % TILE_PX) + TILE_PX) % TILE_PX, s);

  const GRASS = [0x58a838, 0x62b23e, 0x6cbb44, 0x77c64d, 0x4f9c33];
  const grassFn = (x, y, s) => {
    const n = wrapNoise(x, y, s);
    const clump = wrapNoise(x >> 1, y >> 1, s + 9);
    let c = pick(GRASS, n * 0.55 + clump * 0.45);
    if (wrapNoise(x, y, s + 3) > 0.93) c = shade(c, 0.78);
    if (wrapNoise(x, y, s + 5) > 0.95) c = shade(c, 1.2);
    return c;
  };
  fill(TILE.GRASS, (x, y) => grassFn(x, y, 11));

  fill(TILE.FLOWER_GRASS, (x, y) => grassFn(x, y, 11));
  const flowerCols = [0xfff2c9, 0xffd23f, 0xff7b9c, 0x9bd3ff, 0xffffff];
  for (let i = 0; i < 4; i++) {
    const fx = rng.int(1, 14);
    const fy = rng.int(1, 14);
    const fc = flowerCols[i % flowerCols.length];
    px(TILE.FLOWER_GRASS, fx, fy, fc);
    px(TILE.FLOWER_GRASS, fx, fy + 1, 0x3f8a2c);
  }

  const DIRT = [0x7b5436, 0x86603f, 0x6f4a30, 0x92694a, 0x6a452c];
  const dirtFn = (x, y, s) => {
    const n = wrapNoise(x, y, s);
    let c = pick(DIRT, n * 0.6 + wrapNoise(x >> 1, y >> 1, s + 2) * 0.4);
    if (wrapNoise(x, y, s + 7) > 0.94) c = 0xa28b72;
    if (wrapNoise(x, y, s + 8) > 0.95) c = 0x4f3523;
    return c;
  };
  fill(TILE.DIRT, (x, y) => dirtFn(x, y, 21));

  fill(TILE.GRASS_SIDE, (x, y) => {
    const depth = 3 + Math.floor(wrapNoise(x, 0, 31) * 3);
    const drip = wrapNoise(x, 1, 32) > 0.75 ? 2 : 0;
    if (y < depth + drip - (y > 4 ? 1 : 0) && y < 7) return grassFn(x, y, 12);
    return dirtFn(x, y, 22);
  });
  for (let x = 0; x < TILE_PX; x++) {
    const d = 3 + Math.floor(wrapNoise(x, 0, 31) * 3) + (wrapNoise(x, 1, 32) > 0.75 ? 2 : 0);
    if (d < 8) px(TILE.GRASS_SIDE, x, Math.min(d, 7), 0x4a8d30);
  }

  const STONE = [0x8c9298, 0x969ca2, 0x80868c, 0xa0a6ac, 0x777d84];
  const stoneFn = (x, y, s) => {
    const n = wrapNoise(x, y, s);
    const c1 = wrapNoise(x >> 2, y >> 2, s + 4);
    let c = pick(STONE, n * 0.4 + c1 * 0.6);
    if (wrapNoise(x, y, s + 7) > 0.9) c = shade(c, 0.8);
    return c;
  };
  fill(TILE.STONE, (x, y) => stoneFn(x, y, 41));
  const crack = [
    [3, 2], [4, 3], [5, 3], [5, 4], [6, 5], [7, 5], [8, 6], [8, 7],
    [11, 10], [12, 11], [12, 12], [13, 12],
  ];
  crack.forEach(([x, y]) => px(TILE.STONE, x, y, 0x5e646a));

  fill(TILE.DARK_STONE, (x, y) => shade(stoneFn(x, y, 43), 0.62));

  fill(TILE.MOSS_STONE, (x, y) => {
    const n = fbmTile(x, y, 51);
    if (n > 0.52) return shade(grassFn(x, y, 14), 0.8);
    return stoneFn(x, y, 41);
  });

  function fbmTile(x, y, s) {
    return wrapNoise(x >> 2, y >> 2, s) * 0.55 + wrapNoise(x >> 1, y >> 1, s + 1) * 0.3 + wrapNoise(x, y, s + 2) * 0.15;
  }

  const COBS = [0x8a8f96, 0x9aa0a6, 0x7c8288, 0xa7a29a, 0x8d8a86, 0x73787f];
  fill(TILE.COBBLE, (x, y) => {
    const row = Math.floor(y / 4);
    const off = row % 2 === 0 ? 0 : 2;
    const sx = Math.floor((x + off) / 5);
    const ly = y % 4;
    const lx = (x + off) % 5;
    if (ly === 3 || lx === 4) return 0x4d4d52;
    let c = pick(COBS, hash2(sx, row, 61));
    if (ly === 0) c = shade(c, 1.12);
    if (wrapNoise(x, y, 62) > 0.88) c = shade(c, 0.88);
    return c;
  });

  fill(TILE.BRICK, (x, y) => {
    const row = Math.floor(y / 4);
    const off = row % 2 === 0 ? 0 : 4;
    const bx = Math.floor((x + off) / 8);
    const ly = y % 4;
    const lx = (x + off) % 8;
    if (ly === 3 || lx === 7) return 0x55545a;
    let c = pick([0x9a9ca2, 0x8c8f96, 0xa8aab0, 0x84878e], hash2(bx, row, 71));
    if (ly === 0) c = shade(c, 1.1);
    if (wrapNoise(x, y, 72) > 0.9) c = shade(c, 0.86);
    return c;
  });

  const SNOW = [0xf4f8ff, 0xe8f0fa, 0xdce8f6, 0xffffff];
  fill(TILE.SNOW, (x, y) => pick(SNOW, wrapNoise(x, y, 81) * 0.5 + wrapNoise(x >> 1, y >> 1, 82) * 0.5));
  fill(TILE.SNOW_SIDE, (x, y) => {
    const depth = 3 + Math.floor(wrapNoise(x, 0, 83) * 4);
    if (y < depth) return pick(SNOW, wrapNoise(x, y, 81));
    return stoneFn(x, y, 41);
  });

  const ICEPAL = [0xa9dcff, 0xb9e4ff, 0x9bd2f6, 0xc8ecff, 0x8fc8ee];
  fill(TILE.ICE, (x, y) => {
    let c = pick(ICEPAL, wrapNoise(x >> 1, y >> 1, 131) * 0.6 + wrapNoise(x, y, 132) * 0.4);
    const d1 = (x + y * 2) % 11;
    const d2 = (x * 2 - y + 40) % 13;
    if (d1 === 0 && wrapNoise(x, y, 133) > 0.35) c = 0xe6f8ff;
    if (d2 === 0 && wrapNoise(x, y, 134) > 0.5) c = 0x6fb4e4;
    if (wrapNoise(x, y, 135) > 0.95) c = 0xffffff;
    return c;
  });
  fill(TILE.FROST_GRASS, (x, y) => {
    const g = grassFn(x, y, 11);
    const flake = wrapNoise(x >> 1, y >> 1, 141) * 0.6 + wrapNoise(x, y, 142) * 0.4;
    if (flake > 0.52) return pick(SNOW, wrapNoise(x, y, 143));
    return g;
  });

  const SAND = [0xe5d29a, 0xdcc78c, 0xefdca6, 0xd3bd80];
  fill(TILE.SAND, (x, y) => {
    let c = pick(SAND, wrapNoise(x, y, 91) * 0.6 + wrapNoise(x >> 1, y >> 1, 92) * 0.4);
    if (wrapNoise(x, y, 93) > 0.94) c = shade(c, 0.85);
    return c;
  });

  fill(TILE.FARMLAND, (x, y) => {
    const furrow = y % 4 < 2;
    const base = furrow ? [0x4d3220, 0x56382a, 0x472d1e] : [0x6d4a30, 0x77543a, 0x62422b];
    let c = pick(base, wrapNoise(x, y, 101));
    if (!furrow && y % 4 === 2) c = shade(c, 1.15);
    return c;
  });

  fill(TILE.GRAVEL, (x, y) => {
    const n = wrapNoise(x >> 1, y, 111);
    return pick([0x7d756b, 0x8d8579, 0x6c655d, 0x9a9184, 0x5f5953], n * 0.7 + wrapNoise(x, y, 112) * 0.3);
  });

  fill(TILE.PATH, (x, y) => {
    let c = pick([0xb08a5c, 0xa57f53, 0xbd9868, 0x9c774c, 0xc4a070], wrapNoise(x, y, 121) * 0.5 + wrapNoise(x >> 1, y >> 1, 122) * 0.5);
    if (wrapNoise(x, y, 123) > 0.93) c = 0x7a7c80;
    if (wrapNoise(x, y, 124) > 0.95) c = shade(c, 0.78);
    return c;
  });

  const BASALT = [0x2b2b31, 0x34343b, 0x25252b, 0x3d3d45, 0x1f1f24];
  const basaltFn = (x, y, s) => {
    let c = pick(BASALT, wrapNoise(x, y, s) * 0.45 + wrapNoise(x >> 1, y >> 1, s + 3) * 0.55);
    if (wrapNoise(x, y, s + 5) > 0.94) c = 0x4a4a54;
    return c;
  };
  fill9(TILE.BASALT, (x, y) => basaltFn(x, y, 151));
  const ASHC = [0x58585e, 0x4d4d53, 0x65656b, 0x424248, 0x6f6f75];
  fill9(TILE.ASH, (x, y) => {
    let c = pick(ASHC, wrapNoise(x, y, 161) * 0.5 + wrapNoise(x >> 1, y >> 1, 162) * 0.5);
    if (wrapNoise(x, y, 163) > 0.92) c = shade(c, 0.74);
    return c;
  });
  const LAVAC = [0xff6a1a, 0xff8a24, 0xe04a0a, 0xffb236, 0xff4e10];
  fill9(TILE.LAVA, (x, y) => {
    let c = pick(LAVAC, wrapNoise(x, y, 171) * 0.5 + wrapNoise(x >> 1, y >> 1, 172) * 0.5);
    if (wrapNoise(x, y, 173) > 0.9) c = 0xffd870;
    if (wrapNoise(x >> 1, y >> 1, 174) > 0.86) c = shade(c, 0.55);
    return c;
  });
  fill9(TILE.CINDER, (x, y) => {
    let c = basaltFn(x, y, 181);
    const d1 = (x * 3 + y * 2) % 13;
    const d2 = (x * 2 - y * 3 + 52) % 11;
    if ((d1 === 0 && wrapNoise(x, y, 182) > 0.3) || (d2 === 0 && wrapNoise(x, y, 183) > 0.45)) c = wrapNoise(x, y, 184) > 0.5 ? 0xff7a1c : 0xd8420a;
    return c;
  });
  fill9(TILE.OBSIDIAN, (x, y) => {
    let c = pick([0x16161b, 0x1d1d24, 0x121216, 0x24242c], wrapNoise(x >> 1, y >> 1, 191) * 0.6 + wrapNoise(x, y, 192) * 0.4);
    if ((x + y * 2) % 9 === 0 && wrapNoise(x, y, 193) > 0.5) c = 0x4a4a68;
    return c;
  });
  const FLAG = [0xd9d6cf, 0xcfccc4, 0xe4e1da, 0xc4c1ba, 0xd2cfc8];
  fill9(TILE.FLAGSTONE, (x, y) => {
    let c = pick(FLAG, wrapNoise(x, y, 201) * 0.4 + wrapNoise(x >> 2, y >> 2, 202) * 0.6);
    if (x % 8 === 0 || y % 8 === 0) c = shade(c, 0.82);
    if (wrapNoise(x, y, 203) > 0.96) c = 0xb8a65e;
    return c;
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { texture: tex, canvas };
}

export function tileUV(tile, inset = 0.35) {
  const col = tile % ATLAS_TILES;
  const row = Math.floor(tile / ATLAS_TILES);
  const e = inset / (TILE_PX * ATLAS_TILES);
  const u0 = col / ATLAS_TILES + e;
  const u1 = (col + 1) / ATLAS_TILES - e;
  const vTop = 1 - row / ATLAS_TILES - e;
  const vBot = 1 - (row + 1) / ATLAS_TILES + e;
  return { u0, u1, vTop, vBot };
}

export { hex, mix };
