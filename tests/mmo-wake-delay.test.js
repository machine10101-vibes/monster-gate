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

test('?mmo=1 shows waking with elapsedMs until a 10s-asleep /healthz answers', async () => {
  const asleepMs = 10_000;
  const wokeAt = Date.now() + asleepMs;
  const server = http.createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    if (path !== '/healthz') {
      res.writeHead(404);
      res.end();
      return;
    }
    const wait = Math.max(0, wokeAt - Date.now());
    setTimeout(() => {
      res.writeHead(200, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      });
      res.end(JSON.stringify({ ok: true, protocol: 1 }));
    }, wait);
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
      const timer = setTimeout(() => reject(new Error('timed out waiting for connecting')), 20_000);
      const tick = () => {
        if (view.statuses.some((s) => s.status === 'connecting')) {
          clearTimeout(timer);
          return resolve();
        }
        setTimeout(tick, 50);
      };
      tick();
    });
    const waited = Date.now() - started;
    const waking = view.statuses.filter((s) => s.status === 'waking');
    assert.ok(waking.length >= 1, 'expected waking statuses while the server slept');
    assert.ok(waking.every((s) => typeof s.secondsLeft === 'number' && typeof s.elapsedMs === 'number'));
    assert.ok(waking[0].secondsLeft <= 30);
    assert.ok(waking.at(-1).elapsedMs >= 1000);
    assert.ok(waited >= 7000, `expected to wait most of the 10s sleep, got ${waited}ms`);
    assert.ok(view.statuses.some((s) => s.status === 'connecting'));
  } finally {
    client.dispose();
    await new Promise((resolve) => server.close(resolve));
  }
});
