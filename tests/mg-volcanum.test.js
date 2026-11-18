import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('Volcanum nests on the walkable south shoulder, not behind a lava wall', () => {
  const spec = VOLCANIC_SPECS.cinderfall;
  const L = spec.lair;
  assert.equal(L.cx, 58);
  assert.equal(L.cz, 72);
  const nest = volcanicFeature(3.6, L.cx, L.cz, spec);
  assert.equal(nest.kind, 0);
  assert.equal(nest.climb, true);
  assert.ok(nest.h > 8, `nest is still below the old wall (${nest.h})`);
  const south = volcanicFeature(3.6, 58, 90, spec);
  assert.notEqual(south?.kind, K_LAVA);
  const dress = readFileSync(new URL('../src/world/volcanic.js', import.meta.url), 'utf8');
  assert.doesNotMatch(dress, /lairFeature/);
});

test('the dragon, his lava, and his forged gear all build', () => {
  const dragon = buildVolcanumDragon();
  assert.ok(dragon.root);
  assert.ok(dragon.parts.head && dragon.parts.jaw && dragon.parts.wings.length === 2);
  assert.ok(dragon.parts.wingsOuter.length === 2 && dragon.parts.legs.length === 4 && dragon.parts.tail.length >= 4);
  assert.ok(dragon.parts.breath && dragon.parts.breath.children.length > 20);
  assert.ok(Math.abs(dragon.parts.wings[0].rotation.z) > 0.8, 'wings rest raised like the reference');
  assert.ok(dragon.parts.jaw.rotation.x > 0.6, 'the still render keeps the mouth open');
  const bolt = buildProjectileMesh({ kind: 'lavabolt' });
  assert.ok(bolt);
  for (const id of HELD) assert.ok(buildWeaponVoxels(id), id);
  for (const id of SET_IDS) assert.ok(painterFor(id), id);
  assert.ok(buildShieldModel('volcanumset'));
});
