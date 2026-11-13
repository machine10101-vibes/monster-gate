import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { GEAR, SETS, armorPieces, gearById, weapons } from '../src/data/catalog.js';
import { GOODS, ROCKS, SKILL_ORDER, SMELTS, xpForLevel } from '../src/data/gathering.js';
import {
  COAL_ROCK, GEAR_ALIASES, GOOD_ALIASES, METAL_ORDER, METALS, aliasGearId, aliasGoodId,
} from '../src/data/metals.js';
import { TEMPLATES } from '../src/data/bounties.js';
import { questById } from '../src/data/quests.js';
import { TILES } from '../src/world/tiles.js';
import { Progress, ANON_KEY } from '../src/systems/progress.js';
import { freezeSaves } from '../src/systems/saveio.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const SLOTS = ['helm', 'chest', 'arms', 'legs', 'boots', 'shield'];
const WEAPON_KINDS = ['sword', 'greatsword', 'spear', 'hammer'];

const mem = new Map();

function installStorage() {
  globalThis.localStorage = {
    getItem(k) { return mem.has(k) ? mem.get(k) : null; },
    setItem(k, v) { mem.set(k, String(v)); },
    removeItem(k) { mem.delete(k); },
  };
}

before(() => {
  installStorage();
  freezeSaves(false);
});

after(() => {
  freezeSaves(false);
  mem.clear();
});

function freshProgress(raw = {}) {
  mem.set(ANON_KEY, JSON.stringify(raw));
  const pr = new Progress();
  pr.sessionOnly = true;
  return pr;
}

test('exactly seven metal tiers in Brandon order', () => {
  assert.deepEqual(METAL_ORDER, ['copper', 'iron', 'steel', 'mithril', 'adamite', 'titanium', 'platinum']);
  assert.equal(METALS.length, 7);
  assert.deepEqual(METALS.map((m) => m.id), METAL_ORDER);
  for (let i = 1; i < METALS.length; i++) {
    assert.equal(METALS[i].rank, i);
    assert.ok(METALS[i].smith > METALS[i - 1].smith, METALS[i].id);
    assert.ok(METALS[i].equip > METALS[i - 1].equip, METALS[i].id);
    assert.ok(METALS[i].swordDmg > METALS[i - 1].swordDmg, METALS[i].id);
    assert.ok(METALS[i].barXp > METALS[i - 1].barXp, METALS[i].id);
  }
});

test('mining: one ore node per tier except steel, plus coal', () => {
  const ores = METALS.filter((m) => m.ore);
  assert.equal(ores.length, 6);
  assert.equal(METALS.find((m) => m.id === 'steel').ore, false);
  assert.ok(!ROCKS.steel);
  assert.ok(!ROCKS.tin);
  assert.ok(!ROCKS.adamant);
  assert.ok(!ROCKS.bronze);
  for (const m of ores) {
    const rock = ROCKS[m.id];
    assert.ok(rock, m.id);
    assert.equal(rock.ore, `${m.id}_ore`);
    assert.equal(rock.level, m.mine);
    assert.equal(rock.xp, m.mineXp);
    assert.equal(rock.base, m.mineBase);
    assert.equal(rock.respawn, m.respawn);
    assert.ok(GOODS[m.oreId], m.oreId);
  }
  assert.equal(ROCKS.coal.level, COAL_ROCK.level);
  assert.equal(ROCKS.coal.ore, 'coal');
  assert.ok(GOODS.coal);
  const mined = ores.map((m) => m.mine);
  for (let i = 1; i < mined.length; i++) assert.ok(mined[i] > mined[i - 1]);
  const rocks = ores.map((m) => ROCKS[m.id]);
  for (let i = 1; i < rocks.length; i++) {
    assert.ok(rocks[i].respawn > rocks[i - 1].respawn, rocks[i].id);
    assert.ok(rocks[i].base < rocks[i - 1].base, rocks[i].id);
    assert.ok(rocks[i].xp > rocks[i - 1].xp, rocks[i].id);
  }
});

test('nodes sit in zones that match the difficulty curve', () => {
  const gather = src('../src/world/gatherSite.js');
  assert.match(gather, /type: 'copper'/);
  assert.match(gather, /type: 'iron'/);
  assert.doesNotMatch(gather, /type: 'tin'/);
  assert.match(gather, /type: 'coal'/);
  assert.match(gather, /type: 'mithril'/);
  assert.match(gather, /type: 'adamite'/);
  assert.doesNotMatch(gather, /type: 'adamant'/);
  assert.match(gather, /kind: 'cinderfall', type: 'titanium'/);
  assert.match(gather, /kind: 'glimmerfrost', type: 'platinum'/);
  assert.ok(TILES.some((t) => t.kind === 'cinderfall' && t.built));
  assert.ok(TILES.some((t) => t.kind === 'glimmerfrost' && t.built));
});

test('smithing: smelt bars then forge a full set and weapons per tier', () => {
  assert.equal(SKILL_ORDER.indexOf('smithing'), SKILL_ORDER.indexOf('mining') + 1);
  for (const m of METALS) {
    const rec = SMELTS[m.id];
    assert.ok(rec, m.id);
    assert.equal(rec.out, m.barId);
    assert.equal(rec.level, m.smith);
    assert.equal(rec.xp, m.barXp);
    assert.ok(GOODS[m.barId], m.barId);
    if (m.ore) {
      assert.deepEqual(rec.ins[0], [m.oreId, 1]);
    } else {
      assert.deepEqual(rec.ins[0], ['iron_ore', 1]);
    }
    if (m.coal) assert.ok(rec.ins.some(([id, n]) => id === 'coal' && n === m.coal), m.id);
    else assert.ok(!rec.ins.some(([id]) => id === 'coal'), m.id);

    const set = SETS.find((s) => s.id === m.setId);
    assert.ok(set, m.setId);
    assert.equal(set.hp, m.setHp);
    assert.equal(set.stamina, m.setStam || 0);

    for (const slot of SLOTS) {
      const g = gearById(`${m.id}${slot}`);
      assert.ok(g, `${m.id}${slot}`);
      assert.equal(g.type, 'armor');
      assert.equal(g.slot, slot);
      assert.equal(g.set, m.setId);
      assert.equal(g.def, m.def[slot]);
      assert.equal(g.reqLevel, m.equip);
      assert.ok(g.reqSmith >= m.smith, g.id);
      assert.equal(g.recipe[m.barId] > 0, true);
      assert.equal(Object.keys(g.recipe).length, 1);
    }
    for (const kind of WEAPON_KINDS) {
      const g = gearById(`${m.id}${kind}`);
      assert.ok(g, `${m.id}${kind}`);
      assert.equal(g.type, 'weapon');
      assert.equal(g.metal, m.id);
      assert.equal(g.reqLevel, m.equip);
      assert.ok(g.reqSmith >= m.smith, g.id);
      assert.equal(g.recipe[m.barId] > 0, true);
      assert.ok(g.item.dmg > 0);
    }
    const pieces = armorPieces(m.setId).filter((g) => SLOTS.includes(g.slot));
    assert.equal(pieces.length, 6);
    assert.equal(weapons('smith').filter((g) => g.metal === m.id).length, 4);
  }
  const ids = GEAR.map((g) => g.id);
  assert.equal(ids.length, new Set(ids).size);
  const iron = gearById('ironsword');
  assert.equal(iron.item.dmg, 14);
  const quiver = gearById('quiver');
  assert.equal(quiver.reqSmith, 15);
  assert.deepEqual(quiver.recipe, { iron_bar: 1, birch_logs: 2 });
});

test('level gates and bar costs rise; defense stays under the 50% cap until platinum', () => {
  let prevDef = 0;
  let prevBars = 0;
  for (const m of METALS) {
    const def = SLOTS.reduce((n, s) => n + m.def[s], 0);
    assert.ok(def > prevDef, m.id);
    prevDef = def;
    const setBars = m.helmBars + m.chestBars + m.armsBars + m.legsBars + m.bootsBars + m.shieldBars;
    assert.ok(setBars >= prevBars, m.id);
    prevBars = setBars;
    assert.ok(m.chestBars >= m.helmBars);
  }
  assert.equal(prevDef, 13);
  assert.ok(prevDef * 0.04 >= 0.5);
  const mithrilDef = SLOTS.reduce((n, s) => n + METALS.find((m) => m.id === 'mithril').def[s], 0);
  assert.ok(mithrilDef * 0.04 < 0.5);
});

test('tints are distinct per tier', () => {
  const plates = METALS.map((m) => m.theme.plate);
  assert.equal(new Set(plates).size, 7);
  assert.equal(METALS[0].theme.plate, 0xc56a28);
  assert.equal(METALS[1].theme.plate, 0xb7c0c8);
  assert.equal(METALS[2].theme.plate, 0x8a9aac);
  assert.equal(METALS[3].theme.plate, 0x9ec8ee);
  assert.equal(METALS[4].theme.plate, 0x4aaa5a);
  assert.equal(METALS[5].theme.plate, 0xe8eef4);
  assert.equal(METALS[6].theme.plate, 0xf4e6b0);
});

test('old goods and gear fold onto the closest living ids', () => {
  assert.equal(aliasGoodId('tin_ore'), 'copper_ore');
  assert.equal(aliasGoodId('bronze_ore'), 'copper_ore');
  assert.equal(aliasGoodId('bronze_bar'), 'copper_bar');
  assert.equal(aliasGoodId('adamant_ore'), 'adamite_ore');
  assert.equal(aliasGoodId('adamant_bar'), 'adamite_bar');
  assert.equal(aliasGoodId('iron_ore'), 'iron_ore');
  assert.equal(aliasGearId('bronzehelm'), 'copperhelm');
  assert.equal(aliasGearId('bronzesword'), 'coppersword');
  assert.equal(aliasGearId('bronzeblade'), 'coppersword');
  assert.equal(aliasGearId('adamantchest'), 'adamitechest');
  assert.equal(aliasGearId('ironsword'), 'ironsword');
  assert.ok(GEAR_ALIASES.bronzehelm);
  assert.ok(GOOD_ALIASES.tin_ore);

  const pr = freshProgress({
    goods: { tin_ore: 3, copper_ore: 2, bronze_bar: 1, adamant_ore: 4, adamant_bar: 2, iron_bar: 5 },
    crafted: { bronzehelm: true, bronzelegs: true, adamantchest: true, ironsword: true },
    armor: { helm: 'bronzehelm', chest: 'adamantchest' },
    weapon: 'bronzesword',
    storage: [
      { k: 'good', id: 'tin_ore', n: 7 },
      { k: 'gear', id: 'bronzelegs', n: 1 },
    ],
  });
  assert.equal(pr.good('copper_ore'), 5);
  assert.equal(pr.good('tin_ore'), 0);
  assert.equal(pr.good('copper_bar'), 1);
  assert.equal(pr.good('adamite_ore'), 4);
  assert.equal(pr.good('adamite_bar'), 2);
  assert.equal(pr.good('iron_bar'), 5);
  assert.equal(pr.crafted('copperhelm'), true);
  assert.equal(pr.crafted('bronzehelm'), false);
  assert.equal(pr.crafted('adamitechest'), true);
  assert.equal(pr.crafted('ironsword'), true);
  assert.equal(pr.data.armor.helm, 'copperhelm');
  assert.equal(pr.data.armor.chest, 'adamitechest');
  assert.equal(pr.data.weapon, 'coppersword');
  const stored = pr.data.storage.filter(Boolean);
  assert.ok(stored.some((s) => s.k === 'good' && s.id === 'copper_ore' && s.n === 7));
  assert.ok(stored.some((s) => s.k === 'gear' && s.id === 'copperlegs'));
});

test('smelt and forge respect smithing gates and consume the recipe', () => {
  const pr = freshProgress({
    goods: { copper_ore: 2, iron_ore: 2, coal: 2, copper_bar: 1 },
  });
  assert.equal(pr.level('smithing'), 1);
  assert.equal(pr.smeltLocked('steel'), 'smith:30');
  assert.equal(pr.smeltCan('steel'), 0);
  assert.equal(pr.smelt('steel'), 0);
  assert.equal(pr.smelt('copper'), 1);
  assert.equal(pr.good('copper_ore'), 1);
  assert.equal(pr.good('copper_bar'), 2);
  assert.ok(pr.xp('smithing') > 0);

  const helm = gearById('copperhelm');
  assert.equal(pr.canCraft(helm), true);
  assert.equal(pr.craft('copperhelm'), true);
  assert.equal(pr.good('copper_bar'), 1);
  assert.equal(pr.crafted('copperhelm'), true);
  assert.equal(pr.data.armor.helm, 'copperhelm');

  const chest = gearById('copperchest');
  assert.equal(pr.craftLock(chest), 'smith:6');
  assert.equal(pr.canCraft(chest), false);
  pr.data.xp.smithing = xpForLevel(6);
  assert.equal(pr.craftLock(chest), 'parts');

  pr.data.xp.smithing = 0;
  const steelHelm = gearById('steelhelm');
  pr.data.goods.steel_bar = 10;
  assert.equal(pr.craftLock(steelHelm), 'smith:30');
  assert.equal(pr.canCraft(steelHelm), false);
  pr.data.xp.smithing = xpForLevel(30);
  assert.equal(pr.craftLock(steelHelm), '');
  assert.equal(pr.smeltLocked('steel'), '');
  assert.equal(pr.smelt('steel'), 1);
  assert.equal(pr.good('iron_ore'), 1);
  assert.equal(pr.good('coal'), 1);
  assert.equal(pr.good('steel_bar'), 11);
});

test('pit quest and bounties no longer ask for tin or adamant', () => {
  const pit = questById('pit');
  const ore = pit.steps.find((s) => s.id === 'ore');
  const bar = pit.steps.find((s) => s.id === 'bar');
  assert.deepEqual(ore.goods, [{ id: 'copper_ore', n: 1 }]);
  assert.deepEqual(bar.goods, [{ id: 'copper_bar', n: 1 }]);
  assert.ok(!JSON.stringify(pit).includes('tin_ore'));
  assert.ok(TEMPLATES.every((t) => t.good !== 'tin_ore' && t.good !== 'adamant_ore'));
  assert.ok(TEMPLATES.some((t) => t.good === 'adamite_ore'));
  assert.ok(TEMPLATES.some((t) => t.good === 'coal'));
  assert.ok(!GEAR.some((g) => /^(tin_|bronze|adamant)/.test(g.id)));
});
