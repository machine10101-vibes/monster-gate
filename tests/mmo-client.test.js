import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MmoClient, attachMmo, parseMmoClientFlags } from '../src/net/mmo.js';

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
    if (this.readyState === 3) return;
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
  const statuses = [];
  return {
    statuses,
    applySnapshot() {},
    applyDelta() {},
    removePlayer() {},
    pushChat() {},
    setStatus(state, info) {
      if (typeof state === 'string') {
        statuses.push({
          status: state,
          ...(info && typeof info === 'object' ? info : (info != null && info !== '' ? { detail: info } : {})),
        });
      } else {
        statuses.push(state);
      }
    },
    setOnlineCount() {},
    onLocalMove() {},
    onChatSend() {},
  };
}

test('auth errors are final: keep the message, stay solo, and do not reconnect', async () => {
  const view = stubView();
  const client = new MmoClient({ character: { name: 'Ann' } }, view, {
    url: 'ws://world.test',
    WebSocket: FakeSocket,
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(client.ws.readyState, 1);
  const message = 'Sign in to hunt online. Guests stay solo.';
  client.ws.push({ v: 1, type: 'error', code: 'auth', message });
  assert.equal(client.fatal, true);
  assert.equal(client.closed, true);
  assert.equal(client.ws, null);
  assert.equal(client.timer, 0);
  await new Promise((r) => setTimeout(r, 50));
  const afterAuth = view.statuses.filter((s) => s && s.status);
  const authIdx = afterAuth.findIndex((s) => (s.detail || s.message || '') === message || s.status === 'offline');
  assert.ok(authIdx >= 0, 'expected an offline/auth status');
  assert.ok(
    !afterAuth.slice(authIdx).some((s) => s.status === 'reconnecting'),
    'auth rejection must not be overwritten with reconnecting',
  );
  const last = afterAuth.at(-1);
  assert.equal(last.status, 'offline');
  assert.equal(last.detail, message);
  // A later close must not schedule a reconnect either.
  assert.equal(client.attempt, 0);
  client.retry();
  assert.equal(client.closed, true);
  assert.equal(client.ws, null);
});

test('network drops still schedule reconnect', async () => {
  const view = stubView();
  const client = new MmoClient({ character: { name: 'Ann' } }, view, {
    url: 'ws://world.test',
    WebSocket: FakeSocket,
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 20));
  client.ws.close();
  assert.equal(client.fatal, false);
  assert.ok(view.statuses.some((s) => s.status === 'reconnecting'));
  assert.ok(client.timer);
  client.dispose();
});

test('attachMmo stays inert without ?mmo=1', () => {
  assert.equal(parseMmoClientFlags('').enabled, false);
  assert.equal(attachMmo({}, stubView(), { search: '' }), null);
  assert.equal(attachMmo({}, stubView(), { search: '?mmo=1&mock=1' }), null);
});
