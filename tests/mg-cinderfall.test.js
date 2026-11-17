import assert from 'node:assert/strict';
import { test } from 'node:test';
import { W, generateTile } from '../src/world/terrain.js';
import { SOUTH_Z, generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { VOLCANIC_SPECS } from '../src/world/volcanic.js';
import { World } from '../src/world/world.js';
import { TILE } from '../src/engine/materials.js';

const R = 0.32;

function world() {
  const oak = generateTile();
  openSouthPass(oak);
  openRingPasses(oak);
  const northEdge = new Float32Array(W);
  for (let x = 0; x < W; x++) northEdge[x] = oak.H[(W - 1) * W + x];
  const south = generateSouthford(northEdge);
  openValeSides(south);
  openSouthfordDesert(south);
  const ring = generateRing(oak, south);
  const w = new World('high');
  w.data = oak;
  w.south = south;
  w.lands = [
    { role: 'oak', kind: 'oakhollow', x0: 0, z0: 0, data: oak },
    { role: 'south', kind: 'southford', x0: 0, z0: SOUTH_Z, data: south },
    ...ring,
  ];
  return w;
}

/** The same step the hunter takes: center and four shoulders, then one axis at a time. */
function climb(w, sx, sz, gx, gz) {
  const p = { x: sx, z: sz, y: w.heightAt(sx, sz) };
  const fits = (nx, nz) => {
    for (const [x, z] of [[nx, nz], [nx + R, nz], [nx - R, nz], [nx, nz + R], [nx, nz - R]]) {
      if (!w.canStep(x, z, p.y)) return false;
    }
    return true;
  };
  let max = p.y;
  let still = 0;
  const dt = 1 / 60;
  for (let f = 0; f < 60 * 40; f++) {
    let dx = gx - p.x;
    let dz = gz - p.z;
    const dist = Math.hypot(dx, dz) || 1;
    dx = (dx / dist) * 4.7 * dt;
    dz = (dz / dist) * 4.7 * dt;
    const before = p.x;
    const beforeZ = p.z;
    const nx = p.x + dx;
    const nz = p.z + dz;
    if (fits(nx, nz)) { p.x = nx; p.z = nz; }
    else if (fits(nx, p.z)) p.x = nx;
    else if (fits(p.x, nz)) p.z = nz;
    const ground = w.heightAt(p.x, p.z);
    if (ground > p.y) p.y += (ground - p.y) * Math.min(1, dt * 20);
    else p.y = ground;
    max = Math.max(max, ground);
    if (before === p.x && beforeZ === p.z) still++;
    else still = 0;
    if (still > 40) break;
  }
  return { max, x: p.x, z: p.z, y: p.y };
}

test('a hunter can climb the Cinderfall cone past the old height wall', () => {
  const w = world();
  const land = w.lands.find((l) => l.kind === 'cinderfall');
  const at = (lx, lz) => [land.x0 + lx + 0.5, land.z0 + lz + 0.5];
  const [gx, gz] = at(58, 56);

  for (const [lx, lz] of [[72, 140], [130, 72], [100, 120], [40, 130], [20, 80], [90, 30]]) {
    const [sx, sz] = at(lx, lz);
    const got = climb(w, sx, sz, gx, gz);
    assert.ok(got.max >= 12, `from ${lx},${lz} stopped at ${got.max.toFixed(1)} (${(got.x - land.x0).toFixed(1)},${(got.z - land.z0).toFixed(1)})`);
  }

  const nest = VOLCANIC_SPECS.cinderfall.lair;
  const [nx, nz] = at(nest.cx, nest.cz);
  assert.equal(w.canStep(nx, nz, w.heightAt(nx, nz + 1)), true, 'the step onto Volcanum is sealed');
  assert.ok(w.heightAt(nx, nz) >= 9, `Volcanum is still below the old wall (${w.heightAt(nx, nz)})`);
  const shelf = w.heightAt(nx, nz);
  assert.ok(Math.abs(w.heightAt(nx + 2, nz) - shelf) <= 1, 'the perch is not a shelf');
  assert.ok(Math.abs(w.heightAt(nx, nz + 2) - shelf) <= 1, 'the perch falls away under the dragon');
  const fromSouth = climb(w, ...at(58, 130), nx, nz);
  assert.ok(Math.hypot(fromSouth.x - nx, fromSouth.z - nz) < 3, `south climb stopped at ${(fromSouth.x - land.x0).toFixed(1)},${(fromSouth.z - land.z0).toFixed(1)} h=${fromSouth.max.toFixed(1)}`);

  // The cell just above the old cap is a half step, and it has to accept the body.
  const [bx, bz] = at(59, 78);
  const below = w.heightAt(bx, bz + 1);
  assert.ok(below < 9 && below >= 8, `approach should still meet the old wall, h=${below}`);
  assert.equal(w.canStep(bx, bz, below), true);

  let high = 0;
  let openRim = 0;
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const h = land.data.H[i];
      const wx = land.x0 + x + 0.5;
      const wz = land.z0 + z + 0.5;
      if (land.data.climb[i]) {
        assert.ok(w.playable(wx, wz), `cone cell ${x},${z} h=${h} is sealed`);
        if (h >= 10) high++;
        continue;
      }
      if (h >= 9 && w.playable(wx, wz)) openRim++;
      if (land.data.top[i] === TILE.LAVA && h >= 8.6) assert.equal(w.playable(wx, wz), false, `lava ${x},${z} is open`);
    }
  }
  assert.ok(high > 200, `the shoulder above the old wall is missing (${high})`);
  assert.equal(openRim, 0, `rim cells above the cap opened (${openRim})`);

  const hare = w.lands.find((l) => l.kind === 'harefield');
  let hareOpen = 0;
  for (let x = 0; x < W; x++) {
    const h = hare.data.H[2 * W + x];
    if (h < 9) continue;
    if (w.playable(hare.x0 + x + 0.5, hare.z0 + 2.5)) hareOpen++;
  }
  assert.equal(hareOpen, 0, 'Harefield rim opened with the cone');
});
