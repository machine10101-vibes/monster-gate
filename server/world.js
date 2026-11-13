import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { identify } from './auth.js';
import { applyMove, createLimiter } from './limits.js';
import {
  HELLO_MS, IDLE_MS, PROTOCOL, TICK_HZ, TYPES,
  encode, errorFrame, parseMessage, playerView, readChat, readHello, readMove,
  ProtocolError,
} from './protocol.js';
import { openPersistence } from './store.js';

function send(ws, type, extra) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(typeof type === 'string' && extra !== undefined ? encode(type, extra) : type);
}

function spawnPose(name, extra = {}) {
  return {
    name,
    x: extra.x ?? 72,
    y: extra.y ?? 3.2,
    z: extra.z ?? 72.5,
    yaw: extra.yaw ?? 0,
    move: 0,
    anim: 0,
    held: extra.held || 'blade',
    sheath: extra.sheath ?? null,
    look: extra.look || null,
    armor: extra.armor || {},
    zone: extra.zone || 'Oakhollow',
    hp: extra.hp ?? 20,
    movedAt: 0,
  };
}

export class World {
  constructor(opts = {}) {
    this.persist = opts.persist;
    this.env = opts.env || process.env;
    this.now = opts.now || (() => Date.now());
    this.tickMs = opts.tickMs ?? Math.round(1000 / TICK_HZ);
    this.players = new Map();
    this.byUser = new Map();
    this.chatSeq = 0;
    this.timer = null;
    this.dirty = new Set();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get size() {
    return this.players.size;
  }

  accept(ws) {
    const session = {
      ws,
      id: '',
      helloAt: this.now(),
      last: this.now(),
      limiter: createLimiter(this.now),
      authed: false,
    };
    ws.on('message', (data) => {
      void this.onMessage(session, data);
    });
    ws.on('close', () => this.drop(session));
    ws.on('error', () => this.drop(session));
    const helloTimer = setTimeout(() => {
      if (!session.authed) {
        send(ws, errorFrame('protocol', 'Say hello.'));
        ws.close();
      }
    }, HELLO_MS);
    if (helloTimer.unref) helloTimer.unref();
    session.helloTimer = helloTimer;
  }

  async onMessage(session, data) {
    session.last = this.now();
    let msg;
    try {
      msg = parseMessage(data);
    } catch (err) {
      send(session.ws, errorFrame(err.code || 'protocol', err.message));
      return;
    }
    try {
      if (!session.authed) {
        if (msg.type !== TYPES.hello) throw new ProtocolError('protocol', 'Say hello first.');
        await this.hello(session, msg);
        return;
      }
      if (msg.type === TYPES.move) this.move(session, msg);
      else if (msg.type === TYPES.chat) this.chat(session, msg);
      else if (msg.type === TYPES.leave) this.drop(session, true);
      else if (msg.type === TYPES.ping) send(session.ws, TYPES.pong, { t: msg.t ?? this.now() });
    } catch (err) {
      const code = err instanceof ProtocolError ? err.code : 'protocol';
      send(session.ws, errorFrame(code, err.message));
    }
  }

  async hello(session, msg) {
    const hello = readHello(msg);
    const ident = await identify(hello, this.env);
    if (session.helloTimer) clearTimeout(session.helloTimer);

    const existing = this.byUser.get(ident.userId);
    if (existing && existing !== session) this.drop(existing, true);

    let row = null;
    if (!ident.guest && this.persist) {
      try {
        row = await this.persist.loadCharacter(ident.userId);
        if (!row) row = await this.persist.createCharacter(ident.userId, ident.name, { look: hello.look });
      } catch {
        row = null;
      }
    }

    const pose = spawnPose(ident.name, {
      ...(row?.state || {}),
      look: hello.look || row?.state?.look,
      armor: hello.armor || row?.state?.armor,
    });
    session.id = ident.guest ? ident.userId : `u_${ident.userId}`;
    session.userId = ident.userId;
    session.guest = ident.guest;
    session.authed = true;
    Object.assign(session, pose);
    this.players.set(session.id, session);
    this.byUser.set(ident.userId, session);

    send(session.ws, TYPES.welcome, {
      protocol: PROTOCOL,
      tickHz: TICK_HZ,
      you: { id: session.id, name: session.name, guest: !!ident.guest },
    });
    this.sendSnapshot(session);
    this.dirty.add(session.id);
  }

  move(session, msg) {
    if (!session.limiter.allowMove()) {
      send(session.ws, errorFrame('rate', 'Slow down.'));
      return;
    }
    const next = readMove(msg);
    const result = applyMove(session, next, this.now());
    if (result.teleport) {
      send(session.ws, errorFrame('teleport', 'That move was too far.'));
      return;
    }
    const zoneChanged = result.pose.zone !== session.zone;
    Object.assign(session, result.pose);
    this.dirty.add(session.id);
    if (zoneChanged) this.sendSnapshot(session);
    this.persistPose(session);
  }

  chat(session, msg) {
    if (!session.limiter.allowChat()) {
      send(session.ws, errorFrame('rate', 'Slow down.'));
      return;
    }
    const { channel, text } = readChat(msg);
    const frame = {
      id: `c_${++this.chatSeq}`,
      channel,
      from: { id: session.id, name: session.name },
      text,
      at: this.now(),
      zone: session.zone,
    };
    for (const other of this.players.values()) {
      if (channel === 'zone' && other.zone !== session.zone) continue;
      send(other.ws, TYPES.chat, frame);
    }
  }

  persistPose(session) {
    if (!this.persist || session.guest) return;
    void this.persist.saveCharacter(session.userId, {
      name: session.name,
      x: session.x,
      y: session.y,
      z: session.z,
      yaw: session.yaw,
      zone: session.zone,
      look: session.look,
      armor: session.armor,
      held: session.held,
      sheath: session.sheath,
    });
  }

  drop(session, closeSocket = false) {
    if (session.gone) return;
    session.gone = true;
    if (session.helloTimer) clearTimeout(session.helloTimer);
    if (session.authed && session.id) {
      this.players.delete(session.id);
      if (this.byUser.get(session.userId) === session) this.byUser.delete(session.userId);
      this.dirty.delete(session.id);
      for (const other of this.players.values()) {
        if (other.zone === session.zone) {
          send(other.ws, TYPES.leave, { id: session.id });
          send(other.ws, TYPES.delta, { upsert: [], remove: [session.id], online: this.players.size });
        }
      }
      if (!session.guest) {
        this.persistPose(session);
        void this.persist?.saveCharacter?.(session.userId, {
          name: session.name, x: session.x, y: session.y, z: session.z, zone: session.zone,
        }, { immediate: true });
      }
    }
    if (closeSocket && session.ws.readyState === WebSocket.OPEN) session.ws.close();
  }

  inZone(zone, exceptId) {
    const out = [];
    for (const p of this.players.values()) {
      if (p.zone === zone && p.id !== exceptId) out.push(p);
    }
    return out;
  }

  sendSnapshot(session) {
    const players = this.inZone(session.zone, session.id).map((p) => playerView(p));
    send(session.ws, TYPES.snapshot, { players, online: this.players.size, zone: session.zone });
  }

  tick() {
    const t = this.now();
    for (const p of [...this.players.values()]) {
      if (t - p.last > IDLE_MS) {
        this.drop(p, true);
      }
    }
    const byZone = new Map();
    for (const p of this.players.values()) {
      if (!byZone.has(p.zone)) byZone.set(p.zone, []);
      byZone.get(p.zone).push(p);
    }
    for (const [, group] of byZone) {
      const upsert = [];
      for (const p of group) {
        if (this.dirty.has(p.id)) upsert.push(playerView(p));
      }
      if (!upsert.length) continue;
      const ids = new Set(upsert.map((u) => u.id));
      for (const p of group) {
        const others = upsert.filter((u) => u.id !== p.id);
        if (!others.length && !ids.has(p.id)) continue;
        send(p.ws, TYPES.delta, { upsert: others, remove: [], online: this.players.size });
      }
    }
    this.dirty.clear();
  }
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

export async function createWorldServer(options = {}) {
  const persist = options.persist || await openPersistence({
    memory: options.memory,
    adapterKind: options.adapterKind,
  });
  persist.installShutdownHandlers?.();
  const world = new World({
    persist,
    env: options.env || process.env,
    now: options.now,
    tickMs: options.tickMs,
  });
  const server = http.createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    if (path === '/health' || path === '/') {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify({ ok: true, protocol: PROTOCOL, players: world.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({ server, maxPayload: 8192 });
  wss.on('connection', (ws) => world.accept(ws));
  const port = Number(options.port ?? process.env.PORT ?? 8080);
  await listen(server, Number.isFinite(port) ? port : 8080);
  world.start();
  const close = async () => {
    world.stop();
    for (const p of [...world.players.values()]) world.drop(p, true);
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
    await persist.flushAll?.();
    await persist.close?.();
  };
  return { server, wss, world, persist, close, port: server.address().port };
}
