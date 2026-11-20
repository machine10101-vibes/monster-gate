import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { TILE } from '../src/engine/materials.js';
import { QUALITIES, survivalBudget } from '../src/engine/quality.js';
import { paintTileMap, sampleBlended, sampleTile, TILES } from '../src/world/tiles.js';
import { sideTilesFor } from '../src/world/terrain.js';

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
  assert.match(tiles, /export function sampleBlended/);
  assert.doesNotMatch(tiles, /if \(edge < 0\.02\)/);
  assert.match(map, /paintTileMap\(c, tile\)/);
  assert.match(map, /const band = 16/);
  assert.match(world, /function blendMinimapSeams/);
  assert.match(world, /MAP_BORDER_PX \* scale/);
  assert.match(world, /paintTileMap\(planned, tile\)/);
  assert.match(world, /export const MAP_PX = 1/);
  assert.doesNotMatch(world, /function blurMinimap/);
  assert.match(world, /#1d4e86/);
  assert.doesNotMatch(world, /#cbb894/);
  assert.doesNotMatch(world, /jagged/);
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
  assert.match(terrain, /if \(roll && !cliffCell\(x \+ dx, z \+ dz\)\) continue/);
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
  assert.match(mats, /mix\(1\.0, 0\.78/);
  assert.match(mats, /#include <opaque_fragment>/);
  assert.match(world, /cloudShade\(p, uCloudTime, uCloudAmt\)/);
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
  assert.match(world, /shoreBand/);
  assert.doesNotMatch(world, /foamNoise/);
  assert.doesNotMatch(world, /max\(vShore, shoreBand\)/);
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
  assert.doesNotMatch(tiles, /Math\.round\(Math\.max\(0\.06/);
  assert.doesNotMatch(tiles, /\* 0\.42/);
  assert.doesNotMatch(tiles, /const band = 0\.44/);
  assert.doesNotMatch(world, /function blurMinimap/);
  assert.match(world, /MAP_PX = 1/);
  assert.match(world, /stampTownIcon/);
  assert.match(hud, /imageSmoothingEnabled = false/);
  assert.match(style, /\.bigmap \{[\s\S]*image-rendering:\s*auto/);
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
  assert.match(player, /RingGeometry/);
});

test('debug teleport snaps the camera look to the hunter', () => {
  const main = src('src/main.js');
  assert.match(main, /this\.cam\.look\.set\(P\.x, P\.y \+ 1\.3, P\.z\)/);
});
