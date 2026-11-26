import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeaponVoxels, WEAPON_SIZE } from '../src/entities/weaponModels.js';

const MONSTERS = {
  budge: { onesword: 'budgeblade', twosword: 'budgegreatsword', dual: 'budgedual', hammer: 'budgemaul', spear: 'budgespear', staff: 'budgestaff', wand: 'budgewand', shortbow: 'budgeshortbow', longbow: 'budgebow', crossbow: 'budgecrossbow' },
  dusk: { onesword: 'darksword', twosword: 'darkgreatsword', dual: 'darkdual', hammer: 'darkhammer', spear: 'darkspear', staff: 'darkstaff', wand: 'darkwand', shortbow: 'darkshortbow', longbow: 'darkbow', crossbow: 'darkcrossbow', scythe: 'darkscythe' },
  frost: { onesword: 'yetisword', twosword: 'yetigreatsword', dual: 'yetidual', hammer: 'yetihammer', spear: 'yetispear', staff: 'yetistaff', wand: 'yetiwand', shortbow: 'yetishortbow', longbow: 'yetilongbow', crossbow: 'yeticrossbow', scythe: 'yetiscythe' },
  volc: { onesword: 'volcsword', twosword: 'volcgreatsword', dual: 'volcdual', hammer: 'volchammer', spear: 'volcspear', staff: 'volcstaff', wand: 'volcwand', shortbow: 'volcshortbow', longbow: 'volcbow', crossbow: 'volccrossbow', scythe: 'volcscythe' },
};

const models = new Map();
function model(kind) {
  if (!models.has(kind)) models.set(kind, buildWeaponVoxels(kind));
  return models.get(kind);
}

/** A cheap shape signature: occupancy of the voxel grid, ignoring colour. */
function signature(m) {
  const { M } = m;
  let filled = 0;
  for (let i = 0; i < M.data.length; i++) if (M.data[i]) filled++;
  return `${M.sx}x${M.sy}x${M.sz}:${filled}`;
}

test('every monster weapon is sculpted, not a recoloured shared shape', () => {
  const types = new Set(Object.values(MONSTERS).flatMap((m) => Object.keys(m)));
  for (const type of types) {
    const kinds = Object.values(MONSTERS).map((m) => m[type]).filter(Boolean);
    const sigs = kinds.map((k) => signature(model(k)));
    assert.equal(new Set(sigs).size, kinds.length, `${type}: ${kinds.join(', ')} share a silhouette`);
  }
});

test('monster weapons stay inside the size envelope the animations expect', () => {
  const limit = { onesword: 1.6, twosword: 2.0, dual: 1.05, hammer: 1.7, spear: 2.45, staff: 2.1, wand: 1.15, crossbow: 1.2, scythe: 1.7 };
  for (const set of Object.values(MONSTERS)) {
    for (const [type, kind] of Object.entries(set)) {
      const { M, oz } = model(kind);
      if (type === 'shortbow' || type === 'longbow') {
        const half = (M.sy * WEAPON_SIZE) / 2;
        assert.ok(half > 0.4 && half < 0.9, `${kind} bow span ${half.toFixed(2)}`);
        continue;
      }
      const top = (M.sz - oz) * WEAPON_SIZE;
      assert.ok(top < limit[type], `${kind} reaches ${top.toFixed(2)}m`);
      assert.ok(oz * WEAPON_SIZE < 0.65, `${kind} butt ${(oz * WEAPON_SIZE).toFixed(2)}m`);
    }
  }
});

test('monster bows carry a drawable string', () => {
  for (const set of Object.values(MONSTERS)) {
    for (const kind of [set.shortbow, set.longbow]) {
      const s = model(kind).bowString;
      assert.ok(s, `${kind} has a string`);
      assert.ok(s.top[1] > 0.3 && s.bottom[1] < -0.3, `${kind} string spans the limbs`);
      assert.ok(s.top[2] < 0, `${kind} string sits behind the riser`);
    }
  }
});


test('all single-handed hammer catalog entries build valid voxel models', async () => {
  const { GEAR } = await import('../src/data/catalog.js');
  for (const g of GEAR.filter(g => g.wtype === 'hammer')) {
    const v = buildWeaponVoxels(g.held);
    assert.ok(v?.M?.data?.some(Boolean), g.id);
    assert.ok(v.size > 0, g.id);
    assert.equal(g.item.style, 'swordshield', g.id);
    if (!g.starter) assert.ok(Object.keys(g.recipe).length > 0 && !g.found, g.id);
  }
});


test('monster hammer families coexist with separate recipes and models', async () => {
  const { GEAR } = await import('../src/data/catalog.js');
  for (const g of GEAR.filter(g => g.wtype === 'hammer' && !g.starter && g.monster !== 'smith')) {
    const heavy = GEAR.find(x => x.id === `${g.id}_twohand`);
    assert.ok(heavy, g.id);
    assert.equal(heavy.item.style, 'twohand');
    assert.equal(g.item.style, 'swordshield');
    assert.ok(Object.keys(heavy.recipe).length);
    assert.ok(buildWeaponVoxels(heavy.held)?.M?.data?.some(Boolean), heavy.id);
  }
});


test('forge groups hammer variants with their source monster rather than weapon type', async () => {
  const { readFileSync } = await import('node:fs');
  const { GEAR, weapons } = await import('../src/data/catalog.js');
  const ui = readFileSync(new URL('../src/ui/catalog.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /Monster (single|two)-handed hammers/);
  assert.match(ui, /const list = weapons\(m\.id\);/);
  for (const g of GEAR.filter(g => g.wtype === 'hammer' && !g.starter && g.monster !== 'smith')) {
    const group = weapons(g.monster);
    assert.ok(group.some(x => x.id === g.id), g.id);
    assert.ok(group.some(x => x.id === `${g.id}_twohand`), g.id);
  }
});
