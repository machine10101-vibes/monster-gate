/**
 * World-server socket client. Off unless ?mmo=1 (and not ?mock=1).
 *
 *   ?mmo=1&server=ws://localhost:8080
 *   VITE_MMO_URL at build time
 *
 * Wires PROTOCOL.md into src/net/worldView.js. No sockets here run on the
 * default GitHub Pages build. Waygate / trystero is untouched.
 */

import * as worldView from './worldView.js';

export const PROTOCOL = 1;

const SESSION_KEY = 'monster-gate-account-session';
const BACKOFF = [1000, 2000, 4000, 8000, 15000];

function paramsOf(search) {
  const raw = String(search || '');
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(q);
}

export function parseMmoClientFlags(search = '') {
  const q = paramsOf(search);
  const mmo = q.get('mmo') === '1';
  const mock = q.get('mock') === '1';
  return { mmo, mock, enabled: mmo && !mock };
}

export function resolveServerUrl(search = '', opts = {}) {
  const q = paramsOf(search);
  const fromQuery = (q.get('server') || '').trim();
  if (fromQuery) return fromQuery;
  if (opts.url) return String(opts.url);
  try {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : null;
    const fromEnv = env && typeof env.VITE_MMO_URL === 'string' ? env.VITE_MMO_URL.trim() : '';
    if (fromEnv) return fromEnv;
  } catch {
    /* Node tests have no Vite env */
  }
  return '';
}

function readAccessToken() {
  if (typeof sessionStorage === 'undefined') return '';
  for (const store of [sessionStorage, typeof localStorage !== 'undefined' ? localStorage : null]) {
    if (!store) continue;
    try {
      const raw = JSON.parse(store.getItem(SESSION_KEY) || 'null');
      if (raw && typeof raw.accessToken === 'string') return raw.accessToken;
    } catch {
      /* try the other store */
    }
  }
  return '';
}

function localName(game) {
  return game?.character?.name || game?.net?.name || 'Hunter';
}

function localLook(game) {
  const look = game?.character?.look;
  return look ? { ...look } : null;
}

function encode(type, extra = {}) {
  return JSON.stringify({ v: PROTOCOL, type, ...extra });
}

export class MmoClient {
  constructor(game, view, opts = {}) {
    this.game = game;
    this.view = view;
    this.url = opts.url;
    this.ws = null;
    this.closed = false;
    this.attempt = 0;
    this.timer = 0;
    this.you = null;
    this.bound = false;
  }

  bind() {
    if (this.bound || !this.view) return;
    this.bound = true;
    this.view.onLocalMove((pose) => this.sendMove(pose));
    this.view.onChatSend((msg) => this.sendChat(msg));
    this.view.transport = {
      reconnect: () => this.retry(),
    };
  }

  setStatus(state, detail) {
    this.view?.setStatus?.(typeof state === 'string' ? { status: state, detail } : state);
  }

  connect() {
    if (this.closed || !this.url) return;
    this.bind();
    this.setStatus(this.attempt ? 'reconnecting' : 'connecting');
    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      this.fail(err);
      return;
    }
    this.ws = ws;
    ws.addEventListener('open', () => {
      if (this.ws !== ws) return;
      this.attempt = 0;
      ws.send(encode('hello', {
        token: readAccessToken(),
        name: localName(this.game),
        look: localLook(this.game),
      }));
    });
    ws.addEventListener('message', (ev) => this.onFrame(ev.data));
    ws.addEventListener('close', () => {
      if (this.ws === ws) this.ws = null;
      if (!this.closed) this.schedule();
    });
    ws.addEventListener('error', () => {
      /* close handler schedules reconnect */
    });
  }

  onFrame(raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : String(raw));
    } catch {
      return;
    }
    if (!msg || msg.v !== PROTOCOL) return;
    if (msg.type === 'welcome') {
      this.you = msg.you || null;
      this.setStatus({ status: 'online', online: msg.online });
    } else if (msg.type === 'snapshot') {
      this.view?.applySnapshot?.(msg.players || [], { online: msg.online, zone: msg.zone });
      if (msg.online != null) this.view?.setOnlineCount?.(msg.online);
    } else if (msg.type === 'delta') {
      this.view?.applyDelta?.({ upsert: msg.upsert || [], remove: msg.remove || [] });
      if (msg.online != null) this.view?.setOnlineCount?.(msg.online);
    } else if (msg.type === 'chat') {
      this.view?.pushChat?.(msg);
    } else if (msg.type === 'leave' && msg.id) {
      this.view?.removePlayer?.(msg.id);
    } else if (msg.type === 'error') {
      this.view?.setStatus?.({ status: this.view.status || 'online', detail: msg.message || msg.code });
    }
  }

  sendMove(pose) {
    if (!this.ws || this.ws.readyState !== 1 || !pose) return;
    this.ws.send(encode('move', {
      x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw,
      anim: pose.anim, move: pose.move,
      held: pose.held, sheath: pose.sheath,
      look: pose.look, armor: pose.armor, zone: pose.zone,
    }));
  }

  sendChat(msg) {
    if (!this.ws || this.ws.readyState !== 1 || !msg) return;
    const text = String(msg.text || '').trim();
    if (!text) return;
    this.ws.send(encode('chat', { channel: msg.channel === 'zone' ? 'zone' : 'world', text }));
  }

  fail() {
    this.setStatus('reconnecting', 'World server unreachable');
    this.schedule();
  }

  schedule() {
    if (this.closed) return;
    this.setStatus('reconnecting');
    const wait = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)];
    this.attempt += 1;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), wait);
  }

  retry() {
    this.attempt = 0;
    clearTimeout(this.timer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.connect();
  }

  dispose() {
    this.closed = true;
    clearTimeout(this.timer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.setStatus('offline');
  }
}

/**
 * Mount the socket client. No-ops unless ?mmo=1 and not ?mock=1.
 * Without a server URL the view stays offline (default Pages build).
 */
export function attachMmo(game, view, opts = {}) {
  const search = opts.search ?? (typeof location !== 'undefined' ? location.search : '');
  const flags = parseMmoClientFlags(search);
  if (!flags.enabled) return null;
  const url = resolveServerUrl(search, opts);
  const target = view || game?.worldView || worldView;
  if (!url) {
    target?.setStatus?.({ status: 'offline', detail: 'No world server' });
    return null;
  }
  const client = new MmoClient(game, target, { url });
  client.connect();
  if (game) game.mmo = client;
  if (typeof window !== 'undefined') window.__mmo = client;
  return client;
}
