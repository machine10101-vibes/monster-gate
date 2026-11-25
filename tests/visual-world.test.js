import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { TILE, cloudShadeAt, CLOUD_DRIFT } from '../src/engine/materials.js';
import { QUALITIES, survivalBudget } from '../src/engine/quality.js';
import { originOf, paintTileMap, sampleBlended, sampleTile, TILES } from '../src/world/tiles.js';
import { chartedAnchor, chartedWeight, oceanWeight, rasterPlaymap } from '../src/world/playmap.js';
import { sideTilesFor, generateWorld, buildTerrainMeshes, GUILD, W, WATER_Y } from '../src/world/terrain.js';
import { JUNGLE_SPECS, jungleFeature } from '../src/world/jungle.js';
import { generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

function neighborGrid(center, neighbor, w = 9) {
  const top = new Uint16Array(w * w);
  top.fill(neighbor);
  const mid = (w >> 1) * w + (w >> 1);
  top[mid] = center;
  return { top, w };
}

test('renderer uses AgX tone mapping and a lifted toon ramp', () => {
  const main = src('src/main.js');
  const mats = src('src/engine/materials.js');
  assert.match(main, /AgXToneMapping/);
  assert.match(main, /SRGBColorSpace/);
  assert.match(mats, /0\.22,\s*0\.36,\s*0\.5/);
  assert.doesNotMatch(mats, /makeGradientMap\(\[0,\s*0\.2/);
});

test('meadow grass stays grass instead of wearing into dirt stripes', () => {
  const ring = src('src/world/ring.js');
  const jungle = src('src/world/jungle.js');
  const mats = src('src/engine/materials.js');
  const terrain = src('src/world/terrain.js');
  assert.doesNotMatch(ring, /wear < 0\.22 && h < 5/);
  assert.match(ring, /const hue = fbm/);
  assert.doesNotMatch(jungle, /nB > 0\.82\) set\(ZONE\.FOREST, TILE\.DIRT/);
  assert.match(mats, /0x6b9a32/);
  assert.match(mats, /fill\(TILE\.GRASS_SIDE/);
  assert.doesNotMatch(mats, /mix\(dirtFn\(x, y, 22\), grassFn/);
  assert.match(terrain, /\[TILE\.GRASS\]: \[TILE\.GRASS_SIDE, TILE\.GRASS_SIDE\]/);
});

test('path sides follow snow, sand and ash instead of always grass', () => {
  const snow = neighborGrid(TILE.PATH, TILE.SNOW);
  assert.deepEqual(sideTilesFor(TILE.PATH, snow.top, snow.w, snow.w, 4, 4), [TILE.SNOW_SIDE, TILE.SNOW_SIDE]);
  const sand = neighborGrid(TILE.PATH, TILE.SAND);
  assert.deepEqual(sideTilesFor(TILE.PATH, sand.top, sand.w, sand.w, 4, 4), [TILE.SAND, TILE.SAND]);
  const ash = neighborGrid(TILE.PATH, TILE.ASH);
  assert.deepEqual(sideTilesFor(TILE.PATH, ash.top, ash.w, ash.w, 4, 4), [TILE.ASH, TILE.BASALT]);
  const grass = neighborGrid(TILE.PATH, TILE.GRASS);
  assert.deepEqual(sideTilesFor(TILE.PATH, grass.top, grass.w, grass.w, 4, 4), [TILE.GRASS_SIDE, TILE.GRASS_SIDE]);
});

test('world map samples blend biome borders instead of darkening tile edges', () => {
  const tiles = src('src/world/tiles.js');
  const map = src('src/ui/worldmap.js');
  const world = src('src/world/world.js');
  const play = src('src/world/playmap.js');
  assert.match(tiles, /export function sampleBlended/);
  assert.doesNotMatch(tiles, /if \(edge < 0\.02\)/);
  assert.match(map, /paintTileMap\(c, tile\)/);
  assert.match(map, /#6d5a44/);
  assert.match(world, /rasterPlaymap/);
  assert.match(world, /export const MAP_PX = 1/);
  assert.doesNotMatch(world, /function blurMinimap/);
  assert.doesNotMatch(world, /function blendMinimapSeams/);
  assert.doesNotMatch(world, /paintTileMap\(planned, tile\)/);
  assert.match(play, /uncharted/);
  assert.match(play, /oceanWeight/);
  assert.match(play, /chartedWeight/);
  assert.doesNotMatch(tiles, /Math\.floor\(v \* 14\) % 2/);
  assert.match(tiles, /MAP_BORDER_PX = 24/);
  assert.match(tiles, /MAP_WARP_PX = 16/);
  assert.match(tiles, /const wx = tile\.tx \+ u/);
  assert.doesNotMatch(world, /#1a140e/);
  assert.doesNotMatch(world, /\[240, 245, 255\]/);
  assert.match(world, /\[168, 186, 210\]/);
  assert.match(world, /\[204, 172, 118\]/);
  assert.doesNotMatch(world, /\[120, 108, 96\]/);
  assert.doesNotMatch(world, /\[150, 146, 138\]/);
  const snow = TILES.find((t) => t.kind === 'snowfall');
  const gold = TILES.find((t) => t.kind === 'goldmead');
  const ash = TILES.find((t) => t.kind === 'ashroad');
  const hare = TILES.find((t) => t.kind === 'harefield');
  assert.ok(snow && gold && ash && hare);
  const edge = sampleBlended(snow, 0.02, 0.5);
  const mid = sampleTile(snow, 0.5, 0.5);
  const neighbor = sampleTile(gold, 0.98, 0.5);
  const distEdge = Math.abs(edge.r - neighbor.r) + Math.abs(edge.g - neighbor.g) + Math.abs(edge.b - neighbor.b);
  const distMid = Math.abs(mid.r - neighbor.r) + Math.abs(mid.g - neighbor.g) + Math.abs(mid.b - neighbor.b);
  assert.ok(distEdge < distMid, `edge ${distEdge} mid ${distMid}`);
  const ashSouth = sampleBlended(ash, 0.5, 0.98);
  const ashMid = sampleTile(ash, 0.5, 0.5);
  const meadow = sampleTile(hare, 0.5, 0.02);
  const ashEdge = Math.abs(ashSouth.r - meadow.r) + Math.abs(ashSouth.g - meadow.g) + Math.abs(ashSouth.b - meadow.b);
  const ashFar = Math.abs(ashMid.r - meadow.r) + Math.abs(ashMid.g - meadow.g) + Math.abs(ashMid.b - meadow.b);
  assert.ok(ashEdge < ashFar, `ash edge ${ashEdge} mid ${ashFar}`);
});

test('quality presets expose scatter, viewFar and glow, and phones get a lighter budget', () => {
  assert.ok(QUALITIES.every((q) => q.scatter > 0 && q.viewFar > 0 && q.glow > 0));
  const low = QUALITIES.find((q) => q.id === 'low');
  const high = QUALITIES.find((q) => q.id === 'high');
  assert.ok(low.scatter < high.scatter);
  assert.ok(low.viewFar < high.viewFar);
  const phone = survivalBudget(high, true, { screenW: 390, innerW: 390, screenH: 844, innerH: 844 });
  assert.ok(phone.scatter <= 0.32);
  assert.ok(phone.viewFar <= 100);
  assert.ok(phone.glow <= 0.4);
});

test('view distance tracks fog and parks land beyond it', () => {
  const main = src('src/main.js');
  const sky = src('src/world/sky.js');
  const world = src('src/world/world.js');
  const flags = src('src/debug/flags.js');
  assert.match(main, /viewDistance\(\)/);
  assert.match(main, /parkBeyond\(startX, startZ, this\.viewDistance\(\)\)/);
  assert.match(main, /parkBeyond\(px, pz, this\.viewDistance\(\)\)/);
  assert.match(world, /streamAround\(/);
  assert.match(flags, /streamAround/);
  assert.match(main, /PerspectiveCamera\(38, 1, 0\.3, 240\)/);
  assert.doesNotMatch(main, /PerspectiveCamera\(38, 1, 0\.3, 320\)/);
  assert.match(sky, /viewFar/);
  assert.match(sky, /cloudShadowUniforms/);
});

test('character camp uses a late-afternoon sky, smooth ground and oak canopy', () => {
  const camp = src('src/world/camp.js');
  const select = src('src/ui/charselect.js');
  assert.match(select, /setHour\(16\.7\)/);
  assert.match(select, /g\.sky\.camp = true/);
  assert.match(camp, /CircleGeometry/);
  assert.match(camp, /M\.oaks/);
  assert.doesNotMatch(camp, /CylinderGeometry\(30, 31\.5, 2/);
});

test('build tag is readable and stays on screen with the HUD', () => {
  const theme = src('src/ui/theme.css');
  assert.match(theme, /\.build-id \{[\s\S]*font-size:\s*11px/);
  assert.match(theme, /rgba\(243, 226, 176, 0\.95\)/);
  assert.match(theme, /\.build-id \{[\s\S]*border-radius:\s*8px/);
  assert.match(theme, /\.build-id \{[\s\S]*background:\s*rgba\(8, 10, 16, 0\.72\)/);
  assert.doesNotMatch(theme, /body:has\(#hud:not\(\.hidden\)\) \.build-id/);
});

test('overhead tile shots raise the camera far plane past the fog clip', () => {
  const view = src('src/world/tileview.js');
  assert.match(view, /camFar:\s*cam\.far/);
  assert.match(view, /cam\.far = Math\.max\(cam\.far \|\| 0, dist \+ TILE_SIZE\)/);
  assert.match(view, /cam\.far = saved\.camFar/);
});

test('desert dunes keep a continuous heightfield instead of 0.5-unit terraces', () => {
  const ring = src('src/world/ring.js');
  const terrain = src('src/world/terrain.js');
  const desert = src('src/world/desert.js');
  const world = src('src/world/world.js');
  assert.match(ring, /else if \(!spec\.desert\) H\[i\] = Math\.round\(H\[i\] \* 2\) \/ 2/);
  assert.match(ring, /smooth: !!spec\.desert/);
  assert.match(ring, /H\[i\] = s \/ 12/);
  assert.match(terrain, /const roll = smooth && !cliffCell/);
  assert.match(terrain, /if \(roll && !offTile && !cliffCell\(nCellX, nCellZ\)\) continue/);
  assert.match(terrain, /tile === TILE\.SAND/);
  assert.match(desert, /top\[i\] = TILE\.SAND/);
  assert.doesNotMatch(desert, /n < 0\.18 \? TILE\.DIRT/);
  assert.match(world, /land\.data\.smooth/);
  assert.match(world, /smooth: !!land\.data\.smooth/);
});

test('cloud shadows darken the ground and never cover the play view', () => {
  const sky = src('src/world/sky.js');
  const mats = src('src/engine/materials.js');
  const terrain = src('src/world/terrain.js');
  const world = src('src/world/world.js');
  assert.match(sky, /fog:\s*false/);
  assert.match(sky, /puffs \* hz/);
  assert.match(sky, /cloudShadowUniforms\.uCloudTime/);
  assert.match(sky, /this\.clouds\.visible = false/);
  assert.doesNotMatch(sky, /CircleGeometry/);
  assert.doesNotMatch(sky, /rng\.range\(6, 11\)/);
  assert.match(mats, /cloudShade/);
  assert.match(mats, /mix\(1\.0, uCloudDark/);
  assert.match(mats, /uCloudForce/);
  assert.match(mats, /mix\(0\.52, 0\.28, uCloudForce\)/);
  assert.doesNotMatch(mats, /max\(smoothstep/);
  assert.match(mats, /outgoingLight \*= cloudShade/);
  assert.match(mats, /#include <opaque_fragment>/);
  assert.match(world, /uCloudDark: cloudShadowUniforms\.uCloudDark/);
  assert.match(src('src/world/sky.js'), /cloudShadowStrong/);
  assert.match(src('src/world/sky.js'), /uCloudDark\.value = 0\.25/);
  assert.doesNotMatch(src('src/world/sky.js'), /_cloudTimeFrozen/);
  assert.match(src('src/main.js'), /parseCloudShadowFlag/);
  assert.match(src('src/main.js'), /this\.debug && this\.sky\?\.cloudShadowStrong/);
  assert.doesNotMatch(src('src/main.js'), /rememberHunter\([\s\S]{0,400}hour/);
  assert.match(mats, /0\.98 \+ \(1 - y \/ 16\) \* 0\.02/);
  assert.match(mats, /0xd2ae78/);
  assert.match(terrain, /matchTop \? 0\.96/);
});

test('water, lava and lamps get cheap glow without a bloom pass', () => {
  const world = src('src/world/world.js');
  const mats = src('src/engine/materials.js');
  assert.match(world, /aShore/);
  assert.match(world, /uFoam/);
  assert.match(world, /buildLavaGlow/);
  assert.match(world, /toneMapped:\s*false/);
  assert.match(mats, /patchTerrainGlow/);
  assert.match(mats, /prev\.call\(this\)/);
  assert.doesNotMatch(world, /UnrealBloomPass|EffectComposer/);
  assert.doesNotMatch(world, /#include <tonemapping_pars_fragment>/);
  assert.doesNotMatch(src('src/world/sky.js'), /#include <tonemapping_pars_fragment>/);
  assert.match(world, /cornerDist/);
  assert.match(world, /smoothstep\(0\.48, 0\.04, d\)/);
  assert.match(world, /WATER_SURFACE/);
  assert.match(world, /0x124a78/);
  assert.match(world, /0x4eb8c4/);
  assert.match(world, /mix\(0\.97, 1\.0, depthK\)/);
  assert.match(world, /depthWrite:\s*true/);
  assert.match(world, /name = 'mg-water'/);
  assert.match(world, /vec2 p = vWorld\.xz/);
  assert.match(world, /p\.y \* 1\.7/);
  assert.doesNotMatch(world, /p\.z \*/);
  assert.doesNotMatch(world, /smoothstep\(0\.0, 0\.03, vDepth\)/);
  assert.doesNotMatch(world, /foamNoise/);
  assert.doesNotMatch(world, /fwidth|dFdx|dFdy/);
  assert.doesNotMatch(world, /max\(vShore, smoothstep/);
  assert.match(world, /depthAt\(land, x \+ step, z \+ step\)/);
});

function paintMock(tile, s = 48) {
  let pixels = null;
  const canvas = {
    width: s,
    height: s,
    getContext() {
      return {
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        putImageData(img) { pixels = img.data; },
      };
    },
  };
  paintTileMap(canvas, tile);
  return pixels;
}

test('world map raster is one resolution with a 16-24px warped border, not a global blur', () => {
  const tiles = src('src/world/tiles.js');
  const world = src('src/world/world.js');
  const hud = src('src/ui/hud.js');
  const style = src('src/style.css');
  const play = src('src/world/playmap.js');
  assert.doesNotMatch(tiles, /Math\.round\(Math\.max\(0\.06/);
  assert.doesNotMatch(tiles, /\* 0\.42/);
  assert.doesNotMatch(tiles, /const band = 0\.44/);
  assert.doesNotMatch(world, /function blurMinimap/);
  assert.match(world, /MAP_PX = 1/);
  assert.match(world, /stampTownIcon/);
  assert.match(world, /rasterPlaymap/);
  assert.match(hud, /imageSmoothingEnabled = false/);
  assert.match(style, /\.bigmap \{[\s\S]*image-rendering:\s*auto/);
  assert.match(style, /font-size: 13px/);
  assert.match(play, /applyFrame/);
  assert.match(play, /compass/);
  const snow = TILES.find((t) => t.kind === 'snowfall');
  const gold = TILES.find((t) => t.kind === 'goldmead');
  const sea = TILES.find((t) => t.biome === 'sea');
  const data = paintMock(snow, 48);
  assert.ok(data && data.length === 48 * 48 * 4);
  const mid = paintMock(snow, 32);
  let white = 0;
  for (let i = 0; i < mid.length; i += 4) {
    if (mid[i] > 210 && mid[i + 1] > 210 && mid[i + 2] > 210) white++;
  }
  assert.ok(white < 40, `snow interior should not be a white halo (${white} near-white px)`);
  const edge = sampleBlended(snow, 0.02, 0.5);
  const center = sampleTile(snow, 0.5, 0.5);
  const neighbor = sampleTile(gold, 0.98, 0.5);
  const distEdge = Math.abs(edge.r - neighbor.r) + Math.abs(edge.g - neighbor.g) + Math.abs(edge.b - neighbor.b);
  const distMid = Math.abs(center.r - neighbor.r) + Math.abs(center.g - neighbor.g) + Math.abs(center.b - neighbor.b);
  assert.ok(distEdge < distMid, `border ${distEdge} interior ${distMid}`);
  if (sea) {
    const seaPix = paintMock(sea, 24);
    let blue = 0;
    for (let i = 0; i < seaPix.length; i += 4) if (seaPix[i + 2] > seaPix[i] && seaPix[i + 2] > 80) blue++;
    assert.ok(blue > 200, 'east-edge sea tiles paint as water, not grey fill');
  }
});

test('Brookside grass skips per-cell UV spin and dark speckle', () => {
  const terrain = src('src/world/terrain.js');
  const mats = src('src/engine/materials.js');
  const player = src('src/entities/player.js');
  assert.match(terrain, /const grassy = tl === TILE\.GRASS/);
  assert.match(terrain, /const rot = grassy \? 0/);
  assert.match(terrain, /grassy \? \[1, 1, 1, 1\]/);
  assert.doesNotMatch(mats, /wrapNoise\(x, y, s \+ 3\) > 0\.93/);
  assert.doesNotMatch(mats, /patch < 0\.32/);
  assert.doesNotMatch(player, /RingGeometry\(0\.48, 0\.86/);
  assert.doesNotMatch(player, /color: 0xf4efe0/);
  assert.match(player, /this\.groundRing = null/);
  assert.doesNotMatch(player, /groundRing\.visible/);
  assert.doesNotMatch(player, /opacity: 0\.95/);
  assert.doesNotMatch(player, /wet \? 0\.88 : 0\.8/);
  assert.doesNotMatch(terrain, /skipThinGrassLips/);
  assert.doesNotMatch(src('src/world/world.js'), /skipThinGrassLips/);
  assert.match(terrain, /weldCorner/);
  assert.match(terrain, /!inTile\(cx, cz\)/);
  assert.match(terrain, /offTile/);
  assert.match(terrain, /skirtOk/);
  assert.match(terrain, /nt !== TILE\.LAVA/);
  assert.match(terrain, /nh - \(nextWater \? 0\.28 : 0\.08\)/);
  assert.doesNotMatch(terrain, /waterDrop \? 4\.001/);
});

test('Oakhollow NE of the Guild still has 1-unit grass terraces that the skirt covers', () => {
  const data = generateWorld();
  let lips = 0;
  const x0 = Math.min(W - 1, GUILD.x + 2);
  const x1 = Math.min(W, GUILD.x + 30);
  const z0 = Math.max(0, GUILD.z - 28);
  const z1 = Math.min(W, GUILD.z + 6);
  for (let z = z0; z < z1; z++) {
    for (let x = x0; x < x1; x++) {
      const i = z * W + x;
      const h = data.H[i];
      const tl = data.top[i];
      const grassy = tl === TILE.GRASS || tl === TILE.FLOWER_GRASS;
      if (!grassy) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
        const nh = data.H[nz * W + nx];
        const nt = data.top[nz * W + nx];
        const nbGrassy = nt === TILE.GRASS || nt === TILE.FLOWER_GRASS;
        if (nbGrassy && h - nh > 0.05 && h - nh <= 1.001) lips++;
      }
    }
  }
  assert.ok(lips > 30, `Oakhollow NE of Guild still has terrace drops to skirt (${lips})`);
});

function gridTopYs(group) {
  const map = new Map();
  group.traverse((m) => {
    const pos = m.geometry?.attributes?.position;
    const nor = m.geometry?.attributes?.normal;
    if (!pos || !nor) return;
    for (let i = 0; i < pos.count; i++) {
      if (nor.getY(i) < 0.3) continue;
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const gx = Math.round(x);
      const gz = Math.round(z);
      if (Math.abs(x - gx) > 0.02 || Math.abs(z - gz) > 0.02) continue;
      const k = `${gx},${gz}`;
      const s = map.get(k) || [];
      if (!s.some((v) => Math.abs(v - y) < 0.02)) s.push(y);
      map.set(k, s);
    }
  });
  return map;
}

function grassCracks(data, group, x0, x1, z0, z1, ox = 0, oz = 0) {
  const ys = gridTopYs(group);
  const width = Math.sqrt(data.H.length);
  let cracks = 0;
  let samples = 0;
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const cells = [[x - 1, z - 1], [x - 1, z], [x, z - 1], [x, z]];
      let lo = 1e9;
      let hi = -1e9;
      let present = 0;
      let skip = false;
      for (const [cx, cz] of cells) {
        if (cx < 0 || cz < 0 || cx >= width || cz >= width) {
          skip = true;
          break;
        }
        present += 1;
        const tl = data.top[cz * width + cx];
        if (tl === TILE.LAVA) {
          skip = true;
          break;
        }
        const h = data.H[cz * width + cx];
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
      if (skip || present !== 4 || hi - lo > 1.001 || hi - lo < 0.05) continue;
      const got = ys.get(`${x + ox},${z + oz}`);
      if (!got) continue;
      samples += 1;
      if (got.length > 1) cracks += 1;
    }
  }
  return { cracks, samples };
}

test('grass terrace T-junctions weld so a 1-unit drop has one height per vertex', () => {
  const w = 6;
  const H = new Float32Array(w * w);
  const top = new Uint8Array(w * w);
  const tint = new Float32Array(w * w * 3);
  const zone = new Uint8Array(w * w);
  for (let z = 0; z < w; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      top[i] = TILE.GRASS;
      tint[i * 3] = 0.4;
      tint[i * 3 + 1] = 0.72;
      tint[i * 3 + 2] = 0.3;
      H[i] = x >= 3 ? 2 : 3;
    }
  }
  const mesh = buildTerrainMeshes({ H, top, tint, zone }, new THREE.MeshBasicMaterial(), { width: w, depth: w });
  const ys = gridTopYs(mesh);
  const seam = ys.get('3,2') || ys.get('3,3');
  assert.ok(seam && seam.length === 1, `T-junction vertex should weld to one Y, got ${seam}`);
  const { cracks, samples } = grassCracks({ H, top }, mesh, 1, 5, 1, 5);
  assert.ok(samples > 4, `expected skirt samples, got ${samples}`);
  assert.equal(cracks, 0, `synthetic terrace should not show sky cracks (${cracks})`);
});

test('tile borders emit overlapping skirts even when the neighbour matches height', () => {
  const w = 6;
  const H = new Float32Array(w * w);
  const top = new Uint8Array(w * w);
  const tint = new Float32Array(w * w * 3);
  const zone = new Uint8Array(w * w);
  for (let z = 0; z < w; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      top[i] = TILE.GRASS;
      tint[i * 3] = 0.4;
      tint[i * 3 + 1] = 0.72;
      tint[i * 3 + 2] = 0.3;
      H[i] = 2;
    }
  }
  const mesh = buildTerrainMeshes({ H, top, tint, zone }, new THREE.MeshBasicMaterial(), {
    width: w,
    depth: w,
    outside: () => 2,
  });
  let southLips = 0;
  mesh.traverse((m) => {
    const pos = m.geometry?.attributes?.position;
    const nor = m.geometry?.attributes?.normal;
    if (!pos || !nor) return;
    for (let i = 0; i < pos.count; i++) {
      if (nor.getY(i) > 0.25) continue;
      if (pos.getZ(i) > w - 0.55 && pos.getY(i) < 1.96) southLips += 1;
    }
  });
  assert.ok(southLips > 8, `south tile-edge should skirt into the neighbour (${southLips})`);
});

test('pass 41 waterline sits under shore sand with a thin foam line', () => {
  const world = src('src/world/world.js');
  const jungle = src('src/world/jungle.js');
  const terrain = src('src/world/terrain.js');
  assert.match(terrain, /WATER_SURFACE = 0\.28/);
  assert.match(world, /WATER_SURFACE/);
  assert.match(world, /smoothstep\(0\.48, 0\.04, d\)/);
  assert.doesNotMatch(world, /smoothstep\(1\.15, 0\.10, d\)/);
  assert.match(jungle, /lerp\(ih, 0\.32/);
  assert.match(terrain, /nh < WATER_Y \+ 0\.02/);
  assert.match(terrain, /wetTop/);
});

test('Oakhollow guild/tent and Brookside meadow skirts have no 1-unit cracks', () => {
  const oak = generateWorld();
  const oakMesh = buildTerrainMeshes(oak, new THREE.MeshBasicMaterial());
  const tent = grassCracks(oak, oakMesh, 76, 92, 58, 72);
  const guild = grassCracks(oak, oakMesh, GUILD.x, GUILD.x + 24, GUILD.z - 20, GUILD.z + 8);
  assert.ok(tent.samples + guild.samples > 20, `oak terrace samples ${tent.samples + guild.samples}`);
  assert.equal(tent.cracks, 0, `oak tent-right cracks ${tent.cracks}/${tent.samples}`);
  assert.equal(guild.cracks, 0, `oak guild cracks ${guild.cracks}/${guild.samples}`);

  openSouthPass(oak);
  openRingPasses(oak);
  const northEdge = new Float32Array(W);
  for (let x = 0; x < W; x++) northEdge[x] = oak.H[(W - 1) * W + x];
  const south = generateSouthford(northEdge);
  openValeSides(south);
  openSouthfordDesert(south);
  const ring = generateRing(oak, south);
  const brook = ring.find((l) => l.kind === 'brookside');
  assert.ok(brook);
  const brookMesh = buildTerrainMeshes(brook.data, new THREE.MeshBasicMaterial(), { ox: brook.x0, oz: brook.z0 });
  const meadow = grassCracks(brook.data, brookMesh, 8, 70, 70, 130, brook.x0, brook.z0);
  const upper = grassCracks(brook.data, brookMesh, 20, 90, 8, 50, brook.x0, brook.z0);
  const whole = grassCracks(brook.data, brookMesh, 1, W - 1, 1, W - 1, brook.x0, brook.z0);
  assert.ok(meadow.samples + upper.samples > 20, `brookside samples ${meadow.samples + upper.samples}`);
  assert.equal(meadow.cracks, 0, `brookside lower meadow cracks ${meadow.cracks}/${meadow.samples}`);
  assert.equal(upper.cracks, 0, `brookside upper cracks ${upper.cracks}/${upper.samples}`);
  assert.ok(whole.samples > 40, `brookside whole-tile samples ${whole.samples}`);
  assert.equal(whole.cracks, 0, `brookside whole-tile cracks ${whole.cracks}/${whole.samples}`);
});

test('hunter map paints uncharted parchment and one ocean, not biome blocks', () => {
  const unbuilt = TILES.find((t) => !t.built && t.biome !== 'sea');
  const sea = TILES.find((t) => t.biome === 'sea');
  const built = TILES.find((t) => t.kind === 'oakhollow');
  assert.ok(unbuilt && sea && built);
  const uo = originOf(unbuilt);
  const so = originOf(sea);
  assert.ok(chartedWeight(72, 76) > 0.8, 'oakhollow stays charted');
  assert.ok(chartedWeight(uo.x + 72, uo.z + 72) < 0.2, 'planned interior is uncharted');
  assert.ok(oceanWeight(so.x + 72, so.z + 72) > 0.7, 'south sea is one ocean');
  const rgba = rasterPlaymap({ width: 96, height: 96, minX: -48, minZ: 1080, scale: 1 });
  let blue = 0;
  for (let y = 40; y < 56; y++) {
    for (let x = 40; x < 56; x++) {
      const i = (y * 96 + x) * 4;
      if (rgba[i + 2] > rgba[i] && rgba[i + 2] > 70) blue++;
    }
  }
  assert.ok(blue > 80, 'far south raster is ocean, not yellow blocks');
});

test('debug teleport snaps the camera look to the hunter', () => {
  const main = src('src/main.js');
  assert.match(main, /this\.cam\.look\.set\(P\.x, P\.y \+ 1\.3, P\.z\)/);
});

test('charted tile edges are noise-warped on all four sides, including charted neighbours', () => {
  const play = src('src/world/playmap.js');
  assert.match(play, /function warpUv/);
  assert.match(play, /neighborBleed/);
  assert.match(play, /sampleBuiltUv/);
  assert.doesNotMatch(play, /ftz > 7\.45/);
  const snow = TILES.find((t) => t.kind === 'snowfall');
  const so = originOf(snow);
  const rgba = rasterPlaymap({
    width: 160,
    height: 160,
    minX: so.x - 80,
    minZ: so.z + 32,
    scale: 1,
  });
  const crossings = [];
  for (let y = 56; y < 104; y++) {
    let edge = -1;
    let best = 0;
    for (let x = 40; x < 120; x++) {
      const i = (y * 160 + x) * 4;
      const cold = rgba[i + 2] - rgba[i] > 8 && rgba[i + 1] > 140;
      const prev = ((y * 160 + x - 1) * 4);
      const pcold = rgba[prev + 2] - rgba[prev] > 8 && rgba[prev + 1] > 140;
      if (cold !== pcold) {
        const jump = Math.abs((rgba[i] + rgba[i + 1] + rgba[i + 2]) - (rgba[prev] + rgba[prev + 1] + rgba[prev + 2]));
        if (jump > best) {
          best = jump;
          edge = x;
        }
      }
    }
    if (edge >= 0) crossings.push(edge);
  }
  const uniq = new Set(crossings);
  const span = crossings.length ? Math.max(...crossings) - Math.min(...crossings) : 0;
  assert.ok(uniq.size >= 2 && span > 4, `snowfall west edge should wander, got ${[...uniq].join(',')} span ${span}`);
  assert.ok(chartedAnchor(so.x + 72, so.z + 72), 'snowfall centre stays charted');
});

test('south sea, shallows and coast patches use the same warped field as land', () => {
  const play = src('src/world/playmap.js');
  assert.match(play, /function mapWarp/);
  assert.match(play, /function fieldWeight/);
  assert.match(play, /function oceanCell/);
  assert.match(play, /fieldWeight\(wx, wz, oceanCell/);
  const strand = TILES.find((t) => t.tx === 3 && t.tz === 9);
  assert.ok(strand);
  const so = originOf(strand);
  const rgba = rasterPlaymap({
    width: 160,
    height: 120,
    minX: so.x - 40,
    minZ: so.z - 80,
    scale: 1,
  });
  const crossings = [];
  for (let y = 20; y < 100; y++) {
    let edge = -1;
    let best = 0;
    for (let x = 20; x < 140; x++) {
      const i = (y * 160 + x) * 4;
      const water = rgba[i + 2] > rgba[i] + 20 && rgba[i + 2] > 80;
      const prev = ((y * 160 + x - 1) * 4);
      const pwater = rgba[prev + 2] > rgba[prev] + 20 && rgba[prev + 2] > 80;
      if (water !== pwater) {
        const jump = Math.abs((rgba[i] + rgba[i + 1] + rgba[i + 2]) - (rgba[prev] + rgba[prev + 1] + rgba[prev + 2]));
        if (jump > best) {
          best = jump;
          edge = x;
        }
      }
    }
    if (edge >= 0) crossings.push(edge);
  }
  const uniq = new Set(crossings);
  const span = crossings.length ? Math.max(...crossings) - Math.min(...crossings) : 0;
  assert.ok(uniq.size >= 3 && span > 4, `south sea edge should wander, got ${[...uniq].join(',')} span ${span}`);
});

test('cloud shadows drift a few world units per second on ground materials', () => {
  const mats = src('src/engine/materials.js');
  const world = src('src/world/world.js');
  assert.match(mats, /t \* 2\.8/);
  assert.match(mats, /t \* -2\.2/);
  assert.match(mats, /injectCloudShadows|vCloudWorld/);
  assert.match(mats, /patchHide[\s\S]*cloudShade/);
  assert.match(mats, /patchTerrainGlow[\s\S]*injectCloudShadows/);
  assert.match(world, /terrain:\s*patchTerrainGlow/);
  assert.match(world, /solid:\s*patchHide/);
  assert.match(world, /cover:\s*patchHide/);
  assert.match(src('src/world/sky.js'), /uCloudTime\.value = time/);
  const speed = Math.hypot(CLOUD_DRIFT.x, CLOUD_DRIFT.z);
  assert.ok(speed >= 2 && speed <= 4.2, `drift ${speed}`);
  let changed = 0;
  let maxDelta = 0;
  for (const [x, z] of [[72, 72], [40, 40], [20, 110], [90, 30]]) {
    const a = cloudShadeAt(x, z, 0, 1);
    const b = cloudShadeAt(x, z, 10, 1);
    const d = Math.abs(a - b);
    maxDelta = Math.max(maxDelta, d);
    if (d > 0.02) changed++;
  }
  assert.ok(changed >= 2, `cloud field should move in 10s (max Δ ${maxDelta.toFixed(3)})`);
  assert.ok(cloudShadeAt(72, 72, 0, 1) <= 1);
  assert.ok(cloudShadeAt(72, 72, 0, 1) >= CLOUD_DRIFT.dark - 0.02);
  assert.ok(CLOUD_DRIFT.dark >= 0.55 && CLOUD_DRIFT.dark <= 0.65, `blob remaining light ${CLOUD_DRIFT.dark}`);
  let lit = 0;
  let n = 0;
  for (let z = 0; z < 144; z += 2) {
    for (let x = 0; x < 144; x += 2) {
      n += 1;
      if (cloudShadeAt(x, z, 0, 1) > 0.97) lit += 1;
    }
  }
  const frac = lit / n;
  assert.ok(frac >= 0.38 && frac <= 0.65, `lit fraction ${frac.toFixed(3)} should be ~40-60%`);
});

test('lagoon south and east shores have water cells next to land for foam', () => {
  const spec = { ...JUNGLE_SPECS.lagoon, ox: 0, oz: 0 };
  const hOf = (x, z) => jungleFeature(3.1, x, z, spec)?.h ?? 3.1;
  const countShore = (x0, x1, z0, z1) => {
    let water = 0;
    let edge = 0;
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        if (hOf(x, z) >= WATER_Y + 0.02) continue;
        water++;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (hOf(x + dx, z + dz) >= WATER_Y - 0.08) {
            edge++;
            break;
          }
        }
      }
    }
    return { water, edge };
  };
  const south = countShore(40, 85, 62, 78);
  const east = countShore(82, 100, 36, 64);
  assert.ok(south.water > 8, `south water cells ${south.water}`);
  assert.ok(south.edge > 6, `south shore foam cells ${south.edge}`);
  assert.ok(east.water > 8, `east water cells ${east.water}`);
  assert.ok(east.edge > 6, `east shore foam cells ${east.edge}`);
});

test('lagoon foam distance is a shoreline band, not all-zero or inverted', () => {
  const spec = { ...JUNGLE_SPECS.lagoon, ox: 0, oz: 0 };
  const hOf = (x, z) => jungleFeature(3.1, x, z, spec)?.h ?? 3.1;
  const isLand = (x, z) => hOf(x, z) >= WATER_Y;
  const cornerDist = (gx, gz) => {
    let best = 8;
    for (let z = gz - 8; z < gz + 8; z++) {
      for (let x = gx - 8; x < gx + 8; x++) {
        if (!isLand(x, z)) continue;
        const dx = gx < x ? x - gx : gx > x + 1 ? gx - (x + 1) : 0;
        const dz = gz < z ? z - gz : gz > z + 1 ? gz - (z + 1) : 0;
        best = Math.min(best, Math.hypot(dx, dz));
        if (best === 0) return 0;
      }
    }
    return best;
  };
  let water = 0;
  let zero = 0;
  let band = 0;
  let far = 0;
  for (let z = 30; z < 80; z++) {
    for (let x = 30; x < 95; x++) {
      if (hOf(x, z) >= WATER_Y + 0.02) continue;
      water += 1;
      const ds = [cornerDist(x, z), cornerDist(x, z + 1), cornerDist(x + 1, z + 1), cornerDist(x + 1, z)];
      const mn = Math.min(...ds);
      const mx = Math.max(...ds);
      if (mn < 0.05) zero += 1;
      if (ds.some((d) => d > 0.15 && d < 1.05)) band += 1;
      if (mx > 1.4) far += 1;
    }
  }
  assert.ok(water > 80, `lagoon water cells ${water}`);
  assert.ok(zero > 8, `shore verts at dist 0: ${zero}`);
  assert.ok(band > 10, `foam-band verts ${band}`);
  assert.ok(far > 20, `interior water must not be dist 0 (got ${far} far cells)`);
});

test('map south sea and Hellspire charted edges wander instead of boxing', () => {
  const hell = TILES.find((t) => t.kind === 'hellspire');
  assert.ok(hell);
  const o = originOf(hell);
  const east = [];
  for (let i = 0; i < 22; i++) {
    const z = o.z + 8 + i * 6;
    for (let x = o.x + 40; x < o.x + 220; x += 3) {
      if (chartedWeight(x, z) > 0.55 && chartedWeight(x + 3, z) < 0.45) {
        east.push(x);
        break;
      }
    }
  }
  const north = [];
  for (let i = 0; i < 22; i++) {
    const x = o.x + 8 + i * 6;
    for (let z = o.z + 40; z > o.z - 80; z -= 3) {
      if (chartedWeight(x, z) > 0.55 && chartedWeight(x, z - 3) < 0.45) {
        north.push(z);
        break;
      }
    }
  }
  const eastSpan = east.length ? Math.max(...east) - Math.min(...east) : 0;
  const northSpan = north.length ? Math.max(...north) - Math.min(...north) : 0;
  assert.ok(east.length >= 6 && eastSpan > 4, `Hellspire east edge wander ${eastSpan} n=${east.length}`);
  assert.ok(north.length >= 6 && northSpan > 4, `Hellspire north edge wander ${northSpan} n=${north.length}`);
  const play = src('src/world/playmap.js');
  assert.match(play, /outerRimFade/);
  assert.match(play, /FRAME \+ 22/);
});


test('weapon combos use full-body follow-through and a dedicated two-hand staff sequence', () => {
  const player = src('src/entities/player.js');
  const combat = src('src/entities/weaponCombat.js');
  assert.match(player, /family === 'staff'/);
  assert.match(player, /overhead strike, cross-body sweep, rising return/);
  assert.match(player, /Whole-body follow-through/);
  assert.match(player, /impactPulse/);
  assert.match(player, /headYaw -= torsoYaw/);
  assert.match(player, /headPitch -= lean/);
  assert.match(player, /family === 'bow'/);
  assert.match(player, /family === 'crossbow'/);
  for (const family of ['heavy', 'spear', 'scythe', 'dual', 'sword']) {
    assert.match(combat, new RegExp(`return '${family}'`));
  }
});


test('melee attacks animate weapon lag, loaded elbows, and planted-foot follow-through', () => {
  const player = src('src/entities/player.js');
  assert.match(player, /weaponPitch = windup/);
  assert.match(player, /weaponYaw = side/);
  assert.match(player, /sp\.step\('weaponPitch'/);
  assert.match(player, /sp\.step\('weaponYaw'/);
  assert.match(player, /eR \+= windup/);
  assert.match(player, /legLz/);
  assert.match(player, /sp\.step\('legLz'/);
  assert.match(player, /sp\.step\('legRz'/);
});


test('weapon momentum refinement loads support joints and animates weapon recoil', () => {
  const player = src('src/entities/player.js');
  assert.match(player, /const windup = 1 - ease/);
  assert.match(player, /isTwoHandedFamily\(family\)/);
  assert.match(player, /weaponRollLag/);
  assert.match(player, /offhandPitch/);
  assert.match(player, /family === 'crossbow' \? 0\.12 : 0\.075/);
  assert.match(player, /support elbow engaged throughout/);
});
