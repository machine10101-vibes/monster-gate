import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { W, CORNER_LAP, generateTile, buildTerrainMeshes } from '../src/world/terrain.js';
import { openSouthPass } from '../src/world/southford.js';
import { openRingPasses } from '../src/world/ring.js';

/** Wall vertices (horizontal normals) of a built tile, keyed by the wall's facing. */
function walls(data) {
  const out = [];
  buildTerrainMeshes(data, new THREE.MeshBasicMaterial()).traverse((m) => {
    const pos = m.geometry?.attributes?.position;
    const nor = m.geometry?.attributes?.normal;
    if (!pos || !nor) return;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(nor.getY(i)) > 0.1) continue;
      out.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i), nx: Math.round(nor.getX(i)), nz: Math.round(nor.getZ(i)) });
    }
  });
  return out;
}

test('terrace walls run past outer corners so no sky slit shows down the corner', () => {
  const oak = generateTile();
  openSouthPass(oak);
  openRingPasses(oak);
  const vs = walls(oak);
  const H = (x, z) => oak.H[z * W + x];
  // The Oakhollow step at (92, 64) drops 2 to the east, the south and the south-east.
  assert.ok(H(92, 64) - H(93, 64) > 1.5 && H(92, 64) - H(92, 65) > 1.5);
  const near = (v, x, z) => Math.abs(v.x - x) < 0.006 && Math.abs(v.z - z) < 0.006;
  // East-facing wall reaches past the cell's south edge, and the south-facing wall past its east edge.
  assert.ok(vs.some((v) => v.nx === 1 && near(v, 92 + 1.04, 64 + 0.5 + 0.5 + CORNER_LAP)), 'east wall laps the corner');
  assert.ok(vs.some((v) => v.nz === 1 && near(v, 92 + 0.5 + 0.5 + CORNER_LAP, 64 + 1.04)), 'south wall laps the corner');
  assert.ok(CORNER_LAP > 0.04, 'the lap is wider than the 0.04 gap it closes');
  // Straight runs keep exact cell-width walls: plenty of wall ends still sit on whole cell edges.
  const exact = vs.filter((v) => (v.nx !== 0 ? Math.abs(v.z - Math.round(v.z)) < 0.002 : Math.abs(v.x - Math.round(v.x)) < 0.002)).length;
  assert.ok(exact > vs.length * 0.5, 'interior walls are unchanged');
});
