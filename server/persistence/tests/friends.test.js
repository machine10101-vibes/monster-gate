import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryAdapter } from '../adapters/memory.js';
import { createNoopAdapter } from '../adapters/noop.js';
import { createPersistence } from '../api.js';
import { FRIEND_CAP, PersistErrorCodes, PersistenceError } from '../index.js';

const USER = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const USER_C = '33333333-3333-4333-8333-333333333333';

function uid(n) {
  return `aaaaaaaa-bbbb-4ccc-8ddd-${String(n).padStart(12, '0')}`;
}

function hunterName(prefix, n) {
  const i = n - 1;
  return `${prefix}${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + (i % 26))}`;
}

function persist(adapter = createMemoryAdapter()) {
  return createPersistence({ adapter, intervalMs: 0, autoStart: false });
}

function isCode(code) {
  return (err) => err instanceof PersistenceError && err.code === code;
}

async function twoHunters(db) {
  await db.createCharacter(USER, 'Arden');
  await db.createCharacter(USER_B, 'Bram');
}

test('listFriends is empty until a request exists', async () => {
  const db = persist();
  await twoHunters(db);
  assert.deepEqual(await db.listFriends(USER), { friends: [], pendingIn: [], pendingOut: [] });
  await db.close();
});

test('requestFriend by name is case-insensitive and lists pending both ways', async () => {
  const db = persist();
  await twoHunters(db);
  const sent = await db.requestFriend(USER, 'bram');
  assert.equal(sent.status, 'pending');
  assert.equal(sent.from.userId, USER);
  assert.equal(sent.from.name, 'Arden');
  assert.equal(sent.to.userId, USER_B);
  assert.equal(sent.to.name, 'Bram');

  const fromA = await db.listFriends(USER);
  assert.equal(fromA.pendingOut.length, 1);
  assert.equal(fromA.pendingOut[0].userId, USER_B);
  assert.equal(fromA.pendingOut[0].name, 'Bram');
  assert.equal(fromA.friends.length, 0);

  const fromB = await db.listFriends(USER_B);
  assert.equal(fromB.pendingIn.length, 1);
  assert.equal(fromB.pendingIn[0].userId, USER);
  assert.equal(fromB.pendingIn[0].name, 'Arden');
  await db.close();
});

test('requestFriend by user id, duplicate is idempotent, reverse auto-accepts', async () => {
  const db = persist();
  await twoHunters(db);
  const first = await db.requestFriend(USER, USER_B);
  const again = await db.requestFriend(USER, USER_B);
  assert.equal(first.status, 'pending');
  assert.equal(again.status, 'pending');

  const reverse = await db.requestFriend(USER_B, USER);
  assert.equal(reverse.status, 'accepted');
  const list = await db.listFriends(USER);
  assert.equal(list.friends.length, 1);
  assert.equal(list.friends[0].userId, USER_B);
  assert.equal(list.pendingOut.length, 0);
  assert.equal(list.pendingIn.length, 0);
  await db.close();
});

test('accept / decline / remove', async () => {
  const db = persist();
  await twoHunters(db);
  await db.createCharacter(USER_C, 'Cora');

  await db.requestFriend(USER, USER_B);
  const accepted = await db.acceptFriend(USER_B, USER);
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.from.userId, USER);
  assert.equal(accepted.to.userId, USER_B);
  await assert.rejects(() => db.requestFriend(USER, 'Bram'), isCode(PersistErrorCodes.ALREADY_FRIENDS));

  const removed = await db.removeFriend(USER, USER_B);
  assert.equal(removed.ok, true);
  assert.deepEqual(await db.listFriends(USER), { friends: [], pendingIn: [], pendingOut: [] });

  await db.requestFriend(USER, USER_C);
  const declined = await db.declineFriend(USER_C, USER);
  assert.equal(declined.ok, true);
  assert.equal((await db.listFriends(USER)).pendingOut.length, 0);
  await db.requestFriend(USER, USER_C);
  assert.equal((await db.listFriends(USER_C)).pendingIn.length, 1);
  await db.close();
});

test('self, unknown name, and missing pending/accepted', async () => {
  const db = persist();
  await twoHunters(db);
  await assert.rejects(() => db.requestFriend(USER, USER), isCode(PersistErrorCodes.SELF));
  await assert.rejects(() => db.requestFriend(USER, 'Arden'), isCode(PersistErrorCodes.SELF));
  await assert.rejects(() => db.requestFriend(USER, 'Nobody'), isCode(PersistErrorCodes.NOT_FOUND));
  await assert.rejects(() => db.requestFriend(USER, uid(99)), isCode(PersistErrorCodes.NOT_FOUND));
  await assert.rejects(() => db.acceptFriend(USER, USER_B), isCode(PersistErrorCodes.NOT_FOUND));
  await assert.rejects(() => db.declineFriend(USER, USER_B), isCode(PersistErrorCodes.NOT_FOUND));
  await assert.rejects(() => db.removeFriend(USER, USER_B), isCode(PersistErrorCodes.NOT_FOUND));
  await assert.rejects(() => db.acceptFriend(USER, USER), isCode(PersistErrorCodes.SELF));
  await db.close();
});

async function fillAccepted(db, userId, start, prefix) {
  for (let i = 1; i <= FRIEND_CAP; i += 1) {
    const other = uid(start + i);
    await db.createCharacter(other, hunterName(prefix, i));
    await db.requestFriend(other, userId);
    await db.acceptFriend(userId, other);
  }
}

test('friends cap 100 is enforced on request and on both sides of accept', async () => {
  const db = persist();
  await db.createCharacter(USER, 'Arden');
  await db.createCharacter(USER_B, 'Bram');
  await db.createCharacter(USER_C, 'Cora');

  await fillAccepted(db, USER, 0, 'H');
  assert.equal((await db.listFriends(USER)).friends.length, FRIEND_CAP);
  await assert.rejects(() => db.requestFriend(USER, USER_B), isCode(PersistErrorCodes.FRIEND_CAP));

  await db.requestFriend(USER_B, USER_C);
  await fillAccepted(db, USER_C, 200, 'Z');
  await assert.rejects(() => db.acceptFriend(USER_C, USER_B), isCode(PersistErrorCodes.FRIEND_CAP));
  await db.close();
});

test('crossed request at cap returns friend_cap and leaves the pending row', async () => {
  const db = persist();
  await db.createCharacter(USER, 'Arden');
  await db.createCharacter(USER_B, 'Bram');
  await db.createCharacter(USER_C, 'Cora');

  // Acceptor (Arden) is at cap: Bram's pending stays pending.
  await db.requestFriend(USER_B, USER);
  await fillAccepted(db, USER, 0, 'H');
  await assert.rejects(() => db.requestFriend(USER, USER_B), isCode(PersistErrorCodes.FRIEND_CAP));
  assert.equal((await db.listFriends(USER_B)).pendingOut.length, 1);
  assert.equal((await db.listFriends(USER_B)).friends.length, 0);
  assert.equal((await db.listFriends(USER)).pendingIn.length, 1);
  assert.equal((await db.listFriends(USER)).friends.length, FRIEND_CAP);

  // Original requester (Bram) is at cap: Cora's reverse request does not auto-accept.
  await db.requestFriend(USER_B, USER_C);
  await fillAccepted(db, USER_B, 400, 'Q');
  await assert.rejects(() => db.requestFriend(USER_C, USER_B), isCode(PersistErrorCodes.FRIEND_CAP));
  assert.equal((await db.listFriends(USER_B)).pendingOut.some((p) => p.userId === USER_C), true);
  assert.equal((await db.listFriends(USER_C)).pendingIn.length, 1);
  assert.equal((await db.listFriends(USER_C)).friends.length, 0);
  await db.close();
});

test('noop adapter validates ids and never stores friends', async () => {
  const db = persist(createNoopAdapter());
  assert.deepEqual(await db.listFriends(USER), { friends: [], pendingIn: [], pendingOut: [] });
  await assert.rejects(() => db.requestFriend(USER, 'Bram'), isCode(PersistErrorCodes.NOT_FOUND));
  await assert.rejects(() => db.requestFriend(USER, USER), isCode(PersistErrorCodes.SELF));
  await assert.rejects(() => db.acceptFriend(USER, USER_B), isCode(PersistErrorCodes.NOT_FOUND));
  await db.close();
});

test('requireUserId on every friends method', async () => {
  const db = persist();
  await twoHunters(db);
  await assert.rejects(() => db.listFriends('nope'), (err) => err.code === PersistErrorCodes.INVALID);
  await assert.rejects(() => db.requestFriend('nope', USER_B), (err) => err.code === PersistErrorCodes.INVALID);
  await assert.rejects(() => db.acceptFriend(USER, 'nope'), (err) => err.code === PersistErrorCodes.INVALID);
  await assert.rejects(() => db.declineFriend('nope', USER_B), (err) => err.code === PersistErrorCodes.INVALID);
  await assert.rejects(() => db.removeFriend(USER, ''), (err) => err.code === PersistErrorCodes.INVALID);
  await db.close();
});
