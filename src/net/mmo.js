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
export const WAKE_ETA_SEC = 60;
export const WAKE_GIVE_UP_SEC = 75;
export const WAKE_POLL_MS = 2500;
export const WAKE_TICK_MS = 1000;
export const WAKE_PROBE_MS = 65_000;

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
    this.fatalReason = null;
    this.authRejectedToken = null;
    this.entities = { monsters: [], nodes: [] };
    this.nearby = new Map();
    this.wakeGen = 0;
    this.wakePoll = 0;
    this.wakeTick = 0;
    this.retryBound = false;
    this.socialRequestSeq = 0;
    this.pendingSocial = new Map();
    this.lootOverlay = null;
    this.lootQueue = [];
    this.rewardSnapshot = null;
    this.monsterMoveAt = new Map();
    this.monsterMovePos = new Map();
    this.riftEnterPending = false;
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

  currentToken() {
    const stored = readAccessToken({ ...this.opts, token: '' });
    const explicit = typeof this.opts?.token === 'string' ? this.opts.token : '';
    if (explicit) {
      if (stored && stored !== explicit) return stored;
      return explicit;
    }
    return stored;
  }

  /**
   * Clear an auth rejection so a later sign-in can join without reloading.
   * Does not clear a name_taken or zone_full rejection.
   */
  resetAuth() {
    if (this.fatalReason && this.fatalReason !== 'auth') return;
    this.fatal = false;
    this.fatalReason = null;
    this.closed = false;
    this.authRejectedToken = null;
    clearTimeout(this.timer);
    this.timer = 0;
  }

  /**
   * Provide a sign-in token. A new/changed token after an auth rejection
   * resets the rejection and reconnects.
   */
  setToken(token) {
    const next = typeof token === 'string' ? token.trim() : '';
    this.opts = { ...this.opts, token: next };
    if (next && next !== this.authRejectedToken && (!this.fatalReason || this.fatalReason === 'auth')) {
      this.resetAuth();
      this.connect();
    }
    return next;
  }

  maybeClearAuthRejection() {
    if (!this.fatal || this.fatalReason !== 'auth') return;
    const token = this.currentToken();
    if (token && token !== this.authRejectedToken) this.resetAuth();
  }

  connect() {
    this.maybeClearAuthRejection();
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
      // Past 75s the view shows Retry from elapsedMs; keep probing so a late
      // wake still moves to connecting/online. onRetry starts a fresh countdown.
      await new Promise((resolve) => {
        this.wakePoll = setTimeout(resolve, pollMs);
      });
    }
  }

  openSocket() {
    this.maybeClearAuthRejection();
    if (this.closed || this.fatal || !this.url || !this.Socket) return;
    if (this.ws) {
      const prev = this.ws;
      this.ws = null;
      try { prev.close(); } catch { /* already closing */ }
    }
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
      const token = this.currentToken();
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
      if (this.ws !== ws) return;
      this.ws = null;
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
    if (msg.type === 'rift_entered') {
      this.riftEnterPending = false;
      if (this.game?.world?.realm !== 'rift') this.game?.enterRiftFromServer?.(msg);
      if (this.game?.riftRun) {
        this.game.riftRun.serverOwned = true;
        this.game.riftRun.party = msg.party_size || this.game.riftRun.party;
      }
      this.syncAuthoritativeMonsters();
      this.view?.setStatus?.('online', { message: 'Inside the Waygate Rift' });
      return;
    }
    if (msg.type === 'rift_wave') {
      return;
    }
    if (msg.type === 'rift_chest_ready') {
      toast(this.game, 'The Rift chest is ready. Claim it at the centre.');
      return;
    }
    if (msg.type === 'rift_chest_result') {
      if (msg.ok && this.game?.riftRun) {
        this.game.riftRun.looted = true;
        if (this.game.world?.rift?.chest) this.game.world.rift.chest.looted = true;
        if (this.game.progress?.data) {
          this.game.progress.data.riftClearAt = Date.now();
          this.game.progress.save();
        }
        toast(this.game, 'Rift rewards distributed to the party.');
      } else toast(this.game, msg.message || 'The Rift chest could not be claimed.');
      return;
    }
    if (msg.type === 'rift_expired') {
      this.game?.leaveRiftFromServer?.();
      toast(this.game, 'The Rift has collapsed.');
      return;
    }
    if (msg.type === 'rift_left') return;
    if (msg.type === 'reward_snapshot') {
      this.rewardSnapshot = msg;
      this.applyRewardSnapshot();
      return;
    }
    if (msg.type === 'monster_state') {
      this.entities.monsters = (this.entities.monsters || []).map((entry) => entry.id === msg.id
        ? { ...entry, hp: msg.hp, alive: msg.alive, x: msg.x ?? entry.x, y: msg.y ?? entry.y, z: msg.z ?? entry.z, yaw: msg.yaw ?? entry.yaw }
        : entry);
      for (const monster of this.game?.monsters || []) {
        if (monster.serverId !== msg.id) continue;
        monster.applyServerState?.(msg);
      }
      this.syncAuthoritativeMonsters();
      this.view?.applyMonsterState?.(msg);
      return;
    }
    if (msg.type === 'loot_roll') {
      this.showLootRoll(msg);
      return;
    }
    if (msg.type === 'loot_roll_progress') {
      const status = this.lootOverlay?.dataset.rollId === msg.roll_id
        ? this.lootOverlay.querySelector('[data-role="status"]') : null;
      if (status) status.textContent = `Choices submitted: ${msg.submitted}/${msg.total}`;
      return;
    }
    if (msg.type === 'loot_roll_result') {
      this.closeLootRoll(msg.roll_id);
      if (msg.winner === this.you?.id) toast(this.game, 'You won the loot roll!');
      else if (msg.winner) toast(this.game, 'The party loot roll is complete.');
      return;
    }
    if (msg.type === 'loot_awarded') {
      this.game?.applyServerReward?.(msg);
      toast(this.game, msg.winner === this.you?.id
        ? `Loot received: ${msg.amount} ${msg.id}.`
        : 'Party loot was awarded.');
      return;
    }
    if (msg.type === 'reward_update') {
      this.game?.applyServerReward?.(msg);
      return;
    }
    if (msg.type === 'combat_result') {
      this.view?.applyCombatResult?.(msg);
      return;
    }
    if (msg.type === 'social_result') {
      const pending=this.pendingSocial.get(String(msg.request_id||''));
      if(pending){clearTimeout(pending.timer);this.pendingSocial.delete(String(msg.request_id));pending.resolve({ok:!!msg.ok,pending:!!msg.pending,code:msg.code||'',message:msg.message||''});}
      return;
    }
    if (msg.type === TYPES.welcome) {
      this.you = msg.you || null;
      this.features = Array.isArray(msg.features) ? msg.features.slice() : [];
      if (this.game?.riftRun?.serverOwned && msg.pose?.zone !== 'rift') this.game.leaveRiftFromServer?.();
      this.syncAuthoritativeMonsters();
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
      this.syncAuthoritativeMonsters();
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
      this.syncAuthoritativeMonsters();
    } else if (msg.type === TYPES.chat) {
      this.view?.pushChat?.(msg);
    } else if (msg.type === TYPES.leave && msg.id) {
      this.nearby.delete(msg.id);
      this.view?.removePlayer?.(msg.id);
    } else if (msg.type === TYPES.error) {
      if (this.riftEnterPending && String(msg.code || '').startsWith('rift')) {
        this.riftEnterPending = false;
        if (this.game?.riftRun) this.game.riftRun.serverOwned = false;
        toast(this.game, msg.message || 'The Rift could not be opened online.');
        return;
      }
      if (msg.code === 'name_taken') {
        this.fatal = true;
        this.fatalReason = 'name_taken';
        const message = msg.message || 'That hunter name is already taken.';
        toast(this.game, message);
        this.dispose('error', { code: 'name_taken', message });
        return;
      }
      if (msg.code === 'auth' || (msg.code === 'zone_full' && !this.you)) {
        this.fatal = true;
        this.fatalReason = msg.code === 'auth' ? 'auth' : 'zone_full';
        if (msg.code === 'auth') this.authRejectedToken = this.currentToken();
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

  applyRewardSnapshot() {
    if (!this.rewardSnapshot || !this.game?.player) return;
    this.game.syncServerRewardState?.(this.rewardSnapshot);
    this.rewardSnapshot = null;
  }

  syncAuthoritativeMonsters() {
    if (this.you?.guest !== false) return;
    const allEntries = this.entities.monsters || [];
    if (!allEntries.length || !this.game?.monsters) return;
    for (const entry of allEntries) {
      const existing = this.game.monsters.find((monster) => monster.serverId === entry.id);
      if (existing) existing.applyServerState?.(entry);
    }
    const available = allEntries.filter((entry) => entry.alive !== false && entry.hp > 0);
    if (!available.length) return;
    const used = new Set((this.game.monsters || []).map((monster) => monster.serverId).filter(Boolean));
    for (const entry of available) {
      if (used.has(entry.id)) continue;
      const realm = entry.zone === 'rift' ? 'rift' : entry.zone === 'cave' ? 'cave' : 'over';
      let local = this.game.monsters
        .filter((monster) => !monster.serverAuthoritative && !monster.dead
          && monster.type === entry.type && (monster.realm || 'over') === realm)
        .map((monster) => ({ monster, distance: Math.hypot(entry.x - monster.x, entry.z - monster.z) }))
        .sort((a, b) => a.distance - b.distance)[0]?.monster;
      if (!local || Math.hypot(entry.x - local.x, entry.z - local.z) > 18) {
        if (realm === 'rift' && this.game.world?.realm !== 'rift') continue;
        if (realm === 'cave' && this.game.world?.realm !== 'cave') continue;
        local = this.game.spawner?.spawn?.(entry.type, entry.x, entry.z, false);
        if (!local) continue;
        local.realm = realm;
      }
      local.serverId = entry.id;
      local.serverAuthoritative = true;
      used.add(entry.id);
      local.applyServerState?.(entry);
    }
    if (this.game.world?.realm === 'rift') {
      for (const monster of [...this.game.monsters]) {
        if (monster.realm === 'rift' && !monster.serverAuthoritative) {
          monster.dispose?.();
          this.game.monsters.splice(this.game.monsters.indexOf(monster), 1);
        }
      }
    }
  }

  showLootRoll(msg) {
    if (typeof document === 'undefined' || !msg?.roll_id) return;
    if (this.lootOverlay) {
      this.lootQueue.push(msg);
      return;
    }
    const overlay = document.createElement('section');
    overlay.className = 'mmo-loot-roll';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Party loot roll');
    overlay.dataset.rollId = msg.roll_id;
    Object.assign(overlay.style, {
      position: 'fixed', zIndex: '10020', left: '50%', top: '18%', transform: 'translateX(-50%)',
      width: 'min(360px, calc(100vw - 32px))', padding: '16px', borderRadius: '12px',
      background: '#171522', color: '#fff', border: '1px solid #b99a52',
      boxShadow: '0 12px 40px #000a', font: '14px system-ui',
    });
    const title = document.createElement('strong');
    title.textContent = `Need / Greed: ${msg.item?.id || 'party drop'} ×${msg.item?.amount || 1}`;
    const status = document.createElement('p');
    status.dataset.role = 'status';
    status.textContent = 'Choose before the roll expires.';
    Object.assign(status.style, { margin: '10px 0', color: '#ddd' });
    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '8px' });
    for (const choice of ['need', 'greed', 'pass']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice[0].toUpperCase() + choice.slice(1);
      Object.assign(button.style, {
        flex: '1', padding: '9px 5px', borderRadius: '7px', border: '1px solid #8f7b52',
        background: choice === 'need' ? '#80612a' : '#302c3b', color: '#fff', cursor: 'pointer',
      });
      button.addEventListener('click', () => {
        if (!this.chooseLoot(msg.roll_id, choice)) return;
        for (const item of actions.querySelectorAll('button')) item.disabled = true;
        status.textContent = 'Choice submitted. Waiting for party…';
      }, { once: true });
      actions.append(button);
    }
    overlay.append(title, status, actions);
    document.body.append(overlay);
    this.lootOverlay = overlay;
    const ttl = Math.max(0, Number(msg.expires_at) - Date.now());
    this.lootTimer = setTimeout(() => this.closeLootRoll(), ttl);
  }

  closeLootRoll(rollId = null, advance = true) {
    if (rollId && this.lootOverlay?.dataset.rollId !== rollId) {
      this.lootQueue = this.lootQueue.filter((roll) => roll.roll_id !== rollId);
      return;
    }
    if (this.lootTimer) clearTimeout(this.lootTimer);
    this.lootTimer = 0;
    this.lootOverlay?.remove();
    this.lootOverlay = null;
    if (advance && this.lootQueue.length) this.showLootRoll(this.lootQueue.shift());
  }

  updateMonster(monster) {
    if (!this.ws || this.ws.readyState !== 1 || this.you?.guest !== false || !monster?.serverId || monster.dead) return false;
    const now = Date.now();
    const last = this.monsterMoveAt.get(monster.serverId) || 0;
    const previous = this.monsterMovePos.get(monster.serverId);
    const yaw = monster.yaw || 0;
    if (previous && Math.hypot(monster.x - previous.x, monster.z - previous.z) < 0.25
      && Math.abs(yaw - previous.yaw) < 0.12) return false;
    if (now - last < 220) return false;
    this.monsterMoveAt.set(monster.serverId, now);
    this.monsterMovePos.set(monster.serverId, { x: monster.x, z: monster.z, yaw });
    this.ws.send(encode('monster_move', {
      id: monster.serverId, x: monster.x, y: monster.y, z: monster.z, yaw,
    }));
    return true;
  }

  enterRift() {
    if (this.ws?.readyState !== 1 || this.you?.guest !== false) return false;
    this.riftEnterPending = true;
    this.ws.send(encode('rift_enter'));
    return true;
  }

  leaveRift() {
    if (this.ws?.readyState !== 1) return false;
    this.ws.send(encode('rift_leave'));
    return true;
  }

  claimRiftChest() {
    if (this.ws?.readyState !== 1 || this.you?.guest !== false) return false;
    this.ws.send(encode('rift_chest_claim'));
    return true;
  }

  attackMonster(monsterId) {
    if (!this.ws || this.ws.readyState !== 1 || !monsterId) return false;
    this.ws.send(encode('attack', { monster_id: String(monsterId) }));
    return true;
  }

  chooseLoot(rollId, choice) {
    if (!this.ws || this.ws.readyState !== 1 || !rollId || !['need', 'greed', 'pass'].includes(choice)) return false;
    this.ws.send(encode('loot_roll_choice', { roll_id: String(rollId), choice }));
    return true;
  }

  send(type, extra = {}) {
    if (!this.ws || this.ws.readyState !== 1 || !type) return Promise.resolve({ok:false,code:'offline',message:'World connection is not ready.'});
    const request_id=`social_${++this.socialRequestSeq}`;
    return new Promise(resolve=>{
      const timer=setTimeout(()=>{this.pendingSocial.delete(request_id);resolve({ok:false,code:'timeout',message:'The world server did not confirm that action.'});},10000);
      this.pendingSocial.set(request_id,{resolve,timer});
      try{this.ws.send(encode(type,{...extra,request_id}));}
      catch{clearTimeout(timer);this.pendingSocial.delete(request_id);resolve({ok:false,code:'offline',message:'World connection was interrupted.'});}
    });
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
      look: pose.look, armor: pose.armor, hp: pose.hp, max_hp: pose.max_hp, zone: pose.zone,
    }));
  }

  sendChat(msg) {
    if (!this.ws || this.ws.readyState !== 1 || !msg) return;
    const text = String(msg.text || '').trim();
    if (!text) return;
    const channel=['world','zone','party'].includes(msg.channel)?msg.channel:'world';
    this.ws.send(encode(TYPES.chat, { channel, text }));
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
    this.maybeClearAuthRejection();
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
    this.lootQueue = [];
    this.closeLootRoll(null, false);
    this.wakeGen += 1;
    this.clearWake();
    this.stopPing();
    clearTimeout(this.timer);
    for(const [id,pending] of this.pendingSocial){clearTimeout(pending.timer);pending.resolve({ok:false,code:'offline',message:'World connection closed before the action was confirmed.'});this.pendingSocial.delete(id);}
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
