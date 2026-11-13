import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ERRORS, FRIENDS_CAP, INVITE_TTL_MS, MAX_PARTY, parseSocialFlags,
} from '../src/social/constants.js';
import {
  clampPartySize, lootWinner, needGreedResolve, nextLootTurn, splitGold, splitXp,
} from '../src/social/rewards.js';
import { MockSocial, resetMockIds } from '../src/social/mock.js';
import { MmoSocial } from '../src/social/mmo.js';
import { OfflineSocial } from '../src/social/offline.js';
import { SocialSession } from '../src/social/session.js';
import { attachSocial } from '../src/social/index.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function mock(opts = {}) {
  resetMockIds();
  return new MockSocial({ autoInvite: false, autoPresence: false, ...opts });
}

test('social flags: mock needs mmo=1 and mocksocial=1', () => {
  assert.deepEqual(parseSocialFlags(''), { mmo: false, mocksocial: false, mock: false, live: false, offline: true });
  assert.equal(parseSocialFlags('?mmo=1').live, true);
  assert.equal(parseSocialFlags('?mmo=1').mock, false);
  assert.equal(parseSocialFlags('?mocksocial=1').mock, false);
  assert.equal(parseSocialFlags('?mmo=1&mocksocial=1').mock, true);
  assert.equal(parseSocialFlags('?mmo=1&mock=1&mocksocial=1').mock, true);
});

test('XP split: small group bonus, per-hunter share falls', () => {
  const solo = splitXp(100, 1);
  assert.equal(solo.total, 100);
  assert.deepEqual(solo.shares, [100]);
  const two = splitXp(100, 2);
  assert.equal(two.total, 108);
  assert.deepEqual(two.shares, [54, 54]);
  const three = splitXp(100, 3);
  assert.equal(three.total, 116);
  assert.equal(three.shares.reduce((a, b) => a + b, 0), 116);
  assert.equal(three.shares[0], 38 + 2);
  assert.equal(three.shares[1], 38);
  const four = splitXp(100, 4);
  assert.equal(four.total, 124);
  assert.equal(four.shares[0], 31);
  assert.ok(four.shares[0] < three.shares[1]);
  assert.ok(three.shares[1] < two.shares[0]);
  assert.equal(splitXp(100, 99).n, MAX_PARTY);
  assert.equal(clampPartySize(0), 1);
  const gold = splitGold(17, 2, { killerIndex: 0 });
  assert.deepEqual(gold.shares, [9, 8]);
});

test('loot round-robin and need/greed', () => {
  const ids = ['a', 'b', 'c'];
  assert.equal(lootWinner(ids, 0), 'a');
  assert.equal(lootWinner(ids, 1), 'b');
  assert.equal(lootWinner(ids, 3), 'a');
  assert.equal(nextLootTurn(3, 4), 0);
  const need = needGreedResolve([
    { id: 'a', choice: 'greed', roll: 99 },
    { id: 'b', choice: 'need', roll: 2 },
    { id: 'c', choice: 'pass', roll: 100 },
  ]);
  assert.equal(need.winner, 'b');
  assert.equal(need.pool, 'need');
  const greed = needGreedResolve([
    { id: 'a', choice: 'greed', roll: 40 },
    { id: 'b', choice: 'pass', roll: 90 },
    { id: 'c', choice: 'greed', roll: 40 },
  ]);
  assert.equal(greed.winner, 'a');
  assert.equal(needGreedResolve([{ id: 'a', choice: 'pass', roll: 1 }]).pool, 'pass');
});

test('mock friends: add by name, pending, accept, remove, block', async () => {
  const s = mock();
  const snap0 = s.snapshot();
  assert.equal(snap0.friends.length, 3);
  assert.equal(snap0.friends[0].presence, 'online');
  assert.ok(snap0.friends.find((f) => f.name === 'Dalla').presence === 'offline');
  assert.equal(snap0.pendingIn[0].name, 'Rowan');
  const dup = await s.act('friend_request', 'Bram');
  assert.equal(dup.code, ERRORS.already);
  const miss = await s.act('friend_request', 'Nobody');
  assert.equal(miss.code, ERRORS.not_found);
  const self = await s.act('friend_request', 'Hunter');
  assert.equal(self.code, ERRORS.self);
  const sent = await s.act('friend_request', 'Nessa');
  assert.equal(sent.ok, true);
  assert.ok(s.snapshot().pendingOut.some((p) => p.name === 'Nessa'));
  const acc = await s.act('friend_accept', 'Rowan');
  assert.equal(acc.ok, true);
  assert.ok(s.snapshot().friends.some((f) => f.name === 'Rowan'));
  const rem = await s.act('friend_remove', 'Bram');
  assert.equal(rem.ok, true);
  assert.ok(!s.snapshot().friends.some((f) => f.name === 'Bram'));
  const blk = await s.act('block', 'Lira');
  assert.equal(blk.ok, true);
  assert.ok(s.snapshot().blocked.some((p) => p.name === 'Lira'));
});

test('mock party invite, leave, kick, promote', async () => {
  const s = mock();
  const inv = await s.act('party_invite', 'Bram');
  assert.equal(inv.ok, true);
  assert.equal(s.party.members.length, 2);
  assert.equal(s.party.leader, 'u_you');
  const second = await s.act('party_invite', 'wv:lira');
  assert.equal(second.ok, true);
  assert.equal(s.party.members.length, 3);
  const promo = await s.act('party_promote', 'Bram');
  assert.equal(promo.ok, true);
  assert.equal(s.party.leader, 'u_bram');
  const kickFail = await s.act('party_kick', 'Lira');
  assert.equal(kickFail.code, ERRORS.not_leader);
  s.party.leader = 'u_you';
  const kicked = await s.act('party_kick', 'Lira');
  assert.equal(kicked.ok, true);
  const left = await s.act('party_leave');
  assert.equal(left.ok, true);
  assert.equal(s.party, null);
});

test('incoming party invite expires after 60s', async () => {
  let t = 1_000;
  const s = mock({ now: () => t, ttl: INVITE_TTL_MS });
  const inv = s.receiveInvite('Nessa');
  assert.equal(s.invites.length, 1);
  t = 1_000 + INVITE_TTL_MS - 1;
  s.tick(0, t);
  assert.equal(s.invites.length, 1);
  t = 1_000 + INVITE_TTL_MS + 1;
  s.tick(0, t);
  assert.equal(s.invites.length, 0);
  const late = await s.act('party_accept', inv.invite_id);
  assert.equal(late.code, ERRORS.expired);
});

test('incoming party invite accept/decline', async () => {
  const s = mock();
  const inv = s.receiveInvite('Nessa');
  const yes = await s.act('party_accept', inv.invite_id);
  assert.equal(yes.ok, true);
  assert.equal(s.party.leader, 'u_nessa');
  assert.equal(s.party.members.length, 2);
  const other = mock();
  const inv2 = other.receiveInvite('Pik');
  const no = await other.act('party_decline', inv2.invite_id);
  assert.equal(no.ok, true);
  assert.equal(other.invites.length, 0);
  assert.equal(other.party, null);
});

test('cannot accept a second party invite while already grouped', async () => {
  const s = mock();
  const inv = s.receiveInvite('Nessa');
  assert.equal((await s.act('party_accept', inv.invite_id)).ok, true);
  const extra = s.receiveInvite('Pik');
  const late = await s.act('party_accept', extra.invite_id);
  assert.equal(late.ok, false);
  assert.equal(late.code, ERRORS.in_party);
  assert.equal(s.party.leader, 'u_nessa');
});

test('party size cap is 4', async () => {
  const s = mock();
  s.fillParty(4);
  assert.equal(s.party.members.length, 4);
  const extra = await s.act('party_invite', 'Pik');
  assert.equal(extra.ok, false);
  assert.equal(extra.code, ERRORS.full);
  assert.equal(s.party.members.length, 4);
});

test('mock presence changes and auto invite tick', () => {
  let t = 0;
  const s = mock({
    now: () => t,
    autoInvite: true,
    autoPresence: true,
    inviteAt: 1600,
    presenceAt: 8000,
  });
  s.tick(0, t);
  t = 1600;
  s.tick(0, t);
  assert.equal(s.invites.length, 1);
  assert.equal(s.invites[0].from.name, 'Nessa');
  t = 8000;
  s.tick(0, t);
  const bram = s.people.get('u_bram');
  assert.equal(bram.zone, 'Greyrock Pit');
});

test('offline adapter and session refuse social actions', async () => {
  const backend = new OfflineSocial();
  const session = new SocialSession({}, backend, { offline: true });
  assert.equal(session.mode, 'offline');
  const res = await session.requestFriend('Bram');
  assert.equal(res.ok, false);
  assert.match(res.message, /Online only/);
  assert.equal(session.snapshot().friends.length, 0);
});

test('mmo adapter feature-detects missing methods and welcome.features', async () => {
  const calls = [];
  const client = {
    onFrame(raw) { calls.push(['orig', raw]); },
    you: { id: 'u_1', name: 'Ann', guest: false },
  };
  const mmo = new MmoSocial({ client });
  assert.equal(mmo.caps.friends, false);
  assert.equal(mmo.caps.party, false);
  const missing = await mmo.act('friend_request', 'Bram');
  assert.equal(missing.ok, false);
  assert.match(missing.message, /does not have this yet/);

  mmo.onFrame(JSON.stringify({
    v: 1,
    type: 'welcome',
    features: ['friends', 'party', 'whisper', 'block'],
    you: { id: 'u_1', name: 'Ann', user_id: 'uuid-1' },
  }));
  assert.equal(mmo.caps.friends, true);
  assert.equal(mmo.caps.party, true);
  assert.equal(mmo.caps.whisper, true);
  assert.equal(mmo.state.self.user_id, 'uuid-1');

  client.friendRequest = (name) => { calls.push(['friendRequest', name]); return { ok: true }; };
  mmo.detectFromClient(client);
  const sent = await mmo.act('friend_request', 'Bram');
  assert.equal(sent.ok, true);
  assert.deepEqual(calls.at(-1), ['friendRequest', 'Bram']);

  mmo.onFrame(JSON.stringify({
    v: 1,
    type: 'party_state',
    party: { id: 'pty_1', leader: 'u_1', members: [{ id: 'u_1', name: 'Ann', hp: 20, max_hp: 20 }] },
  }));
  assert.equal(mmo.snapshot().party.id, 'pty_1');
  mmo.dispose();
});

test('mmo adapter does not send unknown types when caps are off', async () => {
  const sent = [];
  const client = {
    onFrame() {},
    ws: { readyState: 1, send: (raw) => sent.push(raw) },
  };
  const mmo = new MmoSocial({ client });
  await mmo.act('party_invite', 'Bram');
  await mmo.act('friend_request', 'Bram');
  assert.equal(sent.length, 0);
  mmo.dispose();
});

test('attachSocial picks backends from the query string', () => {
  const a = attachSocial({}, '');
  assert.equal(a.mode, 'offline');
  const b = attachSocial({}, '?mmo=1&mocksocial=1');
  assert.equal(b.mode, 'mock');
  assert.equal(b.caps.friends, true);
  const c = attachSocial({ mmo: { onFrame() {} } }, '?mmo=1');
  assert.equal(c.mode, 'mmo');
  a.dispose();
  b.dispose();
  c.dispose();
});

test('friends cap constant and SOCIAL_SPEC cover the protocol', () => {
  assert.equal(FRIENDS_CAP, 100);
  assert.equal(MAX_PARTY, 4);
  assert.equal(INVITE_TTL_MS, 60_000);
  const spec = src('../docs/SOCIAL_SPEC.md');
  for (const type of [
    'friend_request', 'friend_accept', 'friend_decline', 'friend_remove', 'friend_list',
    'party_invite', 'party_accept', 'party_decline', 'party_leave', 'party_kick', 'party_promote',
    'party_state', 'friend_presence',
  ]) assert.match(spec, new RegExp(type));
  assert.match(spec, /user_id/);
  assert.match(spec, /never by a Klever wallet/);
  assert.match(spec, /create table if not exists public.friendships/);
  assert.match(spec, /0\.08/);
  const mmo = src('../src/net/mmo.js');
  assert.match(mmo, /export class MmoClient/);
  assert.doesNotMatch(mmo, /friendRequest/);
  const proto = src('../PROTOCOL.md');
  assert.doesNotMatch(proto, /friend_request/);
});
