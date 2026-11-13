/**
 * World-server socket client. Off unless ?mmo=1 (and not ?mock=1).
 *
 *   ?mmo=1&world=ws://localhost:8080
 *   VITE_WORLD_URL at build time
 *
 * `?server=` and VITE_MMO_URL still work as aliases. Wires
 * server/PROTOCOL.md into src/net/worldView.js. No sockets run on the
 * default GitHub Pages build. Waygate / trystero is untouched.
 */

import * as worldView from './worldView.js';
import { PROTOCOL, TYPES, encode, parseFrame, parseWorldFlags, resolveWorldUrl } from './worldProtocol.js';

export { PROTOCOL, TYPES, encode, parseFrame, parseWorldFlags, resolveWorldUrl };

const SESSION_KEY = 'monster-gate-account-session';
const BACKOFF = [1000, 2000, 4000, 8000, 15000];
const PING_MS = 15_000;

export function parseMmoClientFlags(search = '') {
  return parseWorldFlags(search);
}

export function resolveServerUrl(search = '', opts = {}) {
  return resolveWorldUrl(search, opts);
}

export function readAccessToken(opts = {}) {
  if (typeof opts.token === 'string' && opts.token) return opts.token;
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

export function isGuestSession(game, opts = {}) {
  if (opts.guest === true) return true;
  if (opts.guest === false) return false;
  if (game?.wallet?.kind === 'guest') return true;
  return !readAccessToken(opts);
}

function localName(game) {
  return game?.character?.name || game?.net?.name || 'Hunter';
}

function localLook(game) {
  const look = game?.character?.look;
  return look ? { ...look } : null;
}

function toast(game, text, ms = 3200) {
  game?.hud?.toast?.(text, ms);
}

export class MmoClient {
  constructor(game, view, opts = {}) {
    this.game = game;
    this.view = view;
    this.url = opts.url;
    this.opts = opts;
    this.Socket = opts.WebSocket || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    this.ws = null;
    this.closed = false;
    this.attempt = 0;
    this.timer = 0;
    this.pingTimer = 0;
    this.you = null;
    this.resumeToken = '';
    this.bound = false;
    this.fatal = false;
    this.entities = { monsters: [], nodes: [] };
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
    if (this.closed || this.fatal || !this.url || !this.Socket) return;
    this.bind();
    this.setStatus(this.attempt ? 'reconnecting' : 'connecting');
    let ws;
    try {
      ws = new this.Socket(this.url);
    } catch (err) {
      this.fail(err);
      return;
    }
    this.ws = ws;
    const onOpen = () => {
      if (this.ws !== ws) return;
      this.attempt = 0;
      this.startPing();
      const token = readAccessToken(this.opts);
      const payload = {
        token,
        name: localName(this.game),
        look: localLook(this.game),
      };
      if (this.resumeToken) payload.resume = this.resumeToken;
      ws.send(encode(TYPES.hello, payload));
    };
    const onMessage = (ev) => this.onFrame(ev?.data ?? ev);
    const onClose = () => {
      this.stopPing();
      if (this.ws === ws) this.ws = null;
      if (!this.closed && !this.fatal) this.schedule();
    };
    if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('open', onOpen);
      ws.addEventListener('message', onMessage);
      ws.addEventListener('close', onClose);
      ws.addEventListener('error', () => {});
    } else {
      ws.onopen = onOpen;
      ws.onmessage = onMessage;
      ws.onclose = onClose;
      ws.onerror = () => {};
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(encode(TYPES.ping, { t: Date.now() }));
      }
    }, PING_MS);
  }

  stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = 0;
  }

  onFrame(raw) {
    const msg = parseFrame(raw);
    if (!msg) return;
    if (msg.type === TYPES.welcome) {
      this.you = msg.you || null;
      if (msg.resumeToken) this.resumeToken = msg.resumeToken;
      this.setStatus({ status: 'online', online: msg.online });
    } else if (msg.type === TYPES.snapshot) {
      this.view?.applySnapshot?.(msg.players || [], { online: msg.online, zone: msg.zone });
      if (msg.online != null) this.view?.setOnlineCount?.(msg.online);
      if (msg.entities) this.entities = {
        monsters: msg.entities.monsters || [],
        nodes: msg.entities.nodes || [],
      };
    } else if (msg.type === TYPES.delta) {
      this.view?.applyDelta?.({ upsert: msg.upsert || [], remove: msg.remove || [] });
      if (msg.online != null) this.view?.setOnlineCount?.(msg.online);
      this.applyEntityDelta(msg.entities);
    } else if (msg.type === TYPES.chat) {
      this.view?.pushChat?.(msg);
    } else if (msg.type === TYPES.leave && msg.id) {
      this.view?.removePlayer?.(msg.id);
    } else if (msg.type === TYPES.error) {
      if (msg.code === 'auth') {
        this.fatal = true;
        toast(this.game, msg.message || 'Sign in to hunt online. Guests stay solo.');
        this.dispose('offline', msg.message);
        return;
      }
      this.view?.setStatus?.({ status: this.view.status || 'online', detail: msg.message || msg.code });
    }
  }

  applyEntityDelta(entities) {
    if (!entities) return;
    const patch = (list, next) => {
      let out = list.slice();
      for (const row of next?.upsert || []) {
        const i = out.findIndex((x) => x.id === row.id);
        if (i >= 0) out[i] = { ...out[i], ...row };
        else out.push(row);
      }
      const remove = new Set(next?.remove || []);
      if (remove.size) out = out.filter((x) => !remove.has(x.id));
      return out;
    };
    this.entities = {
      monsters: patch(this.entities.monsters, entities.monsters),
      nodes: patch(this.entities.nodes, entities.nodes),
    };
  }

  sendMove(pose) {
    if (!this.ws || this.ws.readyState !== 1 || !pose) return;
    this.ws.send(encode(TYPES.move, {
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
    this.ws.send(encode(TYPES.chat, { channel: msg.channel === 'zone' ? 'zone' : 'world', text }));
  }

  fail() {
    this.setStatus('reconnecting', 'World server unreachable');
    this.schedule();
  }

  schedule() {
    if (this.closed || this.fatal) return;
    this.setStatus('reconnecting');
    const wait = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)];
    this.attempt += 1;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), wait);
  }

  retry() {
    if (this.fatal) return;
    this.attempt = 0;
    clearTimeout(this.timer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.connect();
  }

  dispose(status = 'offline', detail) {
    this.closed = true;
    this.stopPing();
    clearTimeout(this.timer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.setStatus(status, detail);
  }
}

/**
 * Mount the socket client. No-ops unless ?mmo=1 and not ?mock=1.
 * Without a server URL, or as a guest, the view stays offline.
 */
export function attachMmo(game, view, opts = {}) {
  const search = opts.search ?? (typeof location !== 'undefined' ? location.search : '');
  const flags = parseMmoClientFlags(search);
  if (!flags.enabled) return null;
  const target = view || game?.worldView || worldView;
  if (isGuestSession(game, opts)) {
    target?.setStatus?.('offline');
    toast(game, 'Sign in to hunt online. Guests stay solo on this device.');
    return null;
  }
  const url = resolveWorldUrl(search, opts);
  if (!url) {
    target?.setStatus?.({ status: 'offline', detail: 'No world server' });
    return null;
  }
  const client = new MmoClient(game, target, { ...opts, url });
  client.connect();
  if (game) game.mmo = client;
  if (typeof window !== 'undefined') window.__mmo = client;
  return client;
}
