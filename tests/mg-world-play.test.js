import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  DROP_DEBUG_PARAMS,
  WORLD_MODE_KEY,
  WORLD_PLAY_HERE,
  WORLD_PLAY_READY,
  WORLD_PLAY_SOON,
  enterOnlineWorld,
  hrefWithSearch,
  isWorldOnline,
  lastWorldMode,
  leaveOnlineWorld,
  maybeResumeOnline,
  offlineSearch,
  onlineSearch,
  paintWorldModePill,
  paintWorldPlayButton,
  rememberWorldMode,
  shouldAutoOnline,
  viteMmoUrl,
  worldPlayButton,
  worldServerConfigured,
} from '../src/net/worldPlay.js';
import { resolveMmoUrl } from '../vite.config.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function memoryStore(seed = {}) {
  const map = { ...seed };
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
    data: map,
  };
}

function fakeLoc({ search = '', pathname = '/', hash = '' } = {}) {
  return {
    search,
    pathname,
    hash,
    assigned: '',
    replaced: '',
    assign(href) { this.assigned = href; },
    replace(href) { this.replaced = href; },
  };
}

test('World 1 button is disabled when no server URL is configured', () => {
  const empty = worldPlayButton({ search: '', env: { VITE_MMO_URL: '' } });
  assert.equal(empty.ready, false);
  assert.equal(empty.disabled, true);
  assert.equal(empty.label, WORLD_PLAY_SOON);
  assert.equal(empty.action, 'none');
  assert.equal(worldServerConfigured('', { VITE_MMO_URL: '' }), false);
  assert.equal(worldServerConfigured('', { VITE_MMO_URL: '   ' }), false);
  assert.equal(viteMmoUrl({}), '');
});

test('World 1 button is ready when VITE_MMO_URL or ?server= is set', () => {
  const fromEnv = worldPlayButton({ search: '', env: { VITE_MMO_URL: 'wss://world.example/ws' } });
  assert.equal(fromEnv.ready, true);
  assert.equal(fromEnv.disabled, false);
  assert.equal(fromEnv.label, WORLD_PLAY_READY);
  assert.equal(fromEnv.action, 'online');

  const fromQuery = worldPlayButton({ search: '?server=ws://localhost:8080', env: { VITE_MMO_URL: '' } });
  assert.equal(fromQuery.ready, true);
  assert.equal(fromQuery.disabled, false);
  assert.equal(worldServerConfigured('?server=wss://gate.example', { VITE_MMO_URL: '' }), true);
  assert.equal(worldServerConfigured('?server=', { VITE_MMO_URL: '' }), false);
});

test('World 1 button stays put when already on ?mmo=1', () => {
  const here = worldPlayButton({
    search: '?mmo=1',
    env: { VITE_MMO_URL: 'wss://world.example/ws' },
  });
  assert.equal(here.ready, true);
  assert.equal(here.disabled, true);
  assert.equal(here.label, WORLD_PLAY_HERE);
  assert.equal(here.action, 'none');
});

test('onlineSearch sets mmo=1, keeps other params, drops mock/debug flags', () => {
  assert.equal(isWorldOnline(''), false);
  assert.equal(isWorldOnline('?mmo=1'), true);
  assert.equal(isWorldOnline('?mmo=true'), false);

  const q = new URLSearchParams(onlineSearch('').slice(1));
  assert.equal(q.get('mmo'), '1');
  assert.equal([...q.keys()].length, 1);

  const kept = new URLSearchParams(onlineSearch('?ref=oak&from=title').slice(1));
  assert.equal(kept.get('mmo'), '1');
  assert.equal(kept.get('ref'), 'oak');
  assert.equal(kept.get('from'), 'title');

  const dirty = '?mmo=1&server=wss://x&debug=1&unlock=1&tp=oak&spawn=1&mock=1&mockwake=1&mockerr=name_taken&mocksocial=1&mockwallet=1&autoatk=1&tank=1';
  const cleaned = new URLSearchParams(onlineSearch(dirty).slice(1));
  assert.equal(cleaned.get('mmo'), '1');
  assert.equal(cleaned.get('server'), 'wss://x');
  for (const key of DROP_DEBUG_PARAMS) assert.equal(cleaned.get(key), null);

  const off = new URLSearchParams((offlineSearch('?mmo=1&server=wss://x&debug=1') || '').replace(/^\?/, ''));
  assert.equal(off.get('mmo'), null);
  assert.equal(off.get('server'), 'wss://x');
  assert.equal(off.get('debug'), null);
  assert.equal(offlineSearch('?mmo=1&debug=1'), '');
  assert.equal(hrefWithSearch('?mmo=1', { pathname: '/play', hash: '#hud' }), '/play?mmo=1#hud');
});

test('last world mode stays offline for first visits and auto-joins only when configured', () => {
  const store = memoryStore();
  assert.equal(lastWorldMode(store), null);
  assert.equal(shouldAutoOnline({ search: '', env: { VITE_MMO_URL: 'wss://x' }, storage: store }), false);

  rememberWorldMode('online', store);
  assert.equal(store.data[WORLD_MODE_KEY], 'online');
  assert.equal(shouldAutoOnline({ search: '', env: { VITE_MMO_URL: 'wss://x' }, storage: store }), true);
  assert.equal(shouldAutoOnline({ search: '?mmo=1', env: { VITE_MMO_URL: 'wss://x' }, storage: store }), false);
  assert.equal(shouldAutoOnline({ search: '', env: { VITE_MMO_URL: '' }, storage: store }), false);

  rememberWorldMode('offline', store);
  assert.equal(shouldAutoOnline({ search: '', env: { VITE_MMO_URL: 'wss://x' }, storage: store }), false);
});

test('enter / leave / resume rewrite the URL without touching saves', () => {
  const env = { VITE_MMO_URL: 'wss://world.example/ws' };
  const store = memoryStore();
  const loc = fakeLoc({ search: '?debug=1&ref=oak', pathname: '/', hash: '#t' });
  assert.equal(enterOnlineWorld({ search: loc.search, env, storage: store, loc }), true);
  assert.equal(store.data[WORLD_MODE_KEY], 'online');
  assert.match(loc.assigned, /ref=oak/);
  assert.match(loc.assigned, /mmo=1/);
  assert.match(loc.assigned, /#t$/);
  assert.equal(new URLSearchParams(loc.assigned.replace(/.*\?/, '').replace(/#.*$/, '')).get('debug'), null);

  const blocked = fakeLoc({ search: '' });
  assert.equal(enterOnlineWorld({ search: '', env: { VITE_MMO_URL: '' }, storage: store, loc: blocked }), false);
  assert.equal(blocked.assigned, '');

  const leave = fakeLoc({ search: '?mmo=1&server=wss://x&mock=1', pathname: '/' });
  assert.equal(leaveOnlineWorld({ search: leave.search, storage: store, loc: leave }), true);
  assert.equal(store.data[WORLD_MODE_KEY], 'offline');
  const left = new URLSearchParams(leave.replaced.replace(/.*\?/, ''));
  assert.equal(left.get('server'), 'wss://x');
  assert.equal(left.get('mmo'), null);
  assert.equal(left.get('mock'), null);

  const resumeLoc = fakeLoc({ search: '?from=title', pathname: '/' });
  rememberWorldMode('online', store);
  assert.equal(maybeResumeOnline({ search: resumeLoc.search, env, storage: store, loc: resumeLoc }), true);
  assert.match(resumeLoc.replaced, /mmo=1/);
  assert.match(resumeLoc.replaced, /from=title/);
});

test('paintWorldPlayButton and the Online/Offline pill follow the same state', () => {
  const btn = { textContent: '', disabled: false, title: '', dataset: {}, setAttribute() {} };
  const soon = paintWorldPlayButton(btn, { search: '', env: { VITE_MMO_URL: '' } });
  assert.equal(soon.label, WORLD_PLAY_SOON);
  assert.equal(btn.disabled, true);
  assert.equal(btn.textContent, WORLD_PLAY_SOON);

  const pill = { hidden: true, dataset: {}, textContent: '' };
  paintWorldModePill(pill, { search: '' });
  assert.equal(pill.hidden, false);
  assert.equal(pill.dataset.mode, 'offline');
  assert.equal(pill.textContent, 'Offline');
  paintWorldModePill(pill, { search: '?mmo=1' });
  assert.equal(pill.dataset.mode, 'online');
  assert.equal(pill.textContent, 'Online');
});

test('title, menu, HUD pill, Vite MG_WORLD_URL, and Play offline stay wired', () => {
  const html = src('../index.html');
  const main = src('../src/main.js');
  const hud = src('../src/ui/hud.js');
  const view = src('../src/net/worldView.js');
  const vite = src('../vite.config.js');
  const readme = src('../README.md');
  assert.match(html, /id="btn-guest"[^>]*>Play as guest/);
  assert.match(html, /id="btn-world1"[^>]*>Play Online — World 1/);
  assert.match(html, /id="world-mode-pill"[^>]*data-mode="offline"[^>]*>Offline/);
  assert.match(main, /maybeResumeOnline/);
  assert.match(main, /paintWorldPlayButton/);
  assert.match(main, /enterOnlineWorld|onWorldPlayClick/);
  assert.match(hud, /set-world1/);
  assert.match(hud, /Play offline/);
  assert.match(view, /leaveOnlineWorld/);
  assert.match(vite, /MG_WORLD_URL/);
  assert.match(vite, /resolveMmoUrl/);
  assert.match(readme, /MG_WORLD_URL/);
  assert.match(readme, /Play Online — World 1/);
});

test('resolveMmoUrl prefers MG_WORLD_URL and stays empty for Pages', () => {
  assert.equal(resolveMmoUrl({}), '');
  assert.equal(resolveMmoUrl({ VITE_MMO_URL: '' }), '');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: '  ', VITE_MMO_URL: '' }), '');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: 'wss://world.example/ws' }), 'wss://world.example/ws');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: 'wss://from-mg', VITE_MMO_URL: 'wss://from-vite' }), 'wss://from-mg');
  assert.equal(resolveMmoUrl({ VITE_MMO_URL: 'wss://from-vite' }), 'wss://from-vite');
});
