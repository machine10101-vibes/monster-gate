import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MmoClient, attachMmo, healthzUrl, isGuestSession, parseMmoClientFlags, resolveServerUrl,
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
    setStatus(state, info) {
      if (typeof state === 'string') statuses.push({ status: state, ...(info && typeof info === 'object' ? info : {}) });
      else statuses.push(state);
    },
    setOnlineCount() {},
    onLocalMove(cb) { this._move = cb; },
    onChatSend(cb) { this._chat = cb; },
    fireMove(pose) { this._move?.(pose); },
    fireChat(msg) { this._chat?.(msg); },
  };
}

function okFetch() {
  return async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
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
    fetch: okFetch(),
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
    fetch: okFetch(),
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 20));
  client.ws.push({ v: 1, type: 'error', code: 'auth', message: 'Sign in to hunt online. Guests stay solo.' });
  assert.equal(client.authHold, true);
  assert.equal(client.fatal, false);
  assert.equal(client.closed, false);
  assert.ok(toasts.some((t) => /sign in/i.test(t)));
});

test('MG-MMO-4: setToken after auth rejection reconnects without a reload', async () => {
  const sockets = [];
  class TrackingSocket extends FakeSocket {
    constructor(url) {
      super(url);
      sockets.push(this);
    }
  }
  const view = stubView();
  const client = new MmoClient({ hud: { toast() {} }, wallet: { kind: 'account' } }, view, {
    url: 'ws://world.test',
    WebSocket: TrackingSocket,
    token: 'stale',
    guest: false,
    fetch: okFetch(),
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 30));
  sockets[0].push({ v: 1, type: 'error', code: 'auth', message: 'Sign in to hunt online. Guests stay solo.' });
  assert.equal(client.authHold, true);
  client.retry();
  assert.equal(client.authHold, true);
  assert.equal(sockets.length, 1);

  client.setToken('fresh-token');
  assert.equal(client.fatal, false);
  assert.equal(client.closed, false);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(sockets.length, 2);
  assert.equal(client.ws, sockets[1]);
  const hello = parseFrame(client.ws.sent[0]);
  assert.equal(hello.type, 'hello');
  assert.equal(hello.token, 'fresh-token');
});

test('MG-MMO-4: resetAuth and retry work once a new token is present', async () => {
  const sockets = [];
  class TrackingSocket extends FakeSocket {
    constructor(url) {
      super(url);
      sockets.push(this);
    }
  }
  const view = stubView();
  const client = new MmoClient({ hud: { toast() {} }, wallet: { kind: 'account' } }, view, {
    url: 'ws://world.test',
    WebSocket: TrackingSocket,
    token: 'bad',
    guest: false,
    fetch: okFetch(),
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 30));
  sockets[0].push({ v: 1, type: 'error', code: 'auth', message: 'Sign in to hunt online. Guests stay solo.' });
  assert.equal(client.authHold, true);
  client.resetAuth();
  assert.equal(client.authHold, false);
  client.setToken('after-reset');
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(sockets.length, 2);
  assert.equal(parseFrame(sockets[1].sent[0]).token, 'after-reset');

  sockets[1].push({ v: 1, type: 'error', code: 'auth', message: 'That sign-in is not valid.' });
  assert.equal(client.authHold, true);
  client.opts = { ...client.opts, token: 'brand-new' };
  client.retry();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(client.authHold, false);
  assert.equal(sockets.length, 3);
  assert.equal(parseFrame(sockets[2].sent[0]).token, 'brand-new');
});

test('social actions resolve only after a matching server acknowledgement', async () => {
  const view=stubView();
  const client=new MmoClient({character:{name:'Ann'},wallet:{kind:'account'}},view,{
    url:'ws://world.test',WebSocket:FakeSocket,token:'ann',guest:false,fetch:okFetch(),
  });
  client.connect();
  await new Promise(r=>setTimeout(r,20));
  const pending=client.friendRequest('Bea');
  const sent=parseFrame(client.ws.sent.at(-1));
  assert.equal(sent.type,'friend_request');
  assert.ok(sent.request_id);
  client.ws.push({v:1,type:'social_result',request_id:'not-this-request',ok:true});
  let settled=false;pending.then(()=>{settled=true;});
  await new Promise(r=>setTimeout(r,0));
  assert.equal(settled,false);
  client.ws.push({v:1,type:'social_result',request_id:sent.request_id,ok:true,pending:true});
  assert.deepEqual(await pending,{ok:true,pending:true,code:'',message:''});
});

test('healthzUrl uses the https form of a wss world URL', () => {
  assert.equal(healthzUrl('wss://world.example/'), 'https://world.example/healthz');
  assert.equal(healthzUrl('ws://localhost:8080/ws'), 'http://localhost:8080/healthz');
});

test('a live /healthz skips waking and goes connecting then online', async () => {
  const view = stubView();
  const client = new MmoClient({ character: { name: 'Ann' }, wallet: { kind: 'account' } }, view, {
    url: 'wss://world.example',
    WebSocket: FakeSocket,
    token: 'ann-token',
    guest: false,
    fetch: okFetch(),
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(view.statuses.some((s) => s.status === 'waking'), false);
  assert.ok(view.statuses.some((s) => s.status === 'connecting'));
  client.ws.push({ v: 1, type: 'welcome', protocol: 1, tickHz: 15, you: { id: 'u_ann', name: 'Ann' }, online: 1 });
  assert.ok(view.statuses.some((s) => s.status === 'online'));
});

test('a sleeping /healthz still opens the socket without a login queue', async () => {
  let calls = 0;
  const fetch = async () => {
    calls += 1;
    return { ok: false, status: 502, json: async () => ({ ok: false }) };
  };
  const view = stubView();
  const client = new MmoClient({ character: { name: 'Ann' } }, view, {
    url: 'wss://world.example',
    WebSocket: FakeSocket,
    token: 'ann',
    guest: false,
    fetch,
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(calls, 0);
  assert.equal(view.statuses.some((s) => s.status === 'waking'), false);
  assert.ok(view.statuses.some((s) => s.status === 'connecting'));
  assert.ok(client.ws);
});

test('retry opens the socket again without a wake countdown', async () => {
  let retryCb = null;
  const view = stubView();
  view.onRetry = (cb) => { retryCb = cb; };
  const client = new MmoClient({ character: { name: 'Ann' } }, view, {
    url: 'wss://world.example',
    WebSocket: FakeSocket,
    token: 'ann',
    guest: false,
    fetch: async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }),
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(typeof retryCb, 'function');
  assert.equal(view.statuses.some((s) => s.status === 'waking'), false);
  const first = client.ws;
  retryCb();
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(client.ws);
  assert.notEqual(client.ws, first);
  assert.ok(view.statuses.some((s) => s.status === 'connecting'));
});

test('a view that throws on waking does not crash the client', async () => {
  const view = stubView();
  const inner = view.setStatus.bind(view);
  view.setStatus = (state, info) => {
    if (state === 'waking') throw new Error('unknown status');
    return inner(state, info);
  };
  let calls = 0;
  const fetch = async () => {
    calls += 1;
    if (calls < 2) return { ok: false, status: 502, json: async () => ({ ok: false }) };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const client = new MmoClient({ character: { name: 'Ann' } }, view, {
    url: 'wss://world.example',
    WebSocket: FakeSocket,
    token: 'ann',
    guest: false,
    fetch,
    wake: { pollMs: 15, tickMs: 15, probeMs: 15, etaSec: 30, giveUpSec: 60 },
  });
  client.connect();
  await new Promise((r) => {
    const t = Date.now();
    const tick = () => {
      if (view.statuses.some((s) => s.status === 'connecting') || client.ws) return r();
      if (Date.now() - t > 2000) return r();
      setTimeout(tick, 10);
    };
    tick();
  });
  assert.ok(client.ws || view.statuses.some((s) => s.status === 'connecting'));
});

test('name_taken is a fatal distinct error on the view', async () => {
  const toasts = [];
  const view = stubView();
  const game = { hud: { toast: (t) => toasts.push(t) }, wallet: { kind: 'account' } };
  const client = new MmoClient(game, view, {
    url: 'ws://world.test',
    WebSocket: FakeSocket,
    token: 'bea',
    guest: false,
    fetch: okFetch(),
  });
  client.connect();
  await new Promise((r) => setTimeout(r, 20));
  client.ws.push({ v: 1, type: 'error', code: 'name_taken', message: 'That hunter name is already taken.' });
  assert.equal(client.fatal, true);
  assert.equal(client.closed, true);
  const err = view.statuses.find((s) => s.status === 'error' && s.code === 'name_taken');
  assert.ok(err);
  assert.match(err.message, /already taken/i);
  assert.ok(toasts.some((t) => /already taken/i.test(t)));
});


test('Colosseum ranged attacks can select an opponent at bow range', () => {
  const game = { player: { pos: { x: 0, z: 0 } } };
  const client = new MmoClient(game, stubView(), { url: 'ws://world.test', WebSocket: FakeSocket, guest: false });
  client.pvpMatchId = 'match-1';
  client.pvpTeam = 0;
  client.nearby.set('enemy', { id: 'enemy', zone: 'colosseum:match-1', pvp_team: 1, pvp_dead: false, x: 10, z: 0 });
  const sent = [];
  client.ws = { readyState: 1, send: (raw) => sent.push(parseFrame(raw)) };
  assert.equal(client.pvpAttackNearest(13), true);
  assert.equal(sent[0].type, 'pvp_attack');
  assert.equal(sent[0].target_id, 'enemy');
});


test('Colosseum match offers require an explicit confirmation frame', () => {
  const client = new MmoClient({ player: { pos: { x: 0, z: 0 } } }, stubView(), { url: 'ws://world.test', WebSocket: FakeSocket, guest: false });
  const sent = [];
  client.ws = { readyState: 1, send: (raw) => sent.push(parseFrame(raw)) };
  client.onFrame(JSON.stringify({ v: 1, type: 'pvp_match_found', proposal_id: 'proposal-1', mode: '1v1' }));
  assert.equal(client.pvpProposalId, 'proposal-1');
  assert.equal(client.confirmPvp(true), true);
  assert.equal(sent[0].type, 'pvp_confirm');
  assert.equal(sent[0].proposal_id, 'proposal-1');
  assert.equal(sent[0].accept, true);
  client.onFrame(JSON.stringify({ v: 1, type: 'pvp_queue', mode: '1v1', status: 'cancelled' }));
  assert.equal(client.pvpProposalId, null);
});
