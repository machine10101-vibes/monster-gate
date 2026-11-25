import assert from 'node:assert/strict';
import { test } from 'node:test';
import { questById } from '../src/data/quests.js';
import { Journal } from '../src/systems/journal.js';

function progressWith(journal = null) {
  return {
    data: { journal },
    saves: 0,
    save() { this.saves += 1; },
    good() { return 0; },
    takeGood() { return true; },
  };
}

test('players can pin an active quest and the HUD follows its objective', () => {
  const progress = progressWith();
  const journal = new Journal(progress);
  const target = 'gilan-bowl';

  assert.equal(journal.status(target), 'active');
  assert.equal(journal.track(target), true);
  assert.equal(journal.trackedQuest(), target);

  const tracked = journal.tracker({ text: 'Guild hunt', n: 0, total: 5 });
  assert.equal(tracked.questId, target);
  assert.equal(tracked.text, journal.objective(target).text);
  assert.ok(progress.saves > 0);
});

test('the pinned quest survives loading the journal from a saved hunter', () => {
  const progress = progressWith();
  const first = new Journal(progress);
  first.track('gilan-bowl');

  const reloaded = new Journal(progress);
  assert.equal(reloaded.trackedQuest(), 'gilan-bowl');
  assert.equal(reloaded.tracker({ text: 'Guild hunt', n: 0, total: 5 }).questId, 'gilan-bowl');
});

test('locked and completed quests cannot be pinned', () => {
  const journal = new Journal(progressWith());
  assert.equal(journal.status('keepassault'), 'locked');
  assert.equal(journal.track('keepassault'), false);

  const quest = questById('gilan-bowl');
  const row = journal.row(quest.id);
  row.step = quest.steps.length;
  row.done = true;
  assert.equal(journal.track(quest.id), false);
});

test('completing the pinned quest clears the pin and restores automatic tracking', () => {
  const journal = new Journal(progressWith());
  const id = 'gilan-bowl';
  const quest = questById(id);
  const row = journal.row(id);
  row.step = quest.steps.length - 1;
  journal.track(id);

  const result = journal.completeStep(id, 'The arena report is delivered.');
  assert.equal(result.complete, true);
  assert.equal(journal.trackedQuest(), null);
  assert.notEqual(journal.tracker({ text: 'Guild hunt', n: 0, total: 5 }).questId, id);
});
