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
  assert.equal(body.aoi, 96);
  assert.equal(body.aoiNear, 32);
  assert.equal(body.farHz, 4);
  assert.equal(body.zoneCap, 150);
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
  await waitUntil(() => bMsgs.some((m) => m.type === 'delta' && m.upsert?.some((p) => (p.name === 'Ann' || p.id === welcomeA.you.id) && p.x >= 73)));

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

test('AOI of 96 units is applied to snapshots and pose deltas', async () => {
  const { openPersistence } = await import('../store.js');
  const persist = await openPersistence({ memory: true });
  await persist.createCharacter(ANN, 'Ann', { state: { hunter: { x: 72, y: 3.2, z: 72, realm: 'over' } } });
  await persist.saveCharacter(ANN, { hunter: { x: 72, y: 3.2, z: 72, realm: 'over' } }, { immediate: true });
  await persist.createCharacter(BEA, 'Bea', { state: { hunter: { x: 300, y: 3.2, z: 72, realm: 'over' } } });
  await persist.saveCharacter(BEA, { hunter: { x: 300, y: 3.2, z: 72, realm: 'over' } }, { immediate: true });
  const srv = await startWorld({ persist });
  const a = await open(srv.url);
  const b = await open(srv.url);
  const bMsgs = [];
  collect(b, bMsgs);
  await hello(a, 'ann', { name: 'Ann' });
  await hello(b, 'bea', { name: 'Bea' });
  await waitUntil(() => bMsgs.some((m) => m.type === 'snapshot'));
  const snap = bMsgs.find((m) => m.type === 'snapshot');
  assert.equal((snap.players || []).some((p) => p.name === 'Ann' || p.id?.includes(ANN)), false);
  a.send(encode('move', { x: 74, y: 3.2, z: 73, yaw: 0, move: 0.5, anim: 0, zone: 'Oakhollow' }));
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(bMsgs.some((m) => m.type === 'delta' && m.upsert?.some((p) => p.name === 'Ann' || p.x === 74)), false);
  a.close();
  b.close();
  await srv.close();
});

test('later pose deltas omit unchanged fields', async () => {
  const srv = await startWorld();
  const a = await open(srv.url);
  const b = await open(srv.url);
  const bMsgs = [];
  collect(b, bMsgs);
  const welcomeA = await hello(a, 'ann', { name: 'Ann' });
  await hello(b, 'bea', { name: 'Bea' });
  await waitUntil(() => bMsgs.some((m) => m.type === 'snapshot'));
  a.send(encode('move', { x: 74, y: 3.2, z: 73, yaw: 0.4, move: 0.8, anim: 0, zone: 'Oakhollow' }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'delta' && m.upsert?.some((p) => p.id === welcomeA.you.id && p.x >= 73)));
  const patch = bMsgs.filter((m) => m.type === 'delta').flatMap((m) => m.upsert || []).find((p) => p.id === welcomeA.you.id && p.x >= 73);
  assert.equal('armor' in patch, false);
  assert.equal('look' in patch, false);
  assert.equal('held' in patch, false);
  assert.ok('x' in patch);
  a.close();
  b.close();
  await srv.close();
});

test('ZONE_CAP rejects a new hunter with zone_full', async () => {
  const srv = await startWorld({ zoneCap: 1 });
  const a = await open(srv.url);
  await hello(a, 'ann', { name: 'Ann' });
  const b = await open(srv.url);
  const bMsgs = [];
  collect(b, bMsgs);
  const closed = new Promise((resolve) => b.once('close', resolve));
  b.send(encode('hello', { token: 'bea', name: 'Bea' }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'error' && m.code === 'zone_full'));
  assert.match(bMsgs.find((m) => m.code === 'zone_full').message, /full/i);
  await closed;
  a.close();
  await srv.close();
});

test('server broadcasts saved armor and weapon, not client-sent gear', async () => {
  const { openPersistence } = await import('../store.js');
  const persist = await openPersistence({ memory: true });
  await persist.createCharacter(ANN, 'Ann', {
    look: { skin: 2, hair: 1, style: 0, tunic: 1, beard: false },
    state: {
      look: { skin: 2, hair: 1, style: 0, tunic: 1, beard: false },
      armor: { helm: 'budgehelm', chest: 'budgechest' },
      weapon: 'budgeblade',
      crafted: { knife: true, budgeblade: true, budgehelm: true, budgechest: true },
      hunter: { x: 72, y: 3.2, z: 72, realm: 'over' },
    },
  });
  const srv = await startWorld({ persist });
  const a = await open(srv.url);
  const b = await open(srv.url);
  const bMsgs = [];
  collect(b, bMsgs);
  a.send(encode('hello', {
    token: 'ann',
    name: 'Ann',
    look: { skin: 0, hair: 0, style: 0, tunic: 0, beard: true },
    armor: { helm: 'ironhelm' },
    held: 'demonsword',
  }));
  await once(a, 'welcome');
  await hello(b, 'bea', { name: 'Bea' });
  await waitUntil(() => bMsgs.some((m) => m.type === 'snapshot' && (m.players || []).some((p) => p.name === 'Ann' || p.held || p.armor)));
  const snap = bMsgs.find((m) => m.type === 'snapshot');
  const ann = (snap.players || []).find((p) => p.name === 'Ann' || p.held === 'budgeblade' || p.armor?.helm === 'budgehelm');
  assert.ok(ann, 'Ann should be in Bea snapshot');
  assert.equal(ann.held, 'budgeblade');
  assert.equal(ann.armor?.helm, 'budgehelm');
  assert.equal(ann.armor?.chest, 'budgechest');
  assert.equal(ann.look?.skin, 2);
  assert.notEqual(ann.held, 'demonsword');
  a.send(encode('move', {
    x: 74, y: 3.2, z: 73, yaw: 0.4, move: 0.8, anim: 0, zone: 'Oakhollow',
    held: 'demonsword', armor: { helm: 'ironhelm' }, look: { skin: 0, hair: 0, style: 0, tunic: 0, beard: true },
  }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'delta' && m.upsert?.some((p) => p.id === ann.id && p.x >= 73)));
  const patches = bMsgs.filter((m) => m.type === 'delta').flatMap((m) => m.upsert || []).filter((p) => p.id === ann.id);
  assert.equal(patches.some((p) => p.held === 'demonsword' || p.armor?.helm === 'ironhelm' || p.look?.skin === 0), false);
  a.close();
  b.close();
  await srv.close();
});

test('debug and unlock flags are rejected', async () => {
  const srv = await startWorld();
  const a = await open(srv.url);
  const msgs = [];
  collect(a, msgs);
  const closed = new Promise((resolve) => a.once('close', resolve));
  a.send(encode('hello', { token: 'ann', name: 'Ann', debug: 1 }));
  await waitUntil(() => msgs.some((m) => m.type === 'error' && m.code === 'debug'));
  await closed;

  const b = await open(srv.url);
  const bMsgs = [];
  collect(b, bMsgs);
  await hello(b, 'bea', { name: 'Bea' });
  b.send(encode('move', { x: 74, y: 3.2, z: 73, yaw: 0, move: 0.5, anim: 0, zone: 'Oakhollow', unlock: 1 }));
  await waitUntil(() => bMsgs.some((m) => m.type === 'error' && m.code === 'debug'));
  b.close();
  await srv.close();
});
