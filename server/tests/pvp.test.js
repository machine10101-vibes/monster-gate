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
