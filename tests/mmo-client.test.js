import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MmoClient, attachMmo, isGuestSession, parseMmoClientFlags, resolveServerUrl,
} from '../src/net/mmo.js';
import { PROTOCOL, resolveWorldUrl, encode, parseFrame } from '../src/net/worldProtocol.js';

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.listeners = { open: [], message: [], close: [], error: [] };
    queueMicrotask(() => {
      this.readyState = 1;
      this._emit('open');
    });
  }
  addEventListener(type, fn) {
    (this.listeners[type] || (this.listeners[type] = [])).push(fn);
  }
  send(data) {
    this.sent.push(String(data));
  }
  close() {
    this.readyState = 3;
    this._emit('close');
  }
  _emit(type, ev = {}) {
    for (const fn of this.listeners[type] || []) fn(ev);
  }
  push(msg) {
    this._emit('message', { data: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  }
}

function stubView() {
  const snapshots = [];
  const deltas = [];
  const chats = [];
  const statuses = [];
  const moves = [];
  const chatsOut = [];
  return {
    snapshots, deltas, chats, statuses,
    applySnapshot(players, meta) { snapshots.push({ players, meta }); },
    applyDelta(patch) { deltas.push(patch); },
    removePlayer(id) { deltas.push({ remove: [id] }); },
    pushChat(msg) { chats.push(msg); },
    setStatus(state) { statuses.push(state); },
    setOnlineCount() {},
    onLocalMove(cb) { this._move = cb; },
    onChatSend(cb) { this._chat = cb; },
    fireMove(pose) { this._move?.(pose); },
    fireChat(msg) { this._chat?.(msg); },
  };
}

test('world URL prefers ?world= and VITE_WORLD_URL alias still works', () => {
  assert.equal(resolveWorldUrl('?mmo=1&world=wss://world.example/ws'), 'wss://world.example/ws');
  assert.equal(resolveServerUrl('?server=ws://localhost:8080'), 'ws://localhost:8080');
  assert.equal(parseMmoClientFlags('?mmo=1').enabled, true);
  assert.equal(parseMmoClientFlags('?mmo=1&mock=1').enabled, false);
  assert.equal(PROTOCOL, 1);
  assert.equal(parseFrame(encode('ping', { t: 1 })).type, 'ping');
});

test('guests stay offline and get a toast; attachMmo is inert without ?mmo=1', () => {
  const toasts = [];
  const game = { wallet: { kind: 'guest' }, hud: { toast: (t) => toasts.push(t) } };
  const view = stubView();
  assert.equal(isGuestSession(game), true);
  assert.equal(attachMmo(game, view, { search: '' }), null);
  assert.equal(attachMmo(game, view, { search: '?mmo=1&world=ws://localhost:8080' }), null);
  assert.ok(view.statuses.some((s) => s === 'offline' || s?.status === 'offline'));
  assert.ok(toasts.some((t) => /sign in/i.test(t)));
});

test('MmoClient maps server frames onto worldView and sends move/chat', async () => {
  const view = stubView();
  const game = { character: { name: 'Ann' }, wallet: { kind: 'account' } };
  const client = new MmoClient(game, view, {
    url: 'ws://world.test',
    WebSocket: FakeSocket,
    token: 'ann-token',
    guest: false,
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(client.ws.readyState, 1);
  const hello = parseFrame(client.ws.sent[0]);
  assert.equal(hello.type, 'hello');
  assert.equal(hello.token, 'ann-token');
  assert.equal(hello.name, 'Ann');

  client.ws.push({
    v: 1, type: 'welcome', protocol: 1, tickHz: 15,
    resumeToken: 'resume-1', you: { id: 'u_ann', name: 'Ann', guest: false },
  });
  assert.equal(client.resumeToken, 'resume-1');
  assert.ok(view.statuses.some((s) => s.status === 'online'));

  client.ws.push({
    v: 1, type: 'snapshot',
    players: [{ id: 'u_bea', name: 'Bea', x: 70, y: 3, z: 74, yaw: 0, move: 0, anim: 0, zone: 'Oakhollow', hp: 20 }],
    entities: { monsters: [], nodes: [{ id: 'ore_copper_0', ready: true }] },
    online: 2, zone: 'Oakhollow',
  });
  assert.equal(view.snapshots[0].players[0].name, 'Bea');
  assert.equal(client.entities.nodes[0].id, 'ore_copper_0');

  client.ws.push({ v: 1, type: 'delta', upsert: [{ id: 'u_bea', x: 71 }], remove: [], online: 2 });
  assert.equal(view.deltas[0].upsert[0].x, 71);

  client.ws.push({ v: 1, type: 'chat', channel: 'world', text: 'Forge is hot.', from: { id: 'u_bea', name: 'Bea' } });
  assert.equal(view.chats[0].text, 'Forge is hot.');

  view.fireMove({ x: 74, y: 3.2, z: 73, yaw: 0.4, anim: 0, move: 0.8, held: 'blade', zone: 'Oakhollow' });
  const move = parseFrame(client.ws.sent.at(-1));
  assert.equal(move.type, 'move');
  assert.equal(move.x, 74);

  view.fireChat({ channel: 'zone', text: 'At the well.' });
  const chat = parseFrame(client.ws.sent.at(-1));
  assert.equal(chat.type, 'chat');
  assert.equal(chat.channel, 'zone');

  client.dispose();
  assert.ok(view.statuses.some((s) => s === 'offline' || s?.status === 'offline'));
});

test('auth errors stop reconnect and go offline', async () => {
  const toasts = [];
  const view = stubView();
  const game = { hud: { toast: (t) => toasts.push(t) }, wallet: { kind: 'account' } };
  const client = new MmoClient(game, view, {
    url: 'ws://world.test',
    WebSocket: FakeSocket,
    token: 'bad',
    guest: false,
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 20));
  client.ws.push({ v: 1, type: 'error', code: 'auth', message: 'Sign in to hunt online. Guests stay solo.' });
  assert.equal(client.fatal, true);
  assert.equal(client.closed, true);
  assert.ok(toasts.some((t) => /sign in/i.test(t)));
});
