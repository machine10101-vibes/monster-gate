import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { questById } from '../src/data/quests.js';
import { Journal } from '../src/systems/journal.js';

/** A stand-in for Progress that keeps the journal as the saved hunter would. */
function progressWith(journal = null) {
  return { data: { journal }, saves: 0, save() { this.saves += 1; }, good: () => 0, takeGood: () => true };
}
const goldOf = (events) => events.filter((e) => e?.complete).reduce((a, e) => a + (e.gold || 0), 0);

test('Five for the Board: kills are tracked, the reward is paid exactly once, and it survives a reload', () => {
  const progress = progressWith();
  const j = new Journal(progress);
  // Finish the opening quest through its own steps' completion so the board quest opens.
  while (j.status('restless') === 'active') j.completeStep('restless');
  assert.equal(j.status('board'), 'active');
  const q = questById('board');
  const need = q.steps[0].count;

  // Chickens do not count; gate creatures do, and the tracker counts up.
  assert.deepEqual(j.onKill('chicken'), []);
  assert.equal(j.row('board').n || 0, 0);
  let paid = 0;
  for (let i = 1; i < need; i++) {
    paid += goldOf(j.onKill('slime'));
    assert.equal(j.row('board').n, i);
  }
  assert.equal(paid, 0, 'nothing paid before the last kill');
  const last = j.onKill('boar');
  assert.equal(goldOf(last), 0, 'the fifth kill advances to the report; it does not pay yet');
  assert.equal(j.row('board').step, 1);
  // Kills while the report is pending do not count toward anything.
  assert.deepEqual(j.onKill('slime'), []);

  // Reporting to Mira completes the quest and pays its reward once.
  const report = j.finishTalk('board');
  assert.equal(report.ok, true);
  assert.equal(goldOf([report]), q.reward.gold);
  assert.equal(j.status('board'), 'done');
  // Talking again, or more kills, pay nothing more.
  assert.equal(j.finishTalk('board').ok, false);
  for (let i = 0; i < 6; i++) assert.equal(goldOf(j.onKill('slime')), 0);

  // Reload the saved journal into a fresh hunter session: still done, never paid again.
  const saved = JSON.parse(JSON.stringify(progress.data.journal));
  const again = new Journal(progressWith(saved));
  assert.equal(again.status('board'), 'done');
  assert.equal(goldOf(again.onKill('slime')), 0);
  assert.equal(again.finishTalk('board').ok, false);
  assert.equal(again.row('board').done, true);
});

test('a monster can only die once, so one kill never counts twice', () => {
  const mon = readFileSync(new URL('../src/entities/monsters.js', import.meta.url), 'utf8');
  assert.match(mon, /  die\(\) \{\n    if \(this\.dead\) return;/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  // Quest gold comes from the completion event once.
  assert.match(main, /if \(e\.gold\) this\.addGold\(e\.gold\);/);
});
