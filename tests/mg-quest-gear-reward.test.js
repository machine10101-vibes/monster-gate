import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QUESTS } from '../src/data/quests.js';
import { Journal } from '../src/systems/journal.js';

const GEAR_QUEST = QUESTS.find((q) => q.reward?.gear);

/** A hunter whose bag is full: found gear cannot be added until `space` is true. */
function hunter({ space = false } = {}) {
  const owned = new Set();
  return {
    data: { journal: null },
    saves: 0,
    space,
    save() { this.saves += 1; },
    good() { return 0; },
    takeGood() { return true; },
    crafted: (id) => owned.has(id),
    grantFound(id) {
      if (!this.space || owned.has(id)) return false;
      owned.add(id);
      return true;
    },
    owned,
  };
}

/** Put a journal on the final step of the gear quest and finish it. */
function finishGearQuest(journal) {
  journal.state.quests[GEAR_QUEST.id] = {
    started: true, done: false, step: GEAR_QUEST.steps.length - 1, n: 0, pages: [], unseen: false, choice: null,
  };
  return journal.completeStep(GEAR_QUEST.id, 'done');
}

test('a quest reward of gear is owed until the hunter actually has it', () => {
  const progress = hunter({ space: false });
  const journal = new Journal(progress);
  const ev = finishGearQuest(journal);

  assert.equal(ev.complete, true);
  assert.equal(ev.gear, GEAR_QUEST.reward.gear);
  // Bag full: delivery fails, but the reward must not be forgotten.
  assert.equal(journal.deliverGear(ev.gear), 'full');
  assert.deepEqual(journal.owedGear(), [GEAR_QUEST.reward.gear]);
  assert.equal(progress.owned.size, 0);
});

test('owed gear is delivered once there is room, then no longer owed', () => {
  const progress = hunter({ space: false });
  const journal = new Journal(progress);
  const ev = finishGearQuest(journal);
  assert.equal(journal.deliverGear(ev.gear), 'full');

  progress.space = true;
  assert.equal(journal.deliverGear(ev.gear), 'granted');
  assert.deepEqual(journal.owedGear(), []);
  assert.equal(progress.owned.has(GEAR_QUEST.reward.gear), true);

  // Exactly once: asking again never grants a second copy.
  assert.equal(journal.deliverGear(ev.gear), 'owned');
  assert.equal(progress.owned.size, 1);
});

test('an owed reward survives saving and reloading the hunter', () => {
  const progress = hunter({ space: false });
  const first = new Journal(progress);
  finishGearQuest(first);

  const reloaded = new Journal(progress);
  assert.deepEqual(reloaded.owedGear(), [GEAR_QUEST.reward.gear]);
  assert.equal(reloaded.status(GEAR_QUEST.id), 'done');
});

test('a finished quest cannot be finished again to repeat its reward', () => {
  const progress = hunter({ space: true });
  const journal = new Journal(progress);
  finishGearQuest(journal);
  assert.equal(journal.finishTalk(GEAR_QUEST.id).ok, false);
  assert.deepEqual(journal.onKill('slime'), []);
});
