/**
 * World-view presentation layer. No sockets — src/net/mmo.js calls this.
 *
 *   import * as worldView from './worldView.js';
 *   await worldView.init(scene, { game, mock? });
 *   worldView.applySnapshot(players);
 *   worldView.applyDelta(players);          // or { upsert, remove }
 *   worldView.removePlayer(id);
 *   worldView.pushChat(msg);
 *   worldView.setStatus(state, detail?);
 *   worldView.onLocalMove(cb);
 *   worldView.onChatSend(cb);
 *   worldView.onRetry(cb);
 *
 * Full contract: docs/worldView-interface.md
 *
 * Flags: ?mmo=1 mounts this module. ?mmo=1&mock=1 also starts a local crowd.
 * ?mmo=1&mockwake=1 simulates a 30s waking queue, then online.
 * ?mmo=1&mockwake=90 waits 90 seconds (Almost there…, Retry, Play offline).
 * ?mmo=1&mock=1&mockerr=name_taken shows the hunter-name prompt and stays final.
 */

import { lookOptions, cleanName as rosterCleanName, nameProblem } from '../systems/roster.js';
import { decorateFrame } from '../ui/theme.js';
import { applyWeaponCursor } from '../ui/weaponCursor.js';

export const WORLD_VIEW = 1;
export const REMOTE_PREFIX = 'wv:';
export const CHAT_MAX = 120;
export const MOVE_HZ = 10;
export const LOCAL_BUBBLE_S = 4.2;
export const LOCAL_PIN_S = 15;

export const ANIM = { idle: 0, attack: 1, roll: 2, dead: 3, stagger: 4, use: 5 };

export const STATUS = {
  offline: 'offline',
  connecting: 'connecting',
  waking: 'waking',
  online: 'online',
  reconnecting: 'reconnecting',
  error: 'error',
};

export const WAKE_SECONDS = 30;
export const WAKE_STUCK_MS = 60000;

const ANIM_NAME = Object.fromEntries(Object.entries(ANIM).map(([k, v]) => [v, k]));

function paramsOf(search) {
  const raw = String(search || '');
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(q);
}

/** `?mockwake=1` is 30s. `?mockwake=90` is 90 seconds. */
export function parseWakeSeconds(search = '') {
  const q = typeof search === 'string' ? paramsOf(search) : search;
  const raw = q.get?.('mockwake') ?? q.get('mockwake');
  if (raw == null || raw === '' || raw === '0' || raw === 'false') return 0;
  if (raw === '1' || raw === 'true') return WAKE_SECONDS;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.min(600, Math.max(1, Math.round(n)));
  return 0;
}

/** Parse flags. Presentation mounts on mmo=1. Mock feed needs both mmo=1 and mock=1. */
export function parseMmoFlags(search = '') {
  const q = paramsOf(search);
  const mmo = q.get('mmo') === '1';
  const mock = q.get('mock') === '1';
  const wakeSeconds = parseWakeSeconds(q);
  const mockwake = wakeSeconds > 0;
  const mockerr = q.get('mockerr') || '';
  return { mmo, mock, mockwake, mockerr, enabled: mmo, mockFeed: mmo && mock, wakeSeconds };
}

/**
 * Local countdown for the waking overlay. `secondsLeft` defaults to 30.
 * If no further setStatus updates arrive, remaining time counts down from
 * the last detail using `markedAt` → `now`.
 */
export function wakeClock(detail, markedAt = 0, now = Date.now()) {
  const d = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : {};
  const baseElapsed = Number.isFinite(Number(d.elapsedMs)) ? Math.max(0, Number(d.elapsedMs)) : 0;
  const mark = Number(markedAt);
  const extra = Number.isFinite(mark) ? Math.max(0, now - mark) : 0;
  const elapsedMs = baseElapsed + extra;
  let secondsLeft;
  if (Number.isFinite(Number(d.secondsLeft))) {
    secondsLeft = Math.max(0, Math.ceil(Number(d.secondsLeft) - extra / 1000));
  } else {
    secondsLeft = Math.max(0, Math.ceil(WAKE_SECONDS - elapsedMs / 1000));
  }
  const phase = elapsedMs >= WAKE_STUCK_MS ? 'stuck' : elapsedMs >= WAKE_SECONDS * 1000 ? 'late' : 'queue';
  return { elapsedMs, secondsLeft, phase };
}

export function isMockMmo(search) {
  const src = search ?? (typeof location !== 'undefined' ? location.search : '');
  return parseMmoFlags(src).mockFeed;
}

function clampNum(n, lo, hi, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

function cleanName(raw) {
  return String(raw || 'Hunter').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Hunter';
}

function cleanText(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
}

export function animOf(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value);
    return n >= 0 && n <= 5 ? n : 0;
  }
  const key = String(value || 'idle').toLowerCase();
  return ANIM[key] ?? 0;
}

export function animName(value) {
  return ANIM_NAME[animOf(value)] || 'idle';
}

function cleanLook(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.skin == null && raw.hair == null && raw.tunic == null && raw.style == null) return null;
  if (typeof raw.skin === 'number' && raw.skin > 16) {
    return {
      skin: raw.skin,
      hair: raw.hair,
      hairStyle: raw.hairStyle || 'messy',
      tunic: raw.tunic,
      tunicLight: raw.tunicLight,
      beard: !!raw.beard,
      seed: raw.seed,
      resolved: true,
    };
  }
  return {
    skin: clampNum(raw.skin, 0, 8, 1),
    hair: clampNum(raw.hair, 0, 8, 1),
    style: clampNum(raw.style, 0, 8, 0),
    tunic: clampNum(raw.tunic, 0, 8, 0),
    beard: !!raw.beard,
  };
}

function cleanArmor(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const slot of ['helm', 'chest', 'arms', 'legs', 'boots', 'shield', 'book']) {
    if (typeof raw[slot] === 'string' && raw[slot]) out[slot] = raw[slot];
  }
  return out;
}

/** Normalize a remote-player snapshot. Returns null if it has no id. */
export function normalizePlayer(raw, fallbackY = 3) {
  if (!raw || raw.id == null || raw.id === '') return null;
  const x = clampNum(raw.x, -4000, 4000, 0);
  const z = clampNum(raw.z, -4000, 4000, 0);
  const y = Number.isFinite(Number(raw.y)) ? Number(raw.y) : fallbackY;
  return {
    id: String(raw.id).slice(0, 48),
    name: cleanName(raw.name),
    x,
    y,
    z,
    yaw: clampNum(raw.yaw ?? raw.heading, -Math.PI * 8, Math.PI * 8, 0),
    move: clampNum(raw.move, 0, 1, 0),
    anim: animOf(raw.anim ?? raw.state),
    held: typeof raw.held === 'string' && raw.held ? raw.held : 'blade',
    sheath: typeof raw.sheath === 'string' ? raw.sheath : null,
    look: cleanLook(raw.look),
    armor: cleanArmor(raw.armor),
    zone: raw.zone != null ? String(raw.zone).slice(0, 32) : '',
    hp: clampNum(raw.hp, 0, 999, 20),
  };
}

/** Normalize a chat event. Returns null if there is nothing to show. */
export function normalizeChat(raw) {
  if (!raw) return null;
  const text = cleanText(raw.text);
  if (!text) return null;
  const channel = raw.channel === 'zone' ? 'zone' : raw.channel === 'whisper' ? 'whisper' : 'world';
  const from = raw.from && typeof raw.from === 'object' ? raw.from : {};
  return {
    id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).slice(0, 48),
    channel,
    from: { id: String(from.id || ''), name: cleanName(from.name || raw.name) },
    text,
    at: Number(raw.at) || Date.now(),
    zone: raw.zone != null ? String(raw.zone).slice(0, 32) : '',
    to: raw.to && typeof raw.to === 'object' ? { id: String(raw.to.id || ''), name: cleanName(raw.to.name) } : null,
  };
}

export function angLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Time-buffered snapshot interpolation. Render at `now - delay` so the
 * client always has a next pose to blend toward.
 */
export class SnapshotBuffer {
  constructor({ delay = 0.12, keep = 1.2 } = {}) {
    this.delay = delay;
    this.keep = keep;
    this.frames = [];
  }

  push(time, pose) {
    const t = Number(time);
    if (!Number.isFinite(t) || !pose) return;
    const last = this.frames[this.frames.length - 1];
    if (last && t < last.time) return;
    this.frames.push({ time: t, pose });
    const cut = t - this.keep;
    while (this.frames.length > 2 && this.frames[0].time < cut) this.frames.shift();
  }

  sample(now) {
    const t = now - this.delay;
    const f = this.frames;
    if (!f.length) return null;
    if (f.length === 1 || t <= f[0].time) return { ...f[0].pose, snapped: true };
    let i = 1;
    while (i < f.length && f[i].time < t) i += 1;
    if (i >= f.length) return { ...f[f.length - 1].pose, snapped: true };
    const a = f[i - 1];
    const b = f[i];
    const span = b.time - a.time;
    const u = span <= 1e-6 ? 1 : Math.min(1, Math.max(0, (t - a.time) / span));
    return {
      x: a.pose.x + (b.pose.x - a.pose.x) * u,
      y: a.pose.y + (b.pose.y - a.pose.y) * u,
      z: a.pose.z + (b.pose.z - a.pose.z) * u,
      yaw: angLerp(a.pose.yaw, b.pose.yaw, u),
      move: a.pose.move + (b.pose.move - a.pose.move) * u,
      anim: u < 0.5 ? a.pose.anim : b.pose.anim,
      snapped: false,
    };
  }
}

function zoneOf(game) {
  if (game?.world?.realm === 'cave') return 'cave';
  const z = game?.zone;
  if (z == null || z === -1) return '';
  return String(z);
}

function localLook(game) {
  const look = game?.character?.look;
  return look ? { ...look } : null;
}

function localArmor(game) {
  try {
    return game?.progress?.armorLook?.() || {};
  } catch {
    return {};
  }
}

/**
 * Client presentation: remotes, chat, status. Drive it with a transport
 * (mmo.js) or the bundled mock feed.
 */
export class WorldView {
  constructor(game, opts = {}) {
    this.game = game;
    this.spawnRemote = opts.spawnRemote || ((id, name) => {
      throw new Error('WorldView needs spawnRemote from attachWorldView or mmo.js');
    });
    this.search = opts.search ?? (typeof location !== 'undefined' ? location.search : '');
    this.actors = new Map();
    this.chat = [];
    this.channel = 'world';
    this.status = STATUS.offline;
    this.detail = '';
    this.wakeDetail = null;
    this.wakeMarkedAt = 0;
    this.wakeDismissed = false;
    this.wakeUi = null;
    this.wakeTick = 0;
    this.nameUi = null;
    this.nameTakenOpen = false;
    this.online = 0;
    this.intents = [];
    this.onIntent = null;
    this._onLocalMove = null;
    this._onChatSend = null;
    this._onRetry = null;
    this.transport = null;
    this.moveAcc = 0;
    this.zone = '';
    this.ui = null;
    this.unsubs = [];
    this.wrapped = null;
    this.live = false;
    this.collapsed = false;
    this.localHeld = null;
    this.localSay = '';
    this.localSayT = 0;
    this.localPin = null;
    this.localPinUntil = 0;
    this._pinTimer = 0;
  }

  localPlayerId() {
    const you = this.game?.mmo?.you;
    if (you == null) return '';
    if (typeof you === 'string' || typeof you === 'number') return String(you);
    return you.id != null ? String(you.id) : '';
  }

  isLocalId(id) {
    const mine = this.localPlayerId();
    return !!mine && String(id) === mine;
  }

  noteLocalHeld(held) {
    this.localHeld = typeof held === 'string' && held ? held : null;
    try {
      applyWeaponCursor(this.game);
    } catch {
      /* node tests have no canvas */
    }
  }

  bindTransport(transport) {
    this.transport = transport || null;
    if (!transport?.on) return this;
    const on = (ev, fn) => {
      transport.on(ev, fn);
      this.unsubs.push(() => transport.on?.(ev, fn, true));
    };
    on('snapshot', (players, meta) => this.applySnapshot(players, meta));
    on('delta', (delta) => this.applyDelta(delta));
    on('chat', (msg) => this.pushChat(msg));
    on('status', (info) => {
      if (info && typeof info === 'object') this.setStatus(info.status, info.detail);
      else this.setStatus(info);
    });
    on('online', (n) => this.setOnlineCount(n));
    return this;
  }

  setIntentHandler(fn) {
    this.onIntent = typeof fn === 'function' ? fn : null;
  }

  onLocalMove(cb) {
    this._onLocalMove = typeof cb === 'function' ? cb : null;
    return this;
  }

  onChatSend(cb) {
    this._onChatSend = typeof cb === 'function' ? cb : null;
    return this;
  }

  onRetry(cb) {
    this._onRetry = typeof cb === 'function' ? cb : null;
    return this;
  }

  emit(intent) {
    if (!intent) return;
    this.intents.push(intent);
    if (this.intents.length > 32) this.intents.shift();
    this.onIntent?.(intent);
    this.transport?.send?.(intent);
  }

  pollIntent() {
    return this.intents.shift() || null;
  }

  applySnapshot(players, meta = {}) {
    const seen = new Set();
    const list = Array.isArray(players) ? players : [];
    const y0 = this.game?.world?.heightAt ? null : 3;
    for (const raw of list) {
      const fallbackY = y0 == null ? this.game.world.heightAt(Number(raw?.x) || 0, Number(raw?.z) || 0) : y0;
      const p = normalizePlayer(raw, fallbackY);
      if (!p) continue;
      seen.add(p.id);
      if (this.isLocalId(p.id)) {
        this.noteLocalHeld(p.held);
        if (this.actors.has(p.id)) this.drop(p.id);
        continue;
      }
      this.upsert(p);
    }
    for (const id of [...this.actors.keys()]) {
      if (!seen.has(id)) this.drop(id);
    }
    if (meta && typeof meta === 'object') {
      if (meta.online != null) this.setOnlineCount(meta.online);
      if (meta.zone) this.zone = String(meta.zone);
      if (meta.status) this.setStatus(meta.status, meta.detail);
    }
    this.paintHud();
  }

  applyDelta(players) {
    const delta = players && typeof players === 'object' && !Array.isArray(players)
      ? players
      : { upsert: players, remove: [] };
    const upsert = Array.isArray(delta.upsert) ? delta.upsert : Array.isArray(players) ? players : [];
    const remove = Array.isArray(delta.remove) ? delta.remove : [];
    for (const raw of upsert) {
      const p = normalizePlayer(raw, 3);
      if (!p) continue;
      if (this.isLocalId(p.id)) {
        this.noteLocalHeld(p.held);
        if (this.actors.has(p.id)) this.drop(p.id);
        continue;
      }
      this.upsert(p);
    }
    for (const id of remove) {
      if (!this.isLocalId(id)) this.drop(String(id));
    }
    this.paintHud();
  }

  removePlayer(id) {
    this.drop(String(id || ''));
    this.paintHud();
  }

  upsert(p) {
    const key = p.id;
    const rid = REMOTE_PREFIX + key;
    let row = this.actors.get(key);
    if (!row) {
      const remote = this.spawnRemote(rid, p.name);
      remote.driven = true;
      this.game?.remotes?.set(rid, remote);
      row = { remote, buffer: new SnapshotBuffer(), name: p.name, say: '', sayT: 0, last: p };
      this.actors.set(key, row);
    }
    row.name = p.name;
    row.last = p;
    row.remote.name = p.name;
    row.remote.setAppearance?.({
      name: p.name,
      look: p.look,
      armor: p.armor,
      held: p.held,
      sheath: p.sheath,
    });
    const t = this.game?.time ?? 0;
    row.buffer.push(t, {
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      move: p.move,
      anim: p.anim,
    });
    if (!row.remote.ready) {
      row.remote.present?.({ x: p.x, y: p.y, z: p.z, yaw: p.yaw, move: p.move, anim: p.anim, hp: p.hp });
    }
  }

  drop(id) {
    const row = this.actors.get(id);
    if (!row) return;
    const rid = REMOTE_PREFIX + id;
    row.remote.dispose?.();
    this.game?.remotes?.delete(rid);
    this.actors.delete(id);
  }

  applyChat(raw) {
    return this.pushChat(raw);
  }

  pushChat(raw) {
    const msg = normalizeChat(raw);
    if (!msg) return;
    this.chat.push(msg);
    if (this.chat.length > 80) this.chat.shift();
    const row = this.actors.get(msg.from.id);
    if (row) {
      row.say = msg.text;
      row.sayT = 4.2;
    }
    if (msg.from.id === 'you' || this.isLocalId(msg.from.id)) {
      this.localSay = msg.text;
      this.localSayT = LOCAL_BUBBLE_S;
      this.localPin = { id: msg.from.id, name: msg.from.name || 'You', text: msg.text };
      this.armPinTimer();
    }
    this.paintChat();
  }

  setStatus(status, detail = '') {
    let next = status;
    let extra = detail;
    if (status && typeof status === 'object') {
      next = status.status || status.state || STATUS.offline;
      extra = status.detail != null ? status.detail : '';
      if (status.online != null) this.setOnlineCount(status.online);
      if (extra && typeof extra !== 'object' && (status.secondsLeft != null || status.elapsedMs != null)) {
        extra = { secondsLeft: status.secondsLeft, elapsedMs: status.elapsedMs };
      } else if (extra && typeof extra === 'object') {
        extra = {
          ...extra,
          secondsLeft: extra.secondsLeft ?? status.secondsLeft,
          elapsedMs: extra.elapsedMs ?? status.elapsedMs,
        };
      }
      if (status.code || status.message) {
        extra = extra && typeof extra === 'object'
          ? { ...extra, code: extra.code || status.code, message: extra.message || status.message }
          : { code: status.code, message: status.message || extra };
      }
    }
    this.status = STATUS[next] || next || STATUS.offline;
    if (this.status === STATUS.waking) {
      this.wakeDetail = extra && typeof extra === 'object' ? extra : {};
      this.wakeMarkedAt = this.now();
      this.wakeDismissed = false;
      this.detail = this.wakeDetail;
      this.nameTakenOpen = false;
    } else {
      this.wakeDetail = null;
      this.wakeMarkedAt = 0;
      this.detail = extra == null ? '' : extra;
      if (this.status === STATUS.online) this.wakeDismissed = false;
      this.nameTakenOpen = this.status === STATUS.error && this.errorCode() === 'name_taken';
    }
    this.paintHud();
    this.syncWakeOverlay();
    this.syncNamePrompt();
  }

  errorCode() {
    const d = this.detail;
    if (d && typeof d === 'object') return String(d.code || '');
    return '';
  }

  errorMessage() {
    const d = this.detail;
    if (d && typeof d === 'object') return String(d.message || '');
    return typeof d === 'string' ? d : '';
  }

  nameTakenActive() {
    return this.mmoEnabled() && this.status === STATUS.error && this.errorCode() === 'name_taken' && this.nameTakenOpen;
  }

  now() {
    return this._now ? this._now() : Date.now();
  }

  clearPinTimer() {
    if (this._pinTimer) {
      clearTimeout(this._pinTimer);
      this._pinTimer = 0;
    }
  }

  armPinTimer() {
    this.clearPinTimer();
    const delay = LOCAL_PIN_S * 1000;
    this.localPinUntil = this.now() + delay;
    this._pinTimer = setTimeout(() => {
      this._pinTimer = 0;
      this.clearOwnPin();
    }, delay);
  }

  /** Hide the pinned own line. Does not rebuild the chat log. */
  clearOwnPin() {
    this.clearPinTimer();
    this.localPin = null;
    this.localPinUntil = 0;
    this.paintPin();
  }

  expireOwnPin() {
    if (!this.localPin || !this.localPinUntil) return false;
    if (this.now() < this.localPinUntil) return false;
    this.clearPinTimer();
    this.localPin = null;
    this.localPinUntil = 0;
    return true;
  }

  mmoEnabled() {
    return parseMmoFlags(this.search).mmo;
  }

  /** True when the login-queue overlay should be on screen. */
  wakeActive() {
    return this.mmoEnabled() && this.status === STATUS.waking && !this.wakeDismissed;
  }

  pollWake(now = this.now()) {
    if (this.status !== STATUS.waking) return null;
    return wakeClock(this.wakeDetail, this.wakeMarkedAt, now);
  }

  syncWakeOverlay() {
    if (!this.wakeActive()) {
      this.hideWakeOverlay();
      this.stopWakeTick();
      return;
    }
    this.ensureWakeOverlay();
    this.startWakeTick();
    this.paintWakeOverlay();
  }

  ensureWakeOverlay() {
    if (this.wakeUi || typeof document === 'undefined') return;
    const root = document.createElement('div');
    root.id = 'world-wake';
    root.innerHTML = `
      <div class="ww-card mg-frame">
        <small>World 1</small>
        <h1>MONSTER <em>GATE</em></h1>
        <div class="ww-spin" aria-hidden="true"></div>
        <p class="ww-msg"></p>
        <b class="ww-count"></b>
        <div class="load-bar ww-bar"><i></i></div>
        <div class="ww-actions">
          <button type="button" class="start ww-retry">Retry</button>
          <button type="button" class="start quiet ww-offline">Play offline</button>
        </div>
      </div>`;
    (document.getElementById('app') || document.body).appendChild(root);
    root.querySelector('.ww-retry').addEventListener('click', (e) => {
      e.preventDefault();
      this.retryWake();
    });
    root.querySelector('.ww-offline').addEventListener('click', (e) => {
      e.preventDefault();
      this.playOffline();
    });
    this.wakeUi = {
      root,
      msg: root.querySelector('.ww-msg'),
      count: root.querySelector('.ww-count'),
      fill: root.querySelector('.ww-bar i'),
      actions: root.querySelector('.ww-actions'),
    };
    decorateFrame(root.querySelector('.ww-card'));
    this.unsubs.push(() => this.hideWakeOverlay());
  }

  hideWakeOverlay() {
    if (this.wakeUi?.root) this.wakeUi.root.remove();
    this.wakeUi = null;
  }

  startWakeTick() {
    if (this.wakeTick || typeof setInterval === 'undefined') return;
    this.wakeTick = setInterval(() => this.paintWakeOverlay(), 250);
  }

  stopWakeTick() {
    if (this.wakeTick) clearInterval(this.wakeTick);
    this.wakeTick = 0;
  }

  paintWakeOverlay() {
    const clock = this.pollWake();
    if (!clock || !this.wakeActive()) {
      this.hideWakeOverlay();
      return;
    }
    if (!this.wakeUi) return;
    const stuck = clock.phase === 'stuck';
    const late = clock.phase === 'late' || stuck;
    this.wakeUi.msg.textContent = late
      ? 'Almost there…'
      : "Server starting, you're in the login queue";
    this.wakeUi.count.textContent = late ? '' : `${clock.secondsLeft}s`;
    const frac = Math.min(1, clock.elapsedMs / (WAKE_SECONDS * 1000));
    this.wakeUi.fill.style.width = `${Math.round(frac * 100)}%`;
    this.wakeUi.root.dataset.phase = clock.phase;
    this.wakeUi.actions.hidden = !stuck;
  }

  retryWake() {
    this.wakeDismissed = false;
    this._onRetry?.();
    this.requestReconnect();
  }

  playOffline() {
    this.wakeDismissed = true;
    this.hideWakeOverlay();
    this.stopWakeTick();
  }

  syncNamePrompt() {
    if (!this.nameTakenActive()) {
      this.hideNamePrompt();
      return;
    }
    this.ensureNamePrompt();
    this.paintNamePrompt();
  }

  ensureNamePrompt() {
    if (this.nameUi || typeof document === 'undefined') return;
    const root = document.createElement('div');
    root.id = 'world-name';
    root.innerHTML = `
      <form class="wn-card mg-frame">
        <small>World 1</small>
        <h2>Name taken</h2>
        <p class="wn-msg">That hunter name is taken. Pick another.</p>
        <label class="wg-label" for="world-name-input">Hunter name</label>
        <input id="world-name-input" class="wn-in" type="text" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" />
        <p class="wn-err" role="alert"></p>
        <button type="submit" class="start wn-go">Use this name</button>
      </form>`;
    (document.getElementById('app') || document.body).appendChild(root);
    decorateFrame(root.querySelector('.wn-card'));
    const input = root.querySelector('.wn-in');
    const err = root.querySelector('.wn-err');
    const msg = root.querySelector('.wn-msg');
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const problem = this.submitHunterName(input.value);
      if (problem) err.textContent = problem;
    });
    this.nameUi = { root, input, err, msg };
    this.unsubs.push(() => this.hideNamePrompt());
  }

  paintNamePrompt() {
    if (!this.nameUi) return;
    const current = this.game?.character?.name || this.game?.net?.name || '';
    const custom = this.errorMessage();
    this.nameUi.msg.textContent = custom || 'That hunter name is taken. Pick another.';
    if (!this.nameUi.input.value) this.nameUi.input.value = current;
    this.nameUi.err.textContent = '';
    const focus = () => {
      this.nameUi?.input?.focus?.();
      this.nameUi?.input?.select?.();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus);
    else focus();
  }

  hideNamePrompt() {
    this.nameUi?.root?.remove();
    this.nameUi = null;
  }

  applyHunterName(raw) {
    const name = rosterCleanName(raw);
    const g = this.game;
    if (g?.character) g.character.name = name;
    if (g?.net) g.net.name = name;
    const roster = g?.roster;
    const id = g?.character?.id;
    const char = roster?.get?.(id) || roster?.chars?.find?.((c) => c.id === id) || roster?.chars?.[0];
    if (char) char.name = name;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('mg-name', name);
    } catch { /* ignore */ }
    return name;
  }

  submitHunterName(raw) {
    const name = rosterCleanName(raw);
    const problem = nameProblem(name, this.game?.roster, this.game?.character?.id);
    if (problem) return problem;
    const taken = String(this.game?.character?.name || this.game?.net?.name || '').toLowerCase();
    if (name.toLowerCase() === taken) return 'That hunter name is taken. Pick another.';
    this.applyHunterName(name);
    this.nameTakenOpen = false;
    this.hideNamePrompt();
    this.emit({ type: 'rename', name });
    this.paintHud();
    return '';
  }

  setOnlineCount(n) {
    this.online = Math.max(0, Math.round(Number(n) || 0));
    this.paintHud();
  }

  nearbyCount() {
    return this.actors.size;
  }

  onHuntStart() {
    this.live = true;
    this.mountUi();
    this.zone = zoneOf(this.game);
    this.transport?.start?.(this);
    this.collapsed = !!(this.game?.input?.touch);
    this.paintHud();
    this.paintChat();
  }

  preStep() {
    if (!this.live) return;
    const t = this.game?.time ?? 0;
    for (const row of this.actors.values()) {
      const pose = row.buffer.sample(t);
      if (!pose) continue;
      row.remote.driven = true;
      row.remote.present?.(pose);
    }
  }

  update(dt) {
    if (!this.live) return;
    this.transport?.update?.(dt);
    this.moveAcc += dt;
    if (this.moveAcc >= 1 / MOVE_HZ) {
      this.moveAcc = 0;
      this.emitMove();
    }
    const z = zoneOf(this.game);
    if (z && z !== this.zone) {
      this.zone = z;
      this.emit({ type: 'zone', zone: z });
      this.paintChat();
    }
    if (this.localSayT > 0) {
      this.localSayT -= dt;
      if (this.localSayT <= 0) this.localSay = '';
    }
    if (this.expireOwnPin()) this.paintPin();
    const tags = [];
    for (const row of this.actors.values()) {
      if (row.sayT > 0) {
        row.sayT -= dt;
        if (row.sayT <= 0) row.say = '';
      }
      const tag = this.placeTag(row);
      if (tag) tags.push(tag);
    }
    this.layoutHunterTags(tags);
  }

  placeTag(row) {
    const g = this.game;
    if (!g?.hud || !row.remote?.ready) return null;
    const r = row.remote;
    const [sx, sy, vis] = g.screenOf(r.x, r.y + 2.2, r.z, true);
    const d = Math.hypot(r.x - g.player.pos.x, r.z - g.player.pos.z);
    const bubble = row.say && row.sayT > 0 ? `<i class="say">${escapeHtml(row.say)}</i>` : '';
    const mate = g.social?.isPartyMember?.(r.id, row.name);
    const plate = g.hud.plate(r.id, `${escapeHtml(row.name)}${bubble}`, mate ? 'hunter party' : 'hunter');
    if (plate) plate.dataset.pname = row.name;
    return { id: r.id, sx, sy, vis, d };
  }

  layoutHunterTags(tags) {
    const g = this.game;
    if (!g?.hud) return;
    const p = g.player?.pos;
    if (this.localSay && this.localSayT > 0 && p && g.screenOf) {
      const [sx, sy, vis] = g.screenOf(p.x, p.y + 2.35, p.z, true);
      g.hud.plate('local-chat', `<i class="say">${escapeHtml(this.localSay)}</i>`, 'hunter you');
      g.hud.placePlate('local-chat', sx, sy, !!vis, { dist: 0.2, zIndex: 92 });
    } else {
      g.hud.removePlate?.('local-chat');
    }
    const rows = tags.slice().sort((a, b) => a.d - b.d);
    for (const t of rows) {
      const fade = t.d >= 26 ? 0 : t.d <= 10 ? 1 : 1 - (t.d - 10) / 16;
      if (!t.vis || fade < 0.18) {
        g.hud.placePlate(t.id, t.sx, t.sy, false);
        continue;
      }
      g.hud.placePlate(t.id, t.sx, t.sy, true, {
        dist: t.d,
        opacity: Math.max(0.35, fade),
        zIndex: Math.max(1, 80 - Math.floor(t.d)),
      });
    }
    g.hud.layoutInteractPlates?.();
  }

  emitMove() {
    const p = this.game?.player;
    if (!p?.pos) return;
    const pose = {
      x: p.pos.x,
      y: p.pos.y,
      z: p.pos.z,
      yaw: p.yaw,
      anim: animOf(p.state),
      move: p.moveAmt || 0,
      held: p.heldKind || 'blade',
      sheath: p.sheathKind || null,
      look: localLook(this.game),
      armor: localArmor(this.game),
      zone: zoneOf(this.game),
    };
    this._onLocalMove?.(pose);
    this.emit({ type: 'move', ...pose });
  }

  sendChat(text, channel = this.channel) {
    const msg = cleanText(text);
    if (!msg) return false;
    const whisper = msg.match(/^\/w(?:hisper)?\s+(\S+)\s+(.+)$/i);
    if (whisper && this.game?.social?.caps?.whisper) {
      this.game.social.whisper(whisper[1], whisper[2]);
      return true;
    }
    const payload = { channel: channel === 'zone' ? 'zone' : 'world', text: msg };
    this._onChatSend?.(payload);
    this.emit({ type: 'chat', ...payload });
    return true;
  }

  requestReconnect() {
    if (this.nameTakenActive() || (this.status === STATUS.error && this.errorCode() === 'name_taken')) return;
    this.emit({ type: 'reconnect' });
    this.transport?.reconnect?.();
  }

  mountUi() {
    if (this.ui || typeof document === 'undefined') return;
    const hud = document.getElementById('hud');
    if (!hud) return;
    const status = document.createElement('div');
    status.id = 'world-status';
    status.className = 'pe';
    const slot = document.getElementById('world-status-slot');
    const top = document.getElementById('top-right');
    if (slot) slot.appendChild(status);
    else if (top) top.insertBefore(status, top.firstChild);
    else hud.appendChild(status);

    const chat = document.createElement('div');
    chat.id = 'world-chat';
    chat.className = 'pe';
    chat.innerHTML = `
      <button type="button" class="wc-toggle" aria-label="Chat">Chat</button>
      <div class="wc-body mg-frame">
        <div class="wc-tabs">
          <button type="button" data-ch="world">World</button>
          <button type="button" data-ch="zone">Zone</button>
        </div>
        <div class="wc-log" role="log" aria-live="polite"></div>
        <div class="wc-pin" hidden></div>
        <form class="wc-form">
          <input class="wc-in" type="text" maxlength="${CHAT_MAX}" autocomplete="off" autocapitalize="sentences" spellcheck="true" placeholder="Say something" />
          <button type="submit" class="wc-send">Send</button>
        </form>
      </div>`;
    hud.appendChild(chat);
    decorateFrame(chat.querySelector('.wc-body'));

    this.ui = {
      status,
      chat,
      log: chat.querySelector('.wc-log'),
      pin: chat.querySelector('.wc-pin'),
      input: chat.querySelector('.wc-in'),
    };
    const onVis = () => { if (this.expireOwnPin()) this.paintPin(); };
    document.addEventListener('visibilitychange', onVis);
    this.unsubs.push(() => document.removeEventListener('visibilitychange', onVis));

    chat.querySelector('.wc-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      this.collapsed = !this.collapsed;
      this.paintHud();
      if (!this.collapsed) this.ui.input?.focus();
    });
    chat.querySelectorAll('.wc-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        this.channel = b.dataset.ch === 'zone' ? 'zone' : 'world';
        this.paintChat();
        this.ui.input?.focus();
      });
    });
    chat.querySelector('.wc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = this.ui.input.value;
      if (this.sendChat(v)) this.ui.input.value = '';
    });

    const onKey = (e) => {
      if (!this.live) return;
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.code === 'Enter' && !typing) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.collapsed = false;
        this.paintHud();
        this.ui.input?.focus();
      } else if (e.code === 'Slash' && !typing) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.collapsed = false;
        this.paintHud();
        this.ui.input?.focus();
      } else if (e.code === 'Escape' && typing) {
        this.ui.input.blur();
        if (this.game?.input?.touch) {
          this.collapsed = true;
          this.paintHud();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    this.unsubs.push(() => window.removeEventListener('keydown', onKey, true));
    document.body.classList.add('mmo-view');
  }

  paintHud() {
    if (!this.ui) return;
    const st = this.status;
    const count = Math.max(this.online, this.actors.size + (this.live ? 1 : 0));
    const label = st === STATUS.online
      ? `Online · ${count}`
      : st === STATUS.connecting
        ? 'Connecting…'
        : st === STATUS.waking
          ? 'Starting…'
          : st === STATUS.reconnecting
            ? 'Reconnecting…'
            : st === STATUS.error && this.errorCode() === 'name_taken'
              ? 'Name taken'
              : st === STATUS.error
                ? 'Error'
                : 'Offline';
    const canRetry = (st === STATUS.offline || st === STATUS.reconnecting)
      && this.errorCode() !== 'name_taken';
    this.ui.status.dataset.state = st;
    const note = typeof this.detail === 'string' ? this.detail : '';
    this.ui.status.innerHTML = `<b>${label}</b>${note ? `<small>${escapeHtml(note)}</small>` : ''}${
      canRetry ? '<button type="button" class="wc-retry">Reconnect</button>' : ''
    }`;
    const retry = this.ui.status.querySelector('.wc-retry');
    if (retry) retry.onclick = () => this.requestReconnect();
    this.ui.chat.classList.toggle('collapsed', this.collapsed);
    this.ui.chat.dataset.channel = this.channel;
    const tog = this.ui.chat.querySelector('.wc-toggle');
    if (tog) {
      tog.textContent = this.collapsed ? 'Chat' : 'Close';
      tog.setAttribute('aria-label', this.collapsed ? 'Open chat' : 'Close chat');
    }
    this.ui.chat.querySelectorAll('.wc-tabs button').forEach((b) => {
      b.classList.toggle('on', b.dataset.ch === this.channel);
    });
  }

  paintChat() {
    if (!this.ui?.log) return;
    const zone = this.zone;
    const rows = this.chat.filter((m) => {
      if (m.channel === 'whisper') return true;
      if (this.channel === 'world') return m.channel === 'world';
      return m.channel === 'zone' && (!m.zone || !zone || m.zone === zone);
    });
    this.ui.log.innerHTML = rows.slice(-40).map((m) => {
      const who = escapeHtml(m.from.name);
      const text = escapeHtml(m.text);
      const pid = escapeHtml(m.from.id);
      const mine = m.from.id === 'you' || this.isLocalId(m.from.id);
      const tag = m.channel === 'whisper' ? '<i class="wc-wh">whisper</i> ' : '';
      const cls = mine ? ' class="wc-you"' : '';
      return `<p${cls}>${tag}<b class="wc-name" data-pid="${pid}" data-pname="${who}">${who}</b> ${text}</p>`;
    }).join('');
    this.ui.log.scrollTop = this.ui.log.scrollHeight;
    this.paintPin();
    this.paintHud();
  }

  paintPin() {
    this.expireOwnPin();
    const el = this.ui?.pin;
    if (!el) return;
    const pin = this.localPin;
    if (!pin) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    const who = escapeHtml(pin.name);
    const text = escapeHtml(pin.text);
    const pid = escapeHtml(pin.id);
    el.hidden = false;
    el.innerHTML = `<p class="wc-you"><span class="wc-pin-mark" aria-label="Pinned">📌</span><b class="wc-name" data-pid="${pid}" data-pname="${who}">${who}</b> ${text}</p>`;
  }

  wrapGame() {
    const g = this.game;
    if (!g || this.wrapped) return this;
    const step = g.step.bind(g);
    const start = g.start.bind(g);
    const clear = g.clearRemotes?.bind(g);
    g.step = (dt, rawDt) => {
      this.preStep();
      step(dt, rawDt);
      this.update(dt);
    };
    g.start = (...args) => {
      start(...args);
      if (g.started) this.onHuntStart();
    };
    if (clear) {
      g.clearRemotes = () => {
        const keep = [];
        for (const [id, r] of [...g.remotes]) {
          if (String(id).startsWith(REMOTE_PREFIX)) {
            keep.push([id, r]);
            g.remotes.delete(id);
          }
        }
        clear();
        for (const [id, r] of keep) g.remotes.set(id, r);
      };
    }
    this.wrapped = { step, start, clear };
    if (g.started) this.onHuntStart();
    return this;
  }

  dispose() {
    this.live = false;
    this.clearPinTimer();
    this.transport?.stop?.();
    for (const id of [...this.actors.keys()]) this.drop(id);
    for (const off of this.unsubs) {
      try { off(); } catch { /* already gone */ }
    }
    this.unsubs = [];
    this.ui?.status?.remove();
    this.ui?.chat?.remove();
    this.ui = null;
    this.hideWakeOverlay();
    this.hideNamePrompt();
    this.stopWakeTick();
    if (typeof document !== 'undefined') document.body?.classList.remove('mmo-view');
    const g = this.game;
    if (this.wrapped && g) {
      g.step = this.wrapped.step;
      g.start = this.wrapped.start;
      if (this.wrapped.clear) g.clearRemotes = this.wrapped.clear;
    }
    this.wrapped = null;
    if (instance === this) instance = null;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let instance = null;

function resolveGame(scene, opts) {
  if (opts.game) {
    if (scene && !opts.game.scene) opts.game.scene = scene;
    return opts.game;
  }
  if (scene && (scene.step || scene.player || scene.remotes || scene.scene)) return scene;
  return { scene, remotes: new Map(), ...opts };
}

async function attachMock(view, game, extra = {}) {
  if (view.transport) return view;
  const { MockWorld } = await import('./worldMock.js');
  const search = extra.search ?? view.search ?? '';
  const flags = parseMmoFlags(search);
  const feed = new MockWorld(view, {
    game,
    mockwake: extra.mockwake ?? flags.mockwake,
    mockerr: extra.mockerr ?? flags.mockerr,
    wakeMs: extra.wakeMs ?? (flags.wakeSeconds ? flags.wakeSeconds * 1000 : undefined),
  });
  view.bindTransport(feed);
  if (feed.mockwake) feed.start();
  return view;
}

/**
 * Mount the presentation layer. Idempotent.
 * `scene` may be a THREE.Scene or the Game. Pass `{ game }` when using a scene.
 * `{ mock: true }` (or ?mmo=1&mock=1) starts the local crowd feed.
 */
export async function init(scene, opts = {}) {
  const search = opts.search ?? (typeof location !== 'undefined' ? location.search : '');
  const flags = parseMmoFlags(search);
  const wantMock = opts.mock === true || flags.mockFeed || flags.mockwake;
  const game = resolveGame(scene, opts);
  if (instance) {
    if (wantMock) await attachMock(instance, game, { search, mockwake: flags.mockwake, wakeMs: opts.wakeMs });
    return instance;
  }
  const { RemoteHunter } = await import('../entities/remote.js');
  const view = new WorldView(game, {
    ...opts,
    search,
    spawnRemote: opts.spawnRemote || ((id, name) => new RemoteHunter(game, id, name)),
  });
  view.wrapGame();
  if (wantMock) await attachMock(view, game, { search, mockwake: flags.mockwake, wakeMs: opts.wakeMs });
  instance = view;
  game.worldView = view;
  if (typeof window !== 'undefined') window.__worldView = view;
  return view;
}

/** @deprecated use init() */
export const attachWorldView = init;

function current() {
  return instance;
}

export function applySnapshot(players, meta) {
  return current()?.applySnapshot(players, meta);
}
export function applyDelta(players) {
  return current()?.applyDelta(players);
}
export function removePlayer(id) {
  return current()?.removePlayer(id);
}
export function pushChat(msg) {
  return current()?.pushChat(msg);
}
export function setStatus(state, detail) {
  return current()?.setStatus(state, detail);
}
export function onLocalMove(cb) {
  return current()?.onLocalMove(cb);
}
export function onChatSend(cb) {
  return current()?.onChatSend(cb);
}
export function onRetry(cb) {
  return current()?.onRetry(cb);
}

export const worldView = {
  init, applySnapshot, applyDelta, removePlayer, pushChat, setStatus, onLocalMove, onChatSend, onRetry,
};

/** Tests: drop the module singleton. */
export function resetWorldView() {
  instance?.dispose();
  instance = null;
}

/** lookOptions helper so transports can reuse hunter creation looks. */
export { lookOptions };
