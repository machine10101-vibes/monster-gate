import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { builtTerrainColor, chartedAnchor, paintMapDecks, rasterPlaymap } from '../src/world/playmap.js';
import { STARTER, TILES, TILE_SIZE, originOf } from '../src/world/tiles.js';

function canvas(color) {
  const data = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...color, 255], i);
  return { width: TILE_SIZE, height: TILE_SIZE, getContext: () => ({ getImageData: () => ({ width: TILE_SIZE, height: TILE_SIZE, data }) }) };
}

test('generated terrain colors stay at the exact coordinates on both sides of a built-tile border', () => {
  const south = TILES.find((t) => t.kind === 'southford');
  const tiles = { [STARTER.id]: canvas([45, 185, 72]), [south.id]: canvas([202, 148, 82]) };
  const minX = 0, minZ = 0, width = 180, height = 320;
  const rgba = rasterPlaymap({ width, height, minX, minZ, tileCanvas: tiles });
  const rgb = (x, z) => Array.from(rgba.slice((z * width + x) * 4, (z * width + x) * 4 + 3));
  assert.deepEqual(rgb(72, 143), [45, 185, 72]);
  assert.deepEqual(rgb(72, 144), [202, 148, 82]);
  assert.deepEqual(builtTerrainColor(72, 144, new Map([[south.id, tiles[south.id].getContext().getImageData()]])), [202, 148, 82]);
  assert.deepEqual(chartedAnchor(72, 143), { x: 72, z: 143 });
});

test('bridge and dock footprints are clipped into their physical terrain tiles', () => {
  const west = TILES.find((t) => t.kind === 'brookside');
  const east = STARTER;
  const a = originOf(west), b = originOf(east);
  const painted = new Map();
  const mock = (id) => ({ width: TILE_SIZE, height: TILE_SIZE, getContext: () => ({
    set fillStyle(value) { painted.set(id + ':color', value); },
    fillRect(...args) { painted.set(id, args); },
  }) });
  const c = { [west.id]: mock(west.id), [east.id]: mock(east.id) };
  paintMapDecks(c, [{ tileId: west.id, x0: a.x, z0: a.z }, { tileId: east.id, x0: b.x, z0: b.z }], [
    { x0: -4, x1: 4, z0: 25, z1: 31 },
  ]);
  assert.deepEqual(painted.get(west.id), [140, 25, 4, 6]);
  assert.deepEqual(painted.get(east.id), [0, 25, 4, 6]);
  paintMapDecks(c, [{ tileId: east.id, x0: b.x, z0: b.z }], [
    { x0: 70, x1: 76, z0: 70, z1: 76, color: '#3f7d79' },
  ]);
  assert.equal(painted.get(east.id + ':color'), '#3f7d79');
});

test('full map and minimap both use the world terrain raster', () => {
  const world = readFileSync(new URL('../src/world/world.js', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(world, /rasterPlaymap\([\s\S]*tileCanvas: this\.tileCanvas/);
  assert.match(world, /paintMapDecks\(this\.tileCanvas, this\.lands/);
  assert.match(world, /this\.mapRoofs\.push\(/);
  assert.match(hud, /cave \? cave\.minimap : world\.minimapCanvas/);
  assert.match(hud, /game\.world\.minimapCanvas/);
});

test('updated terrain heights and surfaces flow through the shared map raster', async () => {
  const { World } = await import('../src/world/world.js');
  const { generateWorld, W } = await import('../src/world/terrain.js');
  const terrain = generateWorld();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const data = new Uint8ClampedArray(W * W * 4);
  const context = {
    createImageData: () => ({ data }),
    putImageData() {},
    getImageData: () => ({ width: W, height: W, data }),
  };
  const canvas = { width: W, height: W, getContext: () => context };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  try {
    World.prototype.paintLandCanvas(terrain);
    const raster = () => rasterPlaymap({ width: W, height: W, minX: 0, minZ: 0, tileCanvas: { [STARTER.id]: canvas } });
    const first = raster();
    const i = (70 * W + 70) * 4;
    assert.deepEqual(Array.from(first.slice(i, i + 3)), Array.from(data.slice(i, i + 3)));
    terrain.H[70 * W + 70] = -1;
    World.prototype.paintLandCanvas(terrain);
    const second = raster();
    assert.notDeepEqual(Array.from(first.slice(i, i + 3)), Array.from(second.slice(i, i + 3)), 'map responds to changed terrain');
    assert.deepEqual(Array.from(second.slice(i, i + 3)), Array.from(data.slice(i, i + 3)), 'map uses current terrain pixels');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  }
});
