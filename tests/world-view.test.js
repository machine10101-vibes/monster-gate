import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ANIM, CHAT_MAX, REMOTE_PREFIX, STATUS, WORLD_VIEW,
  SnapshotBuffer, WorldView, angLerp, animName, animOf,
  normalizeChat, normalizePlayer, parseMmoFlags, worldView,
} from '../src/net/worldView.js';
import { HUNTERS, MockWorld } from '../src/net/worldMock.js';
import { attachMmo, parseMmoClientFlags } from '../src/net/mmo.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('MMO flags: presentation on mmo=1, mock feed only with both', () => {
  assert.deepEqual(parseMmoFlags(''), { mmo: false, mock: false, enabled: false, mockFeed: false });
  assert.deepEqual(parseMmoFlags('?mmo=1'), { mmo: true, mock: false, enabled: true, mockFeed: false });
  assert.deepEqual(parseMmoFlags('mock=1'), { mmo: false, mock: true, enabled: false, mockFeed: false });
  assert.deepEqual(parseMmoFlags('?mmo=1&mock=1'), { mmo: true, mock: true, enabled: true, mockFeed: true });
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
  view.sendChat('  hi zone  ', 'zone');
  assert.equal(chats.at(-1).channel, 'zone');
  assert.equal(chats.at(-1).text, 'hi zone');
  view.emitMove();
  assert.equal(moves[0].x, 72);
  assert.equal(moves[0].held, 'blade');
  view.setStatus({ status: 'online', online: 9 });
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
  feed.say('world', { id: 'bram', name: 'Bram' }, 'Forge is hot.');
  feed.say('zone', { id: 'lira', name: 'Lira' }, 'At the well.');
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
  game.hud.placePlate = (id, x, y, vis, opts) => placed.push({ id, x, y, vis, opts });
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
  assert.equal(new Set(shown.map((p) => p.y)).size, shown.length);
  assert.ok(shown.every((p) => p.opts?.opacity >= 0.35));
  assert.ok(hidden.some((p) => p.id.includes('far') || p.id.endsWith('far')));
});

test('worldView does not open sockets; mmo.js stays inert without ?mmo=1', () => {
  const viewSrc = src('../src/net/worldView.js');
  assert.doesNotMatch(viewSrc, /WebSocket/);
  assert.doesNotMatch(viewSrc, /from ['\"]ws['\"]/);
  assert.doesNotMatch(viewSrc, /new WebSocket/);
  const main = src('../src/main.js');
  assert.match(main, /q\.get\('mmo'\) === '1'/);
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
