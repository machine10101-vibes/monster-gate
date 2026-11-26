/**
 * Local smoke: start World 1, connect two scripted clients, check
 * welcome / snapshot / move / chat, then shut down.
 */
import { WebSocket } from 'ws';
import { encode, PROTOCOL } from '../protocol.js';
import { startWorld, once, open, collect, hello, waitUntil } from '../tests/lib/helpers.js';

const srv = await startWorld({ tickMs: 30 });
const health = await fetch(`http://127.0.0.1:${srv.port}/healthz`).then((r) => r.json());
if (!health.ok || health.protocol !== PROTOCOL) throw new Error('healthz failed');

const a = await open(srv.url);
const b = await open(srv.url);
const bMsgs = [];
collect(b, bMsgs);
await hello(a, 'ann', { name: 'Ann' });
await hello(b, 'bea', { name: 'Bea' });
await waitUntil(() => bMsgs.some((m) => m.type === 'snapshot' && m.players.some((p) => p.name === 'Ann')));
// Deltas identify a player by id and omit the name, so take Ann's id from the snapshot.
const annId = bMsgs.filter((m) => m.type === 'snapshot').flatMap((m) => m.players).find((p) => p.name === 'Ann').id;
a.send(encode('move', { x: 74, y: 3.2, z: 73, yaw: 0.2, move: 1, anim: 0, zone: 'Oakhollow' }));
await waitUntil(() => bMsgs.some((m) => m.type === 'delta' && m.upsert?.some((p) => p.id === annId && p.x >= 73)));
a.send(encode('chat', { channel: 'world', text: 'Smoke is clear.' }));
await waitUntil(() => bMsgs.some((m) => m.type === 'chat' && m.text === 'Smoke is clear.'));
a.close();
b.close();
await srv.close();
console.log(`smoke ok: two clients on :${srv.port}, move + chat in sync, /healthz ok`);
