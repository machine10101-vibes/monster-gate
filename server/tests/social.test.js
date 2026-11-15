import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encode } from '../protocol.js';
import { FRIENDS_CAP, WELCOME_FEATURES } from '../friends.js';
import { PersistErrorCodes } from '../persistence/index.js';
import { openPersistence } from '../store.js';
import { ANN, BEA, CAL, collect, hello, open, startWorld, waitUntil } from './lib/helpers.js';

const DEE = '44444444-4444-4444-8444-444444444444';
const EVE = '55555555-5555-4555-8555-555555555555';

const USERS = {
  ann: { userId: ANN, name: 'Ann' },
  bea: { userId: BEA, name: 'Bea' },
  cal: { userId: CAL, name: 'Cal' },
  dee: { userId: DEE, name: 'Dee' },
  eve: { userId: EVE, name: 'Eve' },
};

async function verifyToken(token) {
  return USERS[token] || null;
}

function uid(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

function hunterName(prefix, n) {
  const i = n - 1;
  return `${prefix}${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + (i % 26))}`;
}

async function pace(clock, ms = 300) {
  if (clock) clock.advance(ms);
  else await new Promise((r) => setTimeout(r, ms));
}

function createClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance(ms) { t += ms; return t; },
  };
}

async function start(t, extra = {}) {
  const srv = await startWorld({ verifyToken, ...extra });
  t.after(async () => {
    try { await srv.close(); } catch { /* already closed */ }
  });
  return srv;
}

async function join(srv, token, name) {
  const ws = await open(srv.url);
  const msgs = [];
  collect(ws, msgs);
  const welcome = await hello(ws, token, { name });
  await waitUntil(() => msgs.some((m) => m.type === 'friend_list') && msgs.some((m) => m.type === 'party_state'));
  return { ws, msgs, welcome };
}

function latest(msgs, type) {
  return [...msgs].reverse().find((m) => m.type === type);
}

test('world persist exposes friends and maps cap / already / self', async () => {
  const db = await openPersistence({ memory: true, autoStart: false, intervalMs: 0 });
  await db.createCharacter(ANN, 'Ann');
  await db.createCharacter(BEA, 'Bea');
  const sent = await db.requestFriend(ANN, 'bea');
  assert.equal(sent.status, 'pending');
  assert.equal((await db.listFriends(ANN)).pendingOut[0].userId, BEA);
  assert.equal((await db.listFriends(BEA)).pendingIn[0].userId, ANN);

  await db.acceptFriend(BEA, ANN);
  assert.equal((await db.listFriends(ANN)).friends[0].userId, BEA);
  await assert.rejects(() => db.requestFriend(ANN, BEA), (err) => err.code === PersistErrorCodes.ALREADY_FRIENDS);
  await assert.rejects(() => db.requestFriend(ANN, ANN), (err) => err.code === PersistErrorCodes.SELF);

  await db.removeFriend(ANN, BEA);
  assert.equal((await db.listFriends(ANN)).friends.length, 0);

  await db.requestFriend(ANN, BEA);
  const again = await db.requestFriend(ANN, BEA);
  assert.equal(again.status, 'pending'); // duplicate request is idempotent
  await db.declineFriend(BEA, ANN);

  await db.requestFriend(ANN, BEA);
  const reverse = await db.requestFriend(BEA, ANN);
  assert.equal(reverse.status, 'accepted');
  await db.close();
});

test('welcome advertises social features and you.user_id', async (t) => {
  const srv = await start(t);
  const { welcome, ws } = await join(srv, 'ann', 'Ann');
  assert.deepEqual(welcome.features, WELCOME_FEATURES);
  assert.deepEqual(welcome.features, ['friends', 'party', 'whisper', 'block']);
  assert.equal(welcome.you.user_id, ANN);
  assert.equal(welcome.you.guest, false);
  ws.close();
  await srv.close();
});

test('friend request, accept, decline, remove, and presence', async (t) => {
  const srv = await start(t);
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');

  a.ws.send(encode('friend_request', { name: 'Bea' }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'friend_request' && m.from?.user_id === ANN));
  await waitUntil(() => latest(a.msgs, 'friend_list')?.pending_out?.some((r) => r.user_id === BEA));

  // Duplicate request is idempotent (no pending error).
  const listsBefore = a.msgs.filter((m) => m.type === 'friend_list').length;
  a.ws.send(encode('friend_request', { name: 'Bea' }));
  await waitUntil(() => a.msgs.filter((m) => m.type === 'friend_list').length > listsBefore);
  assert.equal(latest(a.msgs, 'friend_list').pending_out.some((r) => r.user_id === BEA), true);
  assert.equal(a.msgs.some((m) => m.type === 'error' && m.code === 'pending'), false);

  a.ws.send(encode('friend_request', { name: 'Ann' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'self'));

  b.ws.send(encode('friend_decline', { user_id: ANN }));
  await waitUntil(() => latest(a.msgs, 'friend_list')?.pending_out?.length === 0);

  a.ws.send(encode('friend_request', { user_id: BEA }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'friend_request' && m.from?.name === 'Ann'));
  b.ws.send(encode('friend_accept', { user_id: ANN }));
  await waitUntil(() => latest(a.msgs, 'friend_list')?.friends?.some((f) => f.user_id === BEA && f.presence === 'online'));
  await waitUntil(() => latest(b.msgs, 'friend_list')?.friends?.some((f) => f.user_id === ANN && f.presence === 'online'));
  await waitUntil(() => a.msgs.some((m) => m.type === 'friend_presence' && m.user_id === BEA && m.presence === 'online'));

  a.ws.send(encode('move', { x: 74, y: 3.2, z: 73, yaw: 0, move: 0.4, anim: 0, zone: 'Greyrock Pit' }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'friend_presence' && m.user_id === ANN && m.zone === 'Greyrock Pit' && m.presence === 'online'));

  a.ws.close();
  await waitUntil(() => b.msgs.some((m) => m.type === 'friend_presence' && m.user_id === ANN && m.presence === 'offline' && m.zone === ''));

  const a2 = await join(srv, 'ann', 'Ann');
  await waitUntil(() => latest(a2.msgs, 'friend_list')?.friends?.some((f) => f.user_id === BEA));
  a2.ws.send(encode('friend_remove', { user_id: BEA }));
  await waitUntil(() => latest(a2.msgs, 'friend_list')?.friends?.length === 0);
  await waitUntil(() => latest(b.msgs, 'friend_list')?.friends?.length === 0);

  a2.ws.close();
  b.ws.close();
  await srv.close();
});

test('friends cap is also enforced on the world server', async (t) => {
  const persist = await openPersistence({ memory: true });
  await persist.createCharacter(ANN, 'Ann');
  await persist.createCharacter(BEA, 'Bea');
  for (let i = 1; i <= FRIENDS_CAP; i++) {
    await persist.createCharacter(uid(i), hunterName('H', i));
    await persist.requestFriend(ANN, uid(i));
  }
  const srv = await start(t, { persist });
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');
  a.ws.send(encode('friend_request', { name: 'Bea' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'full'));
  a.ws.close();
  b.ws.close();
  await srv.close();
});

test('party invite, accept, kick, promote, leave, and a 4-hunter cap', async (t) => {
  const clock = createClock();
  const srv = await start(t, { now: clock.now, tickMs: 60_000 });
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');
  const c = await join(srv, 'cal', 'Cal');
  const d = await join(srv, 'dee', 'Dee');
  const e = await join(srv, 'eve', 'Eve');

  a.ws.send(encode('party_invite', { name: 'Bea' }));
  clock.advance(300);
  await waitUntil(() => b.msgs.some((m) => m.type === 'party_invite' && m.from?.id === a.welcome.you.id));
  const inviteB = latest(b.msgs, 'party_invite');
  b.ws.send(encode('party_accept', { invite_id: inviteB.invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 2);
  assert.equal(latest(a.msgs, 'party_state').party.leader, a.welcome.you.id);

  a.ws.send(encode('party_invite', { id: c.welcome.you.id }));
  clock.advance(300);
  await waitUntil(() => latest(c.msgs, 'party_invite'));
  c.ws.send(encode('party_accept', { invite_id: latest(c.msgs, 'party_invite').invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 3);

  // Member cannot kick or promote.
  c.ws.send(encode('party_kick', { id: b.welcome.you.id }));
  clock.advance(300);
  await waitUntil(() => c.msgs.some((m) => m.type === 'error' && m.code === 'not_leader'));
  c.ws.send(encode('party_promote', { id: b.welcome.you.id }));
  clock.advance(300);
  await waitUntil(() => c.msgs.filter((m) => m.type === 'error' && m.code === 'not_leader').length >= 2);

  a.ws.send(encode('party_kick', { id: a.welcome.you.id }));
  clock.advance(300);
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'self'));

  a.ws.send(encode('party_invite', { name: 'Dee' }));
  clock.advance(300);
  await waitUntil(() => latest(d.msgs, 'party_invite'));
  d.ws.send(encode('party_accept', { invite_id: latest(d.msgs, 'party_invite').invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 4);

  a.ws.send(encode('party_invite', { name: 'Eve' }));
  clock.advance(300);
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'full'));

  a.ws.send(encode('party_promote', { id: b.welcome.you.id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.leader === b.welcome.you.id);

  b.ws.send(encode('party_kick', { id: d.welcome.you.id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 3);
  await waitUntil(() => latest(d.msgs, 'party_state')?.party == null);

  c.ws.send(encode('party_leave'));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 2);

  // Last two: leave disbands.
  a.ws.send(encode('party_leave'));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party == null);
  await waitUntil(() => latest(b.msgs, 'party_state')?.party == null);

  a.ws.close();
  b.ws.close();
  c.ws.close();
  d.ws.close();
  e.ws.close();
  await srv.close();
});

test('party invite expires after 60s and rejects offline or busy targets', async (t) => {
  const clock = createClock();
  const srv = await start(t, { now: clock.now, tickMs: 60_000 });
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');
  const c = await join(srv, 'cal', 'Cal');

  a.ws.send(encode('party_invite', { name: 'Bea' }));
  await waitUntil(() => latest(b.msgs, 'party_invite'));
  const first = latest(b.msgs, 'party_invite');
  assert.equal(first.expires_at, clock.now() + 60_000);

  // Same leader replaces the pending invite.
  a.ws.send(encode('party_invite', { name: 'Bea' }));
  await waitUntil(() => b.msgs.filter((m) => m.type === 'party_invite').length >= 2);
  const second = latest(b.msgs, 'party_invite');
  assert.notEqual(second.invite_id, first.invite_id);

  c.ws.send(encode('party_invite', { name: 'Bea' }));
  await waitUntil(() => c.msgs.some((m) => m.type === 'error' && m.code === 'busy'));

  clock.advance(60_001);
  b.ws.send(encode('party_accept', { invite_id: second.invite_id }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'error' && m.code === 'expired'));

  b.ws.close();
  await new Promise((r) => setTimeout(r, 30));
  a.ws.send(encode('party_invite', { name: 'Bea' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'offline'));

  a.ws.send(encode('party_invite', { name: 'Ann' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'self'));

  a.ws.close();
  c.ws.close();
  await srv.close();
});

test('leader leave or disconnect promotes the oldest remaining member', async (t) => {
  const clock = createClock();
  const srv = await start(t, { now: clock.now, tickMs: 60_000 });
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');
  const c = await join(srv, 'cal', 'Cal');

  a.ws.send(encode('party_invite', { name: 'Bea' }));
  clock.advance(300);
  await waitUntil(() => latest(b.msgs, 'party_invite'));
  b.ws.send(encode('party_accept', { invite_id: latest(b.msgs, 'party_invite').invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 2);
  a.ws.send(encode('party_invite', { name: 'Cal' }));
  clock.advance(300);
  await waitUntil(() => latest(c.msgs, 'party_invite'));
  c.ws.send(encode('party_accept', { invite_id: latest(c.msgs, 'party_invite').invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 3);

  a.ws.send(encode('party_leave'));
  clock.advance(300);
  await waitUntil(() => latest(b.msgs, 'party_state')?.party?.leader === b.welcome.you.id);
  assert.equal(latest(c.msgs, 'party_state').party.leader, b.welcome.you.id);
  assert.equal(latest(b.msgs, 'party_state').party.members.length, 2);

  // Re-form with Ann as leader, then disconnect.
  b.ws.send(encode('party_leave'));
  clock.advance(300);
  await waitUntil(() => latest(b.msgs, 'party_state')?.party == null);
  const beaInvites = b.msgs.filter((m) => m.type === 'party_invite').length;
  const calInvites = c.msgs.filter((m) => m.type === 'party_invite').length;
  a.ws.send(encode('party_invite', { name: 'Bea' }));
  clock.advance(300);
  await waitUntil(() => b.msgs.filter((m) => m.type === 'party_invite').length > beaInvites);
  b.ws.send(encode('party_accept', { invite_id: latest(b.msgs, 'party_invite').invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.some((m) => m.id === b.welcome.you.id));
  a.ws.send(encode('party_invite', { name: 'Cal' }));
  clock.advance(300);
  await waitUntil(() => c.msgs.filter((m) => m.type === 'party_invite').length > calInvites);
  c.ws.send(encode('party_accept', { invite_id: latest(c.msgs, 'party_invite').invite_id }));
  clock.advance(300);
  await waitUntil(() => latest(a.msgs, 'party_state')?.party?.members?.length === 3);

  a.ws.close();
  await waitUntil(() => latest(b.msgs, 'party_state')?.party?.leader === b.welcome.you.id && latest(b.msgs, 'party_state')?.party?.members?.length === 2);

  b.ws.close();
  await waitUntil(() => latest(c.msgs, 'party_state')?.party == null);

  c.ws.close();
  await srv.close();
});

test('social actions are rate limited and whispers and blocks work', async (t) => {
  const srv = await start(t);
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');

  a.ws.send(encode('whisper', { to: b.welcome.you.id, text: 'Meet at the well.' }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'chat' && m.channel === 'whisper' && m.text === 'Meet at the well.'));
  await waitUntil(() => a.msgs.some((m) => m.type === 'chat' && m.channel === 'whisper' && m.to?.id === b.welcome.you.id));

  b.ws.send(encode('block', { user_id: ANN }));
  await waitUntil(() => latest(b.msgs, 'friend_list')?.blocked?.some((r) => r.user_id === ANN));
  a.ws.send(encode('friend_request', { name: 'Bea' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'blocked'));
  a.ws.send(encode('whisper', { to: b.welcome.you.id, text: 'Hello?' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'blocked'));

  b.ws.send(encode('unblock', { user_id: ANN }));
  await waitUntil(() => (latest(b.msgs, 'friend_list')?.blocked || []).length === 0);

  for (let i = 0; i < 6; i++) a.ws.send(encode('friend_request', { name: 'NoSuchHunter' }));
  await waitUntil(() => a.msgs.some((m) => m.type === 'error' && m.code === 'rate'));

  a.ws.close();
  b.ws.close();
  await srv.close();
});

test('guest sessions are refused for every friend_* action with auth', async (t) => {
  const srv = await start(t);
  const msgs = [];
  const ws = { readyState: 1, send: (raw) => msgs.push(JSON.parse(String(raw))) };
  const guest = {
    ws,
    id: 'g_1',
    name: 'Guest',
    guest: true,
    userId: '',
    authed: true,
    limiter: { allowSocial: () => true },
  };
  for (const msg of [
    { v: 1, type: 'friend_request', name: 'Ann' },
    { v: 1, type: 'friend_accept', user_id: ANN },
    { v: 1, type: 'friend_decline', user_id: ANN },
    { v: 1, type: 'friend_remove', user_id: ANN },
    { v: 1, type: 'friend_list' },
  ]) {
    await assert.rejects(() => srv.world.social.handle(guest, msg), (err) => err.code === 'auth');
  }
  // Even a guest flag on an account id is refused.
  guest.userId = ANN;
  await assert.rejects(
    () => srv.world.social.handle(guest, { v: 1, type: 'friend_request', name: 'Bea' }),
    (err) => err.code === 'auth',
  );
});

test('a second accept of the same request fails after the first succeeds', async (t) => {
  const srv = await start(t);
  const a = await join(srv, 'ann', 'Ann');
  const b = await join(srv, 'bea', 'Bea');
  a.ws.send(encode('friend_request', { name: 'Bea' }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'friend_request'));
  b.ws.send(encode('friend_accept', { user_id: ANN }));
  await waitUntil(() => latest(a.msgs, 'friend_list')?.friends?.some((f) => f.user_id === BEA));
  b.ws.send(encode('friend_accept', { user_id: ANN }));
  await waitUntil(() => b.msgs.some((m) => m.type === 'error' && (m.code === 'not_found' || m.code === 'already')));
  a.ws.close();
  b.ws.close();
});


test('empty social target names return name and do not resolve to Hunter', async (t) => {
  const srv = await start(t);
  const a = await join(srv, 'ann', 'Ann');
  const h = await join(srv, 'bea', 'Hunter');
  assert.equal(h.welcome.you.name, 'Hunter');

  async function expectName(type, payload) {
    const before = a.msgs.filter((m) => m.type === 'error' && m.code === 'name').length;
    a.ws.send(encode(type, payload));
    await waitUntil(() => a.msgs.filter((m) => m.type === 'error' && m.code === 'name').length > before);
  }

  for (const empty of ['', '   ']) {
    await expectName('friend_request', { name: empty });
    await pace(null, 300);
    await expectName('party_invite', { name: empty });
    await pace(null, 300);
    await expectName('whisper', { to: empty, text: 'Hi' });
    await pace(null, 300);
    await expectName('whisper', { name: empty, text: 'Hi' });
    await pace(null, 300);
    await expectName('block', { name: empty });
    await pace(null, 300);
  }

  assert.equal(h.msgs.some((m) => m.type === 'friend_request'), false);
  assert.equal(h.msgs.some((m) => m.type === 'party_invite'), false);
  assert.equal(h.msgs.some((m) => m.type === 'chat' && m.channel === 'whisper'), false);
  assert.equal((latest(a.msgs, 'friend_list')?.blocked || []).length, 0);
  assert.equal(a.msgs.some((m) => m.type === 'error' && m.code !== 'name' && m.code !== undefined && ['not_found', 'whisper', 'already', 'full'].includes(m.code)), false);

  a.ws.send(encode('friend_request', { name: 'Hunter' }));
  await waitUntil(() => h.msgs.some((m) => m.type === 'friend_request' && m.from?.user_id === ANN));
  a.ws.send(encode('whisper', { to: 'Hunter', text: 'Real name works.' }));
  await waitUntil(() => h.msgs.some((m) => m.type === 'chat' && m.channel === 'whisper' && m.text === 'Real name works.'));

  a.ws.close();
  h.ws.close();
  await srv.close();
});
