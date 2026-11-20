import * as THREE from 'three';
import { RNG, hash2, shade, hex, mix, clamp } from './voxel.js';

export const hideUniforms = {
  uPlayerScreen: { value: new THREE.Vector2(-9999, -9999) },
  uPlayerDepth: { value: 10 },
  uHideRadius: { value: 40 },
};

/**
 * Occlusion hole in framebuffer pixels. Caps well below a viewport-sized
 * Bayer blob so roofs and cobbles beside the hero stay solid.
 */
export function hideRadiusPx(bufferW, bufferH, playerPxH = 0) {
  const short = Math.max(1, Math.min(bufferW, bufferH));
  const fromHero = playerPxH > 0 ? playerPxH * 1.2 : short * 0.075;
  return Math.max(28, Math.min(fromHero, short * 0.12));
}

/** Tight screen-door of geometry that sits between the camera and the hero. */
export function patchHide(material, key = 'hide') {
  if (!material) return material;
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
  vec2 dlt = gl_FragCoord.xy - uPlayerScreen;
  float hd = length(dlt);
  if (vHideDepth < uPlayerDepth - 0.8 && hd < uHideRadius) {
    float t = clamp(hd / uHideRadius, 0.0, 1.0);
    float bayer = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (bayer > t * t * 0.92) discard;
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

/** Lifted blacks so unlit faces stay readable under AgX instead of crushing to ink. */
export const toonRamp = makeGradientMap([0.22, 0.36, 0.5, 0.64, 0.76, 0.86, 0.94, 1.0]);

export function toonMaterial(opts = {}) {
  const m = new THREE.MeshToonMaterial({ gradientMap: toonRamp, ...opts });
  return m;
}

/** Scrolling tiled cloud-shadow multiply. Shared so Sky can tick one clock. */
export const cloudShadowUniforms = {
  uCloudTime: { value: 0 },
  uCloudAmt: { value: 1 },
};

export const CLOUD_SHADOW_GLSL = `
float cloudHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cloudNoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cloudHash(i), cloudHash(i + vec2(1.0, 0.0)), f.x), mix(cloudHash(i + vec2(0.0, 1.0)), cloudHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float cloudFbm(vec2 p){
  float a = 0.0; float w = 0.5;
  for (int i = 0; i < 4; i++) { a += w * cloudNoise(p); p = p * 2.07 + 13.1; w *= 0.5; }
  return a;
}
float cloudShade(vec2 xz, float t, float amt){
  float n = cloudFbm(xz * 0.018 + vec2(t * 0.012, t * 0.007));
  n += 0.32 * cloudFbm(xz * 0.007 - vec2(t * 0.005, -t * 0.004) + 4.7);
  float sh = smoothstep(0.40, 0.62, n);
  return mix(1.0, 0.78, sh * amt);
}
`;

/**
 * Cheap lava emissive on atlas UVs. LAVA is fill9 around tile 58 (cols 9-11, rows 2-4).
 * Cloud shadows darken the ground with a soft scrolling noise multiply (never a mesh
 * between the camera and the hunter).
 */
export function patchTerrainGlow(material, key = 'terrainGlow') {
  if (!material) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCloudTime = cloudShadowUniforms.uCloudTime;
    shader.uniforms.uCloudAmt = cloudShadowUniforms.uCloudAmt;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCloudWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vCloudWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCloudWorld;
uniform float uCloudTime;
uniform float uCloudAmt;
${CLOUD_SHADOW_GLSL}`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
#ifdef USE_MAP
{
  vec2 tu = vec2(vMapUv.x * 16.0, (1.0 - vMapUv.y) * 16.0);
  float lava = step(9.0, tu.x) * step(tu.x, 12.0) * step(2.0, tu.y) * step(tu.y, 5.0);
  float pulse = 0.75 + 0.25 * sin(vMapUv.x * 48.0 + vMapUv.y * 32.0);
  totalEmissiveRadiance += vec3(1.4, 0.42, 0.07) * lava * pulse;
}
#endif`
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
gl_FragColor.rgb *= cloudShade(vCloudWorld.xz, uCloudTime, uCloudAmt);`
      );
  };
  const prev = material.customProgramCacheKey;
  material.customProgramCacheKey = function terrainGlowKey() {
    return (prev ? prev.call(this) : '') + key + 'cloudShadow';
  };
  return material;
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

  const GRASS = [0x5a9640, 0x629e42, 0x6aa848, 0x6b9a32, 0x64a444, 0x7ab03c];
  const grassFn = (x, y, s) => {
    const n = wrapNoise(x, y, s);
    const clump = wrapNoise(x >> 1, y >> 1, s + 9);
    return mix(0x5a9a3e, 0x72b04a, n * 0.5 + clump * 0.5);
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
    const deep = 0.98 + (1 - y / 16) * 0.02;
    return shade(grassFn(x, y, 12), deep);
  });

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

  const COBS = [0xd2ae78, 0xc49a64, 0xe0c08a, 0xb89058, 0xd8b888, 0xc09060, 0xa87e50, 0xe8d09a];
  fill(TILE.COBBLE, (x, y) => {
    const warp = Math.floor(wrapNoise(x, 0, 59) * 2);
    const row = Math.floor((y + warp) / 4);
    const off = row % 2 === 0 ? 0 : 2 + Math.floor(wrapNoise(row, 0, 60) * 2);
    const sx = Math.floor((x + off) / 5);
    const ly = (y + warp) % 4;
    const lx = (x + off) % 5;
    const moss = wrapNoise(sx, row, 64) > 0.78;
    if (ly === 3 || lx === 4) return moss ? 0x7a6238 : 0x8c6a40;
    let c = pick(COBS, hash2(sx, row, 61));
    if (ly === 0) c = shade(c, 1.1);
    if (moss && ly > 1) c = mix(c, 0x6a7a42, 0.22);
    if (wrapNoise(x, y, 62) > 0.84) c = mix(c, 0x8a6340, 0.35);
    if (wrapNoise(x, y, 63) > 0.92) c = shade(c, 0.88);
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

  const SNOW = [0xdce6f2, 0xd0dcec, 0xc4d4e6, 0xe8eef6];
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

  const SAND = [0xe5d29a, 0xdcc78c, 0xefdca6, 0xd3bd80, 0xc8ae72, 0xf0e0b0];
  fill(TILE.SAND, (x, y) => {
    const dune = wrapNoise(x >> 2, y >> 2, 90);
    let c = pick(SAND, wrapNoise(x, y, 91) * 0.45 + wrapNoise(x >> 1, y >> 1, 92) * 0.3 + dune * 0.25);
    if (wrapNoise(x, y, 93) > 0.94) c = shade(c, 0.85);
    if (dune > 0.72) c = shade(c, 1.08);
    if (dune < 0.28) c = shade(c, 0.9);
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
  const FLAG = [0xead49e, 0xdcb888, 0xf0d8a8, 0xd0aa78, 0xe4c898];
  fill9(TILE.FLAGSTONE, (x, y) => {
    let c = pick(FLAG, wrapNoise(x, y, 201) * 0.4 + wrapNoise(x >> 2, y >> 2, 202) * 0.6);
    if (x % 8 === 0 || y % 8 === 0) c = shade(c, 0.86);
    if (wrapNoise(x, y, 203) > 0.96) c = 0xc4a65e;
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
