import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { attachMmo } from '../src/net/mmo.js';

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
  send(data) { this.sent.push(String(data)); }
  close() { this.readyState = 3; this._emit('close'); }
  _emit(type, ev = {}) {
    for (const fn of this.listeners[type] || []) fn(ev);
  }
}

function stubView() {
  const statuses = [];
  return {
    statuses,
    applySnapshot() {},
    applyDelta() {},
    pushChat() {},
    setStatus(state, info) {
      if (typeof state === 'string') statuses.push({ status: state, ...(info && typeof info === 'object' ? info : {}) });
      else statuses.push(state);
    },
    setOnlineCount() {},
    onLocalMove() {},
    onChatSend() {},
  };
}

test('?mmo=1 opens World 1 immediately instead of holding a login queue', async () => {
  let healthRequests = 0;
  const server = http.createServer((req, res) => {
    healthRequests += 1;
    res.writeHead(503);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const world = `ws://127.0.0.1:${port}`;
  const view = stubView();
  const game = { character: { name: 'Ann' }, wallet: { kind: 'account' } };
  const started = Date.now();
  const client = attachMmo(game, view, {
    search: `?mmo=1&world=${world}`,
    WebSocket: FakeSocket,
    token: 'ann-token',
    guest: false,
  });
  assert.ok(client);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for the socket')), 1000);
      const tick = () => {
        if (client.ws && view.statuses.some((s) => s.status === 'connecting')) {
          clearTimeout(timer);
          return resolve();
        }
        setTimeout(tick, 10);
      };
      tick();
    });
    assert.ok(Date.now() - started < 1000);
    assert.equal(view.statuses.some((s) => s.status === 'waking'), false);
    assert.equal(healthRequests, 0);
    assert.ok(view.statuses.some((s) => s.status === 'connecting'));
  } finally {
    client.dispose();
    await new Promise((resolve) => server.close(resolve));
  }
});
