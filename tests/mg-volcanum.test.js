import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DROPS, GEAR, MATERIALS, MONSTERS, SETS, gearById } from '../src/data/catalog.js';
import { readFileSync } from 'node:fs';
import { fbm } from '../src/engine/voxel.js';
import { K_LAVA, VOLCANIC_SPECS, gradeWalkableHill, volcanicFeature } from '../src/world/volcanic.js';
import { buildVolcanumDragon } from '../src/entities/volcanum.js';
import { MONSTER_STATS } from '../src/entities/monsters.js';
import { buildProjectileMesh } from '../src/systems/skillfx.js';
import { buildShieldModel, buildWeaponVoxels } from '../src/entities/weaponModels.js';
import { painterFor } from '../src/entities/armorSets.js';

const HELD = ['volcsword', 'volcgreatsword', 'volcdual', 'volchammer', 'volcspear', 'volcscythe', 'volcstaff', 'volcwand', 'volcshortbow', 'volcbow', 'volccrossbow'];
const SET_IDS = ['volcanumset', 'volcanumleather', 'volcanumcloth'];

test('Volcanum is a level 300 boss with lava breath stats', () => {
  const cat = MONSTERS.find((m) => m.id === 'volcanum');
  assert.equal(cat.level, 300);
  assert.match(cat.habitat, /tile 13|Cinderfall/);
  assert.match(cat.desc, /lava/);
  assert.match(cat.desc, /knight/i);
  const st = MONSTER_STATS.volcanum;
  assert.equal(st.hp, 2400);
  assert.ok(st.dmg >= 12);
  assert.ok(st.hp > MONSTER_STATS.darksycledragon.hp * 5);
});

test('Volcanum drops forge a full weapon and armor set above dusk', () => {
  const ids = new Set(DROPS.volcanum.map((d) => d.id));
  for (const id of ids) assert.ok(MATERIALS[id], id);
  assert.ok(ids.has('hearthcore'));
  const gear = GEAR.filter((g) => g.monster === 'volcanum');
  assert.ok(gear.length >= 20, `expected a full set, got ${gear.length}`);
  for (const g of gear) {
    assert.ok(g.recipe, g.id);
    for (const part of Object.keys(g.recipe)) assert.ok(ids.has(part), `${g.id} uses ${part}`);
  }
  for (const id of HELD) {
    const g = gearById(id);
    assert.equal(g.item.held, id);
    assert.ok(g.item.dmg > 20, id);
  }
  const great = gearById('volcgreatsword');
  const dusk = gearById('darkgreatsword');
  assert.ok(great.item.dmg > dusk.item.dmg);
  assert.ok(great.reqLevel >= 48);
  const chest = gearById('volcchest');
  assert.ok(chest.def > gearById('darkchest').def);
  for (const id of SET_IDS) assert.ok(SETS.find((s) => s.id === id), id);
});

test('a hunter can walk the cinderfall cone and the causeway onto the isle', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const W = 144;
  const H = new Float32Array(W * W);
  const lava = new Uint8Array(W * W);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const cell = volcanicFeature(3.6, x, z, spec);
      H[z * W + x] = cell ? cell.h : 3.6;
      if (cell?.kind === K_LAVA) lava[z * W + x] = 1;
    }
  }
  const seen = new Uint8Array(W * W);
  const q = [[100, 130]];
  seen[130 * W + 100] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const [x, z] = q[qi];
    const y = H[z * W + x];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 1 || nz < 1 || nx >= W - 1 || nz >= W - 1) continue;
      const i = nz * W + nx;
      if (seen[i] || lava[i]) continue;
      const nh = H[i];
      if (nh - y > 1.01 || nh >= 16.5 || nh <= 0.45) continue;
      seen[i] = 1;
      q.push([nx, nz]);
    }
  }
  const reach = (x, z) => seen[z * W + x] === 1;
  assert.ok(reach(48, 104), 'isle');
  let climbed = 0;
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      if (!seen[z * W + x]) continue;
      const d = Math.hypot(x - 58, z - 56);
      if (d > 12 && d < 18 && H[z * W + x] > 10) climbed++;
    }
  }
  assert.ok(climbed > 20, `south face of the cone stays a cliff (${climbed})`);
});

test('the lava pool hill is a half-step ramp a hunter can climb', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const W = 144;
  const H = new Float32Array(W * W);
  const lava = new Uint8Array(W * W);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      const cell = volcanicFeature(3.6, x, z, spec);
      H[z * W + x] = cell ? Math.round(cell.h * 2) / 2 : 3.6;
      if (cell?.kind === K_LAVA) lava[z * W + x] = 1;
    }
  }
  gradeWalkableHill(H, (i) => lava[i] === 1);
  for (let z = 1; z < W - 1; z++) {
    for (let x = 1; x < W - 1; x++) {
      const i = z * W + x;
      if (lava[i]) continue;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const j = (z + dz) * W + (x + dx);
          if (lava[j]) continue;
          const rise = H[i] - H[j];
          assert.ok(rise <= 0.5 + 1e-6, `cliff at ${x},${z} rises ${rise}`);
        }
      }
    }
  }
  const R = 0.32;
  const seen = new Uint8Array(W * W);
  const q = [];
  for (let x = 30; x < 120; x++) {
    const z = 138;
    if (lava[z * W + x]) continue;
    seen[z * W + x] = 1;
    q.push(z * W + x);
  }
  const canEnter = (nx, nz, fromY) => {
    for (const [x, z] of [[nx, nz], [nx + R, nz], [nx - R, nz], [nx, nz + R], [nx, nz - R]]) {
      const ix = Math.floor(x);
      const iz = Math.floor(z);
      if (ix < 1 || iz < 1 || ix >= W - 1 || iz >= W - 1) return false;
      const j = iz * W + ix;
      if (lava[j] || H[j] <= 0.45 || H[j] >= 16.5) return false;
      if (H[j] - fromY > 1.01) return false;
    }
    return true;
  };
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    const x = i % W;
    const z = (i - x) / W;
    const y = H[i] - 0.2;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const nx = x + 0.5 + Math.cos(ang) * 0.85;
      const nz = z + 0.5 + Math.sin(ang) * 0.85;
      const jx = Math.floor(nx);
      const jz = Math.floor(nz);
      const j = jz * W + jx;
      if (seen[j] || !canEnter(nx, nz, y)) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  let hill = 0;
  let west = 0;
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      if (!seen[z * W + x]) continue;
      const h = H[z * W + x];
      if (z < spec.lair.cz - spec.lair.moat && h >= 9) hill++;
      if (x < spec.lair.cx && h >= 9) west++;
    }
  }
  assert.ok(hill > 30, `north side of the lava pool stays a wall (${hill})`);
  assert.ok(west > 10, `west side of the lava pool hill stays closed (${west})`);
  const worldSrc = readFileSync(new URL('../src/world/world.js', import.meta.url), 'utf8');
  const ringSrc = readFileSync(new URL('../src/world/ring.js', import.meta.url), 'utf8');
  assert.match(ringSrc, /gradeWalkableHill\(H,/);
  assert.doesNotMatch(worldSrc, /coneX <= 24/);
  const playerSrc = readFileSync(new URL('../src/entities/player.js', import.meta.url), 'utf8');
  assert.match(playerSrc, /lavaAt\(x, z\)/);
  const dress = readFileSync(new URL('../src/world/volcanic.js', import.meta.url), 'utf8');
  assert.match(dress, /Visual only/);
});

test('a hunter walking at the lava-pit hill from the south actually climbs it', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const W = 144;
  const noiseAt = (x, z) => {
    const broad = fbm(x * 0.028, z * 0.026, spec.seed, 4);
    const mid = fbm(x * 0.07 + 2.2, z * 0.066, spec.seed + 5, 3);
    const fine = fbm(x * 0.15, z * 0.14, spec.seed + 11, 2);
    return (broad - 0.42) * spec.amp + (mid - 0.5) * spec.amp * 0.55 + (fine - 0.5) * 0.7;
  };
  const H = new Float32Array(W * W);
  const lava = new Uint8Array(W * W);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      let h = spec.base + noiseAt(x, z);
      for (const [cx, cz, r, amp] of spec.knolls) {
        const d = Math.hypot(x - cx, z - cz) / r;
        if (d < 1) h += amp * (1 - d) * (1 - d);
      }
      if (spec.rim.n && z < 14) h += (14 - z) * 0.8;
      if (spec.rim.w && x < 14) h += (14 - x) * 0.8;
      const cell = volcanicFeature(h, x, z, spec);
      if (cell) {
        h = cell.h;
        if (cell.kind === K_LAVA) lava[z * W + x] = 1;
      }
      H[z * W + x] = Math.round(h * 2) / 2;
    }
  }
  gradeWalkableHill(H, (i) => lava[i] === 1);
  // The south face the hunter walks into is land, and the pit is still there to the west.
  assert.equal(lava[115 * W + 58], 0, 'south face of the hill is lava');
  assert.equal(lava[124 * W + 22], 1, 'lava pool filled in');
  assert.equal(lava[102 * W + 28], 0, 'old moat still blocks the isle');
  const R = 0.32;
  const hAt = (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    if (ix < 0 || iz < 0 || ix >= W || iz >= W) return 12;
    return H[iz * W + ix];
  };
  const isLava = (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    return ix >= 0 && iz >= 0 && ix < W && iz < W && lava[iz * W + ix] === 1;
  };
  const canStep = (x, z, y) => {
    const h = hAt(x, z);
    if (h - y > 1.01 || h <= 0.45 || h >= 16.5) return false;
    if (isLava(x, z)) return false;
    return true;
  };
  const fits = (nx, nz, y) => {
    if (!canStep(nx, nz, y)) return false;
    for (const [x, z] of [[nx + R, nz], [nx - R, nz], [nx, nz + R], [nx, nz - R]]) {
      if (canStep(x, z, y)) continue;
      if (isLava(x, z) && hAt(x, z) - y <= 1.01) continue;
      return false;
    }
    return true;
  };
  const climb = (sx, sz) => {
    const p = { x: sx, z: sz, y: hAt(sx, sz) };
    const goal = [58.5, 52];
    let max = p.y;
    const dt = 1 / 60;
    const speed = 4.7;
    for (let f = 0; f < 60 * 45; f++) {
      let dx = goal[0] - p.x;
      let dz = goal[1] - p.z;
      const dist = Math.hypot(dx, dz) || 1;
      dx = (dx / dist) * speed * dt;
      dz = (dz / dist) * speed * dt;
      const nx = p.x + dx;
      const nz = p.z + dz;
      const step = Math.hypot(dx, dz);
      if (fits(nx, nz, p.y)) {
        p.x = nx;
        p.z = nz;
      } else if (Math.abs(dx) > step * 0.25 && fits(nx, p.z, p.y)) p.x = nx;
      else if (Math.abs(dz) > step * 0.25 && fits(p.x, nz, p.y)) p.z = nz;
      else if (dx || dz) {
        const len = Math.hypot(dx, dz);
        const px = -dz / len;
        const pz = dx / len;
        const a = fits(p.x + px * len, p.z + pz * len, p.y);
        const b = fits(p.x - px * len, p.z - pz * len, p.y);
        const da = a ? px * dx + pz * dz : -Infinity;
        const db = b ? -px * dx - pz * dz : -Infinity;
        if (da > 0 && da >= db) {
          p.x += px * len;
          p.z += pz * len;
        } else if (db > 0) {
          p.x -= px * len;
          p.z -= pz * len;
        }
      }
      const ground = hAt(p.x, p.z);
      if (ground > p.y) p.y += (ground - p.y) * Math.min(1, dt * 20);
      else p.y = ground;
      max = Math.max(max, ground);
      if (max >= 10 && p.z < spec.lair.cz - spec.lair.moat) break;
    }
    return { max, x: p.x, z: p.z, y: p.y };
  };
  for (const [x, z] of [[70.5, 135.5], [48.5, 140.5], [90.5, 130.5], [40.5, 138.5]]) {
    const got = climb(x, z);
    assert.ok(got.max >= 9, `from ${x},${z} stopped at h ${got.max.toFixed(1)} (${got.x.toFixed(1)},${got.z.toFixed(1)})`);
  }
});

test('every side of Cinderfall can walk to Volcanum', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const W = 144;
  const L = spec.lair;
  const noiseAt = (x, z) => {
    const broad = fbm(x * 0.028, z * 0.026, spec.seed, 4);
    const mid = fbm(x * 0.07 + 2.2, z * 0.066, spec.seed + 5, 3);
    const fine = fbm(x * 0.15, z * 0.14, spec.seed + 11, 2);
    return (broad - 0.42) * spec.amp + (mid - 0.5) * spec.amp * 0.55 + (fine - 0.5) * 0.7;
  };
  const H = new Float32Array(W * W);
  const lava = new Uint8Array(W * W);
  for (let z = 0; z < W; z++) {
    for (let x = 0; x < W; x++) {
      let h = spec.base + noiseAt(x, z);
      for (const [cx, cz, r, amp] of spec.knolls) {
        const d = Math.hypot(x - cx, z - cz) / r;
        if (d < 1) h += amp * (1 - d) * (1 - d);
      }
      if (spec.rim.n && z < 14) h += (14 - z) * 0.8;
      if (spec.rim.w && x < 14) h += (14 - x) * 0.8;
      const cell = volcanicFeature(h, x, z, spec);
      if (cell) {
        h = cell.h;
        if (cell.kind === K_LAVA) lava[z * W + x] = 1;
      }
      H[z * W + x] = Math.round(h * 2) / 2;
    }
  }
  gradeWalkableHill(H, (i) => lava[i] === 1);
  assert.equal(lava[124 * W + 22], 1, 'lava pool is gone');
  assert.equal(lava[104 * W + 24], 0, 'west walk to the isle is lava');
  const R = 0.32;
  const hAt = (x, z) => H[Math.floor(z) * W + Math.floor(x)];
  const isLava = (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    return ix >= 0 && iz >= 0 && ix < W && iz < W && lava[iz * W + ix] === 1;
  };
  const canStep = (x, z, y) => {
    if (x < 1 || z < 1 || x >= W - 1 || z >= W - 1) return false;
    const h = hAt(x, z);
    if (h - y > 1.01 || h <= 0.45 || h >= 16.5 || isLava(x, z)) return false;
    return true;
  };
  const fits = (nx, nz, y) => {
    if (!canStep(nx, nz, y)) return false;
    for (const [x, z] of [[nx + R, nz], [nx - R, nz], [nx, nz + R], [nx, nz - R]]) {
      if (canStep(x, z, y)) continue;
      if (isLava(x, z) && hAt(x, z) - y <= 1.01) continue;
      return false;
    }
    return true;
  };
  const goal = [L.cx + 0.5, L.cz + 0.5];
  const walk = (sx, sz) => {
    const p = { x: sx, z: sz, y: hAt(sx, sz) };
    const dt = 1 / 60;
    for (let f = 0; f < 60 * 50; f++) {
      let dx = goal[0] - p.x;
      let dz = goal[1] - p.z;
      const dist = Math.hypot(dx, dz) || 1;
      if (dist < 3 && !isLava(p.x, p.z)) return true;
      dx = (dx / dist) * 4.7 * dt;
      dz = (dz / dist) * 4.7 * dt;
      const nx = p.x + dx;
      const nz = p.z + dz;
      const step = Math.hypot(dx, dz);
      if (fits(nx, nz, p.y)) { p.x = nx; p.z = nz; }
      else if (Math.abs(dx) > step * 0.25 && fits(nx, p.z, p.y)) p.x = nx;
      else if (Math.abs(dz) > step * 0.25 && fits(p.x, nz, p.y)) p.z = nz;
      else {
        const len = Math.hypot(dx, dz);
        const px = -dz / len;
        const pz = dx / len;
        const a = fits(p.x + px * len, p.z + pz * len, p.y);
        const b = fits(p.x - px * len, p.z - pz * len, p.y);
        const da = a ? px * dx + pz * dz : -Infinity;
        const db = b ? -px * dx - pz * dz : -Infinity;
        if (a && da >= db && da >= 0) { p.x += px * len; p.z += pz * len; }
        else if (b && db >= 0) { p.x -= px * len; p.z -= pz * len; }
      }
      const ground = hAt(p.x, p.z);
      if (!isLava(p.x, p.z)) {
        if (ground > p.y) p.y += (ground - p.y) * Math.min(1, dt * 20);
        else p.y = ground;
      }
    }
    return false;
  };
  for (const [x, z] of [[16.5, 104.5], [72.5, 136.5], [130.5, 100.5], [90.5, 30.5], [30.5, 40.5], [110.5, 40.5]]) {
    assert.equal(isLava(x, z), false, `start ${x},${z} is in lava`);
    assert.ok(walk(x, z), `from ${x},${z} cannot reach Volcanum`);
  }
});

test('the cinderfall lair is a walkable isle inside a lava moat with a bridge', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const L = spec.lair;
  assert.equal(L.cx, 48);
  assert.equal(L.cz, 104);
  const island = volcanicFeature(3.6, L.cx, L.cz, spec);
  assert.equal(island.kind, 0);
  assert.ok(island.h > 5 && island.h < 8.6);
  const moat = volcanicFeature(3.6, 22, 124, spec);
  assert.equal(moat.kind, K_LAVA);
  assert.ok(moat.h < 2);
  const opened = volcanicFeature(3.6, 28, 102, spec);
  assert.equal(opened.kind, 0);
  const bridge = volcanicFeature(3.6, 66, 106, spec);
  assert.equal(bridge.kind, 0);
  assert.ok(bridge.h > 2);
  const road = [[143, 72], [112, 84], [84, 108], [72, 143]];
  let nearest = 99;
  for (let i = 0; i < road.length - 1; i++) {
    const [ax, az] = road[i];
    const [bx, bz] = road[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((L.cx - ax) * dx + (L.cz - az) * dz) / (dx * dx + dz * dz)));
    nearest = Math.min(nearest, Math.hypot(L.cx - (ax + dx * t), L.cz - (az + dz * t)));
  }
  assert.ok(nearest > L.outer + 3, `road cuts the moat (${nearest})`);
});

test('the dragon, his lava, and his forged gear all build', () => {
  const dragon = buildVolcanumDragon();
  assert.ok(dragon.root);
  assert.ok(dragon.parts.head && dragon.parts.jaw && dragon.parts.wings.length === 2);
  assert.ok(dragon.parts.wingsOuter.length === 2 && dragon.parts.legs.length === 4 && dragon.parts.tail.length >= 4);
  const bolt = buildProjectileMesh({ kind: 'lavabolt' });
  assert.ok(bolt);
  for (const id of HELD) assert.ok(buildWeaponVoxels(id), id);
  for (const id of SET_IDS) assert.ok(painterFor(id), id);
  assert.ok(buildShieldModel('volcanumset'));
});
