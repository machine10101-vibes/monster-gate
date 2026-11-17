import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ACCOUNT_SESSION_KEY,
  DROP_DEBUG_PARAMS,
  HEALTH_SLOW_MS,
  WORLD_GUEST_NOTE,
  WORLD_HEALTH_WAKING,
  WORLD_JOIN_KEY,
  WORLD_MODE_KEY,
  WORLD_PICKER_TITLE,
  WORLD_PLAY_HERE,
  WORLD_PLAY_JOINING,
  WORLD_PLAY_ONLINE,
  WORLD_PLAY_READY,
  WORLD_PLAY_SOLO,
  WORLD_PLAY_SOON,
  consumeWorldJoin,
  dropOnlineWithoutSession,
  enterOnlineWorld,
  fetchWorldHealth,
  hasWorldSessionToken,
  healthzUrl,
  hrefWithSearch,
  isWorldOnline,
  lastWorldMode,
  leaveOnlineWorld,
  markWorldJoin,
  maybeResumeOnline,
  mmoClientClosed,
  offlineSearch,
  onlineSearch,
  campEnterPlan,
  paintCampWorld,
  paintWorldModePill,
  paintWorldPicker,
  paintWorldPlayButton,
  parseWorldHealth,
  rememberWorldMode,
  remountMmoClient,
  shouldAutoOnline,
  shouldDropOnlineWithoutSession,
  shouldForceWorldPick,
  shouldFreshMmoClient,
  shouldMountOnline,
  viteMmoUrl,
  worldJoinContinue,
  worldPickerState,
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
    removeItem: (k) => { delete map[k]; },
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
    history: '',
    assign(href) { this.assigned = href; },
    replace(href) { this.replaced = href; },
    reload() { this.reloaded = true; },
    replaceState(_s, _t, href) {
      this.history = href;
      const q = String(href).includes('?') ? `?${String(href).split('?')[1].split('#')[0]}` : '';
      this.search = q === '?' ? '' : q;
    },
  };
}

function sessionJson(token = 'tok') {
  return JSON.stringify({ kind: 'email', accessToken: token });
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

test('World 1 button reads location.search so On World 1 is correct (MG-MMO-2)', () => {
  const env = { VITE_MMO_URL: 'wss://world.example/ws' };
  const here = worldPlayButton({ loc: { search: '?mmo=1' }, env });
  assert.equal(here.ready, true);
  assert.equal(here.disabled, false);
  assert.equal(here.label, WORLD_PLAY_HERE);
  assert.equal(here.action, 'online');

  const btn = { textContent: '', disabled: false, title: '', dataset: {}, setAttribute() {} };
  paintWorldPlayButton(btn, { loc: { search: '?mmo=1' }, env, short: true });
  assert.equal(btn.textContent, WORLD_PLAY_HERE);
  assert.equal(btn.disabled, false);

  const off = paintWorldPlayButton(
    { textContent: '', disabled: false, title: '', dataset: {}, setAttribute() {} },
    { loc: { search: '' }, env, short: true },
  );
  assert.equal(off.label, WORLD_PLAY_READY);
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

  const joined = new URLSearchParams(onlineSearch('?ref=oak', { join: true }).slice(1));
  assert.equal(joined.get('mmo'), '1');
  assert.equal(joined.get('join'), '1');
  assert.equal(joined.get('ref'), 'oak');

  const off = new URLSearchParams((offlineSearch('?mmo=1&server=wss://x&debug=1&join=1') || '').replace(/^\?/, ''));
  assert.equal(off.get('mmo'), null);
  assert.equal(off.get('server'), 'wss://x');
  assert.equal(off.get('debug'), null);
  assert.equal(off.get('join'), null);
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

test('enter / leave rewrite the URL without touching saves', () => {
  const env = { VITE_MMO_URL: 'wss://world.example/ws' };
  const store = memoryStore();
  const loc = fakeLoc({ search: '?debug=1&ref=oak', pathname: '/', hash: '#t' });
  assert.equal(enterOnlineWorld({ search: loc.search, env, storage: store, session: store, loc }), true);
  assert.equal(store.data[WORLD_MODE_KEY], 'online');
  assert.equal(store.data[WORLD_JOIN_KEY], 'online');
  assert.match(loc.assigned, /ref=oak/);
  assert.match(loc.assigned, /mmo=1/);
  assert.match(loc.assigned, /join=1/);
  assert.match(loc.assigned, /#t$/);
  assert.equal(new URLSearchParams(loc.assigned.replace(/.*\?/, '').replace(/#.*$/, '')).get('debug'), null);

  const blocked = fakeLoc({ search: '' });
  assert.equal(enterOnlineWorld({ search: '', env: { VITE_MMO_URL: '' }, storage: store, loc: blocked }), false);
  assert.equal(blocked.assigned, '');

  const already = fakeLoc({ search: '?mmo=1', pathname: '/' });
  assert.equal(enterOnlineWorld({ search: already.search, env, storage: store, session: store, loc: already }), true);
  assert.match(already.assigned, /mmo=1/);
  assert.match(already.assigned, /join=1/);
  const same = fakeLoc({ search: '?mmo=1&join=1', pathname: '/' });
  assert.equal(enterOnlineWorld({ search: same.search, env, storage: store, session: store, loc: same }), true);
  assert.equal(same.reloaded, true);

  const leave = fakeLoc({ search: '?mmo=1&server=wss://x&mock=1', pathname: '/' });
  assert.equal(leaveOnlineWorld({ search: leave.search, storage: store, session: store, loc: leave }), true);
  assert.equal(store.data[WORLD_MODE_KEY], 'offline');
  assert.equal(store.data[WORLD_JOIN_KEY], 'offline');
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

test('signed-in vs guest: picker only after sign-in; guests never mount the socket', () => {
  const empty = memoryStore();
  const signed = memoryStore({ [ACCOUNT_SESSION_KEY]: sessionJson() });
  assert.equal(hasWorldSessionToken(empty), false);
  assert.equal(hasWorldSessionToken(signed), true);

  assert.equal(shouldMountOnline({ search: '?mmo=1', stores: empty }), false);
  assert.equal(shouldMountOnline({ search: '?mmo=1', stores: signed }), true);
  assert.equal(shouldMountOnline({ search: '', stores: signed }), false);
  assert.equal(shouldMountOnline({ search: '?mmo=1&mock=1', stores: signed }), false);
  assert.equal(shouldMountOnline({ search: '?mmo=1', token: '' }), false);
  assert.equal(shouldMountOnline({ search: '?mmo=1', token: 'tok' }), true);

  assert.equal(shouldDropOnlineWithoutSession({ search: '?mmo=1', stores: empty }), true);
  assert.equal(shouldDropOnlineWithoutSession({ search: '?mmo=1', stores: signed }), false);
  assert.equal(shouldDropOnlineWithoutSession({ search: '?mmo=1&mock=1', stores: empty }), false);
  assert.equal(shouldDropOnlineWithoutSession({ search: '', stores: empty }), false);

  const loc = fakeLoc({ search: '?mmo=1&ref=oak', pathname: '/' });
  assert.equal(dropOnlineWithoutSession({ search: loc.search, storage: empty, session: empty, loc }), true);
  assert.match(loc.history, /ref=oak/);
  assert.equal(new URLSearchParams(loc.search.replace(/^\?/, '')).get('mmo'), null);

  const guestPicker = worldPickerState({ search: '', env: { VITE_MMO_URL: 'wss://x' }, signedIn: false });
  assert.equal(guestPicker.show, false);
  const signedPicker = worldPickerState({
    search: '',
    env: { VITE_MMO_URL: 'wss://x' },
    signedIn: true,
    last: 'offline',
  });
  assert.equal(signedPicker.show, true);
  assert.equal(signedPicker.solo.selected, true);
  assert.equal(signedPicker.online.selected, false);
  const forced = worldPickerState({ search: '', env: { VITE_MMO_URL: 'wss://x' }, force: true });
  assert.equal(forced.show, true);
});

test('auto-continue after reload: join marker + signed-in enters, guests get sign-in', () => {
  const store = memoryStore();
  markWorldJoin('online', store);
  const loc = fakeLoc({ search: '?mmo=1&join=1', pathname: '/' });
  assert.equal(consumeWorldJoin({ search: loc.search, storage: store, loc }), 'online');
  assert.equal(store.data[WORLD_JOIN_KEY], undefined);
  assert.equal(new URLSearchParams(loc.search.replace(/^\?/, '')).get('join'), null);

  assert.equal(worldJoinContinue({ signedIn: true, join: 'online', hasCharacter: true }), 'enter');
  assert.equal(worldJoinContinue({ signedIn: true, join: 'online', hasCharacter: false }), 'select');
  assert.equal(worldJoinContinue({ signedIn: false, join: 'online', hasCharacter: false }), 'signin');
  assert.equal(worldJoinContinue({ signedIn: true, join: 'offline', hasCharacter: true }), 'enter');
  assert.equal(worldJoinContinue({ signedIn: false, join: 'offline' }), 'none');
  assert.equal(worldJoinContinue({ signedIn: true, join: null, hasCharacter: true }), 'none');
});

test('picker states: coming soon, health, joining, last pick, test hook', () => {
  const soon = worldPickerState({ search: '', env: { VITE_MMO_URL: '' }, signedIn: true });
  assert.equal(soon.online.label, WORLD_PLAY_SOON);
  assert.equal(soon.online.disabled, true);
  assert.equal(soon.online.action, 'none');
  assert.equal(soon.title, WORLD_PICKER_TITLE);

  const live = worldPickerState({
    search: '',
    env: { VITE_MMO_URL: 'wss://world.example/ws' },
    signedIn: true,
    last: 'online',
    health: { label: 'Online · 3', live: true, players: 3 },
  });
  assert.equal(live.online.label, WORLD_PLAY_ONLINE);
  assert.equal(live.online.status, 'Online · 3');
  assert.equal(live.online.selected, true);
  assert.equal(live.solo.label, WORLD_PLAY_SOLO);
  assert.equal(live.online.disabled, false);

  const joining = worldPickerState({
    search: '?mmo=1',
    env: { VITE_MMO_URL: 'wss://x' },
    signedIn: true,
    joining: true,
  });
  assert.equal(joining.online.label, WORLD_PLAY_JOINING);
  assert.equal(joining.online.disabled, true);
  assert.equal(joining.solo.disabled, true);

  const root = {
    hidden: true,
    classList: { toggle() {} },
    nodes: {
      '.world-picker-title': { textContent: '' },
      '#pick-world1': { disabled: false, classList: { toggle() {} }, setAttribute() {}, querySelector: () => ({ textContent: '' }) },
      '#pick-world1-status': { textContent: '' },
      '#pick-solo': { disabled: false, classList: { toggle() {} }, setAttribute() {}, querySelector: () => ({ textContent: '' }) },
    },
    querySelector(sel) { return this.nodes[sel]; },
  };
  paintWorldPicker(root, live);
  assert.equal(root.hidden, false);
  assert.equal(root.nodes['#pick-world1-status'].textContent, 'Online · 3');

  assert.equal(shouldForceWorldPick({ search: '?picker=1' }), true);
  assert.equal(shouldForceWorldPick({ search: '?worldpick=1' }), true);
  assert.equal(shouldForceWorldPick({ search: '' }), false);
  assert.equal(shouldForceWorldPick({ search: '', win: { __mgForceWorldPick: true } }), true);
});

test('character camp chooses the hunter and the world together', () => {
  assert.equal(campEnterPlan({ world: 'online', signedIn: true, onlineNow: false, configured: true }), 'join-online');
  assert.equal(campEnterPlan({ world: 'online', signedIn: true, onlineNow: true, configured: true }), 'play');
  assert.equal(campEnterPlan({ world: 'online', signedIn: false, onlineNow: false, configured: true }), 'signin');
  assert.equal(campEnterPlan({ world: 'online', signedIn: true, configured: false }), 'soon');
  assert.equal(campEnterPlan({ world: 'offline', signedIn: true, onlineNow: true, configured: true }), 'leave-online');
  assert.equal(campEnterPlan({ world: 'offline', signedIn: false, onlineNow: false }), 'play');

  const root = {
    nodes: {
      '#cs-world1': { disabled: false, classList: { toggle() {} }, setAttribute() {} },
      '#cs-world1-status': { textContent: '' },
      '#cs-solo': { disabled: true, classList: { toggle() {} }, setAttribute() {} },
    },
    querySelector(sel) { return this.nodes[sel]; },
  };
  paintCampWorld(root, worldPickerState({
    search: '',
    env: { VITE_MMO_URL: 'wss://x' },
    signedIn: true,
    last: 'online',
    health: { label: 'Online · 2', live: true, players: 2 },
    force: true,
  }), { guest: true });
  assert.equal(root.nodes['#cs-world1'].disabled, false);
  assert.equal(root.nodes['#cs-world1-status'].textContent, 'Sign in to play online');

  const html = src('../index.html');
  const camp = html.slice(html.indexOf('id="charselect"'), html.indexOf('id="cs-confirm"'));
  assert.match(camp, /id="cs-world"/);
  assert.match(camp, /id="cs-world1"/);
  assert.match(camp, /id="cs-solo"/);
  const main = src('../src/main.js');
  const after = main.slice(main.indexOf('continueAfterAccount() {'), main.indexOf('continueSignedInHunt() {'));
  assert.doesNotMatch(after, /showWorldPicker/);
  assert.match(after, /openCharacterSelect/);
  assert.match(main, /enterFromCamp/);
  const show = main.slice(main.indexOf('showWorldPicker() {'), main.indexOf('hideWorldPicker() {'));
  assert.match(show, /openCharacterSelect/);
  assert.doesNotMatch(show, /getElementById\('world-picker'\)/);
});

test('healthz URL and parse: Online + count, or Waking when slow; fetch never throws', async () => {
  assert.equal(healthzUrl('wss://monster-gate-world-1.onrender.com'), 'https://monster-gate-world-1.onrender.com/healthz');
  assert.equal(healthzUrl('ws://localhost:8080'), 'http://localhost:8080/healthz');
  assert.equal(healthzUrl(''), '');

  assert.deepEqual(parseWorldHealth({ ok: true, json: { ok: true, players: 4 }, elapsedMs: 40 }), {
    live: true, label: 'Online · 4', players: 4,
  });
  assert.equal(parseWorldHealth({ ok: true, json: { ok: true, players: 0 }, elapsedMs: HEALTH_SLOW_MS + 1 }).label, WORLD_HEALTH_WAKING);
  assert.equal(parseWorldHealth({ ok: false, json: {}, elapsedMs: 10 }).label, WORLD_HEALTH_WAKING);

  const health = await fetchWorldHealth('https://example.test/healthz', {
    fetchFn: async () => ({ ok: true, json: async () => ({ ok: true, players: 2 }) }),
  });
  assert.equal(health.label, 'Online · 2');
  assert.equal(health.live, true);

  const woke = await fetchWorldHealth('https://example.test/healthz', {
    fetchFn: async () => { throw new Error('offline'); },
  });
  assert.equal(woke.label, WORLD_HEALTH_WAKING);
  assert.equal(woke.live, false);
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

test('title, menu, HUD pill, Vite MG_WORLD_URL, picker, and Switch world stay wired', () => {
  const html = src('../index.html');
  const main = src('../src/main.js');
  const hud = src('../src/ui/hud.js');
  const view = src('../src/net/worldView.js');
  const vite = src('../vite.config.js');
  const readme = src('../README.md');
  assert.match(html, /id="btn-guest"[^>]*>Play as guest/);
  assert.doesNotMatch(html, /id="btn-world1"/);
  assert.doesNotMatch(html, /Play Online — World 1/);
  assert.match(html, /id="world-guest-note"[^>]*>Sign in to play online/);
  assert.match(html, /id="world-picker"/);
  assert.match(html, /Choose a world/);
  assert.match(html, /id="pick-world1"/);
  assert.match(html, /id="pick-solo"/);
  assert.match(html, /id="world-auth"/);
  assert.match(html, /id="world-auth-signin"[^>]*>Sign in/);
  assert.match(html, /id="world-auth-solo"[^>]*>Play solo/);
  assert.match(html, /id="world-mode-pill"[^>]*data-mode="offline"[^>]*>Offline/);
  assert.match(main, /shouldMountOnline/);
  assert.match(main, /shouldDropOnlineWithoutSession/);
  assert.match(main, /showWorldPicker/);
  assert.match(main, /__mgShowWorldPicker/);
  assert.match(main, /continueAfterAccount/);
  assert.doesNotMatch(main, /pendingWorldAuth/);
  assert.doesNotMatch(main, /if \(consumeWorldAuth\(\)\) this\.showWorldAuth/);
  assert.match(main, /next === 'signin'[\s\S]{0,80}openSocialSignIn/);
  assert.match(main, /pickWorldOnline[\s\S]*openSocialSignIn/);
  assert.doesNotMatch(hud, /showWorldAuth/);
  assert.match(hud, /openSocialSignIn/);
  const apply = main.indexOf('async applyWallet');
  const fresh = main.indexOf('shouldFreshMmoClient', apply);
  assert.ok(apply > 0 && fresh > apply);
  assert.doesNotMatch(
    main.slice(apply, fresh),
    /if \(this\.cloudState === 'error'\) return;/,
    'a guild-record miss must not trap the hunter on the title after sign-in',
  );
  assert.match(main, /continueSignedInHunt[\s\S]*roster\.last/);
  assert.match(main, /this\.roster = new Roster\(session\.address/);
  assert.match(main, /pickWorldSolo[\s\S]*openCharacterSelect/);
  assert.match(main, /pickWorldOnline[\s\S]*enterOnlineWorld/);
  assert.match(main, /remountOnlineClient/);
  assert.match(main, /shouldFreshMmoClient/);
  assert.doesNotMatch(main, /playAsGuest\(\)[\s\S]{0,80}showWorldPicker/);
  assert.match(hud, /Switch world/);
  assert.match(hud, /set-world1/);
  assert.match(hud, /set-world-solo/);
  assert.match(hud, /search: liveSearch/);
  assert.match(view, /leaveOnlineWorld/);
  assert.match(view, /isAuthReject/);
  assert.match(view, /latchAuthReject/);
  assert.match(view, /dispose/);
  assert.match(vite, /MG_WORLD_URL/);
  assert.match(vite, /resolveMmoUrl/);
  assert.match(vite, /VITE_WORLD_URL/);
  assert.match(readme, /MG_WORLD_URL/);
  assert.match(readme, /Choose a world/);
  assert.equal(WORLD_GUEST_NOTE, 'Sign in to play online');
});

test('rejected mmo client is disposed and a new one connects after sign-in (MG-MMO-4)', () => {
  let n = 0;
  function makeClient() {
    n += 1;
    const client = {
      id: n,
      closed: false,
      connected: false,
      dispose() { this.closed = true; },
      connect() {
        if (this.closed) return false;
        this.connected = true;
        return true;
      },
    };
    client.connect();
    return client;
  }

  const rejected = makeClient();
  rejected.dispose();
  assert.equal(rejected.closed, true);
  assert.equal(rejected.connect(), false);
  assert.equal(mmoClientClosed(rejected), true);
  assert.equal(mmoClientClosed(null), false);
  assert.equal(shouldFreshMmoClient({
    search: '?mmo=1',
    signedIn: true,
    mmo: null,
  }), false);
  assert.equal(shouldFreshMmoClient({
    search: '?mmo=1',
    signedIn: true,
    authReject: true,
    mmo: rejected,
  }), true);
  assert.equal(shouldFreshMmoClient({
    search: '?mmo=1',
    signedIn: false,
    authReject: true,
    mmo: rejected,
  }), false);

  const game = { mmo: rejected };
  const view = {
    authReject: true,
    clearAuthLatch() { this.authReject = false; },
  };
  const next = remountMmoClient({
    game,
    view,
    mmo: rejected,
    attach: (g) => {
      const fresh = makeClient();
      g.mmo = fresh;
      return fresh;
    },
  });
  assert.notEqual(next, rejected);
  assert.equal(next.id, 2);
  assert.equal(next.closed, false);
  assert.equal(next.connected, true);
  assert.equal(game.mmo, next);
  assert.equal(view.authReject, false);
  assert.equal(rejected.closed, true);
  assert.equal(shouldFreshMmoClient({
    search: '?mmo=1',
    signedIn: true,
    authReject: false,
    mmo: next,
  }), false);
  assert.equal(shouldFreshMmoClient({
    search: '?mmo=1',
    signedIn: true,
    authReject: false,
    mmo: rejected,
  }), true);

  const env = { VITE_MMO_URL: 'wss://world.example/ws' };
  const loc = fakeLoc({ search: '?mmo=1', pathname: '/' });
  assert.equal(enterOnlineWorld({ search: loc.search, env, storage: memoryStore(), session: memoryStore(), loc }), true);
  assert.match(loc.assigned, /mmo=1/);
  assert.match(loc.assigned, /join=1/);

  const main = src('../src/main.js');
  assert.match(main, /remountMmoClient/);
  assert.match(main, /attachMmo/);
  assert.doesNotMatch(src('../src/net/worldPlay.js'), /from ['\"]\.\/mmo\.js['\"]/);
  assert.doesNotMatch(src('../src/net/mmo.js'), /shouldFreshMmoClient/);
});

test('resolveMmoUrl prefers MG_WORLD_URL and stays empty for Pages', () => {
  assert.equal(resolveMmoUrl({}), '');
  assert.equal(resolveMmoUrl({ VITE_MMO_URL: '' }), '');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: '  ', VITE_MMO_URL: '' }), '');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: 'wss://world.example/ws' }), 'wss://world.example/ws');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: 'wss://from-mg', VITE_MMO_URL: 'wss://from-vite' }), 'wss://from-mg');
  assert.equal(resolveMmoUrl({ VITE_MMO_URL: 'wss://from-vite' }), 'wss://from-vite');
});
