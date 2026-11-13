import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { PROTOCOL, encode } from '../server/protocol.js';
import { createMemoryPersistence } from '../server/store.js';
import { createWorldServer } from '../server/world.js';

function once(ws, type, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);
    const onMsg = (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        resolve(msg);
      }
    };
    ws.on('message', onMsg);
  });
}

function collect(ws, into) {
  ws.on('message', (raw) => into.push(JSON.parse(String(raw))));
}

function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function waitUntil(fn, timeoutMs = 2000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        if (fn()) return resolve();
      } catch (err) {
        return reject(err);
      }
      if (Date.now() - start > timeoutMs) return reject(new Error('waitUntil timeout'));
      setTimeout(tick, 15);
    };
    tick();
  });
}

test('two clients join, move, and chat on the world server', async () => {
  const persist = createMemoryPersistence();
  const srv = await createWorldServer({ port: 0, persist, tickMs: 25, memory: true });
  const url = `ws://127.0.0.1:${srv.port}`;
  const a = await open(url);
  const b = await open(url);
  const aMsgs = [];
  const bMsgs = [];
  collect(a, aMsgs);
  collect(b, bMsgs);

  a.send(encode('hello', { name: 'Ann' }));
  const welcomeA = await once(a, 'welcome');
  assert.equal(welcomeA.protocol, PROTOCOL);
  assert.equal(welcomeA.you.name, 'Ann');
  assert.equal(welcomeA.you.guest, true);

  b.send(encode('hello', { name: 'Bea' }));
  const welcomeB = await once(b, 'welcome');
  assert.equal(welcomeB.you.name, 'Bea');

  await waitUntil(() => bMsgs.some((m) => m.type === 'snapshot' && m.players.some((p) => p.name === 'Ann')));
  await waitUntil(() => aMsgs.some((m) => (
    (m.type === 'delta' && m.upsert?.some((p) => p.name === 'Bea'))
    || (m.type === 'snapshot' && m.players?.some((p) => p.name === 'Bea'))
  )));

  a.send(encode('move', { x: 74, y: 3.2, z: 73, yaw: 0.4, move: 0.8, anim: 0, zone: 'Oakhollow' }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'delta' && m.upsert?.some((p) => p.name === 'Ann' && p.x >= 73)));

  a.send(encode('chat', { channel: 'world', text: 'Forge is hot.' }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'chat' && m.text === 'Forge is hot.' && m.from.name === 'Ann'));

  a.send(encode('chat', { channel: 'zone', text: 'At the well.' }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'chat' && m.text === 'At the well.'));

  a.close();
  b.close();
  await srv.close();
});

test('server rate-limits chat bursts and rejects teleports', async () => {
  const persist = createMemoryPersistence();
  const srv = await createWorldServer({ port: 0, persist, tickMs: 40, memory: true });
  const url = `ws://127.0.0.1:${srv.port}`;
  const ws = await open(url);
  const msgs = [];
  collect(ws, msgs);
  ws.send(encode('hello', { name: 'Cal' }));
  await once(ws, 'welcome');

  for (let i = 0; i < 8; i++) ws.send(encode('chat', { channel: 'world', text: `spam ${i}` }));
  await waitUntil(() => msgs.some((m) => m.type === 'error' && m.code === 'rate'));

  ws.send(encode('move', { x: 400, y: 3, z: 400, zone: 'Oakhollow' }));
  await waitUntil(() => msgs.some((m) => m.type === 'error' && m.code === 'teleport'));

  ws.close();
  await srv.close();
});

test('openPersistence seam is in-memory until PR #60 lands', async () => {
  const { openPersistence } = await import('../server/store.js');
  const persist = await openPersistence({ memory: true });
  const row = await persist.createCharacter('user-1', 'Mira');
  assert.equal(row.name, 'Mira');
  await persist.saveCharacter('user-1', { x: 80, zone: 'Southford' });
  const loaded = await persist.loadCharacter('user-1');
  assert.equal(loaded.state.x, 80);
  assert.equal(loaded.state.zone, 'Southford');
  await persist.flushAll();
  await persist.close();
});
