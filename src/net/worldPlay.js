/**
 * Title / menu helpers for joining World 1. No sockets — src/net/mmo.js
 * still owns the transport. Tests pass search / env / storage in.
 */

export const WORLD_MODE_KEY = 'mg-world-mode';
export const WORLD_JOIN_KEY = 'mg-world-join';
export const WORLD_AUTH_KEY = 'mg-world-auth';
export const ACCOUNT_SESSION_KEY = 'monster-gate-account-session';

export const WORLD_PLAY_READY = 'Play Online — World 1';
export const WORLD_PLAY_SOON = 'World 1 coming soon';
export const WORLD_PLAY_HERE = 'On World 1';
export const WORLD_PLAY_ONLINE = 'World 1 — Online';
export const WORLD_PLAY_SOLO = 'Solo — Offline';
export const WORLD_PLAY_JOINING = 'Joining World 1…';
export const WORLD_PICKER_TITLE = 'Choose a world';
export const WORLD_GUEST_NOTE = 'Sign in to play online';
export const WORLD_HEALTH_WAKING = 'Waking…';
export const WORLD_HEALTH_CHECKING = 'Checking…';
export const HEALTH_SLOW_MS = 2500;

/** Mock / debug flags dropped when switching online or offline. */
export const DROP_DEBUG_PARAMS = [
  'mock',
  'mockwake',
  'mockerr',
  'mocksocial',
  'mockwallet',
  'debug',
  'unlock',
  'tp',
  'spawn',
  'tank',
  'autoatk',
  'picker',
  'worldpick',
];

export function paramsOf(search = '') {
  return new URLSearchParams(String(search || '').replace(/^\?/, ''));
}

export function isWorldOnline(search = '') {
  return paramsOf(search).get('mmo') === '1';
}

export function viteMmoUrl(env) {
  const src = env ?? (typeof import.meta !== 'undefined' ? import.meta.env : undefined);
  const a = typeof src?.VITE_MMO_URL === 'string' ? src.VITE_MMO_URL.trim() : '';
  const b = typeof src?.VITE_WORLD_URL === 'string' ? src.VITE_WORLD_URL.trim() : '';
  return a || b;
}

export function worldServerConfigured(search = '', env) {
  const server = String(paramsOf(search).get('server') || '').trim();
  if (server) return true;
  return viteMmoUrl(env) !== '';
}

export function worldWsUrl(search = '', env) {
  const server = String(paramsOf(search).get('server') || '').trim();
  if (server) return server;
  return viteMmoUrl(env);
}

export function healthzUrl(wsUrl) {
  const raw = String(wsUrl || '').trim();
  if (!raw) return '';
  try {
    const http = raw.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
    const u = new URL(http);
    u.pathname = '/healthz';
    u.search = '';
    u.hash = '';
    return u.href;
  } catch {
    return '';
  }
}

export function healthFallbackUrl(healthz) {
  if (!healthz) return '';
  try {
    const u = new URL(healthz);
    u.pathname = '/health';
    u.search = '';
    u.hash = '';
    return u.href;
  } catch {
    return '';
  }
}

export function parseWorldHealth({ ok = false, json = {}, elapsedMs = 0, slowMs = HEALTH_SLOW_MS } = {}) {
  const n = Number(json?.players);
  const players = Number.isFinite(n) ? n : null;
  if (!ok || elapsedMs > slowMs) {
    return { live: false, label: WORLD_HEALTH_WAKING, players };
  }
  return { live: true, label: `Online · ${players ?? 0}`, players: players ?? 0 };
}

export async function fetchWorldHealth(url, { fetchFn, timeoutMs = HEALTH_SLOW_MS, now } = {}) {
  const clock = now || Date.now;
  const t0 = clock();
  if (!url) return { live: false, label: WORLD_HEALTH_WAKING, players: null };
  const fetchImpl = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  if (!fetchImpl) return { live: false, label: WORLD_HEALTH_WAKING, players: null };

  const tryOne = async (href) => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
    try {
      const res = await fetchImpl(href, { signal: ctrl?.signal, cache: 'no-store' });
      let json = {};
      try {
        json = typeof res.json === 'function' ? await res.json() : {};
      } catch {
        json = {};
      }
      return { ok: !!res.ok, json, elapsedMs: clock() - t0 };
    } catch {
      return { ok: false, json: {}, elapsedMs: clock() - t0 };
    } finally {
      clearTimeout(timer);
    }
  };

  let result = await tryOne(url);
  if (!result.ok && result.elapsedMs < timeoutMs) {
    const fallback = healthFallbackUrl(url);
    if (fallback && fallback !== url) result = await tryOne(fallback);
  }
  return parseWorldHealth({ ...result, slowMs: timeoutMs });
}

export function rewriteSearch(search = '', { mmo = false, join = false, drop = DROP_DEBUG_PARAMS } = {}) {
  const q = paramsOf(search);
  for (const key of drop) q.delete(key);
  if (!join) q.delete('join');
  if (mmo) q.set('mmo', '1');
  else q.delete('mmo');
  if (join && mmo) q.set('join', '1');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function onlineSearch(search = '', { join = false } = {}) {
  return rewriteSearch(search, { mmo: true, join });
}

export function offlineSearch(search = '') {
  return rewriteSearch(search, { mmo: false, join: false });
}

export function hrefWithSearch(search = '', loc = {}) {
  const path = loc.pathname || '/';
  const hash = loc.hash || '';
  return `${path}${search || ''}${hash}`;
}

function locSearchOf({ search, loc } = {}) {
  if (search != null) return search;
  return loc?.search ?? currentLoc().search ?? '';
}

export function worldPlayButton({ search, env, online, loc } = {}) {
  const locSearch = locSearchOf({ search, loc });
  const configured = worldServerConfigured(locSearch, env);
  const on = online ?? isWorldOnline(locSearch);
  if (!configured) {
    return { ready: false, disabled: true, label: WORLD_PLAY_SOON, action: 'none' };
  }
  if (on) {
    return { ready: true, disabled: false, label: WORLD_PLAY_HERE, action: 'online' };
  }
  return { ready: true, disabled: false, label: WORLD_PLAY_READY, action: 'online' };
}

export function paintWorldPlayButton(el, opts = {}) {
  if (!el) return null;
  const state = worldPlayButton(opts);
  const locSearch = locSearchOf(opts);
  const shortOnline = opts.short && state.action === 'online' && !isWorldOnline(locSearch);
  if (opts.syncLabel !== false) el.textContent = shortOnline ? 'World 1' : state.label;
  el.disabled = state.disabled;
  el.setAttribute('aria-disabled', state.disabled ? 'true' : 'false');
  el.dataset.worldReady = state.ready ? '1' : '0';
  el.title = !state.ready ? 'A world server is not configured for this build.' : '';
  return state;
}

export function paintWorldModePill(el, { search, loc } = {}) {
  if (!el) return;
  const online = isWorldOnline(search ?? loc?.search ?? currentLoc().search);
  el.hidden = false;
  el.dataset.mode = online ? 'online' : 'offline';
  el.textContent = online ? 'Online' : 'Offline';
}

export function lastWorldMode(storage) {
  const raw = storageOf(storage)?.getItem?.(WORLD_MODE_KEY);
  return raw === 'online' || raw === 'offline' ? raw : null;
}

export function rememberWorldMode(mode, storage) {
  const store = storageOf(storage);
  if (!store || (mode !== 'online' && mode !== 'offline')) return;
  try {
    store.setItem(WORLD_MODE_KEY, mode);
  } catch {
    /* quota / private mode */
  }
}

export function shouldAutoOnline({ search = '', env, storage } = {}) {
  if (isWorldOnline(search)) return false;
  if (!worldServerConfigured(search, env)) return false;
  return lastWorldMode(storage) === 'online';
}

export function maybeResumeOnline(opts = {}) {
  const loc = currentLoc(opts.loc);
  const search = opts.search ?? loc.search ?? '';
  if (!shouldAutoOnline({ search, env: opts.env, storage: opts.storage })) return false;
  const href = hrefWithSearch(onlineSearch(search), loc);
  const here = `${loc.pathname || '/'}${loc.search || ''}${loc.hash || ''}`;
  if (href === here) return false;
  loc.replace(href);
  return true;
}

export function markWorldJoin(mode = 'online', storage) {
  const store = sessionOf(storage);
  if (!store) return;
  try {
    store.setItem(WORLD_JOIN_KEY, mode === 'offline' ? 'offline' : 'online');
  } catch {
    /* quota / private mode */
  }
}

export function consumeWorldJoin({ search, storage, loc } = {}) {
  const locn = currentLoc(loc);
  const qSearch = search ?? locn.search ?? '';
  const fromQuery = paramsOf(qSearch).get('join') === '1';
  const store = sessionOf(storage);
  let fromStore = '';
  try {
    fromStore = store?.getItem?.(WORLD_JOIN_KEY) || '';
    if (fromStore) store.removeItem(WORLD_JOIN_KEY);
  } catch {
    fromStore = '';
  }
  if (fromQuery) stripJoinParam(locn, qSearch);
  if (fromStore === 'offline') return 'offline';
  if (fromStore === 'online' || fromStore === '1' || fromQuery) return 'online';
  return null;
}

export function worldJoinContinue({ signedIn = false, join = null, hasCharacter = false } = {}) {
  if (!join) return 'none';
  if (join === 'offline') return signedIn ? (hasCharacter ? 'enter' : 'select') : 'none';
  if (!signedIn) return 'signin';
  return hasCharacter ? 'enter' : 'select';
}

export function markWorldAuth(storage) {
  const store = sessionOf(storage);
  if (!store) return;
  try {
    store.setItem(WORLD_AUTH_KEY, '1');
  } catch {
    /* quota / private mode */
  }
}

export function consumeWorldAuth(storage) {
  const store = sessionOf(storage);
  if (!store) return false;
  try {
    const on = store.getItem(WORLD_AUTH_KEY) === '1';
    if (on) store.removeItem(WORLD_AUTH_KEY);
    return on;
  } catch {
    return false;
  }
}

export function readWorldAccessToken(stores) {
  for (const store of sessionStores(stores)) {
    if (!store?.getItem) continue;
    try {
      const raw = JSON.parse(store.getItem(ACCOUNT_SESSION_KEY) || 'null');
      if (raw && typeof raw.accessToken === 'string' && raw.accessToken.trim()) {
        return raw.accessToken.trim();
      }
    } catch {
      /* try the next store */
    }
  }
  return '';
}

export function hasWorldSessionToken(stores) {
  return readWorldAccessToken(stores) !== '';
}

export function shouldMountOnline({ search = '', stores, token } = {}) {
  if (!isWorldOnline(search)) return false;
  if (paramsOf(search).get('mock') === '1') return false;
  const has = token == null ? hasWorldSessionToken(stores) : !!token && token !== '';
  return has;
}

export function shouldDropOnlineWithoutSession({ search = '', stores, token } = {}) {
  if (!isWorldOnline(search)) return false;
  const mock = paramsOf(search).get('mock') === '1';
  const wake = paramsOf(search).get('mockwake');
  if (mock || (wake && wake !== '0' && wake !== 'false')) return false;
  const has = token == null ? hasWorldSessionToken(stores) : !!token && token !== '';
  return !has;
}

export function dropOnlineWithoutSession(opts = {}) {
  const loc = currentLoc(opts.loc);
  const search = opts.search ?? loc.search ?? '';
  if (!isWorldOnline(search)) return false;
  rememberWorldMode('offline', opts.storage);
  markWorldAuth(opts.session || opts.storage);
  const href = hrefWithSearch(offlineSearch(search), loc);
  if (typeof loc.replaceState === 'function') loc.replaceState({}, '', href);
  else if (typeof history !== 'undefined' && history.replaceState) {
    try {
      history.replaceState({}, '', href);
    } catch {
      loc.replace?.(href);
    }
  } else loc.replace?.(href);
  return true;
}

export function enterOnlineWorld(opts = {}) {
  const loc = currentLoc(opts.loc);
  const search = opts.search ?? loc.search ?? '';
  if (!worldServerConfigured(search, opts.env)) return false;
  rememberWorldMode('online', opts.storage);
  markWorldJoin('online', opts.session || opts.storage);
  const href = hrefWithSearch(onlineSearch(search, { join: true }), loc);
  const here = `${loc.pathname || '/'}${loc.search || ''}${loc.hash || ''}`;
  if (href === here) {
    if (typeof loc.reload === 'function') loc.reload();
    else loc.assign(href);
    return true;
  }
  loc.assign(href);
  return true;
}

/** True when this client was disposed; retry()/connect() will no-op. Missing is not closed. */
export function mmoClientClosed(mmo) {
  return !!(mmo && mmo.closed === true);
}

/**
 * Signed-in hunter whose live client was rejected must not reuse it.
 * A missing client on boot is not a reject — attachMmo still runs.
 * Picker / Switch world always navigate; this flag is for in-page remount after sign-in.
 */
export function shouldFreshMmoClient({
  search = '',
  signedIn = false,
  authReject = false,
  mmo = null,
} = {}) {
  if (!signedIn) return false;
  if (authReject) return true;
  if (isWorldOnline(search) && mmoClientClosed(mmo)) return true;
  return false;
}

export function disposeMmoClient(mmo, game) {
  if (!mmo) {
    if (game) game.mmo = null;
    return null;
  }
  const stop = mmo.dispose || mmo.close || mmo.disconnect || mmo.stop;
  if (typeof stop === 'function') {
    try { stop.call(mmo); } catch { /* already down */ }
  }
  if (game && game.mmo === mmo) game.mmo = null;
  if (typeof window !== 'undefined' && window.__mmo === mmo) window.__mmo = null;
  return null;
}

/**
 * Tear down the current mmo client and mount a new one via `attach`.
 * Does not import src/net/mmo.js — callers pass attachMmo.
 */
export function remountMmoClient({ game, view, mmo, attach, search } = {}) {
  const current = mmo || game?.mmo || (typeof window !== 'undefined' ? window.__mmo : null);
  disposeMmoClient(current, game);
  view?.clearAuthLatch?.();
  if (typeof attach !== 'function') return null;
  const next = attach(game, view, search != null ? { search } : {});
  return next || game?.mmo || null;
}

export function leaveOnlineWorld(opts = {}) {
  const loc = currentLoc(opts.loc);
  const search = opts.search ?? loc.search ?? '';
  rememberWorldMode('offline', opts.storage);
  if (opts.continue !== false) markWorldJoin('offline', opts.session || opts.storage);
  if (!isWorldOnline(search)) return false;
  loc.replace(hrefWithSearch(offlineSearch(search), loc));
  return true;
}

export function onWorldPlayClick(opts = {}) {
  if (!hasWorldSessionToken(opts.stores) && !opts.force) {
    opts.onNeedSignIn?.();
    return false;
  }
  return enterOnlineWorld(opts);
}

export function shouldForceWorldPick({ search, win } = {}) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (w?.__mgForceWorldPick) return true;
  const raw = search ?? (typeof w?.location?.search === 'string' ? w.location.search : '');
  const q = paramsOf(raw);
  return q.get('picker') === '1' || q.get('worldpick') === '1';
}

export function worldPickerState({
  search = '',
  env,
  last = null,
  health = null,
  joining = false,
  signedIn = false,
  force = false,
} = {}) {
  const configured = worldServerConfigured(search, env);
  const selected = last === 'online' || last === 'offline' ? last : 'online';
  const status = !configured ? '' : (health?.label || WORLD_HEALTH_CHECKING);
  const onlineDisabled = !configured || joining;
  return {
    show: force || signedIn,
    title: WORLD_PICKER_TITLE,
    selected,
    online: {
      label: !configured ? WORLD_PLAY_SOON : joining ? WORLD_PLAY_JOINING : WORLD_PLAY_ONLINE,
      status,
      disabled: onlineDisabled,
      selected: selected === 'online',
      action: configured && !joining ? 'online' : 'none',
    },
    solo: {
      label: WORLD_PLAY_SOLO,
      disabled: joining,
      selected: selected === 'offline',
      action: joining ? 'none' : 'offline',
    },
  };
}

/**
 * What Enter does on the character camp once a hunter and a world are chosen.
 * `play` stays on this page. The other results navigate or ask for a sign-in.
 */
export function campEnterPlan({ world = 'offline', signedIn = false, onlineNow = false, configured = false } = {}) {
  if (world === 'online') {
    if (!configured) return 'soon';
    if (!signedIn) return 'signin';
    if (!onlineNow) return 'join-online';
    return 'play';
  }
  if (onlineNow) return 'leave-online';
  return 'play';
}

/** World 1 / Solo on the character camp. The title picker stays hidden. */
export function paintCampWorld(root, state, { guest = false } = {}) {
  if (!root || !state) return state;
  const onlineBtn = root.querySelector('#cs-world1');
  const soloBtn = root.querySelector('#cs-solo');
  const status = root.querySelector('#cs-world1-status');
  const open = state.online.action === 'online';
  if (onlineBtn) {
    onlineBtn.disabled = !open;
    onlineBtn.classList.toggle('sel', !!(state.online.selected && open));
    onlineBtn.setAttribute('aria-pressed', state.online.selected && open ? 'true' : 'false');
  }
  if (status) {
    if (!open) status.textContent = 'Not open yet';
    else if (guest) status.textContent = 'Sign in to play online';
    else status.textContent = state.online.status || 'Online';
  }
  if (soloBtn) {
    soloBtn.disabled = false;
    soloBtn.classList.toggle('sel', !!state.solo.selected);
    soloBtn.setAttribute('aria-pressed', state.solo.selected ? 'true' : 'false');
  }
  return state;
}

export function paintWorldPicker(root, state) {
  if (!root || !state) return state;
  root.hidden = !state.show;
  root.classList.toggle('hidden', !state.show);
  const title = root.querySelector('.world-picker-title');
  if (title) title.textContent = state.title;
  const onlineBtn = root.querySelector('#pick-world1');
  const status = root.querySelector('#pick-world1-status');
  const soloBtn = root.querySelector('#pick-solo');
  if (onlineBtn) {
    const label = onlineBtn.querySelector('b');
    if (label) label.textContent = state.online.label;
    else onlineBtn.textContent = state.online.label;
    onlineBtn.disabled = state.online.disabled;
    onlineBtn.classList.toggle('sel', state.online.selected);
    onlineBtn.setAttribute('aria-pressed', state.online.selected ? 'true' : 'false');
  }
  if (status) status.textContent = state.online.status;
  if (soloBtn) {
    const label = soloBtn.querySelector('b');
    if (label) label.textContent = state.solo.label;
    else soloBtn.textContent = state.solo.label;
    soloBtn.disabled = state.solo.disabled;
    soloBtn.classList.toggle('sel', state.solo.selected);
    soloBtn.setAttribute('aria-pressed', state.solo.selected ? 'true' : 'false');
  }
  return state;
}

function stripJoinParam(loc, search) {
  const next = rewriteSearch(search, { mmo: isWorldOnline(search), join: false });
  const href = hrefWithSearch(next, loc);
  if (typeof loc.replaceState === 'function') {
    loc.replaceState({}, '', href);
    return;
  }
  if (typeof history !== 'undefined' && history.replaceState) {
    try {
      history.replaceState({}, '', href);
    } catch {
      /* ignore */
    }
  }
}

function currentLoc(loc) {
  if (loc) return loc;
  if (typeof window !== 'undefined' && window.location) return window.location;
  return { search: '', pathname: '/', hash: '', assign() {}, replace() {}, replaceState() {}, reload() {} };
}

function storageOf(storage) {
  if (storage) return storage;
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    return null;
  }
  return null;
}

function sessionOf(storage) {
  if (storage) return storage;
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch {
    return null;
  }
  return storageOf();
}

function sessionStores(stores) {
  if (Array.isArray(stores)) return stores;
  if (stores && typeof stores.getItem === 'function') return [stores];
  const out = [];
  try {
    if (typeof sessionStorage !== 'undefined') out.push(sessionStorage);
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') out.push(localStorage);
  } catch {
    /* ignore */
  }
  return out;
}
