import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersistence } from '../persistence/api.js';
import { blankState } from '../persistence/schema.js';
import { PersistenceError } from '../persistence/errors.js';

test('queued pose saves rebase on atomic reward updates without overwriting rewards', async () => {
  const row = { userId: '00000000-0000-4000-8000-000000000001', version: 1, state: blankState('Tester') };
  const rewards = new Set();
  const adapter = {
    async load() { return structuredClone(row); },
    async save(userId, state, { expectedVersion }) {
      if (expectedVersion !== row.version) throw new PersistenceError('conflict', 'Character version conflict.');
      row.state = structuredClone(state);
      row.version += 1;
      return { ...structuredClone(row) };
    },
    async grantOnce(reward) {
      if (rewards.has(reward.rewardId)) return { granted: false, version: row.version };
      rewards.add(reward.rewardId);
      row.state.gold += reward.amount;
      row.state.riftClearAt = 1_700_000_000_000;
      row.version += 1;
      return { granted: true, version: row.version };
    },
  };
  const persist = createPersistence({ adapter, autoStart: false });
  await persist.saveCharacter('00000000-0000-4000-8000-000000000001', {
    hunter: { x: 100, y: 3, z: 101, yaw: 1, realm: 'over' },
  });
  await persist.grantOnce({
    rewardId: 'rift:run-1:gold:00000000-0000-4000-8000-000000000001', userId: '00000000-0000-4000-8000-000000000001',
    kind: 'gold', id: 'gold', amount: 50,
  });
  await persist.flush('00000000-0000-4000-8000-000000000001');

  assert.equal(row.state.gold, 50);
  assert.equal(row.state.hunter.x, 100);
  assert.equal(row.state.riftClearAt, 1_700_000_000_000);
  assert.equal(row.version, 3);
  await persist.close();
});
