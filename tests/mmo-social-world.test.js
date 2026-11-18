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
function hello(ws, name, token = '') {
  ws.send(encode('hello', { name, token }));
  return waitFor(ws, m => m.type === 'welcome');
}

test('World 1 parties require acceptance, broadcast authoritative state, promote and disband', async () => {
  const srv = await createWorldServer({ port: 0, persist: createMemoryPersistence(), memory: true, tickMs: 40 });
  const a = await open(`ws://127.0.0.1:${srv.port}`);
  const b = await open(`ws://127.0.0.1:${srv.port}`);
  const am = collect(a), bm = collect(b);
  await hello(a, 'Ann'); await hello(b, 'Bea');
  a.send(encode('party_invite', { name: 'Bea' }));
  const invite = await waitFor(b, m => m.type === 'party_invite');
  assert.equal(am.some(m => m.type === 'party_state'), false, 'invite does not silently add target');
  b.send(encode('party_accept', { invite_id: invite.invite_id }));
  await waitFor(a, m => m.type === 'party_state' && m.party?.members?.length === 2);
  await waitFor(b, m => m.type === 'party_state' && m.party?.members?.length === 2);
  await new Promise(r => setTimeout(r, 30));
  const party = am.filter(m => m.type === 'party_state' && m.party).at(-1).party;
  const memberB = party.members.find(m => m.name === 'Bea');
  a.send(encode('party_promote', { id: memberB.id }));
  await waitFor(b, m => m.type === 'party_state' && m.party?.leader === memberB.id);
  b.send(encode('party_leave'));
  await waitFor(a, m => m.type === 'party_state' && m.party === null);
  a.close(); b.close(); await srv.close();
});

test('signed-in friends persist in social store and whispers are private', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => ({
    ok: true,
    async json() { return { id: String(url).includes('user') ? (globalThis.__socialTestUser || 'id-ann') : 'id-ann', user_metadata: { name: 'Account' } }; },
  });
  const env = { SUPABASE_URL: 'https://social-test.invalid', SUPABASE_ANON_KEY: 'anon' };
  const socialStore = createMemorySocialStore();
  const srv = await createWorldServer({ port: 0, persist: createMemoryPersistence(), socialStore, env, tickMs: 40 });
  const a = await open(`ws://127.0.0.1:${srv.port}`);
  const b = await open(`ws://127.0.0.1:${srv.port}`);
  const c = await open(`ws://127.0.0.1:${srv.port}`);
  const am = collect(a), bm = collect(b), cm = collect(c);
  globalThis.__socialTestUser = 'id-ann'; await hello(a, 'Ann', 'token-ann');
  globalThis.__socialTestUser = 'id-bea'; await hello(b, 'Bea', 'token-bea');
  globalThis.__socialTestUser = 'id-cal'; await hello(c, 'Cal', 'token-cal');

  a.send(encode('friend_request', { name: 'Bea' }));
  await waitFor(b, m => m.type === 'friend_request');
  b.send(encode('friend_accept', { user_id: 'id-ann' }));
  await waitFor(a, m => m.type === 'friend_list' && m.friends?.some(f => f.user_id === 'id-bea'));
  await waitFor(b, m => m.type === 'friend_list' && m.friends?.some(f => f.user_id === 'id-ann'));

  a.send(encode('whisper', { to: 'u_id-bea', text: 'Meet at the gate.' }));
  const privateMsg = await waitFor(b, m => m.type === 'chat' && m.channel === 'whisper');
  assert.equal(privateMsg.text, 'Meet at the gate.');
  assert.equal(cm.some(m => m.type === 'chat' && m.channel === 'whisper'), false);

  a.send(encode('block', { user_id: 'id-cal' }));
  await waitFor(a, m => m.type === 'friend_list' && m.blocked?.some(f => f.user_id === 'id-cal'));
  c.send(encode('chat', { channel: 'world', text: 'This should be hidden.' }));
  await new Promise(r => setTimeout(r, 60));
  assert.equal(am.some(m => m.type === 'chat' && m.text === 'This should be hidden.'), false);

  a.close(); b.close(); c.close(); await srv.close();
  globalThis.fetch = originalFetch;
  delete globalThis.__socialTestUser;
});
