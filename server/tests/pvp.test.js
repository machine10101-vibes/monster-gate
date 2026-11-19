import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hello, open, startWorld, waitUntil } from './lib/helpers.js';

async function withWorld(run) {
  const srv = await startWorld();
  const sockets = [];
  const connect = async () => {
    const ws = await open(srv.url);
    sockets.push(ws);
    return ws;
  };
  try {
    await run(srv, connect);
  } finally {
    for (const ws of sockets) {
      try { ws.terminate(); } catch { /* already closed */ }
    }
    await srv.close();
  }
}

function collect(ws) {
  const frames = [];
  ws.on('message', raw => frames.push(JSON.parse(String(raw))));
  return frames;
}

test('Colosseum pairs solo hunters, applies server damage, and restores their return poses', async () => {
  await withWorld(async (srv, connect) => {
    const a = await connect(), b = await connect();
    const aFrames = collect(a), bFrames = collect(b);
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
  });
});

test('Colosseum rejects unsupported queue modes', async () => {
  await withWorld(async (srv, connect) => {
    const a = await connect();
    const frames = collect(a);
    const w = await hello(a, 'ann', { name: 'Ann' });
    a.send(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '4v4' }));
    await waitUntil(() => frames.some(m => m.type === 'error' && m.code === 'pvp_mode'));
    assert.ok(srv.world.players.has(w.you.id));
  });
});

test('2v2 matchmaking pairs two full leader-created parties', async () => {
  await withWorld(async (srv, connect) => {
    const sockets = await Promise.all([connect(), connect(), connect(), connect()]);
    const frames = sockets.map(collect);
    const [ann, bea, cal, dan] = await Promise.all([
      hello(sockets[0], 'ann', { name: 'Ann' }),
      hello(sockets[1], 'bea', { name: 'Bea' }),
      hello(sockets[2], 'cal', { name: 'Cal' }),
      hello(sockets[3], 'dan', { name: 'Dan' }),
    ]);
    sockets[0].send(JSON.stringify({ v: 1, type: 'party_invite', name: 'Bea', request_id: 'invite-bea' }));
    await waitUntil(() => frames[1].some(m => m.type === 'party_invite'));
    const inviteA = frames[1].find(m => m.type === 'party_invite');
    sockets[1].send(JSON.stringify({ v: 1, type: 'party_accept', invite_id: inviteA.invite_id, request_id: 'accept-bea' }));
    sockets[2].send(JSON.stringify({ v: 1, type: 'party_invite', name: 'Dan', request_id: 'invite-dan' }));
    await waitUntil(() => frames[3].some(m => m.type === 'party_invite'));
    const inviteB = frames[3].find(m => m.type === 'party_invite');
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
  });
});
