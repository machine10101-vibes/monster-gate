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
const PING_MS = 15000;
const TOKEN_WATCH_MS = 400;

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

function tokenFromStore(store) {
  if (!store?.getItem) return '';
  try {
    const raw = JSON.parse(store.getItem(SESSION_KEY) || 'null');
    const token = raw && typeof raw.accessToken === 'string' ? raw.accessToken.trim() : '';
    return token;
  } catch {
    return '';
  }
}

/** Live wallet token, else the first non-blank stored session token. */
export function readAccessToken(game) {
  const wallet = game?.wallet && typeof game.wallet.accessToken === 'string'
    ? game.wallet.accessToken.trim()
    : '';
  if (wallet) return wallet;
  const stores = [];
  if (typeof sessionStorage !== 'undefined') stores.push(sessionStorage);
  if (typeof localStorage !== 'undefined') stores.push(localStorage);
  for (const store of stores) {
    const token = tokenFromStore(store);
    if (token) return token;
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
    this.pingTimer = 0;
    this.tokenWatch = 0;
    this.authHold = false;
    this.rejectedToken = '';
    this.lastHelloToken = '';
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
      const token = readAccessToken(this.game);
      this.lastHelloToken = token;
      ws.send(encode('hello', {
        token,
        name: localName(this.game),
        look: localLook(this.game),
      }));
    });
    ws.addEventListener('message', (ev) => this.onFrame(ev.data));
    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.stopPing();
      this.ws = null;
      if (!this.closed && !this.authHold) this.schedule();
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
      this.authHold = false;
      this.rejectedToken = '';
      this.stopTokenWatch();
      this.startPing();
      this.setStatus({ status: 'online', online: msg.online });
    } else if (msg.type === 'pong') {
      /* keepalive reply */
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
      this.setStatus({
        status: this.view?.status || 'connecting',
        code: msg.code || '',
        message: msg.message || '',
        detail: msg.message || msg.code || '',
      });
    }
  }

  startPing() {
    this.stopPing();
    const timer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) this.ws.send(encode('ping', { t: Date.now() }));
    }, PING_MS);
    timer.unref?.();
    this.pingTimer = timer;
  }

  stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = 0;
  }

  stopTokenWatch() {
    if (this.tokenWatch) clearInterval(this.tokenWatch);
    this.tokenWatch = 0;
  }

  /**
   * Auth failed for the token we just sent. Keep the client so a later sign-in
   * can hello again. The same rejected token is not retried.
   */
  holdForAuth() {
    if (this.closed) return;
    this.authHold = true;
    this.rejectedToken = this.lastHelloToken || readAccessToken(this.game);
    this.stopPing();
    clearTimeout(this.timer);
    this.timer = 0;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try { ws.close(); } catch { /* already closing */ }
    }
    this.watchToken();
  }

  watchToken() {
    this.stopTokenWatch();
    if (this.pollToken()) return;
    const timer = setInterval(() => {
      if (this.pollToken()) this.stopTokenWatch();
    }, TOKEN_WATCH_MS);
    timer.unref?.();
    this.tokenWatch = timer;
  }

  /** Re-hello when the signed-in token is no longer the one World 1 rejected. */
  pollToken() {
    if (this.closed || !this.authHold) return false;
    const token = readAccessToken(this.game);
    if (!token || token === this.rejectedToken) return false;
    this.authHold = false;
    this.rejectedToken = '';
    this.stopTokenWatch();
    this.view?.clearAuthLatch?.();
    this.attempt = 0;
    this.connect();
    return true;
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
    this.authHold = false;
    clearTimeout(this.timer);
    this.stopPing();
    this.stopTokenWatch();
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
