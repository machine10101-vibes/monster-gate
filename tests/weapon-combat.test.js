import test from 'node:test';
import assert from 'node:assert/strict';
import { weaponFamily, isTwoHandedFamily } from '../src/entities/weaponCombat.js';

test('weapon handling profiles distinguish melee weapon families', () => {
  assert.equal(weaponFamily({ kind: 'melee', style: 'swordshield', held: 'orcblade' }), 'sword');
  assert.equal(weaponFamily({ kind: 'melee', style: 'twohand', held: 'budgemaul' }), 'heavy');
  assert.equal(weaponFamily({ kind: 'melee', held: 'ironspear' }), 'spear');
  assert.equal(weaponFamily({ kind: 'melee', held: 'darkscythe' }), 'scythe');
  assert.equal(weaponFamily({ kind: 'melee', held: 'piratedual' }), 'dual');
  assert.equal(weaponFamily({ kind: 'melee', held: 'tigerclaws' }), 'dual');
});

test('ranged and arcane weapons get their own handling profiles', () => {
  assert.equal(weaponFamily({ kind: 'ranged', style: 'longbow', held: 'budgebow' }), 'bow');
  assert.equal(weaponFamily({ kind: 'ranged', style: 'crossbow', held: 'darkcrossbow' }), 'crossbow');
  assert.equal(weaponFamily({ kind: 'ranged', style: 'staff', held: 'darkstaff' }), 'staff');
  assert.equal(weaponFamily({ kind: 'ranged', style: 'wand', held: 'darkwand' }), 'magic');
});

test('two-handed handling excludes one-handed blades and focuses', () => {
  for (const family of ['heavy', 'spear', 'scythe', 'bow', 'crossbow', 'staff']) {
    assert.equal(isTwoHandedFamily(family), true, family);
  }
  for (const family of ['sword', 'dual', 'magic', 'tool', 'throw']) {
    assert.equal(isTwoHandedFamily(family), false, family);
  }
});
