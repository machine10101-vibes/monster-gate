import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { identify, originAllowed, parseOrigins } from './auth.js';
import { rosterAppearance, appearanceFromState, createMonsters, createNodes, createRiftMonster, gatherYield, persistStateFromSession, spawnPoseFromRow, zoneAt } from './content.js';
import { applyMove, createBucket, createLimiter } from './limits.js';
import {
  AOI_FAR_HZ, AOI_NEAR, AOI_RADIUS, CLOSE_POLICY, CLOSE_TOO_LARGE,
  HELLO_MS, IDLE_MS, MAX_PAYLOAD, PRE_AUTH_BURST, PRE_AUTH_PER_SEC,
  PROTOCOL, RESUME_MS, SAVE_MS, TICK_HZ, TYPES,
  encode, errorFrame, inAoi, monsterView, nodeView, parseMessage, parseZoneCap,
  playerPatch, playerView, quantizedPlayer, readChat, readGather, readHello, readMove,
  ProtocolError,
} from './protocol.js';
import { PersistErrorCodes } from './persistence/index.js';
import { createSocialRuntime } from './social.js';
import { openPersistence } from './store.js';
import { createCombatLoot } from './combat-loot.js';
import { createPvpRuntime } from './pvp.js';
import { DROPS, GEAR_DROPS, MATERIALS } from '../src/data/catalog.js';
import { GOODS } from '../src/data/gathering.js';
import { riftChestGold, riftChestGoods, riftScale, riftWaveSpawns, RIFT_COOLDOWN_MS, RIFT_WAVES } from '../src/data/rift.js';

import { WorldMarket } from './market.js';

function send(ws, type, extra) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(typeof type === 'string' && extra !== undefined ? encode(type, extra) : type);
}

function frameBytes(data) {
  if (data == null) return 0;
  if (typeof data === 'string') return Buffer.byteLength(data);
  if (Buffer.isBuffer(data)) return data.length;
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  return Buffer.byteLength(String(data));
}

function closeWith(ws, code, reason) {
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
    try { ws.close(code, reason); } catch { /* already closing */ }
  }
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
    this.verifyMembership = opts.verifyMembership;
    this.aoi = opts.aoi ?? AOI_RADIUS;
    this.aoiNear = opts.aoiNear ?? AOI_NEAR;
    this.farHz = opts.farHz ?? AOI_FAR_HZ;
    this.farEvery = Math.max(1, Math.round(TICK_HZ / this.farHz));
    this.zoneCap = parseZoneCap(this.env, opts.zoneCap);
    this.tickCount = 0;
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
    this.pendingSaves = new Set();
    this.riftRuns = new Map();
    this._send = send;
    this.combatLoot = opts.combatLoot || createCombatLoot({
      monsters: this.monsters,
      players: this.players,
      parties: { partyOf: (id) => this.social?.parties?.partyOf(id) || null, get: (id) => this.social?.parties?.parties?.get(id) || null },
      persist: this.persist,
      now: this.now,
      damageFor: (player) => Math.max(4, Math.min(18, 6 + (player.weapon ? 4 : 0))),
      xpFor: (monster) => Math.max(5, monster.level * 18),
      goldFor: (monster) => Math.max(2, monster.level * 5),
      dropsFor: (monster) => (DROPS[monster.type] || []).flatMap((drop) => {
        if (Math.random() >= drop.chance) return [];
        const [min, max] = drop.qty || [1, 1];
        const amount = min + Math.floor(Math.random() * (max - min + 1));
        const kind = MATERIALS[drop.id] ? 'material' : GOODS[drop.id] ? 'good' : null;
        return kind ? [{ kind, id: drop.id, amount }] : [];
      }).concat((GEAR_DROPS[monster.type] || []).flatMap((drop) =>
        Math.random() < drop.chance ? [{ kind: 'gear', id: drop.id, amount: 1 }] : [])),
      broadcast: (frame, audience) => {
        const targets = Array.isArray(audience) ? audience : [...this.players.values()];
        for (const player of targets) {
          if (!player?.ws || player.gone) continue;
          if (!Array.isArray(audience) && frame.id && frame.type === 'monster_state'
              && !inAoi(player, this.monsters.find((m) => m.id === frame.id), this.aoi)) continue;
          this._send(player.ws, frame.type, frame);
        }
      },
    });
    this.social = opts.social || createSocialRuntime(this, {
      friends: opts.friends,
      friendsCap: opts.friendsCap,
      partyMax: opts.partyMax,
      inviteTtl: opts.inviteTtl,
    });
    this.pvp = opts.pvp || createPvpRuntime(this);
    this.market = new WorldMarket(this);
  }

  async idle() {
    const pending = [...this.pendingSaves];
    if (pending.length) await Promise.all(pending);
    await this.persist?.flushAll?.();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
    if (this.timer.unref) this.timer.unref();
    this.saveTimer = setInterval(() => {
      void this.saveAll().catch((err) => console.warn('periodic save', err?.message || err));
    }, SAVE_MS);
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

  zoneCount(zone, exceptId) {
    let n = 0;
    for (const p of this.players.values()) {
      if (p.zone === zone && p.id !== exceptId) n++;
    }
    return n;
  }

  zoneIsFull(zone, exceptId) {
    return this.zoneCap > 0 && this.zoneCount(zone, exceptId) >= this.zoneCap;
  }

  rejectZoneFull(session, zone) {
    const cap = this.zoneCap;
    const name = zone || 'This area';
    send(session.ws, errorFrame('zone_full', `${name} is full (${cap} hunters). Try another town or try again later.`));
  }

  accept(ws) {
    const session = {
      ws,
      id: '',
      helloAt: this.now(),
      last: this.now(),
      limiter: createLimiter(this.now),
      preAuth: createBucket(PRE_AUTH_PER_SEC, PRE_AUTH_BURST, this.now),
      authed: false,
    };
    ws.on('message', (data) => {
      void this.onMessage(session, data);
    });
    ws.on('close', () => this.drop(session));
    ws.on('error', () => this.drop(session));
    const helloTimer = setTimeout(() => {
      if (!session.authed && !session.authenticating) {
        send(ws, errorFrame('protocol', 'Say hello.'));
        ws.close();
      }
    }, HELLO_MS);
    if (helloTimer.unref) helloTimer.unref();
    session.helloTimer = helloTimer;
  }

  async onMessage(session, data) {
    if (session.gone) return;
    session.last = this.now();
    if (frameBytes(data) > MAX_PAYLOAD) {
      send(session.ws, errorFrame('protocol', 'Frame too large.'));
      closeWith(session.ws, CLOSE_TOO_LARGE, 'Frame too large');
      return;
    }
    if (!session.authed && session.preAuth && !session.preAuth.take()) {
      send(session.ws, errorFrame('rate', 'Slow down.'));
      closeWith(session.ws, CLOSE_POLICY, 'Rate limit');
      return;
    }
    let msg;
    try {
      msg = parseMessage(data);
    } catch (err) {
      const code = err instanceof ProtocolError ? err.code : (err.code || 'protocol');
      send(session.ws, errorFrame(code, err.message));
      if (err.message === 'Frame too large.') closeWith(session.ws, CLOSE_TOO_LARGE, 'Frame too large');
      else if ((code === 'auth' || code === 'debug') && !session.authed) session.ws.close();
      return;
    }
    try {
      if (!session.authed) {
        if (msg.type !== TYPES.hello) throw new ProtocolError('protocol', 'Say hello first.');
        if (session.authenticating) return;
        session.authenticating = true;
        try { await this.hello(session, msg); } finally { session.authenticating = false; }
        return;
      }
      if (msg.type === TYPES.move) this.move(session, msg);
      else if (msg.type === TYPES.chat && msg.channel === 'whisper') await this.social.handle(session,{...msg,type:'whisper'});
      else if (msg.type === TYPES.chat && msg.channel === 'party') this.partyChat(session, msg);
      else if (msg.type === TYPES.chat) this.chat(session, msg);
      else if (msg.type === TYPES.whisper) await this.social.handle(session,{...msg,type:'whisper'});
      else if (this.social.isSocialType(msg.type)) await this.social.handle(session, msg);
      else if (msg.type === TYPES.gather) await this.gather(session, msg);
      else if (this.market.isMarketType(msg.type)) void this.market.handle(session, msg);
      else if (msg.type === 'attack') this.combatAction(session, msg).catch((err) => this.actionError(session, err));
      else if (msg.type === 'monster_move') this.moveMonster(session, msg);
      else if (msg.type === 'loot_roll_choice') this.lootChoice(session, msg).catch((err) => this.actionError(session, err));
      else if (msg.type === 'pvp_queue') this.pvp.enqueue(session, String(msg.mode || '1v1'));
      else if (msg.type === 'pvp_confirm') this.pvp.confirm(session, msg.proposal_id, msg.accept === true);
      else if (msg.type === 'pvp_cancel') this.pvp.cancel(session);
      else if (msg.type === 'pvp_attack') this.pvp.attack(session, msg.target_id);
      else if (msg.type === 'pvp_roll') this.pvp.roll(session);
      else if (msg.type === 'pvp_leave') this.pvp.leave(session);
      else if (msg.type === 'rift_enter') this.enterRift(session).catch((err) => this.actionError(session, err));
      else if (msg.type === 'rift_chest_claim') this.claimRiftChest(session).catch((err) => this.actionError(session, err));
      else if (msg.type === 'rift_leave') this.leaveRift(session);
      else if (msg.type === TYPES.leave) this.drop(session, true);
      else if (msg.type === TYPES.ping) send(session.ws, TYPES.pong, { t: msg.t ?? this.now() });
    } catch (err) {
      const code = err instanceof ProtocolError ? err.code : 'protocol';
      send(session.ws, errorFrame(code, err.message));
      if ((code === 'auth' || code === 'debug') && !session.authed) session.ws.close();
    }
  }

  /** Send one typed frame to a session (used by the Exchange). */
  sendTo(session, type, data) {
    if (session?.ws) send(session.ws, type, data);
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
      pose: session.riftReturnPose ? { ...playerView(session), ...session.riftReturnPose } : playerView(session),
    });
    return token;
  }

  async hello(session, msg) {
    const hello = readHello(msg);
    let ident;
    try {
      ident = await identify(hello, this.env, this.verifyToken, this.verifyMembership);
    } catch (err) {
      if (session.helloTimer) clearTimeout(session.helloTimer);
      const code = err instanceof ProtocolError ? err.code : 'auth';
      send(session.ws, errorFrame(code, err.message || 'Sign in to hunt online. Guests stay solo.'));
      session.ws.close();
      return;
    }
    if (session.helloTimer) clearTimeout(session.helloTimer);
    if (session.gone || session.ws.readyState !== WebSocket.OPEN) return;

    const existing = this.byUser.get(ident.userId);
    if (existing && existing !== session) await this.drop(existing, true);

    const slot = this.takeResume(hello, ident);

    let row = null;
    if (this.persist) {
      try {
        // A replacement socket must observe the last accepted pose, even when
        // the previous socket's disconnect write was still in flight.
        await this.persist.flush?.(ident.userId);
        row = await this.persist.loadCharacter(ident.userId);
        if (!row) row = await this.persist.createCharacter(ident.userId, ident.name, { look: hello.look });
      } catch (err) {
        if (!slot) {
          if (err?.code === PersistErrorCodes.NAME_TAKEN) {
            send(session.ws, errorFrame('name_taken', err.message));
            session.ws.close();
            return;
          }
          send(session.ws, errorFrame('persist', err.message || 'Could not load your hunter.'));
          session.ws.close();
          return;
        }
      }
    }
    if (session.gone || session.ws.readyState !== WebSocket.OPEN) return;

    const pose = slot?.pose || spawnPoseFromRow(row, hello);
    session.id = slot?.id || `u_${ident.userId}`;
    session.userId = ident.userId;
    const spawnZone = pose.zone || zoneAt(pose.x, pose.z);
    if (!slot && this.zoneIsFull(spawnZone, session.id)) {
      this.rejectZoneFull(session, spawnZone);
      session.ws.close();
      return;
    }
    session.guest = false;
    session.authed = true;
    session.resumed = !!slot;
    session.interest = new Map();
    session.lastOnline = -1;
    const appear = appearanceFromState(row?.state);
    const gear = row ? appear : { look: pose.look, armor: pose.armor || {}, weapon: pose.weapon ?? null, held: pose.held || 'blade' };
    Object.assign(session, {
      name: ident.name || pose.name,
      x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw,
      move: pose.move ?? 0, anim: pose.anim ?? 0,
      held: gear.held || 'blade',
      weapon: gear.weapon ?? null,
      sheath: pose.sheath ?? null,
      look: gear.look,
      armor: gear.armor || {},
      zone: spawnZone,
      hp: pose.hp ?? 20,
      pvpRating: Number(row?.state?.pvp?.rating) || 1000,
      pvpWins: Number(row?.state?.pvp?.wins) || 0,
      pvpLosses: Number(row?.state?.pvp?.losses) || 0,
      riftClearAt: Number(row?.state?.riftClearAt) || 0,
      movedAt: 0,
    });
    await this.refreshAppearance(session);
    if (session.gone || session.ws.readyState !== WebSocket.OPEN) return;
    this.players.set(session.id, session);
    this.byUser.set(ident.userId, session);
    const token = this.rememberResume(session);

    session.maxHp = session.maxHp ?? 20;
    send(session.ws, TYPES.welcome, {
      protocol: PROTOCOL,
      tickHz: TICK_HZ,
      aoi: this.aoi,
      aoiNear: this.aoiNear,
      farHz: this.farHz,
      zoneCap: this.zoneCap,
      resumeToken: token,
      resumed: !!slot,
      you: { id: session.id, name: session.name, guest: false, user_id: ident.userId,
        pvp_rating: session.pvpRating, pvp_wins: session.pvpWins, pvp_losses: session.pvpLosses },
      pose: { x: session.x, y: session.y, z: session.z, yaw: session.yaw, zone: session.zone },
      features: ident.guest ? ['party'] : this.social.features,
    });
    this.sendSnapshot(session);
    if (row?.state) {
      send(session.ws, 'reward_snapshot', {
        gold: Number(row.state.gold ?? row.gold) || 0,
        xp: row.state.xp || {},
        goods: row.state.goods || {},
        materials: row.state.materials || {},
        crafted: row.state.crafted || {},
        riftClearAt: Number(row.state.riftClearAt) || 0,
      });
    }
    this.dirty.add(session.id);
    await this.social.onJoin(session);
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

  async refreshAppearance(session) {
    const adapter = this.persist?.adapter;
    if (!adapter?.loadRoster || session.appearancePending) return;
    session.appearancePending = true;
    session.appearanceCheckedAt = this.now();
    try {
      const visual = rosterAppearance(await adapter.loadRoster(session.userId), session.name);
      if (visual && !session.gone) session.rosterVisual = visual;
    } catch (err) {
      console.warn('roster appearance', err?.message || err);
    } finally {
      session.appearancePending = false;
    }
  }

  move(session, msg) {
    if (session.pvpMatchId && session.pvpDead) { session.move = 0; return; }
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
    if (session.pvpMatchId && (
      Math.hypot(result.pose.x - 1719.5, result.pose.z - 819.5) >= 15.8
      || Math.abs(result.pose.y - 2.2) > 3
    )) {
      send(session.ws, errorFrame('pvp_bounds', 'Stay inside the Colosseum.'));
      return;
    }
    const prevZone = session.zone;
    const prevHp = session.hp;
    const prevX = session.x, prevY = session.y, prevZ = session.z, prevYaw = session.yaw;
    Object.assign(session, result.pose);
    if (!session.pvpMatchId && next.hp != null) session.hp = next.hp;
    if (session.pvpMatchId) session.zone = prevZone;
    else if (!next.zone || next.zone === 'Oakhollow' || next.zone === prevZone) {
      session.zone = zoneAt(session.x, session.z, session.zone === 'cave' ? 'cave' : 'over');
    }
    if (session.zone !== prevZone && this.zoneIsFull(session.zone, session.id)) {
      this.rejectZoneFull(session, session.zone);
      session.x = prevX;
      session.y = prevY;
      session.z = prevZ;
      session.yaw = prevYaw;
      session.zone = prevZone;
      return;
    }
    if (this.now() - (session.appearanceCheckedAt || 0) >= 5000) void this.refreshAppearance(session);
    this.dirty.add(session.id);
    const zoneChanged = session.zone !== prevZone;
    if (zoneChanged) {
      for (const monster of this.monsters) if (monster.controllerId === session.id) monster.controllerId = null;
      this.sendSnapshot(session);
    }
    this.social.onZone(session, prevZone);
    this.social.onHp(session, prevHp);
    this.social.onPose?.(session);
    this.persistPose(session);
  }

  moveMonster(session, msg) {
    if (session.gone || this.players.get(session.id) !== session || !session.userId || session.guest) return;
    const monster = this.monsters.find((entry) => entry.id === String(msg.id || ''));
    if (!monster || monster.dead || monster.hp <= 0 || monster.zone !== session.zone) return;
    if (monster.controllerId && monster.controllerId !== session.id) return;
    const x = Number(msg.x), y = Number(msg.y), z = Number(msg.z), yaw = Number(msg.yaw);
    if (![x, y, z, yaw].every(Number.isFinite)) return;
    const t = this.now();
    if (monster.lastMoveAt && t - monster.lastMoveAt < 120) return;
    const dt = monster.lastMoveAt ? Math.max(0.12, Math.min(0.6, (t - monster.lastMoveAt) / 1000)) : 0.25;
    const maxStep = (monster.speed || 2.8) * dt + 0.9;
    if (Math.hypot(x - monster.x, z - monster.z) > maxStep) return;
    if (Math.hypot(x - monster.homeX, z - monster.homeZ) > 36) return;
    if (monster.rift && (x < 1600 || x >= 1636 || z < 800 || z >= 836)) return;
    if (Math.hypot(x - session.x, z - session.z) > (monster.aggro || 12) + 14) {
      if (monster.controllerId === session.id) monster.controllerId = null;
      return;
    }
    if (Math.abs(y - monster.y) > 3) return;
    monster.controllerId = session.id;
    monster.lastMoveAt = t;
    monster.x = x;
    monster.y = y;
    monster.z = z;
    monster.yaw = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    for (const player of this.players.values()) {
      if (inAoi(player, monster, this.aoi)) {
        this._send(player.ws, 'monster_state', {
          id: monster.id, hp: monster.hp, alive: true,
          x: monster.x, y: monster.y, z: monster.z, yaw: monster.yaw,
        });
      }
    }
  }

  actionError(session, err) {
    const code = err instanceof ProtocolError ? err.code : 'combat';
    send(session.ws, errorFrame(code, err?.message || 'That action could not be completed.'));
  }

  async enterRift(session) {
    if (session.gone || this.players.get(session.id) !== session || !session.userId || session.guest) {
      throw new ProtocolError('auth', 'Sign in to enter the Rift.');
    }
    if (session.riftRunId) return;
    if (this.now() - (session.riftClearAt || 0) < RIFT_COOLDOWN_MS) {
      throw new ProtocolError('rift_cooldown', 'The Waygate is still recovering. Try again in a few minutes.');
    }
    if (session.zone === 'rift' || Math.hypot(session.x - 80, session.z - 98) > 10) {
      throw new ProtocolError('rift', 'Stand beside the Waygate to enter the Rift.');
    }
    const party = this.social.parties.partyOf(session.id);
    const key = party?.id || session.id;
    let run = this.riftRuns.get(key);
    if (run && run.wave > 0 && session.riftRunId !== run.id) {
      throw new ProtocolError('rift', 'That Rift is already underway.');
    }
    if (!run || run.expiresAt <= this.now() || run.claimed) {
      if (party && party.leader !== session.id) throw new ProtocolError('rift', 'Only the party leader can open a new Rift.');
      const ready = party
        ? party.members.map((member) => this.players.get(member.id)).filter((member) =>
          member && member.userId && !member.guest && !member.riftRunId
          && this.now() - (member.riftClearAt || 0) >= RIFT_COOLDOWN_MS
          && Math.hypot(member.x - 80, member.z - 98) <= 10)
        : [session];
      run = {
        id: randomBytes(16).toString('hex'),
        key,
        partyId: party?.id || null,
        partySize: Math.max(1, Math.min(4, ready.length)),
        participants: [],
        wave: 0,
        pendingAt: 0,
        completed: false,
        claimed: false,
        expiresAt: this.now() + 20 * 60_000,
      };
      this.riftRuns.set(key, run);
    }
    const joiners = party && run.wave === 0
      ? party.members.map((member) => this.players.get(member.id)).filter((member) =>
        member && member.userId && !member.guest && !member.riftRunId
          && this.now() - (member.riftClearAt || 0) >= RIFT_COOLDOWN_MS
          && Math.hypot(member.x - 80, member.z - 98) <= 10)
      : [session];
    for (const member of joiners.length ? joiners : [session]) this.joinRift(member, run);
    if (run.wave === 0) this.spawnRiftWave(run, 1);
  }

  joinRift(session, run) {
    if (session.riftRunId === run.id) return;
    if (session.riftRunId) return;
    const previousZone = session.zone;
    if (!run.participants.includes(session.id)) run.participants.push(session.id);
    session.riftReturnPose = { x: session.x, y: session.y, z: session.z, yaw: session.yaw, zone: session.zone };
    session.riftRunId = run.id;
    session.zone = 'rift';
    session.x = 1617.5;
    session.y = 2;
    session.z = 830;
    session.yaw = Math.PI;
    session.move = 0;
    this.sendSnapshot(session);
    this.social.onZone(session, previousZone);
    this.social.onPose?.(session);
    send(session.ws, 'rift_entered', { run_id: run.id, party_size: run.partySize, wave: run.wave });
  }

  spawnRiftWave(run, wave) {
    const scale = riftScale(run.partySize);
    const types = riftWaveSpawns(wave, run.partySize);
    for (const [index, type] of types.entries()) {
      const angle = (index / Math.max(1, types.length)) * Math.PI * 2;
      const radius = 3.2 + (index % 3) * 1.1;
      const x = 1617.5 + Math.cos(angle) * radius;
      const z = 817.5 + Math.sin(angle) * radius;
      const monster = createRiftMonster(`rift_${run.id}_w${wave}_${index}`, type, x, z, scale.hpMul);
      monster.riftRunId = run.id;
      monster.riftWave = wave;
      this.monsters.push(monster);
    }
    run.wave = wave;
    run.pendingAt = 0;
    const audience = run.participants.map((id) => this.players.get(id)).filter(Boolean);
    for (const player of audience) {
      this._send(player.ws, 'rift_wave', { run_id: run.id, wave, count: types.length });
      this.sendSnapshot(player);
    }
  }

  tickRiftRuns(now) {
    for (const [key, run] of this.riftRuns) {
      if (now >= run.expiresAt) {
        for (const id of run.participants) {
          const player = this.players.get(id);
          if (player) this._send(player.ws, 'rift_expired', { run_id: run.id });
        }
        this.riftRuns.delete(key);
        for (let i = this.monsters.length - 1; i >= 0; i--) {
          if (this.monsters[i].riftRunId === run.id) this.monsters.splice(i, 1);
        }
        continue;
      }
      if (!run.wave || run.completed || run.claimed) continue;
      const alive = this.monsters.some((monster) =>
        monster.riftRunId === run.id && !monster.dead && monster.hp > 0);
      if (alive) continue;
      if (!run.pendingAt) run.pendingAt = now + 1400;
      if (now < run.pendingAt) continue;
      if (run.wave < RIFT_WAVES.length) {
        this.spawnRiftWave(run, run.wave + 1);
      } else {
        run.completed = true;
        run.chest = { x: 1617.5, z: 817.5 };
        const audience = run.participants.map((id) => this.players.get(id)).filter(Boolean);
        for (const player of audience) this._send(player.ws, 'rift_chest_ready', { run_id: run.id });
      }
    }
  }

  async claimRiftChest(session) {
    if (session.gone || this.players.get(session.id) !== session || !session.userId || session.guest) {
      throw new ProtocolError('auth', 'Sign in to claim Rift rewards.');
    }
    const run = [...this.riftRuns.values()].find((candidate) => candidate.id === session.riftRunId);
    if (!run || !run.completed || run.claimed || !run.participants.includes(session.id)) {
      throw new ProtocolError('rift', 'That Rift chest is not ready to claim.');
    }
    if (session.zone !== 'rift' || Math.hypot(session.x - run.chest.x, session.z - run.chest.z) > 5) {
      throw new ProtocolError('rift', 'Move closer to the Rift chest.');
    }
    const members = run.participants.map((id) => this.players.get(id))
      .filter((member) => member?.userId && member.riftRunId === run.id && member.zone === 'rift');
    if (!members.length) throw new ProtocolError('rift', 'No eligible hunters are present.');
    run.claimed = true;
    const goods = riftChestGoods(run.partySize).map((item) => ({
      kind: 'good', id: item.id, amount: item.n,
    }));
    try {
      await this.combatLoot.distribute([
        { kind: 'gold', id: 'gold', amount: riftChestGold(run.partySize) },
        ...goods,
      ], members, run.partyId, `rift:${run.id}:chest`);
      for (const member of members) {
        await this.persist.grantOnce({
          rewardId: `rift:${run.id}:clear:${member.userId}`,
          userId: member.userId, kind: 'rift_clear', id: 'rift', amount: 1,
        });
        member.riftClearAt = this.now();
        const saved = await this.persist.loadCharacter(member.userId);
        if (saved?.state) {
          this._send(member.ws, 'reward_snapshot', {
            gold: Number(saved.state.gold ?? saved.gold) || 0,
            xp: saved.state.xp || {},
            goods: saved.state.goods || {},
            materials: saved.state.materials || {},
            crafted: saved.state.crafted || {},
            riftClearAt: Number(saved.state.riftClearAt) || member.riftClearAt,
          });
        }
        this._send(member.ws, 'rift_chest_result', { run_id: run.id, ok: true });
      }
    } catch (err) {
      run.claimed = false;
      throw err;
    }
  }

  leaveRift(session) {
    if (session.gone || this.players.get(session.id) !== session || !session.riftRunId || !session.riftReturnPose) return;
    const previousZone = session.zone;
    Object.assign(session, session.riftReturnPose);
    session.riftRunId = null;
    session.riftReturnPose = null;
    this.sendSnapshot(session);
    this.social.onZone(session, previousZone);
    this.social.onPose?.(session);
    this.persistPose(session, true);
    send(session.ws, 'rift_left', { x: session.x, y: session.y, z: session.z, zone: session.zone });
  }

  async combatAction(session, msg) {
    if (session.gone || this.players.get(session.id) !== session || !session.userId || session.guest) {
      throw new ProtocolError('auth', 'Sign in to fight online.');
    }
    if (!session.limiter.allowMove()) throw new ProtocolError('rate', 'Slow down.');
    if (typeof msg.monster_id !== 'string' || msg.monster_id.length > 64) throw new ProtocolError('combat', 'Invalid monster.');
    const result = await this.combatLoot.attack(session, msg.monster_id);
    send(session.ws, 'combat_result', { request_id: String(msg.request_id || ''), ...result });
  }

  async lootChoice(session, msg) {
    if (session.gone || this.players.get(session.id) !== session || !session.userId || session.guest) {
      throw new ProtocolError('auth', 'Sign in to roll for loot.');
    }
    if (typeof msg.roll_id !== 'string' || msg.roll_id.length > 64) throw new ProtocolError('loot', 'Invalid loot roll.');
    const result = await this.combatLoot.choose(session, msg.roll_id, msg.choice);
    send(session.ws, 'loot_choice_result', { request_id: String(msg.request_id || ''), ...result });
  }

  partyChat(session,msg) {
    if (!session.limiter.allowChat()) { send(session.ws,errorFrame('rate','Slow down.')); return; }
    const { text } = readChat(msg);
    const party=this.social.parties.partyOf(session.id);
    if(!party){send(session.ws,errorFrame('not_in_party','You are not in a party.'));return;}
    const frame={id:`c_${++this.chatSeq}`,channel:'party',from:{id:session.id,name:session.name},text,at:this.now()};
    for(const member of party.members){const target=this.players.get(member.id);if(target)send(target.ws,TYPES.chat,frame);}
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
      if (this.social.hidesChat(other, session)) continue;
      send(other.ws, TYPES.chat, frame);
    }
  }

  /**
   * Authoritative shared-node gather. The inventory write completes before
   * the node is depleted, so a persistence outage cannot destroy a resource
   * without granting its reward.
   */
  async gather(session, msg) {
    const { id } = readGather(msg);
    const node = this.byNode.get(id);
    if (!node) throw new ProtocolError('gather', 'No such node.');
    if (!node.ready || node.busy) throw new ProtocolError('gather', 'That node is not ready.');
    if (!inAoi(session, node, 8)) throw new ProtocolError('gather', 'Too far from that node.');
    const reward = gatherYield(node);
    if (!reward) throw new ProtocolError('gather', 'That node has no valid yield.');
    if (!this.persist || !session.userId || session.guest) {
      throw new ProtocolError('auth', 'Sign in to gather online.');
    }
    // Lock before the await: two same-frame requests must never double grant.
    node.busy = true;
    try {
      await this.persist.saveCharacter(session.userId, {
        goods: { [reward.id]: reward.amount },
        xp: { [reward.skill]: reward.xp },
      }, { immediate: true });
      node.ready = false;
      node.respawnAt = this.now() + (node.respawn || 12) * 1000;
      this.dirtyNodes.add(node.id);
    } finally {
      node.busy = false;
    }
    send(session.ws, 'reward_update', {
      kind: 'good', id: reward.id, amount: reward.amount, source: 'gather', node_id: node.id,
    });
    if (reward.xp > 0) send(session.ws, 'reward_update', {
      kind: 'xp', id: reward.skill, amount: reward.xp, source: 'gather', node_id: node.id,
    });
  }

  persistPose(session, immediate = false) {
    if (!this.persist || !session.userId || session.riftRunId || session.pvpMatchId) return;
    const state = persistStateFromSession(session);
    const opts = immediate ? { immediate: true } : {};
    const result = this.persist.saveCharacter(session.userId, state, opts);
    if (result && typeof result.then === 'function') {
      const tracked = result.catch((err) => {
        console.warn('saveCharacter', session.userId, err?.message || err);
      });
      if (immediate) {
        this.pendingSaves.add(tracked);
        void tracked.finally(() => this.pendingSaves.delete(tracked));
      }
      return tracked;
    }
    return result;
  }

  async saveAll() {
    for (const p of this.players.values()) this.persistPose(p);
    // Active movement continually resets the debounce. Commit positions on
    // this cadence so an instance restart cannot rewind a long-running hunt.
    await this.persist?.flushAll?.();
  }

  drop(session, closeSocket = false) {
    if (session.gone) return;
    this.pvp.disconnect(session);
    session.gone = true;
    if (session.helloTimer) clearTimeout(session.helloTimer);
    if (session.authed && session.id) {
      this.players.delete(session.id);
      if (this.byUser.get(session.userId) === session) this.byUser.delete(session.userId);
      this.dirty.delete(session.id);
      this.social.onLeave(session);
      this.pvp?.disconnect?.(session);
      for (const monster of this.monsters) if (monster.controllerId === session.id) monster.controllerId = null;
      if (session.riftRunId && session.riftReturnPose) {
        Object.assign(session, session.riftReturnPose);
        session.riftRunId = null;
      }
      this.rememberResume(session);
      const online = this.players.size;
      for (const other of this.players.values()) {
        const watched = other.interest?.has(session.id);
        if (watched || inAoi(other, session, this.aoi)) {
          other.interest?.delete(session.id);
          other.lastOnline = online;
          send(other.ws, TYPES.leave, { id: session.id });
          send(other.ws, TYPES.delta, { remove: [session.id], online });
        }
      }
      const saved = this.persistPose(session, true);
      if (closeSocket && session.ws.readyState === WebSocket.OPEN) session.ws.close();
      return saved;
    }
    if (closeSocket && session.ws.readyState === WebSocket.OPEN) session.ws.close();
  }

  sendSnapshot(session) {
    if (!session.interest) session.interest = new Map();
    session.interest.clear();
    const players = [];
    for (const p of this.nearbyPlayers(session)) {
      const q = quantizedPlayer(p);
      session.interest.set(p.id, q);
      players.push(q);
    }
    session.lastOnline = this.players.size;
    send(session.ws, TYPES.snapshot, {
      players,
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

    this.social.parties.expire();
    this.combatLoot.tick().catch((err) => console.warn('combatLoot.tick', err?.message || err));
    this.tickRiftRuns(t);

    this.tickCount += 1;
    const farTick = this.tickCount % this.farEvery === 0;
    const dirtyMonsters = this.monsters.filter((m) => this.dirtyMonsters.has(m.id));
    const dirtyNodes = this.nodes.filter((n) => this.dirtyNodes.has(n.id));
    const hasEntityDelta = dirtyMonsters.length || dirtyNodes.length;
    const dirtyPlayers = this.dirty.size;
    // Pose broadcasts stay inside the 96-unit AOI. Near hunters (aoiNear)
    // get ~15 Hz patches; the outer ring is about farHz (default 4 Hz).
    if (!dirtyPlayers && !hasEntityDelta && !farTick) return;

    const online = this.players.size;
    for (const observer of this.players.values()) {
      if (!observer.interest) observer.interest = new Map();
      const upsert = [];
      const remove = [];
      for (const other of this.players.values()) {
        if (other.id === observer.id) continue;
        const prev = observer.interest.get(other.id);
        const visible = inAoi(observer, other, this.aoi);
        if (!visible) {
          if (prev) {
            remove.push(other.id);
            observer.interest.delete(other.id);
          }
          continue;
        }
        const near = inAoi(observer, other, this.aoiNear);
        const due = near || farTick || !prev;
        if (!due) continue;
        const q = quantizedPlayer(other);
        const patch = playerPatch(prev, q, { full: !prev });
        if (!patch) continue;
        observer.interest.set(other.id, q);
        upsert.push(patch);
      }
      const entityDelta = {};
      if (hasEntityDelta) {
        const mon = dirtyMonsters.filter((m) => inAoi(observer, m, this.aoi)).map(monsterView);
        const nodes = dirtyNodes.filter((n) => inAoi(observer, n, this.aoi)).map(nodeView);
        if (mon.length) entityDelta.monsters = { upsert: mon, remove: [] };
        if (nodes.length) entityDelta.nodes = { upsert: nodes, remove: [] };
      }
      if (!upsert.length && !remove.length && !entityDelta.monsters && !entityDelta.nodes) continue;
      const payload = {};
      if (upsert.length) payload.upsert = upsert;
      if (remove.length) payload.remove = remove;
      if (observer.lastOnline !== online) {
        payload.online = online;
        observer.lastOnline = online;
      }
      if (entityDelta.monsters || entityDelta.nodes) payload.entities = entityDelta;
      send(observer.ws, TYPES.delta, payload);
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
  return JSON.stringify({
    ok: true,
    protocol: PROTOCOL,
    players: world.size,
    tickHz: TICK_HZ,
    aoi: world.aoi,
    aoiNear: world.aoiNear,
    farHz: world.farHz,
    zoneCap: world.zoneCap,
  });
}

function corsHeaders(origin, allowed) {
  const headers = {
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    vary: 'Origin',
  };
  if (origin && originAllowed(origin, allowed)) headers['access-control-allow-origin'] = origin;
  else if (!allowed.length) headers['access-control-allow-origin'] = '*';
  return headers;
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
    verifyMembership: options.verifyMembership,
    aoi: options.aoi,
    aoiNear: options.aoiNear,
    farHz: options.farHz,
    zoneCap: options.zoneCap,
    monsters: options.monsters,
    nodes: options.nodes,
    friends: options.friends,
    friendsCap: options.friendsCap,
    partyMax: options.partyMax,
    inviteTtl: options.inviteTtl,
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
    const headers = corsHeaders(origin, allowed);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }
    if (path === '/healthz' || path === '/health' || path === '/') {
      headers['content-type'] = 'application/json';
      res.writeHead(200, headers);
      res.end(healthBody(world));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({
    server,
    maxPayload: MAX_PAYLOAD,
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
