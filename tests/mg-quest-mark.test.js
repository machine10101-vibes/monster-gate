import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { QUEST_MARK_OFFER, QUEST_MARK_STEP, questById, questGiverNpc } from '../src/data/quests.js';
import { Journal } from '../src/systems/journal.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function stubProgress() {
  const data = { journal: null };
  return {
    data,
    good() { return 0; },
    takeGood() { return true; },
    save() {},
  };
}

test('quest givers map onto town NPC ids', () => {
  assert.equal(questGiverNpc(questById('restless')), 'guild');
  assert.equal(questGiverNpc(questById('board')), 'guild');
  assert.equal(questGiverNpc(questById('pit')), 'smith');
  assert.equal(questGiverNpc(questById('lira')), 'alchemist');
  assert.equal(questGiverNpc(questById('fence')), 'farmer');
  assert.equal(questGiverNpc(questById('shiny')), 'child');
});

test('Mira shows a gold ! for the offering talk, then a green ! to continue', () => {
  const j = new Journal(stubProgress());
  assert.equal(j.status('restless'), 'active');
  assert.equal(j.markFor('guild'), QUEST_MARK_OFFER);
  assert.equal(j.markFor('smith'), '');

  const first = j.finishTalk('restless', 'lore');
  assert.equal(first.ok, true);
  assert.equal(j.markFor('guild'), '', 'visit the gate — no bang on Mira');

  const visit = j.pulse({ x: 0, z: 0 }, { gate: { x: 0, z: 0 } });
  assert.ok(visit.some((e) => e.advance || e.complete));
  assert.equal(j.markFor('guild'), QUEST_MARK_STEP);
  assert.equal(j.markFor('farmer'), '');
});

test('an available quest still paints a gold ! on its giver', () => {
  const j = new Journal(stubProgress());
  const row = j.row('restless');
  row.done = true;
  row.step = 3;
  assert.equal(j.status('restless'), 'done');
  assert.equal(j.status('board'), 'available');
  assert.equal(j.offerFor('guild')?.id, 'board');
  assert.equal(j.markFor('guild'), QUEST_MARK_OFFER);
});

test('NPC nameplates hang a gold or green ! above the head', () => {
  const ambient = src('../src/entities/ambient.js');
  const style = src('../src/style.css');
  const main = src('../src/main.js');
  assert.match(ambient, /markFor\?\.\(this\.def\.id\)/);
  assert.match(ambient, /q-bang \$\{mark\}/);
  assert.match(style, /\.nameplate \.q-bang\.offer \{[\s\S]*#ffe27a/);
  assert.match(style, /\.nameplate \.q-bang\.step \{[\s\S]*#6ee58a/);
  assert.match(style, /@keyframes q-bang-bob/);
  assert.match(main, /journal\.offerFor\(near\.def\.id\)/);
  assert.match(main, /service === 'alchemy' && !script/);
});
