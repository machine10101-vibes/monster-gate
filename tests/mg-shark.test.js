import assert from 'node:assert/strict';
import { test } from 'node:test';
import { goodsVoxels } from '../src/world/gatherModels.js';

function scan(id) {
  const [M, , ox, oy] = goodsVoxels(id);
  let minX = 1e9;
  let minY = 1e9;
  let maxY = -1e9;
  let ink = 0;
  let belly = 0;
  let n = 0;
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      for (let x = 0; x < M.sx; x++) {
        const v = M.data[x + M.sx * (y + M.sy * z)];
        if (!v) continue;
        n += 1;
        const c = v & 0xffffff;
        const lum = ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
        if (lum < 42) ink += 1;
        if (lum > 200 && y < oy - 2) belly += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  let front = 0;
  for (let z = 0; z < M.sz; z++)
    for (let y = 0; y < M.sy; y++)
      if (M.data[minX + M.sx * (y + M.sy * z)]) front += 1;
  return { n, ox, oy, minY, maxY, front, ink, belly, above: maxY - oy, below: oy - minY };
}

test('tiger shark reads as a blunt-nosed shark, not a tapered fish', () => {
  const shark = scan('tigershark');
  const tuna = scan('tuna');
  assert.ok(shark.n > 2500);
  assert.ok(shark.above >= 14, 'dorsal and upper tail clear the back');
  assert.ok(shark.above > shark.below + 6, 'upper lobe is the long one');
  assert.ok(shark.front >= 12, 'snout is a block, not a point');
  assert.ok(tuna.front <= 8);
  assert.ok(tuna.above <= tuna.below + 2);
  assert.ok(shark.ink > 180, 'tiger bars and fin edges stay dark');
  assert.ok(shark.ink > tuna.ink * 2);
  assert.ok(shark.belly > 200, 'white underside');
});
