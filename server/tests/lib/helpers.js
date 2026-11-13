import { WebSocket } from 'ws';
import { encode } from '../../protocol.js';
import { openPersistence } from '../../store.js';
import { createWorldServer } from '../../world.js';

export const ANN = '11111111-1111-4111-8111-111111111111';
export const BEA = '22222222-2222-4222-8222-222222222222';
export const CAL = '33333333-3333-4333-8333-333333333333';

const USERS = {
  ann: { userId: ANN, name: 'Ann' },
  bea: { userId: BEA, name: 'Bea' },
  cal: { userId: CAL, name: 'Cal' },
};

export async function verifyToken(token) {
  return USERS[token] || null;
}

export async function startWorld(extra = {}) {
  const persist = extra.persist || await openPersistence({ memory: true });
  const srv = await createWorldServer({
    port: 0,
    persist,
    tickMs: extra.tickMs ?? 25,
    memory: true,
    verifyToken: extra.verifyToken || verifyToken,
    aoi: extra.aoi,
    aoiNear: extra.aoiNear,
    farHz: extra.farHz,
    zoneCap: extra.zoneCap,
    monsters: extra.monsters,
    nodes: extra.nodes,
  });
  srv.url = `ws://127.0.0.1:${srv.port}`;
  return srv;
}

export function once(ws, type, timeoutMs = 2000) {
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

export function collect(ws, into) {
  ws.on('message', (raw) => into.push(JSON.parse(String(raw))));
}

export function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

export function waitUntil(fn, timeoutMs = 2000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        if (await fn()) return resolve();
      } catch (err) {
        return reject(err);
      }
      if (Date.now() - start > timeoutMs) return reject(new Error('waitUntil timeout'));
      setTimeout(tick, 15);
    };
    tick();
  });
}

export async function hello(ws, token, extra = {}) {
  ws.send(encode('hello', { token, name: extra.name, look: extra.look, resume: extra.resume }));
  return once(ws, 'welcome');
}
