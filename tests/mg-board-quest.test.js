import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Journal } from '../src/systems/journal.js';
import { questById } from '../src/data/quests.js';

function hunter(saved = null) {
  return {
    data: { journal: saved },
    save() {},
    good() { return 0; },
  };
}

test('the guild board counts local gate creatures, not livestock or distant predators', () => {
  const progress = hunter({ quests: { restless: {
    started: true, done: true, step: questById('restless').steps.length,
  } } });
  const journal = new Journal(progress);
  const row = journal.row('board');
  assert.equal(journal.status('board'), 'active');
  for (const type of ['chicken', 'oasiscroc', 'snowyeti', 'demonknight']) {
    journal.onKill(type);
    assert.equal(row.n, 0, `${type} should not count`);
  }
  for (const type of ['slime', 'voidslime', 'boar', 'wraith']) journal.onKill(type);
  assert.deepEqual(journal.objective('board'), {
    text: 'Slay 5 gate creatures', n: 4, total: 5, quest: 'Five for the Board',
  });

  const resumed = new Journal(hunter(progress.data.journal));
  assert.equal(resumed.row('board').n, 4);
  assert.equal(resumed.onKill('slime')[0].advance, true);
  assert.equal(resumed.row('board').step, 1);
  assert.equal(resumed.row('board').n, 0);
  assert.deepEqual(resumed.onKill('slime'), []);
});
