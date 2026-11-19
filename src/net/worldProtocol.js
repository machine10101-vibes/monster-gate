/**
 * Client-side World 1 protocol helpers. Keep this file free of Node-only
 * imports so Vite can bundle it. The authoritative copy of the contract
 * is server/PROTOCOL.md.
 */

export const PROTOCOL = 1;
export const TICK_HZ = 15;

export const TYPES = {
  hello: 'hello',
  welcome: 'welcome',
  snapshot: 'snapshot',
  delta: 'delta',
  move: 'move',
  chat: 'chat',
  leave: 'leave',
  ping: 'ping',
  pong: 'pong',
  error: 'error',
  gather: 'gather',
};

export function encode(type, extra = {}) {
  return JSON.stringify({ v: PROTOCOL, type, ...extra });
}

export function parseFrame(raw) {
  const text = typeof raw === 'string' ? raw : String(raw);
  let msg;
  try {
    msg = JSON.parse(text);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object' || msg.v !== PROTOCOL || typeof msg.type !== 'string') return null;
  return msg;
}

export function parseWorldFlags(search = '', opts = {}) {
  const raw = String(search || '');
  const q = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const mmo = q.get('mmo') === '1';
  const mock = q.get('mock') === '1';
  return { mmo, mock, enabled: mmo && !mock };
}

export function resolveWorldUrl(search = '', opts = {}) {
  const raw = String(search || '');
  const q = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const fromQuery = (q.get('world') || q.get('server') || '').trim();
  if (fromQuery) return fromQuery;
  if (opts.url) return String(opts.url);
  try {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : null;
    const fromEnv = env && (env.VITE_WORLD_URL || env.VITE_MMO_URL);
    if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  } catch {
    /* Node tests have no Vite env */
  }
  return '';
}
