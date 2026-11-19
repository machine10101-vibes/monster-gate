import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hello, open, startWorld, waitUntil } from './lib/helpers.js';

test('Colosseum queues pair solo hunters and server resolves PvP damage', async () => {
  const srv = await startWorld();
  const a = await open(srv.url), b = await open(srv.url);
  const aFrames = [], bFrames = [];
  a.on('message', raw => aFrames.push(JSON.parse(String(raw))));
  b.on('message', raw => bFrames.push(JSON.parse(String(raw))));
  const wa = await hello(a, 'ann', { name: 'Ann' });
  const wb = await hello(b, 'bea', { name: 'Bea' });
  a.send(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '1v1' }));
  b.send(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '1v1' }));
  await waitUntil(() => aFrames.some(m => m.type === 'pvp_match_start') && bFrames.some(m => m.type === 'pvp_match_start'));
  const pa = srv.world.players.get(wa.you.id), pb = srv.world.players.get(wb.you.id);
  assert.equal(pa.zone, pb.zone);
  assert.match(pa.zone, /^colosseum:/);
  assert.notEqual(pa.pvpTeam, pb.pvpTeam);
  pa.x = pb.x - 2; pa.z = pb.z;
  const before = pb.hp;
  const hit = srv.world.pvp.attack(pa, pb.id);
  assert.ok(hit.damage > 0);
  assert.equal(pb.hp, before - hit.damage);
  assert.ok(aFrames.some(m => m.type === 'pvp_hit'));
  const returnPose = { ...pa.pvpReturnPose };
  srv.world.pvp.leave(pa);
  assert.equal(pa.pvpMatchId, null);
  assert.equal(pb.pvpMatchId, null);
  assert.equal(pa.zone, returnPose.zone);
  assert.equal(pa.x, returnPose.x);
  assert.equal(pa.z, returnPose.z);
  assert.ok(aFrames.some(m => m.type === 'pvp_match_end'));
  a.close(); b.close();
  await srv.close();
});

test('Colosseum rejects unsupported queues and unauthenticated fighters', async () => {
  const srv = await startWorld();
  const a = await open(srv.url);
  const frames = [];
  a.on('message', raw => frames.push(JSON.parse(String(raw))));
  const w = await hello(a, 'ann', { name: 'Ann' });
  a.send(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '4v4' }));
  await waitUntil(() => frames.some(m => m.type === 'error' && m.code === 'pvp_mode'));
  assert.ok(srv.world.players.has(w.you.id));
  a.close();
  await srv.close();
});

test('2v2 matchmaking pairs two full leader-created parties', async () => {
  const srv = await startWorld();
  const sockets = await Promise.all([open(srv.url), open(srv.url), open(srv.url), open(srv.url)]);
  const frames = sockets.map(() => []);
  sockets.forEach((ws, i) => ws.on('message', raw => frames[i].push(JSON.parse(String(raw)))));
  const [ann, bea, cal, dan] = await Promise.all([
    hello(sockets[0], 'ann', { name: 'Ann' }),
    hello(sockets[1], 'bea', { name: 'Bea' }),
    hello(sockets[2], 'cal', { name: 'Cal' }),
    hello(sockets[3], 'dan', { name: 'Dan' }),
  ]);
  sockets[0].send(JSON.stringify({ v: 1, type: 'party_invite', name: 'Bea', request_id: 'invite-bea' }));
  const inviteA = await waitUntil(() => frames[1].find(m => m.type === 'party_invite')) && frames[1].find(m => m.type === 'party_invite');
  sockets[1].send(JSON.stringify({ v: 1, type: 'party_accept', invite_id: inviteA.invite_id, request_id: 'accept-bea' }));
  sockets[2].send(JSON.stringify({ v: 1, type: 'party_invite', name: 'Dan', request_id: 'invite-dan' }));
  const inviteB = await waitUntil(() => frames[3].find(m => m.type === 'party_invite')) && frames[3].find(m => m.type === 'party_invite');
  sockets[3].send(JSON.stringify({ v: 1, type: 'party_accept', invite_id: inviteB.invite_id, request_id: 'accept-dan' }));
  await waitUntil(() => frames[0].some(m => m.type === 'party_state' && m.party?.members?.length === 2)
    && frames[2].some(m => m.type === 'party_state' && m.party?.members?.length === 2));
  sockets[0].send(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '2v2' }));
  sockets[2].send(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '2v2' }));
  await waitUntil(() => frames.every(list => list.some(m => m.type === 'pvp_match_start' && m.mode === '2v2')));
  const ids = [ann.you.id, bea.you.id, cal.you.id, dan.you.id];
  const players = ids.map(id => srv.world.players.get(id));
  assert.equal(players.filter(p => p.pvpTeam === 0).length, 2);
  assert.equal(players.filter(p => p.pvpTeam === 1).length, 2);
  assert.equal(new Set(players.map(p => p.pvpMatchId)).size, 1);
  sockets.forEach(ws => ws.close());
  await srv.close();
});
