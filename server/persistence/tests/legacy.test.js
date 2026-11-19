import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryAdapter } from '../adapters/memory.js';
import { createNoopAdapter } from '../adapters/noop.js';
import { createSupabaseAdapter } from '../adapters/supabase.js';
import { createPersistence } from '../api.js';
import {
  extractLocalHunt,
  pickRosterCharacter,
  stateFromLegacyProgress,
} from '../schema.js';

const USER = '11111111-1111-4111-8111-111111111111';

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
      log: extra.log,
    }),
  };
}

function captureWarn() {
  const lines = [];
  const orig = console.warn;
  console.warn = (...args) => {
    lines.push(args.map(String).join(' '));
  };
  return {
    lines,
    restore() {
      console.warn = orig;
    },
  };
}

function rosterSave({ last = 'c2', extra = [] } = {}) {
  return {
    savedAt: 90,
    roster: {
      v: 1,
      last,
      chars: [
        {
          id: 'c1',
          name: 'Old',
          look: { skin: 0 },
          playedAt: 10,
          hunt: { gold: 1, xp: { mining: 5 }, hunter: { x: 10, z: 10, realm: 'over' } },
        },
        {
          id: 'c2',
          name: 'Mira',
          look: { skin: 2, tunic: 1 },
          playedAt: 80,
          hunt: {
            gold: 40,
            xp: { mining: 17.5, woodcutting: 25 },
            goods: { copper_ore: 3 },
            materials: { budgescale: 4 },
            stock: { potion: 2 },
            crafted: { knife: true },
            weapon: null,
            armor: {},
            hunter: { x: 80, y: 4, z: 70, yaw: 1.2, hp: 18, mana: 40, stamina: 90, rank: 2, realm: 'over' },
            journal: { quests: { restless: { started: true, step: 1, n: 0 } } },
          },
        },
        ...extra,
      ],
      deleted: [],
    },
  };
}

test('pickRosterCharacter prefers roster.last then playedAt/savedAt', () => {
  const chars = rosterSave().roster.chars;
  assert.equal(pickRosterCharacter(chars, 'c2').name, 'Mira');
  assert.equal(pickRosterCharacter(chars, 'missing').name, 'Mira');
  assert.equal(pickRosterCharacter(chars, null).name, 'Mira');
  const olderLast = [
    { id: 'a', name: 'Ann', playedAt: 50, hunt: { savedAt: 50, gold: 1 } },
    { id: 'b', name: 'Bea', playedAt: 9, hunt: { savedAt: 9, gold: 9 } },
  ];
  assert.equal(pickRosterCharacter(olderLast, 'b').name, 'Bea');
  assert.equal(pickRosterCharacter(olderLast, null).name, 'Ann');
});

test('extractLocalHunt and stateFromLegacyProgress map a live roster blob', () => {
  const hunt = extractLocalHunt(rosterSave());
  assert.equal(hunt.name, 'Mira');
  assert.equal(hunt.gold, 40);
  assert.equal(hunt.look.skin, 2);
  const state = stateFromLegacyProgress(rosterSave());
  assert.equal(state.name, 'Mira');
  assert.equal(state.gold, 40);
  assert.equal(state.xp.mining, 17.5);
  assert.equal(state.goods.copper_ore, 3);
  assert.equal(state.hunter.x, 80);
  assert.equal(state.hunter.realm, 'over');
  assert.ok(state.importedAt);
});

test('loadCharacter imports a legacy hunter_accounts roster save', async () => {
  const adapter = createMemoryAdapter();
  adapter.seedHunterAccount(USER, rosterSave());
  const { db } = persist(adapter);
  const row = await db.loadCharacter(USER);
  assert.equal(row.name, 'Mira');
  assert.equal(row.gold, 40);
  assert.equal(row.state.xp.mining, 17.5);
  assert.equal(row.state.goods.copper_ore, 3);
  assert.equal(row.state.materials.budgescale, 4);
  assert.equal(row.state.hunter.x, 80);
  assert.equal(row.state.look.skin, 2);
  assert.equal(row.zone, 'over');
  assert.ok(row.importedAt);
  assert.equal(adapter.writes, 1);
  const again = await db.loadCharacter(USER);
  assert.equal(again.gold, 40);
  assert.equal(again.version, row.version);
  assert.equal(adapter.writes, 1);
  await db.close();
});

test('loadCharacter imports a raw Progress blob when there is no roster', async () => {
  const adapter = createMemoryAdapter();
  adapter.seedHunterAccount(USER, {
    name: 'Bram',
    gold: 12,
    xp: { fishing: 8 },
    hunter: { x: 40, z: 41, realm: 'cave' },
  });
  const { db } = persist(adapter);
  const row = await db.loadCharacter(USER);
  assert.equal(row.name, 'Bram');
  assert.equal(row.gold, 12);
  assert.equal(row.zone, 'cave');
  assert.ok(row.importedAt);
  await db.close();
});

test('no legacy row leaves loadCharacter null so createCharacter is fresh', async () => {
  const { db } = persist();
  const missing = await db.loadCharacter(USER);
  assert.equal(missing, null);
  const created = await db.createCharacter(USER, 'Arden');
  assert.equal(created.name, 'Arden');
  assert.equal(created.gold, 0);
  assert.equal(created.importedAt, null);
  await db.close();
});

test('existing characters row is untouched even when hunter_accounts has a hunt', async () => {
  const adapter = createMemoryAdapter();
  const { db } = persist(adapter);
  await db.createCharacter(USER, 'Arden');
  adapter.seedHunterAccount(USER, rosterSave());
  const row = await db.loadCharacter(USER);
  assert.equal(row.name, 'Arden');
  assert.equal(row.gold, 0);
  assert.equal(row.importedAt, null);
  await db.close();
});

test('imported_at blocks a second import even if hunter_accounts is updated', async () => {
  const adapter = createMemoryAdapter();
  adapter.seedHunterAccount(USER, rosterSave());
  const { db } = persist(adapter);
  const first = await db.loadCharacter(USER);
  assert.equal(first.gold, 40);
  adapter.seedHunterAccount(USER, rosterSave({ last: 'c1' }));
  const second = await db.loadCharacter(USER);
  assert.equal(second.name, 'Mira');
  assert.equal(second.gold, 40);
  assert.equal(second.version, first.version);
  await db.close();
});

test('concurrent first joins create one imported row', async () => {
  const inner = createMemoryAdapter();
  inner.seedHunterAccount(USER, rosterSave());
  let delayMs = 25;
  const adapter = {
    kind: 'memory',
    get writes() {
      return inner.writes;
    },
    load: (...args) => inner.load(...args),
    loadLegacyHunt: (...args) => inner.loadLegacyHunt(...args),
    async insertImported(userId, state) {
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = 0;
      return inner.insertImported(userId, state);
    },
    create: (...args) => inner.create(...args),
  };
  const { db } = persist(adapter);
  const [a, b] = await Promise.all([db.loadCharacter(USER), db.loadCharacter(USER)]);
  assert.equal(a.name, 'Mira');
  assert.equal(b.name, 'Mira');
  assert.equal(a.gold, 40);
  assert.equal(b.gold, 40);
  assert.ok(a.importedAt);
  assert.ok(b.importedAt);
  assert.equal(inner.writes, 1);
  await db.close();
});

test('malformed hunter_accounts.progress does not crash the join', async () => {
  const adapter = createMemoryAdapter();
  const { db } = persist(adapter);
  const warn = captureWarn();
  try {
    adapter.seedHunterAccount(USER, []);
    assert.equal(await db.loadCharacter(USER), null);
    adapter.seedHunterAccount(USER, { roster: { chars: [] } });
    assert.equal(await db.loadCharacter(USER), null);
    adapter.seedHunterAccount(USER, '{not-json');
    assert.equal(await db.loadCharacter(USER), null);
    adapter.seedHunterAccount(USER, 7);
    assert.equal(await db.loadCharacter(USER), null);
  } finally {
    warn.restore();
  }
  assert.ok(warn.lines.some((line) => /unparseable hunter_accounts/.test(line)));
  const created = await db.createCharacter(USER, 'Arden');
  assert.equal(created.name, 'Arden');
  assert.equal(created.importedAt, null);
  await db.close();
});

test('noop adapter loadCharacter stays null even with no legacy hook', async () => {
  const db = createPersistence({ adapter: createNoopAdapter(), intervalMs: 0, autoStart: false });
  assert.equal(await db.loadCharacter(USER), null);
  await db.close();
});

function chain(result) {
  const q = {
    insert() { return q; },
    update() { return q; },
    select() { return q; },
    eq() { return q; },
    is() { return q; },
    single: async () => result,
    maybeSingle: async () => result,
  };
  return q;
}

function importedRow(state) {
  return {
    user_id: USER,
    name: state.name,
    zone: state.hunter?.realm === 'cave' ? 'cave' : 'over',
    x: state.hunter?.x ?? 72,
    y: state.hunter?.y ?? 3,
    z: state.hunter?.z ?? 72.5,
    gold: state.gold | 0,
    last_seen: new Date().toISOString(),
    imported_at: new Date().toISOString(),
    version: 1,
    state,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

test('supabase adapter loadCharacter imports via character_import_legacy rpc', async () => {
  const state = stateFromLegacyProgress(rosterSave());
  const row = importedRow(state);
  let rpcCalls = 0;
  const adapter = createSupabaseAdapter({
    client: {
      async rpc(fn, args) {
        rpcCalls += 1;
        assert.equal(fn, 'character_import_legacy');
        assert.equal(args.p_user, USER);
        assert.equal(args.p_name, 'Mira');
        assert.equal(args.p_gold, 40);
        return { data: row, error: null };
      },
      from(table) {
        if (table === 'hunter_accounts') {
          return chain({ data: { progress: rosterSave() }, error: null });
        }
        return chain({ data: null, error: null });
      },
    },
  });
  const { db } = persist(adapter);
  const loaded = await db.loadCharacter(USER);
  assert.equal(loaded.name, 'Mira');
  assert.equal(loaded.gold, 40);
  assert.ok(loaded.importedAt);
  assert.equal(rpcCalls, 1);
  await db.close();
});

test('supabase adapter skips hunter_accounts when a characters row exists', async () => {
  const existing = importedRow({
    name: 'Arden',
    gold: 0,
    hunter: { x: 72, y: 3, z: 72.5, yaw: 0, realm: 'over', hp: 20, mana: 32, stamina: 100, rank: 0, quest: null },
  });
  existing.imported_at = null;
  existing.state.importedAt = null;
  let hunterReads = 0;
  const adapter = createSupabaseAdapter({
    client: {
      async rpc() {
        throw new Error('rpc should not run');
      },
      from(table) {
        if (table === 'hunter_accounts') {
          hunterReads += 1;
          return chain({ data: { progress: rosterSave() }, error: null });
        }
        return chain({ data: existing, error: null });
      },
    },
  });
  const { db } = persist(adapter);
  const loaded = await db.loadCharacter(USER);
  assert.equal(loaded.name, 'Arden');
  assert.equal(loaded.gold, 0);
  assert.equal(hunterReads, 0);
  await db.close();
});

test('supabase adapter concurrent insert PK conflict returns the existing row', async () => {
  const state = stateFromLegacyProgress(rosterSave());
  const row = importedRow(state);
  let inserts = 0;
  const PK_23505 = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "characters_pkey"',
    details: `Key (user_id)=(${USER}) already exists.`,
  };
  const adapter = createSupabaseAdapter({
    client: {
      from(table) {
        if (table === 'hunter_accounts') {
          return chain({ data: { progress: rosterSave() }, error: null });
        }
        return {
          select() { return this; },
          eq() { return this; },
          insert() {
            inserts += 1;
            return chain(
              inserts === 1
                ? { data: row, error: null }
                : { data: null, error: PK_23505 },
            );
          },
          maybeSingle: async () => (
            inserts > 0
              ? { data: row, error: null }
              : { data: null, error: null }
          ),
        };
      },
    },
  });
  const { db } = persist(adapter);
  const [a, b] = await Promise.all([db.loadCharacter(USER), db.loadCharacter(USER)]);
  assert.equal(a.name, 'Mira');
  assert.equal(b.name, 'Mira');
  assert.equal(a.gold, 40);
  await db.close();
});

test('supabase adapter missing hunter_accounts row returns null', async () => {
  const adapter = createSupabaseAdapter({
    client: {
      from() {
        return chain({ data: null, error: null });
      },
    },
  });
  const { db } = persist(adapter);
  assert.equal(await db.loadCharacter(USER), null);
  await db.close();
});

test('supabase adapter malformed progress returns null and warns', async () => {
  const warn = captureWarn();
  const adapter = createSupabaseAdapter({
    client: {
      from(table) {
        if (table === 'hunter_accounts') {
          return chain({ data: { progress: [] }, error: null });
        }
        return chain({ data: null, error: null });
      },
    },
  });
  const { db } = persist(adapter);
  try {
    assert.equal(await db.loadCharacter(USER), null);
  } finally {
    warn.restore();
  }
  assert.ok(warn.lines.some((line) => /unparseable hunter_accounts/.test(line)));
  await db.close();
});
