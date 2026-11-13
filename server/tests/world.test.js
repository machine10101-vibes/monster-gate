import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encode, PROTOCOL, TICK_HZ } from '../protocol.js';
import { ANN, BEA, collect, hello, once, open, startWorld, waitUntil } from './lib/helpers.js';

test('healthz reports the world is up', async () => {
  const srv = await startWorld();
  const res = await fetch(`http://127.0.0.1:${srv.port}/healthz`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.protocol, PROTOCOL);
  assert.equal(body.tickHz, TICK_HZ);
  await srv.close();
});

test('hello without a token is a polite auth reject', async () => {
  const srv = await startWorld();
  const ws = await open(srv.url);
  const msgs = [];
  collect(ws, msgs);
  const closed = new Promise((resolve) => ws.once('close', resolve));
  ws.send(encode('hello', { name: 'Guest' }));
  await waitUntil(() => msgs.some((m) => m.type === 'error' && m.code === 'auth'));
  assert.match(msgs.find((m) => m.code === 'auth').message, /sign in/i);
  await closed;
  await srv.close();
});

test('mocked auth: two clients see each other\'s poses and chat', async () => {
  const srv = await startWorld();
  const a = await open(srv.url);
  const b = await open(srv.url);
  const aMsgs = [];
  const bMsgs = [];
  collect(a, aMsgs);
  collect(b, bMsgs);

  const welcomeA = await hello(a, 'ann', { name: 'Ann' });
  assert.equal(welcomeA.protocol, PROTOCOL);
  assert.equal(welcomeA.tickHz, TICK_HZ);
  assert.equal(welcomeA.you.name, 'Ann');
  assert.equal(welcomeA.you.guest, false);
  assert.ok(welcomeA.resumeToken);

  await hello(b, 'bea', { name: 'Bea' });

  await waitUntil(() => bMsgs.some((m) => m.type === 'snapshot' && m.players.some((p) => p.name === 'Ann')));
  await waitUntil(() => aMsgs.some((m) => (
    (m.type === 'delta' && m.upsert?.some((p) => p.name === 'Bea'))
    || (m.type === 'snapshot' && m.players?.some((p) => p.name === 'Bea'))
  )));

  const snap = bMsgs.find((m) => m.type === 'snapshot');
  assert.ok(snap.entities?.nodes?.length > 0, 'Oakhollow snapshot includes gathering nodes');

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

test('speed-check rejects teleports and rate-limits chat', async () => {
  const srv = await startWorld();
  const ws = await open(srv.url);
  const msgs = [];
  collect(ws, msgs);
  await hello(ws, 'cal', { name: 'Cal' });

  for (let i = 0; i < 8; i++) ws.send(encode('chat', { channel: 'world', text: `spam ${i}` }));
  await waitUntil(() => msgs.some((m) => m.type === 'error' && m.code === 'rate'));

  ws.send(encode('move', { x: 400, y: 3, z: 400, zone: 'Oakhollow' }));
  await waitUntil(() => msgs.some((m) => m.type === 'error' && m.code === 'teleport'));

  ws.close();
  await srv.close();
});

test('disconnect saves the hunter through openPersistence()', async () => {
  const srv = await startWorld();
  const ws = await open(srv.url);
  await hello(ws, 'ann', { name: 'Ann' });
  ws.send(encode('move', { x: 75, y: 3.2, z: 74, yaw: 1, move: 1, anim: 0, zone: 'Oakhollow' }));
  await new Promise((r) => setTimeout(r, 40));
  ws.close();
  await waitUntil(async () => {
    await srv.world.idle();
    const row = await srv.persist.loadCharacter(ANN);
    return row?.state?.hunter?.x >= 74;
  }, 3000);
  const row = await srv.persist.loadCharacter(ANN);
  assert.equal(row.name, 'Ann');
  assert.ok(row.state.hunter.x >= 74);
  assert.equal(row.state.hunter.realm, 'over');
  await srv.close();
});

test('reconnect with resumeToken restores the same hunter id', async () => {
  const srv = await startWorld();
  const a = await open(srv.url);
  const welcome = await hello(a, 'ann', { name: 'Ann' });
  const id = welcome.you.id;
  const token = welcome.resumeToken;
  a.send(encode('move', { x: 78, y: 3.2, z: 70, yaw: 0.2, zone: 'Oakhollow' }));
  await new Promise((r) => setTimeout(r, 40));
  a.close();
  await new Promise((r) => setTimeout(r, 30));

  const b = await open(srv.url);
  const again = await hello(b, 'ann', { name: 'Ann', resume: token });
  assert.equal(again.you.id, id);
  assert.equal(again.resumed, true);
  b.close();
  await srv.close();
});
