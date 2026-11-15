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
const ACCOUNT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAccountId(value) {
  return ACCOUNT_ID_RE.test(String(value || '').trim());
}

const BACKOFF = [1000, 2000, 4000, 8000, 15000];
const PING_MS = 15_000;
export const WAKE_ETA_SEC = 30;
export const WAKE_GIVE_UP_SEC = 60;
export const WAKE_POLL_MS = 2500;
export const WAKE_TICK_MS = 1000;
export const WAKE_PROBE_MS = 3000;

/** https:// (or http://) /healthz for a wss:// or ws:// world URL. */
export function healthzUrl(worldUrl) {
  if (!worldUrl) return '';
  try {
    const u = new URL(worldUrl);
    if (u.protocol === 'wss:') u.protocol = 'https:';
    else if (u.protocol === 'ws:') u.protocol = 'http:';
    u.pathname = '/healthz';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

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
    this.features = [];
    this.resumeToken = '';
    this.bound = false;
    this.fatal = false;
    this.entities = { monsters: [], nodes: [] };
    this.nearby = new Map();
    this.wakeGen = 0;
    this.wakePoll = 0;
    this.wakeTick = 0;
    this.retryBound = false;
  }

  bind() {
    if (this.bound || !this.view) return;
    this.bound = true;
    this.view.onLocalMove((pose) => this.sendMove(pose));
    this.view.onChatSend((msg) => this.sendChat(msg));
    if (!this.retryBound && typeof this.view.onRetry === 'function') {
      this.retryBound = true;
      this.view.onRetry(() => this.retry());
    }
    this.view.transport = {
      reconnect: () => this.retry(),
    };
  }

  setStatus(state, info) {
    if (!this.view?.setStatus) return;
    try {
      if (typeof state === 'string') this.view.setStatus(state, info);
      else this.view.setStatus(state.status, state);
    } catch {
      /* view may not handle this status (e.g. waking) yet */
    }
  }

  connect() {
    if (this.closed || this.fatal || !this.url || !this.Socket) return;
    this.bind();
    void this.wakeThenOpen();
  }

  clearWake() {
    if (this.wakePoll) clearTimeout(this.wakePoll);
    if (this.wakeTick) clearInterval(this.wakeTick);
    this.wakePoll = 0;
    this.wakeTick = 0;
  }

  async probeHealthz(timeoutMs) {
    const url = healthzUrl(this.url);
    const fetchFn = this.opts.fetch || (typeof fetch === 'function' ? fetch : null);
    if (!url || typeof fetchFn !== 'function') return false;
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { try { ac?.abort(); } catch { /* ignore */ } }, timeoutMs);
    try {
      const res = await fetchFn(url, { method: 'GET', mode: 'cors', signal: ac?.signal });
      if (!res || !res.ok) return false;
      if (typeof res.json === 'function') {
        try {
          const body = await res.json();
          if (body && body.ok === false) return false;
        } catch {
          /* a 200 with no JSON still means the process is up */
        }
      }
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async wakeThenOpen() {
    this.clearWake();
    const gen = ++this.wakeGen;
    const wake = this.opts.wake || {};
    const etaSec = wake.etaSec ?? WAKE_ETA_SEC;
    const giveUpSec = wake.giveUpSec ?? WAKE_GIVE_UP_SEC;
    const pollMs = wake.pollMs ?? WAKE_POLL_MS;
    const tickMs = wake.tickMs ?? WAKE_TICK_MS;
    const probeMs = wake.probeMs ?? WAKE_PROBE_MS;
    const now = this.opts.now || Date.now;
    const started = now();
    const alive = () => gen === this.wakeGen && !this.closed && !this.fatal;
    const elapsedMs = () => Math.max(0, now() - started);
    const secondsLeft = () => Math.max(0, etaSec - Math.floor(elapsedMs() / 1000));
    let announced = false;

    const announce = () => {
      if (!alive()) return;
      announced = true;
      this.setStatus('waking', { secondsLeft: secondsLeft(), elapsedMs: elapsedMs() });
    };

    while (alive()) {
      const ok = await this.probeHealthz(probeMs);
      if (!alive()) return;
      if (ok) {
        this.clearWake();
        this.setStatus(this.attempt ? 'reconnecting' : 'connecting');
        this.openSocket();
        return;
      }
      if (!announced) {
        announce();
        this.wakeTick = setInterval(announce, tickMs);
      }
      // Past 60s the view shows Retry from elapsedMs; keep probing so a late
      // wake still moves to connecting/online. onRetry starts a fresh countdown.
      await new Promise((resolve) => {
        this.wakePoll = setTimeout(resolve, pollMs);
      });
    }
  }

  openSocket() {
    if (this.closed || this.fatal || !this.url || !this.Socket) return;
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
      this.features = Array.isArray(msg.features) ? msg.features.slice() : [];
      if (msg.resumeToken) this.resumeToken = msg.resumeToken;
      this.setStatus('online', { online: msg.online });
    } else if (msg.type === TYPES.snapshot) {
      this.nearby = new Map();
      for (const p of msg.players || []) if (p?.id) this.nearby.set(p.id, { ...p });
      this.view?.applySnapshot?.(msg.players || [], { online: msg.online, zone: msg.zone });
      if (msg.online != null) this.view?.setOnlineCount?.(msg.online);
      if (msg.entities) this.entities = {
        monsters: msg.entities.monsters || [],
        nodes: msg.entities.nodes || [],
      };
    } else if (msg.type === TYPES.delta) {
      const upsert = [];
      for (const row of msg.upsert || []) {
        if (!row?.id) continue;
        const merged = { ...(this.nearby.get(row.id) || {}), ...row };
        this.nearby.set(row.id, merged);
        upsert.push(merged);
      }
      for (const id of msg.remove || []) this.nearby.delete(id);
      this.view?.applyDelta?.({ upsert, remove: msg.remove || [] });
      if (msg.online != null) this.view?.setOnlineCount?.(msg.online);
      this.applyEntityDelta(msg.entities);
    } else if (msg.type === TYPES.chat) {
      this.view?.pushChat?.(msg);
    } else if (msg.type === TYPES.leave && msg.id) {
      this.nearby.delete(msg.id);
      this.view?.removePlayer?.(msg.id);
    } else if (msg.type === TYPES.error) {
      if (msg.code === 'name_taken') {
        this.fatal = true;
        const message = msg.message || 'That hunter name is already taken.';
        toast(this.game, message);
        this.dispose('error', { code: 'name_taken', message });
        return;
      }
      if (msg.code === 'auth' || (msg.code === 'zone_full' && !this.you)) {
        this.fatal = true;
        toast(this.game, msg.message || (msg.code === 'zone_full' ? 'That town is full.' : 'Sign in to hunt online. Guests stay solo.'));
        this.dispose('offline', msg.message);
        return;
      }
      this.setStatus('error', { code: msg.code || 'error', message: msg.message || msg.code });
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

  send(type, extra = {}) {
    if (!this.ws || this.ws.readyState !== 1 || !type) return;
    this.ws.send(encode(type, extra));
  }

  friendRequest(target) {
    const value = String(target || '').trim();
    const extra = isAccountId(value) ? { user_id: value } : { name: value };
    return this.send('friend_request', extra);
  }

  friendAccept(userId) { return this.send('friend_accept', { user_id: userId }); }
  friendDecline(userId) { return this.send('friend_decline', { user_id: userId }); }
  friendRemove(userId) { return this.send('friend_remove', { user_id: userId }); }
  friendList() { return this.send('friend_list'); }
  blockPlayer(userId) { return this.send('block', { user_id: userId }); }
  unblockPlayer(userId) { return this.send('unblock', { user_id: userId }); }
  ignorePlayer(userId) { return this.send('ignore', { user_id: userId }); }
  unignorePlayer(userId) { return this.send('unignore', { user_id: userId }); }

  partyInvite(target) {
    const value = String(target || '').trim();
    const extra = value.length <= 16 && !value.includes('_') ? { name: value } : { id: value };
    return this.send('party_invite', extra);
  }

  partyAccept(inviteId) { return this.send('party_accept', { invite_id: inviteId }); }
  partyDecline(inviteId) { return this.send('party_decline', { invite_id: inviteId }); }
  partyLeave() { return this.send('party_leave'); }
  partyKick(id) { return this.send('party_kick', { id }); }
  partyPromote(id) { return this.send('party_promote', { id }); }

  sendWhisper(to, text) {
    return this.send('whisper', { to, text });
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
    this.setStatus('reconnecting', { message: 'World server unreachable' });
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
    this.closed = false;
    this.attempt = 0;
    this.clearWake();
    this.wakeGen += 1;
    clearTimeout(this.timer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.connect();
  }

  dispose(status = 'offline', detail) {
    this.closed = true;
    this.wakeGen += 1;
    this.clearWake();
    this.stopPing();
    clearTimeout(this.timer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.setStatus(status, typeof detail === 'string' ? { message: detail } : detail);
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
