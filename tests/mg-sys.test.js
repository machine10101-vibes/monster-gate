import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FISH, ROCKS, SMELTS, burnChance, burnXp } from '../src/data/gathering.js';
import { GEAR, MONSTERS, gearById } from '../src/data/catalog.js';
import { skillPointsEarned, SKILL_POINT_PER_KILLS } from '../src/systems/progress.js';
import { QUESTS, questById } from '../src/data/quests.js';
import { mergeAccountProgress } from '../supabase/functions/hunter/huntMerge.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('BAL-1 Darksycle catalog level matches a mid-game cave boss', () => {
  const m = MONSTERS.find((x) => x.id === 'darksycledragon');
  assert.equal(m.level, 7);
  const monsters = src('../src/entities/monsters.js');
  assert.match(monsters, /darksycledragon: \{ name: 'Darksycle Dragon', hp: 155,[\s\S]*dmg: 5/);
});

test('BAL-2 burn chance tapers and burnt fish still grant XP', () => {
  const shrimp = FISH.shrimp;
  assert.ok(Math.abs(burnChance(shrimp, 1) - 0.26) < 1e-9);
  assert.ok(burnChance(shrimp, 1) < 0.5);
  assert.ok(burnChance(shrimp, 20) < burnChance(shrimp, 1));
  assert.equal(burnChance(shrimp, 99), 0.05);
  assert.equal(burnXp(shrimp), Math.max(1, Math.round(shrimp.cookXp * 0.4)));
});

test('BAL-3 weapon tiers: starter hammer no longer beats iron or budge swords', () => {
  const hud = src('../src/ui/hud.js');
  assert.match(hud, /id: 'hammer'[\s\S]*?dmg: 10/);
  const iron = gearById('ironsword');
  const budge = gearById('budgeblade');
  assert.equal(iron.item.dmg, 14);
  assert.equal(budge.item.dmg, 18);
  assert.ok(10 < iron.item.dmg);
  assert.ok(iron.item.dmg < budge.item.dmg);
});

test('BAL-4 a full 7-point path takes far more than 10 kills', () => {
  assert.equal(SKILL_POINT_PER_KILLS, 8);
  assert.equal(skillPointsEarned('warrior', 10, 0), 3);
  assert.ok(skillPointsEarned('warrior', 10, 0) < 7);
  assert.equal(skillPointsEarned('warrior', 40, 0), 7);
});

test('BAL-5 knights hit 5 and dusk hammer needs Strength 20', () => {
  const monsters = src('../src/entities/monsters.js');
  assert.match(monsters, /demonknight: \{ name: 'Demon Knight', hp: 320,[\s\S]*dmg: 5/);
  assert.match(monsters, /holyknight: \{ name: 'Holy Knight', hp: 300,[\s\S]*dmg: 5/);
  const hammer = gearById('darkhammer');
  assert.equal(hammer.reqLevel, 20);
  assert.equal(hammer.item.dmg, 42);
});

test('BAL-6 mining ladder has iron, coal, mithril, adamite', () => {
  assert.equal(ROCKS.iron.level, 15);
  assert.equal(ROCKS.coal.level, 30);
  assert.equal(ROCKS.mithril.level, 45);
  assert.equal(ROCKS.adamite.level, 60);
  assert.equal(ROCKS.titanium.level, 75);
  assert.equal(ROCKS.platinum.level, 90);
  assert.equal(SMELTS.steel.out, 'steel_bar');
  assert.equal(SMELTS.mithril.out, 'mithril_bar');
  assert.equal(SMELTS.adamite.out, 'adamite_bar');
  assert.ok(!ROCKS.tin);
  assert.ok(!ROCKS.adamant);
  assert.ok(!ROCKS.steel);
});

test('MG-SYS-2 guest join times out instead of waiting forever', () => {
  const session = src('../src/net/session.js');
  assert.match(session, /export const JOIN_MS = 15000/);
  assert.match(session, /parkLocalHunt/);
  assert.match(session, /failJoin/);
});

test('MG-SYS-1 corrupt saves are copied to a .bak key', () => {
  const io = src('../src/systems/saveio.js');
  assert.match(io, /BACKUP_SUFFIX = '\.bak'/);
  assert.match(io, /backupCorrupt/);
});

test('content quests Deep Dig and Lira burnt pan are reachable', () => {
  const deep = questById('deepdig');
  const pan = questById('burntpan');
  assert.ok(deep);
  assert.deepEqual(deep.requires, ['pit']);
  assert.ok(pan);
  assert.deepEqual(pan.requires, ['lira']);
  assert.ok(QUESTS.some((q) => q.id === 'deepdig'));
});

test('huntMerge still folds two rosters', () => {
  const a = { savedAt: 1, roster: { v: 1, last: 'c1', chars: [{ id: 'c1', name: 'Ann', hunt: { savedAt: 1 } }], deleted: [] } };
  const b = { savedAt: 2, roster: { v: 1, last: 'c2', chars: [{ id: 'c2', name: 'Bea', hunt: { savedAt: 2 } }], deleted: [] } };
  const m = mergeAccountProgress(a, b);
  assert.equal(m.roster.chars.length, 2);
});

test('MG-UI title: guest play, matching email button, password hint, cover fit, no float', () => {
  const html = src('../index.html');
  const css = src('../src/style.css');
  const main = src('../src/main.js');
  assert.match(html, /id="btn-guest"[^>]*>Play as guest/);
  assert.match(html, /id="btn-account-signin" class="start"/);
  assert.match(html, /id="account-pass-hint"[^>]*>Use 8 to 72 characters/);
  assert.match(css, /#game \{[\s\S]*object-fit: cover/);
  assert.match(css, /#title \.account-choices \.start \{[\s\S]*animation: none/);
  assert.match(main, /playAsGuest\(\)/);
  assert.match(main, /kind: 'guest'/);
});

test('dusk weapons besides the hammer still gate on Strength', () => {
  for (const id of ['darksword', 'darkscythe', 'darkbow']) {
    assert.ok(gearById(id).reqLevel >= 16, id);
  }
  assert.ok(GEAR.some((g) => g.id === 'darkhammer' && g.reqLevel === 20));
});
