import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE } from '../src/engine/materials.js';
import { W, ZONE, generateTile } from '../src/world/terrain.js';
import { SOUTH_Z, generateSouthford, openSouthPass } from '../src/world/southford.js';
import { openSouthfordDesert } from '../src/world/desert.js';
import { generateRing, openRingPasses, openValeSides } from '../src/world/ring.js';
import { World } from '../src/world/world.js';
import { TILES } from '../src/world/tiles.js';
import { GILANTRE_SPOTS, dressGilantre, yawAlong } from '../src/world/gilantre.js';
import { COLOSSEUM_BOARD } from '../src/world/colosseum.js';
import { questById, questGiverNpc } from '../src/data/quests.js';

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

function climb(w, sx, sz, gx, gz) {
  const p = { x: sx, z: sz, y: w.heightAt(sx, sz) };
  const fits = (nx, nz) => {
    for (const [x, z] of [[nx, nz], [nx + 0.32, nz], [nx - 0.32, nz], [nx, nz + 0.32], [nx, nz - 0.32]]) {
      if (!w.canStep(x, z, p.y)) return false;
    }
    return true;
  };
  let still = 0;
  const dt = 1 / 60;
  for (let f = 0; f < 60 * 50; f++) {
    let dx = gx - p.x;
    let dz = gz - p.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist < 2) return { ok: true, x: p.x, z: p.z };
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
    if (before === p.x && beforeZ === p.z) still++;
    else still = 0;
    if (still > 40) break;
  }
  return { ok: false, x: p.x, z: p.z, y: p.y };
}

test('wall and arcade pieces lie along the tangent, not the radius', () => {
  const head = (yaw) => [Math.cos(yaw), -Math.sin(yaw)];
  for (const a of [0, Math.PI / 4, 1.2, 2.4, 4.1]) {
    const tx = -Math.sin(a);
    const tz = Math.cos(a);
    const [hx, hz] = head(yawAlong(tx, tz));
    assert.ok(Math.abs(hx - tx) < 1e-9 && Math.abs(hz - tz) < 1e-9, `circle ${a}`);
    const ex = -9.05 * Math.sin(a);
    const ez = 7.35 * Math.cos(a);
    const len = Math.hypot(ex, ez);
    const [bx, bz] = head(yawAlong(ex, ez));
    assert.ok(Math.abs(bx - ex / len) < 1e-9 && Math.abs(bz - ez / len) < 1e-9, `ellipse ${a}`);
  }
  const skew = Math.PI / 4 + Math.PI / 2;
  const [sx, sz] = head(skew);
  const dot = sx * -Math.sin(Math.PI / 4) + sz * Math.cos(Math.PI / 4);
  assert.ok(Math.abs(dot) < 0.05, 'the old yaw is sideways at the diagonal');
});

test('the Colosseum sign-up board stands beside the Gilantre sand', () => {
  const arena = GILANTRE_SPOTS.arena;
  const dx = COLOSSEUM_BOARD.x - arena.x;
  const dz = COLOSSEUM_BOARD.z - arena.z;
  assert.ok(dz > 6 && dz < 14, `south of the sand, dz ${dz}`);
  assert.ok(Math.abs(dx) > 3.2 && Math.abs(dx) < 8, `off the aisle, dx ${dx}`);
  assert.ok(Math.abs(COLOSSEUM_BOARD.z - 144) > 2.5, 'clear of the east-west road');
  assert.ok(Math.hypot(COLOSSEUM_BOARD.x - 432, COLOSSEUM_BOARD.z - 144) < 26, 'inside the city wall');
});

test('tiles 57, 58, 67 and 68 are the four quarters of Gilantre', () => {
  for (const [n, kind] of [[57, 'gilantreNw'], [58, 'gilantreNe'], [67, 'gilantreSw'], [68, 'gilantreSe']]) {
    const tile = TILES.find((t) => t.n === n);
    assert.equal(tile.kind, kind);
    assert.equal(tile.name, 'Gilantre');
    assert.equal(tile.built, true);
    assert.equal(tile.biomeName, 'Town');
  }
});

test('Gilantre has a walkable square, a moat, and both drawbridges', () => {
  const w = world();
  const center = w.heightAt(432.5, 144.5);
  assert.ok(Math.abs(center - 3) < 0.6, `square height ${center}`);
  assert.equal(w.playable(432.5, 144.5), true);

  const moat = { x: 432.5, z: 144.5 - 37 };
  assert.equal(w.zoneAt(moat.x, moat.z), ZONE.WATER);
  assert.equal(w.playable(moat.x, moat.z), false);

  for (const spot of [GILANTRE_SPOTS.westgate, GILANTRE_SPOTS.eastgate, GILANTRE_SPOTS.arena, GILANTRE_SPOTS.forge]) {
    assert.equal(w.playable(spot.x, spot.z), true, `${spot.x},${spot.z} h=${w.heightAt(spot.x, spot.z)}`);
  }

  const square = w.lands.find((l) => 420 >= l.x0 && 150 >= l.z0 && 420 < l.x0 + W && 150 < l.z0 + W);
  const si = (150 - square.z0) * W + (420 - square.x0);
  assert.equal(square.data.top[si], TILE.COBBLE);
  const field = w.lands.find((l) => l.kind === 'gilantreSe');
  let farms = 0;
  for (let i = 0; i < field.data.top.length; i++) if (field.data.top[i] === TILE.FARMLAND) farms++;
  assert.ok(farms > 40, `east farm cells ${farms}`);

  const nw = w.lands.find((l) => l.kind === 'gilantreNw');
  const ne = w.lands.find((l) => l.kind === 'gilantreNe');
  const forest = nw.data.zone[100 * W + 40];
  const prairie = ne.data.zone[40 * W + 100];
  assert.equal(forest, ZONE.FOREST);
  assert.equal(prairie, ZONE.FIELD);
});

function route(w, pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    const got = climb(w, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    assert.equal(got.ok, true, `${pts[i]} -> ${pts[i + 1]} stopped at ${got.x?.toFixed?.(1)},${got.z?.toFixed?.(1)} h=${got.y}`);
  }
}

test('a hunter can walk the west road into Gilantre and cross to the east bridge', () => {
  const w = world();
  route(w, [[214, 70], [250, 110], [280, 136], [340, 144], [396, 144], [468, 144], [446, 130]]);
  route(w, [[214, 194], [250, 170], [300, 150], [360, 144], [396, 144]]);
  route(w, [[468, 144], [500, 144], [GILANTRE_SPOTS.oak.x, GILANTRE_SPOTS.oak.z]]);
  route(w, [[468, 144], [486, 144], [GILANTRE_SPOTS.reed.x, GILANTRE_SPOTS.reed.z]]);
  route(w, [[396, 144], [GILANTRE_SPOTS.grove.x, GILANTRE_SPOTS.grove.z]]);
});

function blocked(w, x, z) {
  const body = { x, z };
  w.resolve(body, 0.28);
  return Math.hypot(body.x - x, body.z - z) > 0.05;
}

/** Walk with collider push, the way the player actually moves. */
function press(w, sx, sz, gx, gz) {
  const p = { x: sx, z: sz };
  for (let i = 0; i < 500; i++) {
    const dx = gx - p.x;
    const dz = gz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.1) return true;
    const step = Math.min(0.28, dist);
    p.x += (dx / dist) * step;
    p.z += (dz / dist) * step;
    for (let n = 0; n < 4; n++) w.resolve(p, 0.32);
  }
  return Math.hypot(gx - p.x, gz - p.z) < 1.4;
}

test('the curtain wall is solid and the coliseum sand can be reached', () => {
  const w = world();
  w.makeModels();
  w.mats = { solid: {}, glow: {}, window: {}, cover: {} };
  dressGilantre(w);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rel = Math.atan2(Math.sin(a), Math.cos(a));
    const mouth = Math.abs(rel) < 0.16 || Math.abs(Math.abs(rel) - Math.PI) < 0.16;
    const x = 432 + Math.cos(a) * 29.2;
    const z = 144 + Math.sin(a) * 29.2;
    assert.equal(blocked(w, x, z), !mouth, `wall ${a.toFixed(2)} at ${x.toFixed(1)},${z.toFixed(1)}`);
  }

  assert.equal(blocked(w, GILANTRE_SPOTS.arena.x, GILANTRE_SPOTS.arena.z), false);
  assert.equal(blocked(w, GILANTRE_SPOTS.arena.x + 9.05, GILANTRE_SPOTS.arena.z), true, 'east arcade');
  assert.equal(press(w, 396, 144, 468, 144), true, 'east-west road through both gates');
  assert.equal(press(w, 468, 144, 446, 142), true, 'east gate to the coliseum door');
  assert.equal(press(w, 446, 142, GILANTRE_SPOTS.arena.x, GILANTRE_SPOTS.arena.z), true, 'south aisle onto the sand');
});

test('Gilantre quests point at the people who stand in the city', () => {
  assert.equal(questGiverNpc(questById('gilan-pick')), 'grimbold');
  assert.equal(questGiverNpc(questById('gilan-bowl')), 'marcellus');
  assert.equal(questGiverNpc(questById('gilan-roots')), 'gwyneth');
  assert.equal(questGiverNpc(questById('gilan-timber')), 'elara');
  assert.equal(questGiverNpc(questById('gilan-reed')), 'lyra');
  assert.equal(questById('gilan-bowl').steps[1].spot, 'coliseum');
});
