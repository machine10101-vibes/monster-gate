import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { xpForLevel } from '../../../src/data/gathering.js';
import { createMemoryAdapter } from '../adapters/memory.js';
import { createNoopAdapter } from '../adapters/noop.js';
import { createPersistence } from '../api.js';
import { NAME_TAKEN_MESSAGE, PersistErrorCodes, PersistenceError } from '../errors.js';
import { MAX_GOLD, MAX_HP, MAX_KILLS, MAX_STACK, WORLD_BOUNDS } from '../schema.js';

const USER = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

function persist(adapter = createMemoryAdapter(), extra = {}) {
  return {
    adapter,
    db: createPersistence({
      adapter,
      debounceMs: extra.debounceMs ?? 20,
      intervalMs: 0,
      autoStart: false,
      retries: extra.retries ?? [5, 10],
      clock: extra.clock,
      onError: extra.onError || (() => {}),
    }),
  };
}

test('save/load round trip keeps xp, bag, gear, bank and quests', async () => {
  const { db } = persist();
  await db.createCharacter(USER, 'Arden', { look: { skin: 2, tunic: 1 } });
  await db.saveCharacter(USER, {
    gold: 42,
    xp: { mining: 17.5, woodcutting: 25 },
    goods: { copper_ore: 3, birch_logs: 2 },
    materials: { budgescale: 4 },
    stock: { potion: 2 },
    bank: [{ k: 'good', id: 'tin_ore', n: 5 }],
    equipment: { weapon: null, armor: {} },
    journal: { quests: { restless: { started: true, step: 1, n: 0 } } },
    position: { zone: 'over', x: 80, y: 4, z: 70, yaw: 1.2 },
  }, { immediate: true });

  const row = await db.loadCharacter(USER);
  assert.equal(row.name, 'Arden');
  assert.equal(row.gold, 42);
  assert.equal(row.version, 2);
  assert.equal(row.state.xp.mining, 17.5);
  assert.equal(row.state.goods.copper_ore, 3);
  assert.equal(row.state.materials.budgescale, 4);
  assert.equal(row.state.stock.potion, 2);
  assert.equal(row.state.storage[0].id, 'tin_ore');
  assert.equal(row.state.journal.quests.restless.started, true);
  assert.equal(row.state.hunter.x, 80);
  assert.equal(row.state.hunter.z, 70);
  assert.equal(row.zone, 'over');
  await db.close();
});

test('debounced queue coalesces two saves into one write', async () => {
  const { db, adapter } = persist();
  await db.createCharacter(USER, 'Bren');
  const afterCreate = adapter.writes;
  await db.saveCharacter(USER, { gold: 5, xp: { mining: 17.5 } });
  await db.saveCharacter(USER, { gold: 9 });
  assert.equal(adapter.writes, afterCreate);
  assert.equal(db.queue.size, 1);
  await db.flush(USER);
  assert.equal(adapter.writes, afterCreate + 1);
  const row = await db.loadCharacter(USER);
  assert.equal(row.gold, 9);
  assert.equal(row.state.xp.mining, 17.5);
  await db.close();
});

test('stale version is rejected', async () => {
  const { db, adapter } = persist();
  const created = await db.createCharacter(USER, 'Cora');
  assert.equal(created.version, 1);
  const first = await adapter.save(USER, { ...created.state, gold: 10 }, { expectedVersion: 1 });
  assert.equal(first.version, 2);
  await assert.rejects(
    () => adapter.save(USER, { ...created.state, gold: 99 }, { expectedVersion: 1 }),
    (err) => err instanceof PersistenceError && err.code === 'conflict' && err.character.gold === 10,
  );
  await db.close();
});

test('import clamps inflated xp, gold, stacks, kills, skills and position', async () => {
  const { db } = persist();
  const row = await db.importLocalSave(USER, {
    name: 'Cheater',
    gold: 9e9,
    xp: { strength: 1e15, mining: -40, fakeSkill: 99 },
    goods: { copper_ore: 1e12, not_an_item: 8 },
    materials: { budgescale: 1e9, nope: 3 },
    kills: { chicken: 1e9, slime: 2 },
    skills: {
      classId: 'warrior',
      learned: {
        fortify: true,
        shieldbash: true,
        bulwark: true,
        brace: true,
        ironcitadel: true,
      },
      attrs: { vitality: 3 },
    },
    hunter: { x: 1e9, z: -1e9, realm: 'void', hp: 9999 },
    journal: { quests: { restless: { started: true, step: 99, n: 999999, done: false } } },
  });

  assert.equal(row.name, 'Cheater');
  assert.equal(row.gold, MAX_GOLD);
  assert.equal(row.state.xp.strength, xpForLevel(99));
  assert.equal(row.state.xp.fakeSkill, undefined);
  assert.equal(row.state.goods.copper_ore, MAX_STACK);
  assert.equal(row.state.goods.not_an_item, undefined);
  assert.equal(row.state.materials.nope, undefined);
  assert.equal(row.state.kills.chicken, MAX_KILLS);
  assert.equal(row.state.skills.learned.fortify, true);
  assert.equal(row.state.skills.learned.shieldbash, true);
  assert.equal(row.state.skills.learned.ironcitadel, undefined);
  assert.equal(row.state.skills.attrs.vitality, undefined);
  assert.equal(row.state.hunter.x, WORLD_BOUNDS.maxX);
  assert.equal(row.state.hunter.z, WORLD_BOUNDS.minZ);
  assert.equal(row.state.hunter.realm, 'over');
  assert.equal(row.state.hunter.hp, MAX_HP);
  assert.equal(row.state.journal.quests.restless.done, false);
  assert.ok(row.state.journal.quests.restless.step < 99);
  assert.ok(row.importedAt);

  await assert.rejects(
    () => db.importLocalSave(USER, { gold: 1 }),
    (err) => err.code === 'already_imported',
  );
  await db.close();
});

test('importLocalSave unwraps a roster-shaped account save', async () => {
  const { db } = persist();
  const row = await db.importLocalSave(USER, {
    savedAt: 50,
    roster: {
      last: 'c2',
      chars: [
        { id: 'c1', name: 'Old', hunt: { gold: 1 } },
        { id: 'c2', name: 'Mira', look: { skin: 2 }, hunt: { gold: 40, xp: { mining: 17.5 } } },
      ],
    },
  });
  assert.equal(row.name, 'Mira');
  assert.equal(row.gold, 40);
  assert.equal(row.state.xp.mining, 17.5);
  assert.equal(row.state.look.skin, 2);
  await db.close();
});

function isNameTaken(err) {
  return err instanceof PersistenceError
    && err.code === PersistErrorCodes.NAME_TAKEN
    && err.message === NAME_TAKEN_MESSAGE;
}

test('unique names and missing rows', async () => {
  const { db, adapter } = persist();
  await db.createCharacter(USER, 'Dara');
  await assert.rejects(() => db.createCharacter(USER_B, 'Dara'), isNameTaken);
  await assert.rejects(() => db.createCharacter(USER_B, 'dara'), isNameTaken);
  await assert.rejects(() => adapter.create(USER_B, 'Dara'), isNameTaken);

  await db.createCharacter(USER_B, 'Eden');
  await assert.rejects(
    () => adapter.save(USER_B, { name: 'Dara' }, { expectedVersion: 1 }),
    isNameTaken,
  );
  await assert.rejects(
    () => db.saveCharacter(USER_B, { name: 'Dara' }, { immediate: true }),
    isNameTaken,
  );

  await assert.rejects(() => db.createCharacter('not-a-uuid', 'Eden'), (err) => err.code === PersistErrorCodes.INVALID);
  const still = await db.loadCharacter(USER_B);
  assert.equal(still.name, 'Eden');
  await db.close();
});

test('retry with backoff then succeeds', async () => {
  const inner = createMemoryAdapter();
  let fails = 2;
  const adapter = {
    ...inner,
    kind: 'flaky',
    load: inner.load.bind(inner),
    create: inner.create.bind(inner),
    markImported: inner.markImported.bind(inner),
    async save(userId, state, opts) {
      if (fails > 0) {
        fails -= 1;
        const err = new Error('transient');
        err.code = 'unavailable';
        throw err;
      }
      return inner.save(userId, state, opts);
    },
  };
  Object.defineProperty(adapter, 'writes', { get: () => inner.writes });
  const { db } = persist(adapter);
  await db.createCharacter(USER, 'Eden');
  await db.saveCharacter(USER, { gold: 7 }, { immediate: true });
  const row = await db.loadCharacter(USER);
  assert.equal(row.gold, 7);
  assert.equal(fails, 0);
  await db.close();
});

test('flush-on-disconnect and SIGTERM drain the queue', async () => {
  const { db, adapter } = persist();
  await db.createCharacter(USER, 'Faye');
  const afterCreate = adapter.writes;
  await db.saveCharacter(USER, { gold: 12 });
  await db.saveCharacter(USER, { gold: 12 }, { immediate: true });
  assert.equal(adapter.writes, afterCreate + 1);

  await db.saveCharacter(USER, { gold: 15 });
  const fakeProc = new EventEmitter();
  const stop = db.installShutdownHandlers(fakeProc);
  fakeProc.emit('SIGTERM');
  await stop();
  const row = await db.loadCharacter(USER);
  assert.equal(row.gold, 15);
  await db.close();
});

test('noop adapter never stores a row', async () => {
  const db = createPersistence({ adapter: createNoopAdapter(), intervalMs: 0, autoStart: false });
  const created = await db.createCharacter(USER, 'Guestlike');
  assert.equal(created.name, 'Guestlike');
  assert.equal(await db.loadCharacter(USER), null);
  await db.close();
});
