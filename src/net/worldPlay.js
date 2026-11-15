/**
 * Title / menu helpers for joining World 1. No sockets — src/net/mmo.js
 * still owns the transport. Tests pass search / env / storage in.
 */

export const WORLD_MODE_KEY = 'mg-world-mode';
export const WORLD_PLAY_READY = 'Play Online — World 1';
export const WORLD_PLAY_SOON = 'World 1 coming soon';
export const WORLD_PLAY_HERE = 'On World 1';

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
];

export function paramsOf(search = '') {
  return new URLSearchParams(String(search || '').replace(/^\?/, ''));
}

export function isWorldOnline(search = '') {
  return paramsOf(search).get('mmo') === '1';
}

export function viteMmoUrl(env) {
  const src = env ?? (typeof import.meta !== 'undefined' ? import.meta.env : undefined);
  const v = src?.VITE_MMO_URL;
  return typeof v === 'string' ? v.trim() : '';
}

export function worldServerConfigured(search = '', env) {
  const server = String(paramsOf(search).get('server') || '').trim();
  if (server) return true;
  return viteMmoUrl(env) !== '';
}

export function rewriteSearch(search = '', { mmo = false, drop = DROP_DEBUG_PARAMS } = {}) {
  const q = paramsOf(search);
  for (const key of drop) q.delete(key);
  if (mmo) q.set('mmo', '1');
  else q.delete('mmo');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function onlineSearch(search = '') {
  return rewriteSearch(search, { mmo: true });
}

export function offlineSearch(search = '') {
  return rewriteSearch(search, { mmo: false });
}

export function hrefWithSearch(search = '', loc = {}) {
  const path = loc.pathname || '/';
  const hash = loc.hash || '';
  return `${path}${search || ''}${hash}`;
}

export function worldPlayButton({ search = '', env, online } = {}) {
  const configured = worldServerConfigured(search, env);
  const on = online ?? isWorldOnline(search);
  if (!configured) {
    return { ready: false, disabled: true, label: WORLD_PLAY_SOON, action: 'none' };
  }
  if (on) {
    return { ready: true, disabled: true, label: WORLD_PLAY_HERE, action: 'none' };
  }
  return { ready: true, disabled: false, label: WORLD_PLAY_READY, action: 'online' };
}

export function paintWorldPlayButton(el, opts = {}) {
  if (!el) return null;
  const state = worldPlayButton(opts);
  el.textContent = state.label;
  el.disabled = state.disabled;
  el.setAttribute('aria-disabled', state.disabled ? 'true' : 'false');
  el.dataset.worldReady = state.ready ? '1' : '0';
  el.title = !state.ready ? 'A world server is not configured for this build.' : '';
  return state;
}

export function paintWorldModePill(el, { search } = {}) {
  if (!el) return;
  const online = isWorldOnline(search ?? currentLoc().search);
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

export function enterOnlineWorld(opts = {}) {
  const loc = currentLoc(opts.loc);
  const search = opts.search ?? loc.search ?? '';
  if (worldPlayButton({ search, env: opts.env }).action !== 'online') return false;
  rememberWorldMode('online', opts.storage);
  loc.assign(hrefWithSearch(onlineSearch(search), loc));
  return true;
}

export function leaveOnlineWorld(opts = {}) {
  const loc = currentLoc(opts.loc);
  const search = opts.search ?? loc.search ?? '';
  rememberWorldMode('offline', opts.storage);
  loc.replace(hrefWithSearch(offlineSearch(search), loc));
  return true;
}

export function onWorldPlayClick(opts = {}) {
  return enterOnlineWorld(opts);
}

function currentLoc(loc) {
  if (loc) return loc;
  if (typeof window !== 'undefined' && window.location) return window.location;
  return { search: '', pathname: '/', hash: '', assign() {}, replace() {} };
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
