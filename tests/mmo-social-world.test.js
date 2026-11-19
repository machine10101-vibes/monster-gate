import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { encode } from '../server/protocol.js';
import { createMemoryPersistence } from '../server/store.js';
import { createMemorySocialStore } from '../server/social-store.js';
import { createWorldServer } from '../server/world.js';

function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
function waitFor(ws, predicate, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.off('message', onMessage); reject(new Error('message timeout')); }, timeout);
    const onMessage = raw => {
      const msg = JSON.parse(String(raw));
      if (predicate(msg)) { clearTimeout(timer); ws.off('message', onMessage); resolve(msg); }
    };
    ws.on('message', onMessage);
  });
}
function collect(ws) {
  const messages = [];
  ws.on('message', raw => messages.push(JSON.parse(String(raw))));
  return messages;
}
const ANN = '11111111-1111-4111-8111-111111111111';
const BEA = '22222222-2222-4222-8222-222222222222';
const CAL = '33333333-3333-4333-8333-333333333333';
const verifyToken = async (token) => ({ userId: ({ 'token-ann': ANN, 'token-bea': BEA, 'token-cal': CAL })[token], name: 'Account' });

function hello(ws, name, token = '') {
  ws.send(encode('hello', { name, token }));
  return waitFor(ws, m => m.type === 'welcome');
}

test('World 1 parties require acceptance, broadcast authoritative state, promote and disband', async (t) => {
  let srv = null;
  const sockets = [];
  t.after(async () => { for (const ws of sockets) { try { ws.terminate(); } catch {} } if (srv) await srv.close().catch(() => {}); });
  srv = await createWorldServer({ port: 0, persist: createMemoryPersistence(), memory: true, tickMs: 40, verifyToken });
  const a = await open(`ws://127.0.0.1:${srv.port}`); sockets.push(a);
  const b = await open(`ws://127.0.0.1:${srv.port}`); sockets.push(b);
  const am = collect(a), bm = collect(b);
  await hello(a, 'Ann', 'token-ann'); await hello(b, 'Bea', 'token-bea');
  const inviteAck = waitFor(a, m => m.type === 'social_result' && m.request_id === 'party-1');
  a.send(encode('party_invite', { name: 'Bea', request_id: 'party-1' }));
  const invite = await waitFor(b, m => m.type === 'party_invite');
  assert.equal((await inviteAck).pending, true);
  assert.equal(am.some(m => m.type === 'party_state' && m.party), false, 'invite does not silently add target');
  const aParty = waitFor(a, m => m.type === 'party_state' && m.party?.members?.length === 2);
  const bParty = waitFor(b, m => m.type === 'party_state' && m.party?.members?.length === 2);
  b.send(encode('party_accept', { invite_id: invite.invite_id }));
  await Promise.all([aParty, bParty]);
  await new Promise(r => setTimeout(r, 30));
  const party = am.filter(m => m.type === 'party_state' && m.party).at(-1).party;
  const memberB = party.members.find(m => m.name === 'Bea');
  a.send(encode('party_promote', { id: memberB.id }));
  await waitFor(b, m => m.type === 'party_state' && m.party?.leader === memberB.id);
  const leaderPartyCleared = waitFor(a, m => m.type === 'party_state' && m.party === null);
  b.send(encode('party_leave'));
  await leaderPartyCleared;
  a.close(); b.close(); await srv.close(); srv = null;
});

test('signed-in friends persist in social store and whispers are private', async (t) => {
  let srv = null;
  const sockets = [];
  t.after(async () => { for (const ws of sockets) { try { ws.terminate(); } catch {} } if (srv) await srv.close().catch(() => {}); });
  const env = { SUPABASE_URL: 'https://social-test.invalid', SUPABASE_ANON_KEY: 'anon' };
  const socialStore = createMemorySocialStore();
  srv = await createWorldServer({ port: 0, persist: createMemoryPersistence(), socialStore, env, tickMs: 40, verifyToken });
  const a = await open(`ws://127.0.0.1:${srv.port}`); sockets.push(a);
  const b = await open(`ws://127.0.0.1:${srv.port}`); sockets.push(b);
  const c = await open(`ws://127.0.0.1:${srv.port}`); sockets.push(c);
  const am = collect(a), bm = collect(b), cm = collect(c);
  await hello(a, 'Ann', 'token-ann');
  await hello(b, 'Bea', 'token-bea');
  await hello(c, 'Cal', 'token-cal');

  const requestAck = waitFor(a, m => m.type === 'social_result' && m.request_id === 'friend-1');
  a.send(encode('friend_request', { name: 'Bea', request_id: 'friend-1' }));
  await waitFor(b, m => m.type === 'friend_request');
  assert.equal((await requestAck).pending, true);
  const aFriends = waitFor(a, m => m.type === 'friend_list' && m.friends?.some(f => f.user_id === BEA));
  const bFriends = waitFor(b, m => m.type === 'friend_list' && m.friends?.some(f => f.user_id === ANN));
  b.send(encode('friend_accept', { user_id: ANN }));
  await Promise.all([aFriends, bFriends]);

  const whisperAck = waitFor(a, m => m.type === 'social_result' && m.request_id === 'whisper-1');
  a.send(encode('whisper', { to: `u_${BEA}`, text: 'Meet at the gate.', request_id: 'whisper-1' }));
  const privateMsg = await waitFor(b, m => m.type === 'chat' && m.channel === 'whisper');
  assert.equal((await whisperAck).ok, true);
  assert.equal(privateMsg.text, 'Meet at the gate.');
  assert.equal(cm.some(m => m.type === 'chat' && m.channel === 'whisper'), false);

  a.send(encode('block', { user_id: CAL }));
  await waitFor(a, m => m.type === 'friend_list' && m.blocked?.some(f => f.user_id === CAL));
  c.send(encode('chat', { channel: 'world', text: 'This should be hidden.' }));
  await new Promise(r => setTimeout(r, 60));
  assert.equal(am.some(m => m.type === 'chat' && m.text === 'This should be hidden.'), false);

  a.close(); b.close(); c.close(); await srv.close(); srv = null;
});
