import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DROPS, GEAR, MATERIALS, MONSTERS, SETS, gearById } from '../src/data/catalog.js';
import { K_LAVA, VOLCANIC_SPECS, volcanicFeature } from '../src/world/volcanic.js';
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

test('the cinderfall lair is a walkable isle inside a lava moat with a bridge', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const L = spec.lair;
  assert.equal(L.cx, 48);
  assert.equal(L.cz, 104);
  const island = volcanicFeature(3.6, L.cx, L.cz, spec);
  assert.equal(island.kind, 0);
  assert.ok(island.h > 5 && island.h < 8.6);
  const moat = volcanicFeature(3.6, 28, 102, spec);
  assert.equal(moat.kind, K_LAVA);
  assert.ok(moat.h < 2);
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
