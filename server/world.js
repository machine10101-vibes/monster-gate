import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { identify, originAllowed, parseOrigins } from './auth.js';
import { createMonsters, createNodes, persistStateFromSession, spawnPoseFromRow, zoneAt } from './content.js';
import { applyMove, createLimiter } from './limits.js';
import {
  AOI_RADIUS, HELLO_MS, IDLE_MS, PROTOCOL, RESUME_MS, SAVE_MS, TICK_HZ, TYPES,
  encode, errorFrame, inAoi, monsterView, nodeView, parseMessage, playerView,
  readChat, readGather, readHello, readMove, ProtocolError,
} from './protocol.js';
import { openPersistence } from './store.js';

function send(ws, type, extra) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(typeof type === 'string' && extra !== undefined ? encode(type, extra) : type);
}

function resumeToken() {
  return randomBytes(18).toString('base64url');
}

export class World {
  constructor(opts = {}) {
    this.persist = opts.persist;
    this.env = opts.env || process.env;
    this.now = opts.now || (() => Date.now());
    this.tickMs = opts.tickMs ?? Math.round(1000 / TICK_HZ);
    this.verifyToken = opts.verifyToken;
    this.aoi = opts.aoi ?? AOI_RADIUS;
    this.players = new Map();
    this.byUser = new Map();
    this.resume = new Map();
    this.chatSeq = 0;
    this.timer = null;
    this.saveTimer = null;
    this.dirty = new Set();
    this.dirtyMonsters = new Set();
    this.dirtyNodes = new Set();
    this.monsters = opts.monsters || createMonsters();
    this.nodes = opts.nodes || createNodes();
    this.byNode = new Map(this.nodes.map((n) => [n.id, n]));
    this.pendingSaves = [];
  }

  async idle() {
    const pending = this.pendingSaves.splice(0);
    if (pending.length) await Promise.all(pending);
    await this.persist?.flushAll?.();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
    if (this.timer.unref) this.timer.unref();
    this.saveTimer = setInterval(() => this.saveAll(), SAVE_MS);
    if (this.saveTimer.unref) this.saveTimer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.saveTimer) clearInterval(this.saveTimer);
    this.timer = null;
    this.saveTimer = null;
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
      else if (msg.type === TYPES.gather) this.gather(session, msg);
      else if (msg.type === TYPES.leave) this.drop(session, true);
      else if (msg.type === TYPES.ping) send(session.ws, TYPES.pong, { t: msg.t ?? this.now() });
    } catch (err) {
      const code = err instanceof ProtocolError ? err.code : 'protocol';
      send(session.ws, errorFrame(code, err.message));
      if (code === 'auth' && !session.authed) session.ws.close();
    }
  }

  takeResume(hello, ident) {
    if (!hello.resume) return null;
    const slot = this.resume.get(hello.resume);
    if (!slot) return null;
    if (slot.userId !== ident.userId) return null;
    if (this.now() - slot.at > RESUME_MS) {
      this.resume.delete(hello.resume);
      return null;
    }
    this.resume.delete(hello.resume);
    return slot;
  }

  rememberResume(session) {
    if (!session.authed || !session.userId) return;
    const token = session.resume || resumeToken();
    session.resume = token;
    this.resume.set(token, {
      token,
      userId: session.userId,
      id: session.id,
      at: this.now(),
      pose: playerView(session),
    });
    return token;
  }

  async hello(session, msg) {
    const hello = readHello(msg);
    let ident;
    try {
      ident = await identify(hello, this.env, this.verifyToken);
    } catch (err) {
      if (session.helloTimer) clearTimeout(session.helloTimer);
      const code = err instanceof ProtocolError ? err.code : 'auth';
      send(session.ws, errorFrame(code, err.message || 'Sign in to hunt online. Guests stay solo.'));
      session.ws.close();
      return;
    }
    if (session.helloTimer) clearTimeout(session.helloTimer);

    const existing = this.byUser.get(ident.userId);
    if (existing && existing !== session) this.drop(existing, true);

    const slot = this.takeResume(hello, ident);

    let row = null;
    if (this.persist) {
      try {
        row = await this.persist.loadCharacter(ident.userId);
        if (!row) row = await this.persist.createCharacter(ident.userId, ident.name, { look: hello.look });
      } catch (err) {
        if (!slot) {
          send(session.ws, errorFrame('persist', err.message || 'Could not load your hunter.'));
          session.ws.close();
          return;
        }
      }
    }

    const pose = slot?.pose || spawnPoseFromRow(row, hello);
    session.id = slot?.id || `u_${ident.userId}`;
    session.userId = ident.userId;
    session.guest = false;
    session.authed = true;
    session.resumed = !!slot;
    Object.assign(session, {
      name: ident.name || pose.name,
      x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw,
      move: pose.move ?? 0, anim: pose.anim ?? 0,
      held: pose.held || 'blade', sheath: pose.sheath ?? null,
      look: hello.look || pose.look,
      armor: hello.armor && Object.keys(hello.armor).length ? hello.armor : (pose.armor || {}),
      zone: pose.zone || zoneAt(pose.x, pose.z),
      hp: pose.hp ?? 20,
      movedAt: 0,
    });
    this.players.set(session.id, session);
    this.byUser.set(ident.userId, session);
    const token = this.rememberResume(session);

    send(session.ws, TYPES.welcome, {
      protocol: PROTOCOL,
      tickHz: TICK_HZ,
      aoi: this.aoi,
      resumeToken: token,
      resumed: !!slot,
      you: { id: session.id, name: session.name, guest: false },
    });
    this.sendSnapshot(session);
    this.dirty.add(session.id);
  }

  nearbyPlayers(session) {
    const out = [];
    for (const p of this.players.values()) {
      if (p.id === session.id) continue;
      if (inAoi(session, p, this.aoi)) out.push(p);
    }
    return out;
  }

  nearbyMonsters(session) {
    return this.monsters.filter((m) => inAoi(session, m, this.aoi));
  }

  nearbyNodes(session) {
    return this.nodes.filter((n) => inAoi(session, n, this.aoi));
  }

  entitiesPayload(session) {
    return {
      monsters: this.nearbyMonsters(session).map(monsterView),
      nodes: this.nearbyNodes(session).map(nodeView),
    };
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
    const prevZone = session.zone;
    Object.assign(session, result.pose);
    if (!next.zone || next.zone === 'Oakhollow' || next.zone === prevZone) {
      session.zone = zoneAt(session.x, session.z, session.zone === 'cave' ? 'cave' : 'over');
    }
    this.dirty.add(session.id);
    const zoneChanged = session.zone !== prevZone;
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

  /**
   * Shared-node deplete. Inventory credit is TODO (persistence already
   * stores goods; the gather loop is not wired yet).
   */
  gather(session, msg) {
    const { id } = readGather(msg);
    const node = this.byNode.get(id);
    if (!node) throw new ProtocolError('gather', 'No such node.');
    if (!node.ready) throw new ProtocolError('gather', 'That node is not ready.');
    if (!inAoi(session, node, 8)) throw new ProtocolError('gather', 'Too far from that node.');
    node.ready = false;
    node.respawnAt = this.now() + (node.respawn || 12) * 1000;
    this.dirtyNodes.add(node.id);
    // TODO: credit the gather yield on the character and persist it.
  }

  persistPose(session, immediate = false) {
    if (!this.persist || !session.userId) return;
    const state = persistStateFromSession(session);
    const opts = immediate ? { immediate: true } : {};
    const result = this.persist.saveCharacter(session.userId, state, opts);
    if (result && typeof result.then === 'function') {
      const tracked = result.catch((err) => {
        console.warn('saveCharacter', session.userId, err?.message || err);
      });
      this.pendingSaves.push(tracked);
      return tracked;
    }
    return result;
  }

  saveAll() {
    for (const p of this.players.values()) this.persistPose(p);
  }

  drop(session, closeSocket = false) {
    if (session.gone) return;
    session.gone = true;
    if (session.helloTimer) clearTimeout(session.helloTimer);
    if (session.authed && session.id) {
      this.players.delete(session.id);
      if (this.byUser.get(session.userId) === session) this.byUser.delete(session.userId);
      this.dirty.delete(session.id);
      this.rememberResume(session);
      for (const other of this.players.values()) {
        if (inAoi(other, session, this.aoi) || other.zone === session.zone) {
          send(other.ws, TYPES.leave, { id: session.id });
          send(other.ws, TYPES.delta, { upsert: [], remove: [session.id], online: this.players.size });
        }
      }
      this.persistPose(session, true);
    }
    if (closeSocket && session.ws.readyState === WebSocket.OPEN) session.ws.close();
  }

  sendSnapshot(session) {
    send(session.ws, TYPES.snapshot, {
      players: this.nearbyPlayers(session).map((p) => playerView(p)),
      entities: this.entitiesPayload(session),
      online: this.players.size,
      zone: session.zone,
    });
  }

  tick() {
    const t = this.now();
    for (const p of [...this.players.values()]) {
      if (t - p.last > IDLE_MS) this.drop(p, true);
    }
    for (const m of this.monsters) {
      if (m.hp <= 0 && m.respawnAt && t >= m.respawnAt) {
        m.hp = m.maxHp;
        m.x = m.homeX;
        m.y = m.homeY;
        m.z = m.homeZ;
        m.respawnAt = 0;
        this.dirtyMonsters.add(m.id);
      }
    }
    for (const n of this.nodes) {
      if (!n.ready && n.respawnAt && t >= n.respawnAt) {
        n.ready = true;
        n.respawnAt = 0;
        this.dirtyNodes.add(n.id);
      }
    }
    for (const expired of [...this.resume.values()]) {
      if (t - expired.at > RESUME_MS) this.resume.delete(expired.token);
    }

    const dirtyPlayers = [...this.dirty];
    const dirtyMonsters = this.monsters.filter((m) => this.dirtyMonsters.has(m.id));
    const dirtyNodes = this.nodes.filter((n) => this.dirtyNodes.has(n.id));
    const hasEntityDelta = dirtyMonsters.length || dirtyNodes.length;
    if (!dirtyPlayers.length && !hasEntityDelta) return;

    for (const p of this.players.values()) {
      const upsert = [];
      for (const id of dirtyPlayers) {
        if (id === p.id) continue;
        const other = this.players.get(id);
        if (other && inAoi(p, other, this.aoi)) upsert.push(playerView(other));
      }
      const entityDelta = {};
      if (hasEntityDelta) {
        const mon = dirtyMonsters.filter((m) => inAoi(p, m, this.aoi)).map(monsterView);
        const nodes = dirtyNodes.filter((n) => inAoi(p, n, this.aoi)).map(nodeView);
        if (mon.length) entityDelta.monsters = { upsert: mon, remove: [] };
        if (nodes.length) entityDelta.nodes = { upsert: nodes, remove: [] };
      }
      if (!upsert.length && !entityDelta.monsters && !entityDelta.nodes) continue;
      const payload = { upsert, remove: [], online: this.players.size };
      if (entityDelta.monsters || entityDelta.nodes) payload.entities = entityDelta;
      send(p.ws, TYPES.delta, payload);
    }
    this.dirty.clear();
    this.dirtyMonsters.clear();
    this.dirtyNodes.clear();
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

function healthBody(world) {
  return JSON.stringify({ ok: true, protocol: PROTOCOL, players: world.size, tickHz: TICK_HZ });
}

export async function createWorldServer(options = {}) {
  const persist = options.persist || await openPersistence({
    memory: options.memory,
    adapterKind: options.adapterKind,
  });
  const world = new World({
    persist,
    env: options.env || process.env,
    now: options.now,
    tickMs: options.tickMs,
    verifyToken: options.verifyToken,
    aoi: options.aoi,
    monsters: options.monsters,
    nodes: options.nodes,
  });
  const allowed = options.allowedOrigins || parseOrigins(world.env);
  const server = http.createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    const origin = req.headers.origin;
    if (!originAllowed(origin, allowed)) {
      res.writeHead(403);
      res.end('origin not allowed');
      return;
    }
    const headers = { 'content-type': 'application/json' };
    if (origin && originAllowed(origin, allowed)) headers['access-control-allow-origin'] = origin;
    else if (!allowed.length) headers['access-control-allow-origin'] = '*';
    if (path === '/healthz' || path === '/health' || path === '/') {
      res.writeHead(200, headers);
      res.end(healthBody(world));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({
    server,
    maxPayload: 8192,
    verifyClient: (info) => originAllowed(info.origin, allowed),
  });
  wss.on('connection', (ws) => world.accept(ws));
  const port = Number(options.port ?? process.env.PORT ?? 8080);
  await listen(server, Number.isFinite(port) ? port : 8080);
  world.start();
  const close = async () => {
    world.stop();
    for (const p of [...world.players.values()]) world.drop(p, true);
    await world.idle();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
    await persist.close?.();
  };
  return { server, wss, world, persist, close, port: server.address().port };
}
