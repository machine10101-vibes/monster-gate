import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ANIM, AUTH_SIGNIN_BTN, AUTH_SIGNIN_TITLE, AUTH_SOLO_BTN, CHAT_MAX, LOCAL_BUBBLE_S, LOCAL_PIN_S,
  REMOTE_PREFIX, STATUS, WAKE_SECONDS, WORLD_SPAWN, WORLD_VIEW,
  SnapshotBuffer, WorldView, angLerp, animName, animOf, fullyVisibleRows, isAuthReject, isWorldWireError,
  newestKeepIndex, normalizeChat, normalizePlayer, parseMmoFlags, planLogCull, wakeClock, worldModeLabel, worldView,
} from '../src/net/worldView.js';
import { HUNTERS, MockWorld } from '../src/net/worldMock.js';
import { MmoClient, attachMmo, parseMmoClientFlags, readAccessToken } from '../src/net/mmo.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('MMO flags: presentation on mmo=1, mock feed only with both', () => {
  const off = { mmo: false, mock: false, mockwake: false, mockerr: '', enabled: false, mockFeed: false, wakeSeconds: 0 };
  assert.deepEqual(parseMmoFlags(''), off);
  assert.deepEqual(parseMmoFlags('?mmo=1'), { ...off, mmo: true, enabled: true });
  assert.deepEqual(parseMmoFlags('mock=1'), { ...off, mock: true });
  assert.deepEqual(parseMmoFlags('?mmo=1&mock=1'), { ...off, mmo: true, mock: true, enabled: true, mockFeed: true });
  assert.deepEqual(parseMmoFlags('?mmo=1&mockwake=1'), { ...off, mmo: true, mockwake: true, enabled: true, wakeSeconds: 30 });
  assert.deepEqual(parseMmoFlags('?mmo=1&mockwake=90'), { ...off, mmo: true, mockwake: true, enabled: true, wakeSeconds: 90 });
  assert.deepEqual(parseMmoFlags('?mmo=1&mock=1&mockerr=name_taken'), {
    mmo: true, mock: true, mockwake: false, mockerr: 'name_taken', enabled: true, mockFeed: true, wakeSeconds: 0,
  });
  assert.equal(parseMmoFlags('?mmo=true&mock=true').enabled, false);
});

test('player snapshots clamp and keep equipment visuals', () => {
  assert.equal(normalizePlayer(null), null);
  assert.equal(normalizePlayer({}), null);
  const p = normalizePlayer({
    id: 'rowan',
    name: '  Rowan the Long-Named Hunter  ',
    x: 72.4,
    z: 76,
    yaw: 1.2,
    move: 2,
    anim: 'attack',
    held: 'budgeblade',
    sheath: 'budgeblade',
    look: { skin: 1, hair: 2, style: 0, tunic: 3, beard: true },
    armor: { helm: 'budgeset', chest: 'budgeset', junk: 'nope' },
    hp: 18,
  });
  assert.equal(p.name, 'Rowan the Long-N');
  assert.equal(p.move, 1);
  assert.equal(p.anim, ANIM.attack);
  assert.equal(p.held, 'budgeblade');
  assert.equal(p.armor.helm, 'budgeset');
  assert.equal(p.armor.junk, undefined);
  assert.equal(p.look.beard, true);
  assert.equal(animOf('roll'), ANIM.roll);
  assert.equal(animName(3), 'dead');
});

test('chat events keep world/zone and length limits', () => {
  assert.equal(normalizeChat({ text: '   ' }), null);
  const msg = normalizeChat({
    channel: 'zone',
    from: { id: 'lira', name: 'Lira' },
    text: '  hello   world  ' + 'x'.repeat(200),
    zone: 'Oakhollow',
  });
  assert.equal(msg.channel, 'zone');
  assert.equal(msg.from.name, 'Lira');
  assert.equal(msg.text.length, CHAT_MAX);
  assert.equal(normalizeChat({ channel: 'world', text: 'hi' }).channel, 'world');
  assert.equal(normalizeChat({ channel: 'whisper', text: 'psst', from: { id: 'a', name: 'Ann' } }).channel, 'whisper');
  assert.equal(normalizeChat({ channel: 'party', text: 'ready?' }).channel, 'party');
});

test('snapshot buffer interpolates position and wraps yaw', () => {
  const buf = new SnapshotBuffer({ delay: 0.1 });
  buf.push(0, { x: 0, y: 3, z: 0, yaw: 0, move: 0, anim: 0 });
  buf.push(0.2, { x: 10, y: 3, z: 10, yaw: Math.PI, move: 1, anim: 1 });
  const mid = buf.sample(0.2);
  assert.ok(Math.abs(mid.x - 5) < 1e-6);
  assert.ok(Math.abs(mid.z - 5) < 1e-6);
  assert.ok(Math.abs(mid.yaw - Math.PI / 2) < 1e-6);
  assert.equal(mid.snapped, false);
  const late = buf.sample(10);
  assert.equal(late.x, 10);
  assert.equal(late.snapped, true);
  const wrap = angLerp(3, -3, 0.5);
  assert.ok(Math.abs(wrap) > 2);
});

function stubRemote(id, name) {
  return {
    id,
    name,
    ready: false,
    driven: false,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    move: 0,
    state: 0,
    appear: null,
    setAppearance(a) { this.appear = a; this.name = a.name || this.name; },
    present(p) {
      Object.assign(this, p);
      this.ready = true;
    },
    dispose() { this.gone = true; },
    update() {},
  };
}

function stubGame() {
  const remotes = new Map();
  const game = {
    time: 0,
    started: false,
    remotes,
    player: {
      pos: { x: 72, y: 3, z: 72.5 },
      yaw: 0,
      moveAmt: 0.4,
      state: 'idle',
      heldKind: 'blade',
      sheathKind: 'blade',
    },
    character: { name: 'Test', look: { skin: 1, hair: 1, style: 0, tunic: 0, beard: false } },
    net: { name: 'Test' },
    hud: { plate() {}, placePlate() {}, removePlate() {} },
    world: { heightAt: () => 3.1, realm: 'over' },
    zone: 'Oakhollow',
    screenOf: () => [12, 20, true],
    step(dt) { this.time += dt; for (const r of this.remotes.values()) r.update(dt); },
    start() { this.started = true; },
    clearRemotes() {
      for (const r of [...this.remotes.values()]) r.dispose?.();
      this.remotes.clear();
    },
  };
  return game;
}

test('WorldView snapshots spawn remotes, emit move/chat, and drop leavers', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  const moves = [];
  const chats = [];
  view.onLocalMove((p) => moves.push(p));
  view.onChatSend((m) => chats.push(m));
  view.live = true;
  view.applySnapshot([
    { id: 'a', name: 'Ann', x: 70, y: 3, z: 74, yaw: 0, held: 'bow', armor: { chest: 'iron' } },
    { id: 'b', name: 'Bea', x: 74, y: 3, z: 74, yaw: 1, held: 'hammer' },
  ], { online: 11 });
  assert.equal(view.nearbyCount(), 2);
  assert.equal(view.online, 11);
  assert.ok(game.remotes.get(REMOTE_PREFIX + 'a'));
  assert.equal(game.remotes.get(REMOTE_PREFIX + 'a').appear.held, 'bow');
  view.applyDelta({ upsert: [{ id: 'b', name: 'Bea', x: 75, y: 3, z: 75, yaw: 1 }], remove: ['a'] });
  assert.equal(view.nearbyCount(), 1);
  assert.equal(game.remotes.get(REMOTE_PREFIX + 'a'), undefined);
  view.removePlayer('b');
  assert.equal(view.nearbyCount(), 0);
  view.applyDelta([{ id: 'c', name: 'Cal', x: 71, y: 3, z: 73 }]);
  assert.equal(view.nearbyCount(), 1);
  view.pushChat({ channel: 'world', from: { id: 'c', name: 'Cal' }, text: 'Hello town' });
  assert.equal(view.chat[0].text, 'Hello town');
  view.toggleMutePlayer('c', 'Cal');
  view.pushChat({ channel: 'world', from: { id: 'c', name: 'Cal' }, text: 'Muted message' });
  assert.equal(view.chat.length, 1, 'muted players should not enter chat history');
  view.toggleMutePlayer('c', 'Cal');
  game.social = { caps: { whisper: false } };
  view.sendChat('/w Cal this is private', 'world');
  assert.equal(chats.length, 0, 'private command must never fall through to public chat');
  view.pushChat({ channel: 'party', from: { id: 'b', name: 'Bea' }, text: 'Party ready' });
  assert.equal(view.chat.at(-1).channel, 'party');
  view.sendChat('  hi zone  ', 'zone');
  assert.equal(chats.at(-1).channel, 'zone');
  assert.equal(chats.at(-1).text, 'hi zone');
  view.emitMove();
  assert.equal(moves.length, 0, 'moves wait for welcome so hello is first');
  view.setStatus({ status: 'online', online: 9 });
  view.emitMove();
  assert.equal(moves[0].x, 72);
  assert.equal(moves[0].held, 'blade');
  assert.equal(moves[0].hp, 20);
  assert.equal(moves[0].max_hp, 20);
  assert.equal(view.status, STATUS.online);
  assert.equal(view.online, 9);
});

test('WorldView interpolates before the game step presents a pose', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  view.wrapGame();
  view.live = true;
  view.applySnapshot([{ id: 'a', name: 'Ann', x: 0, y: 3, z: 0, yaw: 0, move: 0 }]);
  game.time = 0.2;
  view.applySnapshot([{ id: 'a', name: 'Ann', x: 10, y: 3, z: 0, yaw: 0, move: 1 }]);
  game.time = 0.3;
  view.preStep();
  const r = game.remotes.get(REMOTE_PREFIX + 'a');
  assert.ok(r.ready);
  assert.ok(r.x > 0 && r.x < 10);
});

test('clearing waygate remotes keeps world-view hunters', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  view.wrapGame();
  view.live = true;
  view.applySnapshot([{ id: 'a', name: 'Ann', x: 1, y: 3, z: 1 }]);
  game.remotes.set('peer-1', stubRemote('peer-1', 'Way'));
  game.clearRemotes();
  assert.ok(game.remotes.get(REMOTE_PREFIX + 'a'));
  assert.equal(game.remotes.get('peer-1'), undefined);
});

test('mock crowd wears distinct gear and chats on both channels', () => {
  assert.ok(HUNTERS.length >= 6);
  assert.ok(HUNTERS.every((h) => h.held && h.look && h.armor));
  const view = { applySnapshot() {}, applyChat() {}, setStatus() {} };
  const game = stubGame();
  const feed = new MockWorld(view, { game });
  const snaps = [];
  const chats = [];
  const statuses = [];
  feed.on('snapshot', (p, meta) => snaps.push({ p, meta }));
  feed.on('chat', (c) => chats.push(c));
  feed.on('status', (s) => statuses.push(s));
  feed.running = true;
  feed.status = STATUS.online;
  feed.pinned = true;
  feed.pushSnapshot();
  const players = snaps[0].p;
  assert.equal(players.length, HUNTERS.length);
  assert.equal(snaps[0].meta.online, 24);
  assert.ok(players.some((p) => p.armor.helm === 'budgeset'));
  assert.ok(players.some((p) => p.held === 'wand'));
  const names = HUNTERS.map((h) => h.name);
  assert.ok(names.includes('Sera') && names.includes('Corvin') && names.includes('Tamsin'));
  assert.equal(names.includes('Lira'), false);
  assert.equal(names.includes('Dalla'), false);
  assert.equal(names.includes('Mira'), false);
  feed.say('world', { id: 'bram', name: 'Bram' }, 'Forge is hot.');
  feed.say('zone', { id: 'sera', name: 'Sera' }, 'At the well.');
  assert.equal(chats[0].channel, 'world');
  assert.equal(chats[1].channel, 'zone');
  feed.send({ type: 'chat', channel: 'world', text: 'I am here' });
  assert.equal(chats.at(-1).from.id, 'you');
  assert.ok(statuses.length === 0);
});

test('reconnect intent asks the mock transport to come back online', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  const feed = new MockWorld(view, { game });
  view.bindTransport(feed);
  feed.running = true;
  view.requestReconnect();
  assert.equal(feed.status, STATUS.reconnecting);
});

test('hunter nameplates offset overlaps, cull extras, and fade with distance', () => {
  const game = stubGame();
  const placed = [];
  let laid = 0;
  game.hud.placePlate = (id, x, y, vis, opts) => placed.push({ id, x, y, vis, opts });
  game.hud.layoutInteractPlates = () => { laid += 1; };
  game.screenOf = () => [120, 80, true];
  const view = new WorldView(game, { spawnRemote: stubRemote });
  view.live = true;
  view.applySnapshot([
    { id: 'near', name: 'Ann', x: 73, y: 3, z: 73 },
    { id: 'stack', name: 'Bea', x: 73.2, y: 3, z: 73.1 },
    { id: 'far', name: 'Cam', x: 120, y: 3, z: 120 },
  ]);
  placed.length = 0;
  view.update(0);
  const shown = placed.filter((p) => p.vis);
  const hidden = placed.filter((p) => !p.vis);
  assert.ok(shown.length >= 1);
  assert.ok(shown.length <= 2);
  assert.ok(shown.every((p) => p.opts?.opacity >= 0.35));
  assert.ok(hidden.some((p) => p.id.includes('far') || p.id.endsWith('far')));
  assert.ok(laid >= 1, 'hunter plates go through the shared nameplate declutter');
});

test('a mock chat send from you is marked local and opens a player bubble', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  view.live = true;
  view.pushChat({ channel: 'world', from: { id: 'you', name: 'Test' }, text: 'zephyr20' });
  assert.equal(view.localSay, 'zephyr20');
  assert.ok(view.localSayT > 0);
  assert.equal(view.localPin.text, 'zephyr20');
  view.pushChat({ channel: 'world', from: { id: 'herald', name: 'Herald' }, text: 'Seven hunters are already in Oakhollow.' });
  assert.equal(view.localPin.text, 'zephyr20', 'crowd lines do not replace the pinned own line');
  view.update(LOCAL_BUBBLE_S + 0.5);
  assert.equal(view.localSay, '');
  assert.equal(view.localPin.text, 'zephyr20');
  view.update(LOCAL_PIN_S);
  assert.equal(view.localPin.text, 'zephyr20', 'game dt does not expire the wall-clock pin');
  view.pushChat({ channel: 'world', from: { id: 'you', name: 'Test' }, text: 'next' });
  assert.equal(view.localPin.text, 'next');
  view.dispose();
  const wv = src('../src/net/worldView.js');
  assert.match(wv, /wc-you/);
  assert.match(wv, /wc-pin/);
  assert.match(wv, /wc-pin-mark/);
  assert.match(wv, /setTimeout/);
  assert.match(wv, /local-chat/);
  assert.match(wv, /layoutInteractPlates/);
  assert.equal(LOCAL_PIN_S, 15);
});

test('MG-UI-37 own pin clears after 15s of wall clock with no frames', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  view.pushChat({ channel: 'world', from: { id: 'you', name: 'Test' }, text: 'zephyr20' });
  assert.equal(view.localPin.text, 'zephyr20');
  t.mock.timers.tick(14_999);
  assert.equal(view.localPin.text, 'zephyr20', 'still pinned before 15s');
  t.mock.timers.tick(1);
  assert.equal(view.localPin, null, 'clears at 15s of real time with no update()');
  view.pushChat({ channel: 'world', from: { id: 'you', name: 'Test' }, text: 'again' });
  assert.equal(view.localPin.text, 'again');
  t.mock.timers.tick(15_000);
  assert.equal(view.localPin, null);
  view.dispose();
});

test('MG-UI-38 log cull hides rows that do not fully fit', () => {
  const rows = [
    { id: 'clip-top', top: -8, bottom: 10 },
    { id: 'full-a', top: 10, bottom: 28 },
    { id: 'full-b', top: 28, bottom: 46 },
    { id: 'clip-bot', top: 46, bottom: 70 },
  ];
  assert.deepEqual(fullyVisibleRows(0, 64, rows).map((r) => r.id), ['full-a', 'full-b']);
  assert.deepEqual(fullyVisibleRows(0, 46, rows.slice(1, 3)).map((r) => r.id), ['full-a', 'full-b']);
  const wv = src('../src/net/worldView.js');
  const style = src('../src/style.css');
  const theme = src('../src/ui/theme.css');
  assert.match(wv, /wc-stack/);
  assert.match(wv, /cullChatLogRows/);
  assert.match(style, /#world-chat \.wc-stack \{[\s\S]*?height:\s*112px/);
  assert.match(style, /#world-chat \.wc-log \{[\s\S]*?overflow:\s*hidden/);
  assert.match(style, /body\.touch #world-chat \.wc-stack \{[\s\S]*?height:\s*84px/);
  assert.match(theme, /body\.touch #world-chat \.wc-stack \{[\s\S]*?height:\s*64px/);
  assert.doesNotMatch(theme, /body\.touch #world-chat \.wc-log \{[\s\S]*?height:\s*64px/);
});

test('MG-UI-39 newest wrapped row stays visible while the pin shows', () => {
  const herald = [{ id: 'herald', top: 0, bottom: 50, pinned: false }];
  const emptyLog = planLogCull(herald, 0, 24, { keepNewest: false });
  assert.deepEqual(emptyLog.hide, [0], 'without the pin a row that cannot fit is hidden');
  const withPin = planLogCull(herald, 0, 24, { keepNewest: true });
  assert.deepEqual(withPin.hide, [], 'pin keeps the newest non-pin row');
  assert.equal(withPin.keepIndex, 0);
  assert.equal(withPin.clampNewest, true, 'newest row is clamped instead of hidden');
  const afterSend = [
    { id: 'herald', top: 0, bottom: 40, pinned: false },
    { id: 'you', top: 40, bottom: 58, pinned: true },
  ];
  assert.equal(newestKeepIndex(afterSend, true), 0, 'skip the pinned own echo');
  const mixed = planLogCull(afterSend, 0, 28, { keepNewest: true });
  assert.equal(mixed.keepIndex, 0);
  assert.deepEqual(mixed.hide, [1], 'own echo hides while the pin shows; Herald stays');
  const roomy = [
    { id: 'herald', top: 0, bottom: 24, pinned: false },
    { id: 'you', top: 24, bottom: 40, pinned: true },
  ];
  assert.deepEqual(planLogCull(roomy, 0, 64, { keepNewest: true }).hide, [1], 'pin echo hides even if it would fit');
  const older = [
    { id: 'bram', top: -10, bottom: 8, pinned: false },
    { id: 'herald', top: 8, bottom: 40, pinned: false },
  ];
  const rest = planLogCull(older, 0, 28, { keepNewest: true });
  assert.deepEqual(rest.hide, [0], 'older rows still hide whole');
  const wv = src('../src/net/worldView.js');
  const style = src('../src/style.css');
  assert.match(wv, /keepNewest/);
  assert.match(wv, /wc-clamp/);
  assert.match(style, /-webkit-line-clamp:\s*2/);
  assert.match(style, /#world-chat \.wc-log p\.wc-clamp \{[\s\S]*?min-height:\s*calc\(1\.25em \* 2\)/);
  assert.match(style, /#world-chat \.wc-pin p\.wc-you \{[\s\S]*?text-overflow:\s*ellipsis/);
});

test('waking overlay is inert without ?mmo=1', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '' });
  view.setStatus('waking', { secondsLeft: 60, elapsedMs: 0 });
  assert.equal(view.status, STATUS.waking);
  assert.equal(view.wakeActive(), false);
  assert.equal(view.wakeUi, null);
});

test('setStatus waking counts down locally and exposes retry / stuck states', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  let t = 1000;
  view._now = () => t;
  view.setStatus('waking', { secondsLeft: 60, elapsedMs: 0 });
  assert.equal(view.wakeActive(), true);
  assert.equal(view.pollWake(t).phase, 'queue');
  assert.equal(view.pollWake(t).secondsLeft, 60);
  assert.equal(view.pollWake(t + 5000).secondsLeft, 55);
  assert.equal(view.pollWake(t + 36000).phase, 'queue', 'keep the retry affordance back until the cold-start window passes');
  assert.equal(view.pollWake(t + 61000).phase, 'late');
  assert.equal(view.pollWake(t + 76000).phase, 'stuck');
  const obj = wakeClock({ secondsLeft: WAKE_SECONDS, elapsedMs: 0 }, t, t);
  assert.equal(obj.secondsLeft, 60);

  view.setStatus({ status: 'waking', detail: { secondsLeft: 12, elapsedMs: 18000 } });
  assert.equal(view.pollWake(t).secondsLeft, 12);

  let retries = 0;
  view.onRetry(() => { retries += 1; });
  view.retryWake();
  assert.equal(retries, 1);

  view.setStatus('online');
  assert.equal(view.wakeActive(), false);
  assert.equal(view.status, STATUS.online);

  view.setStatus('waking', { secondsLeft: 0, elapsedMs: 76000 });
  assert.equal(view.pollWake(t).phase, 'stuck');
  view.playOffline();
  assert.equal(view.wakeActive(), false);
});

test('mockwake drives waking for 60s then online', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1&mockwake=1' });
  const feed = new MockWorld(view, { game, mockwake: true, wakeMs: 1000 });
  view.bindTransport(feed);
  feed.start();
  try {
    assert.equal(view.status, STATUS.waking);
    assert.equal(view.wakeActive(), true);
    feed.stepWake(250);
    assert.equal(view.status, STATUS.waking);
    assert.ok(view.wakeDetail.elapsedMs >= 250);
    feed.stepWake(750);
    assert.equal(view.status, STATUS.online);
    assert.equal(view.wakeActive(), false);
  } finally {
    feed.stop();
  }
});

test('worldView does not open sockets; mmo.js stays inert without ?mmo=1', () => {
  const viewSrc = src('../src/net/worldView.js');
  assert.doesNotMatch(viewSrc, /WebSocket/);
  assert.doesNotMatch(viewSrc, /from ['\"]ws['\"]/);
  assert.doesNotMatch(viewSrc, /new WebSocket/);
  const main = src('../src/main.js');
  assert.match(main, /q\.get\('mmo'\) === '1'/);
  assert.match(main, /shouldMountOnline/);
  assert.match(main, /import\('\.\/net\/worldView\.js'\)/);
  assert.match(main, /import\('\.\/net\/mmo\.js'\)/);
  assert.doesNotMatch(main, /from '\.\/net\/mmo\.js'/);
  assert.match(src('../src/net/session.js'), /joinRoom/);
  assert.equal(WORLD_VIEW, 1);
  assert.equal(typeof worldView.init, 'function');
  assert.deepEqual(parseMmoClientFlags(''), { mmo: false, mock: false, enabled: false });
  assert.deepEqual(parseMmoClientFlags('?mmo=1'), { mmo: true, mock: false, enabled: true });
  assert.deepEqual(parseMmoClientFlags('?mmo=1&mock=1'), { mmo: true, mock: true, enabled: false });
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote });
  assert.equal(attachMmo(game, view, { search: '' }), null);
  assert.equal(attachMmo(game, view, { search: '?mock=1' }), null);
  assert.equal(attachMmo(game, view, { search: '?mmo=1&mock=1' }), null);
});

test('name_taken error is final, prompts for another hunter name, and does not reconnect', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  const feed = new MockWorld(view, { game, mockerr: 'name_taken' });
  view.bindTransport(feed);
  feed.start();
  assert.equal(view.status, STATUS.error);
  assert.equal(view.errorCode(), 'name_taken');
  assert.equal(view.nameTakenActive(), true);
  view.requestReconnect();
  assert.equal(view.status, STATUS.error);
  assert.equal(feed.status, STATUS.error);
  assert.equal(view.submitHunterName('Test'), 'That hunter name is taken. Pick another.');
  assert.equal(view.submitHunterName('x'), 'Names need at least 2 letters.');
  assert.equal(view.submitHunterName('Rowan Two'), '');
  assert.equal(game.character.name, 'Rowan Two');
  assert.equal(game.net.name, 'Rowan Two');
  assert.equal(view.nameTakenActive(), false);
  assert.equal(view.status, STATUS.online);
  assert.equal(feed.status, STATUS.online);
});

test('setStatus error name_taken accepts object detail without auto-reconnect', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  view.setStatus('error', { code: 'name_taken', message: 'That hunter name is taken.' });
  assert.equal(view.status, STATUS.error);
  assert.equal(view.nameTakenActive(), true);
  assert.match(view.errorMessage(), /taken/);
  view.requestReconnect();
  assert.equal(view.status, STATUS.error);
  view.setStatus({ status: 'error', code: 'name_taken', message: 'Pick another hunter name.' });
  assert.equal(view.errorCode(), 'name_taken');
});

test('auth reject latches Sign in panel and ignores later reconnecting (MG-MMO-3)', () => {
  assert.equal(isAuthReject({ code: 'auth' }), true);
  assert.equal(isAuthReject('auth'), true);
  assert.equal(isAuthReject('That sign-in is not valid.'), true);
  assert.equal(isAuthReject({ status: 'online', detail: 'Sign in to hunt online. Guests stay solo.' }), true);
  assert.equal(isAuthReject('reconnecting'), false);
  assert.equal(isAuthReject({ code: 'name_taken' }), false);
  assert.equal(AUTH_SIGNIN_TITLE, 'Sign in to hunt online');
  assert.equal(AUTH_SIGNIN_BTN, 'Sign in');
  assert.equal(AUTH_SOLO_BTN, 'Play solo');

  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  let disposed = 0;
  game.mmo = {
    dispose() {
      disposed += 1;
      view.setStatus('offline');
    },
  };
  view.setStatus({ status: 'connecting', detail: 'Sign in to hunt online. Guests stay solo.' });
  assert.equal(view.authReject, true);
  assert.equal(view.authOpen, true);
  assert.equal(view.status, STATUS.error);
  assert.equal(view.errorCode(), 'auth');
  assert.match(view.errorMessage(), /Sign in to hunt online/);
  assert.equal(disposed, 1);

  view.setStatus('reconnecting');
  view.setStatus({ status: 'reconnecting' });
  view.setStatus('offline');
  assert.equal(view.authReject, true);
  assert.equal(view.status, STATUS.error);
  assert.equal(view.errorCode(), 'auth');
  assert.match(view.errorMessage(), /Sign in to hunt online/);

  const bare = new WorldView(stubGame(), { spawnRemote: stubRemote, search: '?mmo=1' });
  bare.setStatus({ status: 'online', detail: 'auth' });
  bare.setStatus('reconnecting', 'World server unreachable');
  assert.equal(bare.authReject, true);
  assert.equal(bare.status, STATUS.error);
  assert.equal(bare.errorCode(), 'auth');
});

test('paintHud hides the center Online chip once World 1 is live', () => {
  const view = new WorldView(stubGame(), { spawnRemote: stubRemote, search: '?mmo=1' });
  const status = {
    dataset: {},
    hidden: false,
    innerHTML: '',
    querySelector() { return null; },
  };
  view.ui = {
    status,
    chat: {
      classList: { toggle() {} },
      dataset: {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
  };
  view.status = STATUS.connecting;
  view.paintHud();
  assert.equal(status.hidden, false);
  assert.equal(status.dataset.state, STATUS.connecting);
  assert.match(status.innerHTML, /Connecting/);

  view.status = STATUS.online;
  view.online = 1;
  view.paintHud();
  assert.equal(status.hidden, true);
  assert.equal(status.dataset.state, STATUS.online);

  view.status = STATUS.error;
  view.paintHud();
  assert.equal(status.hidden, false);
  assert.match(status.innerHTML, /Error/);
});

test('world mode pill stays Online once the signed-in socket is live', () => {
  assert.equal(worldModeLabel(STATUS.online), 'Online');
  assert.equal(worldModeLabel(STATUS.connecting), 'Connecting');
  assert.equal(worldModeLabel(STATUS.waking), 'Waking');
  assert.equal(worldModeLabel(STATUS.reconnecting), 'Reconnecting');
  assert.equal(worldModeLabel(STATUS.error, true), 'Sign in');
  assert.equal(worldModeLabel(STATUS.offline), 'Offline');

  const pill = {
    hidden: true,
    dataset: {},
    textContent: 'Offline',
    title: '',
    setAttribute(name, value) { this[name] = value; },
  };
  const prev = globalThis.document;
  globalThis.document = {
    getElementById(id) { return id === 'world-mode-pill' ? pill : null; },
  };
  try {
    const view = new WorldView(stubGame(), { spawnRemote: stubRemote, search: '?mmo=1' });
    view.status = STATUS.connecting;
    view.paintHud();
    assert.equal(pill.textContent, 'Connecting');
    assert.equal(pill.dataset.mode, 'connecting');
    assert.equal(pill.dataset.connectionState, STATUS.connecting);

    view.status = STATUS.online;
    view.paintHud();
    assert.equal(pill.textContent, 'Online');
    assert.equal(pill.dataset.mode, 'online');
    assert.equal(pill['aria-label'], 'Connected to online play');

    view.status = STATUS.reconnecting;
    view.paintHud();
    assert.equal(pill.textContent, 'Reconnecting');
    assert.notEqual(pill.textContent, 'Offline');

    view.status = STATUS.offline;
    view.paintHud();
    assert.equal(pill.textContent, 'Offline');
    assert.equal(pill.dataset.mode, 'offline');
  } finally {
    if (prev === undefined) delete globalThis.document;
    else globalThis.document = prev;
  }
});

test('a rejected hello rejoins when the hunter signs in with a new token', () => {
  const prevS = globalThis.sessionStorage;
  const prevL = globalThis.localStorage;
  const blank = {
    getItem(key) {
      return key === 'monster-gate-account-session' ? JSON.stringify({ accessToken: '' }) : null;
    },
  };
  const kept = {
    getItem(key) {
      return key === 'monster-gate-account-session' ? JSON.stringify({ accessToken: 'kept' }) : null;
    },
  };
  globalThis.sessionStorage = blank;
  globalThis.localStorage = kept;
  try {
    assert.equal(readAccessToken(), 'kept');
    assert.equal(readAccessToken({ wallet: { accessToken: ' wallet ' } }), 'wallet');
  } finally {
    if (prevS === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = prevS;
    if (prevL === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevL;
  }

  const game = stubGame();
  game.wallet = { accessToken: 'expired-token' };
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  const client = new MmoClient(game, view, { url: 'ws://127.0.0.1:9' });
  game.mmo = client;
  client.onFrame(JSON.stringify({
    v: 1,
    type: 'error',
    code: 'auth',
    message: 'That sign-in is not valid.',
  }));
  assert.equal(view.authReject, true);
  assert.equal(view.status, STATUS.error);
  assert.equal(client.closed, false);
  assert.equal(client.authHold, true);
  assert.equal(client.rejectedToken, 'expired-token');

  let opened = 0;
  client.connect = () => { opened += 1; };
  assert.equal(client.pollToken(), false);
  game.wallet.accessToken = 'fresh-token';
  assert.equal(client.pollToken(), true);
  assert.equal(view.authReject, false);
  assert.equal(opened, 1);
  assert.equal(client.authHold, false);
  client.dispose();
});

test('social client actions wait for server confirmation', async () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  const client = new MmoClient(game, view, { url: 'ws://127.0.0.1:9' });
  let frame = null;
  client.ws = { readyState: 1, send(raw) { frame = JSON.parse(raw); } };
  const pending = client.friendRequest('Bea');
  assert.equal(frame.type, 'friend_request');
  assert.ok(frame.request_id);
  client.onFrame(JSON.stringify({ v: 1, type: 'social_result', request_id: frame.request_id, ok: true, pending: true }));
  assert.deepEqual(await pending, { ok: true, pending: true, code: '', message: '' });
  client.dispose();
});

test('welcome starts a keepalive ping so an idle signed-in hunter stays online', () => {
  const game = stubGame();
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  const client = new MmoClient(game, view, { url: 'ws://127.0.0.1:9' });
  client.onFrame(JSON.stringify({ v: 1, type: 'welcome', you: { id: 'you' }, online: 1 }));
  assert.equal(view.status, STATUS.online);
  assert.ok(client.pingTimer);
  client.dispose();
  assert.equal(client.pingTimer, 0);
  assert.equal(view.status, STATUS.offline);
});

test('world wire errors stay online, do not paint, and snap a far hunter to spawn', () => {
  assert.equal(isWorldWireError('teleport'), 'teleport');
  assert.equal(isWorldWireError({ status: 'online', detail: 'That move was too far.' }), 'teleport');
  assert.equal(isWorldWireError('Slow down.'), 'rate');
  assert.equal(isWorldWireError({ code: 'protocol', message: 'Say hello first.' }), 'protocol');
  assert.equal(isWorldWireError({ code: 'auth' }), '');
  assert.equal(isWorldWireError({ code: 'name_taken' }), '');

  const game = stubGame();
  game.player.pos.x = 800;
  game.player.pos.z = 800;
  const snapped = [];
  game.player.syncObj = () => snapped.push('sync');
  game.snapCamera = () => snapped.push('cam');
  const view = new WorldView(game, { spawnRemote: stubRemote, search: '?mmo=1' });
  view.live = true;
  view.setStatus({ status: 'online', online: 1 });
  view.setStatus({ status: 'online', detail: 'That move was too far.' });
  assert.equal(view.status, STATUS.online);
  assert.equal(view.detail, '');
  assert.equal(game.player.pos.x, WORLD_SPAWN.x);
  assert.equal(game.player.pos.z, WORLD_SPAWN.z);
  assert.ok(snapped.includes('sync'));
  assert.ok(snapped.includes('cam'));

  game.player.pos.x = 12;
  game.player.pos.z = 12;
  view.setStatus({ status: 'online', detail: 'teleport' });
  assert.equal(game.player.pos.x, 12, 'snaps only once');
  assert.equal(view.status, STATUS.online);
});
