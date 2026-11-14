import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GOODS, LEVEL_SKILLS, SHAFT_FROM_LOG, TREES } from '../src/data/gathering.js';
import { WOODS } from '../src/data/woods.js';
import { goodsVoxels } from '../src/world/gatherModels.js';
import { buildWoodStump } from '../src/world/gatherModels.js';
import { ARCTIC_SPECS } from '../src/world/arctic.js';
import { CAVE_MOUTH, SOUTH_Z } from '../src/world/southford.js';
import {
  CAVE_LOCAL, EXOTIC_KINDS, RIMEFANG_MESA, exoticLocal, woodSpotOk,
} from '../src/world/woodSpawn.js';
import { buildWoodTree, sculptWoodTree } from '../src/world/woodTrees.js';
import { TILE } from '../src/engine/materials.js';
import { ZONE } from '../src/world/terrain.js';
import { RNG } from '../src/engine/voxel.js';
import { sampleWoodLocal } from '../src/world/woodSpawn.js';

const LISTED = [
  'Pine', 'Spruce', 'Fir', 'Aspen', 'Poplar', 'American Beech', 'Soft Maple',
  'Red Oak', 'White Oak', 'Hard Maple', 'Ash', 'Cherry',
  'Black Walnut', 'Honduran Mahogany', 'Teak',
  'Purpleheart', 'Padauk', 'Wenge', 'Bocote', 'African Blackwood', 'Cocobolo', 'Ebony',
];

function avg(model) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const v of model.data) {
    if (!v) continue;
    r += (v >> 16) & 255;
    g += (v >> 8) & 255;
    b += v & 255;
    n++;
  }
  return { r: r / n, g: g / n, b: b / n, n };
}

function countWhere(model, pred) {
  let n = 0;
  for (const v of model.data) {
    if (!v) continue;
    if (pred((v >> 16) & 255, (v >> 8) & 255, v & 255)) n++;
  }
  return n;
}

const flat = (kind, extra = {}) => ({
  kind,
  lx: 40,
  lz: 40,
  h: 2.4,
  slope: 0.2,
  zone: ZONE.FIELD,
  path: false,
  top: TILE.GRASS,
  blocked: false,
  ...extra,
});

test('every listed wood is choppable and the old three stay', () => {
  assert.deepEqual(WOODS.map((w) => w.name), LISTED);
  assert.equal(TREES.birch.level, 1);
  assert.equal(TREES.oak.level, 1);
  assert.equal(TREES.maple.level, 10);
  for (const w of WOODS) {
    const tree = TREES[w.id];
    assert.ok(tree, w.id);
    assert.equal(tree.name, w.name);
    assert.equal(tree.tier, w.tier);
    assert.equal(GOODS[tree.log].kind, 'log');
    assert.equal(SHAFT_FROM_LOG[tree.log], `${w.id}_shaft`);
    assert.equal(GOODS[`${w.id}_shaft`].kind, 'part');
    const logs = goodsVoxels(tree.log);
    const shaft = goodsVoxels(`${w.id}_shaft`);
    assert.ok(logs[0].count() > 40, w.id);
    assert.ok(shaft[0].count() > 10, w.id);
    assert.ok(buildWoodStump(w.id, 2).some((p) => p.geo));
  }
});

test('woodcutting and firemaking list every tree', () => {
  const chop = LEVEL_SKILLS.woodcutting.unlocks.map((row) => row[1]);
  const fire = LEVEL_SKILLS.firemaking.unlocks.map((row) => row[1]);
  for (const tree of Object.values(TREES)) {
    assert.ok(chop.includes(`${tree.name} logs`), tree.name);
    assert.ok(fire.includes(`${tree.name} fires`), tree.name);
  }
  assert.ok(chop.includes('Quicker chops'));
  assert.ok(fire.includes('Surer flames'));
  const levels = LEVEL_SKILLS.woodcutting.unlocks.map((row) => row[0]);
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] >= levels[i - 1]);
});

test('tiers climb and tier 4 is the rarest', () => {
  let level = 0;
  for (const w of WOODS) {
    assert.ok(w.level >= level, w.id);
    level = w.level;
    assert.ok(w.tier >= 1 && w.tier <= 4);
  }
  assert.ok(WOODS.filter((w) => w.tier === 4).every((w) => w.level >= 76));
  assert.equal(TREES.ebony.level, 96);
  assert.ok(TREES.ebony.xp > TREES.teak.xp);
  assert.ok(TREES.pine.xp <= TREES.oak.xp + 5);
});

test('tier 4 grows only on high-level monster ground', () => {
  const mesa = ARCTIC_SPECS.rimefang.mesa;
  assert.equal(RIMEFANG_MESA.cx, mesa.cx);
  assert.equal(RIMEFANG_MESA.cz, mesa.cz);
  assert.equal(RIMEFANG_MESA.rTop, mesa.rTop);
  assert.equal(CAVE_LOCAL.x, CAVE_MOUTH.x);
  assert.equal(CAVE_LOCAL.z, CAVE_MOUTH.z - SOUTH_Z);
  const nests = readFileSync(new URL('../src/world/arctic.js', import.meta.url), 'utf8');
  assert.match(nests, /\[-8\.2, 6/);
  for (const w of WOODS) {
    if (w.tier < 4) {
      assert.equal(woodSpotOk(w, flat('oakhollow')), true, w.id);
      assert.equal(woodSpotOk(w, flat('hellspire')), true, w.id);
    } else {
      assert.equal(woodSpotOk(w, flat('oakhollow')), false, w.id);
      assert.equal(woodSpotOk(w, flat('goldmead')), false, w.id);
      assert.equal(woodSpotOk(w, flat('hellspire')), true, w.id);
      assert.equal(woodSpotOk(w, flat('dawnspire')), true, w.id);
      assert.equal(woodSpotOk(w, flat('warfield')), true, w.id);
      assert.equal(woodSpotOk(w, flat('rimefang', { lx: 70, lz: 66, h: 8.5 })), false, w.id);
      assert.equal(woodSpotOk(w, flat('rimefang', { lx: 80, lz: 66, h: 8.5 })), true, w.id);
      assert.equal(woodSpotOk(w, flat('southford', { lx: 104, lz: 44 })), false, w.id);
      assert.equal(woodSpotOk(w, flat('southford', { lx: 120, lz: 44 })), true, w.id);
      assert.equal(woodSpotOk(w, flat('hellspire', { path: true })), false, w.id);
      assert.equal(woodSpotOk(w, flat('hellspire', { top: TILE.LAVA })), false, w.id);
      assert.equal(woodSpotOk(w, flat('hellspire', { zone: ZONE.TOWN })), false, w.id);
    }
  }
  assert.equal(exoticLocal('lagoon', 40, 40), false);
  assert.equal(EXOTIC_KINDS.has('hellspire'), true);
  const rng = new RNG(3);
  for (let i = 0; i < 30; i++) {
    const mesaSpot = sampleWoodLocal('rimefang', rng, 4);
    assert.equal(exoticLocal('rimefang', mesaSpot.lx, mesaSpot.lz), true);
    const den = sampleWoodLocal('southford', rng, 4);
    assert.equal(exoticLocal('southford', den.lx, den.lz), true);
  }
});

test('each wood sculpts a full trunk and a distinct crown', () => {
  const seen = [];
  for (const w of WOODS) {
    const sculpt = sculptWoodTree(w.level, w);
    const trunk = avg(sculpt.trunk);
    const leaves = avg(sculpt.foliage);
    assert.ok(trunk.n > 140, `${w.id} trunk ${trunk.n}`);
    assert.ok(leaves.n > 280, `${w.id} crown ${leaves.n}`);
    const parts = buildWoodTree(w.level + 1, w);
    assert.ok(parts.filter((p) => p.kind === 'solid').length >= 2, w.id);
    assert.ok(parts[0].geo.getAttribute('position').count > 80, w.id);
    if (w.id === 'aspen') assert.ok((trunk.r + trunk.g + trunk.b) / 3 > 170);
    if (w.id === 'ebony') assert.ok((trunk.r + trunk.g + trunk.b) / 3 < 70);
    if (w.id === 'pine') assert.ok(leaves.g > leaves.r + 10 && leaves.g > leaves.b);
    if (w.id === 'spruce') assert.ok(leaves.b > 70 && leaves.g > leaves.r);
    if (w.id === 'fir') assert.ok(leaves.g > 90 && leaves.g > leaves.b);
    if (w.id === 'purpleheart') assert.ok(countWhere(sculpt.trunk, (r, g, b) => b > 90 && b > g + 20 && r > 50) > 20);
    if (w.id === 'padauk') assert.ok(countWhere(sculpt.trunk, (r, g, b) => r > 170 && g < 150 && b < 90) > 15);
    if (w.id === 'bocote') {
      assert.ok(countWhere(sculpt.trunk, (r, g) => r > 160 && g > 120) > 20);
      assert.ok(countWhere(sculpt.trunk, (r) => r < 80) > 20);
    }
    if (w.id === 'cherry') assert.ok(countWhere(sculpt.foliage, (r, g, b) => r > 180 && b > 110 && g < 210) > 30);
    if (w.id === 'wenge') assert.ok(countWhere(sculpt.trunk, (r, g, b) => r > 170 && g > 140 && b > 100) > 15);
    const key = [trunk.r, trunk.g, trunk.b, leaves.r, leaves.g, leaves.b].map((n) => Math.round(n / 12));
    const prev = seen.find((s) => s.key.every((n, i) => n === key[i]));
    assert.equal(prev, undefined, `${w.id} matches ${prev?.id}`);
    seen.push({ id: w.id, key });
  }
});
