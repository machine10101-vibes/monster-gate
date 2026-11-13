import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GEAR, MONSTERS, gearById } from '../src/data/catalog.js';
import { QUESTS, questById } from '../src/data/quests.js';
import { KNIGHT_TYPES } from '../src/data/knights.js';
import {
  BOUNTY_HOUR_CAP,
  BOUNTY_SLOTS,
  bountyGold,
  bountyNeed,
  bountyXp,
  canClaim,
  eligibleTemplates,
  gatherProgress,
  makeSlots,
} from '../src/data/bounties.js';
import { Bounties } from '../src/systems/bounties.js';
import {
  partySize,
  riftChestGold,
  riftScale,
  riftWaveSpawns,
  RIFT_WAVES,
} from '../src/data/rift.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function mockProgress(over = {}) {
  const data = {
    hunter: { rank: 0 },
    bounties: {},
    xp: {},
    goods: {},
    ...over,
  };
  return {
    data,
    level: () => 1,
    good: (id) => data.goods[id] | 0,
    takeGood: (id, n) => {
      if ((data.goods[id] | 0) < n) return false;
      data.goods[id] -= n;
      return true;
    },
    addXp: () => 0,
    save() {},
  };
}

test('keep assault quest walks both keeps and the warden', () => {
  const q = questById('keepassault');
  assert.ok(q);
  assert.deepEqual(q.requires, ['mark']);
  assert.equal(q.reward.gold, 70);
  assert.equal(q.reward.gear, 'ashenbrand');
  const kinds = q.steps.map((s) => `${s.kind}:${s.spot || s.types?.[0] || s.npc}`);
  assert.deepEqual(kinds, [
    'talk:guild',
    'visit:hellspire',
    'kill:demonknight',
    'visit:dawnspire',
    'kill:holyknight',
    'visit:warfield',
    'kill:keepwarden',
    'talk:guild',
  ]);
  assert.equal(q.steps.find((s) => s.types?.[0] === 'demonknight').count, 2);
  assert.equal(q.steps.find((s) => s.types?.[0] === 'holyknight').count, 2);
  assert.ok(QUESTS.some((row) => row.id === 'keepassault'));
});

test('Ashen Brand sits between Budgefang and Hellrend', () => {
  const brand = gearById('ashenbrand');
  const budge = gearById('budgeblade');
  const hell = gearById('demonsword');
  const dusk = gearById('darkhammer');
  assert.equal(brand.item.dmg, 20);
  assert.equal(brand.reqLevel, 12);
  assert.ok(budge.item.dmg < brand.item.dmg);
  assert.ok(brand.item.dmg < hell.item.dmg);
  assert.ok(brand.item.dmg < dusk.item.dmg);
  assert.ok(GEAR.some((g) => g.id === 'ashenbrand' && g.found));
});

test('Keep Warden is a level 12 field boss, harder than posted knights', () => {
  const cat = MONSTERS.find((m) => m.id === 'keepwarden');
  assert.equal(cat.level, 12);
  assert.ok(KNIGHT_TYPES.has('keepwarden'));
  const monsters = src('../src/entities/monsters.js');
  assert.match(monsters, /keepwarden: \{ name: 'Keep Warden', hp: 420,[\s\S]*dmg: 7/);
  assert.match(monsters, /demonknight: \{ name: 'Demon Knight', hp: 320,[\s\S]*dmg: 5/);
});

test('bounties scale with rank and skill, three slots, six claims an hour', () => {
  const levels = { mining: 1, fishing: 1, woodcutting: 1, cooking: 1, strength: 1 };
  const low = eligibleTemplates(0, levels);
  const high = eligibleTemplates(4, { ...levels, mining: 15 });
  assert.ok(low.every((t) => (t.minRank | 0) === 0));
  assert.ok(high.some((t) => t.id === 'demon' || t.id === 'iron'));
  const slots = makeSlots(7, 2, levels);
  assert.equal(slots.length, BOUNTY_SLOTS);
  assert.ok(slots.every((s) => s.n === 0 && s.need >= 1 && s.gold >= 8 && s.xp >= 12));
  assert.equal(bountyNeed({ need: 4 }, 3), 5);
  assert.ok(bountyGold({ kind: 'kill' }, 4, 6) > bountyGold({ kind: 'kill' }, 0, 6));
  assert.equal(bountyXp('mining', 1), Math.max(12, Math.min(220, bountyXp('mining', 1))));
  assert.ok(bountyXp('mining', 50) <= 220);
  assert.equal(gatherProgress({ kind: 'gather', need: 4, base: 10 }, 12), 2);
  assert.ok(canClaim({ hourAt: Date.now(), hourN: 5 }));
  assert.equal(canClaim({ hourAt: Date.now(), hourN: BOUNTY_HOUR_CAP }), false);
});

test('bounty claims consume gather goods and refuse a second turn-in', () => {
  const progress = mockProgress({ goods: { copper_ore: 8 } });
  const board = new Bounties(progress);
  board.state.slots = [
    { id: 'copper', kind: 'gather', good: 'copper_ore', skill: 'mining', need: 4, n: 0, gold: 12, xp: 20, label: 'Copper ore' },
    { id: 'slime', kind: 'kill', type: 'slime', skill: 'strength', need: 6, n: 0, gold: 14, xp: 16, label: 'Gate Slimes' },
    { id: 'boar', kind: 'kill', type: 'boar', skill: 'strength', need: 4, n: 0, gold: 12, xp: 16, label: 'Thorn Boars' },
  ];
  board.state.rotatedAt = Date.now();
  board.state.hourAt = Date.now();
  board.state.hourN = 0;
  assert.equal(board.onGather('copper_ore', 4), true);
  assert.equal(board.ready(board.slot(0)), true);
  const first = board.claim(0);
  assert.equal(first.ok, true);
  assert.equal(progress.good('copper_ore'), 4);
  assert.equal(board.claim(0).ok, false);
  assert.equal(board.remainingClaims(), BOUNTY_HOUR_CAP - 1);
  board.onKill('slime');
  board.onKill('slime');
  assert.equal(board.progressOf(board.slot(1)), 2);
  assert.equal(board.ready(board.slot(1)), false);
});

test('old stacks and storage pulls do not fill a gather bounty', () => {
  const progress = mockProgress({ goods: { birch_logs: 20 } });
  const board = new Bounties(progress);
  board.state.slots = [
    { id: 'birch', kind: 'gather', good: 'birch_logs', skill: 'woodcutting', need: 4, n: 0, gold: 10, xp: 16, label: 'Birch logs' },
  ];
  board.state.rotatedAt = Date.now();
  assert.equal(board.ready(board.slot(0)), false);
  progress.data.goods.birch_logs = 24;
  assert.equal(board.progressOf(board.slot(0)), 0);
  board.onGather('birch_logs', 4);
  assert.equal(board.ready(board.slot(0)), true);
});

test('rift HP and damage scale from solo to four, waves stay short', () => {
  const solo = riftScale(1);
  const four = riftScale(4);
  assert.equal(solo.hpMul, 1);
  assert.equal(solo.dmgMul, 1);
  assert.ok(four.hpMul > solo.hpMul);
  assert.ok(four.dmgMul > solo.dmgMul);
  assert.ok(four.hpMul - 1 > four.dmgMul - 1);
  assert.equal(RIFT_WAVES.length, 3);
  assert.equal(riftWaveSpawns(1, 1).length, 4);
  assert.ok(riftWaveSpawns(1, 4).length > riftWaveSpawns(1, 1).length);
  assert.equal(riftWaveSpawns(3, 4).filter((t) => t === 'budgedragon').length, 1);
  assert.equal(riftChestGold(1), 38);
  assert.equal(riftChestGold(4), 80);
  assert.equal(partySize({ wallet: { kind: 'guest' }, net: { peers: { size: 3 } } }), 1);
  assert.equal(partySize({ wallet: { kind: 'email' }, net: { peers: { size: 3 } } }), 4);
});

test('slice wiring: rift button, guest-session block, journal gear reward', () => {
  const hud = src('../src/ui/hud.js');
  const rift = src('../src/world/rift.js');
  const session = src('../src/net/session.js');
  const journal = src('../src/systems/journal.js');
  const main = src('../src/main.js');
  assert.match(hud, /id="wg-rift-enter"/);
  assert.match(hud, /Enter a rift/);
  assert.match(rift, /guest-session/);
  assert.match(rift, /m\.def = \{ \.\.\.m\.def/);
  assert.match(session, /Sign in with an account to hunt with friends/);
  assert.match(journal, /gear: q\.reward\?\.gear/);
  assert.match(main, /hellspire: this\.world\.demonKeep/);
  assert.match(main, /grantFound\(e\.gear\)/);
  assert.match(main, /enterRiftFromGate/);
  const journalUi = src('../src/ui/journal.js');
  assert.match(journalUi, /\/\^b\\d\+\$\/\.test\(sel\)/);
});
