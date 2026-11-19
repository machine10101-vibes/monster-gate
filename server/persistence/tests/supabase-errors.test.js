import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PersistErrorCodes as PublicCodes } from '../index.js';
import { createSupabaseAdapter, mapSupabaseError } from '../adapters/supabase.js';
import { NAME_TAKEN_MESSAGE, PersistErrorCodes, PersistenceError } from '../errors.js';

const USER = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

const NAME_23505 = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "characters_name_lower_idx"',
  details: 'Key (lower(name))=(dara) already exists.',
};

const BARE_23505 = {
  code: '23505',
  message: 'duplicate key value violates unique constraint',
};

const PK_23505 = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "characters_pkey"',
  details: 'Key (user_id)=(11111111-1111-4111-8111-111111111111) already exists.',
};

function isNameTaken(err) {
  return err instanceof PersistenceError
    && err.code === PersistErrorCodes.NAME_TAKEN
    && err.message === NAME_TAKEN_MESSAGE;
}

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

function fakeClient({ insert, update, select }) {
  return {
    from() {
      return {
        insert(row) { return chain(insert(row)); },
        update(row) { return chain(update ? update(row) : select()); },
        select() { return chain(select()); },
        eq() { return chain(select()); },
        is() { return chain(select()); },
        single: async () => select(),
        maybeSingle: async () => select(),
      };
    },
  };
}

const blankRow = {
  user_id: USER,
  name: 'Dara',
  zone: 'over',
  x: 72,
  y: 3,
  z: 72.5,
  gold: 0,
  last_seen: null,
  imported_at: null,
  version: 1,
  state: { name: 'Dara', gold: 0, hunter: { x: 72, y: 3, z: 72.5, yaw: 0, realm: 'over', hp: 20, mana: 32, stamina: 100, rank: 0, quest: null } },
  created_at: '2026-11-13T00:00:00.000Z',
  updated_at: '2026-11-13T00:00:00.000Z',
};

test('index re-exports PersistErrorCodes including NAME_TAKEN and friends codes', () => {
  assert.equal(PublicCodes.NAME_TAKEN, 'name_taken');
  assert.equal(PublicCodes.CONFLICT, 'conflict');
  assert.equal(PublicCodes.FRIEND_CAP, 'friend_cap');
  assert.equal(PublicCodes.ALREADY_FRIENDS, 'already_friends');
  assert.equal(PublicCodes.SELF, 'self');
  assert.deepEqual(PublicCodes, PersistErrorCodes);
});

test('mapSupabaseError: 23505 on the name index is name_taken, not unavailable', () => {
  const named = mapSupabaseError(NAME_23505, { name: 'Dara' });
  assert.equal(named.code, PersistErrorCodes.NAME_TAKEN);
  assert.equal(named.message, NAME_TAKEN_MESSAGE);

  const bare = mapSupabaseError(BARE_23505, { name: 'Dara' });
  assert.equal(bare.code, PersistErrorCodes.NAME_TAKEN);
  assert.equal(bare.message, NAME_TAKEN_MESSAGE);
  assert.notEqual(bare.code, PersistErrorCodes.UNAVAILABLE);

  const pk = mapSupabaseError(PK_23505, { userId: USER });
  assert.equal(pk.code, PersistErrorCodes.INVALID);

  const down = mapSupabaseError({ code: '08006', message: 'connection failed' });
  assert.equal(down.code, PersistErrorCodes.UNAVAILABLE);
});

test('supabase adapter create maps duplicate name 23505 to name_taken', async () => {
  const adapter = createSupabaseAdapter({
    client: fakeClient({
      insert: () => ({ data: null, error: NAME_23505 }),
      select: () => ({ data: null, error: null }),
    }),
  });
  await assert.rejects(() => adapter.create(USER, 'Dara'), isNameTaken);
});

test('supabase adapter create maps a bare 23505 to name_taken', async () => {
  const adapter = createSupabaseAdapter({
    client: fakeClient({
      insert: () => ({ data: null, error: BARE_23505 }),
      select: () => ({ data: null, error: null }),
    }),
  });
  await assert.rejects(() => adapter.create(USER, 'Dara'), isNameTaken);
});

test('supabase adapter rename maps name 23505 to name_taken', async () => {
  const other = { ...blankRow, user_id: USER_B, name: 'Eden', state: { ...blankRow.state, name: 'Eden' } };
  const adapter = createSupabaseAdapter({
    client: fakeClient({
      insert: () => ({ data: other, error: null }),
      select: () => ({ data: other, error: null }),
      update: () => ({ data: null, error: NAME_23505 }),
    }),
  });
  await assert.rejects(
    () => adapter.save(USER_B, { ...other.state, name: 'Dara' }, { expectedVersion: 1 }),
    isNameTaken,
  );
});

const FRIEND_23505 = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "friendships_pair_uniq"',
  details: 'Key (least(requester_id, target_id), greatest(requester_id, target_id)) already exists.',
};

const FRIEND_SELF_23514 = {
  code: '23514',
  message: 'new row for relation "friendships" violates check constraint "friendships_no_self"',
};

test('mapSupabaseError: friendships unique is already_friends, not name_taken', () => {
  const dup = mapSupabaseError(FRIEND_23505, { table: 'friendships' });
  assert.equal(dup.code, PersistErrorCodes.ALREADY_FRIENDS);
  assert.notEqual(dup.code, PersistErrorCodes.NAME_TAKEN);
  assert.notEqual(dup.code, PersistErrorCodes.UNAVAILABLE);

  const named = mapSupabaseError(FRIEND_23505);
  assert.equal(named.code, PersistErrorCodes.ALREADY_FRIENDS);
});

test('mapSupabaseError: friendships self-check is self', () => {
  const err = mapSupabaseError(FRIEND_SELF_23514, { table: 'friendships' });
  assert.equal(err.code, PersistErrorCodes.SELF);
  assert.equal(err.message, 'That hunter is you.');
});

function friendsRpcClient(rpcError) {
  const hunters = [
    { user_id: USER, name: 'Arden' },
    { user_id: USER_B, name: 'Bram' },
  ];
  return {
    async rpc() {
      return { data: null, error: rpcError };
    },
    from(table) {
      const q = {
        select() { return q; },
        insert() { return q; },
        update() { return q; },
        delete() { return q; },
        eq() { return q; },
        or() { return q; },
        in() { return q; },
        ilike() { return q; },
        is() { return q; },
        single: async () => ({ data: hunters[0], error: null }),
        maybeSingle: async () => (
          table === 'characters'
            ? { data: hunters[1], error: null }
            : { data: null, error: null }
        ),
        then(resolve, reject) {
          if (table === 'characters') {
            return Promise.resolve({ data: hunters, error: null }).then(resolve, reject);
          }
          return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
        },
      };
      return q;
    },
  };
}

test('mapSupabaseError: rpc friend_cap / already_friends / not_found / self', () => {
  assert.equal(mapSupabaseError({ code: 'P0001', message: 'friend_cap' }).code, PersistErrorCodes.FRIEND_CAP);
  assert.equal(mapSupabaseError({ code: 'P0001', message: 'already_friends' }).code, PersistErrorCodes.ALREADY_FRIENDS);
  assert.equal(mapSupabaseError({ code: 'P0001', message: 'not_found' }).code, PersistErrorCodes.NOT_FOUND);
  assert.equal(mapSupabaseError({ code: 'P0001', message: 'self' }).code, PersistErrorCodes.SELF);
});

test('supabase adapter requestFriend maps rpc friend_cap', async () => {
  const adapter = createSupabaseAdapter({
    client: friendsRpcClient({ code: 'P0001', message: 'friend_cap' }),
  });
  await assert.rejects(
    () => adapter.requestFriend(USER, USER_B),
    (err) => err instanceof PersistenceError && err.code === PersistErrorCodes.FRIEND_CAP,
  );
});

test('supabase adapter acceptFriend maps rpc friend_cap', async () => {
  const adapter = createSupabaseAdapter({
    client: {
      rpc: async () => ({ data: null, error: { code: 'P0001', message: 'friend_cap' } }),
    },
  });
  await assert.rejects(
    () => adapter.acceptFriend(USER, USER_B),
    (err) => err instanceof PersistenceError && err.code === PersistErrorCodes.FRIEND_CAP,
  );
});

test('supabase adapter requestFriend maps rpc already_friends', async () => {
  const adapter = createSupabaseAdapter({
    client: friendsRpcClient({ code: 'P0001', message: 'already_friends' }),
  });
  await assert.rejects(
    () => adapter.requestFriend(USER, USER_B),
    (err) => err instanceof PersistenceError && err.code === PersistErrorCodes.ALREADY_FRIENDS,
  );
});

test('supabase adapter keeps other DB failures as unavailable', async () => {
  const adapter = createSupabaseAdapter({
    client: fakeClient({
      insert: () => ({ data: null, error: { code: '08006', message: 'connection failed' } }),
      select: () => ({ data: null, error: null }),
    }),
  });
  await assert.rejects(
    () => adapter.create(USER, 'Dara'),
    (err) => err instanceof PersistenceError && err.code === PersistErrorCodes.UNAVAILABLE,
  );
});
